import { Phone } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface Emergency123DialogProps {
  open: boolean;
  onContinuar: () => void;
  reporteGuardado?: { consecutivo: string } | null;
}

export function Emergency123Dialog({ open, onContinuar, reporteGuardado }: Emergency123DialogProps) {
  return (
    <Dialog open={open} onOpenChange={() => {}}>
      <DialogContent
        showClose={false}
        className="border-destructive sm:max-w-md"
        onPointerDownOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle className="text-destructive">
            Esto es una emergencia con riesgo inmediato para la vida
          </DialogTitle>
          <DialogDescription asChild>
            <div className="space-y-3 pt-2 text-left text-foreground">
              {reporteGuardado && (
                <p className="rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm">
                  Tu reporte quedó guardado con radicado{' '}
                  <strong className="font-mono">{reporteGuardado.consecutivo}</strong>. Aun así debes
                  llamar al 123 si hay riesgo inmediato.
                </p>
              )}
              <p>
                Esta plataforma <strong>no atiende emergencias</strong>. Los organismos de rescate sí.
              </p>
            </div>
          </DialogDescription>
        </DialogHeader>

        <Button variant="destructive" size="lg" className="w-full text-base" asChild>
          <a href="tel:123">
            <Phone className="size-5" />
            LLAMA AL 123 AHORA
          </a>
        </Button>

        <DialogFooter className="sm:justify-stretch">
          <Button type="button" variant="secondary" className="w-full" onClick={onContinuar}>
            Ya llamé al 123 — continuar con el reporte
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
