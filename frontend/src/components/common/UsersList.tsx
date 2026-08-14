import { Pencil, Trash2 } from 'lucide-react';
import { DesktopTable, MobileDataList } from '@/components/common/ResponsiveTable';
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

function EstadoUsuario({ usuario }: { usuario: UsuarioAdmin }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {usuario.activo ? (
        <Badge variant="success">Activa</Badge>
      ) : (
        <Badge variant="destructive">Inactiva</Badge>
      )}
      {!usuario.clave_definida && <Badge variant="warning">Sin clave</Badge>}
    </div>
  );
}

function AccionesUsuario({
  usuario,
  puedeEliminar,
  onEditar,
  onEliminar,
}: {
  usuario: UsuarioAdmin;
  puedeEliminar: boolean;
  onEditar: (usuario: UsuarioAdmin) => void;
  onEliminar: (usuario: UsuarioAdmin) => void;
}) {
  return (
    <div className="flex shrink-0 gap-1">
      <Button
        type="button"
        size="icon"
        variant="outline"
        className="size-8"
        aria-label={`Editar ${usuario.nombre}`}
        onClick={() => onEditar(usuario)}
      >
        <Pencil className="size-4" />
      </Button>
      <Button
        type="button"
        size="icon"
        variant="outline"
        className="size-8 text-destructive hover:text-destructive"
        aria-label={`Desactivar ${usuario.nombre}`}
        disabled={!puedeEliminar}
        onClick={() => onEliminar(usuario)}
      >
        <Trash2 className="size-4" />
      </Button>
    </div>
  );
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
    <>
      <MobileDataList inset>
        {usuarios.map((u) => {
          const esYo = u.uuid === usuarioActualUuid;
          const puedeEliminar = u.activo && !esYo;

          return (
            <li key={u.uuid}>
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1 space-y-1">
                  <p className="truncate font-medium" title={u.nombre}>
                    {u.nombre}
                  </p>
                  <p className="truncate text-xs text-muted-foreground" title={u.email}>
                    {u.email}
                  </p>
                </div>
                <AccionesUsuario
                  usuario={u}
                  puedeEliminar={puedeEliminar}
                  onEditar={onEditar}
                  onEliminar={onEliminar}
                />
              </div>
              <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                <span>{u.role_name ?? 'Sin rol'}</span>
                <span aria-hidden>·</span>
                <span>Último acceso: {formatearFecha(u.ultimo_acceso)}</span>
              </div>
              <div className="mt-2">
                <EstadoUsuario usuario={u} />
              </div>
            </li>
          );
        })}
      </MobileDataList>

      <DesktopTable>
        <Table className="min-w-[720px]">
          <TableHeader>
            <TableRow>
              <TableHead>Nombre</TableHead>
              <TableHead>Correo</TableHead>
              <TableHead>Rol</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead>Último acceso</TableHead>
              <TableHead className="w-[88px] text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {usuarios.map((u) => {
              const esYo = u.uuid === usuarioActualUuid;
              const puedeEliminar = u.activo && !esYo;

              return (
                <TableRow key={u.uuid}>
                  <TableCell className="max-w-[140px] font-medium">
                    <span className="block truncate" title={u.nombre}>
                      {u.nombre}
                    </span>
                  </TableCell>
                  <TableCell className="max-w-[200px]">
                    <span className="block truncate text-muted-foreground" title={u.email}>
                      {u.email}
                    </span>
                  </TableCell>
                  <TableCell className="whitespace-nowrap">{u.role_name ?? 'Sin rol'}</TableCell>
                  <TableCell>
                    <EstadoUsuario usuario={u} />
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-muted-foreground">
                    {formatearFecha(u.ultimo_acceso)}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end">
                      <AccionesUsuario
                        usuario={u}
                        puedeEliminar={puedeEliminar}
                        onEditar={onEditar}
                        onEliminar={onEliminar}
                      />
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </DesktopTable>
    </>
  );
}
