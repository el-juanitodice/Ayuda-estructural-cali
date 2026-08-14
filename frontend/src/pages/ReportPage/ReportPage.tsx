import { Megaphone } from 'lucide-react';
import { Emergency123Dialog } from '@/components/report/Emergency123Dialog';
import { ReportDetailsPanel } from '@/components/report/ReportDetailsPanel';
import { ReportSituationPanel } from '@/components/report/ReportSituationPanel';
import { Form } from '@/components/ui/form';
import { useReportPage } from '@/pages/ReportPage/hooks/useReportPage';

export function ReportPage() {
  const {
    form,
    ubicacion,
    setUbicacion,
    fotos,
    setFotos,
    error,
    setError,
    enviando,
    modalEmergencia,
    reporteGuardadoEnEmergencia,
    radicadoEmergencia,
    enviarReporte,
    onContinuarEmergencia,
  } = useReportPage();

  return (
    <>
      <div className="mb-3 flex items-center gap-2">
        <Megaphone className="size-5 text-primary" aria-hidden />
        <h1 className="text-lg font-semibold">Reportar daños</h1>
      </div>

      <Form {...form}>
        <form
          onSubmit={form.handleSubmit((datos) => enviarReporte(datos))}
          noValidate
          className="grid gap-4 lg:grid-cols-2 lg:items-stretch lg:gap-6"
        >
          <ReportSituationPanel
            form={form}
            fotos={fotos}
            onFotosChange={setFotos}
            enviando={enviando}
          />
          <ReportDetailsPanel
            form={form}
            ubicacion={ubicacion}
            onUbicacionChange={setUbicacion}
            onUbicacionError={setError}
            error={error}
            enviando={enviando}
          />
        </form>
      </Form>

      <Emergency123Dialog
        open={modalEmergencia}
        onContinuar={onContinuarEmergencia}
        reporteGuardado={reporteGuardadoEnEmergencia && radicadoEmergencia ? radicadoEmergencia : null}
      />
    </>
  );
}
