import { PageHeader } from '@/components/common/PageHeader';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { pageHeaders } from '@/constants/page-headers';
import { ui } from '@/constants/styles';
import { useLoginPage } from '@/pages/LoginPage/hooks/useLoginPage';
import { cn } from '@/lib/utils';

interface LoginPageProps {
  redirectTo?: string;
}

export function LoginPage({ redirectTo }: LoginPageProps) {
  const { form, error, info, isSubmitting, login, recuperarClave } = useLoginPage(redirectTo);
  const { register, handleSubmit } = form;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={pageHeaders.ingreso.eyebrow}
        title={pageHeaders.ingreso.title}
        description={pageHeaders.ingreso.description}
      />

      <div className="flex flex-col items-center justify-center pb-4">
        <Card className={cn(ui.elevatedCard, 'w-full max-w-md shadow-md ring-1 ring-border/60')}>
          <CardHeader className="sr-only">
            <CardTitle>{pageHeaders.ingreso.title}</CardTitle>
            <CardDescription>{pageHeaders.ingreso.description}</CardDescription>
          </CardHeader>
          <CardContent className="pt-6">
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
              {info && <p className="text-sm text-emerald-700">{info}</p>}

              <div className="flex flex-wrap gap-2 pt-1">
                <Button type="submit" disabled={isSubmitting} className="min-w-[7rem]">
                  {isSubmitting ? 'Entrando…' : 'Entrar'}
                </Button>
                <Button type="button" variant="outline" onClick={() => void recuperarClave()}>
                  Olvidé mi contraseña
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
