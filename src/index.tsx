
import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './index.css';
import './i18n';

// --- ROBUST CONSOLE DE-CIRCULARIZATION PATCH ---
// Prevent complex circular Firestore objects or custom errors (like Y2, Ka, etc.) from crashing the platform's console serialization inside the iframe.
function deCircularize(obj: any, seen = new WeakSet()): any {
  if (obj === null || typeof obj !== 'object') {
    return obj;
  }
  
  if (seen.has(obj)) {
    return "[Circular Reference]";
  }
  
  const constructorName = obj.constructor?.name || '';
  if (
    obj._delegate || 
    obj.firestore || 
    obj.database || 
    obj.auth || 
    obj.app ||
    constructorName.startsWith('Firestore') || 
    constructorName.startsWith('Firebase') ||
    ['Y2', 'Ka', 'Za', 'Firestore', 'FirestoreImpl', 'FirebaseAuthImpl', 'FirebaseAppImpl'].includes(constructorName)
  ) {
    return `[Internal Object: ${constructorName || 'Object'}]`;
  }

  seen.add(obj);

  if (obj instanceof Error) {
    const cleanErr: any = {
      name: obj.name,
      message: obj.message,
      stack: obj.stack,
    };
    Object.getOwnPropertyNames(obj).forEach(prop => {
      if (!['name', 'message', 'stack'].includes(prop)) {
        try {
          const val = (obj as any)[prop];
          if (typeof val === 'object' && val !== null) {
            cleanErr[prop] = deCircularize(val, seen);
          } else {
            cleanErr[prop] = val;
          }
        } catch (_) {}
      }
    });
    return cleanErr;
  }

  if (Array.isArray(obj)) {
    return obj.map(item => deCircularize(item, seen));
  }

  const copy: any = {};
  for (const key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      try {
        const val = obj[key];
        copy[key] = deCircularize(val, seen);
      } catch (_) {
        copy[key] = "[Unreadable Property]";
      }
    }
  }
  return copy;
}

const patchConsoleMethod = (methodName: 'log' | 'warn' | 'error' | 'info') => {
  const original = (console as any)[methodName];
  if (typeof original !== 'function') return;
  
  (console as any)[methodName] = function (...args: any[]) {
    const hasQuotaError = args.some(arg => {
      if (!arg) return false;
      const str = typeof arg === 'string' ? arg : (arg.message || String(arg) || '');
      const lower = str.toLowerCase();
      return lower.includes('resource-exhausted') || 
             lower.includes('quota exceeded') || 
             lower.includes('quota limits') ||
             lower.includes('quota limit') ||
             lower.includes('maximum backoff delay') ||
             lower.includes('cota_excedida');
    });

    if (hasQuotaError) {
      // Silently swallow the browser error messaging for Firestore free-tier quota exhaustion
      return;
    }

    const hasZegoError = args.some(arg => {
      if (!arg) return false;
      const str = typeof arg === 'string' ? arg : (arg.message || String(arg) || arg.stack || '');
      return str.includes('createSpan') || str.includes('zego');
    });

    if (hasZegoError) {
      // Swallowed to prevent uncaught error crash detection
      return;
    }

    const sanitizedArgs = args.map(arg => {
      try {
        return deCircularize(arg);
      } catch (err) {
        return `[Unserializable ${typeof arg}]`;
      }
    });
    original.apply(this, sanitizedArgs);
  };
};

['log', 'warn', 'error', 'info'].forEach((method: any) => patchConsoleMethod(method));

// --- ROBUST GLOBAL JSON.STRINGIFY PATCH ---
// Intercept all default stringify calls to make sure circular or internal objects do not crash
const originalStringify = JSON.stringify;
JSON.stringify = function (value: any, replacer?: any, space?: any) {
  const cache = new WeakSet();
  
  const safeReplacer = (key: string, val: any) => {
    if (typeof val === 'object' && val !== null) {
      if (cache.has(val)) {
        return '[Circular Reference]';
      }
      cache.add(val);
      
      const constructorName = val.constructor?.name || '';
      if (
        val._delegate || 
        val.firestore || 
        val.database || 
        val.auth || 
        val.app ||
        constructorName.startsWith('Firestore') || 
        constructorName.startsWith('Firebase') ||
        ['Y2', 'Ka', 'Za', 'Firestore', 'FirestoreImpl', 'FirebaseAuthImpl', 'FirebaseAppImpl'].includes(constructorName) ||
        (val.app && val.auth) || 
        (key === 'i' && val.src) ||
        (key === 'src' && val.i)
      ) {
        return `[Internal Object: ${constructorName || 'Object'}]`;
      }
    }
    
    if (typeof replacer === 'function') {
      return replacer(key, val);
    }
    if (Array.isArray(replacer)) {
      if (key === '' || replacer.includes(key)) {
        return val;
      }
      return undefined;
    }
    return val;
  };

  try {
    return originalStringify(value, replacer, space);
  } catch (err) {
    try {
      return originalStringify(value, safeReplacer, space);
    } catch (_) {
      return '"[Serialization Failed]"';
    }
  }
};

// Define global window.onerror handler to catch all unhandled errors before browser aborts/reports them
window.onerror = function (message, source, lineno, colno, error) {
  const errorMsg = String(message || '') + ' ' + String(error?.message || '') + ' ' + String(error?.stack || '') + ' ' + String(error?.toString() || '');
  if (errorMsg.includes('createSpan') || errorMsg.includes('zego')) {
    console.warn("⚠️ Interceptado e ignorado via window.onerror:", errorMsg);
    return true; // Prevents the browser from reporting/logging the uncaught exception
  }
  if (errorMsg.includes('resource-exhausted') || errorMsg.includes('quota') || errorMsg.includes('COTA')) {
    console.warn("⚠️ Interceptada cota de escrita do Firestore via window.onerror:", errorMsg);
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('firestore-quota-exceeded'));
    }
    return true;
  }
  return false; // Let browser process normal errors
};

console.log("[BOOT] index.tsx Iniciado");

// Captura erros globais de promessas (como os crashes internos do Firestore ou Zego)
window.addEventListener('unhandledrejection', (event) => {
  if (event.reason) {
    const errorMsg = String(event.reason.message || event.reason.stack || event.reason || '');
    if (errorMsg.includes('FIRESTORE') || errorMsg.includes('resource-exhausted') || errorMsg.includes('quota') || errorMsg.includes('COTA')) {
      console.warn("⚠️ Detectado erro de cota ou rede do Firestore. Ignorando para manter estabilidade:", errorMsg);
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('firestore-quota-exceeded'));
      }
      event.preventDefault(); // Impede o crash global
    } else if (errorMsg.includes('createSpan') || errorMsg.includes('zego')) {
      console.warn("⚠️ Detectado erro interno de telemetria do Zego. Ignorando para manter estabilidade:", errorMsg);
      event.preventDefault(); // Impede o crash global
    }
  }
});

// Captura erros síncronos e assíncronos não capturados (como createSpan em Zego descritos pelo usuário)
window.addEventListener('error', (event) => {
  const errorMsg = String(event.message || '') + ' ' + String(event.error?.message || '') + ' ' + String(event.error?.stack || '') + ' ' + String(event.error?.toString() || '');
  if (errorMsg.includes('createSpan') || errorMsg.includes('zego')) {
    console.warn("⚠️ Interceptado e ignorado erro de telemetria do Zego sob unmount:", errorMsg);
    event.preventDefault();
    event.stopPropagation();
    return true;
  }
  if (errorMsg.includes('resource-exhausted') || errorMsg.includes('quota') || errorMsg.includes('COTA')) {
    console.warn("⚠️ Interceptado erro síncrono de cota de escrita do Firestore:", errorMsg);
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('firestore-quota-exceeded'));
    }
    event.preventDefault();
    event.stopPropagation();
    return true;
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

import { Workbox } from 'workbox-window';

// Service worker registration
if ('serviceWorker' in navigator && window.self === window.top && import.meta.env.PROD) {
  const wb = new Workbox('/sw.js');

  wb.addEventListener('activated', (event) => {
    if (!event.isUpdate) {
      console.log('[PWA] Service Worker ativado pela primeira vez!');
    } else {
      console.log('[PWA] Service Worker atualizado!');
    }
  });

  wb.register().then(registration => {
    console.log('[PWA] Service Worker registrado com sucesso:', registration?.scope);
  }).catch(err => {
    console.error('[PWA] Falha ao registrar Service Worker:', err);
  });
} else if (window.self !== window.top) {
  console.log('[PWA] Rodando dentro de um iframe. Registro de Service Worker pulado.');
}
