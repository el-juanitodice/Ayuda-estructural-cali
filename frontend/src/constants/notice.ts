import type { HabitabilidadColor } from '@/types/revision';

/** Texto explicativo para ocupantes en el aviso impreso. */
export const SIGNIFICADO_HABITABILIDAD: Record<HabitabilidadColor, string> = {
  verde:
    'La edificación puede usarse y habitarse normalmente. Si aparecen nuevos daños tras una réplica, repórtela de nuevo.',
  amarillo:
    'USO RESTRINGIDO. Solo entradas breves para recuperar bienes esenciales. No pernocte. Siga las restricciones indicadas por el ingeniero.',
  naranja:
    'NO HABITABLE. Prohibido habitarla hasta ser reparada y reinspeccionada. Entradas solo autorizadas y acompañadas.',
  rojo: 'PELIGRO DE COLAPSO. Prohibido entrar. Aléjese de la edificación y no permita el ingreso de nadie.',
};

/** Banner principal del dictamen (Tailwind). */
export const BANNER_HABITABILIDAD: Record<HabitabilidadColor, string> = {
  verde: 'bg-emerald-700 text-white',
  amarillo: 'bg-amber-500 text-neutral-900',
  naranja: 'bg-orange-600 text-white',
  rojo: 'bg-red-700 text-white',
};
