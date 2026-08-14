import { Outlet } from 'react-router-dom';

import { AppSidebar } from '@/components/layout/AppSidebar';
import { SiteFooter, SiteStaffHeader } from '@/components/layout/SiteShell';
import { usePageShellClasses } from '@/components/layout/usePageShellClasses';
import { useIsMobile } from '@/hooks/use-mobile';
import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar';
import { ui } from '@/constants/styles';
import { cn } from '@/lib/utils';

/** Shell con sidebar fijo en desktop; sheet solo en mobile. */
export function AppShellLayout() {
  const { pathname, mainClassName, innerClassName, esMapa, esReportar } = usePageShellClasses();
  const isMobile = useIsMobile();

  return (
    <SidebarProvider
      className={cn(esMapa ? ui.pageCanvasMap : ui.pageCanvas)}
      open={isMobile ? undefined : true}
      onOpenChange={isMobile ? undefined : () => undefined}
    >
      <AppSidebar />
      <SidebarInset className="flex min-h-svh min-w-0 flex-1 flex-col">
        <SiteStaffHeader />
        <div className={cn('flex min-h-0 flex-1 flex-col', esReportar && 'overflow-hidden', mainClassName)}>
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
