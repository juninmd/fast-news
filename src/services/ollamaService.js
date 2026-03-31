export const summarizeWithOllama = async (text, baseUrl = 'http://localhost:11434', model = 'llama3') => {
  const prompt = `Você é um editor sênior para um canal de notícias premium no Telegram.
Sua tarefa é criar um resumo altamente engajador, direto e otimizado para mobile.

Notícia Analisada:
${text}

Gere o resumo em Português do Brasil, seguindo RIGOROSAMENTE este formato:

**[Crie uma frase de impacto curta e instigante]**

🔸 [Ponto principal 1]
🔸 [Ponto principal 2]
🔸 [Ponto principal 3]

Regras irrevogáveis:
- Exatamente 3 bullet points começando com 🔸.
- Proibido usar hashtags.
- Proibido saudações, conclusões ou links no texto.
- Máximo de 500 caracteres.`;

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
    const categories = ['Tecnologia', 'IA', 'Brasil', 'Mundo', 'Negócios', 'Ciência', 'Esportes', 'Automóveis', 'Entretenimento', 'Games', 'Saúde', 'Cripto', 'Marketing', 'Moda', 'Música', 'Turismo', 'Educação', 'Política', 'Geral'];
    const prompt = `Classifique a seguinte notícia em EXATAMENTE e APENAS uma das seguintes categorias: [${categories.join(', ')}].

Analise o título e o conteúdo da notícia abaixo para determinar seu assunto principal:
Notícia:
${text.substring(0, 600)}

Obrigatório: Retorne ESTRITAMENTE o nome de UMA das categorias acima, e mais NADA.
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
