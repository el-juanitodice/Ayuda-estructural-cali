import { Pencil, Shield, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
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
import { Switch } from '@/components/ui/switch';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { usePermissions } from '@/hooks/usePermissions';
import { useAdminRolesTab } from '@/pages/AdminPage/hooks/useAdminRolesTab';

export function AdminRolesTab() {
  const { puede } = usePermissions();
  const puedeCrear = puede('admin_roles', 'w');
  const puedeEditar = puede('admin_roles', 'u');
  const puedeEliminar = puede('admin_roles', 'd');

  const {
    roles,
    name,
    description,
    error,
    isLoading,
    isSubmitting,
    editingRole,
    editName,
    editDescription,
    isSavingEdit,
    deletingRole,
    isDeleting,
    matrixRole,
    matrixDraft,
    isMatrixLoading,
    isMatrixSaving,
    matrixError,
    setName,
    setDescription,
    setEditName,
    setEditDescription,
    setMatrixCell,
    createRole,
    openEditDialog,
    closeEditDialog,
    saveRoleEdit,
    openDeleteDialog,
    closeDeleteDialog,
    deleteRole,
    openMatrixDialog,
    closeMatrixDialog,
    saveMatrix,
  } = useAdminRolesTab();

  return (
    <div className="space-y-4">
      {puedeCrear ? (
        <Card>
          <CardContent className="p-4">
            <form
              onSubmit={createRole}
              className="grid gap-3 md:grid-cols-[1fr_1.5fr_auto] md:items-end"
            >
              <div className="space-y-2">
                <Label htmlFor="role-name">Nombre</Label>
                <Input
                  id="role-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ej. Coordinador"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="role-description">Descripción</Label>
                <Input
                  id="role-description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Qué puede hacer este rol"
                  required
                />
              </div>
              <Button type="submit" disabled={isSubmitting} className="w-full md:w-auto">
                {isSubmitting ? 'Creando…' : 'Crear rol'}
              </Button>
            </form>
          </CardContent>
        </Card>
      ) : null}

      {error ? <p className="text-sm font-medium text-destructive">{error}</p> : null}

      <Card>
        <CardContent className="border-b px-6 py-3 text-base font-medium">
          Roles ({roles.length})
        </CardContent>
        <CardContent className="px-6 pb-4 pt-0">
          {isLoading ? (
            <p className="py-6 text-sm text-muted-foreground">Cargando roles…</p>
          ) : roles.length === 0 ? (
            <p className="py-6 text-sm text-muted-foreground">No hay roles registrados.</p>
          ) : (
            <div className="overflow-x-auto">
              <Table className="min-w-[560px]">
                <TableHeader>
                  <TableRow>
                    <TableHead>Nombre</TableHead>
                    <TableHead>Descripción</TableHead>
                    <TableHead className="w-[132px] text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {roles.map((role) => (
                    <TableRow key={role.id}>
                      <TableCell className="font-medium">{role.name}</TableCell>
                      <TableCell className="text-muted-foreground">{role.description}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          {puedeEditar ? (
                            <Button
                              type="button"
                              size="icon"
                              variant="outline"
                              className="size-8"
                              aria-label={`Editar ${role.name}`}
                              onClick={() => openEditDialog(role)}
                            >
                              <Pencil className="size-4" />
                            </Button>
                          ) : null}
                          <Button
                            type="button"
                            size="icon"
                            variant="outline"
                            className="size-8"
                            aria-label={`Permisos de ${role.name}`}
                            onClick={() => openMatrixDialog(role)}
                          >
                            <Shield className="size-4" />
                          </Button>
                          {puedeEliminar ? (
                            <Button
                              type="button"
                              size="icon"
                              variant="outline"
                              className="size-8 text-destructive hover:text-destructive"
                              aria-label={`Eliminar ${role.name}`}
                              onClick={() => openDeleteDialog(role)}
                            >
                              <Trash2 className="size-4" />
                            </Button>
                          ) : null}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog
        open={Boolean(editingRole)}
        onOpenChange={(open) => {
          if (!open) closeEditDialog();
        }}
      >
        <DialogContent showClose={!isSavingEdit}>
          <DialogHeader>
            <DialogTitle>Editar rol</DialogTitle>
            <DialogDescription>Actualiza el nombre y la descripción del rol.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4">
            <div className="space-y-2">
              <Label htmlFor="edit-role-name">Nombre *</Label>
              <Input
                id="edit-role-name"
                value={editName}
                onChange={(event) => setEditName(event.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-role-description">Descripción *</Label>
              <Input
                id="edit-role-description"
                value={editDescription}
                onChange={(event) => setEditDescription(event.target.value)}
              />
            </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="secondary" onClick={closeEditDialog} disabled={isSavingEdit}>
              Cancelar
            </Button>
            <Button onClick={() => void saveRoleEdit()} disabled={isSavingEdit}>
              {isSavingEdit ? 'Guardando…' : 'Guardar cambios'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={Boolean(matrixRole)}
        onOpenChange={(open) => {
          if (!open) closeMatrixDialog();
        }}
      >
        <DialogContent className="max-w-3xl" showClose={!isMatrixSaving}>
          <DialogHeader>
            <DialogTitle>{matrixRole ? `Permisos: ${matrixRole.name}` : 'Permisos'}</DialogTitle>
            <DialogDescription>
              R = leer, W = crear, U = actualizar, D = eliminar. Solo puedes guardar si tienes
              permiso de actualización.
            </DialogDescription>
          </DialogHeader>

          {matrixError ? <p className="text-sm text-destructive">{matrixError}</p> : null}

          {isMatrixLoading || !matrixDraft ? (
            <p className="text-sm text-muted-foreground">Cargando módulos…</p>
          ) : (
            <div className="max-h-[min(60vh,520px)] overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Módulo</TableHead>
                    <TableHead className="w-16 text-center" title="Leer">
                      R
                    </TableHead>
                    <TableHead className="w-16 text-center" title="Crear">
                      W
                    </TableHead>
                    <TableHead className="w-16 text-center" title="Actualizar">
                      U
                    </TableHead>
                    <TableHead className="w-16 text-center" title="Eliminar">
                      D
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {matrixDraft.map((row, i) => (
                    <TableRow key={row.app_module.id}>
                      <TableCell>
                        <div className="font-medium leading-tight">{row.app_module.name}</div>
                        <code className="text-xs text-muted-foreground">{row.app_module.code}</code>
                      </TableCell>
                      {(['r', 'w', 'u', 'd'] as const).map((key) => (
                        <TableCell key={key} className="text-center">
                          <div className="flex justify-center">
                            <Switch
                              checked={row[key]}
                              disabled={!puedeEditar}
                              onCheckedChange={(value) => setMatrixCell(i, key, value)}
                              aria-label={`${row.app_module.name} — ${key.toUpperCase()}`}
                            />
                          </div>
                        </TableCell>
                      ))}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}

          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="secondary" onClick={closeMatrixDialog} disabled={isMatrixSaving}>
              Cerrar
            </Button>
            {puedeEditar ? (
              <Button
                onClick={() => void saveMatrix()}
                disabled={isMatrixSaving || !matrixDraft}
              >
                {isMatrixSaving ? 'Guardando…' : 'Guardar permisos'}
              </Button>
            ) : null}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={Boolean(deletingRole)}
        onOpenChange={(open) => {
          if (!open) closeDeleteDialog();
        }}
      >
        <DialogContent showClose={!isDeleting}>
          <DialogHeader>
            <DialogTitle>Eliminar rol</DialogTitle>
            <DialogDescription>
              Esta acción eliminará el rol {deletingRole?.name ?? ''} de forma permanente.
            </DialogDescription>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Si el rol está asignado a usuarios, la operación puede ser rechazada.
          </p>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="secondary" onClick={closeDeleteDialog} disabled={isDeleting}>
              Cancelar
            </Button>
            <Button variant="destructive" onClick={() => void deleteRole()} disabled={isDeleting}>
              {isDeleting ? 'Eliminando…' : 'Eliminar rol'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
