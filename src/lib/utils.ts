import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Utilitário para combinar classes do Tailwind de forma segura.
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Serializa um objeto para JSON de forma segura, tratando referências circulares.
 * Especialmente útil para erros do Firebase e do Gemini que podem ter estruturas complexas.
 */
export const safeJsonStringify = (obj: any, indent = 2): string => {
  const cache = new WeakSet();
  
  const replacer = (key: string, value: any) => {
    if (typeof value === 'object' && value !== null) {
      if (cache.has(value)) {
        return '[Circular Reference]';
      }
      
      // Bloqueio agressivo de tipos internos que frequentemente causam circularidade ou erros de acesso
      const constructorName = value.constructor?.name;
      const isInternal = 
        ['Y2', 'Ka', 'Za', 'Firestore', 'FirestoreImpl', 'FirebaseAuthImpl', 'FirebaseAppImpl'].includes(constructorName) ||
        (value._delegate) || 
        (value.app && value.auth) || // Provável Auth de outra versão
        (key === 'i' && value.src) ||
        (key === 'src' && value.i);

      if (isInternal) {
        return `[Internal Object: ${constructorName || 'Unknown'}]`;
      }

      // Evitar serializar o próprio Firebase App ou instâncias gigantes
      if (key === 'firebase' || key === 'auth' || key === 'db') {
        return `[Service Reference: ${key}]`;
      }

      // Verificação de tipos de DOM/Browser
      if (
        (typeof Node !== 'undefined' && value instanceof Node) || 
        (typeof Window !== 'undefined' && value instanceof Window) || 
        (typeof Event !== 'undefined' && value instanceof Event)
      ) {
        return `[Browser Object: ${constructorName || 'Unknown'}]`;
      }

      cache.add(value);

      // Se for um Error, processamos manualmente para evitar campos não enumeráveis que JSON.stringify ignora
      if (value instanceof Error) {
        const errorObj: any = {
          name: value.name,
          message: value.message,
          stack: value.stack,
        };
        Object.getOwnPropertyNames(value).forEach(prop => {
          if (!['name', 'message', 'stack'].includes(prop)) {
            try {
              errorObj[prop] = (value as any)[prop];
            } catch (e) {
              errorObj[prop] = "[Unreadable Property]";
            }
          }
        });
        return errorObj;
      }
    }

    // Bloqueio de strings exageradamente grandes
    if (typeof value === 'string' && value.length > 50000) {
      return `[Large String: ${value.substring(0, 100)}...]`;
    }

    return value;
  };

  try {
    return JSON.stringify(obj, replacer, indent);
  } catch (err) {
    try {
      // Fallback para uma tentativa ainda mais simples se falhar por stack overflow
      const simpleReplacer = (_k: string, v: any) => {
        if (typeof v === 'object' && v !== null) {
          return `[Object: ${v.constructor?.name || 'Object'}]`;
        }
        return v;
      };
      return JSON.stringify(obj, simpleReplacer, indent);
    } catch (e) {
      return "[Serialization Failed]";
    }
  }
};
