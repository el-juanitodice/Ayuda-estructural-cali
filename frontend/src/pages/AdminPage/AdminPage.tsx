import { UserPlus } from 'lucide-react';
import { CreateUserDialog } from '@/components/common/CreateUserDialog';
import { DeleteUserDialog } from '@/components/common/DeleteUserDialog';
import { EditUserDialog } from '@/components/common/EditUserDialog';
import { PageHeader } from '@/components/common/PageHeader';
import { UsersList } from '@/components/common/UsersList';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { pageHeaders } from '@/constants/page-headers';
import { useAdminPage } from '@/pages/AdminPage/hooks/useAdminPage';

export function AdminPage() {
  const {
    sesion,
    usuarios,
    error,
    isLoading,
    dialogCrearAbierto,
    usuarioEditando,
    usuarioEliminando,
    setDialogCrearAbierto,
    setUsuarioEditando,
    setUsuarioEliminando,
    onCreado,
    onActualizado,
    onEliminado,
  } = useAdminPage();

  return (
    <div className="w-full space-y-6">
      <PageHeader
        eyebrow={pageHeaders.admin.eyebrow}
        title={pageHeaders.admin.title}
        description={pageHeaders.admin.description}
        actions={
          <Button size="sm" className="w-full shrink-0 sm:w-auto" onClick={() => setDialogCrearAbierto(true)}>
            <UserPlus className="size-4" />
            Nueva cuenta
          </Button>
        }
      />

      {error && <p className="text-sm font-medium text-destructive">{error}</p>}

      <Card>
        <CardContent className="border-b px-4 py-3 text-base font-medium">
          Usuarios ({usuarios.length})
        </CardContent>
        <CardContent className="p-0">
          {isLoading ? (
            <p className="px-4 py-6 text-sm text-muted-foreground">Cargando usuarios…</p>
          ) : (
            <UsersList
              usuarios={usuarios}
              usuarioActualUuid={sesion?.id}
              onEditar={setUsuarioEditando}
              onEliminar={setUsuarioEliminando}
            />
          )}
        </CardContent>
      </Card>

      <CreateUserDialog
        open={dialogCrearAbierto}
        onOpenChange={setDialogCrearAbierto}
        onCreado={onCreado}
      />

      <EditUserDialog
        usuario={usuarioEditando}
        open={!!usuarioEditando}
        onOpenChange={(open) => {
          if (!open) setUsuarioEditando(null);
        }}
        onActualizado={onActualizado}
      />

      <DeleteUserDialog
        usuario={usuarioEliminando}
        open={!!usuarioEliminando}
        onOpenChange={(open) => {
          if (!open) setUsuarioEliminando(null);
        }}
        onEliminado={onEliminado}
      />
    </div>
  );
}
