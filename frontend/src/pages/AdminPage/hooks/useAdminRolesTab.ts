import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { toast } from '@/lib/toast';
import { roleMatrixService } from '@/api/admin/role-matrix.service';
import { adminRolesService } from '@/api/admin/roles.service';
import type { AdminRole, MatrixRowDto, SetMatrixRowInput } from '@/types/roles';

export function useAdminRolesTab() {
  const [roles, setRoles] = useState<AdminRole[]>([]);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingRole, setEditingRole] = useState<AdminRole | null>(null);
  const [editName, setEditName] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const [deletingRole, setDeletingRole] = useState<AdminRole | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const [matrixRole, setMatrixRole] = useState<AdminRole | null>(null);
  const [matrixDraft, setMatrixDraft] = useState<MatrixRowDto[] | null>(null);
  const [isMatrixLoading, setIsMatrixLoading] = useState(false);
  const [isMatrixSaving, setIsMatrixSaving] = useState(false);
  const [matrixError, setMatrixError] = useState('');

  const loadRoles = useCallback(async () => {
    setIsLoading(true);
    setError('');
    try {
      setRoles(await adminRolesService.getRoles());
    } catch (err) {
      const message = err instanceof Error ? err.message : 'No se pudieron cargar los roles';
      setError(message);
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadRoles();
  }, [loadRoles]);

  const openEditDialog = useCallback((role: AdminRole) => {
    setEditingRole(role);
    setEditName(role.name);
    setEditDescription(role.description);
    setError('');
  }, []);

  const closeEditDialog = useCallback(() => {
    setEditingRole(null);
    setError('');
  }, []);

  const openDeleteDialog = useCallback((role: AdminRole) => {
    setDeletingRole(role);
  }, []);

  const closeDeleteDialog = useCallback(() => {
    setDeletingRole(null);
  }, []);

  const openMatrixDialog = useCallback((role: AdminRole) => {
    setMatrixRole(role);
    setMatrixError('');
    setMatrixDraft(null);
    setIsMatrixLoading(true);

    void roleMatrixService
      .getMatrix(role.id)
      .then((data) => {
        setMatrixDraft(
          data.rows.map((row) => ({
            ...row,
            app_module: { ...row.app_module },
          })),
        );
      })
      .catch((err) => {
        const message = err instanceof Error ? err.message : 'No se pudieron cargar los permisos';
        setMatrixError(message);
        toast.error(message);
        setMatrixRole(null);
      })
      .finally(() => {
        setIsMatrixLoading(false);
      });
  }, []);

  const closeMatrixDialog = useCallback(() => {
    setMatrixRole(null);
    setMatrixDraft(null);
    setMatrixError('');
  }, []);

  const setMatrixCell = useCallback(
    (rowIndex: number, key: 'r' | 'w' | 'u' | 'd', value: boolean) => {
      setMatrixDraft((prev) => {
        if (!prev) return prev;
        return prev.map((row, i) => (i === rowIndex ? { ...row, [key]: value } : row));
      });
    },
    [],
  );

  const saveMatrix = useCallback(async () => {
    if (!matrixRole || !matrixDraft) return;

    const rows: SetMatrixRowInput[] = matrixDraft.map((row) => ({
      app_module_id: row.app_module.id,
      r: row.r,
      w: row.w,
      u: row.u,
      d: row.d,
    }));

    setIsMatrixSaving(true);
    setMatrixError('');
    try {
      await roleMatrixService.setMatrix(matrixRole.id, rows);
      setMatrixRole(null);
      setMatrixDraft(null);
      toast.success('Permisos guardados correctamente');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'No se pudieron guardar los permisos';
      setMatrixError(message);
      toast.error(message);
    } finally {
      setIsMatrixSaving(false);
    }
  }, [matrixDraft, matrixRole]);

  const createRole = useCallback(
    async (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();

      setIsSubmitting(true);
      setError('');
      try {
        await adminRolesService.createRole({
          name: name.trim(),
          description: description.trim(),
        });
        setName('');
        setDescription('');
        await loadRoles();
        toast.success('Rol creado correctamente');
      } catch (err) {
        const message = err instanceof Error ? err.message : 'No se pudo crear el rol';
        setError(message);
        toast.error(message);
      } finally {
        setIsSubmitting(false);
      }
    },
    [description, loadRoles, name],
  );

  const saveRoleEdit = useCallback(async () => {
    if (!editingRole) return;

    const nextName = editName.trim();
    const nextDescription = editDescription.trim();
    if (!nextName || !nextDescription) {
      const message = 'Nombre y descripción son obligatorios.';
      setError(message);
      toast.error(message);
      return;
    }

    setIsSavingEdit(true);
    setError('');
    try {
      const updatedRole = await adminRolesService.updateRole(editingRole.id, {
        name: nextName,
        description: nextDescription,
      });
      setRoles((prev) => prev.map((role) => (role.id === updatedRole.id ? updatedRole : role)));
      setEditingRole(null);
      toast.success('Rol actualizado correctamente');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'No se pudo actualizar el rol';
      setError(message);
      toast.error(message);
    } finally {
      setIsSavingEdit(false);
    }
  }, [editDescription, editName, editingRole]);

  const deleteRole = useCallback(async () => {
    if (!deletingRole) return;

    setIsDeleting(true);
    setError('');
    try {
      await adminRolesService.deleteRole(deletingRole.id);
      setRoles((prev) => prev.filter((role) => role.id !== deletingRole.id));
      setDeletingRole(null);
      toast.success('Rol eliminado correctamente');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'No se pudo eliminar el rol';
      setError(message);
      toast.error(message);
    } finally {
      setIsDeleting(false);
    }
  }, [deletingRole]);

  return {
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
  };
}
