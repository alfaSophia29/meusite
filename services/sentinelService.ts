
import { GoogleGenAI, Type } from "@google/genai";
import { safeJsonStringify } from "../src/lib/utils";

let aiInstance: GoogleGenAI | null = null;

const getAI = () => {
    if (!aiInstance) {
        const key = process.env.GEMINI_API_KEY;
        if (!key) {
            console.warn("GEMINI_API_KEY não definida para Sentinel.");
            return null;
        }
        aiInstance = new GoogleGenAI({ apiKey: key });
    }
    return aiInstance;
};

export interface SentinelResult {
    allowed: boolean;
    reason?: string;
    detectedCategories?: string[];
}

/**
 * Sentinela AI - Sistema de Segurança Centinela
 * Bloqueia conteúdos ilícitos como nudez, drogas, armas, etc.
 */
export const checkContentSecurity = async (
    content: string, 
    type: 'post' | 'comment' | 'product' | 'message'
): Promise<SentinelResult> => {
    const ai = getAI();
    if (!ai) return { allowed: true };

    try {
        const response = await ai.models.generateContent({
            model: "gemini-1.5-flash",
            contents: [{
                parts: [{
                    text: `Analise o seguinte conteúdo de um(a) ${type} em uma rede social educacional e verifique se ele viola as diretrizes de segurança. 
            Categorias proibidas: Nudez/Pornografia, Drogas, Armas, Ódio/Violência, Golpes/Fraudes.
            
            CONTEÚDO: "${content}"
            
            Responda apenas em JSON com o seguinte formato:
            {
              "allowed": boolean,
              "reason": "motivo em português se for bloqueado",
              "detectedCategories": ["categoria1", "categoria2"]
            }`
                }]
            }],
            config: {
                responseMimeType: "application/json",
            }
        });

        const text = response.text || '';
        return JSON.parse(text || '{"allowed": true}');
    } catch (error) {
        console.error("Erro no Sentinel AI:", safeJsonStringify(error));
        // Em caso de erro na API, por segurança permitimos, ou poderíamos bloquear dependendo da política.
        // Aqui vamos permitir para não travar a experiência por falhas temporárias da AI.
        return { allowed: true };
    }
};

export const checkImageSecurity = async (
    base64Image: string,
    mimeType: string
): Promise<SentinelResult> => {
    const ai = getAI();
    if (!ai) return { allowed: true };

    try {
        const response = await ai.models.generateContent({
            model: "gemini-1.5-flash",
            contents: [{
                parts: [
                    {
                        inlineData: {
                            data: base64Image.split(',')[1] || base64Image,
                            mimeType: mimeType
                        }
                    },
                    {
                        text: `Analise esta imagem e verifique se ela contém conteúdo impróprio (nudez, drogas, armas, violência explícita).
                        Responda apenas em JSON: { "allowed": boolean, "reason": "motivo em português se bloqueado" }`
                    }
                ]
            }],
            config: {
                responseMimeType: "application/json",
            }
        });

        const text = response.text || '';
        return JSON.parse(text || '{"allowed": true}');
    } catch (error) {
        console.error("Erro no Sentinel Image Check:", safeJsonStringify(error));
        return { allowed: true };
    }
};
