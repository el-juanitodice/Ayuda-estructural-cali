import { useCallback, useEffect, useState } from 'react';
import { RefreshCw } from 'lucide-react';
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
import { get } from '@/lib/api';
import type { AsignacionCampo, MisAsignacionesResponse } from '@/types/campo';

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
    <Table>
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
          <TableRow key={`${a.reporte_uuid}-${a.formulario_uuid ?? 'nuevo'}`} className={atenuada ? 'text-muted-foreground' : undefined}>
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
              <div className="flex flex-wrap items-center gap-1">
                <Badge variant="outline" className="font-normal">
                  {ETIQUETA_FORMULARIO[a.formulario_estado ?? ''] ?? a.estado}
                </Badge>
                {a.editable && (
                  <Badge variant="secondary" className="text-xs">
                    editable
                  </Badge>
                )}
              </div>
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
  );
}

export function FieldPage() {
  const [activas, setActivas] = useState<AsignacionCampo[]>([]);
  const [historial, setHistorial] = useState<AsignacionCampo[]>([]);
  const [fotosPorReporte, setFotosPorReporte] = useState<MisAsignacionesResponse['fotos']>({});
  const [abierta, setAbierta] = useState<AsignacionCampo | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [cargando, setCargando] = useState(true);

  const cargar = useCallback(() => {
    setCargando(true);
    setError(null);
    get<MisAsignacionesResponse>('/campo/mis-asignaciones')
      .then((r) => {
        setActivas(r.activas);
        setHistorial(r.historial);
        setFotosPorReporte(r.fotos);
        setAbierta(null);
      })
      .catch((e) => setError(e instanceof Error ? e.message : 'No se pudo cargar'))
      .finally(() => setCargando(false));
  }, []);

  useEffect(() => {
    cargar();
  }, [cargar]);

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
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Inspección de campo</h1>
          <p className="text-sm text-muted-foreground">
            Casos activos arriba; abajo puedes consultar capturas anteriores y corregirlas mientras sigan en
            revisión.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={cargar} disabled={cargando}>
          <RefreshCw className={`mr-2 h-4 w-4 ${cargando ? 'animate-spin' : ''}`} />
          Actualizar
        </Button>
      </div>

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
                <div className="border-b px-4 py-2 text-sm font-medium">Activas ({activas.length})</div>
                <TablaAsignaciones items={activas} onAbrir={setAbierta} />
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
                <div className="border-b bg-muted/30 px-4 py-2 text-sm font-medium text-muted-foreground">
                  Historial ({historial.length})
                </div>
                <TablaAsignaciones items={historial} atenuada onAbrir={setAbierta} />
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
