/**
 * Worker de compresión de fotos (BRIEF §4.2).
 *
 * Corre en un Web Worker para no congelar la interfaz mientras el ingeniero
 * sigue llenando el formulario. Produce DOS versiones y descarta el original:
 *
 *   full  : 1920 px lado mayor, calidad 0.72  (~180 KB)  — una grieta de 3 mm se ve
 *   thumb :  400 px lado mayor, calidad 0.65  (~25 KB)   — listas y tablero
 *
 * Formato: WebP si el navegador lo produce; si no, JPEG.
 * Procesa UNA imagen a la vez: en celulares viejos decodificar dos fotos de
 * 12 MP en paralelo mata el proceso por memoria.
 *
 * Protocolo de mensajes:
 *   entrada: { id, blob }
 *   salida : { id, ok: true, full, thumb, ancho, alto, formato, ms }
 *          | { id, ok: false, error }
 */

const LADO_FULL = 1920;
const LADO_THUMB = 400;
const CALIDAD_FULL = 0.72;
const CALIDAD_THUMB = 0.65;

let soportaWebP = null; // se detecta una sola vez, con un convertToBlob real

async function detectarWebP() {
  if (soportaWebP !== null) return soportaWebP;
  try {
    const c = new OffscreenCanvas(2, 2);
    c.getContext('2d');
    const b = await c.convertToBlob({ type: 'image/webp' });
    soportaWebP = b.type === 'image/webp';
  } catch {
    soportaWebP = false;
  }
  return soportaWebP;
}

function dimensiones(ancho, alto, ladoMax) {
  if (Math.max(ancho, alto) <= ladoMax) return { w: ancho, h: alto };
  const escala = ladoMax / Math.max(ancho, alto);
  return { w: Math.round(ancho * escala), h: Math.round(alto * escala) };
}

async function redimensionar(bitmap, ladoMax, tipo, calidad) {
  const { w, h } = dimensiones(bitmap.width, bitmap.height, ladoMax);
  const canvas = new OffscreenCanvas(w, h);
  const ctx = canvas.getContext('2d');
  // Fondo blanco: JPEG no tiene alfa y un PNG transparente saldría negro
  ctx.fillStyle = '#fff';
  ctx.fillRect(0, 0, w, h);
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(bitmap, 0, 0, w, h);
  const blob = await canvas.convertToBlob({ type: tipo, quality: calidad });
  return { blob, w, h };
}

async function comprimir(blob) {
  const inicio = Date.now();

  // 'from-image' respeta la orientación EXIF (foto tomada en vertical)
  let bitmap;
  try {
    bitmap = await createImageBitmap(blob, { imageOrientation: 'from-image' });
  } catch {
    bitmap = await createImageBitmap(blob); // navegadores sin la opción
  }

  try {
    const webp = await detectarWebP();
    const tipo = webp ? 'image/webp' : 'image/jpeg';

    const full = await redimensionar(bitmap, LADO_FULL, tipo, CALIDAD_FULL);
    const thumb = await redimensionar(bitmap, LADO_THUMB, tipo, CALIDAD_THUMB);

    return {
      full: full.blob,
      thumb: thumb.blob,
      ancho: full.w,
      alto: full.h,
      formato: webp ? 'webp' : 'jpeg',
      ms: Date.now() - inicio,
    };
  } finally {
    bitmap.close(); // libera la memoria del bitmap decodificado YA, no cuando el GC quiera
  }
}

// Cola interna: aunque lleguen 30 mensajes seguidos, se procesa de a una.
let cadena = Promise.resolve();

self.onmessage = (ev) => {
  const { id, blob } = ev.data;
  cadena = cadena.then(async () => {
    try {
      const r = await comprimir(blob);
      self.postMessage({ id, ok: true, ...r });
    } catch (error) {
      self.postMessage({ id, ok: false, error: String(error && error.message || error) });
    }
  });
};
