import type { ColorHabitabilidad, EstadoReporte } from '@/types/report';

export const DESCRIPCION_ESTADO: Record<EstadoReporte, string> = {
  nuevo: 'Recibido. Un moderador te llamará para confirmar los datos.',
  validado: 'Validado por teléfono. En cola para asignar un ingeniero.',
  asignado: 'Un ingeniero tiene asignada la visita.',
  en_captura: 'El ingeniero está haciendo la inspección de campo.',
  en_revision_a: 'La captura está en revisión de un ingeniero nivel A.',
  requiere_especialista: 'Requiere un especialista. Sigue en proceso.',
  vencido: 'La asignación venció; volverá a asignarse.',
  cerrado: 'Inspección cerrada con dictamen firmado.',
  revisado_sin_inspeccion: 'Revisado. No se programó inspección para este reporte.',
};

export const ETIQUETA_COLOR: Record<ColorHabitabilidad, string> = {
  verde: 'HABITABLE',
  amarillo: 'USO RESTRINGIDO',
  naranja: 'NO HABITABLE',
  rojo: 'PELIGRO DE COLAPSO',
};

export const CLASE_COLOR: Record<ColorHabitabilidad, string> = {
  verde: 'bg-[#2e7d32] text-white',
  amarillo: 'bg-[#f9a825] text-gray-900',
  naranja: 'bg-[#ef6c00] text-white',
  rojo: 'bg-[#c62828] text-white',
};
