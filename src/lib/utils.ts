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
      
      const constructorName = value.constructor?.name || '';
      const isInternal = 
        value._delegate || 
        value.firestore || 
        value.database || 
        value.auth || 
        value.app ||
        constructorName.startsWith('Firestore') || 
        constructorName.startsWith('Firebase') ||
        constructorName.startsWith('Document') || 
        constructorName.startsWith('Query') ||
        constructorName.startsWith('Collection') ||
        ['Y2', 'Ka', 'Za', 'Firestore', 'FirestoreImpl', 'FirebaseAuthImpl', 'FirebaseAppImpl'].includes(constructorName) ||
        (value.app && value.auth) || 
        (key === 'i' && value.src) ||
        (key === 'src' && value.i);

      if (isInternal) {
        return `[Internal Object: ${constructorName || 'Unknown'}]`;
      }

      if (key === 'firebase' || key === 'auth' || key === 'db') {
        return `[Service Reference: ${key}]`;
      }

      if (
        (typeof Node !== 'undefined' && value instanceof Node) || 
        (typeof Window !== 'undefined' && value instanceof Window) || 
        (typeof Event !== 'undefined' && value instanceof Event)
      ) {
        return `[Browser Object: ${constructorName || 'Unknown'}]`;
      }

      cache.add(value);

      if (value instanceof Error) {
        const errorObj: any = {
          name: value.name,
          message: value.message,
          stack: value.stack,
        };
        Object.getOwnPropertyNames(value).forEach(prop => {
          if (!['name', 'message', 'stack'].includes(prop)) {
            try {
              const valProp = (value as any)[prop];
              if (typeof valProp === 'object' && valProp !== null) {
                const propConstructor = valProp.constructor?.name || '';
                if (
                  valProp._delegate || 
                  valProp.firestore || 
                  valProp.database || 
                  valProp.auth || 
                  valProp.app ||
                  ['Y2', 'Ka', 'Za', 'Firestore', 'FirestoreImpl', 'FirebaseAuthImpl', 'FirebaseAppImpl'].includes(propConstructor)
                ) {
                  errorObj[prop] = `[Internal Object: ${propConstructor}]`;
                } else {
                  errorObj[prop] = valProp;
                }
              } else {
                errorObj[prop] = valProp;
              }
            } catch (e) {
              errorObj[prop] = "[Unreadable Property]";
            }
          }
        });
        return errorObj;
      }
    }

    if (typeof value === 'string' && value.length > 50000) {
      return `[Large String: ${value.substring(0, 100)}...]`;
    }

    return value;
  };

  try {
    return JSON.stringify(obj, replacer, indent);
  } catch (err) {
    try {
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
