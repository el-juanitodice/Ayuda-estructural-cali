import { useState } from 'react';
import { LogOut } from 'lucide-react';

import { LogoutConfirmDialog } from '@/components/layout/LogoutConfirmDialog';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useAuth } from '@/hooks/useAuth';

function iniciales(nombre: string) {
  return nombre
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((parte) => parte[0]?.toUpperCase() ?? '')
    .join('');
}

export function StaffHeaderUser() {
  const { usuario } = useAuth();
  const [confirmOpen, setConfirmOpen] = useState(false);

  if (!usuario) return null;

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="group size-9 shrink-0 rounded-full bg-card/80 shadow-sm focus-visible:ring-0 data-[state=open]:bg-accent data-[state=open]:text-accent-foreground"
            aria-label={`Cuenta de ${usuario.nombre}`}
          >
            <Avatar className="h-8 w-8 border-0">
              <AvatarFallback className="bg-transparent text-xs font-semibold text-primary group-hover:text-accent-foreground group-data-[state=open]:text-accent-foreground select-none">
                {iniciales(usuario.nombre)}
              </AvatarFallback>
            </Avatar>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56" onCloseAutoFocus={(e) => e.preventDefault()}>
          <DropdownMenuLabel className="font-normal select-none">
            <p className="truncate text-sm font-semibold leading-tight">{usuario.nombre}</p>
            <p className="mt-0.5 truncate text-xs text-muted-foreground">
              {usuario.role_name ?? 'Sin rol'}
            </p>
            <p className="mt-1 truncate text-xs text-muted-foreground">{usuario.email}</p>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            className="text-destructive focus:text-destructive"
            onSelect={() => setConfirmOpen(true)}
          >
            <LogOut className="size-4" />
            Cerrar sesión
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <LogoutConfirmDialog open={confirmOpen} onOpenChange={setConfirmOpen} />
    </>
  );
}
