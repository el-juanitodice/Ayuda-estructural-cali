import { useLocation } from 'react-router-dom';

import { useAuth } from '@/hooks/useAuth';
import { AppFade } from '@/components/common/AppFade';
import { AppShellLayout } from '@/components/layout/AppShellLayout';
import { PublicLayout } from '@/components/layout/PublicLayout';
import { routes } from '@/constants/routes';

const RUTAS_SIDEBAR_CON_SESION = [routes.home, routes.reportar] as const;

/** Rutas públicas: navbar sin sesión; sidebar en mapa/reportar si hay sesión. */
export function AuthAwareLayout() {
  const { usuario, cargando } = useAuth();
  const { pathname } = useLocation();

  if (cargando) {
    return (
      <AppFade className="flex min-h-svh items-center justify-center p-6 text-muted-foreground">
        <p>Cargando sesión…</p>
      </AppFade>
    );
  }

  const sidebarConSesion =
    usuario != null && RUTAS_SIDEBAR_CON_SESION.includes(pathname as (typeof RUTAS_SIDEBAR_CON_SESION)[number]);

  return sidebarConSesion ? <AppShellLayout /> : <PublicLayout />;
}
