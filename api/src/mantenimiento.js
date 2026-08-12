/**
 * Worker de mantenimiento DENTRO del proceso api (ARQUITECTURA §1: con
 * cientos de reportes/día no se justifica un servicio aparte).
 *
 * Cada WORKER_INTERVALO_MINUTOS:
 *  - Libera asignaciones vencidas → el reporte vuelve a la bolsa ('vencido')
 *  - Limpia tokens de acceso expirados y sesiones vencidas
 *  - Borra fotos_pendientes de más de 7 días (nunca llegaron)
 */

import { sql } from './db.js';
import { config } from './config.js';

async function ciclo(log) {
  // Asignaciones vencidas sin cerrar → liberar y devolver a la bolsa
  const vencidas = await sql`
    UPDATE asignaciones SET liberada_en = now()
    WHERE vence_en < now() AND cerrada_en IS NULL AND liberada_en IS NULL
    RETURNING reporte_id`;
  for (const { reporte_id } of vencidas) {
    await sql.begin(async (tx) => {
      const [r] = await tx`SELECT estado FROM reportes WHERE id = ${reporte_id}`;
      if (r && ['asignado', 'en_captura'].includes(r.estado)) {
        await tx`UPDATE reportes SET estado = 'vencido', actualizado_en = now()
                 WHERE id = ${reporte_id}`;
        await tx`INSERT INTO reportes_historial (reporte_id, estado_ant, estado_nuevo, nota)
                 VALUES (${reporte_id}, ${r.estado}, 'vencido', 'Asignación vencida, vuelve a la bolsa')`;
      }
    });
  }

  const [tokens, sesiones, pendientes] = await Promise.all([
    sql`DELETE FROM tokens_acceso WHERE expira_en < now() - interval '7 days'`,
    sql`DELETE FROM sesiones WHERE expira_en < now() - interval '7 days'`,
    sql`DELETE FROM fotos_pendientes WHERE creado_en < now() - interval '7 days'`,
  ]);

  if (vencidas.length || tokens.count || sesiones.count || pendientes.count) {
    log.info({
      asignaciones_liberadas: vencidas.length,
      tokens_borrados: tokens.count,
      sesiones_borradas: sesiones.count,
      fotos_pendientes_borradas: pendientes.count,
    }, 'mantenimiento');
  }
}

export function iniciarMantenimiento(log) {
  if (!config.operacion.workerEnProceso) return;
  const ms = config.operacion.workerIntervaloMinutos * 60_000;
  const timer = setInterval(() => ciclo(log).catch((e) => log.error(e, 'mantenimiento falló')), ms);
  timer.unref(); // no impide apagar el proceso
  ciclo(log).catch((e) => log.error(e, 'mantenimiento inicial falló'));
}
