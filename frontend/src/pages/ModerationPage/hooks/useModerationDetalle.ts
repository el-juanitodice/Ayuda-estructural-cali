import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { moderacionService } from '@/api/moderacion/moderacion.service';
import { puedeAsignarModeracion } from '@/pages/ModerationPage/hooks/useModerationPage';
import type {
  IngenieroDisponible,
  MotivoDescarte,
  ReporteCola,
  ValidarResponse,
} from '@/types/moderation';
import type { FotoResumen } from '@/types/revision';

export const ETIQUETA_MOTIVO_DESCARTE: Record<MotivoDescarte, string> = {
  duplicado: 'duplicado',
  no_contesta: 'no contesta',
  fuera_de_zona: 'fuera de zona',
  spam: 'spam',
  otro: 'otro',
};

export function useModerationDetalle(reporte: ReporteCola, onActualizado: () => void) {
  const asignacionDirecta = puedeAsignarModeracion(reporte);
  const [notas, setNotas] = useState('');
  const [ingenieros, setIngenieros] = useState<IngenieroDisponible[]>([]);
  const [ingenieroId, setIngenieroId] = useState('');
  const [resultado, setResultado] = useState<ValidarResponse | null>(
    asignacionDirecta
      ? {
          ok: true,
          requiere_nivel_a: reporte.requiere_nivel_a,
          motivos: reporte.motivo_escalacion ?? [],
        }
      : null,
  );
  const [fotos, setFotos] = useState<FotoResumen[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [cargando, setCargando] = useState(false);

  useEffect(() => {
    moderacionService.fotosReporte(reporte.uuid)
      .then(setFotos)
      .catch(() => setFotos([]));
  }, [reporte.uuid]);

  useEffect(() => {
    if (asignacionDirecta) {
      moderacionService.listarIngenieros()
        .then(setIngenieros)
        .catch(() => {});
    }
  }, [asignacionDirecta]);

  useEffect(() => {
    if (resultado && !ingenieros.length) {
      moderacionService.listarIngenieros()
        .then(setIngenieros)
        .catch(() => {});
    }
  }, [resultado, ingenieros.length]);

  const validar = async () => {
    setError(null);
    setCargando(true);
    try {
      const r = await moderacionService.validar(reporte.uuid, {
        notas_llamada: notas,
      });
      setResultado(r);
      toast.success('Reporte validado', {
        description: reporte.consecutivo ?? reporte.uuid,
      });
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'No se pudo validar';
      setError(msg);
      toast.error('No se pudo validar', { description: msg });
    } finally {
      setCargando(false);
    }
  };

  const descartar = async (motivo: MotivoDescarte) => {
    setError(null);
    setCargando(true);
    try {
      await moderacionService.descartar(reporte.uuid, motivo);
      toast.success('Reporte descartado', {
        description: `${reporte.consecutivo ?? reporte.uuid} — ${ETIQUETA_MOTIVO_DESCARTE[motivo]}`,
      });
      onActualizado();
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'No se pudo descartar';
      setError(msg);
      toast.error('No se pudo descartar', { description: msg });
    } finally {
      setCargando(false);
    }
  };

  const asignar = async () => {
    setError(null);
    setCargando(true);
    try {
      await moderacionService.asignar(reporte.uuid, {
        ingeniero_id: Number(ingenieroId),
      });
      const ingeniero = ingenieros.find((i) => String(i.id) === ingenieroId);
      toast.success('Ingeniero asignado', {
        description: ingeniero
          ? `${reporte.consecutivo ?? reporte.uuid} → ${ingeniero.nombre}`
          : (reporte.consecutivo ?? reporte.uuid),
      });
      onActualizado();
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'No se pudo asignar';
      setError(msg);
      toast.error('No se pudo asignar', { description: msg });
    } finally {
      setCargando(false);
    }
  };

  const requiereA = resultado?.requiere_nivel_a;
  const elegibles = requiereA ? ingenieros.filter((i) => i.rol === 'ingeniero_a') : ingenieros;
  const soloLectura = !reporte.en_cola && !asignacionDirecta;

  return {
    asignacionDirecta,
    notas,
    setNotas,
    ingenieroId,
    setIngenieroId,
    resultado,
    fotos,
    error,
    cargando,
    requiereA,
    elegibles,
    soloLectura,
    validar,
    descartar,
    asignar,
  };
}
