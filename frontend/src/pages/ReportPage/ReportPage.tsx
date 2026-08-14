import { Emergency123Dialog } from '@/components/report/Emergency123Dialog';
import { ReportDetailsPanel } from '@/components/report/ReportDetailsPanel';
import { ReportSituationPanel } from '@/components/report/ReportSituationPanel';
import { PageHeader } from '@/components/common/PageHeader';
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
      <PageHeader
        eyebrow="Ciudadanía"
        title="Reportar daños"
        description="Describe la situación del predio y marca su ubicación. Un moderador te llamará para confirmar los datos."
      />

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
