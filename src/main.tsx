import { App } from '@/App';
import '@/index.css';
import '@fontsource/inter/latin-400.css';
import '@fontsource/inter/latin-500.css';
import '@fontsource/inter/latin-600.css';
import '@fontsource/cormorant-garamond/latin-400.css';
import '@fontsource/cormorant-garamond/latin-500.css';
import '@fontsource/cormorant-garamond/latin-600.css';
import '@fontsource/jetbrains-mono/latin-400.css';
import { InstallProvider } from '@/features/pwa/InstallProvider';
import { createQueryClient } from '@/lib/queryClient';
import { QueryClientProvider } from '@tanstack/react-query';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';

const container = document.getElementById('root');
if (!container) throw new Error('Missing #root element');

const queryClient = createQueryClient();

createRoot(container).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <InstallProvider>
          <App />
        </InstallProvider>
      </BrowserRouter>
    </QueryClientProvider>
  </StrictMode>,
);
