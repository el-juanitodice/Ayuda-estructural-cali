import { Outlet } from 'react-router-dom';
import { SiteFooter, SiteHeader } from '@/components/layout/SiteShell';
import { usePageShellClasses } from '@/components/layout/usePageShellClasses';

export function PublicLayout() {
  const { pathname, mainClassName, innerClassName } = usePageShellClasses();

  return (
    <div className="flex min-h-svh flex-col">
      <SiteHeader />
      <main className={mainClassName}>
        <div key={pathname} className={innerClassName}>
          <Outlet />
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
