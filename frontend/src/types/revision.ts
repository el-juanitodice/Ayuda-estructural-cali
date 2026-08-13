export type NivelRiesgo = 'bajo' | 'bajo_medidas' | 'alto' | 'muy_alto';
export type HabitabilidadColor = 'verde' | 'amarillo' | 'naranja' | 'rojo';

export interface ItemColaRevision {
  reporte_uuid: string;
  consecutivo: string;
  direccion: string;
  barrio: string | null;
  comuna: string | null;
  requiere_nivel_a: boolean;
  motivo_escalacion: string[];
  formulario_uuid: string;
  capturado_en: string;
  visita_presencial_b: boolean;
  capturado_por_nombre: string | null;
  capturado_por_matricula: string | null;
}

export interface ColaRevisionResponse {
  pendientes: ItemColaRevision[];
}

export interface DanoAis {
  grupo: string;
  elemento: string;
  pct_ninguno: number;
  pct_leve: number;
  pct_moderado: number;
  pct_fuerte: number;
  pct_severo: number;
}

export interface FotoResumen {
  uuid: string;
  categoria: string;
  piso: string | null;
  origen: string;
}

export interface FormularioDetalle {
  uuid: string;
  estado: string;
  reporte_uuid: string;
  consecutivo: string | null;
  direccion: string;
  reporte_direccion: string;
  reporte_barrio: string | null;
  reporte_descripcion: string | null;
  pisos_declarados: number | null;
  uso_declarado: number | null;
  requiere_nivel_a: boolean;
  motivo_escalacion: string[];
  capturado_en: string | null;
  visita_presencial_b: boolean | null;
  visita_presencial_a: boolean | null;
  sistema_estructural: number | null;
  colapso: string | null;
  inclinacion: string | null;
  porcentaje_dano: string | null;
  piso_mayor_dano: string | null;
  comentarios: string | null;
  pisos_sobre_terreno: number | null;
  anio_construccion: number | null;
  asentamiento: string | null;
  falla_talud: string | null;
  capturado_por_nombre: string | null;
  capturado_por_matricula: string | null;
  firmado_por_nombre: string | null;
  firmado_por_matricula: string | null;
  habitabilidad_final: HabitabilidadColor | null;
  firmado_en: string | null;
  numero_formulario: string;
}

export interface FormularioResponse {
  formulario: FormularioDetalle;
  danos: DanoAis[];
  fotos: FotoResumen[];
}

export interface RiesgosDictamen {
  estabilidad: NivelRiesgo | '';
  geotecnico: NivelRiesgo | '';
  estructural: NivelRiesgo | '';
  no_estructural: NivelRiesgo | '';
}

export interface ReautenticarResponse {
  ticket_firma: string;
  valido_minutos: number;
}

export interface FirmarResponse {
  ok: boolean;
  habitabilidad_final: HabitabilidadColor;
  sugerida: HabitabilidadColor;
  discrepancia: boolean;
  recordatorio: string;
}
