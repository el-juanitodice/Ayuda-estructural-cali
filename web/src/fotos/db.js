/**
 * Base local (IndexedDB vía Dexie). BRIEF §4.1: local-first.
 *
 * `cola_fotos` es la cola PERSISTENTE de subida: si el ingeniero cierra la
 * app, apaga el celular o pierde señal, las fotos comprimidas quedan aquí
 * y la subida continúa cuando vuelva a abrir.
 *
 * Estados de una foto en la cola:
 *   pendiente  → esperando turno (o reintento programado en `proximo_intento`)
 *   subiendo   → en vuelo ahora mismo (al arrancar la app se devuelve a pendiente)
 *   confirmada → el servidor la registró; los blobs se borran para liberar espacio
 *   fallida    → agotó MAX_INTENTOS; requiere acción del usuario ("reintentar")
 */

import Dexie from 'dexie';

export const db = new Dexie('inspeccion-cali');

db.version(1).stores({
  // Índices: uuid es la clave (idempotencia); los demás para consultas de la cola
  cola_fotos: 'uuid, reporte_uuid, estado, proximo_intento, creado_en',
});

// v2 — captura de campo offline (BRIEF §4.1):
//   asignaciones: copia local de mis-asignaciones para abrir sin señal
//   formularios : borradores AIS, autoguardado en cada cambio; pendiente=1
//                 significa que hay cambios sin sincronizar al servidor
db.version(2).stores({
  cola_fotos: 'uuid, reporte_uuid, estado, proximo_intento, creado_en',
  asignaciones: 'reporte_uuid',
  formularios: 'uuid, reporte_uuid, estado, pendiente',
});

export const ESTADOS = ['pendiente', 'subiendo', 'confirmada', 'fallida'];

/** Al arrancar: nada puede quedar "subiendo" de una sesión anterior. */
export async function sanearColaAlArrancar() {
  await db.cola_fotos.where('estado').equals('subiendo')
    .modify({ estado: 'pendiente' });
}

/** Conteo para el indicador visible de pendientes (BRIEF §4.1). */
export async function contarPorEstado() {
  const [pendiente, subiendo, confirmada, fallida] = await Promise.all(
    ESTADOS.map((e) => db.cola_fotos.where('estado').equals(e).count()),
  );
  return { pendiente, subiendo, confirmada, fallida };
}
