/**
 * Cola de subida de fotos al Railway Bucket (BRIEF §4.2, ARQUITECTURA §3).
 *
 * Reglas que implementa:
 *  - Persistente: sobrevive cierres de app y reinicios del celular (Dexie).
 *  - Máximo 2 subidas concurrentes; el resto espera turno.
 *  - Idempotente por UUID generado en el cliente: un reintento nunca duplica.
 *  - Reintento con backoff exponencial + azar (5s → ~4min, tope 5min).
 *  - Las URLs prefirmadas duran 15 min: en cada intento se piden de nuevo,
 *    nunca se persisten.
 *  - El reporte viaja aparte y ANTES: esta cola solo mueve fotos.
 *
 * Flujo por foto:  prefirmar → PUT full → PUT thumb → confirmar
 *
 * Uso:
 *   import { encolarFoto, procesarCola, iniciarCola, suscribirse } from './cola-subida.js';
 *   iniciarCola();                       // una vez, al arrancar la app
 *   await encolarFoto({ archivo, reporte_uuid, categoria, piso });
 */

import { db, contarPorEstado, sanearColaAlArrancar } from './db.js';
import { comprimirFoto } from './compresor.js';
import { extraerExif } from './exif.js';

const API = '/api/v1';
const MAX_CONCURRENTES = 2;
const MAX_INTENTOS = 8;              // luego pasa a 'fallida' y se avisa al usuario
const BACKOFF_BASE_MS = 5_000;
const BACKOFF_TOPE_MS = 5 * 60_000;

// ── Notificación a la interfaz ───────────────────────────────────────

const emisor = new EventTarget();

/** cb recibe { pendiente, subiendo, confirmada, fallida }. Devuelve unsubscribe. */
export function suscribirse(cb) {
  const h = (ev) => cb(ev.detail);
  emisor.addEventListener('cambio', h);
  contarPorEstado().then(cb).catch(() => {});
  return () => emisor.removeEventListener('cambio', h);
}

async function notificar() {
  try {
    emisor.dispatchEvent(new CustomEvent('cambio', { detail: await contarPorEstado() }));
  } catch { /* la interfaz se entera en el próximo cambio */ }
}

// ── Encolar ──────────────────────────────────────────────────────────

/**
 * Comprime y encola. Resuelve cuando la foto quedó SEGURA en IndexedDB
 * (no cuando subió: eso pasa cuando haya señal).
 * @returns {Promise<string>} uuid de la foto
 */
export async function encolarFoto({ archivo, reporte_uuid, categoria, piso = null, nota = null }) {
  if (!archivo || !reporte_uuid || !categoria) throw new Error('encolar_datos_incompletos');

  const uuid = crypto.randomUUID();          // UUID del cliente, nunca del servidor
  const exif = await extraerExif(archivo);   // del ORIGINAL, antes de perderlo
  const { full, thumb, ancho, alto, formato } = await comprimirFoto(archivo);
  // A partir de aquí el original no se guarda (BRIEF §4.2)

  await db.cola_fotos.add({
    uuid, reporte_uuid, categoria, piso, nota,
    estado: 'pendiente',
    full, thumb, ancho, alto, formato,
    bytes_full: full.size, bytes_thumb: thumb.size,
    exif,
    intentos: 0,
    proximo_intento: 0,
    ultimo_error: null,
    creado_en: Date.now(),
  });

  notificar();
  procesarCola();
  return uuid;
}

// ── Motor de la cola ─────────────────────────────────────────────────

let enVuelo = 0;
let timerReintento = null;

export function iniciarCola() {
  sanearColaAlArrancar().then(() => procesarCola());
  window.addEventListener('online', () => procesarCola());
  // Al volver a la app (el ingeniero estaba en la cámara), intenta de nuevo
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') procesarCola();
  });
}

export async function procesarCola() {
  if (typeof navigator !== 'undefined' && navigator.onLine === false) return;

  while (enVuelo < MAX_CONCURRENTES) {
    const foto = await tomarSiguiente();
    if (!foto) break;
    enVuelo++;
    subirFoto(foto)
      .catch(() => {})           // el error ya quedó registrado en la fila
      .finally(() => {
        enVuelo--;
        procesarCola();          // ocupa el cupo que se liberó
      });
  }

  programarReintento();
}

/** Toma atómicamente la siguiente pendiente cuyo reintento ya venció. */
async function tomarSiguiente() {
  return db.transaction('rw', db.cola_fotos, async () => {
    const foto = await db.cola_fotos
      .where('estado').equals('pendiente')
      .and((f) => (f.proximo_intento || 0) <= Date.now())
      .first();
    if (!foto) return null;
    await db.cola_fotos.update(foto.uuid, { estado: 'subiendo' });
    return foto;
  });
}

/** Si quedan pendientes con reintento futuro, agenda un despertar. */
async function programarReintento() {
  if (timerReintento) { clearTimeout(timerReintento); timerReintento = null; }
  const proxima = await db.cola_fotos
    .where('estado').equals('pendiente')
    .and((f) => (f.proximo_intento || 0) > Date.now())
    .sortBy('proximo_intento');
  if (!proxima.length) return;
  const espera = Math.max(500, proxima[0].proximo_intento - Date.now());
  timerReintento = setTimeout(() => procesarCola(), espera);
}

// ── Subida de una foto ───────────────────────────────────────────────

async function subirFoto(foto) {
  try {
    // 1. Prefirmar (el API valida cupo <100 y categoría; firma las URLs)
    const pre = await postJson(`${API}/fotos/prefirmar`, {
      reporte_uuid: foto.reporte_uuid,
      uuid: foto.uuid,
      categoria: foto.categoria,
      piso: foto.piso,
      formato: foto.formato,
      bytes_full: foto.bytes_full,
      bytes_thumb: foto.bytes_thumb,
    });

    if (pre.ya_confirmada) {           // reintento de algo que ya llegó completo
      return marcarConfirmada(foto.uuid);
    }
    if (pre.error === 'cupo_lleno') {  // no tiene arreglo con reintentos
      return marcarFallida(foto.uuid, 'cupo_lleno');
    }

    // 2. PUT directo al bucket (la foto NUNCA pasa por el API)
    const tipo = foto.formato === 'webp' ? 'image/webp' : 'image/jpeg';
    await putBlob(pre.put_full, foto.full, tipo);
    await putBlob(pre.put_thumb, foto.thumb, tipo);

    // 3. Confirmar (idempotente por uuid en el servidor)
    await postJson(`${API}/fotos/confirmar`, {
      uuid: foto.uuid,
      ancho: foto.ancho,
      alto: foto.alto,
      exif: foto.exif || null,
    });

    await marcarConfirmada(foto.uuid);
  } catch (err) {
    await registrarFallo(foto, err);
    throw err;
  } finally {
    notificar();
  }
}

async function marcarConfirmada(uuid) {
  // Borra los blobs: en 100 fotos son ~20 MB de IndexedDB que el celular agradece
  await db.cola_fotos.update(uuid, {
    estado: 'confirmada', full: null, thumb: null, confirmada_en: Date.now(),
  });
}

async function marcarFallida(uuid, motivo) {
  await db.cola_fotos.update(uuid, { estado: 'fallida', ultimo_error: motivo });
}

async function registrarFallo(foto, err) {
  const intentos = (foto.intentos || 0) + 1;
  const definitivo = err instanceof ErrorHttp && err.status >= 400
    && err.status < 500 && err.status !== 408 && err.status !== 429;

  if (definitivo || intentos >= MAX_INTENTOS) {
    return marcarFallida(foto.uuid, String(err.message || err));
  }
  // backoff exponencial con azar para no sincronizar 50 celulares contra la antena
  const base = Math.min(BACKOFF_TOPE_MS, BACKOFF_BASE_MS * 2 ** (intentos - 1));
  const espera = base / 2 + Math.random() * base / 2;
  await db.cola_fotos.update(foto.uuid, {
    estado: 'pendiente',
    intentos,
    proximo_intento: Date.now() + espera,
    ultimo_error: String(err.message || err),
  });
}

/** Reencola manualmente las fallidas (botón "reintentar" en la interfaz). */
export async function reintentarFallidas() {
  await db.cola_fotos.where('estado').equals('fallida')
    .modify({ estado: 'pendiente', intentos: 0, proximo_intento: 0 });
  notificar();
  procesarCola();
}

// ── HTTP ─────────────────────────────────────────────────────────────

class ErrorHttp extends Error {
  constructor(status, cuerpo) {
    super(`http_${status}${cuerpo && cuerpo.error ? ':' + cuerpo.error : ''}`);
    this.status = status;
    this.cuerpo = cuerpo;
  }
}

async function postJson(url, datos) {
  const r = await fetch(url, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    credentials: 'same-origin',
    body: JSON.stringify(datos),
  });
  const cuerpo = await r.json().catch(() => ({}));
  if (!r.ok) {
    // el 409 de cupo lo maneja quien llama, no es excepción de red
    if (r.status === 409 && cuerpo.error === 'cupo_lleno') return cuerpo;
    throw new ErrorHttp(r.status, cuerpo);
  }
  return cuerpo;
}

async function putBlob(url, blob, tipo) {
  const r = await fetch(url, {
    method: 'PUT',
    headers: { 'content-type': tipo },
    body: blob,
  });
  if (!r.ok) throw new ErrorHttp(r.status, { error: 'put_bucket' });
}
