import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ArrowLeft, WifiOff } from 'lucide-react';
import { toast } from '@/lib/toast';
import { SISTEMAS_ESTRUCTURALES, elementosEstructurales } from '@shared/ais.js';
import { DamageMatrix } from '@/components/campo/DamageMatrix';
import { PageHeader } from '@/components/common/PageHeader';
import { ReviewPhotoGallery } from '@/components/revision/ReviewPhotoGallery';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { pageHeaders } from '@/constants/page-headers';
import { campoService } from '@/api/campo/campo.service';
import {
  cacheFormularioServidor,
  cargarLocal,
  formularioDeReporte,
  guardarLocal,
  payloadDesdeLocal,
  sincronizarCampo,
} from '@/lib/campo/sync';
import type { AsignacionCampo, FormularioCampoPayload } from '@/types/campo';
import type { DanoAis, FotoResumen, FormularioResponse } from '@/types/revision';

function filasIniciales(sistema: number): DanoAis[] {
  return elementosEstructurales(sistema).map((elemento) => ({
    grupo: ['vigas', 'columnas', 'nudos', 'conexiones', 'muros_portantes', 'entrepisos'].includes(
      elemento,
    )
      ? 'estructural'
      : 'no_estructural',
    elemento,
    pct_ninguno: 100,
    pct_leve: 0,
    pct_moderado: 0,
    pct_fuerte: 0,
    pct_severo: 0,
  }));
}

function formularioVacio(asignacion: AsignacionCampo, uuid: string): FormularioCampoPayload {
  const sistema = 21;
  return {
    uuid,
    reporte_uuid: asignacion.reporte_uuid,
    estado: 'borrador',
    visita_presencial_b: false,
    sistema_estructural: sistema,
    colapso: 'ninguno',
    inclinacion: 'ninguna',
    asentamiento: 'ninguno',
    falla_talud: 'ninguno',
    pisos_sobre_terreno: asignacion.pisos_declarados,
    anio_construccion: 2,
    piso_mayor_dano: '',
    porcentaje_dano: 'ninguno',
    comentarios: '',
    danos: filasIniciales(sistema),
  };
}

function mapFormularioFromApi(r: FormularioResponse): FormularioCampoPayload {
  const f = r.formulario;
  return {
    uuid: f.uuid,
    reporte_uuid: f.reporte_uuid,
    estado: f.estado as 'borrador' | 'capturado' | 'firmado',
    visita_presencial_b: Boolean(f.visita_presencial_b),
    sistema_estructural: f.sistema_estructural ?? 21,
    colapso: f.colapso ?? 'ninguno',
    inclinacion: f.inclinacion ?? 'ninguna',
    asentamiento: f.asentamiento ?? 'ninguno',
    falla_talud: f.falla_talud ?? 'ninguno',
    pisos_sobre_terreno: f.pisos_sobre_terreno,
    anio_construccion: f.anio_construccion ?? 2,
    piso_mayor_dano: f.piso_mayor_dano ?? '',
    porcentaje_dano: f.porcentaje_dano ?? 'ninguno',
    comentarios: f.comentarios ?? '',
    danos: r.danos.length ? r.danos : filasIniciales(f.sistema_estructural ?? 21),
  };
}

export function FieldCaptureForm({
  asignacion,
  fotos,
  onVolver,
  onCerrado,
}: {
  asignacion: AsignacionCampo;
  fotos: FotoResumen[];
  onVolver: () => void;
  onCerrado: () => void;
}) {
  const [form, setForm] = useState<FormularioCampoPayload | null>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);
  const [sinConexion, setSinConexion] = useState(
    typeof navigator !== 'undefined' && !navigator.onLine,
  );
  const [pendienteSync, setPendienteSync] = useState(false);
  const debounceRef = useRef<number | null>(null);

  useEffect(() => {
    const actualizarRed = () => setSinConexion(!navigator.onLine);
    window.addEventListener('online', actualizarRed);
    window.addEventListener('offline', actualizarRed);
    return () => {
      window.removeEventListener('online', actualizarRed);
      window.removeEventListener('offline', actualizarRed);
    };
  }, []);

  useEffect(() => {
    const cargar = async () => {
      setCargando(true);
      setError(null);
      try {
        const local = await formularioDeReporte(asignacion.reporte_uuid);

        if (navigator.onLine && asignacion.formulario_uuid) {
          try {
            const r = await campoService.obtenerFormulario(asignacion.formulario_uuid);
            const desdeServidor = mapFormularioFromApi(r);
            if (local?.pendiente === 1) {
              setForm(payloadDesdeLocal(local));
              setPendienteSync(true);
            } else {
              setForm(desdeServidor);
              await cacheFormularioServidor(desdeServidor);
              setPendienteSync(false);
            }
            return;
          } catch {
            // continuar con copia local si existe
          }
        }

        if (local) {
          setForm(payloadDesdeLocal(local));
          setPendienteSync(local.pendiente === 1);
          return;
        }

        if (navigator.onLine && asignacion.formulario_uuid) {
          const r = await campoService.obtenerFormulario(asignacion.formulario_uuid);
          const desdeServidor = mapFormularioFromApi(r);
          setForm(desdeServidor);
          await cacheFormularioServidor(desdeServidor);
          setPendienteSync(false);
          return;
        }

        const uuid = asignacion.formulario_uuid ?? crypto.randomUUID();
        setForm(formularioVacio(asignacion, uuid));
        setPendienteSync(false);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'No se pudo cargar el formulario');
      } finally {
        setCargando(false);
      }
    };
    cargar();
  }, [asignacion]);

  const persistir = useCallback(
    async (payload: FormularioCampoPayload, silencioso = false) => {
      if (!asignacion.editable) return;
      if (payload.estado === 'firmado') return;
      if (!silencioso) setGuardando(true);
      try {
        await guardarLocal(payload);
        await sincronizarCampo();
        const cached = await cargarLocal(payload.uuid);
        const quedaPendiente = cached?.pendiente === 1;
        setPendienteSync(quedaPendiente);
        if (!silencioso) {
          if (quedaPendiente) {
            toast.info('Guardado en el dispositivo', {
              description: 'Se sincronizará cuando haya señal.',
            });
          } else {
            toast.success(
              payload.estado === 'capturado' ? 'Captura actualizada' : 'Borrador guardado',
            );
          }
        }
      } catch (e) {
        const msg = e instanceof Error ? e.message : 'No se pudo guardar';
        if (!silencioso) {
          setError(msg);
          toast.error('No se pudo guardar', { description: msg });
        }
      } finally {
        if (!silencioso) setGuardando(false);
      }
    },
    [asignacion.editable],
  );

  const programarGuardado = useCallback(
    (payload: FormularioCampoPayload) => {
      if (!asignacion.editable || payload.estado === 'firmado') return;
      if (debounceRef.current) window.clearTimeout(debounceRef.current);
      debounceRef.current = window.setTimeout(() => {
        void guardarLocal(payload).then(async () => {
          const cached = await cargarLocal(payload.uuid);
          setPendienteSync(cached?.pendiente === 1);
        });
      }, 800);
    },
    [asignacion.editable],
  );

  const actualizar = (parcial: Partial<FormularioCampoPayload>) => {
    if (!asignacion.editable) return;
    setForm((prev) => {
      if (!prev) return prev;
      let next = { ...prev, ...parcial };
      if (
        parcial.sistema_estructural !== undefined &&
        parcial.sistema_estructural !== prev.sistema_estructural
      ) {
        next = { ...next, danos: filasIniciales(parcial.sistema_estructural) };
      }
      programarGuardado(next);
      return next;
    });
  };

  const matrizValida = useMemo(() => {
    if (!form) return false;
    return form.danos.every(
      (d) => d.pct_ninguno + d.pct_leve + d.pct_moderado + d.pct_fuerte + d.pct_severo === 100,
    );
  }, [form]);

  const cerrarCaptura = async () => {
    if (!form) return;
    setError(null);
    setGuardando(true);
    try {
      const next = { ...form, estado: 'capturado' as const };
      setForm(next);
      await guardarLocal(next);
      await sincronizarCampo();
      const cached = await cargarLocal(next.uuid);
      const quedaPendiente = cached?.pendiente === 1;
      setPendienteSync(quedaPendiente);
      if (quedaPendiente) {
        toast.info('Captura guardada en el dispositivo', {
          description: 'Se enviará a revisión cuando haya señal.',
        });
      } else {
        toast.success('Captura enviada a revisión', {
          description: `${asignacion.consecutivo} — un ingeniero nivel A firmará el dictamen.`,
        });
      }
      onCerrado();
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'No se pudo cerrar la captura';
      setError(msg);
      toast.error('No se pudo enviar a revisión', { description: msg });
    } finally {
      setGuardando(false);
    }
  };

  if (cargando || !form) {
    return <p className="text-muted-foreground">Cargando formulario…</p>;
  }

  const soloLectura = !asignacion.editable || form.estado === 'firmado';
  const capturaEnRevision = form.estado === 'capturado' && asignacion.editable;
  const puedeCerrarCaptura = asignacion.editable && form.estado === 'borrador';

  return (
    <div className="space-y-6">
      <Button variant="ghost" size="sm" onClick={onVolver}>
        <ArrowLeft className="mr-2 h-4 w-4" />
        Mis asignaciones
      </Button>

      <PageHeader
        eyebrow={pageHeaders.campo.eyebrow}
        title={`${asignacion.consecutivo} — ${asignacion.direccion}`}
        description={
          asignacion.descripcion
            ? `Reporte ciudadano: “${asignacion.descripcion}”`
            : 'Completa la captura de campo para este predio.'
        }
      />

      {(sinConexion || pendienteSync) && asignacion.editable && (
        <Alert className="border-amber-300 bg-amber-50 text-amber-950">
          <WifiOff className="size-4" />
          <AlertDescription>
            {sinConexion
              ? 'Sin conexión — los cambios se guardan en este dispositivo y se suben al reconectar.'
              : 'Hay cambios pendientes de sincronizar con el servidor.'}
          </AlertDescription>
        </Alert>
      )}
      {form.estado === 'firmado' && (
        <Alert>
          <AlertDescription>
            Dictamen firmado — captura de solo lectura. Consulta el aviso desde Revisión.
          </AlertDescription>
        </Alert>
      )}
      {capturaEnRevision && (
        <Alert className="border-amber-300 bg-amber-50 text-amber-950">
          <AlertDescription>
            En revisión nivel A. Puedes corregir la captura mientras no haya dictamen firmado.
          </AlertDescription>
        </Alert>
      )}
      {soloLectura && form.estado === 'capturado' && !capturaEnRevision && (
        <Alert>
          <AlertDescription>Captura cerrada — solo lectura.</AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Fotos del reportante ({fotos.length})</CardTitle>
          <CardDescription>
            Enviadas por el ciudadano al reportar. Tócalas para ampliar antes de la visita.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ReviewPhotoGallery
            fotos={fotos}
            mostrarOrigen
            vacio="Sin fotos del reportante en este caso."
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Visita</CardTitle>
        </CardHeader>
        <CardContent className="flex items-center gap-2">
          <Checkbox
            id="visita"
            checked={form.visita_presencial_b}
            disabled={soloLectura}
            onCheckedChange={(v) => actualizar({ visita_presencial_b: v === true })}
          />
          <Label htmlFor="visita">Visita presencial</Label>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Edificación</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label>Pisos sobre terreno</Label>
            <Input
              type="number"
              min={1}
              disabled={soloLectura}
              value={form.pisos_sobre_terreno ?? ''}
              onChange={(e) =>
                actualizar({
                  pisos_sobre_terreno: e.target.value ? Number(e.target.value) : null,
                })
              }
            />
          </div>
          <div className="space-y-2">
            <Label>Sistema estructural</Label>
            <Select
              disabled={soloLectura}
              value={String(form.sistema_estructural)}
              onValueChange={(v) => actualizar({ sistema_estructural: Number(v) })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(SISTEMAS_ESTRUCTURALES).map(([k, v]) => (
                  <SelectItem key={k} value={k}>
                    {v}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Época de construcción</Label>
            <Select
              disabled={soloLectura}
              value={String(form.anio_construccion)}
              onValueChange={(v) => actualizar({ anio_construccion: Number(v) })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1">Antes de 1984</SelectItem>
                <SelectItem value="2">1984 – 1997</SelectItem>
                <SelectItem value="3">1998 – 2010</SelectItem>
                <SelectItem value="4">Después de 2010</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Estabilidad observada</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          {(
            [
              ['colapso', 'Colapso', ['ninguno', 'parcial_menor_50', 'parcial_mayor_50', 'total']],
              ['inclinacion', 'Inclinación', ['ninguna', 'dudas', 'evidente']],
              ['asentamiento', 'Asentamiento', ['ninguno', 'dudas', 'evidente']],
              ['falla_talud', 'Falla de talud', ['ninguno', 'puntual', 'general']],
            ] as const
          ).map(([campo, etiqueta, opciones]) => (
            <div key={campo} className="space-y-2">
              <Label>{etiqueta}</Label>
              <Select
                disabled={soloLectura}
                value={form[campo]}
                onValueChange={(v) => actualizar({ [campo]: v } as Partial<FormularioCampoPayload>)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {opciones.map((o) => (
                    <SelectItem key={o} value={o}>
                      {o.replace(/_/g, ' ')}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Matriz de daños</CardTitle>
          <CardDescription>Cada fila debe sumar 100%.</CardDescription>
        </CardHeader>
        <CardContent>
          <DamageMatrix
            filas={form.danos}
            soloLectura={soloLectura}
            onChange={(danos) => actualizar({ danos })}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Resumen de daño</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label>Piso con mayor daño</Label>
            <Input
              disabled={soloLectura}
              value={form.piso_mayor_dano}
              onChange={(e) => actualizar({ piso_mayor_dano: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label>% daño global</Label>
            <Select
              disabled={soloLectura}
              value={form.porcentaje_dano}
              onValueChange={(v) => actualizar({ porcentaje_dano: v })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {['ninguno', '0_10', '10_30', '30_60', '60_100', '100'].map((o) => (
                  <SelectItem key={o} value={o}>
                    {o.replace(/_/g, '–')}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label>Comentarios de campo</Label>
            <Textarea
              rows={4}
              disabled={soloLectura}
              value={form.comentarios}
              onChange={(e) => actualizar({ comentarios: e.target.value })}
            />
          </div>
        </CardContent>
      </Card>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {puedeCerrarCaptura && (
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" disabled={guardando} onClick={() => persistir(form)}>
            Guardar borrador
          </Button>
          <Button disabled={!matrizValida || guardando} onClick={cerrarCaptura}>
            Cerrar captura → revisión A
          </Button>
        </div>
      )}
      {capturaEnRevision && form && (
        <div className="flex flex-wrap gap-2">
          <Button disabled={!matrizValida || guardando} onClick={() => persistir(form)}>
            Guardar cambios
          </Button>
        </div>
      )}
      <p className="text-xs text-muted-foreground">
        Cerrar la captura no asigna riesgos ni color: eso lo hace y lo firma el ingeniero nivel A en
        Revisión.
      </p>
    </div>
  );
}
