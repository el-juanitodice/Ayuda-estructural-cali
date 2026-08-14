import { useState } from 'react';
import { LogOut } from 'lucide-react';

import { ETIQUETA_ROL } from '@/components/layout/nav-config';
import { LogoutConfirmDialog } from '@/components/layout/LogoutConfirmDialog';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
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
          <button
            type="button"
            className="rounded-full outline-none transition-opacity hover:opacity-90 focus:outline-none focus-visible:outline-none focus-visible:ring-0 data-[state=open]:outline-none"
            aria-label={`Cuenta de ${usuario.nombre}`}
          >
            <Avatar className="h-9 w-9 border border-border/60 select-none">
              <AvatarFallback className="bg-primary/10 text-xs font-semibold text-primary select-none">
                {iniciales(usuario.nombre)}
              </AvatarFallback>
            </Avatar>
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56" onCloseAutoFocus={(e) => e.preventDefault()}>
          <DropdownMenuLabel className="font-normal select-none">
            <p className="truncate text-sm font-semibold leading-tight">{usuario.nombre}</p>
            <p className="mt-0.5 truncate text-xs text-muted-foreground">{ETIQUETA_ROL[usuario.rol]}</p>
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
