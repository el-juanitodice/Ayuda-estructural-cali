import { createContext, useCallback, useContext, useState, type ReactNode } from 'react';
import { ConsultReportDialog } from '@/components/report/ConsultReportDialog';

interface ConsultReportContextValue {
  abrirConsulta: (radicado?: string) => void;
}

const ConsultReportContext = createContext<ConsultReportContextValue | null>(null);

export function ConsultReportProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const [radicadoInicial, setRadicadoInicial] = useState('');

  const abrirConsulta = useCallback((radicado?: string) => {
    setRadicadoInicial(radicado?.trim().toUpperCase() ?? '');
    setOpen(true);
  }, []);

  return (
    <ConsultReportContext.Provider value={{ abrirConsulta }}>
      {children}
      <ConsultReportDialog open={open} onOpenChange={setOpen} radicadoInicial={radicadoInicial} />
    </ConsultReportContext.Provider>
  );
}

export function useConsultReport() {
  const ctx = useContext(ConsultReportContext);
  if (!ctx) {
    throw new Error('useConsultReport debe usarse dentro de ConsultReportProvider');
  }
  return ctx;
}
