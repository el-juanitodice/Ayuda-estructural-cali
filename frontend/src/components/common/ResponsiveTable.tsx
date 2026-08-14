import type { HTMLAttributes, ReactNode } from 'react';

import { cn } from '@/lib/utils';

type MobileDataListProps = HTMLAttributes<HTMLUListElement> & {
  /** Compensa el padding horizontal del contenedor padre (p. ej. px-6). */
  inset?: boolean;
};

export function MobileDataList({ className, inset, ...props }: MobileDataListProps) {
  return (
    <ul
      className={cn(
        'divide-y divide-border/60 md:hidden',
        inset && '-mx-6 [&>li]:px-6',
        '[&>li]:py-3',
        className,
      )}
      {...props}
    />
  );
}

export function DesktopTable({
  className,
  children,
}: {
  className?: string;
  children: ReactNode;
}) {
  return <div className={cn('hidden overflow-x-auto md:block', className)}>{children}</div>;
}
