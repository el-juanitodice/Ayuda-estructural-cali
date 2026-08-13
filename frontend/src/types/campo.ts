import type { DanoAis } from '@/types/revision';

export interface AsignacionCampo {
  asignacion_id: number;
  vence_en: string;
  rol_asignado: string;
  reporte_uuid: string;
  consecutivo: string;
  direccion: string;
  barrio: string | null;
  comuna: string | null;
  tipo_edificacion: string | null;
  pisos_declarados: number | null;
  unidades_declaradas: number | null;
  habitada: boolean | null;
  uso_declarado: number | null;
  descripcion: string | null;
  estado: string;
  requiere_nivel_a: boolean;
  motivo_escalacion: string[];
  lat: number;
  lng: number;
  formulario_uuid: string | null;
  formulario_estado: string | null;
}

export interface MisAsignacionesResponse {
  asignaciones: AsignacionCampo[];
  fotos: Record<string, Array<{ uuid: string; categoria: string; piso: string | null; origen: string }>>;
}

export type EstadoFormularioCampo = 'borrador' | 'capturado';

export interface FormularioCampoPayload {
  uuid: string;
  reporte_uuid: string;
  estado: EstadoFormularioCampo;
  visita_presencial_b: boolean;
  sistema_estructural: number;
  colapso: string;
  inclinacion: string;
  asentamiento: string;
  falla_talud: string;
  pisos_sobre_terreno: number | null;
  anio_construccion: number;
  piso_mayor_dano: string;
  porcentaje_dano: string;
  comentarios: string;
  danos: DanoAis[];
}

export interface GuardarFormularioResponse {
  ok: boolean;
  uuid: string;
  estado: EstadoFormularioCampo;
}
