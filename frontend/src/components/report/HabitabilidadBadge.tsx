import type { ColorHabitabilidad } from '@/types/report';
import { CLASE_COLOR, ETIQUETA_COLOR } from '@/constants/reportStatus';
import { cn } from '@/lib/utils';

interface HabitabilidadBadgeProps {
  color: ColorHabitabilidad;
}

export function HabitabilidadBadge({ color }: HabitabilidadBadgeProps) {
  return (
    <p
      className={cn(
        'rounded-lg px-2.5 py-2.5 text-center text-xl font-extrabold',
        CLASE_COLOR[color],
      )}
    >
      {ETIQUETA_COLOR[color]}
    </p>
  );
}
