import { MapLegend } from '@/components/map/MapLegend';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useMapPage } from '@/pages/MapPage/hooks/useMapPage';

export function MapPage() {
  const { containerRef, leyenda, error, sinPuntos } = useMapPage();

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {error && (
        <Alert variant="destructive" className="mb-2">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {sinPuntos && !error && (
        <Alert className="mb-2 border-muted bg-muted/50">
          <AlertDescription>
            No hay puntos en el mapa todavía. Los reportes aparecen en gris cuando un moderador los
            valida por teléfono. En desarrollo, activa{' '}
            <code className="text-xs">MAPA_INCLUIR_NUEVO=true</code> en el backend para ver reportes
            recién enviados.
          </AlertDescription>
        </Alert>
      )}

      <div
        ref={containerRef}
        className="relative z-0 isolate min-h-[300px] flex-1 rounded-lg border"
        aria-label="Mapa público de inspecciones en Cali"
      />
      <MapLegend leyenda={leyenda} />
    </div>
  );
}
