import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useConsultReport } from '@/contexts/ConsultReportContext';
import { routes } from '@/constants/routes';

/** Deep link /estado?radicado=… — abre el modal y redirige al inicio. */
export function StatusPage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { abrirConsulta } = useConsultReport();
  const radicado = params.get('radicado');

  useEffect(() => {
    abrirConsulta(radicado ?? undefined);
    navigate(routes.home, { replace: true });
  }, [abrirConsulta, navigate, radicado]);

  return null;
}
