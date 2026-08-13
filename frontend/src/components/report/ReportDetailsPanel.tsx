import { AlertTriangle } from 'lucide-react';
import { USOS } from '@shared/ais.js';
import {
  fieldClass,
  TIPOS_EDIFICACION,
} from '@/components/report/report-form.constants';
import type { ReporteForm } from '@/components/report/report-form.types';
import { ReportLocationPicker } from '@/components/report/ReportLocationPicker';
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
import type { UbicacionReporte } from '@/lib/reporte';
import { MAX_DIRECCION_REPORTE } from '@/lib/geocoding';
import type { UseFormReturn } from 'react-hook-form';

interface ReportDetailsPanelProps {
  form: UseFormReturn<ReporteForm>;
  ubicacion: UbicacionReporte | null;
  onUbicacionChange: (ubicacion: UbicacionReporte) => void;
  onUbicacionError?: (mensaje: string | null) => void;
  error: string | null;
  enviando: boolean;
}

export function ReportDetailsPanel({
  form,
  ubicacion,
  onUbicacionChange,
  onUbicacionError,
  error,
  enviando,
}: ReportDetailsPanelProps) {
  return (
    <Card className="flex h-full min-h-0 flex-col">
      <CardHeader className="border-b pb-3">
        <CardTitle className="text-base">Datos del inmueble</CardTitle>
      </CardHeader>

      <CardContent className="flex flex-1 flex-col gap-4 pt-4">
        <section className="min-h-0 flex-1 space-y-3">
          <p className="text-xs font-medium text-muted-foreground">
            Detalles del inmueble — dirección y ubicación obligatorias
          </p>

          <div className="grid gap-2 sm:grid-cols-2">
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
                      maxLength={MAX_DIRECCION_REPORTE}
                      placeholder="Carrera 23 # 15-19, San Fernando, Cali…"
                      className="h-9"
                      {...field}
                    />
                  </FormControl>
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="barrio"
              render={({ field }) => (
                <FormItem className={fieldClass}>
                  <FormLabel className="text-xs">Barrio</FormLabel>
                  <FormControl>
                    <Input className="h-9" placeholder="San Fernando" {...field} />
                  </FormControl>
                </FormItem>
              )}
            />
          </div>

          <ReportLocationPicker
            ubicacion={ubicacion}
            onUbicacionChange={onUbicacionChange}
            onDireccionDetectada={({ direccion, barrio }) => {
              form.setValue('direccion', direccion, { shouldDirty: true, shouldValidate: true });
              form.setValue('barrio', barrio ?? '', { shouldDirty: true });
            }}
            onError={onUbicacionError}
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

        <div className="mt-auto shrink-0 space-y-3 border-t pt-4">
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
