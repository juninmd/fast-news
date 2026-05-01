const fallback = (article, error) => ({
  summary: article.excerpt || 'Sem texto suficiente para resumir.',
  useful: article.isUseful,
  score: article.usefulScore,
  why: error ? `Ollama indisponivel: ${error.message}` : 'Triagem heuristica local.',
  actions: ['Abrir fonte original', 'Comparar com outra cobertura'],
  risks: ['Resumo limitado ao conteudo do RSS'],
});

const parseJson = (text) => {
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  if (start === -1 || end === -1) throw new Error('Resposta sem JSON');
  return JSON.parse(text.slice(start, end + 1));
};

export async function analyzeArticleWithOllama(article, baseUrl, model) {
  const prompt = `
Analise esta noticia como editor de inteligencia. Responda apenas JSON valido.
Campos: summary, useful, score, why, actions, risks.
summary: maximo 360 caracteres em pt-BR.
useful: booleano se merece atencao pratica.
score: inteiro 0-100.
actions e risks: arrays com 2 itens curtos.

Titulo: ${article.title}
Fonte: ${article.source}
Categoria: ${article.category}
Texto: ${article.body || article.excerpt}
`;

  try {
    const response = await fetch(`${baseUrl}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model, prompt, stream: false }),
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = await response.json();
    const parsed = parseJson(data.response || '');
    return {
      summary: parsed.summary || article.excerpt,
      useful: Boolean(parsed.useful),
      score: Number(parsed.score || article.usefulScore),
      why: parsed.why || 'Analise Ollama concluida.',
      actions: Array.isArray(parsed.actions) ? parsed.actions.slice(0, 2) : [],
      risks: Array.isArray(parsed.risks) ? parsed.risks.slice(0, 2) : [],
    };
  } catch (error) {
    return fallback(article, error);
  }
}
