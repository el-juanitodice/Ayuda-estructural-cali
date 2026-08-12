/**
 * Tablero del coordinador (API.md §Coordinador, FLUJOS §5).
 * Cobertura por comuna, discrepancias firmadas, vencimientos, escalación
 * manual (nunca desescalar) y exportación CSV auditada.
 */

import { sql } from '../db.js';
import { auditar } from '../auditoria.js';
import { exigirRol } from '../auth/sesiones.js';

export default async function rutasTablero(app) {
  const soloCoordinacion = exigirRol('coordinador', 'admin');

  app.get('/tablero/cobertura', { preHandler: soloCoordinacion }, async () => {
    const porComuna = await sql`
      SELECT COALESCE(r.comuna, 'sin comuna') AS comuna,
        count(*) FILTER (WHERE r.estado = 'nuevo')::int                       AS nuevos,
        count(*) FILTER (WHERE r.estado IN ('validado','vencido'))::int       AS por_asignar,
        count(*) FILTER (WHERE r.estado IN ('asignado','en_captura','en_revision_a'))::int AS en_proceso,
        count(*) FILTER (WHERE r.estado = 'cerrado')::int                     AS cerrados,
        count(*) FILTER (WHERE r.estado = 'descartado')::int                  AS descartados
      FROM reportes r GROUP BY 1 ORDER BY 1`;

    const porColor = await sql`
      SELECT f.habitabilidad_final::text AS color, count(*)::int AS total
      FROM formularios_ais f WHERE f.estado = 'firmado'
      GROUP BY 1 ORDER BY 1`;

    return { por_comuna: porComuna, por_color: porColor };
  });

  app.get('/tablero/discrepancias', { preHandler: soloCoordinacion }, async () => {
    const discrepancias = await sql`
      SELECT r.consecutivo, r.direccion, r.barrio, f.uuid AS formulario_uuid,
             f.habitabilidad_sugerida::text AS sugerida,
             f.habitabilidad_final::text AS final,
             f.motivo_discrepancia, f.firmado_en,
             u.nombre AS firmado_por_nombre, u.matricula
      FROM formularios_ais f
      JOIN reportes r ON r.id = f.reporte_id
      LEFT JOIN usuarios u ON u.id = f.firmado_por
      WHERE f.estado = 'firmado'
        AND f.habitabilidad_final <> f.habitabilidad_sugerida
      ORDER BY f.firmado_en DESC`;
    return { discrepancias };
  });

  app.get('/tablero/vencimientos', { preHandler: soloCoordinacion }, async () => {
    const asignaciones = await sql`
      SELECT r.consecutivo, r.direccion, a.vence_en, a.abierta_en,
             (a.vence_en < now()) AS vencida,
             u.nombre AS ingeniero, u.rol AS nivel
      FROM asignaciones a
      JOIN reportes r ON r.id = a.reporte_id
      JOIN usuarios u ON u.id = a.ingeniero_id
      WHERE a.cerrada_en IS NULL AND a.liberada_en IS NULL
      ORDER BY a.vence_en ASC`;
    return { asignaciones };
  });

  app.post('/tablero/:uuid/escalar', {
    preHandler: soloCoordinacion,
    schema: {
      params: { type: 'object', properties: { uuid: { type: 'string', format: 'uuid' } } },
      body: {
        type: 'object', required: ['motivo'], additionalProperties: false,
        properties: { motivo: { type: 'string', minLength: 5, maxLength: 500 } },
      },
    },
  }, async (req, reply) => {
    const [r] = await sql`SELECT id, requiere_nivel_a FROM reportes WHERE uuid = ${req.params.uuid}`;
    if (!r) return reply.code(404).send({ error: 'no_existe', mensaje: 'Reporte no encontrado.' });

    // Escalar SIEMPRE es posible; desescalar NUNCA (FLUJOS §3)
    await sql`
      UPDATE reportes SET requiere_nivel_a = true,
        motivo_escalacion = array_append(motivo_escalacion, 'escalacion_manual'),
        actualizado_en = now()
      WHERE id = ${r.id}`;
    await sql`
      INSERT INTO reportes_historial (reporte_id, estado_ant, estado_nuevo, usuario_id, nota)
      SELECT id, estado, estado, ${req.usuario.id}, ${'Escalado manualmente a nivel A: ' + req.body.motivo}
      FROM reportes WHERE id = ${r.id}`;
    await auditar({
      usuarioId: req.usuario.id, accion: 'escalar', entidad: 'reportes',
      entidadId: r.id, detalle: { motivo: req.body.motivo }, ip: req.ip,
    });
    return { ok: true };
  });

  // ── Exportación CSV (el dato no debe depender de esta plataforma) ──
  app.get('/tablero/exportar', {
    preHandler: soloCoordinacion,
    schema: {
      querystring: {
        type: 'object', additionalProperties: false,
        properties: {
          formato: { type: 'string', enum: ['csv'], default: 'csv' },
          desde: { type: ['string', 'null'], format: 'date' },
          hasta: { type: ['string', 'null'], format: 'date' },
        },
      },
    },
  }, async (req, reply) => {
    const desde = req.query.desde || '2026-01-01';
    const hasta = req.query.hasta || '2100-01-01';

    const filas = await sql`
      SELECT r.consecutivo, r.estado, r.direccion, r.barrio, r.comuna,
             ST_Y(r.geom::geometry) AS lat, ST_X(r.geom::geometry) AS lng,
             r.tipo_edificacion, r.pisos_declarados, r.unidades_declaradas,
             r.habitada, r.uso_declarado, r.requiere_nivel_a,
             array_to_string(r.motivo_escalacion, '|') AS motivos_escalacion,
             r.creado_en, r.validado_en,
             f.numero_formulario, f.habitabilidad_sugerida::text AS sugerida,
             f.habitabilidad_final::text AS color_final, f.motivo_discrepancia,
             f.firmado_en, ua.nombre AS ingeniero_a, ua.matricula AS matricula_a,
             f.visita_presencial_a, ub.nombre AS ingeniero_b, ub.matricula AS matricula_b
      FROM reportes r
      LEFT JOIN formularios_ais f ON f.reporte_id = r.id AND f.estado = 'firmado'
      LEFT JOIN usuarios ua ON ua.id = f.firmado_por
      LEFT JOIN usuarios ub ON ub.id = f.capturado_por
      WHERE r.creado_en >= ${desde} AND r.creado_en < ${hasta}::date + 1
      ORDER BY r.creado_en`;
    // NOTA deliberada: la exportación NO incluye nombre ni teléfono del
    // reportante (Ley 1581). Si la entidad coordinadora los exige, se acuerda
    // un canal aparte con acta de entrega.

    await auditar({
      usuarioId: req.usuario.id, accion: 'exportar', entidad: 'reportes',
      detalle: { desde, hasta, filas: filas.length }, ip: req.ip,
    });

    const columnas = filas.length ? Object.keys(filas[0]) : ['sin_datos'];
    const esc = (v) => {
      if (v === null || v === undefined) return '';
      const s = v instanceof Date ? v.toISOString() : String(v);
      return /[",\n;]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
    };
    const csv = '﻿' + [
      columnas.join(','),
      ...filas.map((f) => columnas.map((c) => esc(f[c])).join(',')),
    ].join('\n');

    reply.header('content-type', 'text/csv; charset=utf-8');
    reply.header('content-disposition',
      `attachment; filename="inspecciones_${desde}_${hasta}.csv"`);
    return reply.send(csv);
  });
}
