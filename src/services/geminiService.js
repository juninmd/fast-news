
import { GoogleGenerativeAI } from "@google/generative-ai";

export const summarizeText = async (text, apiKey) => {
  if (!apiKey) {
    throw new Error("API Key is missing.");
  }

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

  const prompt = `Resuma a seguinte notícia em português em 2 ou 3 frases. Mantenha o resumo informativo e conciso:\n\n${text}`;

  try {
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const summary = response.text();
    return summary;
  } catch (error) {
    console.error("Error summarizing text:", error);
    throw error;
  }
};
