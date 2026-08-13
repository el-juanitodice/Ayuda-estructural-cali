import { Outlet } from 'react-router-dom';
import { SiteFooter, SiteMobileBar, SiteSidebar } from '@/components/layout/SiteShell';
import { usePageShellClasses } from '@/components/layout/usePageShellClasses';

export function StaffLayout() {
  const { pathname, mainClassName, innerClassName } = usePageShellClasses();

  return (
    <div className="flex min-h-svh">
      <SiteSidebar />
      <div className="flex min-h-svh min-w-0 flex-1 flex-col">
        <SiteMobileBar />
        <main className={mainClassName}>
          <div key={pathname} className={innerClassName}>
            <Outlet />
          </div>
        </main>
        <SiteFooter />
      </div>
    </div>
  );
}
