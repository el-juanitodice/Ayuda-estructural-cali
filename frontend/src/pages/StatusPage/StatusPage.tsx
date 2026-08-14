import { useStatusPage } from '@/pages/StatusPage/hooks/useStatusPage';

/** Deep link /estado?radicado=… — abre el modal y redirige al inicio. */
export function StatusPage() {
  useStatusPage();
  return null;
}
