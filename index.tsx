
import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './index.css';
import './i18n';

console.log("[BOOT] index.tsx Iniciado");

// Captura erros globais de promessas (como os crashes internos do Firestore)
window.addEventListener('unhandledrejection', (event) => {
  if (event.reason && event.reason.message && event.reason.message.includes('FIRESTORE')) {
    console.warn("⚠️ Detectado erro interno do Firestore. Ignorando para manter estabilidade:", event.reason.message);
    event.preventDefault(); // Impede o crash global
  }
});

try {
  const container = document.getElementById('root');
  if (container) {
    console.log("[BOOT] Container encontrado, renderizando...");
    const root = createRoot(container);
    root.render(
        <App />
    );
  } else {
    console.error("[BOOT] Erro: #root não encontrado no DOM");
  }
} catch (fatalError) {
  console.error("[BOOT] ERRO FATAL EM index.tsx:", fatalError);
  document.body.innerHTML = `
    <div style="height: 100vh; display: flex; flex-direction: column; align-items: center; justify-content: center; font-family: sans-serif; text-align: center; padding: 20px; background: #fff; color: #000;">
      <h1 style="color: red;">Falha Catastrófica de Inicialização</h1>
      <p style="color: #666;">${fatalError instanceof Error ? fatalError.message : 'Erro Desconhecido'}</p>
      <button onclick="window.location.reload()" style="padding: 10px 20px; cursor: pointer; background: #2563eb; color: white; border: none; border-radius: 8px;">Recarregar</button>
      <button onclick="localStorage.clear(); window.location.reload();" style="margin-top: 10px; padding: 10px 20px; cursor: pointer; border: 1px solid #ccc; border-radius: 8px;">Resetar Cache e Recarregar</button>
    </div>
  `;
}

// Service worker registration for PWA
if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .then(registration => {
        console.log('[PWA] ServiceWorker registrado com sucesso:', registration.scope);
      })
      .catch(err => {
        console.error('[PWA] Erro ao registrar ServiceWorker:', err);
      });
  });
} else if ('serviceWorker' in navigator && !import.meta.env.PROD) {
  // Opcional: registrar em dev também para testes, mas geralmente evitamos cache agressivo em dev
  console.log("[PWA] Service Worker detectado, mas desativado em modo de desenvolvimento.");
}
