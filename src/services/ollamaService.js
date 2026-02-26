
export const summarizeWithOllama = async (text, baseUrl = 'http://localhost:11434', model = 'llama3') => {
  const prompt = `Resuma a seguinte notícia em Português do Brasil usando tópicos (bullet points) com emojis no início de cada ponto.
Seja direto e conciso. Foque nos fatos principais.

Texto:
${text}

Resumo:`;

  try {
    const response = await fetch(`${baseUrl}/api/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: model,
        prompt: prompt,
        stream: false,
      }),
    });

    if (!response.ok) {
        // Handle specific Ollama errors or network issues
        const errorText = await response.text();
        throw new Error(`Ollama Error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    return data.response.trim();
  } catch (error) {
    console.error('Error summarizing with Ollama:', error);
    throw error;
  }
};

export const classifyWithOllama = async (text, baseUrl = 'http://localhost:11434', model = 'llama3') => {
    const prompt = `Classifique a seguinte notícia em uma das seguintes categorias: Tecnologia, Brasil, Mundo, Negócios, Ciência, Esportes, Automóveis, Entretenimento, Saúde, Cripto. Retorne APENAS o nome da categoria.

Texto:
${text}

Categoria:`;

    try {
        const response = await fetch(`${baseUrl}/api/generate`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ model, prompt, stream: false })
        });

        if (!response.ok) throw new Error('Failed to classify');
        const data = await response.json();
        return data.response.trim();
    } catch (error) {
        console.error('Error classifying:', error);
        return 'Geral';
    }
};
