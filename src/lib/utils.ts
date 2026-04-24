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
  
  try {
    return JSON.stringify(obj, (key, value) => {
      // Remover strings gigantes de base64 para não poluir o log e evitar limites de memória
      if (typeof value === 'string' && value.length > 5000 && (value.startsWith('data:image') || value.length > 10000)) {
        return `[Large String Header: ${value.substring(0, 30)}... Size: ${value.length}]`;
      }

      if (typeof value === 'object' && value !== null) {
        // DETECÇÃO PRECOCE DE CIRCULARIDADE
        if (cache.has(value)) {
          return '[Circular Reference]';
        }
        
        // Bloqueio de tipos internos do Firebase que costumam ter referências circulares ou complexas
        // Estes nomes (Y2, Ka, etc) aparecem em builds de produção minificados do Firebase
        const constructorName = value.constructor?.name;
        const isFirebaseInternal = 
            constructorName === 'DocumentReference' || 
            constructorName === 'Query' ||
            constructorName === 'Firestore' ||
            constructorName === 'CollectionReference' ||
            constructorName === 'FirebaseAppImpl' ||
            constructorName === 'FirebaseAuthImpl' ||
            constructorName === 'Y2' || 
            constructorName === 'Ka' ||
            constructorName === 'Za' ||
            constructorName === 'ea' ||
            constructorName === 'ua' ||
            constructorName === 'ia' ||
            value._delegate ||
            (value.i && value.src);

        if (isFirebaseInternal) {
          return `[Firebase ${constructorName || 'Internal Object'}]`;
        }

        cache.add(value);
        
        // Tratamento para Erros - NÃO use spread (...) pois pode reintroduzir circularidade
        if (value instanceof Error) {
          const errorObj: any = {
            name: value.name,
            message: value.message,
            stack: value.stack
          };
          
          // Adicionar propriedades extras com segurança (apenas primitivos ou objetos simples)
          Object.getOwnPropertyNames(value).forEach(prop => {
            if (['name', 'message', 'stack'].includes(prop)) return;
            const val = (value as any)[prop];
            if (typeof val !== 'object' || val === null) {
              errorObj[prop] = val;
            }
          });
          
          return errorObj;
        }
      }
      return value;
    }, indent);
  } catch (err) {
    // Fallback absoluto se algo ainda falhar
    try {
      return `[Serialization Failed] ${String(obj)}`;
    } catch (finalErr) {
      return "[Fatal Serialization Error]";
    }
  }
};
