import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { HardHat, LogIn, LogOut, Menu } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { useAuth } from '@/contexts/AuthContext';
import { useConsultReport } from '@/contexts/ConsultReportContext';
import { routes } from '@/constants/routes';
import { cn } from '@/lib/utils';
import type { Rol } from '@/types/auth';

function tieneRol(rol: Rol, permitidos: Rol[]) {
  return permitidos.includes(rol);
}

const navLinkClass =
  'text-primary-foreground hover:bg-white/10 hover:text-primary-foreground';

interface NavItem {
  key: string;
  label: string;
  to?: string;
  onClick?: () => void;
  icon?: React.ReactNode;
  /** CTA destacado (p. ej. Ingresar) */
  destacado?: boolean;
}

function useNavItems(onAfterAction?: () => void): NavItem[] {
  const { usuario, salir } = useAuth();
  const { abrirConsulta } = useConsultReport();
  const navigate = useNavigate();

  const cerrar = () => onAfterAction?.();

  const items: NavItem[] = [
    { key: 'reportar', label: 'Reportar', to: routes.reportar },
    {
      key: 'consultar',
      label: 'Consultar',
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
      items.push({ key: 'admin', label: 'Admin', to: routes.admin });
    }
    items.push({
      key: 'salir',
      label: 'Salir',
      icon: <LogOut className="size-4" />,
      onClick: () => {
        salir();
        navigate(routes.home);
        cerrar();
      },
    });
  } else {
    items.push({
      key: 'ingreso',
      label: 'Ingresar',
      to: routes.ingreso,
      icon: <LogIn className="size-4" />,
      destacado: true,
    });
  }

  return items;
}

function NavLink({
  item,
  modo,
  onNavigate,
}: {
  item: NavItem;
  modo: 'desktop' | 'mobile';
  onNavigate?: () => void;
}) {
  const location = useLocation();
  const activo = item.to != null && location.pathname === item.to;

  const className =
    modo === 'mobile'
      ? cn(
          'h-11 w-full justify-start gap-3 rounded-md px-3 text-base font-medium',
          item.destacado
            ? 'bg-white text-primary shadow-sm hover:bg-white/90 hover:text-primary'
            : cn(
                'text-primary-foreground hover:bg-white/10 hover:text-primary-foreground',
                'focus-visible:ring-white/30',
                activo && 'bg-white/15 font-semibold',
              ),
        )
      : cn(item.destacado ? '' : navLinkClass, !item.destacado && activo && 'bg-white/15');

  const variant = item.destacado && modo === 'desktop' ? 'secondary' : 'ghost';

  const contenido = (
    <>
      {item.icon}
      {item.label}
    </>
  );

  if (item.to) {
    return (
      <Button
        variant={variant}
        size={modo === 'mobile' ? 'default' : 'sm'}
        className={className}
        asChild
        onClick={onNavigate}
      >
        <Link to={item.to}>{contenido}</Link>
      </Button>
    );
  }

  return (
    <Button
      variant={variant}
      size={modo === 'mobile' ? 'default' : 'sm'}
      type="button"
      className={className}
      onClick={item.onClick}
    >
      {contenido}
    </Button>
  );
}

function DesktopNav({ items }: { items: NavItem[] }) {
  return (
    <nav className="hidden items-center gap-1 text-sm md:flex">
      {items.map((item) => (
        <NavLink key={item.key} item={item} modo="desktop" />
      ))}
    </nav>
  );
}

function MobileNav({
  items,
  abierto,
  onAbiertoChange,
}: {
  items: NavItem[];
  abierto: boolean;
  onAbiertoChange: (open: boolean) => void;
}) {
  return (
    <Sheet open={abierto} onOpenChange={onAbiertoChange}>
      <SheetTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className={cn(navLinkClass, 'md:hidden')}
          aria-label="Abrir menú"
        >
          <Menu className="size-5" />
        </Button>
      </SheetTrigger>
      <SheetContent
        side="right"
        className="flex flex-col border-primary/20 bg-primary text-primary-foreground [&>button]:text-primary-foreground [&>button]:hover:bg-white/10"
      >
        <SheetHeader className="border-b border-white/10 pb-4 text-left">
          <SheetTitle className="flex items-center gap-2 text-primary-foreground">
            <HardHat className="size-5" />
            Menú
          </SheetTitle>
        </SheetHeader>
        <nav className="mt-4 flex flex-col gap-1">
          {items
            .filter((item) => !item.destacado)
            .map((item) => (
              <NavLink
                key={item.key}
                item={item}
                modo="mobile"
                onNavigate={() => onAbiertoChange(false)}
              />
            ))}
        </nav>
        {items.some((item) => item.destacado) && (
          <div className="mt-auto border-t border-white/10 pt-4">
            {items
              .filter((item) => item.destacado)
              .map((item) => (
                <NavLink
                  key={item.key}
                  item={item}
                  modo="mobile"
                  onNavigate={() => onAbiertoChange(false)}
                />
              ))}
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}

export function SiteHeader() {
  const [menuAbierto, setMenuAbierto] = useState(false);
  const items = useNavItems(() => setMenuAbierto(false));

  return (
    <header className="site-header sticky top-0 z-50 shrink-0 border-b bg-primary text-primary-foreground shadow-sm print:hidden">
      <div className="flex w-full items-center justify-between gap-3 px-4 py-3">
        <Link to={routes.home} className="flex min-w-0 items-center gap-2 font-semibold">
          <HardHat className="size-5 shrink-0" />
          <span className="truncate">Inspección Cali</span>
        </Link>

        <DesktopNav items={items} />
        <MobileNav items={items} abierto={menuAbierto} onAbiertoChange={setMenuAbierto} />
      </div>
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
