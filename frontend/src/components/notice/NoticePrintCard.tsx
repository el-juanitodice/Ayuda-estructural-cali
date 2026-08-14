import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { Printer } from 'lucide-react';
import { ETIQUETA_HABITABILIDAD } from '@shared/ais.js';
import { BANNER_HABITABILIDAD, SIGNIFICADO_HABITABILIDAD } from '@/constants/notice';
import { routes } from '@/constants/routes';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableRow,
} from '@/components/ui/table';
import { cn } from '@/lib/utils';
import type { FormularioDetalle, HabitabilidadColor } from '@/types/revision';

function formatearFecha(iso: string) {
  return new Date(iso).toLocaleString('es-CO');
}

interface NoticePrintCardProps {
  formulario: FormularioDetalle;
  qr: string | null;
  color: HabitabilidadColor;
}

function FilaDato({ etiqueta, valor }: { etiqueta: string; valor: ReactNode }) {
  return (
    <TableRow className="hover:bg-transparent">
      <TableCell className="w-[34%] border border-neutral-400 bg-muted/40 font-semibold">
        {etiqueta}
      </TableCell>
      <TableCell className="border border-neutral-400">{valor}</TableCell>
    </TableRow>
  );
}

export function NoticePrintCard({ formulario: f, qr, color }: NoticePrintCardProps) {
  return (
    <Card
      className={cn(
        'mx-auto max-w-[8.5in] rounded-none border-[6px] border-neutral-900 bg-white shadow-none',
        'px-[0.7in] py-[0.6in] print:border-[8px]',
      )}
    >
      <CardHeader className="space-y-1 p-0 text-center">
        <p className="text-xl font-extrabold tracking-tight">
          INSPECCIÓN POST-SÍSMICA DE EDIFICACIONES
        </p>
        <p className="text-sm text-muted-foreground">
          Formulario Único AIS — Emergencia sísmica, agosto de 2026
        </p>
      </CardHeader>

      <CardContent className="space-y-4 p-0 pt-4">
        <div
          className={cn(
            'rounded-xl px-2 py-6 text-center text-3xl font-black tracking-wide sm:text-4xl',
            BANNER_HABITABILIDAD[color],
          )}
        >
          {ETIQUETA_HABITABILIDAD[color].toUpperCase()}
        </div>

        <p className="text-lg font-semibold leading-snug">{SIGNIFICADO_HABITABILIDAD[color]}</p>

        <div className="border-t border-neutral-300" />

        <Table>
          <TableBody>
            <FilaDato etiqueta="Dirección" valor={f.direccion || f.reporte_direccion} />
            <FilaDato etiqueta="Radicado" valor={f.consecutivo} />
            <FilaDato etiqueta="N.º de formulario" valor={f.numero_formulario} />
            <FilaDato
              etiqueta="Fecha del dictamen"
              valor={f.firmado_en ? formatearFecha(f.firmado_en) : '—'}
            />
            <FilaDato
              etiqueta="Dictamen"
              valor={
                <>
                  Ing. {f.firmado_por_nombre ?? '—'} — Matrícula {f.firmado_por_matricula ?? '—'}{' '}
                  {f.visita_presencial_a
                    ? '(visita presencial)'
                    : '(revisión remota sobre captura de campo)'}
                </>
              }
            />
            <FilaDato
              etiqueta="Captura de campo"
              valor={
                f.capturado_por_nombre
                  ? `Ing. ${f.capturado_por_nombre} — Matrícula ${f.capturado_por_matricula ?? '—'}`
                  : '—'
              }
            />
          </TableBody>
        </Table>

        <div className="border-t border-neutral-300" />

        <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center">
          {qr && (
            <img
              className="size-[130px] shrink-0 rounded-md border border-border"
              src={qr}
              alt="QR ficha pública"
            />
          )}
          <div className="space-y-2 text-sm text-muted-foreground">
            <p>
              Escanee el código para consultar esta ficha. Verifique la matrícula profesional en{' '}
              <strong className="text-foreground">copnia.gov.co</strong>.
            </p>
            <p>
              <strong className="text-foreground">Este aviso no debe retirarse</strong> mientras la
              condición no cambie por una nueva inspección. Emergencias:{' '}
              <strong className="text-foreground">llame al 123</strong>.
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

interface NoticeToolbarProps {
  className?: string;
}

export function NoticeToolbar({ className }: NoticeToolbarProps) {
  return (
    <div className={cn('no-imprimir mb-6 text-center', className)}>
      <Button type="button" onClick={() => window.print()}>
        <Printer className="mr-2 size-4" />
        Imprimir (o guardar como PDF)
      </Button>
      <p className="mt-2 text-sm text-muted-foreground">
        Pega una copia en cada entrada y explícalo verbalmente a los ocupantes.
      </p>
      <Button variant="link" className="mt-1" asChild>
        <Link to={routes.revision}>Volver a revisión</Link>
      </Button>
    </div>
  );
}
