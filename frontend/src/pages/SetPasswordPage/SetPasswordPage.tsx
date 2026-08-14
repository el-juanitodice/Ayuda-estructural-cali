import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { routes } from '@/constants/routes';
import { useSetPasswordPage } from '@/pages/SetPasswordPage/hooks/useSetPasswordPage';

interface SetPasswordPageProps {
  token: string;
}

export function SetPasswordPage({ token }: SetPasswordPageProps) {
  const { form, clave, error, isSubmitting, isSubmitSuccessful, onSubmit } = useSetPasswordPage(token);
  const { register, handleSubmit, formState: { errors } } = form;

  if (isSubmitSuccessful) {
    return (
      <Card className="mx-auto max-w-md">
        <CardHeader>
          <CardTitle className="text-green-700">Contraseña establecida</CardTitle>
          <CardDescription>Ya puedes ingresar con tu correo y la nueva contraseña.</CardDescription>
        </CardHeader>
        <CardContent>
          <Link to={routes.ingreso} className="font-semibold text-primary underline-offset-4 hover:underline">
            Ir al ingreso
          </Link>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="mx-auto max-w-md">
      <CardHeader>
        <CardTitle>Establecer contraseña</CardTitle>
        <CardDescription>El enlace expira en 24 horas. Usa una frase larga y única.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="clave">Nueva contraseña</Label>
            <Input
              id="clave"
              type="password"
              autoComplete="new-password"
              {...register('clave', {
                required: 'La contraseña es obligatoria',
                minLength: { value: 12, message: 'Mínimo 12 caracteres' },
              })}
            />
            {errors.clave && (
              <p className="text-sm font-medium text-destructive">{errors.clave.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirmar">Confirmar contraseña</Label>
            <Input
              id="confirmar"
              type="password"
              autoComplete="new-password"
              {...register('confirmar', {
                required: 'Confirma la contraseña',
                validate: (v) => v === clave || 'Las contraseñas no coinciden',
              })}
            />
            {errors.confirmar && (
              <p className="text-sm font-medium text-destructive">{errors.confirmar.message}</p>
            )}
          </div>

          {error && <p className="text-sm font-medium text-destructive">{error}</p>}

          <Button type="submit" disabled={isSubmitting || !token}>
            {isSubmitting ? 'Guardando…' : 'Guardar contraseña'}
          </Button>

          {!token && (
            <p className="text-sm text-destructive">Enlace inválido: falta el token en la URL.</p>
          )}
        </form>
      </CardContent>
    </Card>
  );
}
