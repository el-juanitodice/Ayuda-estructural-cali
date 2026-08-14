import { Link } from 'react-router-dom';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { PageHeader } from '@/components/common/PageHeader';
import { NoticePrintCard, NoticeToolbar } from '@/components/notice/NoticePrintCard';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { pageHeaders } from '@/constants/page-headers';
import { routes } from '@/constants/routes';
import { useNoticePage } from '@/pages/NoticePage/hooks/useNoticePage';
import { usePermissions } from '@/hooks/usePermissions';

export function NoticePage() {
  const { uuid, formulario, qr, color, dictamenFirmado, error, isLoading } = useNoticePage();
  const { puede } = usePermissions();

  if (!uuid) {
    return (
      <div className="space-y-6">
        <PageHeader
          suppressTitle
          eyebrow={pageHeaders.aviso.eyebrow}
          title={pageHeaders.aviso.title}
          description={pageHeaders.aviso.description}
        />
        <Card>
          <CardContent className="space-y-4 px-6 py-6">
            <p className="text-sm text-muted-foreground">
              El aviso de habitabilidad se abre desde un dictamen firmado. En{' '}
              <strong className="text-foreground">Revisión</strong>, usa el enlace{' '}
              <em>Ver aviso / imprimir</em> del caso que quieras entregar en el predio.
            </p>
            {puede('revision', 'r') ? (
              <Button asChild>
                <Link to={routes.revision}>Ir a Revisión</Link>
              </Button>
            ) : (
              <p className="text-sm text-muted-foreground">
                Si no tienes acceso a Revisión, pide a un ingeniero nivel A que genere el aviso.
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isLoading) {
    return <p className="text-muted-foreground">Cargando aviso…</p>;
  }

  if (error || !formulario) {
    return (
      <Alert variant="destructive">
        <AlertDescription>{error ?? 'No se encontró el formulario.'}</AlertDescription>
      </Alert>
    );
  }

  if (!dictamenFirmado || !color) {
    return (
      <Alert variant="destructive">
        <AlertDescription>Este formulario aún no tiene dictamen firmado.</AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        suppressTitle
        eyebrow={pageHeaders.aviso.eyebrow}
        title={pageHeaders.aviso.title}
        description={pageHeaders.aviso.description}
      />
      <NoticeToolbar />
      <NoticePrintCard formulario={formulario} qr={qr} color={color} />
    </div>
  );
}
