
export const summarizeWithOllama = async (text, baseUrl = 'http://localhost:11434', model = 'llama3') => {
  const prompt = `
Atue como um editor chefe experiente. Sua tarefa é criar um resumo conciso e envolvente da notícia abaixo.

**Regras de Formatação (Markdown):**
- Use **negrito** para destacar palavras-chave ou entidades importantes.
- Use listas com marcadores (-) para os pontos principais.
- Adicione um emoji relevante no início de cada ponto para tornar a leitura mais dinâmica.
- Mantenha o tom jornalístico, direto e imparcial.
- O resumo deve ter no máximo 3 ou 4 pontos.

Notícia:
${text}

Resumo Markdown:`;

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
    const prompt = `Classifique a seguinte notícia em EXATAMENTE uma das seguintes categorias: Tecnologia, Brasil, Mundo, Negócios, Ciência, Esportes, Automóveis, Entretenimento, Saúde, Cripto.
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
