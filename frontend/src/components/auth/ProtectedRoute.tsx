import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { AppFade } from '@/components/common/AppFade';
import { useAuth } from '@/hooks/useAuth';
import { routes } from '@/constants/routes';
import type { PermissionFlag } from '@/types/permissions';

type ProtectedRouteProps = {
  module?: string;
  flag?: PermissionFlag;
};

export function ProtectedRoute({ module, flag = 'r' }: ProtectedRouteProps) {
  const { usuario, cargando } = useAuth();
  const location = useLocation();

  if (cargando) {
    return (
      <AppFade className="p-6 text-center text-muted-foreground">
        <p>Cargando sesión…</p>
      </AppFade>
    );
  }

  if (!usuario) {
    return <Navigate to={routes.ingreso} state={{ from: location.pathname }} replace />;
  }

  if (module) {
    const permitido = Boolean(usuario.permissions?.[module]?.[flag]);
    if (!permitido) {
      return <Navigate to={routes.home} replace />;
    }
  }

  return <Outlet />;
}
