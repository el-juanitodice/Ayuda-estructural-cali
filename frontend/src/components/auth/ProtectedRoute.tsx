import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { AppFade } from '@/components/common/AppFade';
import { useAuth } from '@/contexts/AuthContext';
import { routes } from '@/constants/routes';
import type { Rol } from '@/types/auth';

export function ProtectedRoute({ roles }: { roles?: Rol[] }) {
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

  if (roles && !roles.includes(usuario.rol)) {
    return <Navigate to={routes.home} replace />;
  }

  return <Outlet />;
}
