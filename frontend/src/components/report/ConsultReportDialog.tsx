import { useCallback, useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { Search } from 'lucide-react';
import { USOS } from '@shared/ais.js';
import { HabitabilidadBadge } from '@/components/report/HabitabilidadBadge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { get } from '@/lib/api';
import type { EstadoReporteResponse } from '@/types/report';
import { PATRON_RADICADO, PLACEHOLDER_RADICADO } from '@/types/report';

interface ConsultaForm {
  radicado: string;
}

interface ConsultReportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  radicadoInicial?: string;
}

function formatearFecha(iso: string): string {
  return new Date(iso).toLocaleString('es-CO');
}

function etiquetaTipo(tipo: string | null) {
  const map: Record<string, string> = {
    casa: 'Casa',
    edificio: 'Edificio',
    local: 'Local',
    otro: 'Otro',
  };
  return tipo ? (map[tipo] ?? tipo) : '—';
}

function Detalle({ label, value }: { label: string; value: string | null | undefined }) {
  if (!value) return null;
  return (
    <div className="grid gap-0.5 text-sm">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}

export function ConsultReportDialog({ open, onOpenChange, radicadoInicial = '' }: ConsultReportDialogProps) {
  const [resultado, setResultado] = useState<EstadoReporteResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [consultando, setConsultando] = useState(false);

  const form = useForm<ConsultaForm>({
    defaultValues: { radicado: radicadoInicial },
  });

  const consultarRadicado = useCallback(async (consecutivo: string) => {
    setError(null);
    setConsultando(true);
    try {
      const r = await get<EstadoReporteResponse>(
        `/reportes/${consecutivo.trim().toUpperCase()}/estado`,
      );
      setResultado(r);
    } catch (e) {
      setResultado(null);
      setError(e instanceof Error ? e.message : 'No se pudo consultar el radicado');
    } finally {
      setConsultando(false);
    }
  }, []);

  useEffect(() => {
    if (!open) {
      setResultado(null);
      setError(null);
      return;
    }
    form.reset({ radicado: radicadoInicial });
    if (radicadoInicial && PATRON_RADICADO.test(radicadoInicial)) {
      void consultarRadicado(radicadoInicial);
    }
  }, [open, radicadoInicial, form, consultarRadicado]);

  const onSubmit = async (datos: ConsultaForm) => {
    await consultarRadicado(datos.radicado);
  };

  const usoLabel =
    resultado?.uso_declarado != null
      ? (USOS[resultado.uso_declarado as keyof typeof USOS] ?? String(resultado.uso_declarado))
      : null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[90vh] max-w-2xl flex-col gap-0 overflow-hidden p-0">
        <DialogHeader className="space-y-1 border-b px-6 py-4">
          <DialogTitle className="flex items-center gap-2 text-lg">
            <Search className="size-5" />
            Consultar reporte
          </DialogTitle>
          <DialogDescription>Ingresa el número de radicado que recibiste al reportar.</DialogDescription>
        </DialogHeader>

        <div className="overflow-y-auto px-6 py-4">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="flex gap-2" noValidate>
              <FormField
                control={form.control}
                name="radicado"
                rules={{
                  required: 'El radicado es obligatorio',
                  pattern: {
                    value: PATRON_RADICADO,
                    message: `Formato: ${PLACEHOLDER_RADICADO}`,
                  },
                }}
                render={({ field }) => (
                  <FormItem className="min-w-0 flex-1 space-y-1">
                    <FormLabel className="sr-only">Número de radicado</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        autoComplete="off"
                        spellCheck={false}
                        placeholder={PLACEHOLDER_RADICADO}
                        className="h-9 font-mono uppercase tracking-wide"
                        onChange={(e) => field.onChange(e.target.value.toUpperCase())}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button type="submit" size="sm" className="h-9 shrink-0" disabled={consultando}>
                {consultando ? '…' : 'Consultar'}
              </Button>
            </form>
          </Form>

          {error && <p className="mt-3 text-sm font-medium text-destructive">{error}</p>}

          {resultado && (
            <div className="mt-4 space-y-4 border-t pt-4">
              <div>
                <p className="font-mono text-2xl font-bold tracking-wide">{resultado.consecutivo}</p>
                <p className="mt-2 text-sm">{resultado.descripcion}</p>
              </div>

              {resultado.color && <HabitabilidadBadge color={resultado.color} />}

              <section className="space-y-3 rounded-lg border bg-muted/20 p-3">
                <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Datos del reporte
                </h3>
                <dl className="grid gap-3 sm:grid-cols-2">
                  <Detalle label="Dirección" value={resultado.direccion} />
                  <Detalle label="Barrio" value={resultado.barrio} />
                  <Detalle label="Comuna" value={resultado.comuna} />
                  <Detalle label="Tipo" value={etiquetaTipo(resultado.tipo_edificacion)} />
                  <Detalle label="Uso principal" value={usoLabel} />
                  <Detalle
                    label="Pisos / unidades"
                    value={
                      resultado.pisos_declarados != null
                        ? `${resultado.pisos_declarados} pisos · ${resultado.unidades_declaradas ?? '—'} unidades`
                        : null
                    }
                  />
                  <Detalle
                    label="Habitada"
                    value={
                      resultado.habitada == null ? null : resultado.habitada ? 'Sí' : 'No'
                    }
                  />
                </dl>
                {resultado.descripcion_reporte && (
                  <div className="text-sm">
                    <p className="text-xs text-muted-foreground">Descripción del daño</p>
                    <p className="mt-1 whitespace-pre-wrap">{resultado.descripcion_reporte}</p>
                  </div>
                )}
              </section>

              <section className="space-y-2">
                <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Historial
                </h3>
                <ul className="space-y-1 text-sm">
                  <li>Recibido: {formatearFecha(resultado.creado_en)}</li>
                  {resultado.validado_en && <li>Validado: {formatearFecha(resultado.validado_en)}</li>}
                  {resultado.firmado_en && (
                    <li>Dictamen firmado: {formatearFecha(resultado.firmado_en)}</li>
                  )}
                </ul>
              </section>

              {resultado.color && (
                <p className="text-xs text-muted-foreground">
                  El ingeniero deja un aviso físico del color en la entrada de la edificación. Si
                  tienes dudas, pregunta al ingeniero o al punto de atención de tu comuna.
                </p>
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
