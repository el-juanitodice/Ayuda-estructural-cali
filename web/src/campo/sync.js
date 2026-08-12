/**
 * Sincronización de formularios AIS (BRIEF §4.1).
 * Local primero: el borrador vive en Dexie y se marca pendiente=1 en cada
 * cambio. Este módulo empuja los pendientes cuando hay señal, con la misma
 * filosofía de la cola de fotos: idempotente por uuid, reintenta solo.
 */

import { db } from '../fotos/db.js';
import { post, get } from '../api.js';

const emisor = new EventTarget();

export function alCambiarPendientes(cb) {
  const h = (ev) => cb(ev.detail);
  emisor.addEventListener('cambio', h);
  contarPendientes().then(cb).catch(() => {});
  return () => emisor.removeEventListener('cambio', h);
}

export async function contarPendientes() {
  return db.formularios.where('pendiente').equals(1).count();
}

async function notificar() {
  emisor.dispatchEvent(new CustomEvent('cambio', { detail: await contarPendientes() }));
}

/** Guarda el borrador localmente (SIEMPRE funciona) y dispara sync. */
export async function guardarLocal(formulario) {
  await db.formularios.put({ ...formulario, pendiente: 1, guardado_en: Date.now() });
  notificar();
  sincronizar();
}

export async function cargarLocal(uuid) {
  return db.formularios.get(uuid);
}

export async function formularioDeReporte(reporteUuid) {
  return db.formularios.where('reporte_uuid').equals(reporteUuid).first();
}

let sincronizando = false;

/** Empuja todos los pendientes. Silencioso si no hay señal. */
export async function sincronizar() {
  if (sincronizando) return;
  if (typeof navigator !== 'undefined' && navigator.onLine === false) return;
  sincronizando = true;
  try {
    const pendientes = await db.formularios.where('pendiente').equals(1).toArray();
    for (const f of pendientes) {
      try {
        const { pendiente, guardado_en, ...cuerpo } = f;
        await post('/campo/formularios', cuerpo);
        await db.formularios.update(f.uuid, { pendiente: 0 });
      } catch (err) {
        // firmado_inmutable o validación: ya no se reintenta ese estado
        if (err.status && err.status !== 429 && err.status < 500 && err.status !== 408) {
          await db.formularios.update(f.uuid, { pendiente: 0, error_sync: err.message });
        }
        // errores de red/5xx: se queda pendiente y se reintenta después
      }
    }
  } finally {
    sincronizando = false;
    notificar();
  }
}

/** Baja mis asignaciones y las guarda para poder abrirlas sin señal. */
export async function refrescarAsignaciones() {
  try {
    const r = await get('/campo/mis-asignaciones');
    await db.asignaciones.clear();
    for (const a of r.asignaciones) {
      await db.asignaciones.put({ ...a, fotos: r.fotos[a.reporte_uuid] || [] });
    }
    return r.asignaciones;
  } catch {
    return db.asignaciones.toArray(); // sin señal: lo que haya local
  }
}

export function iniciarSyncCampo() {
  window.addEventListener('online', () => sincronizar());
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') sincronizar();
  });
  sincronizar();
}
