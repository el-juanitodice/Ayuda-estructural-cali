import { Link, useLocation, useNavigate } from 'react-router-dom';
import { HardHat, LogIn, LogOut } from 'lucide-react';

import { ETIQUETA_ROL, useStaffNavItems, type NavItem } from '@/components/layout/nav-config';
import { Button } from '@/components/ui/button';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from '@/components/ui/sidebar';
import { routes } from '@/constants/routes';
import { useAuth } from '@/hooks/useAuth';
import { cn } from '@/lib/utils';

const menuButtonClass =
  'text-primary-foreground/90 hover:bg-white/10 hover:text-primary-foreground data-[active=true]:border-l-2 data-[active=true]:border-amber-400 data-[active=true]:bg-white/10 data-[active=true]:font-medium data-[active=true]:text-primary-foreground';

function NavMenu({ items }: { items: NavItem[] }) {
  const location = useLocation();
  const { isMobile, setOpenMobile } = useSidebar();

  const cerrarSiMobile = () => {
    if (isMobile) setOpenMobile(false);
  };

  return (
    <SidebarMenu>
      {items.map((item) => {
        const activo = item.to != null && location.pathname === item.to;
        const Icon = item.icon;

        if (item.to) {
          return (
            <SidebarMenuItem key={item.key}>
              <SidebarMenuButton
                asChild
                isActive={activo}
                tooltip={item.label}
                className={menuButtonClass}
              >
                <Link to={item.to} onClick={cerrarSiMobile}>
                  <Icon />
                  <span>{item.label}</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          );
        }

        return (
          <SidebarMenuItem key={item.key}>
            <SidebarMenuButton
              tooltip={item.label}
              className={menuButtonClass}
              onClick={() => {
                item.onClick?.();
                cerrarSiMobile();
              }}
            >
              <Icon />
              <span>{item.label}</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        );
      })}
    </SidebarMenu>
  );
}

function SidebarUsuario() {
  const { usuario, salir } = useAuth();
  const navigate = useNavigate();
  const { isMobile, setOpenMobile } = useSidebar();

  const cerrar = () => {
    if (isMobile) setOpenMobile(false);
  };

  if (!usuario) {
    return (
      <SidebarFooter className="border-t border-white/10 p-2">
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
      </SidebarFooter>
    );
  }

  return (
    <SidebarFooter className="border-t border-white/10 p-2">
      <div className="mb-2 min-w-0 rounded-md px-2 py-1.5 group-data-[collapsible=icon]:hidden">
        <p className="truncate text-sm font-semibold leading-tight">{usuario.nombre}</p>
        <p className="mt-0.5 text-xs font-medium text-primary-foreground/80">
          {ETIQUETA_ROL[usuario.rol]}
        </p>
        <p className="mt-1 truncate text-xs text-primary-foreground/55">{usuario.email}</p>
      </div>
      <SidebarMenu>
        <SidebarMenuItem>
          <SidebarMenuButton
            tooltip="Cerrar sesión"
            className={menuButtonClass}
            onClick={() => {
              salir();
              navigate(routes.home);
              cerrar();
            }}
          >
            <LogOut />
            <span>Cerrar sesión</span>
          </SidebarMenuButton>
        </SidebarMenuItem>
      </SidebarMenu>
    </SidebarFooter>
  );
}

export function AppSidebar() {
  const items = useStaffNavItems();
  const { isMobile, setOpenMobile } = useSidebar();

  return (
    <Sidebar
      collapsible="offcanvas"
      className={cn(
        'site-app-sidebar border-r-0 print:hidden',
        '[&_[data-sidebar=sidebar]]:site-sidebar-panel [&_[data-sidebar=sidebar]]:text-primary-foreground',
        '[&_[data-mobile=true]]:site-sidebar-panel [&_[data-mobile=true]]:border-0 [&_[data-mobile=true]]:text-primary-foreground',
        '[&_[data-sidebar=sidebar]]:shadow-xl',
      )}
    >
      <SidebarHeader className="flex h-16 shrink-0 items-center border-b border-white/10 p-2">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              size="lg"
              asChild
              className="text-primary-foreground hover:bg-white/10 hover:text-primary-foreground"
            >
              <Link
                to={routes.home}
                onClick={() => {
                  if (isMobile) setOpenMobile(false);
                }}
              >
                <span className="flex size-8 items-center justify-center rounded-lg bg-white/10 ring-1 ring-white/15">
                  <HardHat className="size-4" />
                </span>
                <span className="font-semibold leading-tight">
                  Inspección
                  <span className="block text-xs font-medium text-primary-foreground/70">Cali</span>
                </span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className="text-primary-foreground/60">Navegación</SidebarGroupLabel>
          <SidebarGroupContent>
            <NavMenu items={items} />
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarUsuario />
    </Sidebar>
  );
}
