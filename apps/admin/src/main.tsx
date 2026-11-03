import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './index.css';

const container = document.getElementById('root');
if (!container) throw new Error('Root element #root was not found.');

createRoot(container).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

window.addEventListener('unhandledrejection', (event) => {
  if (import.meta.env.DEV) console.error('[Kurd Book Admin] Unhandled promise rejection:', event.reason);
});
