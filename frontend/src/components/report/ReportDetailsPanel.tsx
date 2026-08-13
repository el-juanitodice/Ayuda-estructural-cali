import { AlertTriangle, MapPin } from 'lucide-react';
import { USOS } from '@shared/ais.js';
import {
  fieldClass,
  RELACIONES,
  TIPOS_EDIFICACION,
} from '@/components/report/report-form.constants';
import type { ReporteForm } from '@/components/report/report-form.types';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { FormControl, FormField, FormItem, FormLabel } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { formatearPrecisionGps } from '@/lib/reporte';
import type { UseFormReturn } from 'react-hook-form';

interface GpsCoords {
  lat: number;
  lng: number;
  precision: number;
}

interface ReportDetailsPanelProps {
  form: UseFormReturn<ReporteForm>;
  gps: GpsCoords | null;
  onPedirGps: () => void;
  error: string | null;
  enviando: boolean;
}

export function ReportDetailsPanel({ form, gps, onPedirGps, error, enviando }: ReportDetailsPanelProps) {
  return (
    <Card className="flex min-h-0 flex-col lg:h-full">
      <CardHeader className="border-b pb-3">
        <CardTitle className="text-base">Datos de contacto e inmueble</CardTitle>
      </CardHeader>

      <CardContent className="flex flex-1 flex-col gap-4 pt-4">
        <section className="space-y-3">
          <p className="text-xs font-medium text-muted-foreground">Tus datos — para que te llamen</p>
          <div className="grid gap-2 sm:grid-cols-2">
            <FormField
              control={form.control}
              name="reportante_nombre"
              rules={{ required: true }}
              render={({ field }) => (
                <FormItem className={fieldClass}>
                  <FormLabel className="text-xs">Nombre</FormLabel>
                  <FormControl>
                    <Input required minLength={3} className="h-9" {...field} />
                  </FormControl>
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="reportante_telefono"
              rules={{ required: true }}
              render={({ field }) => (
                <FormItem className={fieldClass}>
                  <FormLabel className="text-xs">Teléfono</FormLabel>
                  <FormControl>
                    <Input type="tel" required minLength={7} className="h-9" {...field} />
                  </FormControl>
                </FormItem>
              )}
            />
          </div>
          <FormField
            control={form.control}
            name="reportante_relacion"
            render={({ field }) => (
              <FormItem className={fieldClass}>
                <FormLabel className="text-xs">Relación con el predio</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger className="h-9">
                      <SelectValue placeholder="Selecciona relación" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {RELACIONES.map((r) => (
                      <SelectItem key={r.value} value={r.value}>
                        {r.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FormItem>
            )}
          />
        </section>

        <section className="space-y-3 border-t pt-4">
          <p className="text-xs font-medium text-muted-foreground">
            Detalles del inmueble — dirección y GPS obligatorios
          </p>

          <div className="grid gap-2 sm:grid-cols-[1fr_auto]">
            <FormField
              control={form.control}
              name="direccion"
              rules={{ required: true }}
              render={({ field }) => (
                <FormItem className={fieldClass}>
                  <FormLabel className="text-xs">Dirección del predio</FormLabel>
                  <FormControl>
                    <Input
                      required
                      minLength={5}
                      placeholder="Carrera 23 # 15-19"
                      className="h-9"
                      {...field}
                    />
                  </FormControl>
                </FormItem>
              )}
            />
            <div className="flex flex-col justify-end">
              <Button type="button" variant="secondary" size="sm" className="h-9" onClick={onPedirGps}>
                <MapPin className="size-4" />
                {gps ? formatearPrecisionGps(gps.precision) : 'GPS'}
              </Button>
            </div>
          </div>

          <FormField
            control={form.control}
            name="barrio"
            render={({ field }) => (
              <FormItem className={fieldClass}>
                <FormLabel className="text-xs">Barrio</FormLabel>
                <FormControl>
                  <Input className="h-9" {...field} />
                </FormControl>
              </FormItem>
            )}
          />

          <div className="grid gap-2 sm:grid-cols-2">
            <FormField
              control={form.control}
              name="tipo_edificacion"
              render={({ field }) => (
                <FormItem className={fieldClass}>
                  <FormLabel className="text-xs">Tipo</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger className="h-9">
                        <SelectValue placeholder="Tipo" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {TIPOS_EDIFICACION.map((t) => (
                        <SelectItem key={t.value} value={t.value}>
                          {t.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="uso_declarado"
              render={({ field }) => (
                <FormItem className={fieldClass}>
                  <FormLabel className="text-xs">Uso principal</FormLabel>
                  <Select onValueChange={(v) => field.onChange(Number(v))} value={String(field.value)}>
                    <FormControl>
                      <SelectTrigger className="h-9">
                        <SelectValue placeholder="Uso" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {Object.entries(USOS).map(([k, v]) => (
                        <SelectItem key={k} value={k}>
                          {v}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </FormItem>
              )}
            />
          </div>

          <div className="grid gap-2 sm:grid-cols-3">
            <FormField
              control={form.control}
              name="pisos_declarados"
              render={({ field }) => (
                <FormItem className={fieldClass}>
                  <FormLabel className="text-xs">Pisos</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      min={1}
                      max={120}
                      className="h-9"
                      {...field}
                      onChange={(e) => field.onChange(Number(e.target.value))}
                    />
                  </FormControl>
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="unidades_declaradas"
              render={({ field }) => (
                <FormItem className={fieldClass}>
                  <FormLabel className="text-xs">Unidades</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      min={1}
                      className="h-9"
                      {...field}
                      onChange={(e) => field.onChange(Number(e.target.value))}
                    />
                  </FormControl>
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="habitada"
              render={({ field }) => (
                <FormItem className="flex flex-row items-end space-x-2 space-y-0 pb-2">
                  <FormControl>
                    <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                  </FormControl>
                  <FormLabel className="text-sm font-normal">Habitada</FormLabel>
                </FormItem>
              )}
            />
          </div>
        </section>

        <div className="mt-auto space-y-3 border-t pt-4">
          {error && (
            <Alert variant="destructive">
              <AlertTriangle className="size-4" />
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          <Button type="submit" disabled={enviando} className="w-full">
            {enviando ? 'Enviando…' : 'Enviar reporte'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
