import { ErrorApi } from '@/api/http.client';
import { campoService } from '@/api/campo/campo.service';
import { db, type AsignacionLocal, type FormularioLocal } from '@/lib/fotos/db';
import type {
  AsignacionCampo,
  FormularioCampoPayload,
  MisAsignacionesResponse,
} from '@/types/campo';

const emisor = new EventTarget();

export function suscribirPendientesCampo(cb: (total: number) => void) {
  const h = (ev: Event) => cb((ev as CustomEvent<number>).detail);
  emisor.addEventListener('cambio', h);
  contarPendientesCampo().then(cb).catch(() => {});
  return () => emisor.removeEventListener('cambio', h);
}

export async function contarPendientesCampo() {
  return db.formularios.where('pendiente').equals(1).count();
}

async function notificar() {
  emisor.dispatchEvent(new CustomEvent('cambio', { detail: await contarPendientesCampo() }));
}

export function payloadDesdeLocal(f: FormularioLocal): FormularioCampoPayload {
  const { pendiente: _p, guardado_en: _g, error_sync: _e, ...payload } = f;
  return payload;
}

export async function cacheFormularioServidor(formulario: FormularioCampoPayload) {
  await db.formularios.put({
    ...formulario,
    pendiente: 0,
    guardado_en: Date.now(),
  });
}

/** Guarda el borrador localmente (siempre funciona) y dispara sync. */
export async function guardarLocal(formulario: FormularioCampoPayload) {
  await db.formularios.put({
    ...formulario,
    pendiente: 1,
    guardado_en: Date.now(),
  });
  void notificar();
  void sincronizarCampo();
}

export async function cargarLocal(uuid: string) {
  return db.formularios.get(uuid);
}

export async function formularioDeReporte(reporteUuid: string) {
  return db.formularios.where('reporte_uuid').equals(reporteUuid).first();
}

let sincronizando = false;

/** Empuja formularios pendientes al servidor. Silencioso sin señal. */
export async function sincronizarCampo() {
  if (sincronizando) return;
  if (typeof navigator !== 'undefined' && !navigator.onLine) return;

  sincronizando = true;
  try {
    const pendientes = await db.formularios.where('pendiente').equals(1).toArray();
    for (const f of pendientes) {
      try {
        const { pendiente: _p, guardado_en: _g, error_sync: _e, ...cuerpo } = f;
        await campoService.guardarFormulario(cuerpo);
        await db.formularios.update(f.uuid, { pendiente: 0, error_sync: undefined });
      } catch (err) {
        if (
          err instanceof ErrorApi &&
          err.status !== 429 &&
          err.status < 500 &&
          err.status !== 408
        ) {
          await db.formularios.update(f.uuid, {
            pendiente: 0,
            error_sync: err.message,
          });
        }
      }
    }
  } finally {
    sincronizando = false;
    void notificar();
  }
}

function reconstruirDesdeCache(cached: AsignacionLocal[]): MisAsignacionesResponse {
  const activas = cached.filter((a) => a.activa);
  const historial = cached.filter((a) => !a.activa);
  const fotos: MisAsignacionesResponse['fotos'] = {};
  for (const a of cached) {
    fotos[a.reporte_uuid] = a.fotos ?? [];
  }
  return { activas, historial, fotos };
}

/** Descarga asignaciones y las cachea; sin señal devuelve la copia local. */
export async function refrescarAsignacionesCampo(): Promise<MisAsignacionesResponse> {
  try {
    const r = await campoService.misAsignaciones();
    await db.asignaciones.clear();
    for (const a of [...r.activas, ...r.historial]) {
      const fila: AsignacionLocal = {
        ...a,
        fotos: r.fotos[a.reporte_uuid] ?? [],
      };
      await db.asignaciones.put(fila);
    }
    return r;
  } catch {
    const cached = await db.asignaciones.toArray();
    if (!cached.length) throw new Error('Sin conexión y sin datos locales de asignaciones');
    return reconstruirDesdeCache(cached);
  }
}

export async function asignacionLocal(reporteUuid: string): Promise<AsignacionCampo | undefined> {
  const fila = await db.asignaciones.get(reporteUuid);
  if (!fila) return undefined;
  const { fotos: _f, ...asignacion } = fila;
  return asignacion;
}

let syncIniciado = false;

export function iniciarSyncCampo() {
  if (syncIniciado || typeof window === 'undefined') return;
  syncIniciado = true;

  window.addEventListener('online', () => void sincronizarCampo());
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') void sincronizarCampo();
  });
  void sincronizarCampo();
}
