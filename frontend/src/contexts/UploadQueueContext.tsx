import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { iniciarCola, suscribirse } from '@/lib/fotos/cola-subida';
import type { ConteoCola } from '@/types/upload';

interface UploadQueueContextValue {
  cola: ConteoCola | null;
  pendientes: number;
}

const UploadQueueContext = createContext<UploadQueueContextValue | null>(null);

export function UploadQueueProvider({ children }: { children: ReactNode }) {
  const [cola, setCola] = useState<ConteoCola | null>(null);

  useEffect(() => {
    iniciarCola();
    return suscribirse(setCola);
  }, []);

  const pendientes = cola ? cola.pendiente + cola.subiendo : 0;
  const value = useMemo(() => ({ cola, pendientes }), [cola, pendientes]);

  return <UploadQueueContext.Provider value={value}>{children}</UploadQueueContext.Provider>;
}

export function useUploadQueue() {
  const ctx = useContext(UploadQueueContext);
  if (!ctx) throw new Error('useUploadQueue debe usarse dentro de UploadQueueProvider');
  return ctx;
}
