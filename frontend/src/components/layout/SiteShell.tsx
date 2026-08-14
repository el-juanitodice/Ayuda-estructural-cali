import { Link, useLocation } from 'react-router-dom';
import { HardHat, LogIn, Megaphone, Search } from 'lucide-react';

import { SidebarMobileTrigger } from '@/components/layout/SidebarMobileTrigger';
import { StaffHeaderUser } from '@/components/layout/StaffHeaderUser';
import { SyncQueueBadge } from '@/components/layout/SyncQueueBadge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { getPageHeaderForPath } from '@/constants/page-headers';
import { routes } from '@/constants/routes';
import { useConsultReport } from '@/contexts/ConsultReportContext';
import { useIsMobile } from '@/hooks/use-mobile';

export function SitePublicHeader() {
  return (
    <header className="site-public-header sticky top-0 z-40 shrink-0 border-b border-border/60 bg-background/85 backdrop-blur-md print:hidden">
      <div className="mx-auto flex h-14 w-full max-w-[1400px] items-center gap-4 px-4 sm:px-6">
        <Link
          to={routes.home}
          className="flex min-w-0 items-center gap-2.5 font-semibold tracking-tight text-foreground"
        >
          <span className="flex size-8 items-center justify-center rounded-md bg-primary/10 text-primary ring-1 ring-primary/15">
            <HardHat className="size-4 shrink-0" />
          </span>
          <span className="truncate leading-tight">
            Inspección
            <span className="block text-xs font-medium text-muted-foreground">Cali</span>
          </span>
        </Link>

        <div className="ml-auto">
          <Button size="sm" className="gap-2 shadow-sm" asChild>
            <Link to={routes.ingreso}>
              <LogIn className="size-4" />
              Ingresar
            </Link>
          </Button>
        </div>
      </div>
    </header>
  );
}

export function SiteStaffHeader() {
  const isMobile = useIsMobile();
  const { pathname } = useLocation();
  const { abrirConsulta } = useConsultReport();
  const meta = getPageHeaderForPath(pathname);

  return (
    <header className="site-staff-header sticky top-0 z-30 flex h-16 shrink-0 items-center gap-3 border-b border-border/60 bg-background/85 px-4 backdrop-blur-md print:hidden sm:px-6">
      {isMobile && (
        <>
          <SidebarMobileTrigger className="-ml-1" aria-label="Abrir menú" />
          <Separator orientation="vertical" className="h-4" />
        </>
      )}

      {meta ? (
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            {meta.eyebrow}
          </p>
          <p className="truncate font-serif text-base font-semibold tracking-tight text-foreground sm:text-lg">
            {meta.title}
          </p>
        </div>
      ) : (
        <div className="min-w-0 flex-1" />
      )}

      <div className="ml-auto flex shrink-0 items-center gap-2 sm:gap-3">
        <Button asChild size="sm" className="gap-2 shadow-sm">
          <Link to={routes.reportar}>
            <Megaphone className="size-4" />
            <span className="hidden sm:inline">Reportar daños</span>
            <span className="sr-only sm:hidden">Reportar daños</span>
          </Link>
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="gap-2 bg-card/80"
          onClick={() => abrirConsulta()}
        >
          <Search className="size-4" />
          <span className="hidden sm:inline">Consultar radicado</span>
          <span className="sr-only sm:hidden">Consultar radicado</span>
        </Button>
        <SyncQueueBadge />
        <StaffHeaderUser />
      </div>
    </header>
  );
}

/** @deprecated Usar SitePublicHeader o SiteStaffHeader */
export const SiteAppHeader = SiteStaffHeader;

export function SiteFooter() {
  return (
    <footer className="site-footer border-t bg-card/70 px-4 py-5 text-center text-sm text-muted-foreground backdrop-blur-sm print:hidden sm:px-6">
      <Separator className="mb-4 opacity-60" />
      <p>
        Emergencias con riesgo para la vida:{' '}
        <a href="tel:123" className="font-semibold text-destructive underline-offset-4 hover:underline">
          llama al 123
        </a>
        . Esta plataforma no atiende emergencias.
      </p>
      <p className="mx-auto mt-2 max-w-2xl leading-relaxed">
        Los dictámenes los emiten y firman ingenieros con matrícula verificada, nunca el sistema.
      </p>
    </footer>
  );
}
