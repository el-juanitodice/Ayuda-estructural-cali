import { createBrowserRouter, Navigate, useLocation, useSearchParams } from 'react-router-dom';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { AuthAwareLayout } from '@/components/layout/AuthAwareLayout';
import { AppShellLayout } from '@/components/layout/AppShellLayout';
import { routes } from '@/constants/routes';
import { AdminPage } from '@/pages/AdminPage/index';
import { DashboardPage } from '@/pages/DashboardPage/index';
import { FieldPage } from '@/pages/FieldPage/index';
import { LoginPage } from '@/pages/LoginPage/index';
import { MapPage } from '@/pages/MapPage/index';
import { ModerationPage } from '@/pages/ModerationPage/index';
import { NoticePage } from '@/pages/NoticePage/index';
import { ReportPage } from '@/pages/ReportPage/index';
import { ReviewPage } from '@/pages/ReviewPage/index';
import { SetPasswordPage } from '@/pages/SetPasswordPage/index';
import { StatusPage } from '@/pages/StatusPage/index';

function SetPasswordRoute() {
  const [params] = useSearchParams();
  return <SetPasswordPage token={params.get('token') ?? ''} />;
}

function LoginRoute() {
  const location = useLocation();
  const from = (location.state as { from?: string } | null)?.from;
  return <LoginPage redirectTo={from} />;
}

export const appRouter = createBrowserRouter([
  {
    element: <AuthAwareLayout />,
    children: [
      { index: true, element: <MapPage /> },
      { path: 'reportar', element: <ReportPage /> },
      { path: 'estado', element: <StatusPage /> },
      { path: 'ingreso', element: <LoginRoute /> },
      { path: 'definir-clave', element: <SetPasswordRoute /> },
      { path: 'recuperar-clave', element: <SetPasswordRoute /> },
    ],
  },
  {
    element: <AppShellLayout />,
    children: [
      {
        element: <ProtectedRoute module="campo" />,
        children: [{ path: 'campo', element: <FieldPage /> }],
      },
      {
        element: <ProtectedRoute module="revision" />,
        children: [{ path: 'revision', element: <ReviewPage /> }],
      },
      {
        element: <ProtectedRoute module="aviso" />,
        children: [{ path: 'aviso', element: <NoticePage /> }],
      },
      {
        element: <ProtectedRoute module="moderacion" />,
        children: [{ path: 'moderacion', element: <ModerationPage /> }],
      },
      {
        element: <ProtectedRoute module="tablero" />,
        children: [{ path: 'tablero', element: <DashboardPage /> }],
      },
      {
        element: <ProtectedRoute module="admin_usuarios" />,
        children: [{ path: 'admin', element: <AdminPage /> }],
      },
    ],
  },
  {
    path: '*',
    element: <Navigate to={routes.home} replace />,
  },
]);
