import { useCallback, useEffect, useState } from 'react';
import { UserPlus } from 'lucide-react';
import { toast } from 'sonner';
import { CreateUserDialog } from '@/components/common/CreateUserDialog';
import { DeleteUserDialog } from '@/components/common/DeleteUserDialog';
import { EditUserDialog } from '@/components/common/EditUserDialog';
import { UsersList } from '@/components/common/UsersList';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/contexts/AuthContext';
import { get } from '@/lib/api';
import type {
  ActualizarUsuarioResponse,
  CrearUsuarioResponse,
  DesactivarUsuarioResponse,
  ListarUsuariosResponse,
  UsuarioAdmin,
} from '@/types/admin';

export function AdminPage() {
  const { usuario: sesion } = useAuth();
  const [usuarios, setUsuarios] = useState<ListarUsuariosResponse['usuarios']>([]);
  const [dialogCrearAbierto, setDialogCrearAbierto] = useState(false);
  const [usuarioEditando, setUsuarioEditando] = useState<UsuarioAdmin | null>(null);
  const [usuarioEliminando, setUsuarioEliminando] = useState<UsuarioAdmin | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [cargando, setCargando] = useState(true);

  const cargar = useCallback(async () => {
    setCargando(true);
    setError(null);
    try {
      const r = await get<ListarUsuariosResponse>('/admin/usuarios');
      setUsuarios(r.usuarios);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo cargar la lista');
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    void cargar();
  }, [cargar]);

  const onCreado = (respuesta: CrearUsuarioResponse) => {
    toast.success('Cuenta creada', {
      description: respuesta.enlace_alta
        ? `${respuesta.mensaje} Enlace dev: ${respuesta.enlace_alta}`
        : respuesta.mensaje,
      duration: respuesta.enlace_alta ? 15000 : 8000,
    });
    void cargar();
  };

  const onActualizado = (respuesta: ActualizarUsuarioResponse) => {
    toast.success('Usuario actualizado', { description: respuesta.mensaje });
    void cargar();
  };

  const onEliminado = (respuesta: DesactivarUsuarioResponse) => {
    toast.success('Cuenta desactivada', { description: respuesta.mensaje });
    void cargar();
  };

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
          {cargando ? (
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
