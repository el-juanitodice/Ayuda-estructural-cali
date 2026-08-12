/**
 * Auditoría (BRIEF §2.4, Ley 1581 de 2012).
 * Toda lectura de teléfono, validación, asignación, firma o exportación
 * queda registrada con quién, qué y desde dónde.
 */

import { sql } from './db.js';

export async function auditar({ usuarioId = null, accion, entidad, entidadId = null, detalle = null, ip = null }) {
  await sql`
    INSERT INTO auditoria (usuario_id, accion, entidad, entidad_id, detalle, ip)
    VALUES (${usuarioId}, ${accion}, ${entidad}, ${entidadId},
            ${detalle ? sql.json(detalle) : null}, ${ip})`;
}

/** Transición de estado de un reporte, siempre con historial. */
export async function transicionReporte(tx, { reporteId, estadoAnt, estadoNuevo, usuarioId = null, nota = null }) {
  await tx`
    UPDATE reportes SET estado = ${estadoNuevo}, actualizado_en = now()
    WHERE id = ${reporteId}`;
  await tx`
    INSERT INTO reportes_historial (reporte_id, estado_ant, estado_nuevo, usuario_id, nota)
    VALUES (${reporteId}, ${estadoAnt}, ${estadoNuevo}, ${usuarioId}, ${nota})`;
}
