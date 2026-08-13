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
      className="mt-2 rounded-lg border-2 border-primary bg-card px-3 py-2 text-sm"
      role="note"
      aria-label="Leyenda del mapa"
    >
      <div className="flex flex-wrap gap-x-3.5 gap-y-1">
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
