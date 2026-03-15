export const summarizeWithGemini = async (text, apiKey) => {
  if (!apiKey) {
    throw new Error("API Key do Gemini não fornecida.");
  }

  const prompt = `Resuma o seguinte texto em português do Brasil em um único parágrafo conciso, focando nos pontos principais. O texto é uma notícia.

Texto:
${text}

Resumo:`;

  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        contents: [{
          parts: [{
            text: prompt
          }]
        }]
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`Gemini API Error: ${errorData.error?.message || response.statusText}`);
    }

    const data = await response.json();
    const summary = data.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!summary) {
      throw new Error("Não foi possível gerar o resumo.");
    }

    return summary.trim();
  } catch (error) {
    console.error("Error summarizing with Gemini:", error);
    throw error;
  }
};

export const classifyWithGemini = async (text, apiKey) => {
  if (!apiKey) {
    throw new Error("API Key do Gemini não fornecida.");
  }

  const prompt = `Classifique a seguinte notícia em APENAS UMA das seguintes categorias:
Tecnologia, IA, Brasil, Mundo, Negócios, Ciência, Esportes, Automóveis, Entretenimento, Games, Saúde, Cripto, Marketing, Moda, Música, Turismo.
Responda APENAS com o nome da categoria, sem nenhuma outra palavra ou pontuação.
Se não tiver certeza, responda "Geral".

Texto:
${text}

Categoria:`;

  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        contents: [{
          parts: [{
            text: prompt
          }]
        }]
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`Gemini API Error: ${errorData.error?.message || response.statusText}`);
    }

    const data = await response.json();
    const category = data.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!category) {
      throw new Error("Não foi possível classificar.");
    }

    const cleanedCategory = category.trim().replace(/[^a-zA-ZÀ-ÿ\s]/g, '').split('\n')[0].trim();

    const validCategories = ['Tecnologia', 'IA', 'Brasil', 'Mundo', 'Negócios', 'Ciência', 'Esportes', 'Automóveis', 'Entretenimento', 'Games', 'Saúde', 'Cripto', 'Marketing', 'Moda', 'Música', 'Turismo', 'Geral'];

    const matchedCategory = validCategories.find(c => c.toLowerCase() === cleanedCategory.toLowerCase());

    if (matchedCategory) {
        return matchedCategory;
    }

    return "Geral";
  } catch (error) {
    console.error("Error classifying with Gemini:", error);
    return "Geral";
  }
};

export const testGeminiConnection = async (apiKey) => {
  if (!apiKey) {
    throw new Error("API Key do Gemini não fornecida.");
  }

  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        contents: [{
          parts: [{
            text: "Olá"
          }]
        }]
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`Gemini API Error: ${errorData.error?.message || response.statusText}`);
    }

    return true;
  } catch (error) {
    console.error("Error testing Gemini connection:", error);
    throw error;
  }
};
