import type { ColorHabitabilidad } from '@/types/report';

export interface CoberturaComuna {
  comuna: string;
  nuevos: number;
  por_asignar: number;
  en_proceso: number;
  cerrados: number;
}

export interface CoberturaColor {
  color: ColorHabitabilidad | string;
  total: number;
}

export interface CoberturaTableroResponse {
  por_comuna: CoberturaComuna[];
  por_color: CoberturaColor[];
}

export interface AsignacionVencimiento {
  consecutivo: string;
  direccion: string;
  vence_en: string;
  vencida: boolean;
  ingeniero: string;
  nivel: string;
}

export interface VencimientosTableroResponse {
  asignaciones: AsignacionVencimiento[];
}

export interface DiscrepanciaTablero {
  consecutivo: string;
  direccion: string;
  barrio: string | null;
  formulario_uuid: string;
  sugerida: string;
  final: string;
  motivo_discrepancia: string;
  firmado_en: string;
  firmado_por_nombre: string;
  matricula: string | null;
}

export interface DiscrepanciasTableroResponse {
  discrepancias: DiscrepanciaTablero[];
}
