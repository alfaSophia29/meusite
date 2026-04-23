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
        if (cache.has(value)) {
          return '[Circular Reference]';
        }
        cache.add(value);
        
        // Tratamento para Erros
        if (value instanceof Error) {
          return {
            ...value,
            name: value.name,
            message: value.message,
            stack: value.stack
          };
        }

        // Tratamento para tipos internos do Firebase que costumam ter referências circulares ou complexas
        const constructorName = value.constructor?.name;
        const isFirebaseObject = 
            constructorName === 'DocumentReference' || 
            constructorName === 'Query' ||
            constructorName === 'Firestore' ||
            constructorName === 'CollectionReference' ||
            constructorName === 'FirebaseAppImpl' ||
            constructorName === 'FirebaseAuthImpl' ||
            // Minified names common in production Firebase builds (seen in logs: Y2, Ka)
            constructorName === 'Y2' || 
            constructorName === 'Ka' ||
            constructorName === 'Za' ||
            constructorName === 'ea' ||
            constructorName === 'ua' ||
            constructorName === 'ia';

        if (isFirebaseObject) {
          return `[Firebase ${constructorName || 'Object'}]`;
        }

        // Se o objeto tem um link circular conhecido por classes do Firebase
        if ((value.i && value.src) || (value._delegate)) {
          return `[Complex External ${constructorName || 'Object'}]`;
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
