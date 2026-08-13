import type { ReactNode } from 'react';
import { MOTION } from '@/constants/motion';
import { cn } from '@/lib/utils';

interface AppFadeProps {
  children: ReactNode;
  className?: string;
  /** Si es false, no renderiza (útil con permisos condicionales) */
  show?: boolean;
}

/** Entrada suave estándar (200ms ease-in-out) */
export function AppFade({ children, className, show = true }: AppFadeProps) {
  if (!show) return null;
  return <div className={cn(MOTION.fadeInClass, className)}>{children}</div>;
}

interface LoadingShellProps {
  loading: boolean;
  children: ReactNode;
  fallback?: ReactNode;
  className?: string;
}

/** Placeholder de carga → contenido, ambos con fade-in */
export function LoadingShell({ loading, children, fallback, className }: LoadingShellProps) {
  if (loading) {
    return (
      <AppFade className={cn('text-muted-foreground', className)}>
        {fallback ?? <p>Cargando…</p>}
      </AppFade>
    );
  }

  return <AppFade className={className}>{children}</AppFade>;
}
