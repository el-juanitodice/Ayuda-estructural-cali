import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useLoginPage } from '@/pages/LoginPage/hooks/useLoginPage';

interface LoginPageProps {
  redirectTo?: string;
}

export function LoginPage({ redirectTo }: LoginPageProps) {
  const { form, error, info, isSubmitting, login, recuperarClave } = useLoginPage(redirectTo);
  const { register, handleSubmit } = form;

  return (
    <Card className="mx-auto max-w-md">
      <CardHeader>
        <CardTitle>Ingreso del personal</CardTitle>
        <CardDescription>
          Solo cuentas creadas por el administrador. El registro está cerrado.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(login)} noValidate className="space-y-4">
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
            <Button type="button" variant="secondary" onClick={() => void recuperarClave()}>
              Olvidé mi contraseña
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
