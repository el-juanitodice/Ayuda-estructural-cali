import { cn } from '@/lib/utils';
import type { HabitabilidadColor } from '@/types/revision';

const ESTILOS: Record<HabitabilidadColor, string> = {
  verde: 'bg-emerald-600 text-white',
  amarillo: 'bg-amber-500 text-black',
  naranja: 'bg-orange-600 text-white',
  rojo: 'bg-red-600 text-white',
};

export function HabitabilidadBadge({
  color,
  etiqueta,
  className,
}: {
  color: HabitabilidadColor;
  etiqueta: string;
  className?: string;
}) {
  return (
    <span
      className={cn(
        'inline-block rounded-md px-3 py-1 text-sm font-semibold uppercase tracking-wide',
        ESTILOS[color],
        className,
      )}
    >
      {etiqueta}
    </span>
  );
}
