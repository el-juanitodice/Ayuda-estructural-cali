import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  PayloadTooLargeException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { OrigenFoto, VarianteFoto } from '../../common/enums/foto.enum';
import type { ExifFoto } from '../../common/interfaces/exif-foto.interface';
import { Foto } from '../../database/entities/foto.entity';
import { Reporte } from '../../database/entities/reporte.entity';
import { Usuario } from '../../database/entities/usuario.entity';
import { StorageService } from '../storage/storage.service';
import { AisService } from '../../shared/ais/ais.service';
import type { SubirFotoDto } from './dto/fotos.dto';
import type { UsuarioJwt } from '../auth/interfaces/usuario-jwt.interface';
import { RolUsuario } from '../../common/enums/dominio.enum';

interface ArchivosSubida {
  full: Express.Multer.File;
  thumb: Express.Multer.File;
}

@Injectable()
export class FotosService {
  constructor(
    @InjectRepository(Foto)
    private readonly fotosRepo: Repository<Foto>,
    @InjectRepository(Reporte)
    private readonly reportesRepo: Repository<Reporte>,
    @InjectRepository(Usuario)
    private readonly usuariosRepo: Repository<Usuario>,
    private readonly storage: StorageService,
    private readonly aisService: AisService,
    private readonly config: ConfigService,
  ) {}

  async subir(dto: SubirFotoDto, archivos: ArchivosSubida, usuario?: UsuarioJwt) {
    const existente = await this.fotosRepo.findOne({ where: { uuid: dto.uuid } });
    if (existente) {
      return { ok: true, ya_confirmada: true, uuid: dto.uuid };
    }

    const reporte = await this.reportesRepo.findOne({ where: { uuid: dto.reporte_uuid } });
    if (!reporte) {
      throw new NotFoundException({
        error: 'reporte_no_existe',
        mensaje: 'El reporte aún no llega al servidor. La app reintentará sola.',
      });
    }

    const maxFotos = this.config.get<number>('operacion.maxFotosPorReporte', 100);
    const total = await this.fotosRepo.count({ where: { reporteId: reporte.id } });
    if (total >= maxFotos) {
      throw new ConflictException({
        error: 'cupo_lleno',
        mensaje: `Este reporte ya tiene ${maxFotos} fotos.`,
      });
    }

    this.validarTamano(archivos.full.size, 'full');
    this.validarTamano(archivos.thumb.size, 'thumb');

    const formato = dto.formato ?? this.detectarFormato(archivos.full.mimetype);
    const { rutaFull, rutaThumb } = this.storage.rutasFoto(reporte.uuid, dto.uuid, formato);

    await this.storage.guardar(rutaFull, archivos.full.buffer);
    await this.storage.guardar(rutaThumb, archivos.thumb.buffer);

    const origen = this.resolverOrigen(usuario);
    const exif = this.parsearExif(dto.exif);

    const foto = this.fotosRepo.create({
      uuid: dto.uuid,
      reporteId: reporte.id,
      origen,
      subidaPorId: usuario ? await this.resolverUsuarioId(usuario.sub) : null,
      categoria: dto.categoria,
      piso: dto.piso ?? null,
      rutaFull,
      rutaThumb,
      bytesFull: archivos.full.size,
      bytesThumb: archivos.thumb.size,
      ancho: dto.ancho ?? null,
      alto: dto.alto ?? null,
      formato,
      exif,
    });

    await this.fotosRepo.save(foto);

    return {
      ok: true,
      uuid: dto.uuid,
      ruta_full: rutaFull,
      ruta_thumb: rutaThumb,
    };
  }

  async listarPorReporte(reporteUuid: string, usuario: UsuarioJwt) {
    const reporte = await this.reportesRepo.findOne({ where: { uuid: reporteUuid } });
    if (!reporte) {
      throw new NotFoundException({
        error: 'reporte_no_existe',
        mensaje: 'Reporte no encontrado.',
      });
    }

    const fotos = await this.fotosRepo.find({
      where: { reporteId: reporte.id },
      order: { categoria: 'ASC', orden: 'ASC' },
      select: ['uuid', 'categoria', 'piso', 'origen'],
    });

    return {
      fotos: fotos
        .filter((f) => this.puedeVerFoto(usuario, f))
        .map((f) => ({
          uuid: f.uuid,
          categoria: f.categoria,
          piso: f.piso,
          origen: f.origen,
        })),
    };
  }

  async obtenerArchivo(uuid: string, tam: 'thumb' | 'full', usuario: UsuarioJwt) {
    const foto = await this.fotosRepo.findOne({ where: { uuid } });
    if (!foto) {
      throw new NotFoundException({
        error: 'no_existe',
        mensaje: 'Foto no encontrada.',
      });
    }

    if (!this.puedeVerFoto(usuario, foto)) {
      throw new ForbiddenException({
        error: 'rol_insuficiente',
        mensaje: 'No tienes permiso para ver esta foto.',
      });
    }

    const ruta = tam === VarianteFoto.FULL ? foto.rutaFull : foto.rutaThumb;
    const buffer = await this.storage.leer(ruta);

    return {
      buffer,
      contentType: this.storage.contentTypeDesdeRuta(ruta),
    };
  }

  private validarTamano(bytes: number, tipo: 'full' | 'thumb') {
    const max =
      tipo === 'full'
        ? this.config.get<number>('storage.maxBytesFull', 4 * 1024 * 1024)
        : this.config.get<number>('storage.maxBytesThumb', 512 * 1024);

    if (bytes > max) {
      throw new PayloadTooLargeException({
        error: 'archivo_grande',
        mensaje: `El archivo ${tipo} supera el tamaño permitido.`,
      });
    }
  }

  private detectarFormato(mimetype: string): 'webp' | 'jpeg' {
    if (mimetype.includes('webp')) return 'webp';
    return 'jpeg';
  }

  private resolverOrigen(usuario?: UsuarioJwt): OrigenFoto {
    if (!usuario) return OrigenFoto.CIUDADANO;
    if (usuario.rol === RolUsuario.INGENIERO_A) return OrigenFoto.INGENIERO_A;
    if (usuario.rol === RolUsuario.INGENIERO_B) return OrigenFoto.INGENIERO_B;
    return OrigenFoto.CIUDADANO;
  }

  private async resolverUsuarioId(uuid: string): Promise<string | null> {
    const u = await this.usuariosRepo.findOne({ where: { uuid }, select: ['id'] });
    return u?.id ?? null;
  }

  private puedeVerFoto(
    usuario: UsuarioJwt,
    foto: Pick<Foto, 'categoria' | 'origen'>,
  ): boolean {
    if (usuario.rol !== RolUsuario.MODERADOR) return true;
    if (foto.origen === OrigenFoto.CIUDADANO) return true;
    return this.aisService.categoriasFoto.obligatorias.includes(foto.categoria);
  }

  private parsearExif(raw?: string): ExifFoto | null {
    if (!raw?.trim()) return null;
    try {
      const parsed = JSON.parse(raw) as ExifFoto;
      if (typeof parsed !== 'object' || parsed === null) {
        throw new Error('invalid');
      }
      return parsed;
    } catch {
      throw new UnprocessableEntityException({
        error: 'exif_invalido',
        mensaje: 'El campo exif debe ser JSON válido.',
      });
    }
  }
}
