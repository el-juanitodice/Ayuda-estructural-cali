import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { ETIQUETA_HABITABILIDAD, verificarHabitabilidad } from '@shared/ais.js';
import { authService } from '@/api/auth/auth.service';
import { campoService } from '@/api/campo/campo.service';
import type {
  FirmarResponse,
  FormularioResponse,
  HabitabilidadColor,
  ItemColaRevision,
  NivelRiesgo,
  RiesgosDictamen,
} from '@/types/revision';

export function useReviewDetalle(
  item: ItemColaRevision,
  editable: boolean,
  onFirmado: () => void,
) {
  const [datos, setDatos] = useState<FormularioResponse | null>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [riesgos, setRiesgos] = useState<RiesgosDictamen>({
    estabilidad: '',
    geotecnico: '',
    estructural: '',
    no_estructural: '',
  });
  const [colorFinal, setColorFinal] = useState<HabitabilidadColor | ''>('');
  const [motivo, setMotivo] = useState('');
  const [visita, setVisita] = useState(false);
  const [clave, setClave] = useState('');
  const [pidiendoClave, setPidiendoClave] = useState(false);
  const [firmando, setFirmando] = useState(false);
  const [resultado, setResultado] = useState<FirmarResponse | null>(null);

  useEffect(() => {
    setCargando(true);
    campoService.obtenerFormulario(item.formulario_uuid)
      .then((r) => {
        setDatos(r);
        if (!editable && r.formulario.estado === 'firmado') {
          setRiesgos({
            estabilidad: (r.formulario.riesgo_estabilidad as NivelRiesgo) || '',
            geotecnico: (r.formulario.riesgo_geotecnico as NivelRiesgo) || '',
            estructural: (r.formulario.riesgo_estructural as NivelRiesgo) || '',
            no_estructural: (r.formulario.riesgo_no_estructural as NivelRiesgo) || '',
          });
          setColorFinal(r.formulario.habitabilidad_final ?? '');
          setMotivo(r.formulario.motivo_discrepancia ?? '');
          setVisita(Boolean(r.formulario.visita_presencial_a));
        }
      })
      .catch((e) => setError(e instanceof Error ? e.message : 'No se pudo cargar'))
      .finally(() => setCargando(false));
  }, [item.formulario_uuid, editable]);

  const chequeo = useMemo(
    () =>
      verificarHabitabilidad(
        {
          estabilidad: riesgos.estabilidad || '',
          geotecnico: riesgos.geotecnico || '',
          estructural: riesgos.estructural || '',
          no_estructural: riesgos.no_estructural || '',
        },
        colorFinal || null,
      ),
    [riesgos, colorFinal],
  );

  const discrepancia = chequeo.discrepancia === true;
  const puedeFirmar =
    !!chequeo.sugerida &&
    !!colorFinal &&
    (!discrepancia || motivo.trim().length >= 5);

  const firmar = async () => {
    setError(null);
    setFirmando(true);
    try {
      const { ticket_firma } = await authService.reautenticar(clave);
      const r = await campoService.firmarDictamen(item.formulario_uuid, {
        ticket_firma,
        riesgos: {
          estabilidad: riesgos.estabilidad,
          geotecnico: riesgos.geotecnico,
          estructural: riesgos.estructural,
          no_estructural: riesgos.no_estructural,
        },
        habitabilidad_final: colorFinal,
        motivo_discrepancia: discrepancia ? motivo : null,
        visita_presencial: visita,
      });
      setResultado(r);
      toast.success('Dictamen firmado', {
        description: `${item.consecutivo} — ${ETIQUETA_HABITABILIDAD[r.habitabilidad_final]}`,
      });
      onFirmado();
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'No se pudo firmar';
      setError(msg);
      toast.error('No se pudo firmar el dictamen', { description: msg });
      setPidiendoClave(false);
    } finally {
      setClave('');
      setFirmando(false);
    }
  };

  return {
    datos,
    cargando,
    error,
    riesgos,
    setRiesgos,
    colorFinal,
    setColorFinal,
    motivo,
    setMotivo,
    visita,
    setVisita,
    clave,
    setClave,
    pidiendoClave,
    setPidiendoClave,
    firmando,
    resultado,
    chequeo,
    discrepancia,
    puedeFirmar,
    firmar,
  };
}
