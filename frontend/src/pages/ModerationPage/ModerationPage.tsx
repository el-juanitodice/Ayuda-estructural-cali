import { ArrowLeft, Phone, RefreshCw, ShieldAlert, Trash2 } from 'lucide-react';
import { PageHeader } from '@/components/common/PageHeader';
import { DesktopTable, MobileDataList } from '@/components/common/ResponsiveTable';
import { ReviewPhotoGallery } from '@/components/revision/ReviewPhotoGallery';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';
import { pageHeaders } from '@/constants/page-headers';
import {
  puedeAsignarModeracion,
  useModerationPage,
} from '@/pages/ModerationPage/hooks/useModerationPage';
import { useModerationDetalle } from '@/pages/ModerationPage/hooks/useModerationDetalle';
import type { ReporteCola } from '@/types/moderation';

const ETIQUETA_ESTADO: Record<string, string> = {
  validado: 'Validado',
  descartado: 'Descartado',
  asignado: 'Asignado',
  en_captura: 'En captura',
  en_revision_a: 'En revisión A',
  requiere_especialista: 'Especialista',
  vencido: 'Vencido',
  cerrado: 'Cerrado',
};

function formatearFecha(iso: string) {
  return new Date(iso).toLocaleString('es-CO');
}

function EliminarReporteDialog({
  reporte,
  open,
  eliminando,
  onOpenChange,
  onConfirmar,
}: {
  reporte: ReporteCola | null;
  open: boolean;
  eliminando: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirmar: () => void;
}) {
  if (!reporte) return null;

  const radicado = reporte.consecutivo ?? reporte.uuid;
  const estado = ETIQUETA_ESTADO[reporte.estado] ?? reporte.estado;
  const avisoEstado = reporte.estado !== 'nuevo' && reporte.estado !== 'descartado';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent showClose={!eliminando}>
        <DialogHeader>
          <DialogTitle>¿Eliminar {radicado}?</DialogTitle>
          <DialogDescription asChild>
            <div className="space-y-3 pt-1 text-left text-sm text-muted-foreground">
              {avisoEstado && (
                <p className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 font-medium text-destructive">
                  Atención: el reporte está en estado «{estado}».
                </p>
              )}
              <p>Esta acción es permanente y no se puede deshacer.</p>
              <div>
                <p className="font-medium text-foreground">También se borrará en cascada:</p>
                <ul className="mt-2 list-disc space-y-1 pl-5">
                  <li>Asignaciones al reporte</li>
                  <li>Formularios AIS y dictámenes</li>
                  <li>Fotos en base de datos y archivos en disco</li>
                </ul>
              </div>
            </div>
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="secondary" disabled={eliminando} onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button variant="destructive" disabled={eliminando} onClick={onConfirmar}>
            {eliminando ? 'Eliminando…' : 'Eliminar reporte'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function DetalleReporte({
  reporte,
  onVolver,
  onActualizado,
}: {
  reporte: ReporteCola;
  onVolver: () => void;
  onActualizado: () => void;
}) {
  const {
    asignacionDirecta,
    notas,
    setNotas,
    ingenieroId,
    setIngenieroId,
    resultado,
    fotos,
    error,
    cargando,
    requiereA,
    elegibles,
    soloLectura,
    validar,
    descartar,
    asignar,
  } = useModerationDetalle(reporte, onActualizado);

  return (
    <div className="space-y-4">
      <Button variant="ghost" size="sm" className="w-fit" onClick={onVolver}>
        <ArrowLeft className="size-4" />
        Volver a la cola
      </Button>

      <PageHeader
        eyebrow={pageHeaders.moderacion.eyebrow}
        title={`${reporte.consecutivo} — ${reporte.direccion}`}
        description={
          <span className="flex flex-wrap items-center gap-2">
            <Badge variant="secondary">{ETIQUETA_ESTADO[reporte.estado] ?? reporte.estado}</Badge>
            {reporte.menciona_colapso && (
              <span className="font-semibold text-destructive">
                <ShieldAlert className="mr-1 inline size-4" />
                Posible emergencia
              </span>
            )}
          </span>
        }
      />

      <Card>
        <CardContent className="space-y-4 pt-6">
        <p>
          <strong>Llamar a:</strong> {reporte.reportante_nombre} —{' '}
          <a href={`tel:${reporte.reportante_telefono}`} className="text-primary underline-offset-4 hover:underline">
            <Phone className="mr-1 inline size-4" />
            {reporte.reportante_telefono}
          </a>{' '}
          ({reporte.reportante_relacion || 'sin relación declarada'})
        </p>
        <ul className="list-disc space-y-1 pl-5 text-sm">
          <li>
            {reporte.barrio || 'Barrio sin declarar'} · {reporte.tipo_edificacion || '—'} ·{' '}
            {reporte.pisos_declarados ?? '?'} pisos · {reporte.unidades_declaradas ?? '?'} unidades ·{' '}
            {reporte.habitada ? 'habitada' : 'no habitada / sin dato'}
          </li>
          <li>Reportes del mismo predio: {reporte.reportes_del_predio}</li>
          <li>Recibido: {formatearFecha(reporte.creado_en)}</li>
          <li>Descripción: {reporte.descripcion || '—'}</li>
          {reporte.motivo_descarte && <li>Motivo descarte: {reporte.motivo_descarte}</li>}
        </ul>

        <div className="space-y-2 rounded-lg border bg-muted/30 p-4">
          <p className="text-sm font-medium">Fotos del reportante ({fotos.length})</p>
          <ReviewPhotoGallery
            fotos={fotos}
            mostrarOrigen
            vacio="El reportante no adjuntó fotos (o aún se están subiendo)."
          />
        </div>

        {soloLectura ? (
          <p className="text-sm text-muted-foreground">
            Este reporte ya no está en cola. Solo puedes consultarlo o eliminarlo desde la tabla si
            aplica.
          </p>
        ) : !resultado ? (
          <>
            <div className="space-y-2">
              <Label htmlFor="notas">Notas de la llamada (obligatorio)</Label>
              <Textarea
                id="notas"
                rows={3}
                value={notas}
                onChange={(e) => setNotas(e.target.value)}
                placeholder="Confirmado con la propietaria. Edificio de 5 pisos…"
              />
            </div>
            <div className="flex flex-wrap gap-2">
              <Button onClick={validar} disabled={cargando || notas.length < 5}>
                Validar
              </Button>
              <Button variant="secondary" disabled={cargando} onClick={() => descartar('duplicado')}>
                Duplicado
              </Button>
              <Button variant="secondary" disabled={cargando} onClick={() => descartar('no_contesta')}>
                No contesta
              </Button>
              <Button variant="secondary" disabled={cargando} onClick={() => descartar('fuera_de_zona')}>
                Fuera de zona
              </Button>
              <Button variant="secondary" disabled={cargando} onClick={() => descartar('spam')}>
                Spam
              </Button>
            </div>
          </>
        ) : (
          <div className="space-y-4 rounded-lg border border-green-200 bg-green-50 p-4">
            <p className="font-medium text-green-800">
              {asignacionDirecta
                ? 'Pendiente de asignación.'
                : 'Validado. Ya aparece como punto gris en el mapa público.'}
            </p>
            {requiereA && (
              <p className="text-sm font-medium text-destructive">
                Escalado a nivel A ({resultado.motivos.join(', ')}). Solo ingenieros nivel A en la lista.
              </p>
            )}
            <div className="space-y-2">
              <Label htmlFor="ingeniero">Asignar ingeniero</Label>
              <select
                id="ingeniero"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={ingenieroId}
                onChange={(e) => setIngenieroId(e.target.value)}
              >
                <option value="">— elegir —</option>
                {elegibles.map((i) => (
                  <option key={i.id} value={i.id}>
                    {i.nombre} ({i.rol === 'ingeniero_a' ? 'A' : 'B'}) — {i.carga_actual} activas
                  </option>
                ))}
              </select>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button onClick={asignar} disabled={cargando || !ingenieroId}>
                Asignar
              </Button>
              <Button variant="secondary" onClick={onActualizado}>
                Asignar después
              </Button>
            </div>
          </div>
        )}

        {error && <p className="text-sm font-medium text-destructive">{error}</p>}
      </CardContent>
    </Card>
    </div>
  );
}

function SenalesReporte({ reporte, atenuada }: { reporte: ReporteCola; atenuada: boolean }) {
  if (atenuada) {
    return (
      <Badge variant="outline" className="font-normal">
        {ETIQUETA_ESTADO[reporte.estado] ?? reporte.estado}
      </Badge>
    );
  }

  return (
    <div className="flex flex-wrap gap-1">
      {reporte.menciona_colapso && (
        <Badge variant="destructive" className="text-xs">
          Colapso
        </Badge>
      )}
      {reporte.reportes_del_predio > 1 && (
        <Badge variant="secondary" className="text-xs">
          {reporte.reportes_del_predio} predio
        </Badge>
      )}
      {!reporte.menciona_colapso && reporte.reportes_del_predio <= 1 && (
        <span className="text-xs">En cola</span>
      )}
    </div>
  );
}

function BotonEliminarReporte({
  eliminando,
  onEliminar,
}: {
  eliminando: boolean;
  onEliminar: () => void;
}) {
  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      className="size-8 shrink-0 text-destructive hover:bg-destructive/10 hover:text-destructive"
      disabled={eliminando}
      title="Eliminar reporte y datos relacionados"
      onClick={(e) => {
        e.stopPropagation();
        onEliminar();
      }}
    >
      <Trash2 className="size-4" />
    </Button>
  );
}

function TarjetaReporteModeracion({
  reporte,
  atenuada,
  eliminando,
  onAbrir,
  onEliminar,
}: {
  reporte: ReporteCola;
  atenuada: boolean;
  eliminando: boolean;
  onAbrir: () => void;
  onEliminar: () => void;
}) {
  const clickable = !atenuada || puedeAsignarModeracion(reporte);

  return (
    <li
      className={`${atenuada ? 'text-muted-foreground opacity-70' : ''}${clickable ? ' cursor-pointer active:bg-muted/40' : ''}`}
      onClick={clickable ? onAbrir : undefined}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1 space-y-1">
          <p className="font-mono font-medium">{reporte.consecutivo ?? '—'}</p>
          <p className={atenuada ? 'text-sm' : 'text-sm font-medium'}>{reporte.direccion}</p>
          <p className="text-xs">{reporte.barrio || 'Sin barrio'}</p>
          <p className="text-xs text-muted-foreground">
            {formatearFecha(atenuada ? reporte.actualizado_en : reporte.creado_en)}
          </p>
        </div>
        <BotonEliminarReporte eliminando={eliminando} onEliminar={onEliminar} />
      </div>
      <div className="mt-2">
        <SenalesReporte reporte={reporte} atenuada={atenuada} />
      </div>
    </li>
  );
}

function FilaReporte({
  reporte,
  atenuada,
  eliminando,
  onAbrir,
  onEliminar,
}: {
  reporte: ReporteCola;
  atenuada: boolean;
  eliminando: boolean;
  onAbrir: () => void;
  onEliminar: () => void;
}) {
  const clickable = !atenuada || puedeAsignarModeracion(reporte);

  return (
    <TableRow
      className={
        atenuada
          ? `text-muted-foreground opacity-70 hover:opacity-100${clickable ? ' cursor-pointer' : ''}`
          : 'cursor-pointer'
      }
      onClick={clickable ? onAbrir : undefined}
    >
      <TableCell className="font-mono font-medium">{reporte.consecutivo ?? '—'}</TableCell>
      <TableCell>
        <div className={atenuada ? '' : 'font-medium'}>{reporte.direccion}</div>
        <div className="text-xs">{reporte.barrio || 'Sin barrio'}</div>
      </TableCell>
      <TableCell>
        <SenalesReporte reporte={reporte} atenuada={atenuada} />
      </TableCell>
      <TableCell className="whitespace-nowrap text-xs">
        {formatearFecha(atenuada ? reporte.actualizado_en : reporte.creado_en)}
      </TableCell>
      <TableCell className="text-right">
        <BotonEliminarReporte eliminando={eliminando} onEliminar={onEliminar} />
      </TableCell>
    </TableRow>
  );
}

export function ModerationPage() {
  const {
    enCola,
    historial,
    seleccionado,
    setSeleccionado,
    error,
    cargando,
    eliminandoUuid,
    reporteAEliminar,
    setReporteAEliminar,
    cargarCola,
    confirmarEliminacion,
    abrirReporte,
  } = useModerationPage();

  if (seleccionado) {
    return (
      <DetalleReporte
        reporte={seleccionado}
        onVolver={() => setSeleccionado(null)}
        onActualizado={() => void cargarCola()}
      />
    );
  }

  const vacio = enCola.length === 0 && historial.length === 0;

  return (
    <div className="space-y-6">
      <PageHeader
        suppressTitle
        eyebrow={pageHeaders.moderacion.eyebrow}
        title={pageHeaders.moderacion.title}
        description={pageHeaders.moderacion.description}
        actions={
          <Button variant="outline" size="sm" onClick={() => void cargarCola()} disabled={cargando}>
            <RefreshCw className={`mr-2 h-4 w-4 ${cargando ? 'animate-spin' : ''}`} />
            Actualizar
          </Button>
        }
      />

      {error && <p className="text-sm font-medium text-destructive">{error}</p>}

      {cargando ? (
        <p className="text-muted-foreground">Cargando cola…</p>
      ) : vacio ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            No hay reportes en moderación.
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="px-6 py-4">
            <MobileDataList inset>
              {enCola.map((r) => (
                <TarjetaReporteModeracion
                  key={r.uuid}
                  reporte={r}
                  atenuada={false}
                  eliminando={eliminandoUuid === r.uuid}
                  onAbrir={() => abrirReporte(r)}
                  onEliminar={() => setReporteAEliminar(r)}
                />
              ))}
              {historial.length > 0 && enCola.length > 0 && (
                <li className="bg-muted/40 py-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Fuera de cola ({historial.length})
                </li>
              )}
              {historial.map((r) => (
                <TarjetaReporteModeracion
                  key={r.uuid}
                  reporte={r}
                  atenuada
                  eliminando={eliminandoUuid === r.uuid}
                  onAbrir={() => abrirReporte(r)}
                  onEliminar={() => setReporteAEliminar(r)}
                />
              ))}
            </MobileDataList>

            <DesktopTable>
            <Table className="min-w-[720px]">
              <TableHeader>
                <TableRow>
                  <TableHead>Radicado</TableHead>
                  <TableHead>Dirección</TableHead>
                  <TableHead>Señales</TableHead>
                  <TableHead>Fecha</TableHead>
                  <TableHead className="w-12 text-right" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {enCola.map((r) => (
                  <FilaReporte
                    key={r.uuid}
                    reporte={r}
                    atenuada={false}
                    eliminando={eliminandoUuid === r.uuid}
                    onAbrir={() => abrirReporte(r)}
                    onEliminar={() => setReporteAEliminar(r)}
                  />
                ))}
                {historial.length > 0 && enCola.length > 0 && (
                  <TableRow>
                    <TableCell
                      colSpan={5}
                      className="bg-muted/40 py-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground"
                    >
                      Fuera de cola ({historial.length})
                    </TableCell>
                  </TableRow>
                )}
                {historial.map((r) => (
                  <FilaReporte
                    key={r.uuid}
                    reporte={r}
                    atenuada
                    eliminando={eliminandoUuid === r.uuid}
                    onAbrir={() => abrirReporte(r)}
                    onEliminar={() => setReporteAEliminar(r)}
                  />
                ))}
              </TableBody>
            </Table>
            </DesktopTable>
          </CardContent>
        </Card>
      )}

      <EliminarReporteDialog
        reporte={reporteAEliminar}
        open={reporteAEliminar !== null}
        eliminando={eliminandoUuid === reporteAEliminar?.uuid}
        onOpenChange={(open) => {
          if (!open && !eliminandoUuid) setReporteAEliminar(null);
        }}
        onConfirmar={() => void confirmarEliminacion()}
      />
    </div>
  );
}
