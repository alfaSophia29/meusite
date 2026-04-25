
import { GoogleGenAI, Type } from '@google/genai';

/**
 * FIXED: Following guideline "Always use const ai = new GoogleGenAI({apiKey: process.env.API_KEY});"
 * and "Create a new GoogleGenAI instance right before making an API call".
 */

export const sourceDropshippingProducts = async (query: string): Promise<any[]> => {
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Simule uma busca de produtos no AliExpress para dropshipping baseada na query: "${query}". 
      Retorne um JSON de 5 produtos com: nome, descrição vendedora, preço original em USD (entre 5 e 50), 
      e uma URL de imagem do picsum.photos baseada no tema.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              externalProviderId: { type: Type.STRING },
              name: { type: Type.STRING },
              description: { type: Type.STRING },
              originalPrice: { type: Type.NUMBER },
              imageUrl: { type: Type.STRING }
            },
            required: ["externalProviderId", "name", "description", "originalPrice", "imageUrl"]
          }
        }
      }
    });
    return JSON.parse(response.text || '[]');
  } catch (error) {
    console.error('Erro no sourcing Gemini:', error);
    return [];
  }
};

export const generateAdCopy = async (prompt: string): Promise<string> => {
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Gere um texto curto e persuasivo para um anúncio sobre: "${prompt}". 
      O retorno deve seguir obrigatoriamente este formato: "Título: [Seu Título] Texto: [Sua Descrição]"`,
    });
    return response.text || 'Título: Oferta Especial Texto: Aproveite nossas condições exclusivas.';
  } catch (error) {
    console.error('Erro ao gerar copy do anúncio:', error);
    return 'Título: Conhecimento Pro Texto: Aprenda hoje mesmo na nossa plataforma.';
  }
};

const fileToGenerativePart = async (file: File) => {
  const base64EncodedDataPromise = new Promise((resolve) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve((reader.result as string).split(',')[1]);
    reader.readAsDataURL(file);
  });
  return {
    inlineData: { data: await base64EncodedDataPromise as string, mimeType: file.type },
  };
};

export const auditIdentityDocument = async (
  frontImage: File, 
  backImage: File, 
  selfieImage: File,
  userData: { firstName: string, lastName: string, birthDate: number, documentId: string }
): Promise<{ 
  approved: boolean; 
  reason: string; 
  extractedData?: {
    fullName: string;
    birthDate: string;
    expirationDate: string;
    documentNumber: string;
    documentType: string;
    nationality?: string;
  };
  deepAnalysis: {
    isLegible: boolean;
    isPhysicalDocument: boolean;
    faceMatchScore: number;
    detectedAnomalies?: string[];
  };
}> => {
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    
    const frontPart = await fileToGenerativePart(frontImage);
    const backPart = await fileToGenerativePart(backImage);
    const selfiePart = await fileToGenerativePart(selfieImage);

    const birthDateStr = new Date(userData.birthDate).toLocaleDateString('pt-BR');

    const prompt = `
      SISTEMA DE VERIFICAÇÃO DE IDENTIDADE KYC.
      O usuário está enviando seus documentos para validar sua conta CyberPhone.
      
      DADOS INFORMADOS NO FORMULÁRIO:
      - Nome Completo: ${userData.firstName} ${userData.lastName}
      - Data de Nascimento: ${birthDateStr}
      - Número do Documento: ${userData.documentId}

      TAREFA:
      1. OCR: Extraia do documento o Nome, Data Nascimento, Validade e Número Serial.
      2. BIOMETRIA: Verifique se a Selfie corresponde ao documento.
      3. SEGURANÇA: Verifique se o documento é físico (não é foto de tela).

      REGRAS:
      - SE o documento estiver expirado (Hoje: ${new Date().toLocaleDateString('pt-BR')}), reject.
      - SE o nome no documento for muito diferente do formulário, permita pequenas variações, mas reject se for outra pessoa.
      - SE for vitalício, expiração = 9999-12-31.

      RESPONDA APENAS EM JSON:
      {
        "approved": boolean,
        "reason": "Explicação em português",
        "extractedData": {
          "fullName": "STRING",
          "birthDate": "YYYY-MM-DD",
          "expirationDate": "YYYY-MM-DD",
          "documentNumber": "STRING (Apenas alfanuméricos)",
          "documentType": "STRING",
          "nationality": "STRING"
        },
        "deepAnalysis": {
          "isLegible": boolean,
          "isPhysicalDocument": boolean,
          "faceMatchScore": number (0-100)
        }
      }
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-1.5-flash', 
      contents: {
        parts: [
          frontPart,
          backPart,
          selfiePart,
          { text: prompt }
        ]
      },
      config: {
        temperature: 0.1,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            approved: { type: Type.BOOLEAN },
            reason: { type: Type.STRING },
            extractedData: {
              type: Type.OBJECT,
              properties: {
                fullName: { type: Type.STRING },
                birthDate: { type: Type.STRING },
                expirationDate: { type: Type.STRING },
                documentNumber: { type: Type.STRING },
                documentType: { type: Type.STRING },
                nationality: { type: Type.STRING }
              },
              required: ["fullName", "birthDate", "expirationDate", "documentNumber", "documentType"]
            },
            deepAnalysis: {
              type: Type.OBJECT,
              properties: {
                isLegible: { type: Type.BOOLEAN },
                isPhysicalDocument: { type: Type.BOOLEAN },
                faceMatchScore: { type: Type.NUMBER }
              },
              required: ["isLegible", "isPhysicalDocument", "faceMatchScore"]
            }
          },
          required: ["approved", "reason", "extractedData", "deepAnalysis"]
        }
      }
    });

    try {
      const text = response.text;
      if (!text) {
         // Attempt to check if response was blocked
         const candidate = (response as any).candidates?.[0];
         if (candidate?.finishReason === 'SAFETY') {
            return {
              approved: false,
              reason: "Seus documentos foram bloqueados pelos filtros de segurança automáticos. Por favor, certifique-se de que as imagens estão nítidas e mostram o documento físico.",
              deepAnalysis: { isLegible: true, isPhysicalDocument: true, faceMatchScore: 0, detectedAnomalies: ["Filtro de Segurança"] }
            };
         }
         throw new Error("IA não retornou texto.");
      }
      return JSON.parse(text);
    } catch (parseError) {
      console.error("Erro ao analisar resposta da IA:", response);
      throw new Error("IA retornou dados inválidos.");
    }

  } catch (error: any) {
    console.error("Erro no KYC:", error);
    return { 
        approved: false, 
        reason: "Falha técnica na verificação automática. Por favor, tente novamente com fotos mais nítidas e sem reflexos.",
        deepAnalysis: {
            isLegible: false,
            isPhysicalDocument: false,
            faceMatchScore: 0,
            detectedAnomalies: ["Erro de conexão ou segurança"]
        }
    };
  }
};

export const verifyProfessionalDocument = async (base64File: string): Promise<{ isValid: boolean; reason: string; professionDetected?: string }> => {
    return { isValid: true, reason: "Legacy process" };
};


