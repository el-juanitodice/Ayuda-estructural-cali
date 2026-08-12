/**
 * Rutas de campo (API.md §Ingeniero, BRIEF §2.1, §2.6, §3, FLUJOS §7).
 *
 *  - B captura: nunca dictamina. A revisa, asigna riesgos y FIRMA.
 *  - El servidor recalcula habitabilidadSugerida SIEMPRE (shared/ais.js);
 *    jamás confía en el valor del cliente.
 *  - Firmar exige ticket de re-autenticación (5 min, un solo uso).
 *  - Un formulario firmado es INMUTABLE.
 *  - Idempotente por uuid del cliente: la cola offline puede reintentar.
 */

import {
  validarMatrizDanos, habitabilidadSugerida, CATEGORIAS_FOTO,
} from '../../../shared/ais.js';
import { sql } from '../db.js';
import { auditar, transicionReporte } from '../auditoria.js';
import { exigirRol } from '../auth/sesiones.js';
import { validarTicketFirma } from './auth.js';
import { prefirmarGet } from '../s3.js';
import { notificarDictamen } from '../sms.js';

const NIVEL = ['bajo', 'bajo_medidas', 'alto', 'muy_alto'];
const COLORES = ['verde', 'amarillo', 'naranja', 'rojo'];

const CAMPOS_FORM = [
  'comuna', 'barrio', 'sector', 'manzana', 'predio',
  'tipo_inspeccion', 'motivo_no_inspeccion',
  'direccion', 'nombre_edificacion', 'pisos_sobre_terreno', 'sotanos',
  'uso_edificacion', 'uso_planta_baja', 'frente_m', 'fondo_m',
  'sistema_estructural', 'tipo_entrepiso', 'anio_construccion',
  'colapso', 'inclinacion', 'asentamiento', 'falla_talud',
  'morfologia_sitio', 'origen_movimiento', 'potencial_reactivacion',
  'piso_mayor_dano', 'porcentaje_dano', 'comentarios', 'esquema_svg',
  'condiciones_preexistentes', 'recomendaciones', 'efecto_ocupantes',
  'ocupacion', 'contacto_predio',
];

export default async function rutasCampo(app) {
  const soloIngenieros = exigirRol('ingeniero_a', 'ingeniero_b');
  const soloA = exigirRol('ingeniero_a');

  // ── Mis asignaciones (todo lo necesario para trabajar offline) ─────
  app.get('/campo/mis-asignaciones', { preHandler: soloIngenieros }, async (req) => {
    // Marca abierta_en la primera vez (el recordatorio de 24 h depende de esto)
    await sql`
      UPDATE asignaciones SET abierta_en = now()
      WHERE ingeniero_id = ${req.usuario.id} AND abierta_en IS NULL
        AND cerrada_en IS NULL AND liberada_en IS NULL`;

    const asignaciones = await sql`
      SELECT a.id AS asignacion_id, a.vence_en, a.rol_asignado,
             r.uuid AS reporte_uuid, r.consecutivo, r.direccion, r.barrio, r.comuna,
             r.tipo_edificacion, r.pisos_declarados, r.unidades_declaradas,
             r.habitada, r.uso_declarado, r.descripcion, r.estado,
             r.requiere_nivel_a, r.motivo_escalacion,
             ST_Y(r.geom::geometry) AS lat, ST_X(r.geom::geometry) AS lng,
             f.uuid AS formulario_uuid, f.estado AS formulario_estado
      FROM asignaciones a
      JOIN reportes r ON r.id = a.reporte_id
      LEFT JOIN formularios_ais f ON f.reporte_id = r.id AND f.estado <> 'firmado'
      WHERE a.ingeniero_id = ${req.usuario.id}
        AND a.cerrada_en IS NULL AND a.liberada_en IS NULL
      ORDER BY a.vence_en ASC`;
    // B NO recibe teléfonos ni nombre del reportante (BRIEF §2.4): no los necesita.

    const fotosPorReporte = {};
    for (const a of asignaciones) {
      fotosPorReporte[a.reporte_uuid] = await sql`
        SELECT f.uuid, f.categoria, f.piso, f.origen
        FROM fotos f JOIN reportes r ON r.id = f.reporte_id
        WHERE r.uuid = ${a.reporte_uuid} ORDER BY f.categoria, f.orden`;
    }
    return { asignaciones, fotos: fotosPorReporte };
  });

  // ── URL de lectura de una foto (bucket privado) ────────────────────
  app.get('/fotos/:uuid', {
    preHandler: exigirRol('moderador', 'coordinador', 'admin', 'ingeniero_a', 'ingeniero_b'),
    schema: {
      params: { type: 'object', properties: { uuid: { type: 'string', format: 'uuid' } } },
      querystring: {
        type: 'object', additionalProperties: false,
        properties: { tam: { type: 'string', enum: ['thumb', 'full'], default: 'thumb' } },
      },
    },
  }, async (req, reply) => {
    const [foto] = await sql`
      SELECT key_full, key_thumb, categoria FROM fotos WHERE uuid = ${req.params.uuid}`;
    if (!foto) return reply.code(404).send({ error: 'no_existe', mensaje: 'Foto no encontrada.' });

    // El moderador solo accede a las 3 categorías obligatorias (API.md)
    if (req.usuario.rol === 'moderador'
        && !CATEGORIAS_FOTO.obligatorias.includes(foto.categoria)) {
      return reply.code(403).send({ error: 'rol_insuficiente', mensaje: 'Categoría restringida.' });
    }
    const url = await prefirmarGet(req.query.tam === 'full' ? foto.key_full : foto.key_thumb);
    return { url, expira_segundos: 900 };
  });

  // ── Upsert del formulario AIS (borrador / captura cerrada) ─────────
  app.post('/campo/formularios', {
    preHandler: soloIngenieros,
    schema: {
      body: {
        type: 'object',
        required: ['uuid', 'reporte_uuid', 'estado'],
        additionalProperties: true, // los campos AIS van llegando por partes
        properties: {
          uuid: { type: 'string', format: 'uuid' },
          reporte_uuid: { type: 'string', format: 'uuid' },
          estado: { type: 'string', enum: ['borrador', 'capturado'] },
          danos: { type: 'array' },
          visita_presencial_b: { type: ['boolean', 'null'] },
          creado_offline_en: { type: ['string', 'null'] },
        },
      },
    },
  }, async (req, reply) => {
    const b = req.body;

    const [reporte] = await sql`SELECT id, estado FROM reportes WHERE uuid = ${b.reporte_uuid}`;
    if (!reporte) return reply.code(404).send({ error: 'reporte_no_existe', mensaje: 'Reporte no encontrado.' });

    const [previo] = await sql`SELECT id, estado FROM formularios_ais WHERE uuid = ${b.uuid}`;
    if (previo?.estado === 'firmado') {
      // Inmutable: una corrección sería una revisión nueva, no un update
      return reply.code(409).send({ error: 'firmado_inmutable', mensaje: 'El formulario ya está firmado.' });
    }

    // Matriz de daños: si viene, cada fila debe sumar 100 (shared/ais.js)
    if (Array.isArray(b.danos) && b.danos.length) {
      const filas = b.danos.map((d) => ({
        elemento: d.elemento, ninguno: d.pct_ninguno, leve: d.pct_leve,
        moderado: d.pct_moderado, fuerte: d.pct_fuerte, severo: d.pct_severo,
      }));
      const v = validarMatrizDanos(filas);
      if (!v.ok) {
        return reply.code(422).send({ error: 'matriz_danos', mensaje: 'La matriz de daños no cuadra.', detalles: v.errores });
      }
    }
    if (b.estado === 'capturado' && !Array.isArray(b.danos)) {
      return reply.code(422).send({ error: 'matriz_requerida', mensaje: 'Cerrar la captura exige la matriz de daños.' });
    }

    // Solo columnas conocidas; lo demás se ignora (no inventamos campos AIS)
    const datos = {};
    for (const c of CAMPOS_FORM) if (b[c] !== undefined) datos[c] = b[c];
    const jsonb = ['condiciones_preexistentes', 'recomendaciones', 'efecto_ocupantes', 'ocupacion', 'contacto_predio'];
    for (const c of jsonb) if (datos[c] !== undefined) datos[c] = sql.json(datos[c] || {});

    const cerrando = b.estado === 'capturado';

    await sql.begin(async (tx) => {
      if (!previo) {
        await tx`
          INSERT INTO formularios_ais ${tx({
            uuid: b.uuid, reporte_id: reporte.id,
            numero_formulario: 'F-' + b.uuid.slice(0, 8).toUpperCase(),
            ...datos,
            estado: b.estado,
            capturado_por: req.usuario.id,
            capturado_en: cerrando ? new Date() : null,
            visita_presencial_b: b.visita_presencial_b ?? null,
            creado_offline_en: b.creado_offline_en ?? null,
            sincronizado_en: new Date(),
          })}`;
      } else {
        await tx`
          UPDATE formularios_ais SET ${tx({
            ...datos,
            estado: b.estado,
            capturado_por: req.usuario.id,
            capturado_en: cerrando ? new Date() : null,
            visita_presencial_b: b.visita_presencial_b ?? null,
            sincronizado_en: new Date(),
          })} WHERE uuid = ${b.uuid}`;
      }

      if (Array.isArray(b.danos)) {
        const [f] = await tx`SELECT id FROM formularios_ais WHERE uuid = ${b.uuid}`;
        await tx`DELETE FROM danos WHERE formulario_id = ${f.id}`;
        for (const d of b.danos) {
          await tx`
            INSERT INTO danos (formulario_id, grupo, elemento,
              pct_ninguno, pct_leve, pct_moderado, pct_fuerte, pct_severo)
            VALUES (${f.id}, ${d.grupo}, ${d.elemento},
              ${d.pct_ninguno || 0}, ${d.pct_leve || 0}, ${d.pct_moderado || 0},
              ${d.pct_fuerte || 0}, ${d.pct_severo || 0})`;
        }
      }

      // Primer guardado sobre un reporte asignado → en_captura
      if (reporte.estado === 'asignado') {
        await transicionReporte(tx, {
          reporteId: reporte.id, estadoAnt: 'asignado', estadoNuevo: 'en_captura',
          usuarioId: req.usuario.id, nota: 'Captura iniciada',
        });
      }

      // B cierra captura → en_revision_a y su asignación se cierra
      if (cerrando && ['en_captura', 'asignado'].includes(reporte.estado)) {
        await transicionReporte(tx, {
          reporteId: reporte.id,
          estadoAnt: reporte.estado === 'asignado' ? 'asignado' : 'en_captura',
          estadoNuevo: 'en_revision_a',
          usuarioId: req.usuario.id, nota: 'Captura cerrada, pasa a revisión de nivel A',
        });
        await tx`
          UPDATE asignaciones SET cerrada_en = now()
          WHERE reporte_id = ${reporte.id} AND ingeniero_id = ${req.usuario.id}
            AND cerrada_en IS NULL AND liberada_en IS NULL`;
      }
    });

    return { ok: true, uuid: b.uuid, estado: b.estado };
  });

  // ── Cola de revisión del nivel A ───────────────────────────────────
  app.get('/campo/revision', { preHandler: soloA }, async () => {
    const pendientes = await sql`
      SELECT r.uuid AS reporte_uuid, r.consecutivo, r.direccion, r.barrio, r.comuna,
             r.requiere_nivel_a, r.motivo_escalacion,
             f.uuid AS formulario_uuid, f.capturado_en, f.visita_presencial_b,
             u.nombre AS capturado_por_nombre, u.matricula AS capturado_por_matricula
      FROM reportes r
      JOIN formularios_ais f ON f.reporte_id = r.id AND f.estado = 'capturado'
      LEFT JOIN usuarios u ON u.id = f.capturado_por
      WHERE r.estado = 'en_revision_a'
      ORDER BY f.capturado_en ASC`;
    return { pendientes };
  });

  // ── Formulario completo (revisión de A, o el propio B) ─────────────
  app.get('/campo/formularios/:uuid', {
    preHandler: soloIngenieros,
    schema: { params: { type: 'object', properties: { uuid: { type: 'string', format: 'uuid' } } } },
  }, async (req, reply) => {
    const [f] = await sql`
      SELECT f.*, r.uuid AS reporte_uuid, r.consecutivo, r.direccion AS reporte_direccion,
             r.barrio AS reporte_barrio, r.descripcion AS reporte_descripcion,
             r.pisos_declarados, r.uso_declarado, r.requiere_nivel_a, r.motivo_escalacion,
             ub.nombre AS capturado_por_nombre, ub.matricula AS capturado_por_matricula,
             ua.nombre AS firmado_por_nombre, ua.matricula AS firmado_por_matricula
      FROM formularios_ais f
      JOIN reportes r ON r.id = f.reporte_id
      LEFT JOIN usuarios ub ON ub.id = f.capturado_por
      LEFT JOIN usuarios ua ON ua.id = f.firmado_por
      WHERE f.uuid = ${req.params.uuid}`;
    if (!f) return reply.code(404).send({ error: 'no_existe', mensaje: 'Formulario no encontrado.' });

    if (req.usuario.rol === 'ingeniero_b' && f.capturado_por !== req.usuario.id) {
      return reply.code(403).send({ error: 'rol_insuficiente', mensaje: 'No es tu captura.' });
    }

    const danos = await sql`
      SELECT grupo, elemento, pct_ninguno, pct_leve, pct_moderado, pct_fuerte, pct_severo
      FROM danos WHERE formulario_id = ${f.id} ORDER BY grupo, elemento`;
    const fotos = await sql`
      SELECT uuid, categoria, piso, origen FROM fotos
      WHERE reporte_id = ${f.reporte_id} ORDER BY categoria, orden`;

    delete f.id;
    return { formulario: f, danos, fotos };
  });

  // ── FIRMA del nivel A (BRIEF §2.1 y §2.6) ──────────────────────────
  app.post('/campo/formularios/:uuid/firmar', {
    preHandler: soloA,
    schema: {
      params: { type: 'object', properties: { uuid: { type: 'string', format: 'uuid' } } },
      body: {
        type: 'object',
        required: ['ticket_firma', 'riesgos', 'habitabilidad_final', 'visita_presencial'],
        additionalProperties: false,
        properties: {
          ticket_firma: { type: 'string', minLength: 20 },
          riesgos: {
            type: 'object',
            required: ['estabilidad', 'geotecnico', 'estructural', 'no_estructural'],
            additionalProperties: false,
            properties: {
              estabilidad: { type: 'string', enum: NIVEL },
              geotecnico: { type: 'string', enum: NIVEL },
              estructural: { type: 'string', enum: NIVEL },
              no_estructural: { type: 'string', enum: NIVEL },
            },
          },
          habitabilidad_final: { type: 'string', enum: COLORES },
          motivo_discrepancia: { type: ['string', 'null'], maxLength: 2000 },
          visita_presencial: { type: 'boolean' },
        },
      },
    },
  }, async (req, reply) => {
    const { ticket_firma, riesgos, habitabilidad_final, motivo_discrepancia, visita_presencial } = req.body;

    // Re-autenticación reciente y de un solo uso (BRIEF §2.6)
    if (!validarTicketFirma(ticket_firma, req.usuario.id)) {
      return reply.code(401).send({
        error: 'ticket_invalido',
        mensaje: 'Confirma tu contraseña de nuevo para firmar (el permiso dura 5 minutos).',
      });
    }

    const [f] = await sql`
      SELECT f.id, f.estado, f.reporte_id, r.estado AS reporte_estado,
             r.consecutivo, r.reportante_telefono, r.uuid AS reporte_uuid
      FROM formularios_ais f JOIN reportes r ON r.id = f.reporte_id
      WHERE f.uuid = ${req.params.uuid}`;
    if (!f) return reply.code(404).send({ error: 'no_existe', mensaje: 'Formulario no encontrado.' });
    if (f.estado === 'firmado') {
      return reply.code(409).send({ error: 'ya_firmado', mensaje: 'Este formulario ya fue firmado.' });
    }

    // EL SERVIDOR recalcula. Nunca confía en el cliente (BRIEF §4.3).
    const sugerida = habitabilidadSugerida(riesgos);
    if (sugerida === null) {
      return reply.code(422).send({ error: 'riesgos_incompletos', mensaje: 'Faltan niveles de riesgo.' });
    }
    if (habitabilidad_final !== sugerida && !motivo_discrepancia) {
      // No corrige, no bloquea el criterio profesional: exige justificación
      return reply.code(422).send({
        error: 'discrepancia_sin_motivo',
        sugerida,
        mensaje: `Según los riesgos corresponde ${sugerida.toUpperCase()}. ` +
          'Puedes mantener tu color, pero explica el motivo.',
      });
    }

    await sql.begin(async (tx) => {
      await tx`
        UPDATE formularios_ais SET
          riesgo_estabilidad = ${riesgos.estabilidad},
          riesgo_geotecnico = ${riesgos.geotecnico},
          riesgo_estructural = ${riesgos.estructural},
          riesgo_no_estructural = ${riesgos.no_estructural},
          habitabilidad_sugerida = ${sugerida},
          habitabilidad_final = ${habitabilidad_final},
          motivo_discrepancia = ${habitabilidad_final !== sugerida ? motivo_discrepancia : null},
          firmado_por = ${req.usuario.id}, firmado_en = now(),
          visita_presencial_a = ${visita_presencial},
          estado = 'firmado'
        WHERE id = ${f.id}`;
      await transicionReporte(tx, {
        reporteId: f.reporte_id, estadoAnt: f.reporte_estado, estadoNuevo: 'cerrado',
        usuarioId: req.usuario.id,
        nota: `Dictamen firmado: ${habitabilidad_final}` +
          (habitabilidad_final !== sugerida ? ` (sugerida: ${sugerida}, con justificación)` : ''),
      });
      await tx`
        UPDATE asignaciones SET cerrada_en = now()
        WHERE reporte_id = ${f.reporte_id} AND ingeniero_id = ${req.usuario.id}
          AND cerrada_en IS NULL AND liberada_en IS NULL`;
    });

    await auditar({
      usuarioId: req.usuario.id, accion: 'firmar', entidad: 'formularios_ais',
      entidadId: f.id, detalle: { color: habitabilidad_final, sugerida, visita_presencial }, ip: req.ip,
    });

    // Cierre del ciclo hacia el ciudadano (FLUJOS §8)
    await notificarDictamen({
      telefono: f.reportante_telefono, consecutivo: f.consecutivo,
      color: habitabilidad_final, log: req.log,
    }).catch(() => {});

    return {
      ok: true, habitabilidad_final, sugerida,
      discrepancia: habitabilidad_final !== sugerida,
      recordatorio: 'Imprime el aviso, pégalo en cada entrada y explícalo a los ocupantes.',
    };
  });
}
