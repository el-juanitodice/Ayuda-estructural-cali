import { Link } from 'react-router-dom';
import { MapPinned, Megaphone, Search } from 'lucide-react';
import { MapLegend } from '@/components/map/MapLegend';
import { PageHeader } from '@/components/common/PageHeader';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { ui } from '@/constants/styles';
import { routes } from '@/constants/routes';
import { useConsultReport } from '@/contexts/ConsultReportContext';
import { useMapPage } from '@/pages/MapPage/hooks/useMapPage';
import { cn } from '@/lib/utils';

export function MapPage() {
  const { containerRef, leyenda, error, sinPuntos } = useMapPage();
  const { abrirConsulta } = useConsultReport();

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <PageHeader
        eyebrow="Post-sísmico · Cali"
        title="Mapa de inspecciones"
        description="Consulta el estado de dictámenes por zona. Los puntos aparecen tras validación telefónica por un moderador."
        actions={
          <>
            <Button asChild size="sm" className="gap-2 shadow-sm">
              <Link to={routes.reportar}>
                <Megaphone className="size-4" />
                Reportar daños
              </Link>
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="gap-2 bg-card/80"
              onClick={() => abrirConsulta()}
            >
              <Search className="size-4" />
              Consultar radicado
            </Button>
          </>
        }
        className="mb-4 border-none pb-0 sm:mb-5"
      />

      {error && (
        <Alert variant="destructive" className="mb-3">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {sinPuntos && !error && (
        <Alert className="mb-3 border-primary/20 bg-primary-soft/40">
          <MapPinned className="size-4 text-primary" />
          <AlertDescription>
            No hay puntos en el mapa todavía. Los reportes aparecen en gris cuando un moderador los
            valida por teléfono. En desarrollo, activa{' '}
            <code className="rounded bg-background/80 px-1 py-0.5 text-xs">MAPA_INCLUIR_NUEVO=true</code> en el
            backend para ver reportes recién enviados.
          </AlertDescription>
        </Alert>
      )}

      <div
        ref={containerRef}
        className={cn(
          ui.elevatedCard,
          'relative z-0 isolate min-h-[320px] flex-1 overflow-hidden ring-1 ring-border/60',
        )}
        aria-label="Mapa público de inspecciones en Cali"
      />
      <MapLegend leyenda={leyenda} />
    </div>
  );
}
