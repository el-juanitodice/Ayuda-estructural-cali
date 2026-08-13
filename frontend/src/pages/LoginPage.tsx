import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/contexts/AuthContext';
import { routes } from '@/constants/routes';
import { post } from '@/lib/api';
import type { Usuario } from '@/types/auth';

interface LoginForm {
  email: string;
  clave: string;
}

interface LoginPageProps {
  redirectTo?: string;
}

function destinoTrasLogin(usuario: Usuario): string {
  if (usuario.rol === 'admin') return routes.admin;
  if (usuario.rol === 'moderador') return routes.moderacion;
  if (usuario.rol === 'coordinador') return routes.tablero;
  if (usuario.rol === 'ingeniero_a') return routes.revision;
  if (usuario.rol === 'ingeniero_b') return routes.campo;
  return routes.home;
}

export function LoginPage({ redirectTo }: LoginPageProps) {
  const navigate = useNavigate();
  const { entrar } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    getValues,
    formState: { isSubmitting },
  } = useForm<LoginForm>({
    defaultValues: { email: '', clave: '' },
  });

  const onSubmit = async (datos: LoginForm) => {
    setError(null);
    setInfo(null);
    try {
      const r = await post<{ accessToken: string; usuario: Usuario }>('/auth/login', datos);
      entrar(r.usuario, r.accessToken);
      navigate(redirectTo || destinoTrasLogin(r.usuario), { replace: true });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo iniciar sesión');
    }
  };

  const recuperar = async () => {
    const email = getValues('email');
    if (!email) {
      setError('Escribe tu correo primero.');
      return;
    }
    setError(null);
    await post('/auth/recuperar', { email }).catch(() => {});
    setInfo('Si el correo existe, te llegará un enlace de recuperación.');
  };

  return (
    <Card className="mx-auto max-w-md">
      <CardHeader>
        <CardTitle>Ingreso del personal</CardTitle>
        <CardDescription>
          Solo cuentas creadas por el administrador. El registro está cerrado.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Correo</Label>
            <Input id="email" type="email" autoComplete="email" {...register('email', { required: true })} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="clave">Contraseña</Label>
            <Input
              id="clave"
              type="password"
              autoComplete="current-password"
              {...register('clave', { required: true })}
            />
          </div>

          {error && <p className="text-sm font-medium text-destructive">{error}</p>}
          {info && <p className="text-sm text-green-700">{info}</p>}

          <div className="flex flex-wrap gap-2">
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Entrando…' : 'Entrar'}
            </Button>
            <Button type="button" variant="secondary" onClick={recuperar}>
              Olvidé mi contraseña
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
