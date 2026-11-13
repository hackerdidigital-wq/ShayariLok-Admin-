import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { ErrorBoundary } from './components/ErrorBoundary.tsx';
import { StandaloneSiteShell } from './components/StandaloneSiteShell.tsx';
import './index.css';

const rootEl = document.getElementById('root');
if (rootEl) {
  createRoot(rootEl).render(
    <StrictMode>
      <ErrorBoundary>
        <StandaloneSiteShell mode="privacy" />
      </ErrorBoundary>
    </StrictMode>
  );
}
