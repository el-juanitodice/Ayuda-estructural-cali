import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, IsNull, Repository } from 'typeorm';
import { EstadoReporte, HabitabilidadColor } from '../../common/enums/dominio.enum';
import type { UsuarioJwt } from '../auth/interfaces/usuario-jwt.interface';
import { PermissionsService } from '../permissions/permissions.service';
import { Asignacion } from '../../database/entities/asignacion.entity';
import {
  EstadoFormulario,
  FormularioAis,
  type DanoAis,
} from '../../database/entities/formulario-ais.entity';
import { Foto } from '../../database/entities/foto.entity';
import { Reporte } from '../../database/entities/reporte.entity';
import { Usuario } from '../../database/entities/usuario.entity';
import { TicketFirmaService } from '../auth/ticket-firma.service';
import { AisService } from '../../shared/ais/ais.service';
import type { FirmarFormularioDto, GuardarFormularioDto } from './dto/campo.dto';

@Injectable()
export class CampoService {
  constructor(
    @InjectRepository(FormularioAis)
    private readonly formulariosRepo: Repository<FormularioAis>,
    @InjectRepository(Reporte)
    private readonly reportesRepo: Repository<Reporte>,
    @InjectRepository(Foto)
    private readonly fotosRepo: Repository<Foto>,
    @InjectRepository(Usuario)
    private readonly usuariosRepo: Repository<Usuario>,
    @InjectRepository(Asignacion)
    private readonly asignacionesRepo: Repository<Asignacion>,
    private readonly aisService: AisService,
    private readonly ticketFirma: TicketFirmaService,
    private readonly dataSource: DataSource,
    private readonly permissionsService: PermissionsService,
  ) {}

  async misAsignaciones(usuarioUuid: string) {
    const usuario = await this.usuariosRepo.findOne({ where: { uuid: usuarioUuid, activo: true } });
    if (!usuario) {
      throw new UnauthorizedException({
        error: 'no_autorizado',
        mensaje: 'Sesión inválida.',
      });
    }

    type FilaAsignacion = {
      asignacion_id: string | null;
      vence_en: Date | null;
      cerrada_en: Date | null;
      liberada_en: Date | null;
      nivel_ingenieria: string | null;
      reporte_id: string;
      reporte_uuid: string;
      consecutivo: string;
      direccion: string;
      barrio: string | null;
      comuna: string | null;
      tipo_edificacion: string | null;
      pisos_declarados: number | null;
      unidades_declaradas: number | null;
      habitada: number | null;
      uso_declarado: number | null;
      descripcion: string | null;
      estado: string;
      requiere_nivel_a: number;
      motivo_escalacion: string[] | null;
      lat: string;
      lng: string;
      formulario_uuid: string | null;
      formulario_estado: string | null;
      capturado_por_id: string | null;
      capturado_en: Date | null;
      firmado_en: Date | null;
    };

    const activas = await this.dataSource.query<FilaAsignacion[]>(
      `
      SELECT a.id AS asignacion_id, a.vence_en, a.cerrada_en, a.liberada_en, a.nivel_ingenieria,
             r.id AS reporte_id, r.uuid AS reporte_uuid, r.consecutivo, r.direccion, r.barrio, r.comuna,
             r.tipo_edificacion, r.pisos_declarados, r.unidades_declaradas,
             r.habitada, r.uso_declarado, r.descripcion, r.estado,
             r.requiere_nivel_a, r.motivo_escalacion,
             r.lat, r.lng,
             f.uuid AS formulario_uuid, f.estado AS formulario_estado,
             f.capturado_por AS capturado_por_id, f.capturado_en, f.firmado_en
      FROM asignaciones a
      INNER JOIN reportes r ON r.id = a.reporte_id
      LEFT JOIN formularios_ais f ON f.reporte_id = r.id AND f.estado <> 'firmado'
      WHERE a.ingeniero_id = ?
        AND a.cerrada_en IS NULL
        AND a.liberada_en IS NULL
      ORDER BY a.vence_en ASC
      `,
      [usuario.id],
    );

    const historial = await this.dataSource.query<FilaAsignacion[]>(
      `
      SELECT a.id AS asignacion_id, a.vence_en, a.cerrada_en, a.liberada_en, a.nivel_ingenieria,
             r.id AS reporte_id, r.uuid AS reporte_uuid, r.consecutivo, r.direccion, r.barrio, r.comuna,
             r.tipo_edificacion, r.pisos_declarados, r.unidades_declaradas,
             r.habitada, r.uso_declarado, r.descripcion, r.estado,
             r.requiere_nivel_a, r.motivo_escalacion,
             r.lat, r.lng,
             f.uuid AS formulario_uuid, f.estado AS formulario_estado,
             f.capturado_por AS capturado_por_id, f.capturado_en, f.firmado_en
      FROM formularios_ais f
      INNER JOIN reportes r ON r.id = f.reporte_id
      LEFT JOIN asignaciones a ON a.reporte_id = r.id AND a.ingeniero_id = ?
      WHERE f.capturado_por = ?
        AND (
          f.estado IN ('capturado', 'firmado')
          OR EXISTS (
            SELECT 1 FROM asignaciones ax
            WHERE ax.reporte_id = r.id AND ax.ingeniero_id = ?
              AND (ax.cerrada_en IS NOT NULL OR ax.liberada_en IS NOT NULL)
          )
        )
      ORDER BY COALESCE(f.firmado_en, f.capturado_en, f.creado_en) DESC
      LIMIT 100
      `,
      [usuario.id, usuario.id, usuario.id],
    );

    const fotos: Record<string, Array<{ uuid: string; categoria: string; piso: string | null; origen: string }>> = {};
    const reporteIds = new Set<string>();

    for (const fila of [...activas, ...historial]) {
      reporteIds.add(fila.reporte_id);
    }

    for (const reporteId of reporteIds) {
      const fila = [...activas, ...historial].find((f) => f.reporte_id === reporteId);
      if (!fila) continue;
      const lista = await this.fotosRepo.find({
        where: { reporteId },
        order: { categoria: 'ASC', orden: 'ASC' },
        select: ['uuid', 'categoria', 'piso', 'origen'],
      });
      fotos[fila.reporte_uuid] = lista.map((f) => ({
        uuid: f.uuid,
        categoria: f.categoria,
        piso: f.piso,
        origen: f.origen,
      }));
    }

    const mapear = (fila: FilaAsignacion) => {
      const asignacionActiva = fila.cerrada_en === null && fila.liberada_en === null;
      const editable =
        fila.formulario_estado !== EstadoFormulario.FIRMADO &&
        (asignacionActiva ||
          (fila.formulario_estado === EstadoFormulario.CAPTURADO &&
            fila.estado === EstadoReporte.EN_REVISION_A &&
            String(fila.capturado_por_id) === String(usuario.id)));

      return {
        asignacion_id: fila.asignacion_id ? Number(fila.asignacion_id) : null,
        vence_en: fila.vence_en,
        nivel_ingenieria: fila.nivel_ingenieria,
        reporte_uuid: fila.reporte_uuid,
        consecutivo: fila.consecutivo,
        direccion: fila.direccion,
        barrio: fila.barrio,
        comuna: fila.comuna,
        tipo_edificacion: fila.tipo_edificacion,
        pisos_declarados: fila.pisos_declarados,
        unidades_declaradas: fila.unidades_declaradas,
        habitada: fila.habitada === null ? null : Boolean(fila.habitada),
        uso_declarado: fila.uso_declarado,
        descripcion: fila.descripcion,
        estado: fila.estado,
        requiere_nivel_a: Boolean(fila.requiere_nivel_a),
        motivo_escalacion: fila.motivo_escalacion ?? [],
        lat: Number(fila.lat),
        lng: Number(fila.lng),
        formulario_uuid: fila.formulario_uuid,
        formulario_estado: fila.formulario_estado,
        capturado_en: fila.capturado_en,
        firmado_en: fila.firmado_en,
        activa: asignacionActiva,
        editable,
      };
    };

    return {
      activas: activas.map(mapear),
      historial: historial.map(mapear),
      fotos,
    };
  }

  async guardarFormulario(dto: GuardarFormularioDto, usuarioUuid: string) {
    const usuario = await this.usuariosRepo.findOne({ where: { uuid: usuarioUuid, activo: true } });
    if (!usuario) {
      throw new UnauthorizedException({
        error: 'no_autorizado',
        mensaje: 'Sesión inválida.',
      });
    }

    const reporte = await this.reportesRepo.findOne({ where: { uuid: dto.reporte_uuid } });
    if (!reporte) {
      throw new NotFoundException({
        error: 'reporte_no_existe',
        mensaje: 'Reporte no encontrado.',
      });
    }

    const previo = await this.formulariosRepo.findOne({ where: { uuid: dto.uuid } });

    const asignacion = await this.asignacionesRepo.findOne({
      where: {
        reporteId: reporte.id,
        ingenieroId: usuario.id,
        cerradaEn: IsNull(),
        liberadaEn: IsNull(),
      },
    });

    const puedeEditarCapturaEnRevision =
      previo?.capturadoPorId === String(usuario.id) &&
      previo.estado === EstadoFormulario.CAPTURADO &&
      reporte.estado === EstadoReporte.EN_REVISION_A;

    if (!asignacion && !puedeEditarCapturaEnRevision) {
      throw new ForbiddenException({
        error: 'sin_asignacion',
        mensaje: 'No tienes una asignación activa sobre este reporte.',
      });
    }

    if (dto.estado === EstadoFormulario.CAPTURADO && !previo?.capturadoEn && !asignacion) {
      throw new ForbiddenException({
        error: 'sin_asignacion',
        mensaje: 'Solo puedes cerrar la captura con una asignación activa.',
      });
    }
    if (previo?.estado === EstadoFormulario.FIRMADO) {
      throw new ConflictException({
        error: 'firmado_inmutable',
        mensaje: 'El formulario ya está firmado.',
      });
    }

    if (dto.danos?.length) {
      const validacion = this.aisService.validarMatrizDanos(
        dto.danos.map((d) => ({
          elemento: d.elemento,
          ninguno: d.pct_ninguno,
          leve: d.pct_leve,
          moderado: d.pct_moderado,
          fuerte: d.pct_fuerte,
          severo: d.pct_severo,
        })),
      );
      if (!validacion.ok) {
        throw new UnprocessableEntityException({
          error: 'matriz_danos',
          mensaje: 'La matriz de daños no cuadra.',
          detalles: validacion.errores,
        });
      }
    }

    if (dto.estado === EstadoFormulario.CAPTURADO && !dto.danos?.length) {
      throw new UnprocessableEntityException({
        error: 'matriz_requerida',
        mensaje: 'Cerrar la captura exige la matriz de daños.',
      });
    }

    const cerrando =
      dto.estado === EstadoFormulario.CAPTURADO &&
      previo?.estado !== EstadoFormulario.CAPTURADO;
    const danosJson = dto.danos as DanoAis[] | undefined;
    const estadoReporteInicial = reporte.estado;

    await this.dataSource.transaction(async (tx) => {
      let formulario = previo;
      if (!formulario) {
        formulario = this.formulariosRepo.create({
          uuid: dto.uuid,
          reporteId: reporte.id,
          estado: dto.estado,
          capturadoPorId: usuario.id,
          capturadoEn: cerrando ? new Date() : null,
          visitaPresencialB: dto.visita_presencial_b ?? null,
          sistemaEstructural: dto.sistema_estructural ?? null,
          colapso: dto.colapso ?? null,
          inclinacion: dto.inclinacion ?? null,
          asentamiento: dto.asentamiento ?? null,
          fallaTalud: dto.falla_talud ?? null,
          pisosSobreTerreno: dto.pisos_sobre_terreno ?? null,
          anioConstruccion: dto.anio_construccion ?? null,
          pisoMayorDano: dto.piso_mayor_dano ?? null,
          porcentajeDano: dto.porcentaje_dano ?? null,
          comentarios: dto.comentarios ?? null,
          danos: danosJson ?? null,
        });
      } else {
        formulario.estado = dto.estado;
        formulario.capturadoPorId = usuario.id;
        formulario.capturadoEn = cerrando ? new Date() : formulario.capturadoEn;
        if (dto.visita_presencial_b !== undefined) {
          formulario.visitaPresencialB = dto.visita_presencial_b;
        }
        if (dto.sistema_estructural !== undefined) {
          formulario.sistemaEstructural = dto.sistema_estructural;
        }
        if (dto.colapso !== undefined) formulario.colapso = dto.colapso;
        if (dto.inclinacion !== undefined) formulario.inclinacion = dto.inclinacion;
        if (dto.asentamiento !== undefined) formulario.asentamiento = dto.asentamiento;
        if (dto.falla_talud !== undefined) formulario.fallaTalud = dto.falla_talud;
        if (dto.pisos_sobre_terreno !== undefined) {
          formulario.pisosSobreTerreno = dto.pisos_sobre_terreno;
        }
        if (dto.anio_construccion !== undefined) {
          formulario.anioConstruccion = dto.anio_construccion;
        }
        if (dto.piso_mayor_dano !== undefined) formulario.pisoMayorDano = dto.piso_mayor_dano;
        if (dto.porcentaje_dano !== undefined) formulario.porcentajeDano = dto.porcentaje_dano;
        if (dto.comentarios !== undefined) formulario.comentarios = dto.comentarios;
        if (danosJson) formulario.danos = danosJson;
      }

      await tx.save(formulario);

      if (estadoReporteInicial === EstadoReporte.ASIGNADO) {
        reporte.estado = EstadoReporte.EN_CAPTURA;
        await tx.save(reporte);
      }

      if (
        cerrando &&
        [EstadoReporte.ASIGNADO, EstadoReporte.EN_CAPTURA].includes(reporte.estado)
      ) {
        reporte.estado = EstadoReporte.EN_REVISION_A;
        await tx.save(reporte);

        await tx
          .createQueryBuilder()
          .update(Asignacion)
          .set({ cerradaEn: new Date() })
          .where('reporte_id = :reporteId', { reporteId: reporte.id })
          .andWhere('ingeniero_id = :ingenieroId', { ingenieroId: usuario.id })
          .andWhere('cerrada_en IS NULL')
          .andWhere('liberada_en IS NULL')
          .execute();
      }
    });

    return { ok: true, uuid: dto.uuid, estado: dto.estado };
  }

  async colaRevision(_usuarioUuid: string) {
    const filas = await this.dataSource.query<
      {
        reporte_uuid: string;
        consecutivo: string;
        direccion: string;
        barrio: string | null;
        comuna: string | null;
        requiere_nivel_a: number;
        motivo_escalacion: string[] | null;
        formulario_uuid: string;
        capturado_en: Date;
        visita_presencial_b: number | null;
        capturado_por_nombre: string | null;
        capturado_por_matricula: string | null;
      }[]
    >(
      `
      SELECT r.uuid AS reporte_uuid, r.consecutivo, r.direccion, r.barrio, r.comuna,
             r.requiere_nivel_a, r.motivo_escalacion,
             f.uuid AS formulario_uuid, f.capturado_en, f.visita_presencial_b,
             u.nombre AS capturado_por_nombre, u.matricula AS capturado_por_matricula
      FROM reportes r
      INNER JOIN formularios_ais f ON f.reporte_id = r.id AND f.estado = 'capturado'
      LEFT JOIN usuarios u ON u.id = f.capturado_por
      WHERE r.estado = 'en_revision_a'
      ORDER BY f.capturado_en ASC
      `,
    );

    const historialFilas = await this.dataSource.query<
      {
        reporte_uuid: string;
        consecutivo: string;
        direccion: string;
        barrio: string | null;
        comuna: string | null;
        requiere_nivel_a: number;
        motivo_escalacion: string[] | null;
        formulario_uuid: string;
        capturado_en: Date;
        visita_presencial_b: number | null;
        capturado_por_nombre: string | null;
        capturado_por_matricula: string | null;
        firmado_en: Date;
        firmado_por_nombre: string | null;
        firmado_por_matricula: string | null;
        habitabilidad_final: string | null;
      }[]
    >(
      `
      SELECT r.uuid AS reporte_uuid, r.consecutivo, r.direccion, r.barrio, r.comuna,
             r.requiere_nivel_a, r.motivo_escalacion,
             f.uuid AS formulario_uuid, f.capturado_en, f.visita_presencial_b,
             uc.nombre AS capturado_por_nombre, uc.matricula AS capturado_por_matricula,
             f.firmado_en, uf.nombre AS firmado_por_nombre, uf.matricula AS firmado_por_matricula,
             f.habitabilidad_final
      FROM formularios_ais f
      INNER JOIN reportes r ON r.id = f.reporte_id
      LEFT JOIN usuarios uc ON uc.id = f.capturado_por
      LEFT JOIN usuarios uf ON uf.id = f.firmado_por
      WHERE f.estado = 'firmado'
      ORDER BY f.firmado_en DESC
      LIMIT 100
      `,
    );

    const mapearPendiente = (fila: (typeof filas)[number]) => ({
      reporte_uuid: fila.reporte_uuid,
      consecutivo: fila.consecutivo,
      direccion: fila.direccion,
      barrio: fila.barrio,
      comuna: fila.comuna,
      requiere_nivel_a: Boolean(fila.requiere_nivel_a),
      motivo_escalacion: fila.motivo_escalacion ?? [],
      formulario_uuid: fila.formulario_uuid,
      capturado_en: fila.capturado_en,
      visita_presencial_b: Boolean(fila.visita_presencial_b),
      capturado_por_nombre: fila.capturado_por_nombre,
      capturado_por_matricula: fila.capturado_por_matricula,
      editable: true,
    });

    return {
      pendientes: filas.map(mapearPendiente),
      historial: historialFilas.map((fila) => ({
        ...mapearPendiente(fila),
        firmado_en: fila.firmado_en,
        firmado_por_nombre: fila.firmado_por_nombre,
        firmado_por_matricula: fila.firmado_por_matricula,
        habitabilidad_final: fila.habitabilidad_final,
        editable: false,
      })),
    };
  }

  async obtenerFormulario(uuid: string, actor: UsuarioJwt) {
    const formulario = await this.formulariosRepo.findOne({
      where: { uuid },
      relations: { reporte: true, capturadoPor: true, firmadoPor: true },
    });

    if (!formulario) {
      throw new NotFoundException({
        error: 'no_existe',
        mensaje: 'Formulario no encontrado.',
      });
    }

    const usuario = await this.usuariosRepo.findOne({ where: { uuid: actor.sub } });
    if (!usuario) {
      throw new UnauthorizedException({
        error: 'no_autorizado',
        mensaje: 'Sesión inválida.',
      });
    }

    const map = await this.permissionsService.getPermissionMapForRole(actor.role_id);
    const puedeCampo = map.campo?.r;
    const puedeRevision = map.revision?.r;
    if (!puedeCampo && !puedeRevision) {
      throw new ForbiddenException({
        error: 'prohibido',
        mensaje: 'No tienes permiso para ver este formulario.',
      });
    }

    const nivel = await this.permissionsService.getEngineeringLevel(actor.role_id);
    if (
      nivel === 'B' &&
      formulario.capturadoPorId !== usuario.id
    ) {
      throw new ForbiddenException({
        error: 'rol_insuficiente',
        mensaje: 'No es tu captura.',
      });
    }

    const fotos = await this.fotosRepo.find({
      where: { reporteId: formulario.reporteId },
      order: { categoria: 'ASC', orden: 'ASC' },
      select: ['uuid', 'categoria', 'piso', 'origen'],
    });

    const reporte = formulario.reporte;

    return {
      formulario: {
        uuid: formulario.uuid,
        estado: formulario.estado,
        reporte_uuid: reporte.uuid,
        consecutivo: reporte.consecutivo,
        direccion: formulario.reporte.direccion,
        reporte_direccion: reporte.direccion,
        reporte_barrio: reporte.barrio,
        reporte_descripcion: reporte.descripcion,
        pisos_declarados: reporte.pisosDeclarados,
        uso_declarado: reporte.usoDeclarado,
        requiere_nivel_a: reporte.requiereNivelA,
        motivo_escalacion: reporte.motivoEscalacion ?? [],
        capturado_en: formulario.capturadoEn,
        visita_presencial_b: formulario.visitaPresencialB,
        visita_presencial_a: formulario.visitaPresencialA,
        sistema_estructural: formulario.sistemaEstructural,
        colapso: formulario.colapso,
        inclinacion: formulario.inclinacion,
        porcentaje_dano: formulario.porcentajeDano,
        piso_mayor_dano: formulario.pisoMayorDano,
        comentarios: formulario.comentarios,
        pisos_sobre_terreno: formulario.pisosSobreTerreno,
        anio_construccion: formulario.anioConstruccion,
        asentamiento: formulario.asentamiento,
        falla_talud: formulario.fallaTalud,
        capturado_por_nombre: formulario.capturadoPor?.nombre ?? null,
        capturado_por_matricula: formulario.capturadoPor?.matricula ?? null,
        firmado_por_nombre: formulario.firmadoPor?.nombre ?? null,
        firmado_por_matricula: formulario.firmadoPor?.matricula ?? null,
        habitabilidad_final: formulario.habitabilidadFinal,
        habitabilidad_sugerida: formulario.habitabilidadSugerida,
        riesgo_estabilidad: formulario.riesgoEstabilidad,
        riesgo_geotecnico: formulario.riesgoGeotecnico,
        riesgo_estructural: formulario.riesgoEstructural,
        riesgo_no_estructural: formulario.riesgoNoEstructural,
        motivo_discrepancia: formulario.motivoDiscrepancia,
        firmado_en: formulario.firmadoEn,
        numero_formulario: `F-${formulario.uuid.slice(0, 8).toUpperCase()}`,
      },
      danos: formulario.danos ?? [],
      fotos: fotos.map((f) => ({
        uuid: f.uuid,
        categoria: f.categoria,
        piso: f.piso,
        origen: f.origen,
      })),
    };
  }

  async firmar(uuid: string, dto: FirmarFormularioDto, usuarioUuid: string) {
    if (!this.ticketFirma.validar(dto.ticket_firma, usuarioUuid)) {
      throw new UnauthorizedException({
        error: 'ticket_invalido',
        mensaje: 'Confirma tu contraseña de nuevo para firmar (el permiso dura 5 minutos).',
      });
    }

    const formulario = await this.formulariosRepo.findOne({
      where: { uuid },
      relations: { reporte: true },
    });

    if (!formulario) {
      throw new NotFoundException({
        error: 'no_existe',
        mensaje: 'Formulario no encontrado.',
      });
    }

    if (formulario.estado === EstadoFormulario.FIRMADO) {
      throw new ConflictException({
        error: 'ya_firmado',
        mensaje: 'Este formulario ya fue firmado.',
      });
    }

    const usuario = await this.usuariosRepo.findOne({ where: { uuid: usuarioUuid } });
    if (!usuario) {
      throw new UnauthorizedException({
        error: 'no_autorizado',
        mensaje: 'Sesión inválida.',
      });
    }

    const sugerida = this.aisService.habitabilidadSugerida(dto.riesgos);
    if (sugerida === null) {
      throw new UnprocessableEntityException({
        error: 'riesgos_incompletos',
        mensaje: 'Faltan niveles de riesgo.',
      });
    }

    if (
      dto.habitabilidad_final !== sugerida &&
      (!dto.motivo_discrepancia || dto.motivo_discrepancia.length < 5)
    ) {
      throw new UnprocessableEntityException({
        error: 'discrepancia_sin_motivo',
        sugerida,
        mensaje: `Según los riesgos corresponde ${sugerida.toUpperCase()}. Puedes mantener tu color, pero explica el motivo.`,
      });
    }

    const reporte = formulario.reporte;
    const estadoReporteAnt = reporte.estado;

    await this.dataSource.transaction(async (tx) => {
      formulario.riesgoEstabilidad = dto.riesgos.estabilidad;
      formulario.riesgoGeotecnico = dto.riesgos.geotecnico;
      formulario.riesgoEstructural = dto.riesgos.estructural;
      formulario.riesgoNoEstructural = dto.riesgos.no_estructural;
      formulario.habitabilidadSugerida = sugerida as HabitabilidadColor;
      formulario.habitabilidadFinal = dto.habitabilidad_final;
      formulario.motivoDiscrepancia =
        dto.habitabilidad_final !== sugerida ? (dto.motivo_discrepancia ?? null) : null;
      formulario.firmadoPorId = usuario.id;
      formulario.firmadoEn = new Date();
      formulario.visitaPresencialA = dto.visita_presencial;
      formulario.estado = EstadoFormulario.FIRMADO;
      await tx.save(formulario);

      reporte.estado = EstadoReporte.CERRADO;
      await tx.save(reporte);

      await tx
        .createQueryBuilder()
        .update(Asignacion)
        .set({ cerradaEn: new Date() })
        .where('reporte_id = :reporteId', { reporteId: reporte.id })
        .andWhere('ingeniero_id = :ingenieroId', { ingenieroId: usuario.id })
        .andWhere('cerrada_en IS NULL')
        .andWhere('liberada_en IS NULL')
        .execute();
    });

    const discrepancia = dto.habitabilidad_final !== sugerida;

    return {
      ok: true,
      habitabilidad_final: dto.habitabilidad_final,
      sugerida,
      discrepancia,
      estado_reporte_anterior: estadoReporteAnt,
      recordatorio: 'Imprime el aviso, pégalo en cada entrada y explícalo a los ocupantes.',
    };
  }
}
