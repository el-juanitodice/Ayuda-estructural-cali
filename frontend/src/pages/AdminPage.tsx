import { useCallback, useEffect, useState } from 'react';
import { UserPlus } from 'lucide-react';
import { CreateUserDialog } from '@/components/common/CreateUserDialog';
import { UsersList } from '@/components/common/UsersList';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { get } from '@/lib/api';
import type { CrearUsuarioResponse, ListarUsuariosResponse } from '@/types/admin';

export function AdminPage() {
  const [usuarios, setUsuarios] = useState<ListarUsuariosResponse['usuarios']>([]);
  const [dialogAbierto, setDialogAbierto] = useState(false);
  const [mensaje, setMensaje] = useState<string | null>(null);
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
    let texto = respuesta.mensaje;
    if (respuesta.enlace_alta) {
      texto += ` Enlace dev: ${respuesta.enlace_alta}`;
    }
    setMensaje(texto);
    void cargar();
  };

  return (
    <div className="w-full space-y-3">
      {mensaje && (
        <p className="rounded-md border border-green-200 bg-green-50 px-3 py-2 text-xs text-green-800">
          {mensaje}
        </p>
      )}
      {error && <p className="text-sm font-medium text-destructive">{error}</p>}

      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-3 space-y-0 border-b px-4 py-3">
          <div className="min-w-0">
            <CardTitle className="text-base">Usuarios ({usuarios.length})</CardTitle>
            <p className="text-xs text-muted-foreground">Cuentas del personal</p>
          </div>
          <Button size="sm" className="shrink-0" onClick={() => setDialogAbierto(true)}>
            <UserPlus className="size-4" />
            Nueva cuenta
          </Button>
        </CardHeader>
        <CardContent className="p-0">
          {cargando ? (
            <p className="px-4 py-6 text-sm text-muted-foreground">Cargando usuarios…</p>
          ) : (
            <UsersList usuarios={usuarios} />
          )}
        </CardContent>
      </Card>

      <CreateUserDialog open={dialogAbierto} onOpenChange={setDialogAbierto} onCreado={onCreado} />
    </div>
  );
}
