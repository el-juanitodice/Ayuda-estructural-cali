import { AlertTriangle } from 'lucide-react';
import { ReportPhotoPicker } from '@/components/report/ReportPhotoPicker';
import { fieldClass, RELACIONES } from '@/components/report/report-form.constants';
import type { ReporteForm } from '@/components/report/report-form.types';
import { Alert, AlertDescription } from '@/components/ui/alert';
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
import { Textarea } from '@/components/ui/textarea';
import type { UseFormReturn } from 'react-hook-form';

interface ReportSituationPanelProps {
  form: UseFormReturn<ReporteForm>;
  fotos: File[];
  onFotosChange: (fotos: File[]) => void;
  enviando: boolean;
}

export function ReportSituationPanel({ form, fotos, onFotosChange, enviando }: ReportSituationPanelProps) {
  return (
    <Card className="flex h-full min-h-0 flex-col shadow-sm ring-1 ring-border/50">
      <CardHeader className="border-b bg-muted/20 pb-3">
        <CardTitle className="font-serif text-lg">Situación</CardTitle>
      </CardHeader>

      <CardContent className="flex flex-1 flex-col gap-4 pt-4">
        <Alert variant="warning" className="items-center py-2.5">
          <AlertTriangle className="size-4 shrink-0" />
          <AlertDescription className="text-xs leading-snug">
            Si hay personas atrapadas, colapso, incendio u olor a gas,{' '}
            <a href="tel:123" className="font-semibold underline">
              llama al 123
            </a>{' '}
            antes de continuar.
          </AlertDescription>
        </Alert>

        <div className="flex flex-wrap gap-x-4 gap-y-2 rounded-lg border px-3 py-2">
          <FormField
            control={form.control}
            name="personasAtrapadas"
            render={({ field }) => (
              <FormItem className="flex flex-row items-center space-x-2 space-y-0">
                <FormControl>
                  <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                </FormControl>
                <FormLabel className="text-sm font-normal">Personas atrapadas</FormLabel>
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="colapsoEnCurso"
            render={({ field }) => (
              <FormItem className="flex flex-row items-center space-x-2 space-y-0">
                <FormControl>
                  <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                </FormControl>
                <FormLabel className="text-sm font-normal">Colapso en curso</FormLabel>
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="descripcion"
          render={({ field }) => (
            <FormItem className={fieldClass}>
              <FormLabel className="text-xs">¿Qué daño ves?</FormLabel>
              <FormControl>
                <Textarea
                  rows={4}
                  maxLength={4000}
                  placeholder="Grietas en columnas, inclinación visible, daño en losas…"
                  className="resize-y text-sm"
                  {...field}
                />
              </FormControl>
            </FormItem>
          )}
        />

        <ReportPhotoPicker
          fotos={fotos}
          onChange={onFotosChange}
          disabled={enviando}
          className="lg:flex-1"
        />

        <section className="shrink-0 space-y-3 border-t pt-4">
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
      </CardContent>
    </Card>
  );
}
