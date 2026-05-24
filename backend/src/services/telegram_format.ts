export const SEPARATOR = '──────────────────────';

export const CATEGORY_EMOJI: Record<string, string> = {
  'Mundo': '🌍', 'Negócios': '💼', 'Brasil': '🇧🇷', 'Tecnologia': '💻',
  'Ciência': '🔬', 'Esportes': '⚽', 'Entretenimento': '🎬', 'Games': '🎮', 'Saúde': '🏥',
  'AI Frontier': '🤖', 'Big Techs': '🏢', 'Dev Tools': '🛠️', 'Gaming': '🎮',
  'Negocios': '💼', 'Ciencia': '🔬', 'Engenharia': '⚙️', 'Open Source': '🐧',
  'Segurança': '🔐', 'Startups': '🚀', 'Anime': '🍜',
};

export const IMPACT_EMOJI: Record<string, string> = {
  critical: '🚨', high: '⚠️', medium: '📊', low: '📌',
};

export const SIGNAL_EMOJI: Record<string, string> = {
  bullish: '📈', bearish: '📉', neutral: '➡️',
};

export const FLAG_LABEL: Record<string, string> = {
  misleading_headline: '🔶 Título enganoso',
  missing_sources: '📭 Sem fontes',
  emotional_language: '🌡 Linguagem emocional',
  unverified_claims: '❓ Alegações não verificadas',
  conspiracy_theory: '🌀 Teoria conspiratória',
  satire: '🎭 Sátira',
  opinion_as_fact: '💬 Opinião como fato',
  selective_data: '📊 Dados seletivos',
  out_of_context: '✂️ Fora de contexto',
  fake_news: '🚫 Fake news',
  lie: '🤥 Mentira',
  hypocrisy: '🎪 Hipocrisia',
  incoherence: '⚡ Incoerência',
};

export const BIAS_LABEL: Record<string, string> = {
  neutral: '⚖️ Neutro', left: '🔵 Esquerda', far_left: '🔵🔵 Extrema esquerda',
  right: '🔴 Direita', far_right: '🔴🔴 Extrema direita',
};

export const SCORE_EMOJI = (s: number) =>
  s <= 2 ? '✅' : s <= 4 ? '🟡' : s <= 6 ? '🟠' : '🔴';

export function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

export function formatPublishedAt(date: Date | null | undefined): { label: string; isBreaking: boolean } {
  if (!date) return { label: '', isBreaking: false };
  const d = new Date(date);
  const diffMin = Math.floor((Date.now() - d.getTime()) / 60_000);
  const isBreaking = diffMin <= 30;
  const dateTime = d.toLocaleString('pt-BR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo',
  });
  const label = diffMin < 60 ? `${dateTime} (há ${diffMin}m)` : dateTime;
  return { label, isBreaking };
}
