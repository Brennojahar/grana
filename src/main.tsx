import '@fontsource-variable/inter-tight';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import './estilo.css';

try {
  const tema = localStorage.getItem('grana:tema');
  if (tema === 'light' || tema === 'dark') document.documentElement.setAttribute('data-theme', tema);
} catch {
  /* sem armazenamento */
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`).catch(() => {});
}
