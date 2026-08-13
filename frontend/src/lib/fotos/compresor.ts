const LADO_FULL = 1920;
const LADO_THUMB = 400;
const CALIDAD_FULL = 0.72;
const CALIDAD_THUMB = 0.65;
const MAX_BYTES_ENTRADA = 8 * 1024 * 1024;

export interface ResultadoCompresion {
  full: Blob;
  thumb: Blob;
  ancho: number;
  alto: number;
  formato: 'jpeg';
}

function cargarImagen(blob: Blob): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(blob);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('imagen_ilegible'));
    };
    img.src = url;
  });
}

function aBlob(canvas: HTMLCanvasElement, tipo: string, calidad: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error('toBlob_fallo'))),
      tipo,
      calidad,
    );
  });
}

async function redimensionar(img: HTMLImageElement, ladoMax: number, calidad: number) {
  const anchoOrig = img.naturalWidth || img.width;
  const altoOrig = img.naturalHeight || img.height;
  const escala = Math.min(1, ladoMax / Math.max(anchoOrig, altoOrig));
  const w = Math.round(anchoOrig * escala);
  const h = Math.round(altoOrig * escala);

  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('canvas_no_disponible');
  ctx.fillStyle = '#fff';
  ctx.fillRect(0, 0, w, h);
  ctx.drawImage(img, 0, 0, w, h);
  const blob = await aBlob(canvas, 'image/jpeg', calidad);
  canvas.width = canvas.height = 0;
  return { blob, w, h };
}

export async function comprimirFoto(blob: Blob): Promise<ResultadoCompresion> {
  if (!blob?.size) throw new Error('foto_vacia');
  if (blob.size > MAX_BYTES_ENTRADA) throw new Error('foto_supera_8mb');

  const img = await cargarImagen(blob);
  const full = await redimensionar(img, LADO_FULL, CALIDAD_FULL);
  const thumb = await redimensionar(img, LADO_THUMB, CALIDAD_THUMB);

  return {
    full: full.blob,
    thumb: thumb.blob,
    ancho: full.w,
    alto: full.h,
    formato: 'jpeg',
  };
}
