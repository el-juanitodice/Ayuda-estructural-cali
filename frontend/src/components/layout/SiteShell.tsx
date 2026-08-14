import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { HardHat, LogIn, Menu } from 'lucide-react';

import { usePublicNavItems, type NavItem } from '@/components/layout/nav-config';
import { SidebarMobileTrigger } from '@/components/layout/SidebarMobileTrigger';
import { SyncQueueBadge } from '@/components/layout/SyncQueueBadge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { getPageHeaderForPath } from '@/constants/page-headers';
import { routes } from '@/constants/routes';
import { useIsMobile } from '@/hooks/use-mobile';
import { cn } from '@/lib/utils';

function PublicNavLinks({
  items,
  onNavigate,
  className,
}: {
  items: NavItem[];
  onNavigate?: () => void;
  className?: string;
}) {
  const location = useLocation();

  return (
    <nav className={cn('flex items-center gap-1', className)}>
      {items.map((item) => {
        const activo = item.to != null && location.pathname === item.to;
        const linkClass = cn(
          'rounded-md px-3 py-2 text-sm font-medium transition-colors',
          activo
            ? 'bg-primary/10 text-primary'
            : 'text-muted-foreground hover:bg-muted hover:text-foreground',
        );

        if (item.to) {
          return (
            <Link key={item.key} to={item.to} className={linkClass} onClick={onNavigate}>
              {item.label}
            </Link>
          );
        }

        return (
          <button key={item.key} type="button" className={linkClass} onClick={item.onClick}>
            {item.label}
          </button>
        );
      })}
    </nav>
  );
}

function PublicMobileNav({
  items,
  onNavigate,
}: {
  items: NavItem[];
  onNavigate?: () => void;
}) {
  const location = useLocation();

  return (
    <nav className="flex flex-col gap-0.5">
      {items.map((item) => {
        const activo = item.to != null && location.pathname === item.to;
        const linkClass = cn(
          'flex h-10 w-full items-center rounded-md px-3 text-sm font-medium transition-colors',
          activo ? 'bg-primary/10 text-primary' : 'text-foreground hover:bg-muted',
        );

        if (item.to) {
          return (
            <Link key={item.key} to={item.to} className={linkClass} onClick={onNavigate}>
              {item.label}
            </Link>
          );
        }

        return (
          <button key={item.key} type="button" className={linkClass} onClick={item.onClick}>
            {item.label}
          </button>
        );
      })}
    </nav>
  );
}

export function SitePublicHeader() {
  const [abierto, setAbierto] = useState(false);
  const cerrar = () => setAbierto(false);
  const items = usePublicNavItems(cerrar);

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

        <div className="hidden flex-1 items-center justify-end gap-2 md:flex">
          <PublicNavLinks items={items} />
          <Button size="sm" className="ml-2 gap-2 shadow-sm" asChild>
            <Link to={routes.ingreso}>
              <LogIn className="size-4" />
              Ingresar
            </Link>
          </Button>
        </div>

        <div className="ml-auto md:hidden">
          <Sheet open={abierto} onOpenChange={setAbierto}>
            <SheetTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="size-9 border-0 shadow-none ring-0 focus-visible:ring-0"
                aria-label="Abrir menú"
              >
                <Menu className="size-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-[min(100vw-2rem,18rem)]">
              <SheetHeader className="sr-only">
                <SheetTitle>Menú de navegación</SheetTitle>
              </SheetHeader>
              <div className="flex h-full flex-col pt-2">
                <Link
                  to={routes.home}
                  className="mb-4 flex items-center gap-2 font-semibold"
                  onClick={cerrar}
                >
                  <HardHat className="size-5 text-primary" />
                  Inspección Cali
                </Link>
                <PublicMobileNav items={items} onNavigate={cerrar} />
                <div className="mt-auto border-t pt-4">
                  <Button className="w-full gap-2" asChild onClick={cerrar}>
                    <Link to={routes.ingreso}>
                      <LogIn className="size-4" />
                      Ingresar
                    </Link>
                  </Button>
                </div>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}

export function SiteStaffHeader() {
  const isMobile = useIsMobile();
  const { pathname } = useLocation();
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

      <div className="ml-auto shrink-0">
        <SyncQueueBadge />
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
