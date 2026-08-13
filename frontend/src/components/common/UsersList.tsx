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
      {/* Móvil: tarjetas apiladas */}
      <ul className="divide-y md:hidden">
        {usuarios.map((u) => {
          const esYo = u.uuid === usuarioActualUuid;
          const puedeEliminar = u.activo && !esYo;

          return (
            <li key={u.uuid} className="px-4 py-3">
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
                <span>{ETIQUETAS_ROL[u.rol]}</span>
                <span aria-hidden>·</span>
                <span>Último acceso: {formatearFecha(u.ultimo_acceso)}</span>
              </div>
              <div className="mt-2">
                <EstadoUsuario usuario={u} />
              </div>
            </li>
          );
        })}
      </ul>

      {/* Desktop: tabla */}
      <div className="hidden overflow-x-auto md:block">
        <Table className="w-full min-w-[720px] text-sm">
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="h-10 px-4">Nombre</TableHead>
              <TableHead className="h-10 px-4">Correo</TableHead>
              <TableHead className="h-10 px-4">Rol</TableHead>
              <TableHead className="h-10 px-4">Estado</TableHead>
              <TableHead className="h-10 px-4">Último acceso</TableHead>
              <TableHead className="h-10 w-[88px] px-4 text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {usuarios.map((u) => {
              const esYo = u.uuid === usuarioActualUuid;
              const puedeEliminar = u.activo && !esYo;

              return (
                <TableRow key={u.uuid}>
                  <TableCell className="max-w-[140px] px-4 py-3 font-medium">
                    <span className="block truncate" title={u.nombre}>
                      {u.nombre}
                    </span>
                  </TableCell>
                  <TableCell className="max-w-[200px] px-4 py-3">
                    <span className="block truncate text-muted-foreground" title={u.email}>
                      {u.email}
                    </span>
                  </TableCell>
                  <TableCell className="whitespace-nowrap px-4 py-3">
                    {ETIQUETAS_ROL[u.rol]}
                  </TableCell>
                  <TableCell className="px-4 py-3">
                    <EstadoUsuario usuario={u} />
                  </TableCell>
                  <TableCell className="whitespace-nowrap px-4 py-3 text-muted-foreground">
                    {formatearFecha(u.ultimo_acceso)}
                  </TableCell>
                  <TableCell className="px-4 py-3">
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
      </div>
    </>
  );
}
