import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ArrowLeft } from 'lucide-react';
import { SISTEMAS_ESTRUCTURALES, elementosEstructurales } from '@shared/ais.js';
import { DamageMatrix } from '@/components/campo/DamageMatrix';
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
import { get, post } from '@/lib/api';
import type {
  AsignacionCampo,
  FormularioCampoPayload,
  GuardarFormularioResponse,
} from '@/types/campo';
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
  const [mensaje, setMensaje] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);
  const debounceRef = useRef<number | null>(null);

  useEffect(() => {
    const cargar = async () => {
      setCargando(true);
      setError(null);
      try {
        if (asignacion.formulario_uuid) {
          const r = await get<FormularioResponse>(`/campo/formularios/${asignacion.formulario_uuid}`);
          const f = r.formulario;
          setForm({
            uuid: f.uuid,
            reporte_uuid: f.reporte_uuid,
            estado: f.estado as 'borrador' | 'capturado',
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
          });
        } else {
          setForm(formularioVacio(asignacion, crypto.randomUUID()));
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : 'No se pudo cargar el formulario');
      } finally {
        setCargando(false);
      }
    };
    cargar();
  }, [asignacion]);

  const guardar = useCallback(
    async (payload: FormularioCampoPayload, silencioso = false) => {
      if (payload.estado === 'capturado') return;
      if (!silencioso) setGuardando(true);
      try {
        await post<GuardarFormularioResponse>('/campo/formularios', payload);
        if (!silencioso) setMensaje('Borrador guardado.');
      } catch (e) {
        if (!silencioso) setError(e instanceof Error ? e.message : 'No se pudo guardar');
      } finally {
        if (!silencioso) setGuardando(false);
      }
    },
    [],
  );

  const programarGuardado = useCallback(
    (payload: FormularioCampoPayload) => {
      if (payload.estado === 'capturado') return;
      if (debounceRef.current) window.clearTimeout(debounceRef.current);
      debounceRef.current = window.setTimeout(() => {
        guardar(payload, true).catch(() => {});
      }, 800);
    },
    [guardar],
  );

  const actualizar = (parcial: Partial<FormularioCampoPayload>) => {
    setForm((prev) => {
      if (!prev) return prev;
      let next = { ...prev, ...parcial };
      if (parcial.sistema_estructural !== undefined && parcial.sistema_estructural !== prev.sistema_estructural) {
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
      await post<GuardarFormularioResponse>('/campo/formularios', {
        ...form,
        estado: 'capturado',
      });
      setMensaje('Captura cerrada. Pasa a revisión de nivel A.');
      onCerrado();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo cerrar la captura');
    } finally {
      setGuardando(false);
    }
  };

  if (cargando || !form) {
    return <p className="text-muted-foreground">Cargando formulario…</p>;
  }

  const cerrado = form.estado === 'capturado';

  return (
    <div className="space-y-6">
      <Button variant="ghost" size="sm" onClick={onVolver}>
        <ArrowLeft className="mr-2 h-4 w-4" />
        Mis asignaciones
      </Button>

      <div>
        <h1 className="text-2xl font-semibold">
          {asignacion.consecutivo} — {asignacion.direccion}
        </h1>
        {asignacion.descripcion && (
          <p className="mt-1 text-sm text-muted-foreground">
            Reporte ciudadano: “{asignacion.descripcion}”
          </p>
        )}
        {cerrado && (
          <Alert className="mt-3">
            <AlertDescription>Captura cerrada — ya no se puede editar aquí.</AlertDescription>
          </Alert>
        )}
      </div>

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
            disabled={cerrado}
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
              disabled={cerrado}
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
              disabled={cerrado}
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
              disabled={cerrado}
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
                disabled={cerrado}
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
            soloLectura={cerrado}
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
              disabled={cerrado}
              value={form.piso_mayor_dano}
              onChange={(e) => actualizar({ piso_mayor_dano: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label>% daño global</Label>
            <Select
              disabled={cerrado}
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
              disabled={cerrado}
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
      {mensaje && (
        <Alert>
          <AlertDescription>{mensaje}</AlertDescription>
        </Alert>
      )}

      {!cerrado && (
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" disabled={guardando} onClick={() => guardar(form)}>
            Guardar borrador
          </Button>
          <Button disabled={!matrizValida || guardando} onClick={cerrarCaptura}>
            Cerrar captura → revisión A
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
