export interface ReporteCola {
  uuid: string;
  consecutivo: string | null;
  estado: string;
  en_cola: boolean;
  reportante_nombre: string;
  reportante_telefono: string;
  reportante_relacion: string | null;
  direccion: string;
  barrio: string | null;
  comuna: string | null;
  tipo_edificacion: string | null;
  pisos_declarados: number | null;
  unidades_declaradas: number | null;
  habitada: boolean | null;
  uso_declarado: number | null;
  descripcion: string | null;
  menciona_colapso: boolean;
  requiere_nivel_a: boolean;
  motivo_escalacion: string[] | null;
  motivo_descarte: string | null;
  creado_en: string;
  actualizado_en: string;
  lat: number;
  lng: number;
  reportes_del_predio: number;
}

export interface ColaModeracionResponse {
  en_cola: ReporteCola[];
  historial: ReporteCola[];
}

export interface IngenieroDisponible {
  id: number;
  nombre: string;
  rol: 'ingeniero_a' | 'ingeniero_b';
  profesion: string | null;
  matricula: string | null;
  carga_actual: number;
}

export interface ValidarResponse {
  ok: boolean;
  requiere_nivel_a: boolean;
  motivos: string[];
}

export type MotivoDescarte = 'duplicado' | 'no_contesta' | 'fuera_de_zona' | 'spam' | 'otro';
