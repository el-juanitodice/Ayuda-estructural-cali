import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useConsultReport } from '@/contexts/ConsultReportContext';
import { routes } from '@/constants/routes';

export function useStatusPage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { abrirConsulta } = useConsultReport();
  const radicado = params.get('radicado');

  useEffect(() => {
    abrirConsulta(radicado ?? undefined);
    navigate(routes.home, { replace: true });
  }, [abrirConsulta, navigate, radicado]);
}
