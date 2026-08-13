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
import { construirPayloadReporte, gpsEnAreaCali } from '@/lib/reporte';
import { ErrorApi, post } from '@/lib/api';

interface GpsCoords {
  lat: number;
  lng: number;
  precision: number;
}

interface CrearReporteResponse {
  uuid: string;
  consecutivo: string;
}

export function ReportPage() {
  const { abrirConsulta } = useConsultReport();
  const [gps, setGps] = useState<GpsCoords | null>(null);
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
      setGps(null);
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

  const pedirGps = () => {
    setError(null);
    if (!window.isSecureContext) {
      setError(
        'El GPS requiere conexión segura (HTTPS). Abre la app con https:// en lugar de http://.',
      );
      return;
    }
    if (!navigator.geolocation) {
      setError('Tu navegador no soporta geolocalización.');
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (p) =>
        setGps({
          lat: p.coords.latitude,
          lng: p.coords.longitude,
          precision: Math.round(p.coords.accuracy),
        }),
      (err) => {
        if (err.code === err.PERMISSION_DENIED) {
          setError('Permiso de ubicación denegado. Actívalo en los ajustes del navegador.');
          return;
        }
        if (err.code === err.TIMEOUT) {
          setError('Tiempo agotado. Activa GPS de alta precisión e intenta de nuevo.');
          return;
        }
        setError('No pudimos obtener tu ubicación. Activa el GPS e intenta de nuevo.');
      },
      { enableHighAccuracy: true, timeout: 15000 },
    );
  };

  const enviarReporte = async (datos: ReporteForm, yaReconocioEmergencia = false) => {
    setError(null);
    if (!gps) {
      setError('Necesitamos la ubicación del predio. Toca el botón GPS.');
      return;
    }
    if (!gpsEnAreaCali(gps.lat, gps.lng)) {
      setError(
        'La ubicación GPS está fuera del área de Cali. Activa la ubicación en el predio o acércate a Cali para reportar.',
      );
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
      const r = await post<CrearReporteResponse>('/reportes', construirPayloadReporte(datos, gps));
      const fotosEncoladas = await encolarFotosSeleccionadas(r.uuid);
      setModalEmergencia(false);
      notificarReporteRecibido(r.consecutivo, fotosEncoladas);
    } catch (e) {
      if (e instanceof ErrorApi && e.codigo === 'emergencia_123') {
        const guardado = {
          uuid: e.cuerpo.uuid ?? '',
          consecutivo: e.cuerpo.consecutivo ?? '',
        };
        setRadicadoEmergencia(guardado);
        setReporteGuardadoEnEmergencia(true);
        setModalEmergencia(true);
        return;
      }
      setError(e instanceof Error ? e.message : 'No se pudo enviar el reporte');
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
          className="grid min-h-0 gap-4 lg:grid-cols-2 lg:items-stretch lg:gap-6 lg:min-h-[calc(100svh-12rem)]"
        >
          <ReportSituationPanel
            form={form}
            fotos={fotos}
            onFotosChange={setFotos}
            enviando={enviando}
          />
          <ReportDetailsPanel form={form} gps={gps} onPedirGps={pedirGps} error={error} enviando={enviando} />
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
