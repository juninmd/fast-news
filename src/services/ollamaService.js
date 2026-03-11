
export const summarizeWithOllama = async (text, baseUrl = 'http://localhost:11434', model = 'llama3') => {
  const prompt = `
Você é um editor especialista para um canal de notícias premium no Telegram.
Sua missão é criar um resumo dinâmico, direto ao ponto e otimizado para leitura em dispositivos móveis.

Notícia Analisada:
${text}

Por favor, elabore o resumo em Português do Brasil, obedecendo ESTRITAMENTE o formato Markdown abaixo:

**[Uma frase de impacto chamativa e curta]**

🔸 [Fato 1 mais importante]
🔸 [Fato 2 relevante]
🔸 [Fato 3 complementar]

Diretrizes:
- Você deve SEMPRE retornar EXATAMENTE 3 (três) bullet points. Nunca mais, nunca menos.
- Cada bullet point DEVE começar com o emoji 🔸.
- Não crie introduções nem adicione texto fora deste formato.
- O tamanho máximo da sua resposta deve ser de 500 caracteres no total.
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
    const categories = ['Tecnologia', 'IA', 'Brasil', 'Mundo', 'Negócios', 'Ciência', 'Esportes', 'Automóveis', 'Entretenimento', 'Games', 'Saúde', 'Cripto', 'Marketing', 'Moda', 'Música', 'Turismo', 'Geral'];
    const prompt = `Classifique a seguinte notícia em EXATAMENTE e APENAS uma das seguintes categorias: [${categories.join(', ')}].

Analise o título e o conteúdo da notícia abaixo para determinar seu assunto principal:
Notícia:
${text}

Obrigatório: Retorne APENAS o nome da categoria.
Proibido: Não explique sua decisão e não adicione pontuação (como ponto final) ou qualquer outro texto.
Se você não tiver certeza de qual categoria escolher ou se nenhuma for exata, retorne exatamente "Geral".

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
