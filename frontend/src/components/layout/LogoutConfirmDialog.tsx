import { useNavigate } from 'react-router-dom';

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { routes } from '@/constants/routes';
import { useAuth } from '@/hooks/useAuth';

interface LogoutConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onLoggedOut?: () => void;
}

export function LogoutConfirmDialog({ open, onOpenChange, onLoggedOut }: LogoutConfirmDialogProps) {
  const { salir } = useAuth();
  const navigate = useNavigate();

  const confirmar = () => {
    salir();
    navigate(routes.home);
    onOpenChange(false);
    onLoggedOut?.();
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>¿Cerrar sesión?</AlertDialogTitle>
          <AlertDialogDescription>
            Saldrás del panel del personal. Deberás volver a ingresar para acceder de nuevo.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            onClick={confirmar}
          >
            Cerrar sesión
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
