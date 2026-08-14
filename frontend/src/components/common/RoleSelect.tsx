import { useEffect, useState } from 'react';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { adminService } from '@/api/admin/admin.service';
import type { RolOption } from '@/types/auth';

interface RoleSelectProps {
  id: string;
  value: string;
  onChange: (roleId: string) => void;
  disabled?: boolean;
  onRoleMeta?: (role: RolOption | null) => void;
}

export function RoleSelect({ id, value, onChange, disabled, onRoleMeta }: RoleSelectProps) {
  const [roles, setRoles] = useState<RolOption[]>([]);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    let activo = true;
    void adminService.listarRoles().then((lista) => {
      if (activo) {
        setRoles(lista);
        setCargando(false);
      }
    });
    return () => {
      activo = false;
    };
  }, []);

  useEffect(() => {
    onRoleMeta?.(roles.find((r) => r.id === value) ?? null);
  }, [roles, value, onRoleMeta]);

  return (
    <div className="space-y-2">
      <Label htmlFor={id}>Rol</Label>
      <Select value={value} onValueChange={onChange} disabled={disabled || cargando || !roles.length}>
        <SelectTrigger id={id}>
          <SelectValue placeholder={cargando ? 'Cargando roles…' : 'Selecciona un rol'} />
        </SelectTrigger>
        <SelectContent>
          {roles.map((rol) => (
            <SelectItem key={rol.id} value={rol.id}>
              {rol.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
