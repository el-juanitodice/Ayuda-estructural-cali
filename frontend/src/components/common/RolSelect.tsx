import type { Rol } from '@/types/auth';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';

export const ETIQUETAS_ROL: Record<Rol, string> = {
  moderador: 'Moderador/a',
  ingeniero_b: 'Ingeniero/a nivel B (captura)',
  ingeniero_a: 'Ingeniero/a nivel A (dictamina)',
  coordinador: 'Coordinador/a',
  admin: 'Admin',
};

/** Etiquetas cortas para tablas y badges */
export const ETIQUETAS_ROL_CORTA: Record<Rol, string> = {
  moderador: 'Moderador',
  ingeniero_b: 'Ing. B',
  ingeniero_a: 'Ing. A',
  coordinador: 'Coord.',
  admin: 'Admin',
};

const ROLES_CREAR: Rol[] = ['moderador', 'ingeniero_b', 'ingeniero_a', 'coordinador', 'admin'];

interface RolSelectProps {
  id?: string;
  value: Rol;
  onChange: (rol: Rol) => void;
  disabled?: boolean;
  roles?: Rol[];
}

export function RolSelect({ id, value, onChange, disabled, roles = ROLES_CREAR }: RolSelectProps) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>Rol</Label>
      <Select value={value} onValueChange={(v) => onChange(v as Rol)} disabled={disabled}>
        <SelectTrigger id={id}>
          <SelectValue placeholder="Selecciona un rol" />
        </SelectTrigger>
        <SelectContent>
          {roles.map((rol) => (
            <SelectItem key={rol} value={rol}>
              {ETIQUETAS_ROL[rol]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

export function esRolIngeniero(rol: Rol) {
  return rol === 'ingeniero_a' || rol === 'ingeniero_b';
}
