export interface ReporteForm {
  reportante_nombre: string;
  reportante_telefono: string;
  reportante_relacion: string;
  direccion: string;
  barrio: string;
  tipo_edificacion: string;
  pisos_declarados: number;
  unidades_declaradas: number;
  habitada: boolean;
  uso_declarado: number;
  descripcion: string;
  personasAtrapadas: boolean;
  colapsoEnCurso: boolean;
}

export const valoresInicialesReporte: ReporteForm = {
  reportante_nombre: '',
  reportante_telefono: '',
  reportante_relacion: 'propietario',
  direccion: '',
  barrio: '',
  tipo_edificacion: 'casa',
  pisos_declarados: 1,
  unidades_declaradas: 1,
  habitada: true,
  uso_declarado: 1,
  descripcion: '',
  personasAtrapadas: false,
  colapsoEnCurso: false,
};
