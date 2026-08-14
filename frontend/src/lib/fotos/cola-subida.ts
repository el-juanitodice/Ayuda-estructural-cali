import { ErrorApi } from '@/api/http.client';
import { fotosService } from '@/api/fotos/fotos.service';
import type { ConteoCola } from '@/types/upload';
import { comprimirFoto } from './compresor';
import { contarPorEstado, db, sanearColaAlArrancar } from './db';
import { extraerExif } from './exif';

const MAX_CONCURRENTES = 2;
const MAX_INTENTOS = 8;
const BACKOFF_BASE_MS = 5_000;
const BACKOFF_TOPE_MS = 5 * 60_000;

const emisor = new EventTarget();

export function suscribirse(cb: (conteo: ConteoCola) => void) {
  const h = (ev: Event) => cb((ev as CustomEvent<ConteoCola>).detail);
  emisor.addEventListener('cambio', h);
  contarPorEstado().then(cb).catch(() => {});
  return () => emisor.removeEventListener('cambio', h);
}

async function notificar() {
  try {
    emisor.dispatchEvent(new CustomEvent('cambio', { detail: await contarPorEstado() }));
  } catch {
    /* noop */
  }
}

export interface EncolarFotoParams {
  archivo: File | Blob;
  reporte_uuid: string;
  categoria: string;
  piso?: string | null;
}

export async function encolarFoto({
  archivo,
  reporte_uuid,
  categoria,
  piso = null,
}: EncolarFotoParams): Promise<string> {
  if (!archivo || !reporte_uuid || !categoria) throw new Error('encolar_datos_incompletos');

  const uuid = crypto.randomUUID();
  const exif = await extraerExif(archivo);
  const { full, thumb, ancho, alto, formato } = await comprimirFoto(archivo);

  await db.cola_fotos.add({
    uuid,
    reporte_uuid,
    categoria,
    piso,
    estado: 'pendiente',
    full,
    thumb,
    ancho,
    alto,
    formato,
    bytes_full: full.size,
    bytes_thumb: thumb.size,
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

let enVuelo = 0;
let timerReintento: ReturnType<typeof setTimeout> | null = null;

export function iniciarCola() {
  sanearColaAlArrancar().then(() => procesarCola());
  window.addEventListener('online', () => procesarCola());
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
      .catch(() => {})
      .finally(() => {
        enVuelo--;
        procesarCola();
      });
  }

  programarReintento();
}

async function tomarSiguiente() {
  return db.transaction('rw', db.cola_fotos, async () => {
    const foto = await db.cola_fotos
      .where('estado')
      .equals('pendiente')
      .filter((f) => (f.proximo_intento || 0) <= Date.now())
      .first();
    if (!foto) return null;
    await db.cola_fotos.update(foto.uuid, { estado: 'subiendo' });
    return foto;
  });
}

async function programarReintento() {
  if (timerReintento) {
    clearTimeout(timerReintento);
    timerReintento = null;
  }
  const proxima = await db.cola_fotos
    .where('estado')
    .equals('pendiente')
    .filter((f) => (f.proximo_intento || 0) > Date.now())
    .sortBy('proximo_intento');
  if (!proxima.length) return;
  const espera = Math.max(500, proxima[0].proximo_intento - Date.now());
  timerReintento = setTimeout(() => procesarCola(), espera);
}

async function subirFoto(foto: Awaited<ReturnType<typeof tomarSiguiente>> & object) {
  if (!foto?.full || !foto.thumb) return;

  try {
    const form = new FormData();
    form.append('reporte_uuid', foto.reporte_uuid);
    form.append('uuid', foto.uuid);
    form.append('categoria', foto.categoria);
    if (foto.piso) form.append('piso', foto.piso);
    form.append('formato', foto.formato);
    form.append('ancho', String(foto.ancho));
    form.append('alto', String(foto.alto));
    if (foto.exif) form.append('exif', JSON.stringify(foto.exif));

    const ext = foto.formato === 'webp' ? 'webp' : 'jpg';
    form.append('full', foto.full, `full.${ext}`);
    form.append('thumb', foto.thumb, `thumb.${ext}`);

    const r = await fotosService.subir(form);
    if (r.ya_confirmada || r.ok) {
      await marcarConfirmada(foto.uuid);
    }
  } catch (err) {
    if (err instanceof ErrorApi && err.codigo === 'cupo_lleno') {
      await marcarFallida(foto.uuid, 'cupo_lleno');
      return;
    }
    await registrarFallo(foto, err);
    throw err;
  } finally {
    notificar();
  }
}

async function marcarConfirmada(uuid: string) {
  await db.cola_fotos.update(uuid, {
    estado: 'confirmada',
    full: null,
    thumb: null,
    confirmada_en: Date.now(),
  });
}

async function marcarFallida(uuid: string, motivo: string) {
  await db.cola_fotos.update(uuid, { estado: 'fallida', ultimo_error: motivo });
}

async function registrarFallo(
  foto: NonNullable<Awaited<ReturnType<typeof tomarSiguiente>>>,
  err: unknown,
) {
  const intentos = (foto.intentos || 0) + 1;
  const msg = err instanceof Error ? err.message : String(err);
  const status = err instanceof ErrorApi ? err.status : 0;
  const definitivo = status >= 400 && status < 500 && status !== 408 && status !== 429;

  if (definitivo || intentos >= MAX_INTENTOS) {
    return marcarFallida(foto.uuid, msg);
  }

  const base = Math.min(BACKOFF_TOPE_MS, BACKOFF_BASE_MS * 2 ** (intentos - 1));
  const espera = base / 2 + Math.random() * (base / 2);
  await db.cola_fotos.update(foto.uuid, {
    estado: 'pendiente',
    intentos,
    proximo_intento: Date.now() + espera,
    ultimo_error: msg,
  });
}

export async function encolarFotosReporte(
  reporteUuid: string,
  archivos: File[],
  categoria = 'otras',
): Promise<number> {
  let ok = 0;
  for (const archivo of archivos) {
    try {
      await encolarFoto({ archivo, reporte_uuid: reporteUuid, categoria });
      ok++;
    } catch {
      /* una foto ilegible no daña el reporte */
    }
  }
  return ok;
}
