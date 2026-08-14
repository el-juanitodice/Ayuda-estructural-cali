import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { usePermissions } from '@/hooks/usePermissions';
import { iniciarSyncCampo, suscribirPendientesCampo } from '@/lib/campo/sync';

interface CampoSyncContextValue {
  formulariosPendientes: number;
}

const CampoSyncContext = createContext<CampoSyncContextValue | null>(null);

export function CampoSyncProvider({ children }: { children: ReactNode }) {
  const { puede } = usePermissions();
  const [formulariosPendientes, setFormulariosPendientes] = useState(0);

  const esIngeniero = puede('campo', 'r') || puede('revision', 'r');

  useEffect(() => {
    if (!esIngeniero) {
      setFormulariosPendientes(0);
      return;
    }
    iniciarSyncCampo();
    return suscribirPendientesCampo(setFormulariosPendientes);
  }, [esIngeniero]);

  const value = useMemo(() => ({ formulariosPendientes }), [formulariosPendientes]);

  return <CampoSyncContext.Provider value={value}>{children}</CampoSyncContext.Provider>;
}

export function useCampoSync() {
  const ctx = useContext(CampoSyncContext);
  return ctx ?? { formulariosPendientes: 0 };
}
