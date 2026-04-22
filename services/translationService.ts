
import { GoogleGenAI } from "@google/genai";

let aiInstance: GoogleGenAI | null = null;

const getAI = () => {
    if (!aiInstance) {
        const key = process.env.GEMINI_API_KEY;
        if (!key) {
            console.warn("GEMINI_API_KEY não definida. A tradução automática será desativada.");
            return null;
        }
        aiInstance = new GoogleGenAI({ apiKey: key });
    }
    return aiInstance;
};

/**
 * Tradução AI - Utiliza Gemini para traduzir textos e detectar idiomas
 */
export const translateText = async (
    text: string, 
    targetLanguage: string = 'Português'
): Promise<string> => {
    if (!text || text.trim().length === 0) return '';
    
    const ai = getAI();
    if (!ai) return text;
    
    try {
        const response = await ai.models.generateContent({
            model: "gemini-3-flash-preview",
            contents: `Traduza o seguinte texto para ${targetLanguage}. 
            Retorne APENAS a tradução, sem comentários adicionais.
            
            TEXTO: "${text}"`
        });

        const translated = response.text || text;
        return translated.trim();
    } catch (error) {
        console.error("Erro na Tradução AI:", error);
        return text; // Fallback para o texto original
    }
};
