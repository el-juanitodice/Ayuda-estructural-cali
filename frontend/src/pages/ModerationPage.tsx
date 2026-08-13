import { useCallback, useEffect, useState } from 'react';
import { ArrowLeft, Phone, ShieldAlert } from 'lucide-react';
import { ReviewPhotoGallery } from '@/components/revision/ReviewPhotoGallery';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { get, post } from '@/lib/api';
import type {
  ColaModeracionResponse,
  IngenieroDisponible,
  MotivoDescarte,
  ReporteCola,
  ValidarResponse,
} from '@/types/moderation';
import type { FotoResumen } from '@/types/revision';

function formatearFecha(iso: string) {
  return new Date(iso).toLocaleString('es-CO');
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
  const [notas, setNotas] = useState('');
  const [ingenieros, setIngenieros] = useState<IngenieroDisponible[]>([]);
  const [ingenieroId, setIngenieroId] = useState('');
  const [resultado, setResultado] = useState<ValidarResponse | null>(null);
  const [fotos, setFotos] = useState<FotoResumen[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [cargando, setCargando] = useState(false);

  useEffect(() => {
    get<{ fotos: FotoResumen[] }>(`/fotos/reporte/${reporte.uuid}`)
      .then((r) => setFotos(r.fotos))
      .catch(() => setFotos([]));
  }, [reporte.uuid]);

  useEffect(() => {
    get<{ ingenieros: IngenieroDisponible[] }>('/moderacion/ingenieros')
      .then((r) => setIngenieros(r.ingenieros))
      .catch(() => {});
  }, []);

  const validar = async () => {
    setError(null);
    setCargando(true);
    try {
      const r = await post<ValidarResponse>(`/moderacion/${reporte.uuid}/validar`, {
        notas_llamada: notas,
      });
      setResultado(r);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo validar');
    } finally {
      setCargando(false);
    }
  };

  const descartar = async (motivo: MotivoDescarte) => {
    setError(null);
    setCargando(true);
    try {
      await post(`/moderacion/${reporte.uuid}/descartar`, { motivo });
      onActualizado();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo descartar');
    } finally {
      setCargando(false);
    }
  };

  const asignar = async () => {
    setError(null);
    setCargando(true);
    try {
      await post(`/moderacion/${reporte.uuid}/asignar`, {
        ingeniero_id: Number(ingenieroId),
      });
      onActualizado();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo asignar');
    } finally {
      setCargando(false);
    }
  };

  const requiereA = resultado?.requiere_nivel_a;
  const elegibles = requiereA ? ingenieros.filter((i) => i.rol === 'ingeniero_a') : ingenieros;

  return (
    <Card>
      <CardHeader>
        <Button variant="ghost" size="sm" className="mb-2 w-fit" onClick={onVolver}>
          <ArrowLeft className="size-4" />
          Volver a la cola
        </Button>
        <CardTitle>
          {reporte.consecutivo} — {reporte.direccion}
        </CardTitle>
        {reporte.menciona_colapso && (
          <CardDescription className="font-semibold text-destructive">
            <ShieldAlert className="mr-1 inline size-4" />
            Marcado como posible emergencia
          </CardDescription>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
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
        </ul>

        <div className="space-y-2 rounded-lg border bg-muted/30 p-4">
          <p className="text-sm font-medium">Fotos del reportante ({fotos.length})</p>
          <ReviewPhotoGallery
            fotos={fotos}
            mostrarOrigen
            vacio="El reportante no adjuntó fotos (o aún se están subiendo)."
          />
        </div>

        {!resultado ? (
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
              Validado. Ya aparece como punto gris en el mapa público.
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
  );
}

export function ModerationPage() {
  const [cola, setCola] = useState<ReporteCola[]>([]);
  const [seleccionado, setSeleccionado] = useState<ReporteCola | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [cargando, setCargando] = useState(true);

  const cargarCola = useCallback(async () => {
    setCargando(true);
    setError(null);
    try {
      const r = await get<ColaModeracionResponse>('/moderacion/cola');
      setCola(r.reportes);
      setSeleccionado(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo cargar la cola');
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    void cargarCola();
  }, [cargarCola]);

  if (seleccionado) {
    return (
      <DetalleReporte
        reporte={seleccionado}
        onVolver={() => setSeleccionado(null)}
        onActualizado={() => void cargarCola()}
      />
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold">Moderación</h1>
          <p className="text-sm text-muted-foreground">
            Cola ordenada por señales objetivas — valida tras llamar al reportante.
          </p>
        </div>
        <Button variant="secondary" size="sm" onClick={() => void cargarCola()} disabled={cargando}>
          Actualizar
        </Button>
      </div>

      {error && <p className="text-sm font-medium text-destructive">{error}</p>}

      {cargando ? (
        <p className="text-muted-foreground">Cargando cola…</p>
      ) : cola.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            No hay reportes nuevos en la cola.
          </CardContent>
        </Card>
      ) : (
        <ul className="space-y-2">
          {cola.map((r) => (
            <li key={r.uuid}>
              <button
                type="button"
                className="w-full rounded-lg border bg-card p-4 text-left transition-colors hover:bg-muted/50"
                onClick={() => setSeleccionado(r)}
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="font-semibold">{r.consecutivo}</p>
                    <p className="text-sm">{r.direccion}</p>
                    <p className="text-sm text-muted-foreground">
                      {r.barrio || 'Sin barrio'} · {formatearFecha(r.creado_en)}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2 text-xs">
                    {r.menciona_colapso && (
                      <span className="rounded bg-destructive/10 px-2 py-1 text-destructive">Colapso</span>
                    )}
                    {r.reportes_del_predio > 1 && (
                      <span className="rounded bg-muted px-2 py-1">{r.reportes_del_predio} reportes predio</span>
                    )}
                  </div>
                </div>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
