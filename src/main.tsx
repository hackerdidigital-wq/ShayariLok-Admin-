import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import { ErrorBoundary } from './components/ErrorBoundary.tsx';
import './index.css';

function renderStartupError(message: string) {
  const container = document.getElementById('root') || document.body;
  if (!container) return;
  container.innerHTML = `
    <div style="min-height:100vh;display:flex;align-items:center;justify-content:center;padding:24px;background:#f8fafc;font-family:system-ui,sans-serif;">
      <div style="max-width:460px;width:100%;background:#ffffff;border:1px solid #fecaca;border-radius:12px;padding:24px;">
        <h1 style="margin:0 0 8px;font-size:18px;color:#991b1b;">Shayari Lok Admin failed to start</h1>
        <p style="margin:0 0 12px;font-size:14px;color:#475569;">Please refresh the page or check browser console details below:</p>
        <pre style="margin:0;padding:12px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;font-size:12px;color:#b91c1c;overflow:auto;white-space:pre-wrap;">${message
          .replace(/&/g, '&amp;')
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;')}</pre>
      </div>
    </div>
  `;
}

let mounted = false;

window.addEventListener('error', (event) => {
  if (!mounted) {
    renderStartupError(event.message || 'Unknown script error');
  }
});

function mountApp() {
  try {
    const rootElement = document.getElementById('root');
    if (!rootElement) {
      renderStartupError('Root element #root not found in document.');
      return;
    }

    createRoot(rootElement).render(
      <StrictMode>
        <ErrorBoundary>
          <App />
        </ErrorBoundary>
      </StrictMode>
    );
    mounted = true;
  } catch (error) {
    renderStartupError(
      error instanceof Error ? error.stack || error.message : String(error)
    );
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', mountApp, { once: true });
} else {
  mountApp();
}
