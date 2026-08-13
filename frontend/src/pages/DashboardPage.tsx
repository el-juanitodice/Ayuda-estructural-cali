import { useCallback, useEffect, useState } from 'react';
import { Download, LayoutDashboard, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { CLASE_COLOR, ETIQUETA_COLOR } from '@/constants/reportStatus';
import { COLORES_MAPA } from '@/constants/map';
import { descargarArchivo, get } from '@/lib/api';
import { cn } from '@/lib/utils';
import type { ColorHabitabilidad } from '@/types/report';
import type {
  CoberturaTableroResponse,
  DiscrepanciasTableroResponse,
  VencimientosTableroResponse,
} from '@/types/tablero';

const COLORES_DICTAMEN: ColorHabitabilidad[] = ['verde', 'amarillo', 'naranja', 'rojo'];

function formatearFecha(iso: string) {
  return new Date(iso).toLocaleString('es-CO');
}

function etiquetaNivel(nivel: string) {
  return nivel === 'ingeniero_a' ? 'A' : nivel === 'ingeniero_b' ? 'B' : nivel;
}

export function DashboardPage() {
  const [cobertura, setCobertura] = useState<CoberturaTableroResponse | null>(null);
  const [vencimientos, setVencimientos] = useState<VencimientosTableroResponse['asignaciones']>([]);
  const [discrepancias, setDiscrepancias] = useState<DiscrepanciasTableroResponse['discrepancias']>(
    [],
  );
  const [error, setError] = useState<string | null>(null);
  const [cargando, setCargando] = useState(true);
  const [exportando, setExportando] = useState(false);

  const cargar = useCallback(async () => {
    setCargando(true);
    setError(null);
    try {
      const [c, v, d] = await Promise.all([
        get<CoberturaTableroResponse>('/tablero/cobertura'),
        get<VencimientosTableroResponse>('/tablero/vencimientos'),
        get<DiscrepanciasTableroResponse>('/tablero/discrepancias'),
      ]);
      setCobertura(c);
      setVencimientos(v.asignaciones);
      setDiscrepancias(d.discrepancias);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo cargar el tablero');
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    void cargar();
  }, [cargar]);

  const exportarCsv = async () => {
    setExportando(true);
    setError(null);
    try {
      const hoy = new Date().toISOString().slice(0, 10);
      await descargarArchivo('/tablero/exportar?formato=csv', `inspecciones_${hoy}.csv`);
      toast.success('CSV exportado', { description: `inspecciones_${hoy}.csv` });
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'No se pudo exportar';
      setError(msg);
      toast.error('No se pudo exportar', { description: msg });
    } finally {
      setExportando(false);
    }
  };

  if (cargando && !cobertura) {
    return <p className="text-sm text-muted-foreground">Cargando tablero…</p>;
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <LayoutDashboard className="size-5 text-primary" />
          <h1 className="text-lg font-semibold">Tablero de coordinación</h1>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="secondary" size="sm" onClick={() => void cargar()} disabled={cargando}>
            <RefreshCw className={cn('size-4', cargando && 'animate-spin')} />
            Actualizar
          </Button>
          <Button type="button" size="sm" onClick={() => void exportarCsv()} disabled={exportando}>
            <Download className="size-4" />
            {exportando ? 'Exportando…' : 'Exportar CSV'}
          </Button>
        </div>
      </div>

      {error && <p className="text-sm font-medium text-destructive">{error}</p>}

      {cobertura && (
        <>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Dictámenes por color</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                {COLORES_DICTAMEN.map((color) => {
                  const fila = cobertura.por_color.find((x) => x.color === color);
                  const total = fila?.total ?? 0;
                  return (
                    <div
                      key={color}
                      className={cn(
                        'rounded-lg px-3 py-4 text-center text-2xl font-extrabold',
                        CLASE_COLOR[color],
                      )}
                      title={ETIQUETA_COLOR[color]}
                    >
                      {total}
                      <span className="mt-1 block text-[10px] font-semibold uppercase tracking-wide opacity-90">
                        {ETIQUETA_COLOR[color]}
                      </span>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Cobertura por comuna</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Comuna</TableHead>
                    <TableHead className="text-right">Nuevos</TableHead>
                    <TableHead className="text-right">Por asignar</TableHead>
                    <TableHead className="text-right">En proceso</TableHead>
                    <TableHead className="text-right">Cerrados</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {cobertura.por_comuna.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center text-muted-foreground">
                        Sin reportes todavía
                      </TableCell>
                    </TableRow>
                  ) : (
                    cobertura.por_comuna.map((c) => (
                      <TableRow key={c.comuna}>
                        <TableCell className="font-medium">{c.comuna}</TableCell>
                        <TableCell className="text-right">{c.nuevos}</TableCell>
                        <TableCell className="text-right">{c.por_asignar}</TableCell>
                        <TableCell className="text-right">{c.en_proceso}</TableCell>
                        <TableCell className="text-right">{c.cerrados}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">
                  Asignaciones por vencer ({vencimientos.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                {vencimientos.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No hay asignaciones abiertas.</p>
                ) : (
                  <ul className="max-h-80 space-y-3 overflow-y-auto text-sm">
                    {vencimientos.map((v) => (
                      <li key={`${v.consecutivo}-${v.vence_en}`} className="rounded-md border p-3">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-mono font-semibold">{v.consecutivo}</span>
                          <span className="text-muted-foreground">· {v.ingeniero}</span>
                          <Badge variant="secondary">Ing. {etiquetaNivel(v.nivel)}</Badge>
                          {v.vencida && <Badge variant="destructive">Vencida</Badge>}
                        </div>
                        <p className="mt-1 text-xs text-muted-foreground">
                          Vence {formatearFecha(v.vence_en)}
                        </p>
                        <p className="text-xs text-muted-foreground">{v.direccion}</p>
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">
                  Discrepancias firmadas ({discrepancias.length})
                </CardTitle>
                <CardDescription>
                  Color firmado distinto del sugerido, con justificación. Cola de revisión de calidad.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {discrepancias.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Sin discrepancias registradas.</p>
                ) : (
                  <ul className="max-h-80 space-y-3 overflow-y-auto text-sm">
                    {discrepancias.map((d) => (
                      <li key={d.formulario_uuid} className="rounded-md border p-3">
                        <p>
                          <span className="font-mono font-semibold">{d.consecutivo}</span>
                          {' · sugerido '}
                          <span
                            className="inline-block rounded px-1.5 py-0.5 text-xs font-bold text-white"
                            style={{ backgroundColor: COLORES_MAPA[d.sugerida as ColorHabitabilidad] }}
                          >
                            {d.sugerida}
                          </span>
                          {' → firmado '}
                          <span
                            className="inline-block rounded px-1.5 py-0.5 text-xs font-bold text-white"
                            style={{ backgroundColor: COLORES_MAPA[d.final as ColorHabitabilidad] }}
                          >
                            {d.final}
                          </span>
                        </p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {d.firmado_por_nombre}
                          {d.matricula ? ` (mat. ${d.matricula})` : ''}
                        </p>
                        <p className="mt-1 text-xs italic text-muted-foreground">
                          &ldquo;{d.motivo_discrepancia}&rdquo;
                        </p>
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>
          </div>

          <p className="text-xs text-muted-foreground">
            La exportación CSV no incluye datos personales del reportante (Ley 1581).
          </p>
        </>
      )}
    </div>
  );
}
