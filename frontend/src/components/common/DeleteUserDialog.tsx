import { useState } from 'react';
import { toast } from '@/lib/toast';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { adminService } from '@/api/admin/admin.service';
import type { DesactivarUsuarioResponse, UsuarioAdmin } from '@/types/admin';

interface DeleteUserDialogProps {
  usuario: UsuarioAdmin | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEliminado: (respuesta: DesactivarUsuarioResponse) => void;
}

export function DeleteUserDialog({
  usuario,
  open,
  onOpenChange,
  onEliminado,
}: DeleteUserDialogProps) {
  const [eliminando, setEliminando] = useState(false);

  const cerrar = () => {
    if (!eliminando) onOpenChange(false);
  };

  const confirmar = async () => {
    if (!usuario) return;
    setEliminando(true);
    try {
      const r = await adminService.desactivarUsuario(usuario.id);
      onEliminado(r);
      onOpenChange(false);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'No se pudo desactivar la cuenta';
      toast.error('No se pudo desactivar', { description: msg });
    } finally {
      setEliminando(false);
    }
  };

  if (!usuario) return null;

  return (
    <Dialog open={open} onOpenChange={(v) => (v ? onOpenChange(true) : cerrar())}>
      <DialogContent showClose={!eliminando}>
        <DialogHeader>
          <DialogTitle>¿Desactivar {usuario.nombre}?</DialogTitle>
          <DialogDescription>
            La persona no podrá ingresar. Puedes reactivarla después editando la cuenta.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="secondary" disabled={eliminando} onClick={cerrar}>
            Cancelar
          </Button>
          <Button variant="destructive" disabled={eliminando} onClick={() => void confirmar()}>
            {eliminando ? 'Desactivando…' : 'Desactivar cuenta'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
