import { useEffect, useState } from 'react';
import { Mail, Pencil } from 'lucide-react';
import { toast } from '@/lib/toast';
import { RoleSelect } from '@/components/common/RoleSelect';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { adminService } from '@/api/admin/admin.service';
import { useAuth } from '@/hooks/useAuth';
import type { RolOption } from '@/types/auth';
import type { ActualizarUsuarioResponse, UsuarioAdmin } from '@/types/admin';

interface FormularioUsuario {
  email: string;
  nombre: string;
  role_id: string;
  telefono: string;
  matricula: string;
  profesion: string;
  activo: boolean;
}

function formularioDesdeUsuario(u: UsuarioAdmin): FormularioUsuario {
  return {
    email: u.email,
    nombre: u.nombre,
    role_id: u.role_id ?? '',
    telefono: u.telefono ?? '',
    matricula: u.matricula ?? '',
    profesion: u.profesion ?? '',
    activo: u.activo,
  };
}

interface EditUserDialogProps {
  usuario: UsuarioAdmin | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onActualizado: (respuesta: ActualizarUsuarioResponse) => void;
}

export function EditUserDialog({ usuario, open, onOpenChange, onActualizado }: EditUserDialogProps) {
  const { usuario: sesion } = useAuth();
  const [form, setForm] = useState<FormularioUsuario | null>(null);
  const [rolMeta, setRolMeta] = useState<RolOption | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);
  const [reenviando, setReenviando] = useState(false);

  const esYo = usuario?.uuid === sesion?.id;
  const requiereIngenieria = Boolean(rolMeta?.requires_engineering_credentials);

  useEffect(() => {
    if (usuario && open) {
      setForm(formularioDesdeUsuario(usuario));
      setError(null);
    }
  }, [usuario, open]);

  const cerrar = () => {
    onOpenChange(false);
    setForm(null);
    setRolMeta(null);
    setError(null);
  };

  const guardar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!usuario || !form || !form.role_id) return;
    setError(null);
    setGuardando(true);
    try {
      const r = await adminService.actualizarUsuario(usuario.id, {
        email: form.email,
        nombre: form.nombre,
        role_id: form.role_id,
        telefono: form.telefono || null,
        matricula: requiereIngenieria ? form.matricula : null,
        profesion: requiereIngenieria ? form.profesion : null,
        activo: form.activo,
      });
      onActualizado(r);
      cerrar();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'No se pudo actualizar la cuenta';
      setError(msg);
      toast.error('No se pudo actualizar', { description: msg });
    } finally {
      setGuardando(false);
    }
  };

  const reenviarEnlace = async () => {
    if (!usuario) return;
    setReenviando(true);
    try {
      const r = await adminService.reenviarEnlace(usuario.id);
      toast.success('Enlace reenviado', {
        description: r.enlace_alta ? `${r.mensaje} Dev: ${r.enlace_alta}` : r.mensaje,
        duration: r.enlace_alta ? 15000 : 8000,
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'No se pudo reenviar el enlace';
      toast.error('No se pudo reenviar', { description: msg });
    } finally {
      setReenviando(false);
    }
  };

  if (!usuario || !form) return null;

  return (
    <Dialog open={open} onOpenChange={(v) => (v ? onOpenChange(true) : cerrar())}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Pencil className="size-5" />
            Editar cuenta
          </DialogTitle>
          <DialogDescription>
            {usuario.nombre} · {usuario.email}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={guardar} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="edit-email">Correo</Label>
            <Input
              id="edit-email"
              type="email"
              required
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-nombre">Nombre</Label>
            <Input
              id="edit-nombre"
              required
              minLength={3}
              value={form.nombre}
              onChange={(e) => setForm({ ...form, nombre: e.target.value })}
            />
          </div>

          <RoleSelect
            id="edit-role_id"
            value={form.role_id}
            onChange={(role_id) => setForm({ ...form, role_id })}
            onRoleMeta={setRolMeta}
            disabled={guardando || esYo}
          />

          <div className="space-y-2">
            <Label htmlFor="edit-telefono">Teléfono</Label>
            <Input
              id="edit-telefono"
              value={form.telefono}
              onChange={(e) => setForm({ ...form, telefono: e.target.value })}
            />
          </div>

          {requiereIngenieria && (
            <>
              <div className="space-y-2">
                <Label htmlFor="edit-matricula">Matrícula COPNIA</Label>
                <Input
                  id="edit-matricula"
                  required
                  value={form.matricula}
                  onChange={(e) => setForm({ ...form, matricula: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-profesion">Profesión</Label>
                <Input
                  id="edit-profesion"
                  required
                  value={form.profesion}
                  onChange={(e) => setForm({ ...form, profesion: e.target.value })}
                />
              </div>
            </>
          )}

          <div className="flex items-center gap-2 rounded-md border px-3 py-2">
            <Checkbox
              id="edit-activo"
              checked={form.activo}
              disabled={esYo}
              onCheckedChange={(v) => setForm({ ...form, activo: v === true })}
            />
            <Label htmlFor="edit-activo" className="cursor-pointer font-normal">
              Cuenta activa
            </Label>
          </div>

          {esYo && (
            <p className="text-xs text-muted-foreground">
              No puedes desactivarte ni cambiar tu propio rol desde aquí.
            </p>
          )}

          {!usuario.clave_definida && usuario.activo && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={reenviando}
              onClick={() => void reenviarEnlace()}
            >
              <Mail className="mr-2 size-4" />
              {reenviando ? 'Reenviando…' : 'Reenviar enlace de alta'}
            </Button>
          )}

          {error && <p className="text-sm font-medium text-destructive">{error}</p>}

          <DialogFooter className="gap-2 sm:gap-0">
            <Button type="button" variant="secondary" onClick={cerrar} disabled={guardando}>
              Cancelar
            </Button>
            <Button type="submit" disabled={guardando}>
              {guardando ? 'Guardando…' : 'Guardar cambios'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
