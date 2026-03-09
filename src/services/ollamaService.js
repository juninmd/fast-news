
export const summarizeWithOllama = async (text, baseUrl = 'http://localhost:11434', model = 'llama3') => {
  const prompt = `
Atue como um editor de um canal de notícias no Telegram.
Resuma a notícia de forma envolvente, fácil de ler no celular e direto ao ponto.

Notícia:
${text}

Gere o resumo em Português do Brasil seguindo ESTRITAMENTE este formato em Markdown:

**[Uma frase de impacto chamativa]**

🔸 [Fato 1]
🔸 [Fato 2]
🔸 [Fato 3]

Diretrizes:
- Exatamente 3 bullet points usando o emoji 🔸.
- Não use introduções.
- Máximo de 500 caracteres.
`;

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
    const prompt = `Classifique a seguinte notícia em EXATAMENTE uma das seguintes categorias: Tecnologia, Brasil, Mundo, Negócios, Ciência, Esportes, Automóveis, Entretenimento, Saúde, Cripto, Marketing, Moda, Música, Turismo, Games.
Retorne APENAS o nome da categoria, sem explicações ou pontuação adicional.

Notícia:
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
