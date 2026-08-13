import { Pencil, Trash2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { ETIQUETAS_ROL } from '@/components/common/RolSelect';
import type { UsuarioAdmin } from '@/types/admin';

function formatearFecha(iso: string | null) {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('es-CO', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

interface UsersListProps {
  usuarios: UsuarioAdmin[];
  usuarioActualUuid?: string;
  onEditar: (usuario: UsuarioAdmin) => void;
  onEliminar: (usuario: UsuarioAdmin) => void;
}

export function UsersList({
  usuarios,
  usuarioActualUuid,
  onEditar,
  onEliminar,
}: UsersListProps) {
  if (usuarios.length === 0) {
    return <p className="py-4 text-center text-sm text-muted-foreground">No hay usuarios registrados.</p>;
  }

  return (
    <Table className="w-full table-fixed text-sm">
      <TableHeader>
        <TableRow className="hover:bg-transparent">
          <TableHead className="h-10 w-[16%] px-4">Nombre</TableHead>
          <TableHead className="h-10 w-[24%] px-4">Correo</TableHead>
          <TableHead className="h-10 w-[18%] px-4">Rol</TableHead>
          <TableHead className="h-10 w-[14%] px-4">Estado</TableHead>
          <TableHead className="h-10 w-[14%] px-4">Último acceso</TableHead>
          <TableHead className="h-10 w-[14%] px-4 text-right">Acciones</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {usuarios.map((u) => {
          const esYo = u.uuid === usuarioActualUuid;
          const puedeEliminar = u.activo && !esYo;

          return (
            <TableRow key={u.uuid}>
              <TableCell className="px-4 py-3 font-medium">
                <span className="block truncate" title={u.nombre}>
                  {u.nombre}
                </span>
              </TableCell>
              <TableCell className="px-4 py-3">
                <span className="block truncate text-muted-foreground" title={u.email}>
                  {u.email}
                </span>
              </TableCell>
              <TableCell className="px-4 py-3">{ETIQUETAS_ROL[u.rol]}</TableCell>
              <TableCell className="px-4 py-3">
                <div className="flex flex-wrap gap-1.5">
                  {u.activo ? (
                    <Badge variant="success">Activa</Badge>
                  ) : (
                    <Badge variant="destructive">Inactiva</Badge>
                  )}
                  {!u.clave_definida && <Badge variant="warning">Sin clave</Badge>}
                </div>
              </TableCell>
              <TableCell className="px-4 py-3 text-muted-foreground">
                {formatearFecha(u.ultimo_acceso)}
              </TableCell>
              <TableCell className="px-4 py-3">
                <div className="flex justify-end gap-1">
                  <Button
                    type="button"
                    size="icon"
                    variant="outline"
                    className="size-8"
                    aria-label={`Editar ${u.nombre}`}
                    onClick={() => onEditar(u)}
                  >
                    <Pencil className="size-4" />
                  </Button>
                  <Button
                    type="button"
                    size="icon"
                    variant="outline"
                    className="size-8 text-destructive hover:text-destructive"
                    aria-label={`Desactivar ${u.nombre}`}
                    disabled={!puedeEliminar}
                    onClick={() => onEliminar(u)}
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}
