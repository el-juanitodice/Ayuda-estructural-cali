import { useState } from 'react';
import { UserPlus } from 'lucide-react';
import { toast } from '@/lib/toast';
import { RoleSelect } from '@/components/common/RoleSelect';
import { Button } from '@/components/ui/button';
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
import type { RolOption } from '@/types/auth';
import type { CrearUsuarioResponse } from '@/types/admin';

interface FormularioUsuario {
  email: string;
  nombre: string;
  role_id: string;
  telefono: string;
  matricula: string;
  profesion: string;
}

const valoresIniciales: FormularioUsuario = {
  email: '',
  nombre: '',
  role_id: '',
  telefono: '',
  matricula: '',
  profesion: '',
};

interface CreateUserDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreado: (respuesta: CrearUsuarioResponse) => void;
}

export function CreateUserDialog({ open, onOpenChange, onCreado }: CreateUserDialogProps) {
  const [form, setForm] = useState<FormularioUsuario>(valoresIniciales);
  const [rolMeta, setRolMeta] = useState<RolOption | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  const requiereIngenieria = Boolean(rolMeta?.requires_engineering_credentials);

  const cerrar = () => {
    onOpenChange(false);
    setForm(valoresIniciales);
    setRolMeta(null);
    setError(null);
  };

  const enviar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.role_id) {
      setError('Selecciona un rol.');
      return;
    }
    setError(null);
    setEnviando(true);
    try {
      const r = await adminService.crearUsuario({
        email: form.email,
        nombre: form.nombre,
        role_id: form.role_id,
        telefono: form.telefono || null,
        matricula: requiereIngenieria ? form.matricula : null,
        profesion: requiereIngenieria ? form.profesion : null,
      });
      onCreado(r);
      cerrar();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'No se pudo crear la cuenta';
      setError(msg);
      toast.error('No se pudo crear la cuenta', { description: msg });
    } finally {
      setEnviando(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => (v ? onOpenChange(true) : cerrar())}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="size-5" />
            Crear cuenta
          </DialogTitle>
          <DialogDescription>
            La contraseña no la defines tú: el sistema envía un enlace de un solo uso (24 h) al correo
            de la persona.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={enviar} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Correo</Label>
            <Input
              id="email"
              type="email"
              required
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="nombre">Nombre</Label>
            <Input
              id="nombre"
              required
              minLength={3}
              value={form.nombre}
              onChange={(e) => setForm({ ...form, nombre: e.target.value })}
            />
          </div>

          <RoleSelect
            id="role_id"
            value={form.role_id}
            onChange={(role_id) => setForm({ ...form, role_id })}
            onRoleMeta={setRolMeta}
            disabled={enviando}
          />

          <div className="space-y-2">
            <Label htmlFor="telefono">Teléfono</Label>
            <Input
              id="telefono"
              value={form.telefono}
              onChange={(e) => setForm({ ...form, telefono: e.target.value })}
            />
          </div>

          {requiereIngenieria && (
            <>
              <p className="text-sm text-muted-foreground">
                <strong>Verifica la matrícula en copnia.gov.co</strong> antes de crear. Un ingeniero sin
                matrícula verificada no puede existir en el sistema.
              </p>
              <div className="space-y-2">
                <Label htmlFor="matricula">Matrícula COPNIA</Label>
                <Input
                  id="matricula"
                  required
                  value={form.matricula}
                  onChange={(e) => setForm({ ...form, matricula: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="profesion">Profesión</Label>
                <Input
                  id="profesion"
                  required
                  placeholder="Ingeniero Civil"
                  value={form.profesion}
                  onChange={(e) => setForm({ ...form, profesion: e.target.value })}
                />
              </div>
            </>
          )}

          {error && <p className="text-sm font-medium text-destructive">{error}</p>}

          <DialogFooter className="gap-2 sm:gap-0">
            <Button type="button" variant="secondary" onClick={cerrar} disabled={enviando}>
              Cancelar
            </Button>
            <Button type="submit" disabled={enviando}>
              {enviando ? 'Creando…' : 'Crear y enviar enlace'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
