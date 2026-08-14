import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { tableroService } from '@/api/tablero/tablero.service';
import type {
  CoberturaTableroResponse,
  DiscrepanciasTableroResponse,
  VencimientosTableroResponse,
} from '@/types/tablero';

export function useDashboardPage() {
  const [cobertura, setCobertura] = useState<CoberturaTableroResponse | null>(null);
  const [vencimientos, setVencimientos] = useState<VencimientosTableroResponse['asignaciones']>([]);
  const [discrepancias, setDiscrepancias] = useState<DiscrepanciasTableroResponse['discrepancias']>(
    [],
  );
  const [error, setError] = useState<string | null>(null);
  const [cargando, setCargando] = useState(true);
  const [exportando, setExportando] = useState(false);

  const cargar = useCallback(async () => {
    setCargando(true);
    setError(null);
    try {
      const [c, v, d] = await Promise.all([
        tableroService.cobertura(),
        tableroService.vencimientos(),
        tableroService.discrepancias(),
      ]);
      setCobertura(c);
      setVencimientos(v.asignaciones);
      setDiscrepancias(d.discrepancias);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo cargar el tablero');
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    void cargar();
  }, [cargar]);

  const exportarCsv = async () => {
    setExportando(true);
    setError(null);
    try {
      const hoy = new Date().toISOString().slice(0, 10);
      await tableroService.exportarCsv(`inspecciones_${hoy}.csv`);
      toast.success('CSV exportado', { description: `inspecciones_${hoy}.csv` });
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'No se pudo exportar';
      setError(msg);
      toast.error('No se pudo exportar', { description: msg });
    } finally {
      setExportando(false);
    }
  };

  return {
    cobertura,
    vencimientos,
    discrepancias,
    error,
    cargando,
    exportando,
    cargar,
    exportarCsv,
  };
}
