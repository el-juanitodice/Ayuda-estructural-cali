import { useCallback, useEffect, useState } from 'react';
import { campoService } from '@/api/campo/campo.service';
import type { ItemColaRevision } from '@/types/revision';

export function useReviewPage() {
  const [pendientes, setPendientes] = useState<ItemColaRevision[]>([]);
  const [historial, setHistorial] = useState<ItemColaRevision[]>([]);
  const [abierto, setAbierto] = useState<ItemColaRevision | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [cargando, setCargando] = useState(true);

  const cargar = useCallback(() => {
    setCargando(true);
    setError(null);
    campoService.colaRevision()
      .then((r) => {
        setPendientes(r.pendientes);
        setHistorial(r.historial);
        setAbierto(null);
      })
      .catch((e) => setError(e instanceof Error ? e.message : 'No se pudo cargar la cola'))
      .finally(() => setCargando(false));
  }, []);

  useEffect(() => {
    cargar();
  }, [cargar]);

  const onFirmado = useCallback(() => {
    setPendientes((prev) => prev.filter((i) => i.formulario_uuid !== abierto?.formulario_uuid));
    cargar();
  }, [abierto?.formulario_uuid, cargar]);

  return {
    pendientes,
    historial,
    abierto,
    setAbierto,
    error,
    cargando,
    cargar,
    onFirmado,
  };
}
