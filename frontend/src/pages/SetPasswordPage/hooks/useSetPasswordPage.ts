import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { authService } from '@/api/auth/auth.service';

export interface SetPasswordForm {
  clave: string;
  confirmar: string;
}

export function useSetPasswordPage(token: string) {
  const [error, setError] = useState<string | null>(null);
  const form = useForm<SetPasswordForm>({
    defaultValues: { clave: '', confirmar: '' },
  });

  const clave = form.watch('clave');

  const onSubmit = async (datos: SetPasswordForm) => {
    setError(null);
    try {
      await authService.definirClave(token, datos.clave);
      toast.success('Contraseña establecida', {
        description: 'Ya puedes ingresar con tu correo y la nueva contraseña.',
      });
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'No se pudo guardar la contraseña';
      setError(msg);
      toast.error('No se pudo guardar la contraseña', { description: msg });
      throw e;
    }
  };

  return {
    form,
    clave,
    error,
    token,
    isSubmitting: form.formState.isSubmitting,
    isSubmitSuccessful: form.formState.isSubmitSuccessful,
    onSubmit,
  };
}
