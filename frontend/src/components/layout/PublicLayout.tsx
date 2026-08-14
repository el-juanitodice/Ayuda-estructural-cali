import { Outlet } from 'react-router-dom';

import { SiteFooter, SitePublicHeader } from '@/components/layout/SiteShell';
import { usePageShellClasses } from '@/components/layout/usePageShellClasses';
import { ui } from '@/constants/styles';
import { cn } from '@/lib/utils';

/** Rutas públicas: navbar superior claro, sin sidebar. */
export function PublicLayout() {
  const { pathname, mainClassName, innerClassName, esMapa } = usePageShellClasses();

  return (
    <div className={cn('flex min-h-svh flex-col', esMapa ? ui.pageCanvasMap : ui.pageCanvas)}>
      <SitePublicHeader />
      <main className={mainClassName}>
        <div key={pathname} className={innerClassName}>
          <Outlet />
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
