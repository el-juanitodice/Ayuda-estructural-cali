import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import { EstadoReporte, HabitabilidadColor } from '../../common/enums/dominio.enum';
import { FormularioAis, EstadoFormulario } from '../../database/entities/formulario-ais.entity';
import { Reporte } from '../../database/entities/reporte.entity';
import { AisService } from '../../shared/ais/ais.service';
import type { CrearReporteDto } from './dto/crear-reporte.dto';

const ESTADOS_MAPA_PUBLICO = [
  EstadoReporte.VALIDADO,
  EstadoReporte.ASIGNADO,
  EstadoReporte.EN_CAPTURA,
  EstadoReporte.EN_REVISION_A,
  EstadoReporte.REQUIERE_ESPECIALISTA,
  EstadoReporte.CERRADO,
] as const;

const DESCRIPCION_ESTADO: Record<string, string> = {
  nuevo: 'Recibido. Un moderador te llamará para confirmar los datos.',
  validado: 'Validado por teléfono. En cola para asignar un ingeniero.',
  asignado: 'Un ingeniero tiene asignada la visita.',
  en_captura: 'El ingeniero está haciendo la inspección de campo.',
  en_revision_a: 'La captura está en revisión de un ingeniero nivel A.',
  requiere_especialista: 'Requiere un especialista. Sigue en proceso.',
  vencido: 'La asignación venció; volverá a asignarse.',
  cerrado: 'Inspección cerrada con dictamen firmado.',
  revisado_sin_inspeccion: 'Revisado. No se programó inspección para este reporte.',
};

/** Difuminación ~100 m (equivalente a ST_SnapToGrid 0.001 en Cali). */
function difuminarCoord(lat: number, lng: number) {
  const grid = 0.001;
  return {
    lat: Math.round(Number(lat) / grid) * grid,
    lng: Math.round(Number(lng) / grid) * grid,
  };
}

@Injectable()
export class ReportesService {
  constructor(
    @InjectRepository(Reporte)
    private readonly reportesRepo: Repository<Reporte>,
    @InjectRepository(FormularioAis)
    private readonly formulariosRepo: Repository<FormularioAis>,
    private readonly aisService: AisService,
    private readonly config: ConfigService,
  ) {}

  async crear(dto: CrearReporteDto) {
    const banderas = dto.banderas ?? {};
    const emergencia = this.aisService.requiereLlamar123(dto.descripcion ?? '', banderas);
    const consecutivo = await this.generarConsecutivo();

    const reporte = this.reportesRepo.create({
      uuid: uuidv4(),
      consecutivo,
      reportanteNombre: dto.reportante_nombre,
      reportanteTelefono: dto.reportante_telefono,
      reportanteRelacion: dto.reportante_relacion ?? null,
      direccion: dto.direccion,
      barrio: dto.barrio ?? null,
      lat: dto.lat,
      lng: dto.lng,
      precisionGpsM: dto.precision_gps_m ?? null,
      tipoEdificacion: dto.tipo_edificacion ?? null,
      pisosDeclarados: dto.pisos_declarados ?? null,
      unidadesDeclaradas: dto.unidades_declaradas ?? null,
      habitada: dto.habitada ?? null,
      usoDeclarado: dto.uso_declarado ?? null,
      descripcion: dto.descripcion ?? null,
      mencionaColapso: !!banderas.colapsoEnCurso,
      estado: EstadoReporte.NUEVO,
    });

    await this.reportesRepo.save(reporte);

    if (emergencia) {
      throw new ConflictException({
        error: 'emergencia_123',
        mensaje:
          'Esto describe una emergencia. LLAMA AL 123 AHORA. Tu reporte quedó guardado.',
        uuid: reporte.uuid,
        consecutivo: reporte.consecutivo,
      });
    }

    return { uuid: reporte.uuid, consecutivo: reporte.consecutivo };
  }

  async mapaPublico() {
    const incluirNuevo = this.config.get<boolean>('operacion.mapaIncluirNuevo', false);
    const estadosVisibles: EstadoReporte[] = incluirNuevo
      ? [EstadoReporte.NUEVO, ...ESTADOS_MAPA_PUBLICO]
      : [...ESTADOS_MAPA_PUBLICO];

    const reportes = await this.reportesRepo.find({
      where: { estado: In(estadosVisibles) },
      order: { creadoEn: 'ASC' },
    });

    const firmados = await this.formulariosRepo.find({
      where: {
        reporteId: In(reportes.map((r) => r.id)),
        estado: EstadoFormulario.FIRMADO,
      },
    });
    const firmadosPorReporte = new Map(firmados.map((f) => [f.reporteId, f]));

    const puntos = reportes.map((r) => {
      const formulario = firmadosPorReporte.get(r.id);
      const { lat, lng } = difuminarCoord(Number(r.lat), Number(r.lng));
      const conDictamen = r.estado === EstadoReporte.CERRADO;

      return {
        uuid: r.uuid,
        consecutivo: r.consecutivo,
        barrio: r.barrio,
        comuna: r.comuna,
        lat,
        lng,
        color: conDictamen ? (formulario?.habitabilidadFinal ?? HabitabilidadColor.GRIS) : HabitabilidadColor.GRIS,
        con_dictamen: conDictamen,
        dictaminado_en: formulario?.firmadoEn ?? null,
      };
    });

    return {
      leyenda: {
        gris: 'Reportado por un ciudadano, sin inspección técnica. No indica daño.',
        colores: 'Inspección cerrada y firmada por un ingeniero.',
        advertencia: 'Que no haya punto no significa que una edificación esté en buen estado.',
      },
      puntos,
    };
  }

  async consultarEstado(consecutivo: string) {
    const reporte = await this.reportesRepo.findOne({
      where: { consecutivo: consecutivo.toUpperCase() },
    });

    if (!reporte) {
      throw new NotFoundException({
        error: 'no_existe',
        mensaje: 'Radicado no encontrado.',
      });
    }

    let estado = reporte.estado;
    if (estado === EstadoReporte.DESCARTADO) {
      estado = 'revisado_sin_inspeccion' as EstadoReporte;
    }

    let color: HabitabilidadColor | null = null;
    let firmadoEn: Date | null = null;

    if (reporte.estado === EstadoReporte.CERRADO) {
      const formulario = await this.formulariosRepo.findOne({
        where: { reporteId: reporte.id, estado: EstadoFormulario.FIRMADO },
      });
      color = formulario?.habitabilidadFinal ?? null;
      firmadoEn = formulario?.firmadoEn ?? null;
    }

    return {
      consecutivo: reporte.consecutivo,
      estado,
      descripcion: DESCRIPCION_ESTADO[estado] ?? estado,
      barrio: reporte.barrio,
      comuna: reporte.comuna,
      direccion: reporte.direccion,
      descripcion_reporte: reporte.descripcion,
      tipo_edificacion: reporte.tipoEdificacion,
      pisos_declarados: reporte.pisosDeclarados,
      unidades_declaradas: reporte.unidadesDeclaradas,
      habitada: reporte.habitada,
      uso_declarado: reporte.usoDeclarado,
      creado_en: reporte.creadoEn,
      validado_en: reporte.validadoEn,
      firmado_en: firmadoEn,
      color,
    };
  }

  private async generarConsecutivo(): Promise<string> {
    const anio = new Date().getFullYear();
    const prefijo = `CAL-${anio}-`;

    const ultimo = await this.reportesRepo
      .createQueryBuilder('r')
      .where('r.consecutivo LIKE :prefijo', { prefijo: `${prefijo}%` })
      .orderBy('r.consecutivo', 'DESC')
      .getOne();

    const siguiente = ultimo?.consecutivo
      ? Number.parseInt(ultimo.consecutivo.slice(-5), 10) + 1
      : 1;

    return `${prefijo}${String(siguiente).padStart(5, '0')}`;
  }
}
