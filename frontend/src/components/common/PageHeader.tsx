import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface PageHeaderProps {
  eyebrow?: string;
  title?: string;
  description?: ReactNode;
  actions?: ReactNode;
  /** Oculta eyebrow y título (p. ej. cuando el shell ya los muestra). */
  suppressTitle?: boolean;
  /** Cabecera fija; el scroll ocurre en el contenido debajo (requiere contenedor flex). */
  pinned?: boolean;
  className?: string;
}

export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
  suppressTitle,
  pinned,
  className,
}: PageHeaderProps) {
  const showTitle = !suppressTitle && (eyebrow || title);

  return (
    <header
      className={cn(
        'flex flex-col gap-3 border-b border-border/80 pb-4 sm:flex-row sm:items-end sm:justify-between',
        pinned ? 'mb-0 shrink-0 bg-background' : 'mb-5',
        !showTitle && !description && !actions && 'hidden',
        className,
      )}
    >
      <div className="min-w-0 space-y-1">
        {showTitle && eyebrow && (
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            {eyebrow}
          </p>
        )}
        {showTitle && title && (
          <h1 className="font-serif text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
            {title}
          </h1>
        )}
        {description && (
          <div className="max-w-2xl text-sm leading-relaxed text-muted-foreground">{description}</div>
        )}
      </div>
      {actions && <div className="flex shrink-0 flex-wrap gap-2">{actions}</div>}
    </header>
  );
}
