import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { HardHat, LogIn, LogOut, Menu } from 'lucide-react';
import { SyncQueueBadge } from '@/components/layout/SyncQueueBadge';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { useAuth } from '@/contexts/AuthContext';
import { useConsultReport } from '@/contexts/ConsultReportContext';
import { routes } from '@/constants/routes';
import { cn } from '@/lib/utils';
import type { Rol } from '@/types/auth';

const ETIQUETA_ROL: Record<Rol, string> = {
  admin: 'Administrador',
  coordinador: 'Coordinador',
  moderador: 'Moderador',
  ingeniero_a: 'Ingeniero nivel A',
  ingeniero_b: 'Ingeniero nivel B',
};

function tieneRol(rol: Rol, permitidos: Rol[]) {
  return permitidos.includes(rol);
}

interface NavItem {
  key: string;
  label: string;
  to?: string;
  onClick?: () => void;
}

function usePublicNavItems(onAfterAction?: () => void): NavItem[] {
  const { abrirConsulta } = useConsultReport();

  const cerrar = () => onAfterAction?.();

  return [
    { key: 'reportar', label: 'Reportar', to: routes.reportar },
    {
      key: 'consultar',
      label: 'Consultar radicado',
      onClick: () => {
        abrirConsulta();
        cerrar();
      },
    },
  ];
}

function useStaffNavItems(onAfterAction?: () => void): NavItem[] {
  const { usuario } = useAuth();
  const { abrirConsulta } = useConsultReport();

  const cerrar = () => onAfterAction?.();

  const items: NavItem[] = [
    { key: 'mapa', label: 'Mapa', to: routes.home },
    { key: 'reportar', label: 'Reportar', to: routes.reportar },
    {
      key: 'consultar',
      label: 'Consultar radicado',
      onClick: () => {
        abrirConsulta();
        cerrar();
      },
    },
  ];

  if (usuario) {
    if (tieneRol(usuario.rol, ['ingeniero_a', 'ingeniero_b'])) {
      items.push({ key: 'campo', label: 'Campo', to: routes.campo });
    }
    if (usuario.rol === 'ingeniero_a') {
      items.push({ key: 'revision', label: 'Revisión', to: routes.revision });
    }
    if (tieneRol(usuario.rol, ['moderador', 'admin'])) {
      items.push({ key: 'moderacion', label: 'Moderación', to: routes.moderacion });
    }
    if (tieneRol(usuario.rol, ['coordinador', 'admin'])) {
      items.push({ key: 'tablero', label: 'Tablero', to: routes.tablero });
    }
    if (usuario.rol === 'admin') {
      items.push({ key: 'admin', label: 'Administración', to: routes.admin });
    }
  }

  return items;
}

function HeaderNav({
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
        const className = cn(
          'rounded-md px-3 py-2 text-sm font-medium transition-colors',
          activo
            ? 'bg-white/15 text-primary-foreground'
            : 'text-primary-foreground/90 hover:bg-white/10 hover:text-primary-foreground',
        );

        if (item.to) {
          return (
            <Link key={item.key} to={item.to} className={className} onClick={onNavigate}>
              {item.label}
            </Link>
          );
        }

        return (
          <button key={item.key} type="button" className={className} onClick={item.onClick}>
            {item.label}
          </button>
        );
      })}
    </nav>
  );
}

function SidebarNav({
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
    <nav className={cn('flex flex-col gap-0.5', className)}>
      {items.map((item) => {
        const activo = item.to != null && location.pathname === item.to;
        const className = cn(
          'flex h-10 w-full items-center rounded-md px-3 text-sm font-medium transition-colors',
          activo
            ? 'bg-white/15 text-primary-foreground'
            : 'text-primary-foreground/90 hover:bg-white/10 hover:text-primary-foreground',
        );

        if (item.to) {
          return (
            <Link key={item.key} to={item.to} className={className} onClick={onNavigate}>
              {item.label}
            </Link>
          );
        }

        return (
          <button key={item.key} type="button" className={className} onClick={item.onClick}>
            {item.label}
          </button>
        );
      })}
    </nav>
  );
}

function SidebarUsuario({ onAfterAction }: { onAfterAction?: () => void }) {
  const { usuario, salir } = useAuth();
  const navigate = useNavigate();

  const cerrar = () => onAfterAction?.();

  if (!usuario) {
    return (
      <div className="border-t border-white/10 p-4">
        <Button
          className="w-full gap-2 bg-white text-primary hover:bg-white/90"
          asChild
          onClick={cerrar}
        >
          <Link to={routes.ingreso}>
            <LogIn className="size-4" />
            Ingresar
          </Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="border-t border-white/10 p-4">
      <div className="mb-3 min-w-0">
        <p className="truncate font-semibold leading-tight">{usuario.nombre}</p>
        <p className="mt-0.5 text-xs font-medium text-primary-foreground/80">
          {ETIQUETA_ROL[usuario.rol]}
        </p>
        <p className="mt-1 truncate text-xs text-primary-foreground/55">{usuario.email}</p>
      </div>
      <Button
        variant="ghost"
        size="sm"
        className="w-full justify-start gap-2 text-primary-foreground hover:bg-white/10 hover:text-primary-foreground"
        onClick={() => {
          salir();
          navigate(routes.home);
          cerrar();
        }}
      >
        <LogOut className="size-4" />
        Cerrar sesión
      </Button>
    </div>
  );
}

function SidebarPanel({ onAfterAction, className }: { onAfterAction?: () => void; className?: string }) {
  const items = useStaffNavItems(onAfterAction);

  return (
    <div className={cn('flex h-full flex-col bg-primary text-primary-foreground', className)}>
      <div className="border-b border-white/10 p-4">
        <Link
          to={routes.home}
          className="flex items-center gap-2 font-semibold"
          onClick={onAfterAction}
        >
          <HardHat className="size-5 shrink-0" />
          <span>Inspección Cali</span>
          <SyncQueueBadge className="ml-auto" />
        </Link>
      </div>

      <div className="flex-1 overflow-y-auto p-3">
        <SidebarNav items={items} onNavigate={onAfterAction} />
      </div>

      <SidebarUsuario onAfterAction={onAfterAction} />
    </div>
  );
}

export function SiteHeader() {
  const [abierto, setAbierto] = useState(false);
  const cerrar = () => setAbierto(false);
  const items = usePublicNavItems(cerrar);

  return (
    <header className="site-header sticky top-0 z-40 shrink-0 border-b bg-primary text-primary-foreground print:hidden">
      <div className="mx-auto flex h-14 max-w-6xl items-center gap-4 px-4">
        <Link to={routes.home} className="flex min-w-0 items-center gap-2 font-semibold">
          <HardHat className="size-5 shrink-0" />
          <span className="truncate">Inspección Cali</span>
        </Link>

        <div className="hidden flex-1 items-center justify-end gap-2 md:flex">
          <HeaderNav items={items} />
          <Button
            className="ml-2 gap-2 bg-white text-primary hover:bg-white/90"
            size="sm"
            asChild
          >
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
                className="text-primary-foreground hover:bg-white/10 hover:text-primary-foreground"
                aria-label="Abrir menú"
              >
                <Menu className="size-5" />
              </Button>
            </SheetTrigger>
            <SheetContent
              side="right"
              className="w-[min(100vw-2rem,18rem)] border-0 bg-primary p-0 text-primary-foreground shadow-xl [&>button]:text-primary-foreground [&>button]:hover:bg-white/10"
            >
              <SheetHeader className="sr-only">
                <SheetTitle>Menú de navegación</SheetTitle>
              </SheetHeader>
              <div className="flex h-full flex-col bg-primary text-primary-foreground">
                <div className="border-b border-white/10 p-4 pr-12">
                  <Link
                    to={routes.home}
                    className="flex items-center gap-2 font-semibold"
                    onClick={cerrar}
                  >
                    <HardHat className="size-5 shrink-0" />
                    <span>Inspección Cali</span>
                  </Link>
                </div>

                <div className="p-3">
                  <SidebarNav items={items} onNavigate={cerrar} />
                </div>

                <div className="mt-auto border-t border-white/10 p-4">
                  <Button
                    className="w-full gap-2 bg-white text-primary hover:bg-white/90"
                    asChild
                    onClick={cerrar}
                  >
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

export function SiteSidebar() {
  return (
    <aside className="site-sidebar hidden w-64 shrink-0 md:block print:hidden">
      <div className="sticky top-0 h-svh">
        <SidebarPanel className="h-full" />
      </div>
    </aside>
  );
}

export function SiteMobileBar() {
  const [abierto, setAbierto] = useState(false);

  return (
    <header className="site-sidebar-mobile flex shrink-0 items-center gap-3 border-b bg-primary px-4 py-3 text-primary-foreground md:hidden print:hidden">
      <Sheet open={abierto} onOpenChange={setAbierto}>
        <SheetTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="text-primary-foreground hover:bg-white/10 hover:text-primary-foreground"
            aria-label="Abrir menú"
          >
            <Menu className="size-5" />
          </Button>
        </SheetTrigger>
        <SheetContent
          side="left"
          className="w-[min(100vw-2rem,18rem)] border-0 bg-primary p-0 text-primary-foreground shadow-xl [&>button]:text-primary-foreground [&>button]:hover:bg-white/10"
        >
          <SheetHeader className="sr-only">
            <SheetTitle>Menú de navegación</SheetTitle>
          </SheetHeader>
          <SidebarPanel onAfterAction={() => setAbierto(false)} className="h-full" />
        </SheetContent>
      </Sheet>
      <Link to={routes.home} className="flex min-w-0 flex-1 items-center gap-2 font-semibold">
        <HardHat className="size-5 shrink-0" />
        <span className="truncate">Inspección Cali</span>
      </Link>
      <SyncQueueBadge />
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="site-footer border-t bg-muted/40 px-4 py-6 text-center text-sm text-muted-foreground print:hidden">
      <p>
        Emergencias con riesgo para la vida:{' '}
        <a href="tel:123" className="font-semibold text-destructive underline">
          llama al 123
        </a>
        . Esta plataforma no atiende emergencias.
      </p>
      <p className="mt-2">
        Los dictámenes los emiten y firman ingenieros con matrícula verificada, nunca el sistema.
      </p>
    </footer>
  );
}
