import { GoogleGenAI, Type } from "@google/genai";

let aiInstance: GoogleGenAI | null = null;

const getAI = () => {
    if (!aiInstance) {
        const key = process.env.GEMINI_API_KEY;
        if (!key) {
            console.warn("GEMINI_API_KEY não definida para GeminiService.");
            return null;
        }
        aiInstance = new GoogleGenAI({
            apiKey: key,
            httpOptions: {
                headers: {
                    'User-Agent': 'aistudio-build'
                }
            }
        });
    }
    return aiInstance;
};

const parseDataUri = (dataUri: string): { mimeType: string, data: string } => {
    const match = dataUri.match(/^data:([^;]+);base64,(.*)$/);
    if (match) {
        return { mimeType: match[1], data: match[2] };
    }
    return { mimeType: "image/jpeg", data: dataUri }; // Fallback
};

export const extractIDInfo = async (
    frontImageBase64: string, 
    backImageBase64: string
): Promise<{ firstName: string; lastName: string; documentId: string; birthDate: string } | null> => {
    const ai = getAI();
    if (!ai) return null;

    try {
        const frontParsed = parseDataUri(frontImageBase64);
        const backParsed = parseDataUri(backImageBase64);

        const prompt = `Analise cuidadosamente as imagens da frente e do verso deste documento de identidade e extraia as seguintes informações:
- Primeiro Nome (firstName): Apenas o primeiro nome ou nomes próprios. No formato original capitalizado.
- Sobrenome (lastName): Todos os sobrenomes. No formato original capitalizado.
- Número do Documento (documentId): O número principal de identificação (BI, RG, CPF ou Passaporte). Remova pontos, traços e espaços extras. Certifique-se de pegar o número completo.
- Data de Nascimento (birthDate): No formato YYYY-MM-DD.

INSTRUÇÕES CRÍTICAS:
1. Verifique ambos os lados para garantir a consistência dos dados.
2. Se houver divergência entre os lados, use o lado que parecer mais nítido ou oficial.
3. Certifique-se de retornar as informações exatas legíveis no documento.`;

        const response = await ai.models.generateContent({
            model: "gemini-3.5-flash",
            contents: [
                {
                    inlineData: {
                        mimeType: frontParsed.mimeType,
                        data: frontParsed.data,
                    }
                },
                {
                    inlineData: {
                        mimeType: backParsed.mimeType,
                        data: backParsed.data,
                    }
                },
                prompt
            ],
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        firstName: { type: Type.STRING },
                        lastName: { type: Type.STRING },
                        documentId: { type: Type.STRING },
                        birthDate: { type: Type.STRING }
                    },
                    required: ["firstName", "lastName", "documentId", "birthDate"]
                }
            }
        });

        const text = response.text || '';
        if (text) {
            return JSON.parse(text);
        }
        return null;
    } catch (error) {
        console.error("Error extracting ID info from Gemini:", error);
        return null;
    }
};

export const generateAdCopy = async (prompt: string): Promise<string> => {
    const ai = getAI();
    if (!ai) return "Sem resposta da IA.";

    try {
        const response = await ai.models.generateContent({
            model: "gemini-3.5-flash",
            contents: prompt,
        });
        return response.text || "Sem resposta da IA.";
    } catch (error) {
        console.error("Error generating ad copy:", error);
        return "Erro ao gerar cópia do anúncio via IA.";
    }
};

export const verifyUserIdentityWithAI = async (
    frontImageBase64: string, 
    backImageBase64: string,
    selfieImageBase64: string
): Promise<{ approved: boolean; reason: string }> => {
    const ai = getAI();
    if (!ai) return { approved: true, reason: "Aprovado automaticamente - IA indisponível." };

    try {
        const frontParsed = parseDataUri(frontImageBase64);
        const backParsed = parseDataUri(backImageBase64);
        const selfieParsed = parseDataUri(selfieImageBase64);

        const prompt = `Você é o agente de segurança e verificação de identidade (KYC) da plataforma FacePhone. 
Analise cuidadosamente as três imagens fornecidas:
1. Frente do Documento de Identidade
2. Verso do Documento de Identidade
3. Selfie do Usuário (Foto de rosto em tempo real)

Sua tarefa é avaliar se a identidade do usuário pode ser APROVADA ou se deve ser REJEITADA com base nas seguintes análises:
1. Comparação Facial (Reconhecimento Facial de Segurança): O rosto presente na Selfie do usuário é o MESMO rosto visível na foto do Documento de Identidade de frente? Considere feições faciais estruturais, nariz, olhos, boca e formato geral, ignorando eventuais mudanças simples como barba, cabelo ou cor/iluminação.
2. Legibilidade e Autenticidade: O documento parece oficial, nítido e autêntico ou parece falso, adulterado ou ilegível?
3. Prevenção de Duplicidade e Fraudes Estruturais: A FacePhone proíbe a duplicação de documentos e aberturas de contas duplicadas com as mesmas informações. Se houver indícios de que o documento já foi utilizado, ou se houver qualquer adulteração digital, rasura ou montagem que levante suspeitas de que se trata de uma duplicata fraudulenta, REJEITE sob aviso de "Duplicidade de Conta / Fraude Cadastral".
4. Se houver divergências irreparáveis ou se as feições faciais forem claramente de pessoas diferentes, REJEITE.

Sua resposta deve ser estruturada em JSON:
{
  "approved": boolean,
  "reason": "Explicação clara e amigável em português do motivo da aprovação ou da rejeição do documento."
}`;

        const response = await ai.models.generateContent({
            model: "gemini-3.5-flash",
            contents: [
                {
                    inlineData: {
                        mimeType: frontParsed.mimeType,
                        data: frontParsed.data,
                    }
                },
                {
                    inlineData: {
                        mimeType: backParsed.mimeType,
                        data: backParsed.data,
                    }
                },
                {
                    inlineData: {
                        mimeType: selfieParsed.mimeType,
                        data: selfieParsed.data,
                    }
                },
                prompt
            ],
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        approved: { type: Type.BOOLEAN },
                        reason: { type: Type.STRING }
                    },
                    required: ["approved", "reason"]
                }
            }
        });

        const text = response.text || '';
        if (text) {
            return JSON.parse(text);
        }
        return { approved: false, reason: "Incapaz de analisar o JSON de retorno da IA." };
    } catch (error) {
        console.error("Error in AI document verification:", error);
        return { approved: false, reason: "Erro crítico no processo de verificação da IA. Por favor, tente novamente com fotos mais nítidas." };
    }
};
