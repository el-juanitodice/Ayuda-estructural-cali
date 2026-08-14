import { Download, RefreshCw } from 'lucide-react';
import { PageHeader } from '@/components/common/PageHeader';
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
import { pageHeaders } from '@/constants/page-headers';
import { cn } from '@/lib/utils';
import { useDashboardPage } from '@/pages/DashboardPage/hooks/useDashboardPage';
import type { ColorHabitabilidad } from '@/types/report';

const COLORES_DICTAMEN: ColorHabitabilidad[] = ['verde', 'amarillo', 'naranja', 'rojo'];

function formatearFecha(iso: string) {
  return new Date(iso).toLocaleString('es-CO');
}

function etiquetaNivel(nivel: string) {
  return nivel === 'ingeniero_a' ? 'A' : nivel === 'ingeniero_b' ? 'B' : nivel;
}

function TarjetaCoberturaComuna({
  comuna,
  nuevos,
  por_asignar,
  en_proceso,
  cerrados,
}: {
  comuna: string;
  nuevos: number;
  por_asignar: number;
  en_proceso: number;
  cerrados: number;
}) {
  return (
    <li className="px-4 py-3">
      <p className="font-medium">{comuna}</p>
      <dl className="mt-2 grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
        <div className="flex justify-between gap-2">
          <dt className="text-muted-foreground">Nuevos</dt>
          <dd className="font-medium tabular-nums">{nuevos}</dd>
        </div>
        <div className="flex justify-between gap-2">
          <dt className="text-muted-foreground">Por asignar</dt>
          <dd className="font-medium tabular-nums">{por_asignar}</dd>
        </div>
        <div className="flex justify-between gap-2">
          <dt className="text-muted-foreground">En proceso</dt>
          <dd className="font-medium tabular-nums">{en_proceso}</dd>
        </div>
        <div className="flex justify-between gap-2">
          <dt className="text-muted-foreground">Cerrados</dt>
          <dd className="font-medium tabular-nums">{cerrados}</dd>
        </div>
      </dl>
    </li>
  );
}

export function DashboardPage() {
  const {
    cobertura,
    vencimientos,
    discrepancias,
    error,
    cargando,
    exportando,
    cargar,
    exportarCsv,
  } = useDashboardPage();

  if (cargando && !cobertura) {
    return <p className="text-sm text-muted-foreground">Cargando tablero…</p>;
  }

  return (
    <div className="space-y-4">
      <PageHeader
        suppressTitle
        eyebrow={pageHeaders.tablero.eyebrow}
        title={pageHeaders.tablero.title}
        description={pageHeaders.tablero.description}
        actions={
          <>
            <Button type="button" variant="secondary" size="sm" onClick={() => void cargar()} disabled={cargando}>
              <RefreshCw className={cn('size-4', cargando && 'animate-spin')} />
              Actualizar
            </Button>
            <Button type="button" size="sm" onClick={() => void exportarCsv()} disabled={exportando}>
              <Download className="size-4" />
              {exportando ? 'Exportando…' : 'Exportar CSV'}
            </Button>
          </>
        }
      />

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
              {cobertura.por_comuna.length === 0 ? (
                <p className="px-4 py-6 text-center text-sm text-muted-foreground">
                  Sin reportes todavía
                </p>
              ) : (
                <>
                  <ul className="divide-y md:hidden">
                    {cobertura.por_comuna.map((c) => (
                      <TarjetaCoberturaComuna key={c.comuna} {...c} />
                    ))}
                  </ul>
                  <div className="hidden overflow-x-auto md:block">
                    <Table className="min-w-[560px]">
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
                        {cobertura.por_comuna.map((c) => (
                          <TableRow key={c.comuna}>
                            <TableCell className="font-medium">{c.comuna}</TableCell>
                            <TableCell className="text-right">{c.nuevos}</TableCell>
                            <TableCell className="text-right">{c.por_asignar}</TableCell>
                            <TableCell className="text-right">{c.en_proceso}</TableCell>
                            <TableCell className="text-right">{c.cerrados}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </>
              )}
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
