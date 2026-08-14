import {
  ConflictException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { In, IsNull, Not, Repository } from 'typeorm';
import { EstadoReporte, NivelIngenieria } from '../../common/enums/dominio.enum';
import { PermissionsService } from '../permissions/permissions.service';
import { Asignacion } from '../../database/entities/asignacion.entity';
import { EstadoFormulario, FormularioAis } from '../../database/entities/formulario-ais.entity';
import { Foto } from '../../database/entities/foto.entity';
import { Reporte } from '../../database/entities/reporte.entity';
import { Usuario } from '../../database/entities/usuario.entity';
import { StorageService } from '../storage/storage.service';
import { AisService } from '../../shared/ais/ais.service';
import type {
  AsignarReporteDto,
  DescartarReporteDto,
  ValidarReporteDto,
} from './dto/moderacion.dto';

const RADIO_MISMO_PREDIO_M = 30;
const USOS_INDISPENSABLES = [3, 4, 5, 8];

function distanciaMetros(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6_371_000;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

@Injectable()
export class ModeracionService {
  constructor(
    @InjectRepository(Reporte)
    private readonly reportesRepo: Repository<Reporte>,
    @InjectRepository(Usuario)
    private readonly usuariosRepo: Repository<Usuario>,
    @InjectRepository(Asignacion)
    private readonly asignacionesRepo: Repository<Asignacion>,
    @InjectRepository(FormularioAis)
    private readonly formulariosRepo: Repository<FormularioAis>,
    @InjectRepository(Foto)
    private readonly fotosRepo: Repository<Foto>,
    private readonly aisService: AisService,
    private readonly config: ConfigService,
    private readonly storage: StorageService,
    private readonly permissionsService: PermissionsService,
  ) {}

  async cola() {
    const activos = await this.reportesRepo.find({
      where: { estado: Not(EstadoReporte.DESCARTADO) },
      select: ['id', 'lat', 'lng'],
    });

    const nuevos = await this.reportesRepo.find({
      where: { estado: EstadoReporte.NUEVO },
      order: { creadoEn: 'ASC' },
      take: 200,
    });

    const enriquecidos = nuevos.map((r) => {
      const lat = Number(r.lat);
      const lng = Number(r.lng);
      const reportesDelPredio = activos.filter(
        (o) => distanciaMetros(lat, lng, Number(o.lat), Number(o.lng)) <= RADIO_MISMO_PREDIO_M,
      ).length;

      return { reporte: r, reportesDelPredio, lat, lng };
    });

    enriquecidos.sort((a, b) => {
      if (a.reporte.mencionaColapso !== b.reporte.mencionaColapso) {
        return Number(b.reporte.mencionaColapso) - Number(a.reporte.mencionaColapso);
      }
      if (a.reportesDelPredio !== b.reportesDelPredio) {
        return b.reportesDelPredio - a.reportesDelPredio;
      }
      const usoA = USOS_INDISPENSABLES.includes(Number(a.reporte.usoDeclarado)) ? 1 : 0;
      const usoB = USOS_INDISPENSABLES.includes(Number(b.reporte.usoDeclarado)) ? 1 : 0;
      if (usoA !== usoB) return usoB - usoA;
      const unA = a.reporte.unidadesDeclaradas ?? 1;
      const unB = b.reporte.unidadesDeclaradas ?? 1;
      if (unA !== unB) return unB - unA;
      const habA = a.reporte.habitada ? 1 : 0;
      const habB = b.reporte.habitada ? 1 : 0;
      if (habA !== habB) return habB - habA;
      return b.reporte.creadoEn.getTime() - a.reporte.creadoEn.getTime();
    });

    const fueraCola = await this.reportesRepo.find({
      where: { estado: Not(EstadoReporte.NUEVO) },
      order: { actualizadoEn: 'DESC' },
      take: 100,
    });

    return {
      en_cola: enriquecidos.slice(0, 100).map(({ reporte, reportesDelPredio, lat, lng }) =>
        this.serializarReporte(reporte, { reportesDelPredio, lat, lng, enCola: true }),
      ),
      historial: fueraCola.map((reporte) =>
        this.serializarReporte(reporte, {
          reportesDelPredio: 0,
          lat: Number(reporte.lat),
          lng: Number(reporte.lng),
          enCola: false,
        }),
      ),
    };
  }

  async eliminar(uuid: string) {
    const reporte = await this.reportesRepo.findOne({ where: { uuid } });
    if (!reporte) {
      throw new NotFoundException({ error: 'no_existe', mensaje: 'Reporte no encontrado.' });
    }

    const fotos = await this.fotosRepo.find({ where: { reporteId: reporte.id } });
    for (const foto of fotos) {
      await this.storage.eliminar(foto.rutaFull);
      await this.storage.eliminar(foto.rutaThumb);
    }

    await this.reportesRepo.remove(reporte);
    return { ok: true };
  }

  async validar(uuid: string, dto: ValidarReporteDto) {
    const reporte = await this.buscarNuevo(uuid);
    const corr = dto.correcciones ?? {};

    const tras = {
      ...reporte,
      direccion: corr.direccion ?? reporte.direccion,
      barrio: corr.barrio ?? reporte.barrio,
      comuna: corr.comuna ?? reporte.comuna,
      pisosDeclarados: corr.pisos_declarados ?? reporte.pisosDeclarados,
      unidadesDeclaradas: corr.unidades_declaradas ?? reporte.unidadesDeclaradas,
      usoDeclarado: corr.uso_declarado ?? reporte.usoDeclarado,
      habitada: corr.habitada ?? reporte.habitada,
      mencionaColapso: corr.menciona_colapso ?? reporte.mencionaColapso,
      mencionaInclinacion: corr.menciona_inclinacion ?? reporte.mencionaInclinacion,
      mencionaGeotecnico: corr.menciona_geotecnico ?? reporte.mencionaGeotecnico,
    };

    const reportesDelPredio = await this.contarEnPredio(tras);
    const dictamenPrevio = await this.dictamenPrevioEnPredio(tras);

    const motivos = this.aisService.motivosEscalacionA(
      {
        uso_declarado: tras.usoDeclarado,
        pisos_declarados: tras.pisosDeclarados,
        menciona_colapso: tras.mencionaColapso,
        menciona_inclinacion: tras.mencionaInclinacion,
        menciona_geotecnico: tras.mencionaGeotecnico,
      },
      { reportesDelPredio, dictamenPrevio },
    );

    Object.assign(reporte, {
      direccion: tras.direccion,
      barrio: tras.barrio,
      comuna: tras.comuna,
      pisosDeclarados: tras.pisosDeclarados,
      unidadesDeclaradas: tras.unidadesDeclaradas,
      usoDeclarado: tras.usoDeclarado,
      habitada: tras.habitada,
      mencionaColapso: tras.mencionaColapso,
      mencionaInclinacion: tras.mencionaInclinacion,
      mencionaGeotecnico: tras.mencionaGeotecnico,
      requiereNivelA: motivos.length > 0,
      motivoEscalacion: motivos,
      notasLlamada: dto.notas_llamada,
      validadoEn: new Date(),
      estado: EstadoReporte.VALIDADO,
    });

    await this.reportesRepo.save(reporte);

    return { ok: true, requiere_nivel_a: motivos.length > 0, motivos };
  }

  async descartar(uuid: string, dto: DescartarReporteDto) {
    const reporte = await this.buscarNuevo(uuid);
    reporte.motivoDescarte = dto.motivo;
    reporte.estado = EstadoReporte.DESCARTADO;
    if (dto.nota) reporte.notasLlamada = dto.nota;
    await this.reportesRepo.save(reporte);
    return { ok: true };
  }

  async listarIngenieros() {
    const candidatos = await this.usuariosRepo.find({
      where: { activo: true },
      order: { nombre: 'ASC' },
    });

    const ingenieros = (
      await Promise.all(
        candidatos.map(async (ing) => {
          const nivel = await this.permissionsService.getAssignableEngineeringLevel(ing.roleId);
          if (!nivel) return null;
          const carga = await this.asignacionesRepo.count({
            where: {
              ingenieroId: ing.id,
              cerradaEn: IsNull(),
              liberadaEn: IsNull(),
            },
          });
          return {
            id: Number(ing.id),
            nombre: ing.nombre,
            nivel,
            profesion: ing.profesion,
            matricula: ing.matricula,
            carga_actual: carga,
          };
        }),
      )
    ).filter((row): row is NonNullable<typeof row> => row !== null);

    ingenieros.sort((a, b) => a.carga_actual - b.carga_actual || a.nombre.localeCompare(b.nombre));
    return { ingenieros };
  }

  async asignar(uuid: string, dto: AsignarReporteDto, moderadorUuid: string) {
    const reporte = await this.reportesRepo.findOne({ where: { uuid } });
    if (!reporte) {
      throw new NotFoundException({ error: 'no_existe', mensaje: 'Reporte no encontrado.' });
    }
    if (![EstadoReporte.VALIDADO, EstadoReporte.VENCIDO].includes(reporte.estado)) {
      throw new ConflictException({
        error: 'estado_invalido',
        mensaje: `El reporte está en estado ${reporte.estado}.`,
      });
    }

    const ingeniero = await this.usuariosRepo.findOne({
      where: {
        id: String(dto.ingeniero_id),
        activo: true,
      },
    });
    if (!ingeniero) {
      throw new NotFoundException({
        error: 'ingeniero_no_existe',
        mensaje: 'Ingeniero no encontrado o inactivo.',
      });
    }

    const nivel = await this.permissionsService.getAssignableEngineeringLevel(ingeniero.roleId);
    if (!nivel) {
      throw new NotFoundException({
        error: 'ingeniero_no_existe',
        mensaje: 'El usuario indicado no puede recibir asignaciones de campo.',
      });
    }

    if (reporte.requiereNivelA && nivel === 'B') {
      throw new UnprocessableEntityException({
        error: 'requiere_nivel_a',
        mensaje: 'Este reporte está escalado: solo puede asignarse a un ingeniero nivel A.',
      });
    }

    const moderador = await this.usuariosRepo.findOne({ where: { uuid: moderadorUuid } });
    if (!moderador) {
      throw new UnauthorizedException({
        error: 'no_autorizado',
        mensaje: 'Moderador no encontrado.',
      });
    }

    const ttlHoras = this.config.get<number>('operacion.asignacionTtlHoras', 48);
    const venceEn = new Date(Date.now() + ttlHoras * 3_600_000);

    await this.asignacionesRepo.save(
      this.asignacionesRepo.create({
        reporteId: reporte.id,
        ingenieroId: ingeniero.id,
        asignadoPorId: moderador.id,
        nivelIngenieria: nivel === 'A' ? NivelIngenieria.A : NivelIngenieria.B,
        venceEn,
      }),
    );

    reporte.estado = EstadoReporte.ASIGNADO;
    await this.reportesRepo.save(reporte);

    return { ok: true, vence_en_horas: ttlHoras };
  }

  private async buscarNuevo(uuid: string) {
    const reporte = await this.reportesRepo.findOne({ where: { uuid } });
    if (!reporte) {
      throw new NotFoundException({ error: 'no_existe', mensaje: 'Reporte no encontrado.' });
    }
    if (reporte.estado !== EstadoReporte.NUEVO) {
      throw new ConflictException({
        error: 'estado_invalido',
        mensaje: `El reporte está en estado ${reporte.estado}.`,
      });
    }
    return reporte;
  }

  private async contarEnPredio(reporte: Reporte) {
    const activos = await this.reportesRepo.find({
      where: { estado: Not(EstadoReporte.DESCARTADO) },
      select: ['lat', 'lng'],
    });
    const lat = Number(reporte.lat);
    const lng = Number(reporte.lng);
    return activos.filter(
      (o) => distanciaMetros(lat, lng, Number(o.lat), Number(o.lng)) <= RADIO_MISMO_PREDIO_M,
    ).length;
  }

  private async dictamenPrevioEnPredio(reporte: Reporte): Promise<string | null> {
    const activos = await this.reportesRepo.find({
      where: { estado: Not(EstadoReporte.DESCARTADO) },
    });
    const lat = Number(reporte.lat);
    const lng = Number(reporte.lng);
    const cercanos = activos.filter(
      (o) =>
        o.id !== reporte.id &&
        distanciaMetros(lat, lng, Number(o.lat), Number(o.lng)) <= RADIO_MISMO_PREDIO_M,
    );
    if (!cercanos.length) return null;

    const firmados = await this.formulariosRepo.find({
      where: {
        reporteId: In(cercanos.map((c) => c.id)),
        estado: EstadoFormulario.FIRMADO,
      },
      order: { firmadoEn: 'DESC' },
      take: 1,
    });

    const color = firmados[0]?.habitabilidadFinal;
    return color && ['naranja', 'rojo'].includes(color) ? color : null;
  }

  private serializarReporte(
    reporte: Reporte,
    extra: { reportesDelPredio: number; lat: number; lng: number; enCola: boolean },
  ) {
    return {
      uuid: reporte.uuid,
      consecutivo: reporte.consecutivo,
      estado: reporte.estado,
      en_cola: extra.enCola,
      reportante_nombre: reporte.reportanteNombre,
      reportante_telefono: reporte.reportanteTelefono,
      reportante_relacion: reporte.reportanteRelacion,
      direccion: reporte.direccion,
      barrio: reporte.barrio,
      comuna: reporte.comuna,
      tipo_edificacion: reporte.tipoEdificacion,
      pisos_declarados: reporte.pisosDeclarados,
      unidades_declaradas: reporte.unidadesDeclaradas,
      habitada: reporte.habitada,
      uso_declarado: reporte.usoDeclarado,
      descripcion: reporte.descripcion,
      menciona_colapso: reporte.mencionaColapso,
      requiere_nivel_a: reporte.requiereNivelA,
      motivo_escalacion: reporte.motivoEscalacion,
      motivo_descarte: reporte.motivoDescarte,
      creado_en: reporte.creadoEn,
      actualizado_en: reporte.actualizadoEn,
      lat: extra.lat,
      lng: extra.lng,
      reportes_del_predio: extra.reportesDelPredio,
    };
  }
}
