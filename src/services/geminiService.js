
import { GoogleGenerativeAI } from "@google/generative-ai";

const QUEUE_DELAY = 1500; // 1.5 seconds delay between requests
let queue = Promise.resolve();

export const summarizeText = async (text, apiKey) => {
  if (!apiKey) {
    throw new Error("API Key is missing.");
  }

  // Create a promise that executes after the previous one in the queue
  const currentRequest = queue.then(async () => {
    // Wait for the delay
    await new Promise(resolve => setTimeout(resolve, QUEUE_DELAY));

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    const prompt = `Resuma a seguinte notícia em português em 2 ou 3 frases. Mantenha o resumo informativo e conciso:\n\n${text}`;

    try {
      const result = await model.generateContent(prompt);
      const response = await result.response;
      return response.text();
    } catch (error) {
      console.error("Error summarizing text:", error);
      throw error;
    }
  });

  // Update the queue to wait for this request, catching errors so the queue continues
  queue = currentRequest.catch(() => {});

  return currentRequest;
};
