import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './index.css';
import { applyTheme, useThemeStore } from './stores/theme';

// Apply the persisted theme before the first paint to avoid a flash.
applyTheme(useThemeStore.getState().theme);

const container = document.getElementById('root');
if (!container) throw new Error('Root element #root was not found.');

createRoot(container).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    void navigator.serviceWorker
      .register('/sw.js')
      .then((registration) => {
        // Check for a fresh shell at most once an hour while the app stays open.
        window.setInterval(() => void registration.update().catch(() => undefined), 60 * 60 * 1000);
      })
      .catch((error) => console.warn('[Kurd Book] Service worker registration failed:', error));
  });
}

window.addEventListener('unhandledrejection', (event) => {
  if (import.meta.env.DEV) console.error('[Kurd Book] Unhandled promise rejection:', event.reason);
});
