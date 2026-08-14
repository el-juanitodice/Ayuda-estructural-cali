import { RouterProvider } from 'react-router-dom';
import { ConsultReportProvider } from '@/contexts/ConsultReportContext';
import { appRouter } from '@/lib/router';

export default function App() {
  return (
    <ConsultReportProvider>
      <RouterProvider router={appRouter} />
    </ConsultReportProvider>
  );
}
