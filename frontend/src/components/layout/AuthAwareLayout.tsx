import { useAuth } from '@/hooks/useAuth';
import { AppFade } from '@/components/common/AppFade';
import { PublicLayout } from '@/components/layout/PublicLayout';

/** Rutas públicas: navbar arriba (sin sidebar). */
export function AuthAwareLayout() {
  const { cargando } = useAuth();

  if (cargando) {
    return (
      <AppFade className="flex min-h-svh items-center justify-center p-6 text-muted-foreground">
        <p>Cargando sesión…</p>
      </AppFade>
    );
  }

  return <PublicLayout />;
}
