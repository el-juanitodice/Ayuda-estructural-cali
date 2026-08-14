import { useCallback, useEffect, useState } from 'react';
import { refrescarAsignacionesCampo } from '@/lib/campo/sync';
import type { AsignacionCampo, MisAsignacionesResponse } from '@/types/campo';

export function useFieldPage() {
  const [activas, setActivas] = useState<AsignacionCampo[]>([]);
  const [historial, setHistorial] = useState<AsignacionCampo[]>([]);
  const [fotosPorReporte, setFotosPorReporte] = useState<MisAsignacionesResponse['fotos']>({});
  const [abierta, setAbierta] = useState<AsignacionCampo | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [cargando, setCargando] = useState(true);
  const [desdeCache, setDesdeCache] = useState(false);

  const cargar = useCallback(() => {
    setCargando(true);
    setError(null);
    const enLinea = navigator.onLine;
    refrescarAsignacionesCampo()
      .then((r) => {
        setActivas(r.activas);
        setHistorial(r.historial);
        setFotosPorReporte(r.fotos);
        setDesdeCache(!enLinea);
        setAbierta(null);
      })
      .catch((e) => setError(e instanceof Error ? e.message : 'No se pudo cargar'))
      .finally(() => setCargando(false));
  }, []);

  useEffect(() => {
    cargar();
  }, [cargar]);

  return {
    activas,
    historial,
    fotosPorReporte,
    abierta,
    setAbierta,
    error,
    cargando,
    desdeCache,
    cargar,
  };
}
