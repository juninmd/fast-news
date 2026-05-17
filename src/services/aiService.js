const API_BASE = import.meta.env.VITE_API_URL || '';

async function generate(prompt, model) {
  const response = await fetch(`${API_BASE}/api/ai/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ model, prompt, stream: false }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`AI API Error: ${response.status} - ${errorText}`);
  }

  const data = await response.json();
  return data.response.trim();
}

export async function summarizeWithBackendAI(text, model) {
  const prompt = `
Atue como um editor de um canal de noticias no Telegram.
Resuma a noticia de forma envolvente, facil de ler no celular e direto ao ponto.

Noticia:
${text}

Gere o resumo em Portugues do Brasil seguindo ESTRITAMENTE este formato em Markdown:

**[Uma frase de impacto chamativa e curta]**

- [Fato 1 mais importante]
- [Fato 2 relevante]
- [Fato 3 complementar]

Diretrizes:
- Retorne exatamente 3 bullet points.
- Nao crie introducoes nem texto fora deste formato.
- O tamanho maximo da resposta deve ser de 500 caracteres.
`;
  return generate(prompt, model);
}

export async function classifyWithBackendAI(text, model) {
  const categories = ['Tecnologia', 'IA', 'Brasil', 'Mundo', 'Negocios', 'Ciencia', 'Esportes', 'Automoveis', 'Entretenimento', 'Games', 'Saude', 'Cripto', 'Marketing', 'Moda', 'Musica', 'Turismo', 'Geral'];
  const prompt = `Classifique a noticia em exatamente uma destas categorias: [${categories.join(', ')}].
Retorne apenas o nome da categoria, sem explicacoes.

Noticia:
${text}

Categoria:`;

  try {
    return await generate(prompt, model);
  } catch {
    return 'Geral';
  }
}
