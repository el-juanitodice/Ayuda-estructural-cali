import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from '@/App';
import { Toaster } from '@/components/ui/toast';
import { AuthProvider } from '@/hooks/useAuth';
import { CampoSyncProvider } from '@/contexts/CampoSyncContext';
import { UploadQueueProvider } from '@/contexts/UploadQueueContext';
import '@/index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AuthProvider>
      <UploadQueueProvider>
        <CampoSyncProvider>
          <App />
          <Toaster />
        </CampoSyncProvider>
      </UploadQueueProvider>
    </AuthProvider>
  </StrictMode>,
);
