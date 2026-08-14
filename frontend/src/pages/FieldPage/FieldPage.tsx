import { RefreshCw, WifiOff } from 'lucide-react';
import { PageHeader } from '@/components/common/PageHeader';
import { DesktopTable, MobileDataList } from '@/components/common/ResponsiveTable';
import { FieldCaptureForm } from '@/components/campo/FieldCaptureForm';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { pageHeaders } from '@/constants/page-headers';
import { useFieldPage } from '@/pages/FieldPage/hooks/useFieldPage';
import type { AsignacionCampo } from '@/types/campo';

function formatearFecha(iso: string | null | undefined) {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('es-CO');
}

const ETIQUETA_FORMULARIO: Record<string, string> = {
  borrador: 'Borrador',
  capturado: 'En revisión A',
  firmado: 'Dictamen firmado',
};

function etiquetaAccion(item: AsignacionCampo) {
  if (item.editable) {
    if (!item.formulario_estado || item.formulario_estado === 'borrador') {
      return item.formulario_estado === 'borrador' ? 'Continuar' : 'Inspeccionar';
    }
    if (item.formulario_estado === 'capturado') return 'Corregir captura';
    return 'Abrir';
  }
  return 'Ver captura';
}

function BadgesAsignacion({ item }: { item: AsignacionCampo }) {
  return (
    <div className="flex flex-wrap items-center gap-1">
      <Badge variant="outline" className="font-normal">
        {ETIQUETA_FORMULARIO[item.formulario_estado ?? ''] ?? item.estado}
      </Badge>
      {item.editable && (
        <Badge variant="secondary" className="text-xs">
          editable
        </Badge>
      )}
    </div>
  );
}

function TablaAsignaciones({
  items,
  atenuada,
  onAbrir,
}: {
  items: AsignacionCampo[];
  atenuada?: boolean;
  onAbrir: (item: AsignacionCampo) => void;
}) {
  if (!items.length) return null;

  return (
    <>
      <MobileDataList inset className={atenuada ? 'text-muted-foreground' : undefined}>
        {items.map((a) => (
          <li key={`${a.reporte_uuid}-${a.formulario_uuid ?? 'nuevo'}`}>
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1 space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-medium">{a.consecutivo}</span>
                  {a.requiere_nivel_a && (
                    <Badge variant="destructive" className="text-xs">
                      nivel A
                    </Badge>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  {a.direccion}
                  {a.barrio ? ` · ${a.barrio}` : ''}
                </p>
                <p className="text-xs text-muted-foreground">
                  {formatearFecha(a.firmado_en ?? a.capturado_en ?? a.vence_en)}
                </p>
              </div>
              <Button
                size="sm"
                variant={a.editable ? 'default' : 'outline'}
                className="shrink-0"
                onClick={() => onAbrir(a)}
              >
                {etiquetaAccion(a)}
              </Button>
            </div>
            <div className="mt-2">
              <BadgesAsignacion item={a} />
            </div>
          </li>
        ))}
      </MobileDataList>

      <DesktopTable>
        <Table className="min-w-[640px]">
          <TableHeader>
            <TableRow>
              <TableHead>Radicado</TableHead>
              <TableHead>Dirección</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead>Fecha</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((a) => (
              <TableRow
                key={`${a.reporte_uuid}-${a.formulario_uuid ?? 'nuevo'}`}
                className={atenuada ? 'text-muted-foreground' : undefined}
              >
                <TableCell className="font-medium">
                  {a.consecutivo}
                  {a.requiere_nivel_a && (
                    <Badge variant="destructive" className="ml-2">
                      nivel A
                    </Badge>
                  )}
                </TableCell>
                <TableCell>
                  {a.direccion}
                  {a.barrio ? ` · ${a.barrio}` : ''}
                </TableCell>
                <TableCell>
                  <BadgesAsignacion item={a} />
                </TableCell>
                <TableCell className="whitespace-nowrap text-xs">
                  {formatearFecha(a.firmado_en ?? a.capturado_en ?? a.vence_en)}
                </TableCell>
                <TableCell className="text-right">
                  <Button size="sm" variant={a.editable ? 'default' : 'outline'} onClick={() => onAbrir(a)}>
                    {etiquetaAccion(a)}
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </DesktopTable>
    </>
  );
}

export function FieldPage() {
  const {
    activas,
    historial,
    fotosPorReporte,
    abierta,
    setAbierta,
    error,
    cargando,
    desdeCache,
    cargar,
  } = useFieldPage();

  if (abierta) {
    return (
      <FieldCaptureForm
        asignacion={abierta}
        fotos={fotosPorReporte[abierta.reporte_uuid] ?? []}
        onVolver={() => setAbierta(null)}
        onCerrado={cargar}
      />
    );
  }

  const vacio = activas.length === 0 && historial.length === 0;

  return (
    <div className="space-y-6">
      <PageHeader
        suppressTitle
        eyebrow={pageHeaders.campo.eyebrow}
        title={pageHeaders.campo.title}
        description={pageHeaders.campo.description}
        actions={
          <Button variant="outline" size="sm" onClick={cargar} disabled={cargando}>
            <RefreshCw className={`mr-2 h-4 w-4 ${cargando ? 'animate-spin' : ''}`} />
            Actualizar
          </Button>
        }
      />

      {desdeCache && (
        <Alert className="border-amber-300 bg-amber-50 text-amber-950">
          <WifiOff className="size-4" />
          <AlertDescription>
            Mostrando asignaciones guardadas en el dispositivo. Conecta para actualizar.
          </AlertDescription>
        </Alert>
      )}

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {cargando && vacio ? (
        <p className="text-muted-foreground">Cargando asignaciones…</p>
      ) : vacio ? (
        <Card>
          <CardContent className="py-10 text-center text-muted-foreground">
            No tienes asignaciones ni capturas registradas.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {activas.length > 0 && (
            <Card>
              <CardContent className="p-0">
                <div className="border-b px-6 py-2 text-sm font-medium">Activas ({activas.length})</div>
                <div className="px-6 pb-4">
                  <TablaAsignaciones items={activas} onAbrir={setAbierta} />
                </div>
              </CardContent>
            </Card>
          )}

          {activas.length === 0 && !cargando && (
            <Card>
              <CardContent className="py-6 text-center text-sm text-muted-foreground">
                No tienes asignaciones activas en este momento.
              </CardContent>
            </Card>
          )}

          {historial.length > 0 && (
            <Card>
              <CardContent className="p-0">
                <div className="border-b bg-muted/30 px-6 py-2 text-sm font-medium text-muted-foreground">
                  Historial ({historial.length})
                </div>
                <div className="px-6 pb-4">
                  <TablaAsignaciones items={historial} atenuada onAbrir={setAbierta} />
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
