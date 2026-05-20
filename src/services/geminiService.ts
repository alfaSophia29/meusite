
import { GoogleGenerativeAI } from "@google/generative-ai";

const ai = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

export const extractIDInfo = async (frontImageBase64: string, backImageBase64: string): Promise<{ firstName: string; lastName: string; documentId: string; birthDate: string } | null> => {
  try {
    const prompt = `Analise cuidadosamente as imagens da frente e do verso deste documento de identidade e extraia as seguintes informações:
    - Primeiro Nome (firstName): Apenas o primeiro nome ou nomes próprios.
    - Sobrenome (lastName): Todos os sobrenomes.
    - Número do Documento (documentId): O número principal de identificação (BI, RG ou Passaporte). Remova pontos, traços e espaços. Certifique-se de pegar o número completo.
    - Data de Nascimento (birthDate): No formato YYYY-MM-DD.
    
    INSTRUÇÕES CRÍTICAS:
    1. Verifique ambos os lados para garantir a consistência dos dados.
    2. Se houver divergência entre os lados, use o lado que parecer mais nítido ou oficial.
    3. Retorne APENAS um objeto JSON puro. Não inclua Markdown ou blocos de código.
    4. Formato: {"firstName": "...", "lastName": "...", "documentId": "...", "birthDate": "..."}`;

    const model = ai.getGenerativeModel({ model: "gemini-1.5-flash" });
    
    const result = await model.generateContent([
      prompt,
      {
        inlineData: {
          data: frontImageBase64.split(',')[1] || frontImageBase64,
          mimeType: "image/jpeg"
        }
      },
      {
        inlineData: {
          data: backImageBase64.split(',')[1] || backImageBase64,
          mimeType: "image/jpeg"
        }
      }
    ]);

    const response = await result.response;
    const text = response.text();
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
    return null;
  } catch (error) {
    console.error("Error extracting ID info:", error);
    return null;
  }
};

export const generateAdCopy = async (prompt: string): Promise<string> => {
  try {
    const model = ai.getGenerativeModel({ model: "gemini-1.5-flash" });
    const result = await model.generateContent(prompt);
    const response = await result.response;
    return response.text() || "Sem resposta da IA.";
  } catch (error) {
    console.error("Error generating ad copy:", error);
    return "Erro ao gerar cópia do anúncio via IA.";
  }
};
