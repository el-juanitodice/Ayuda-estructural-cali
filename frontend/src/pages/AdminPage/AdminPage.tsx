import { PageHeader } from '@/components/common/PageHeader';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { MOTION } from '@/constants/motion';
import { pageHeaders } from '@/constants/page-headers';
import { usePermissions } from '@/hooks/usePermissions';
import { cn } from '@/lib/utils';
import { AdminRolesTab } from '@/pages/AdminPage/components/AdminRolesTab';
import { AdminUsersTab } from '@/pages/AdminPage/components/AdminUsersTab';

const adminTabPanelClass = cn(
  'mt-3 outline-none',
  'data-[state=active]:animate-app-in',
  MOTION.durationClass,
  MOTION.easingClass,
);

export function AdminPage() {
  const { puede } = usePermissions();
  const puedeUsuarios = puede('admin_usuarios', 'r');
  const puedeRoles = puede('admin_roles', 'r');

  const defaultTab = puedeUsuarios ? 'usuarios' : 'roles';

  if (!puedeUsuarios && !puedeRoles) {
    return (
      <div className="w-full space-y-6">
        <PageHeader
          suppressTitle
          eyebrow={pageHeaders.admin.eyebrow}
          title={pageHeaders.admin.title}
          description={pageHeaders.admin.description}
        />
        <p className="text-sm text-muted-foreground">No tienes permisos para administrar esta sección.</p>
      </div>
    );
  }

  return (
    <div className="w-full space-y-6">
      <PageHeader
        suppressTitle
        eyebrow={pageHeaders.admin.eyebrow}
        title={pageHeaders.admin.title}
        description={pageHeaders.admin.description}
      />

      <Tabs defaultValue={defaultTab} className="w-full">
        <TabsList>
          {puedeUsuarios ? <TabsTrigger value="usuarios">Usuarios</TabsTrigger> : null}
          {puedeRoles ? <TabsTrigger value="roles">Roles y permisos</TabsTrigger> : null}
        </TabsList>

        {puedeUsuarios ? (
          <TabsContent value="usuarios" className={adminTabPanelClass}>
            <AdminUsersTab />
          </TabsContent>
        ) : null}

        {puedeRoles ? (
          <TabsContent value="roles" className={adminTabPanelClass}>
            <AdminRolesTab />
          </TabsContent>
        ) : null}
      </Tabs>
    </div>
  );
}
