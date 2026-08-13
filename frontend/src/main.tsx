import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from '@/App';
import { Toaster } from '@/components/ui/sonner';
import { AuthProvider } from '@/contexts/AuthContext';
import { UploadQueueProvider } from '@/contexts/UploadQueueContext';
import '@/index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <UploadQueueProvider>
          <App />
          <Toaster richColors closeButton position="top-center" />
        </UploadQueueProvider>
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>,
);
