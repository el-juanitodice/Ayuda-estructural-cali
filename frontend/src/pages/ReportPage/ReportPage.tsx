import { Emergency123Dialog } from '@/components/report/Emergency123Dialog';
import { ReportDetailsPanel } from '@/components/report/ReportDetailsPanel';
import { ReportSituationPanel } from '@/components/report/ReportSituationPanel';
import { PageHeader } from '@/components/common/PageHeader';
import { pageHeaders } from '@/constants/page-headers';
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
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <PageHeader
        suppressTitle
        pinned
        eyebrow={pageHeaders.reportar.eyebrow}
        title={pageHeaders.reportar.title}
        description={pageHeaders.reportar.description}
      />

      <div className="min-h-0 flex-1 overflow-y-auto pt-4">
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
      </div>

      <Emergency123Dialog
        open={modalEmergencia}
        onContinuar={onContinuarEmergencia}
        reporteGuardado={reporteGuardadoEnEmergencia && radicadoEmergencia ? radicadoEmergencia : null}
      />
    </div>
  );
}
