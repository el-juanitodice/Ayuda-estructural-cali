import { useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import QRCode from 'qrcode';
import { campoService } from '@/api/campo/campo.service';
import { estadoConRadicado } from '@/constants/routes';
import type { FormularioResponse, HabitabilidadColor } from '@/types/revision';

export function useNoticePage() {
  const [params] = useSearchParams();
  const uuid = params.get('uuid') ?? '';

  const [datos, setDatos] = useState<FormularioResponse | null>(null);
  const [qr, setQr] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(() =>
    uuid ? null : 'Falta el identificador del formulario (?uuid=…).',
  );
  const [isLoading, setIsLoading] = useState(Boolean(uuid));

  const load = useCallback(async () => {
    if (!uuid) return;

    setIsLoading(true);
    setError(null);

    try {
      const r = await campoService.obtenerFormulario(uuid);
      setDatos(r);

      if (r.formulario.consecutivo) {
        const urlFicha = `${window.location.origin}${estadoConRadicado(r.formulario.consecutivo)}`;
        const dataUrl = await QRCode.toDataURL(urlFicha, { width: 220, margin: 1 });
        setQr(dataUrl);
      } else {
        setQr(null);
      }
    } catch (e) {
      setDatos(null);
      setQr(null);
      setError(e instanceof Error ? e.message : 'No se pudo cargar el aviso');
    } finally {
      setIsLoading(false);
    }
  }, [uuid]);

  useEffect(() => {
    void load();
  }, [load]);

  const formulario = datos?.formulario ?? null;
  const color = formulario?.habitabilidad_final as HabitabilidadColor | undefined;
  const dictamenFirmado =
    formulario?.estado === 'firmado' && Boolean(formulario.habitabilidad_final);

  return {
    uuid,
    formulario,
    qr,
    color,
    dictamenFirmado,
    error,
    isLoading,
  };
}
