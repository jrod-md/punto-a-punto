import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './styles.css';
import { prepareOfflineApp, registerOfflineApp } from './pwa/register';

const root = document.getElementById('root');
if (!root) throw new Error('No se encontró el contenedor de la aplicación.');

async function start() {
  if (await prepareOfflineApp()) return;
  createRoot(root!).render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
  void registerOfflineApp();
}
void start();
