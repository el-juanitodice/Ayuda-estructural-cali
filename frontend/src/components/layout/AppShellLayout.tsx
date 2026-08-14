import { Outlet } from 'react-router-dom';

import { AppSidebar } from '@/components/layout/AppSidebar';
import { SiteFooter, SiteStaffHeader } from '@/components/layout/SiteShell';
import { usePageShellClasses } from '@/components/layout/usePageShellClasses';
import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar';
import { ui } from '@/constants/styles';
import { cn } from '@/lib/utils';

/** Rutas protegidas: sidebar shadcn + área de contenido. */
export function AppShellLayout() {
  const { pathname, mainClassName, innerClassName, esMapa } = usePageShellClasses();

  return (
    <SidebarProvider className={cn(esMapa ? ui.pageCanvasMap : ui.pageCanvas)}>
      <AppSidebar />
      <SidebarInset className="flex min-h-svh min-w-0 flex-1 flex-col">
        <SiteStaffHeader />
        <div className={cn('min-h-0 flex-1', mainClassName)}>
          <div key={pathname} className={innerClassName}>
            <Outlet />
          </div>
        </div>
        <SiteFooter />
      </SidebarInset>
    </SidebarProvider>
  );
}

export const StaffLayout = AppShellLayout;
