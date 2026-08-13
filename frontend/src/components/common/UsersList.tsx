import { Badge } from '@/components/ui/badge';
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
}

export function UsersList({ usuarios }: UsersListProps) {
  if (usuarios.length === 0) {
    return <p className="py-4 text-center text-sm text-muted-foreground">No hay usuarios registrados.</p>;
  }

  return (
    <Table className="w-full table-fixed text-sm">
      <TableHeader>
        <TableRow className="hover:bg-transparent">
          <TableHead className="h-10 w-[18%] px-4">Nombre</TableHead>
          <TableHead className="h-10 w-[28%] px-4">Correo</TableHead>
          <TableHead className="h-10 w-[24%] px-4">Rol</TableHead>
          <TableHead className="h-10 w-[14%] px-4">Estado</TableHead>
          <TableHead className="h-10 w-[16%] px-4">Último acceso</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {usuarios.map((u) => (
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
            <TableCell className="px-4 py-3 text-muted-foreground">{formatearFecha(u.ultimo_acceso)}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
