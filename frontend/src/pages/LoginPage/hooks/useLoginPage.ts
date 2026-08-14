import { useCallback, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { authService } from '@/api/auth/auth.service';
import { useAuth } from '@/hooks/useAuth';
import { destinoPanel } from '@/lib/auth-routing';

export interface LoginForm {
  email: string;
  clave: string;
}

export function useLoginPage(redirectTo?: string) {
  const navigate = useNavigate();
  const { entrar } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  const form = useForm<LoginForm>({
    defaultValues: { email: '', clave: '' },
  });

  const login = useCallback(
    async (datos: LoginForm) => {
      setError(null);
      setInfo(null);
      try {
        const r = await authService.login(datos);
        entrar(r.usuario, r.accessToken);
        navigate(redirectTo || destinoPanel(r.usuario), { replace: true });
      } catch (e) {
        const msg = e instanceof Error ? e.message : 'No se pudo iniciar sesión';
        setError(msg);
        toast.error('No se pudo iniciar sesión', { description: msg });
      }
    },
    [entrar, navigate, redirectTo],
  );

  const recuperarClave = useCallback(async () => {
    const email = form.getValues('email');
    if (!email) {
      setError('Escribe tu correo primero.');
      toast.error('Escribe tu correo primero');
      return;
    }
    setError(null);
    await authService.recuperarClave(email).catch(() => {});
    const msg = 'Si el correo existe, te llegará un enlace de recuperación.';
    setInfo(msg);
    toast.info('Solicitud enviada', { description: msg });
  }, [form]);

  return {
    form,
    error,
    info,
    isSubmitting: form.formState.isSubmitting,
    login,
    recuperarClave,
  };
}
