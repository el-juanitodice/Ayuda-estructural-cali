import { AlertTriangle } from 'lucide-react';
import { ADVERTENCIA_MAPA_DEFAULT, COLORES_MAPA, LEYENDA_ITEMS } from '@/constants/map';
import type { MapaLeyenda } from '@/types/map';

interface MapLegendProps {
  leyenda: MapaLeyenda | null;
}

export function MapLegend({ leyenda }: MapLegendProps) {
  const advertencia = leyenda?.advertencia ?? ADVERTENCIA_MAPA_DEFAULT;

  return (
    <div
      className="mt-3 rounded-xl border border-border/80 bg-card/90 px-4 py-3 text-sm shadow-sm backdrop-blur-sm"
      role="note"
      aria-label="Leyenda del mapa"
    >
      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Leyenda</p>
      <div className="flex flex-wrap gap-x-4 gap-y-2">
        {LEYENDA_ITEMS.map(({ color, texto }) => (
          <span key={color} className="inline-flex items-center gap-1">
            <i
              className="inline-block size-3 rounded-full border border-foreground/40"
              style={{ background: COLORES_MAPA[color] }}
              aria-hidden
            />
            {texto}
          </span>
        ))}
      </div>
      <p className="mb-0 mt-1.5 flex items-start gap-1.5 font-semibold">
        <AlertTriangle className="mt-0.5 size-4 shrink-0 text-amber-600" aria-hidden />
        <span>{advertencia}</span>
      </p>
    </div>
  );
}
