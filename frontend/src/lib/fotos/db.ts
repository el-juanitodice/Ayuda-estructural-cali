import Dexie, { type EntityTable } from 'dexie';
import type { AsignacionCampo } from '@/types/campo';
import type { FormularioCampoPayload } from '@/types/campo';
import type { ConteoCola } from '@/types/upload';

export interface FilaColaFoto {
  uuid: string;
  reporte_uuid: string;
  categoria: string;
  piso: string | null;
  estado: 'pendiente' | 'subiendo' | 'confirmada' | 'fallida';
  full: Blob | null;
  thumb: Blob | null;
  ancho: number;
  alto: number;
  formato: 'webp' | 'jpeg';
  bytes_full: number;
  bytes_thumb: number;
  exif: { lat?: number | null; lng?: number | null; tomada_en?: string | null } | null;
  intentos: number;
  proximo_intento: number;
  ultimo_error: string | null;
  creado_en: number;
  confirmada_en?: number;
}

export interface FormularioLocal extends FormularioCampoPayload {
  pendiente: 0 | 1;
  guardado_en: number;
  error_sync?: string;
}

export interface AsignacionLocal extends AsignacionCampo {
  fotos: Array<{ uuid: string; categoria: string; piso: string | null; origen: string }>;
}

export const db = new Dexie('inspeccion-cali') as Dexie & {
  cola_fotos: EntityTable<FilaColaFoto, 'uuid'>;
  formularios: EntityTable<FormularioLocal, 'uuid'>;
  asignaciones: EntityTable<AsignacionLocal, 'reporte_uuid'>;
};

db.version(1).stores({
  cola_fotos: 'uuid, reporte_uuid, estado, proximo_intento, creado_en',
});

db.version(2).stores({
  cola_fotos: 'uuid, reporte_uuid, estado, proximo_intento, creado_en',
  asignaciones: 'reporte_uuid',
  formularios: 'uuid, reporte_uuid, estado, pendiente',
});

const ESTADOS: FilaColaFoto['estado'][] = ['pendiente', 'subiendo', 'confirmada', 'fallida'];

export async function sanearColaAlArrancar() {
  await db.cola_fotos.where('estado').equals('subiendo').modify({ estado: 'pendiente' });
}

export async function contarPorEstado(): Promise<ConteoCola> {
  const [pendiente, subiendo, confirmada, fallida] = await Promise.all(
    ESTADOS.map((e) => db.cola_fotos.where('estado').equals(e).count()),
  );
  return { pendiente, subiendo, confirmada, fallida };
}
