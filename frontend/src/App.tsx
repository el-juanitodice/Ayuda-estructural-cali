import { Navigate, Route, Routes, useLocation, useSearchParams } from 'react-router-dom';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { AppLayout } from '@/components/layout/AppLayout';
import { ConsultReportProvider } from '@/contexts/ConsultReportContext';
import { routes } from '@/constants/routes';
import { AdminPage } from '@/pages/AdminPage';
import { DashboardPage } from '@/pages/DashboardPage';
import { FieldPage } from '@/pages/FieldPage';
import { LoginPage } from '@/pages/LoginPage';
import { MapPage } from '@/pages/MapPage';
import { ModerationPage } from '@/pages/ModerationPage';
import { NoticePage } from '@/pages/NoticePage';
import { ReportPage } from '@/pages/ReportPage';
import { ReviewPage } from '@/pages/ReviewPage';
import { SetPasswordPage } from '@/pages/SetPasswordPage';
import { StatusPage } from '@/pages/StatusPage';

function SetPasswordRoute() {
  const [params] = useSearchParams();
  return <SetPasswordPage token={params.get('token') ?? ''} />;
}

function LoginRoute() {
  const location = useLocation();
  const from = (location.state as { from?: string } | null)?.from;
  return <LoginPage redirectTo={from} />;
}

export default function App() {
  return (
    <ConsultReportProvider>
      <Routes>
      <Route element={<AppLayout />}>
        <Route index element={<MapPage />} />
        <Route path="reportar" element={<ReportPage />} />
        <Route path="estado" element={<StatusPage />} />
        <Route path="ingreso" element={<LoginRoute />} />
        <Route path="definir-clave" element={<SetPasswordRoute />} />
        <Route path="recuperar-clave" element={<SetPasswordRoute />} />

        <Route element={<ProtectedRoute roles={['ingeniero_a', 'ingeniero_b']} />}>
          <Route path="campo" element={<FieldPage />} />
        </Route>

        <Route element={<ProtectedRoute roles={['ingeniero_a']} />}>
          <Route path="revision" element={<ReviewPage />} />
        </Route>

        <Route element={<ProtectedRoute />}>
          <Route path="aviso" element={<NoticePage />} />
        </Route>

        <Route element={<ProtectedRoute roles={['moderador', 'admin']} />}>
          <Route path="moderacion" element={<ModerationPage />} />
        </Route>

        <Route element={<ProtectedRoute roles={['coordinador', 'admin']} />}>
          <Route path="tablero" element={<DashboardPage />} />
        </Route>

        <Route element={<ProtectedRoute roles={['admin']} />}>
          <Route path="admin" element={<AdminPage />} />
        </Route>

        <Route path="*" element={<Navigate to={routes.home} replace />} />
      </Route>
      </Routes>
    </ConsultReportProvider>
  );
}
