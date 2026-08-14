import { Alert, AlertDescription } from '@/components/ui/alert';
import { NoticePrintCard, NoticeToolbar } from '@/components/notice/NoticePrintCard';
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
    <div>
      <NoticeToolbar />
      <NoticePrintCard formulario={formulario} qr={qr} color={color} />
    </div>
  );
}
