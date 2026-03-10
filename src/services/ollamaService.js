
export const summarizeWithOllama = async (text, baseUrl = 'http://localhost:11434', model = 'llama3') => {
  const prompt = `
Você é um editor especialista para um canal de notícias premium no Telegram.
Sua missão é criar um resumo dinâmico, direto ao ponto e otimizado para leitura em dispositivos móveis.

Notícia Analisada:
${text}

Por favor, elabore o resumo em Português do Brasil, obedecendo ESTRITAMENTE o formato Markdown abaixo:

**[Uma frase de impacto chamativa, curta e envolvente que resuma a notícia]**

🔸 [Fato 1 conciso]
🔸 [Fato 2 conciso]
🔸 [Fato 3 conciso]

Diretrizes Rigorosas:
- Forneça EXATAMENTE 3 bullet points, utilizando sempre o emoji 🔸.
- Nenhuma palavra antes ou depois da estrutura solicitada (sem introduções como "Aqui está o resumo").
- Mantenha o texto limpo, moderno e com no máximo 500 caracteres.
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
    const prompt = `Sua tarefa é atuar como um sofisticado sistema de classificação de notícias.
As categorias válidas e permitidas são EXATAMENTE E APENAS as seguintes: Tecnologia, Brasil, Mundo, Negócios, Ciência, Esportes, Automóveis, Entretenimento, Saúde, Cripto, Marketing, Moda, Música, Turismo, Games.

Analise o título e o conteúdo da notícia abaixo para determinar seu assunto principal:
Notícia:
${text}

**Regra de Ouro:** A sua resposta final DEVE conter APENAS o nome da categoria que melhor se encaixa.
Sem introduções, sem formatação Markdown extra, sem pontuação, e sem qualquer explicação. Exemplo de saída correta: Tecnologia
Se o assunto não se encaixar em nenhuma, a sua saída deve ser: Geral
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
