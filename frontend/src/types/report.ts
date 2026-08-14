export type EstadoReporte =
  | 'nuevo'
  | 'validado'
  | 'asignado'
  | 'en_captura'
  | 'en_revision_a'
  | 'requiere_especialista'
  | 'vencido'
  | 'cerrado'
  | 'revisado_sin_inspeccion';

export type ColorHabitabilidad = 'verde' | 'amarillo' | 'naranja' | 'rojo';

export interface CrearReporteResponse {
  uuid: string;
  consecutivo: string;
}

export interface EstadoReporteResponse {
  consecutivo: string;
  estado: EstadoReporte;
  /** Texto amigable del estado del trámite */
  descripcion: string;
  barrio: string | null;
  comuna: string | null;
  direccion: string;
  descripcion_reporte: string | null;
  tipo_edificacion: string | null;
  pisos_declarados: number | null;
  unidades_declaradas: number | null;
  habitada: boolean | null;
  uso_declarado: number | null;
  creado_en: string;
  validado_en: string | null;
  firmado_en: string | null;
  color: ColorHabitabilidad | null;
}

export const PATRON_RADICADO = /^CAL-\d{4}-\d{5}$/i;

export const PLACEHOLDER_RADICADO = 'CAL-2026-00123';
