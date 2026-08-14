import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { moderacionService } from '@/api/moderacion/moderacion.service';
import type { ReporteCola } from '@/types/moderation';

export function puedeAsignarModeracion(reporte: ReporteCola) {
  return reporte.estado === 'validado' || reporte.estado === 'vencido';
}

export function useModerationPage() {
  const [enCola, setEnCola] = useState<ReporteCola[]>([]);
  const [historial, setHistorial] = useState<ReporteCola[]>([]);
  const [seleccionado, setSeleccionado] = useState<ReporteCola | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [cargando, setCargando] = useState(true);
  const [eliminandoUuid, setEliminandoUuid] = useState<string | null>(null);
  const [reporteAEliminar, setReporteAEliminar] = useState<ReporteCola | null>(null);

  const cargarCola = useCallback(async () => {
    setCargando(true);
    setError(null);
    try {
      const r = await moderacionService.obtenerCola();
      setEnCola(r.en_cola);
      setHistorial(r.historial);
      setSeleccionado(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo cargar la cola');
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    void cargarCola();
  }, [cargarCola]);

  const confirmarEliminacion = async () => {
    if (!reporteAEliminar) return;

    setEliminandoUuid(reporteAEliminar.uuid);
    setError(null);
    try {
      await moderacionService.eliminarReporte(reporteAEliminar.uuid);
      toast.success('Reporte eliminado', {
        description: reporteAEliminar.consecutivo ?? reporteAEliminar.uuid,
      });
      if (seleccionado?.uuid === reporteAEliminar.uuid) setSeleccionado(null);
      setReporteAEliminar(null);
      await cargarCola();
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'No se pudo eliminar';
      setError(msg);
      toast.error('No se pudo eliminar', { description: msg });
    } finally {
      setEliminandoUuid(null);
    }
  };

  const abrirReporte = (reporte: ReporteCola) => {
    if (reporte.en_cola || puedeAsignarModeracion(reporte)) {
      setSeleccionado(reporte);
    }
  };

  return {
    enCola,
    historial,
    seleccionado,
    setSeleccionado,
    error,
    cargando,
    eliminandoUuid,
    reporteAEliminar,
    setReporteAEliminar,
    cargarCola,
    confirmarEliminacion,
    abrirReporte,
  };
}
