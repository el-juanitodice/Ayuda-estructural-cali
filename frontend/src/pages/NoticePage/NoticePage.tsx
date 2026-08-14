import { Alert, AlertDescription } from '@/components/ui/alert';
import { PageHeader } from '@/components/common/PageHeader';
import { NoticePrintCard, NoticeToolbar } from '@/components/notice/NoticePrintCard';
import { pageHeaders } from '@/constants/page-headers';
import { useNoticePage } from '@/pages/NoticePage/hooks/useNoticePage';

export function NoticePage() {
  const { formulario, qr, color, dictamenFirmado, error, isLoading } = useNoticePage();

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
