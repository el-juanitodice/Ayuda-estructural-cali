import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, ClipboardCheck, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import {
  ETIQUETA_HABITABILIDAD,
  HABITABILIDAD,
  NIVELES_RIESGO,
  verificarHabitabilidad,
} from '@shared/ais.js';
import { HabitabilidadBadge } from '@/components/revision/HabitabilidadBadge';
import { ReviewPhotoGallery } from '@/components/revision/ReviewPhotoGallery';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';
import { routes } from '@/constants/routes';
import { get, post } from '@/lib/api';
import type {
  ColaRevisionResponse,
  FirmarResponse,
  FormularioResponse,
  HabitabilidadColor,
  ItemColaRevision,
  NivelRiesgo,
  ReautenticarResponse,
  RiesgosDictamen,
} from '@/types/revision';

const ETIQUETA_RIESGO: Record<NivelRiesgo, string> = {
  bajo: 'Bajo',
  bajo_medidas: 'Bajo con medidas',
  alto: 'Alto',
  muy_alto: 'Muy alto',
};

const NOMBRE_RIESGO: Record<keyof RiesgosDictamen, string> = {
  estabilidad: 'Estabilidad global',
  geotecnico: 'Geotécnico',
  estructural: 'Estructural',
  no_estructural: 'No estructural',
};

function formatearFecha(iso: string) {
  return new Date(iso).toLocaleString('es-CO');
}

function DetalleRevision({
  item,
  onVolver,
  onFirmado,
}: {
  item: ItemColaRevision;
  onVolver: () => void;
  onFirmado: () => void;
}) {
  const [datos, setDatos] = useState<FormularioResponse | null>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [riesgos, setRiesgos] = useState<RiesgosDictamen>({
    estabilidad: '',
    geotecnico: '',
    estructural: '',
    no_estructural: '',
  });
  const [colorFinal, setColorFinal] = useState<HabitabilidadColor | ''>('');
  const [motivo, setMotivo] = useState('');
  const [visita, setVisita] = useState(false);
  const [clave, setClave] = useState('');
  const [pidiendoClave, setPidiendoClave] = useState(false);
  const [firmando, setFirmando] = useState(false);
  const [resultado, setResultado] = useState<FirmarResponse | null>(null);

  useEffect(() => {
    setCargando(true);
    get<FormularioResponse>(`/campo/formularios/${item.formulario_uuid}`)
      .then(setDatos)
      .catch((e) => setError(e instanceof Error ? e.message : 'No se pudo cargar'))
      .finally(() => setCargando(false));
  }, [item.formulario_uuid]);

  const chequeo = useMemo(
    () =>
      verificarHabitabilidad(
        {
          estabilidad: riesgos.estabilidad || '',
          geotecnico: riesgos.geotecnico || '',
          estructural: riesgos.estructural || '',
          no_estructural: riesgos.no_estructural || '',
        },
        colorFinal || null,
      ),
    [riesgos, colorFinal],
  );

  const discrepancia = chequeo.discrepancia === true;
  const puedeFirmar =
    !!chequeo.sugerida &&
    !!colorFinal &&
    (!discrepancia || motivo.trim().length >= 5);

  const firmar = async () => {
    setError(null);
    setFirmando(true);
    try {
      const { ticket_firma } = await post<ReautenticarResponse>('/auth/reautenticar', { clave });
      const r = await post<FirmarResponse>(`/campo/formularios/${item.formulario_uuid}/firmar`, {
        ticket_firma,
        riesgos: {
          estabilidad: riesgos.estabilidad,
          geotecnico: riesgos.geotecnico,
          estructural: riesgos.estructural,
          no_estructural: riesgos.no_estructural,
        },
        habitabilidad_final: colorFinal,
        motivo_discrepancia: discrepancia ? motivo : null,
        visita_presencial: visita,
      });
      setResultado(r);
      toast.success('Dictamen firmado', {
        description: `${item.consecutivo} — ${ETIQUETA_HABITABILIDAD[r.habitabilidad_final]}`,
      });
      onFirmado();
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'No se pudo firmar';
      setError(msg);
      toast.error('No se pudo firmar el dictamen', { description: msg });
      setPidiendoClave(false);
    } finally {
      setClave('');
      setFirmando(false);
    }
  };

  if (cargando) {
    return <p className="text-muted-foreground">Cargando captura…</p>;
  }

  if (!datos) {
    return (
      <Alert variant="destructive">
        <AlertDescription>{error ?? 'No se encontró el formulario.'}</AlertDescription>
      </Alert>
    );
  }

  const { formulario: f, danos, fotos } = datos;

  if (resultado) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Dictamen firmado</CardTitle>
          <CardDescription>{f.consecutivo}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <HabitabilidadBadge
            color={resultado.habitabilidad_final}
            etiqueta={ETIQUETA_HABITABILIDAD[resultado.habitabilidad_final]}
          />
          <p className="font-medium">{resultado.recordatorio}</p>
          <div className="flex flex-wrap gap-2">
            <Button asChild>
              <Link to={`${routes.aviso}?uuid=${item.formulario_uuid}`}>Imprimir aviso</Link>
            </Button>
            <Button variant="outline" onClick={onVolver}>
              Volver a la cola
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Button variant="ghost" size="sm" onClick={onVolver}>
        <ArrowLeft className="mr-2 h-4 w-4" />
        Cola de revisión
      </Button>

      <div>
        <h1 className="text-2xl font-semibold">
          {f.consecutivo} — {f.direccion || f.reporte_direccion}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Captura de campo: {item.capturado_por_nombre ?? '—'} (matrícula{' '}
          {item.capturado_por_matricula ?? '—'}) ·{' '}
          {f.visita_presencial_b ? 'con visita presencial' : 'sin visita presencial'} ·{' '}
          {f.capturado_en ? formatearFecha(f.capturado_en) : '—'}
        </p>
        {f.requiere_nivel_a && f.motivo_escalacion.length > 0 && (
          <Alert className="mt-3 border-amber-300 bg-amber-50 text-amber-950">
            <AlertDescription>
              Escalado: {f.motivo_escalacion.join(', ')}
            </AlertDescription>
          </Alert>
        )}
      </div>

      <Collapsible defaultOpen>
        <Card>
          <CardHeader className="pb-3">
            <CollapsibleTrigger asChild>
              <button type="button" className="text-left">
                <CardTitle className="text-lg">Captura (solo lectura)</CardTitle>
              </button>
            </CollapsibleTrigger>
          </CardHeader>
          <CollapsibleContent>
            <CardContent className="space-y-4">
              <ul className="list-inside list-disc space-y-1 text-sm">
                <li>
                  Sistema estructural: código {f.sistema_estructural ?? '—'} · pisos:{' '}
                  {f.pisos_sobre_terreno ?? '—'} · época: {f.anio_construccion ?? '—'}
                </li>
                <li>
                  Colapso: {f.colapso ?? '—'} · inclinación: {f.inclinacion ?? '—'} · asentamiento:{' '}
                  {f.asentamiento ?? '—'} · talud: {f.falla_talud ?? '—'}
                </li>
                <li>
                  % daño global: {f.porcentaje_dano ?? '—'} · piso con mayor daño:{' '}
                  {f.piso_mayor_dano ?? '—'}
                </li>
                <li>Comentarios de B: {f.comentarios ?? '—'}</li>
              </ul>

              {danos.length > 0 && (
                <div className="overflow-x-auto rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Elemento</TableHead>
                        <TableHead>ning.</TableHead>
                        <TableHead>leve</TableHead>
                        <TableHead>mod.</TableHead>
                        <TableHead>fuerte</TableHead>
                        <TableHead>severo</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {danos.map((d) => (
                        <TableRow key={`${d.grupo}-${d.elemento}`}>
                          <TableCell>{d.elemento.replace(/_/g, ' ')}</TableCell>
                          <TableCell>{d.pct_ninguno}</TableCell>
                          <TableCell>{d.pct_leve}</TableCell>
                          <TableCell>{d.pct_moderado}</TableCell>
                          <TableCell>{d.pct_fuerte}</TableCell>
                          <TableCell>{d.pct_severo}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Fotos ({fotos.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <ReviewPhotoGallery fotos={fotos} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Dictamen — niveles de riesgo</CardTitle>
          <CardDescription>
            El sistema calcula la habitabilidad sugerida en vivo. Si eliges otro color, debes
            justificarlo.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2">
            {(Object.keys(NOMBRE_RIESGO) as (keyof RiesgosDictamen)[]).map((k) => (
              <div key={k} className="space-y-2">
                <Label>{NOMBRE_RIESGO[k]}</Label>
                <Select
                  value={riesgos[k] || undefined}
                  onValueChange={(v) => setRiesgos({ ...riesgos, [k]: v as NivelRiesgo })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="— asignar —" />
                  </SelectTrigger>
                  <SelectContent>
                    {NIVELES_RIESGO.map((n) => (
                      <SelectItem key={n} value={n}>
                        {ETIQUETA_RIESGO[n as NivelRiesgo]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ))}
          </div>

          {chequeo.sugerida && (
            <p className="text-sm">
              Según los riesgos marcados corresponde:{' '}
              <HabitabilidadBadge
                color={chequeo.sugerida as HabitabilidadColor}
                etiqueta={ETIQUETA_HABITABILIDAD[chequeo.sugerida as HabitabilidadColor]}
                className="ml-1 align-middle"
              />
            </p>
          )}

          <div className="space-y-2">
            <Label>Habitabilidad final (tu criterio profesional)</Label>
            <Select
              value={colorFinal || undefined}
              onValueChange={(v) => setColorFinal(v as HabitabilidadColor)}
            >
              <SelectTrigger>
                <SelectValue placeholder="— elegir —" />
              </SelectTrigger>
              <SelectContent>
                {HABITABILIDAD.map((c) => (
                  <SelectItem key={c} value={c}>
                    {ETIQUETA_HABITABILIDAD[c as HabitabilidadColor]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {discrepancia && (
            <div className="space-y-2">
              <Alert variant="destructive">
                <AlertDescription>{chequeo.mensaje}</AlertDescription>
              </Alert>
              <Label htmlFor="motivo">Motivo de la discrepancia (obligatorio)</Label>
              <Textarea
                id="motivo"
                rows={3}
                value={motivo}
                onChange={(e) => setMotivo(e.target.value)}
              />
            </div>
          )}

          <div className="flex items-start gap-2">
            <Checkbox
              id="visita"
              checked={visita}
              onCheckedChange={(v) => setVisita(v === true)}
            />
            <div className="space-y-1">
              <Label htmlFor="visita">¿Hiciste visita presencial?</Label>
              <p className="text-xs text-muted-foreground">
                Si cierras sin visitar queda registrado como revisión remota sobre captura de B.
              </p>
            </div>
          </div>

          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {!pidiendoClave ? (
            <Button disabled={!puedeFirmar} onClick={() => setPidiendoClave(true)}>
              <ClipboardCheck className="mr-2 h-4 w-4" />
              Firmar dictamen…
            </Button>
          ) : (
            <Card className="border-primary/30 bg-muted/30">
              <CardContent className="space-y-4 pt-6">
                <p className="font-medium">Confirma tu identidad para firmar</p>
                <div className="space-y-2">
                  <Label htmlFor="clave">Contraseña</Label>
                  <Input
                    id="clave"
                    type="password"
                    value={clave}
                    onChange={(e) => setClave(e.target.value)}
                    autoComplete="current-password"
                  />
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button disabled={!clave || firmando} onClick={firmar}>
                    Firmar{' '}
                    {colorFinal
                      ? ETIQUETA_HABITABILIDAD[colorFinal as HabitabilidadColor]
                      : ''}
                  </Button>
                  <Button variant="outline" onClick={() => setPidiendoClave(false)}>
                    Cancelar
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export function ReviewPage() {
  const [cola, setCola] = useState<ItemColaRevision[] | null>(null);
  const [abierto, setAbierto] = useState<ItemColaRevision | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [cargando, setCargando] = useState(true);

  const cargar = useCallback(() => {
    setCargando(true);
    setError(null);
    get<ColaRevisionResponse>('/campo/revision')
      .then((r) => {
        setCola(r.pendientes);
        setAbierto(null);
      })
      .catch((e) => setError(e instanceof Error ? e.message : 'No se pudo cargar la cola'))
      .finally(() => setCargando(false));
  }, []);

  useEffect(() => {
    cargar();
  }, [cargar]);

  if (abierto) {
    return (
      <DetalleRevision
        item={abierto}
        onVolver={() => setAbierto(null)}
        onFirmado={() => setCola((prev) => prev?.filter((i) => i.formulario_uuid !== abierto.formulario_uuid) ?? [])}
      />
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Revisión nivel A</h1>
          <p className="text-sm text-muted-foreground">
            Capturas cerradas por ingeniero B pendientes de dictamen y firma.
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

      {cargando && !cola ? (
        <p className="text-muted-foreground">Cargando cola…</p>
      ) : !cola?.length ? (
        <Card>
          <CardContent className="py-10 text-center text-muted-foreground">
            No hay capturas pendientes de revisión.
          </CardContent>
        </Card>
      ) : (
        <div className="overflow-x-auto rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Radicado</TableHead>
                <TableHead>Dirección</TableHead>
                <TableHead>Comuna</TableHead>
                <TableHead>Capturado por</TableHead>
                <TableHead>Fecha captura</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {cola.map((item) => (
                <TableRow key={item.formulario_uuid}>
                  <TableCell className="font-medium">{item.consecutivo}</TableCell>
                  <TableCell>
                    {item.direccion}
                    {item.barrio ? ` · ${item.barrio}` : ''}
                  </TableCell>
                  <TableCell>{item.comuna ?? '—'}</TableCell>
                  <TableCell>{item.capturado_por_nombre ?? '—'}</TableCell>
                  <TableCell>{formatearFecha(item.capturado_en)}</TableCell>
                  <TableCell className="text-right">
                    <Button size="sm" onClick={() => setAbierto(item)}>
                      Revisar
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
