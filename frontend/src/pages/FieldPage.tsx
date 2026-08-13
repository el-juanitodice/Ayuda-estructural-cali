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

function formatearFecha(iso: string) {
  return new Date(iso).toLocaleString('es-CO');
}

export function FieldPage() {
  const [asignaciones, setAsignaciones] = useState<AsignacionCampo[] | null>(null);
  const [fotosPorReporte, setFotosPorReporte] = useState<MisAsignacionesResponse['fotos']>({});
  const [abierta, setAbierta] = useState<AsignacionCampo | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [cargando, setCargando] = useState(true);

  const cargar = useCallback(() => {
    setCargando(true);
    setError(null);
    get<MisAsignacionesResponse>('/campo/mis-asignaciones')
      .then((r) => {
        setAsignaciones(r.asignaciones);
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

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Inspección de campo</h1>
          <p className="text-sm text-muted-foreground">
            Casos asignados pendientes de captura. Al cerrar pasan a Revisión nivel A.
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

      {cargando && !asignaciones ? (
        <p className="text-muted-foreground">Cargando asignaciones…</p>
      ) : !asignaciones?.length ? (
        <Card>
          <CardContent className="py-10 text-center text-muted-foreground">
            No tienes asignaciones activas.
          </CardContent>
        </Card>
      ) : (
        <div className="overflow-x-auto rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Radicado</TableHead>
                <TableHead>Dirección</TableHead>
                <TableHead>Vence</TableHead>
                <TableHead>Captura</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {asignaciones.map((a) => (
                <TableRow key={a.asignacion_id}>
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
                  <TableCell>{formatearFecha(a.vence_en)}</TableCell>
                  <TableCell>
                    {a.formulario_estado ? `captura ${a.formulario_estado}` : 'sin empezar'}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button size="sm" onClick={() => setAbierta(a)}>
                      {a.formulario_estado === 'borrador' ? 'Continuar' : 'Inspeccionar'}
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
