import { AlertTriangle } from 'lucide-react';
import { ReportPhotoPicker } from '@/components/report/ReportPhotoPicker';
import { cn } from '@/lib/utils';
import { fieldClass } from '@/components/report/report-form.constants';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { FormControl, FormField, FormItem, FormLabel } from '@/components/ui/form';
import { Textarea } from '@/components/ui/textarea';
import type { UseFormReturn } from 'react-hook-form';
import type { ReporteForm } from '@/components/report/report-form.types';

interface ReportSituationPanelProps {
  form: UseFormReturn<ReporteForm>;
  fotos: File[];
  onFotosChange: (fotos: File[]) => void;
  enviando: boolean;
}

export function ReportSituationPanel({ form, fotos, onFotosChange, enviando }: ReportSituationPanelProps) {
  return (
    <Card className="flex min-h-0 flex-col lg:h-full">
      <CardHeader className="space-y-2 border-b pb-3">
        <CardTitle className="text-base">Situación</CardTitle>
        <Alert variant="warning" className="py-2">
          <AlertTriangle className="size-4" />
          <AlertDescription className="text-xs">
            Si hay personas atrapadas, colapso, incendio u olor a gas,{' '}
            <a href="tel:123" className="font-semibold underline">
              llama al 123
            </a>{' '}
            antes de continuar.
          </AlertDescription>
        </Alert>
      </CardHeader>

      <CardContent className="flex flex-1 flex-col gap-3 pt-4">
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
            <FormItem className={cn('flex min-h-0 flex-1 flex-col', fieldClass)}>
              <FormLabel className="text-xs">¿Qué daño ves?</FormLabel>
              <FormControl>
                <Textarea
                  maxLength={4000}
                  placeholder="Grietas en columnas, inclinación visible, daño en losas…"
                  className="min-h-[140px] flex-1 resize-none text-sm lg:min-h-[180px]"
                  {...field}
                />
              </FormControl>
            </FormItem>
          )}
        />

        <ReportPhotoPicker fotos={fotos} onChange={onFotosChange} disabled={enviando} />
      </CardContent>
    </Card>
  );
}
