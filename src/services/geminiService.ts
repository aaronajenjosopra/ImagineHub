import { GoogleGenAI, Type } from "@google/genai";

let aiInstance: GoogleGenAI | null = null;

function getAI() {
  if (!aiInstance) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY is not defined. Please configure it in the Secrets panel.");
    }
    aiInstance = new GoogleGenAI({ apiKey });
  }
  return aiInstance;
}

export const geminiService = {
  async generateTaskDescription(title: string) {
    const ai = getAI();
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Genera una descripción técnica, pasos a seguir y documentación necesaria para la siguiente tarea: "${title}". Responde en formato JSON con los campos: descripcion, pasos (array de strings), documentacion.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            descripcion: { type: Type.STRING },
            pasos: { type: Type.ARRAY, items: { type: Type.STRING } },
            documentacion: { type: Type.STRING }
          },
          required: ["descripcion", "pasos", "documentacion"]
        }
      }
    });
    return JSON.parse(response.text);
  },

  async suggestMailboxSolution(title: string, content: string) {
    const ai = getAI();
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Actúa como un asistente experto de la empresa. Un usuario ha publicado el siguiente problema/idea:
      Título: ${title}
      Contenido: ${content}
      
      Intenta resolverlo o dar una respuesta útil inmediata. Responde en formato JSON con el campo: solucion.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            solucion: { type: Type.STRING }
          },
          required: ["solucion"]
        }
      }
    });
    return JSON.parse(response.text);
  }
};
