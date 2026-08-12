/**
 * Panel de moderador (API.md §Moderador, FLUJOS §1, §3 y §5).
 *
 *  - La cola se ordena por señales OBJETIVAS, nunca por juicio de gravedad.
 *  - Ver teléfonos queda en `auditoria` (Ley 1581).
 *  - Al validar se ejecuta motivosEscalacionA(): reglas duras, no criterio.
 *  - Asignar a un B algo que requiere nivel A → 422.
 */

import { motivosEscalacionA } from '../../../shared/ais.js';
import { sql } from '../db.js';
import { config } from '../config.js';
import { auditar, transicionReporte } from '../auditoria.js';
import { exigirRol } from '../auth/sesiones.js';

const RADIO_MISMO_PREDIO_M = 30;
const USOS_INDISPENSABLES = [3, 4, 5, 8];

export default async function rutasModeracion(app) {
  const soloModerador = exigirRol('moderador', 'admin');

  // ── Cola de reportes nuevos ────────────────────────────────────────
  app.get('/moderacion/cola', { preHandler: soloModerador }, async (req) => {
    // Prioridad por señales objetivas (FLUJOS §5): reportes independientes
    // del mismo predio, uso indispensable, unidades, habitada, antigüedad.
    const filas = await sql`
      SELECT r.id, r.uuid, r.consecutivo, r.reportante_nombre, r.reportante_telefono,
             r.reportante_relacion, r.direccion, r.barrio, r.comuna,
             r.tipo_edificacion, r.pisos_declarados, r.unidades_declaradas,
             r.habitada, r.uso_declarado, r.descripcion, r.menciona_colapso,
             r.creado_en,
             ST_Y(r.geom::geometry) AS lat, ST_X(r.geom::geometry) AS lng,
             (SELECT count(*) - 1 FROM reportes o
              WHERE ST_DWithin(o.geom, r.geom, ${RADIO_MISMO_PREDIO_M})
                AND o.estado <> 'descartado')::int AS reportes_del_predio
      FROM reportes r
      WHERE r.estado = 'nuevo'
      ORDER BY
        r.menciona_colapso DESC,
        (SELECT count(*) FROM reportes o
         WHERE ST_DWithin(o.geom, r.geom, ${RADIO_MISMO_PREDIO_M})
           AND o.estado <> 'descartado') DESC,
        (r.uso_declarado = ANY(${USOS_INDISPENSABLES})) DESC,
        COALESCE(r.unidades_declaradas, 1) DESC,
        COALESCE(r.habitada, false) DESC,
        r.creado_en ASC
      LIMIT 100`;

    // La respuesta incluye teléfonos → un registro de auditoría por consulta
    await auditar({
      usuarioId: req.usuario.id, accion: 'ver_telefono', entidad: 'reportes',
      detalle: { via: 'cola_moderacion', reportes: filas.map((f) => f.id) },
      ip: req.ip,
    });

    return { reportes: filas };
  });

  // ── Validar (tras la llamada) ──────────────────────────────────────
  app.post('/moderacion/:uuid/validar', {
    preHandler: soloModerador,
    schema: {
      params: { type: 'object', properties: { uuid: { type: 'string', format: 'uuid' } } },
      body: {
        type: 'object', required: ['notas_llamada'], additionalProperties: false,
        properties: {
          notas_llamada: { type: 'string', minLength: 5, maxLength: 2000 },
          correcciones: {
            type: 'object', additionalProperties: false,
            properties: {
              direccion: { type: 'string', maxLength: 200 },
              barrio: { type: 'string', maxLength: 80 },
              comuna: { type: 'string', maxLength: 10 },
              pisos_declarados: { type: 'integer', minimum: 1, maximum: 120 },
              unidades_declaradas: { type: 'integer', minimum: 1, maximum: 5000 },
              uso_declarado: { type: 'integer', minimum: 1, maximum: 11 },
              habitada: { type: 'boolean' },
              menciona_colapso: { type: 'boolean' },
              menciona_inclinacion: { type: 'boolean' },
              menciona_geotecnico: { type: 'boolean' },
            },
          },
        },
      },
    },
  }, async (req, reply) => {
    const { uuid } = req.params;
    const { notas_llamada, correcciones = {} } = req.body;

    const [r] = await sql`SELECT * FROM reportes WHERE uuid = ${uuid}`;
    if (!r) return reply.code(404).send({ error: 'no_existe', mensaje: 'Reporte no encontrado.' });
    if (r.estado !== 'nuevo') {
      return reply.code(409).send({ error: 'estado_invalido', mensaje: `El reporte está en estado ${r.estado}.` });
    }

    const tras = { ...r, ...correcciones };

    // Reglas duras de escalación — no criterio del moderador (FLUJOS §3)
    const [{ del_predio }] = await sql`
      SELECT count(*)::int AS del_predio FROM reportes o
      WHERE ST_DWithin(o.geom, ${r.geom}::geography, ${RADIO_MISMO_PREDIO_M})
        AND o.estado <> 'descartado'`;
    const [dictamenPrevio] = await sql`
      SELECT f.habitabilidad_final::text AS color
      FROM reportes o
      JOIN formularios_ais f ON f.reporte_id = o.id AND f.estado = 'firmado'
      WHERE ST_DWithin(o.geom, ${r.geom}::geography, ${RADIO_MISMO_PREDIO_M})
      ORDER BY f.firmado_en DESC LIMIT 1`;

    const motivos = motivosEscalacionA(tras, {
      reportesDelPredio: del_predio,
      dictamenPrevio: dictamenPrevio?.color,
    });

    await sql.begin(async (tx) => {
      await tx`
        UPDATE reportes SET
          direccion = ${tras.direccion}, barrio = ${tras.barrio}, comuna = ${tras.comuna},
          pisos_declarados = ${tras.pisos_declarados}, unidades_declaradas = ${tras.unidades_declaradas},
          uso_declarado = ${tras.uso_declarado}, habitada = ${tras.habitada},
          menciona_colapso = ${!!tras.menciona_colapso},
          menciona_inclinacion = ${!!tras.menciona_inclinacion},
          menciona_geotecnico = ${!!tras.menciona_geotecnico},
          requiere_nivel_a = ${motivos.length > 0},
          motivo_escalacion = ${motivos},
          validado_por = ${req.usuario.id}, validado_en = now(),
          notas_llamada = ${notas_llamada}
        WHERE id = ${r.id}`;
      await transicionReporte(tx, {
        reporteId: r.id, estadoAnt: 'nuevo', estadoNuevo: 'validado',
        usuarioId: req.usuario.id, nota: 'Validado telefónicamente',
      });
    });

    await auditar({
      usuarioId: req.usuario.id, accion: 'validar', entidad: 'reportes',
      entidadId: r.id, detalle: { motivos }, ip: req.ip,
    });

    // Desde aquí el reporte es un punto GRIS en el mapa público
    return { ok: true, requiere_nivel_a: motivos.length > 0, motivos };
  });

  // ── Descartar ──────────────────────────────────────────────────────
  app.post('/moderacion/:uuid/descartar', {
    preHandler: soloModerador,
    schema: {
      params: { type: 'object', properties: { uuid: { type: 'string', format: 'uuid' } } },
      body: {
        type: 'object', required: ['motivo'], additionalProperties: false,
        properties: {
          motivo: { type: 'string', enum: ['duplicado', 'no_contesta', 'fuera_de_zona', 'spam', 'otro'] },
          nota: { type: ['string', 'null'], maxLength: 500 },
        },
      },
    },
  }, async (req, reply) => {
    const [r] = await sql`SELECT id, estado FROM reportes WHERE uuid = ${req.params.uuid}`;
    if (!r) return reply.code(404).send({ error: 'no_existe', mensaje: 'Reporte no encontrado.' });
    if (r.estado !== 'nuevo') {
      return reply.code(409).send({ error: 'estado_invalido', mensaje: `El reporte está en estado ${r.estado}.` });
    }
    await sql.begin(async (tx) => {
      await tx`UPDATE reportes SET motivo_descarte = ${req.body.motivo} WHERE id = ${r.id}`;
      await transicionReporte(tx, {
        reporteId: r.id, estadoAnt: r.estado, estadoNuevo: 'descartado',
        usuarioId: req.usuario.id, nota: req.body.nota || req.body.motivo,
      });
    });
    return { ok: true };
  });

  // ── Ingenieros disponibles ─────────────────────────────────────────
  app.get('/moderacion/ingenieros', { preHandler: soloModerador }, async () => {
    const ingenieros = await sql`
      SELECT u.id, u.nombre, u.rol, u.profesion, u.matricula,
             (SELECT count(*)::int FROM asignaciones a
              WHERE a.ingeniero_id = u.id AND a.cerrada_en IS NULL AND a.liberada_en IS NULL)
             AS carga_actual
      FROM usuarios u
      WHERE u.rol IN ('ingeniero_a','ingeniero_b') AND u.activo
      ORDER BY carga_actual ASC, u.nombre`;
    return { ingenieros };
  });

  // ── Asignar ────────────────────────────────────────────────────────
  app.post('/moderacion/:uuid/asignar', {
    preHandler: soloModerador,
    schema: {
      params: { type: 'object', properties: { uuid: { type: 'string', format: 'uuid' } } },
      body: {
        type: 'object', required: ['ingeniero_id'], additionalProperties: false,
        properties: { ingeniero_id: { type: 'integer', minimum: 1 } },
      },
    },
  }, async (req, reply) => {
    const [r] = await sql`
      SELECT id, estado, requiere_nivel_a FROM reportes WHERE uuid = ${req.params.uuid}`;
    if (!r) return reply.code(404).send({ error: 'no_existe', mensaje: 'Reporte no encontrado.' });
    if (!['validado', 'vencido'].includes(r.estado)) {
      return reply.code(409).send({ error: 'estado_invalido', mensaje: `El reporte está en estado ${r.estado}.` });
    }

    const [ing] = await sql`
      SELECT id, rol, activo FROM usuarios
      WHERE id = ${req.body.ingeniero_id} AND rol IN ('ingeniero_a','ingeniero_b')`;
    if (!ing || !ing.activo) {
      return reply.code(404).send({ error: 'ingeniero_no_existe', mensaje: 'Ingeniero no encontrado o inactivo.' });
    }

    // La distinción A/B es legal, no cosmética (BRIEF §3)
    if (r.requiere_nivel_a && ing.rol === 'ingeniero_b') {
      return reply.code(422).send({
        error: 'requiere_nivel_a',
        mensaje: 'Este reporte está escalado: solo puede asignarse a un ingeniero nivel A.',
      });
    }

    await sql.begin(async (tx) => {
      await tx`
        INSERT INTO asignaciones (reporte_id, ingeniero_id, asignado_por, rol_asignado, vence_en)
        VALUES (${r.id}, ${ing.id}, ${req.usuario.id}, ${ing.rol},
                now() + ${config.operacion.asignacionTtlHoras + ' hours'}::interval)`;
      await transicionReporte(tx, {
        reporteId: r.id, estadoAnt: r.estado, estadoNuevo: 'asignado',
        usuarioId: req.usuario.id, nota: `Asignado a ingeniero #${ing.id} (${ing.rol})`,
      });
    });

    await auditar({
      usuarioId: req.usuario.id, accion: 'asignar', entidad: 'reportes',
      entidadId: r.id, detalle: { ingeniero_id: ing.id }, ip: req.ip,
    });

    return { ok: true, vence_en_horas: config.operacion.asignacionTtlHoras };
  });

  // ── Verificación de matrícula COPNIA ───────────────────────────────
  app.post('/moderacion/ingenieros/:id/verificar-matricula', {
    preHandler: soloModerador,
    schema: {
      params: { type: 'object', properties: { id: { type: 'integer' } } },
      body: {
        type: 'object', required: ['matricula', 'profesion', 'nivel'], additionalProperties: false,
        properties: {
          matricula: { type: 'string', minLength: 4, maxLength: 40 },
          profesion: { type: 'string', minLength: 3, maxLength: 80 },
          evidencia_url: { type: ['string', 'null'], maxLength: 500 },
          nivel: { type: 'string', enum: ['ingeniero_a', 'ingeniero_b'] },
        },
      },
    },
  }, async (req, reply) => {
    const [u] = await sql`SELECT id, rol FROM usuarios WHERE id = ${req.params.id}`;
    if (!u) return reply.code(404).send({ error: 'no_existe', mensaje: 'Usuario no encontrado.' });

    await sql`
      UPDATE usuarios SET
        matricula = ${req.body.matricula}, profesion = ${req.body.profesion},
        matricula_evidencia_url = ${req.body.evidencia_url ?? null},
        matricula_verificada_por = ${req.usuario.id}, matricula_verificada_en = now(),
        rol = ${req.body.nivel}
      WHERE id = ${u.id}`;

    await auditar({
      usuarioId: req.usuario.id, accion: 'verificar_matricula', entidad: 'usuarios',
      entidadId: u.id, detalle: { nivel: req.body.nivel }, ip: req.ip,
    });

    return { ok: true };
  });
}
