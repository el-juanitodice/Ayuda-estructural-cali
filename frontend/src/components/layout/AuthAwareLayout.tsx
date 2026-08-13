import { useAuth } from '@/contexts/AuthContext';
import { AppFade } from '@/components/common/AppFade';
import { PublicLayout } from '@/components/layout/PublicLayout';
import { StaffLayout } from '@/components/layout/StaffLayout';

/** Rutas públicas: sidebar del panel si hay sesión, nav superior si no. */
export function AuthAwareLayout() {
  const { usuario, cargando } = useAuth();

  if (cargando) {
    return (
      <AppFade className="flex min-h-svh items-center justify-center p-6 text-muted-foreground">
        <p>Cargando sesión…</p>
      </AppFade>
    );
  }

  return usuario ? <StaffLayout /> : <PublicLayout />;
}
