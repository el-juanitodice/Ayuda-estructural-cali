import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { adminService } from '@/api/admin/admin.service';
import { useAuth } from '@/hooks/useAuth';
import type {
  ActualizarUsuarioResponse,
  CrearUsuarioResponse,
  DesactivarUsuarioResponse,
  UsuarioAdmin,
} from '@/types/admin';

export function useAdminPage() {
  const { usuario: sesion } = useAuth();
  const [usuarios, setUsuarios] = useState<UsuarioAdmin[]>([]);
  const [dialogCrearAbierto, setDialogCrearAbierto] = useState(false);
  const [usuarioEditando, setUsuarioEditando] = useState<UsuarioAdmin | null>(null);
  const [usuarioEliminando, setUsuarioEliminando] = useState<UsuarioAdmin | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const load = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      setUsuarios(await adminService.listarUsuarios());
    } catch (e) {
      const message = e instanceof Error ? e.message : 'No se pudo cargar la lista';
      setError(message);
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const onCreado = (respuesta: CrearUsuarioResponse) => {
    toast.success('Cuenta creada', {
      description: respuesta.enlace_alta
        ? `${respuesta.mensaje} Enlace dev: ${respuesta.enlace_alta}`
        : respuesta.mensaje,
      duration: respuesta.enlace_alta ? 15000 : 8000,
    });
    void load();
  };

  const onActualizado = (respuesta: ActualizarUsuarioResponse) => {
    toast.success('Usuario actualizado', { description: respuesta.mensaje });
    void load();
  };

  const onEliminado = (respuesta: DesactivarUsuarioResponse) => {
    toast.success('Cuenta desactivada', { description: respuesta.mensaje });
    void load();
  };

  return {
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
  };
}
