import { UserPlus } from 'lucide-react';
import { CreateUserDialog } from '@/components/common/CreateUserDialog';
import { DeleteUserDialog } from '@/components/common/DeleteUserDialog';
import { EditUserDialog } from '@/components/common/EditUserDialog';
import { UsersList } from '@/components/common/UsersList';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
    <div className="w-full space-y-3">
      {error && <p className="text-sm font-medium text-destructive">{error}</p>}

      <Card>
        <CardHeader className="flex flex-col gap-3 border-b px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:space-y-0">
          <div className="min-w-0">
            <CardTitle className="text-base">Usuarios ({usuarios.length})</CardTitle>
            <p className="text-xs text-muted-foreground">Cuentas del personal — solo administradores</p>
          </div>
          <Button size="sm" className="w-full shrink-0 sm:w-auto" onClick={() => setDialogCrearAbierto(true)}>
            <UserPlus className="size-4" />
            Nueva cuenta
          </Button>
        </CardHeader>
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
