/**
 * Fachada de compresión con detección de soporte y fallback (BRIEF §4.2).
 *
 *   Camino bueno : Web Worker + OffscreenCanvas (no bloquea la interfaz)
 *   Fallback     : <canvas> + toBlob en el hilo principal, JPEG
 *
 * El fallback existe porque el ingeniero puede llegar con un Android de 2016.
 * Preferimos una interfaz que se congela dos segundos a una foto que no sube.
 *
 * Uso:
 *   const { full, thumb, ancho, alto, formato } = await comprimirFoto(file);
 */

const LADO_FULL = 1920;
const LADO_THUMB = 400;
const CALIDAD_FULL = 0.72;
const CALIDAD_THUMB = 0.65;
const MAX_BYTES_ENTRADA = 8 * 1024 * 1024; // 8 MB antes de comprimir (ARQUITECTURA §3)

export function soporte() {
  return {
    worker: typeof Worker !== 'undefined',
    offscreen: typeof OffscreenCanvas !== 'undefined'
      && typeof OffscreenCanvas.prototype.convertToBlob === 'function',
    imageBitmap: typeof createImageBitmap === 'function',
  };
}

function usaWorker() {
  const s = soporte();
  return s.worker && s.offscreen && s.imageBitmap;
}

// ── Camino bueno: worker ─────────────────────────────────────────────

let worker = null;
let seq = 0;
const pendientes = new Map();

function obtenerWorker() {
  if (worker) return worker;
  worker = new Worker(new URL('./compresor.worker.js', import.meta.url), { type: 'module' });
  worker.onmessage = (ev) => {
    const { id, ok, error, ...resto } = ev.data;
    const p = pendientes.get(id);
    if (!p) return;
    pendientes.delete(id);
    ok ? p.resolve(resto) : p.reject(new Error(error));
  };
  worker.onerror = (ev) => {
    // Worker roto (p. ej. sin memoria): rechaza todo y deja que el fallback actúe
    for (const p of pendientes.values()) p.reject(new Error('worker_fallo: ' + ev.message));
    pendientes.clear();
    worker.terminate();
    worker = null;
  };
  return worker;
}

function comprimirEnWorker(blob) {
  return new Promise((resolve, reject) => {
    const id = ++seq;
    pendientes.set(id, { resolve, reject });
    obtenerWorker().postMessage({ id, blob });
  });
}

// ── Fallback: hilo principal, <canvas> + toBlob, JPEG ────────────────

function cargarImagen(blob) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(blob);
    const img = new Image();
    img.onload = () => { URL.revokeObjectURL(url); resolve(img); };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('imagen_ilegible')); };
    img.src = url;
  });
}

function aBlob(canvas, tipo, calidad) {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error('toBlob_fallo'))),
      tipo, calidad,
    );
  });
}

async function redimensionarFallback(img, ladoMax, calidad) {
  const anchoOrig = img.naturalWidth || img.width;
  const altoOrig = img.naturalHeight || img.height;
  const escala = Math.min(1, ladoMax / Math.max(anchoOrig, altoOrig));
  const w = Math.round(anchoOrig * escala);
  const h = Math.round(altoOrig * escala);

  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#fff';
  ctx.fillRect(0, 0, w, h);
  ctx.drawImage(img, 0, 0, w, h);
  const blob = await aBlob(canvas, 'image/jpeg', calidad);
  canvas.width = canvas.height = 0; // suelta la memoria del canvas
  return { blob, w, h };
}

async function comprimirFallback(blobEntrada) {
  const inicio = Date.now();
  const img = await cargarImagen(blobEntrada);
  const full = await redimensionarFallback(img, LADO_FULL, CALIDAD_FULL);
  const thumb = await redimensionarFallback(img, LADO_THUMB, CALIDAD_THUMB);
  return {
    full: full.blob, thumb: thumb.blob,
    ancho: full.w, alto: full.h,
    formato: 'jpeg', ms: Date.now() - inicio,
  };
}

// ── API pública ──────────────────────────────────────────────────────

/**
 * @param {Blob} blob  foto original tal como sale del input
 * @returns {Promise<{full:Blob, thumb:Blob, ancho:number, alto:number, formato:string, ms:number}>}
 */
export async function comprimirFoto(blob) {
  if (!blob || !blob.size) throw new Error('foto_vacia');
  if (blob.size > MAX_BYTES_ENTRADA) throw new Error('foto_supera_8mb');

  if (usaWorker()) {
    try {
      return await comprimirEnWorker(blob);
    } catch {
      // el worker murió (memoria, bug del navegador): intenta en el hilo principal
    }
  }
  return comprimirFallback(blob);
}
