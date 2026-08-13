/**
 * Cola de reportes ciudadanos (BRIEF §4.1: offline es la arquitectura).
 *
 * Tras el sismo las antenas están saturadas: exigir conexión para reportar
 * dejaba fuera justo a quien más necesita reportar. Ahora:
 *
 *   1. El reporte se guarda SIEMPRE en el teléfono (IndexedDB) al enviarlo.
 *   2. Se intenta enviar de inmediato; si no hay señal, queda pendiente.
 *   3. Se reintenta solo al volver la señal, al reabrir la app y con backoff.
 *   4. Cuando el servidor responde, se guarda el radicado y se le muestra.
 *
 * Idempotencia: el `uuid` lo genera el cliente y viaja en cada intento, así
 * un reintento nunca crea dos reportes.
 */

import { db } from './db.js';
import { post, ErrorRed, ErrorApi } from '../api.js';

const MAX_INTENTOS = 12;          // ~horas de reintentos: la señal vuelve
const BASE_MS = 8_000;
const TOPE_MS = 10 * 60_000;

const emisor = new EventTarget();

export function suscribirseReportes(cb) {
  const h = (ev) => cb(ev.detail);
  emisor.addEventListener('cambio', h);
  estado().then(cb).catch(() => {});
  return () => emisor.removeEventListener('cambio', h);
}

export async function estado() {
  const todos = await db.cola_reportes.toArray();
  return {
    pendientes: todos.filter((r) => r.estado === 'pendiente').length,
    enviados: todos.filter((r) => r.estado === 'enviado'),
    fallidos: todos.filter((r) => r.estado === 'fallido'),
  };
}

async function notificar() {
  try {
    emisor.dispatchEvent(new CustomEvent('cambio', { detail: await estado() }));
  } catch { /* la interfaz se entera en el próximo cambio */ }
}

/**
 * Guarda el reporte y trata de enviarlo YA.
 * @returns {Promise<{enviado:boolean, uuid:string, consecutivo?:string,
 *                    emergencia?:boolean, error?:string}>}
 */
export async function enviarOEncolar(datos) {
  const uuid = datos.uuid || crypto.randomUUID();
  const fila = {
    uuid, datos: { ...datos, uuid },
    estado: 'pendiente', intentos: 0, proximo_intento: 0,
    creado_en: Date.now(),
  };
  await db.cola_reportes.put(fila);   // primero se guarda: nunca se pierde
  notificar();

  const r = await intentar(fila);
  return { uuid, ...r };
}

async function intentar(fila) {
  try {
    const resp = await post('/reportes', fila.datos);
    await marcarEnviado(fila.uuid, resp.consecutivo, false);
    return { enviado: true, consecutivo: resp.consecutivo };
  } catch (err) {
    // El servidor detectó emergencia: el reporte SÍ quedó guardado allá
    if (err instanceof ErrorApi && err.codigo === 'emergencia_123') {
      await marcarEnviado(fila.uuid, err.cuerpo?.consecutivo, true);
      return { enviado: true, consecutivo: err.cuerpo?.consecutivo, emergencia: true };
    }
    if (err instanceof ErrorRed) {
      await programarReintento(fila);
      return { enviado: false, error: 'sin_conexion' };
    }
    if (err instanceof ErrorApi && err.status >= 500) {
      await programarReintento(fila);
      return { enviado: false, error: 'servidor' };
    }
    // 4xx: datos inválidos o cupo. Reintentar no ayuda.
    await db.cola_reportes.update(fila.uuid, { estado: 'fallido', ultimo_error: err.message });
    notificar();
    return { enviado: false, error: err.message };
  }
}

async function marcarEnviado(uuid, consecutivo, emergencia) {
  await db.cola_reportes.update(uuid, {
    estado: 'enviado', consecutivo: consecutivo || null,
    emergencia: !!emergencia, enviado_en: Date.now(), datos: null,
  });
  notificar();
}

async function programarReintento(fila) {
  const intentos = (fila.intentos || 0) + 1;
  if (intentos >= MAX_INTENTOS) {
    await db.cola_reportes.update(fila.uuid, { estado: 'fallido', ultimo_error: 'sin_conexion' });
  } else {
    const base = Math.min(TOPE_MS, BASE_MS * 2 ** (intentos - 1));
    await db.cola_reportes.update(fila.uuid, {
      intentos, proximo_intento: Date.now() + base / 2 + Math.random() * base / 2,
    });
  }
  notificar();
}

let corriendo = false;

/** Reintenta todos los pendientes cuyo turno llegó. */
export async function procesarReportes() {
  if (corriendo) return;
  if (typeof navigator !== 'undefined' && navigator.onLine === false) return;
  corriendo = true;
  try {
    const pendientes = await db.cola_reportes
      .where('estado').equals('pendiente')
      .and((f) => (f.proximo_intento || 0) <= Date.now())
      .toArray();
    for (const f of pendientes) await intentar(f);
  } finally {
    corriendo = false;
  }
}

/** Reintento manual de los que agotaron intentos. */
export async function reintentarReportes() {
  await db.cola_reportes.where('estado').equals('fallido')
    .modify({ estado: 'pendiente', intentos: 0, proximo_intento: 0 });
  notificar();
  return procesarReportes();
}

export function iniciarColaReportes() {
  window.addEventListener('online', () => procesarReportes());
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') procesarReportes();
  });
  const t = setInterval(() => procesarReportes(), 60_000);
  if (t.unref) t.unref();
  procesarReportes();
}
