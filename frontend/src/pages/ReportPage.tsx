import { useCallback, useState } from 'react';
import { useForm } from 'react-hook-form';
import { Megaphone } from 'lucide-react';
import { toast } from 'sonner';
import { requiereLlamar123 } from '@shared/ais.js';
import { Emergency123Dialog } from '@/components/report/Emergency123Dialog';
import { ReportDetailsPanel } from '@/components/report/ReportDetailsPanel';
import { ReportSituationPanel } from '@/components/report/ReportSituationPanel';
import { valoresInicialesReporte, type ReporteForm } from '@/components/report/report-form.types';
import { useConsultReport } from '@/contexts/ConsultReportContext';
import { Form } from '@/components/ui/form';
import { encolarFotosReporte } from '@/lib/fotos/cola-subida';
import { construirPayloadReporte, gpsEnAreaCali, type UbicacionReporte } from '@/lib/reporte';
import { ErrorApi } from '@/api/http.client';
import { reportesService } from '@/api/reportes/reportes.service';
import type { CrearReporteResponse } from '@/types/report';

export function ReportPage() {
  const { abrirConsulta } = useConsultReport();
  const [ubicacion, setUbicacion] = useState<UbicacionReporte | null>(null);
  const [fotos, setFotos] = useState<File[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [radicadoEmergencia, setRadicadoEmergencia] = useState<CrearReporteResponse | null>(null);
  const [modalEmergencia, setModalEmergencia] = useState(false);
  const [reporteGuardadoEnEmergencia, setReporteGuardadoEnEmergencia] = useState(false);

  const form = useForm<ReporteForm>({
    defaultValues: valoresInicialesReporte,
  });

  const valores = form.watch();

  const notificarReporteRecibido = useCallback(
    (consecutivo: string, fotosEncoladas = 0) => {
      const extraFotos =
        fotosEncoladas > 0
          ? ` ${fotosEncoladas} foto(s) se suben en segundo plano; puedes cerrar la página.`
          : '';
      toast.success('Reporte recibido', {
        description: `${consecutivo} — guárdalo. Un moderador te llamará al teléfono indicado.${extraFotos}`,
        action: {
          label: 'Consultar',
          onClick: () => abrirConsulta(consecutivo),
        },
        duration: 12000,
      });
      form.reset(valoresInicialesReporte);
      setUbicacion(null);
      setFotos([]);
      setRadicadoEmergencia(null);
      setReporteGuardadoEnEmergencia(false);
      setError(null);
    },
    [form, abrirConsulta],
  );

  const encolarFotosSeleccionadas = useCallback(async (reporteUuid: string) => {
    if (!fotos.length) return 0;
    return encolarFotosReporte(reporteUuid, fotos);
  }, [fotos]);

  const esEmergencia = useCallback(() => {
    return requiereLlamar123(valores.descripcion ?? '', {
      personasAtrapadas: valores.personasAtrapadas,
      colapsoEnCurso: valores.colapsoEnCurso,
    });
  }, [valores.descripcion, valores.personasAtrapadas, valores.colapsoEnCurso]);

  const enviarReporte = async (datos: ReporteForm, yaReconocioEmergencia = false) => {
    setError(null);
    if (!ubicacion) {
      const msg = 'Marca la ubicación del predio en el mapa.';
      setError(msg);
      toast.error(msg);
      return;
    }
    if (!gpsEnAreaCali(ubicacion.lat, ubicacion.lng)) {
      const msg =
        'La ubicación está fuera del área de Cali. Coloca el marcador sobre el predio dentro de Cali.';
      setError(msg);
      toast.error(msg);
      return;
    }
    if (esEmergencia() && !yaReconocioEmergencia) {
      setReporteGuardadoEnEmergencia(false);
      setRadicadoEmergencia(null);
      setModalEmergencia(true);
      return;
    }

    setEnviando(true);
    try {
      const r = await reportesService.crearReporte(construirPayloadReporte(datos, ubicacion));
      const fotosEncoladas = await encolarFotosSeleccionadas(r.uuid);
      setModalEmergencia(false);
      notificarReporteRecibido(r.consecutivo, fotosEncoladas);
    } catch (e) {
      if (e instanceof ErrorApi && e.codigo === 'emergencia_123') {
        const guardado = {
          uuid: e.cuerpo.uuid ?? '',
          consecutivo: e.cuerpo.consecutivo ?? '',
        };
        if (yaReconocioEmergencia) {
          const fotosEncoladas = await encolarFotosSeleccionadas(guardado.uuid);
          setModalEmergencia(false);
          notificarReporteRecibido(guardado.consecutivo, fotosEncoladas);
          return;
        }
        setRadicadoEmergencia(guardado);
        setReporteGuardadoEnEmergencia(true);
        setModalEmergencia(true);
        return;
      }
      const msg = e instanceof Error ? e.message : 'No se pudo enviar el reporte';
      setError(msg);
      toast.error('No se pudo enviar el reporte', { description: msg });
    } finally {
      setEnviando(false);
    }
  };

  const onContinuarEmergencia = () => {
    setModalEmergencia(false);
    if (reporteGuardadoEnEmergencia && radicadoEmergencia) {
      void encolarFotosSeleccionadas(radicadoEmergencia.uuid).then((fotosEncoladas) => {
        notificarReporteRecibido(radicadoEmergencia.consecutivo, fotosEncoladas);
      });
      return;
    }
    void form.handleSubmit((datos) => enviarReporte(datos, true))();
  };

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
