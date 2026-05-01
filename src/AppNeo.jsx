import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ArticleGrid, ReaderPanel, SignalBoard, SourcesModal, TopBar } from './components/NeoPulse';
import { FEED_SOURCES } from './services/newsService';
import { fetchIntelBatch } from './services/intelNews';
import { analyzeArticleWithOllama } from './services/ollamaIntel';
import { fetchFullArticle } from './services/fullArticle';
import './styles/animations.css';

const CATEGORIES = ['Todas', ...new Set(FEED_SOURCES.map((item) => item.category))].sort();

function SettingsPanel({ settings, setSettings, onClose }) {
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/70 p-4" onClick={onClose}>
      <div className="w-full max-w-lg rounded-lg border border-white/10 bg-zinc-950 p-5" onClick={(e) => e.stopPropagation()}>
        <h2 className="text-xl font-black text-white">Motor local</h2>
        <p className="mt-1 text-sm text-zinc-400">Ollama precisa estar rodando com CORS liberado para o navegador.</p>
        {[
          ['ollamaUrl', 'URL Ollama'],
          ['ollamaModel', 'Modelo'],
          ['rssKey', 'RSS2JSON key'],
        ].map(([key, label]) => (
          <label key={key} className="mt-4 block text-sm text-zinc-300">
            {label}
            <input
              value={settings[key]}
              onChange={(event) => setSettings({ ...settings, [key]: event.target.value })}
              className="mt-2 w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-white outline-none"
            />
          </label>
        ))}
        <button onClick={onClose} className="neo-action mt-5">Salvar</button>
      </div>
    </div>
  );
}

export default function App() {
  const [articles, setArticles] = useState([]);
  const [analyses, setAnalyses] = useState({});
  const [category, setCategory] = useState('Todas');
  const [query, setQuery] = useState('');
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(false);
  const [reader, setReader] = useState(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [sourcesOpen, setSourcesOpen] = useState(false);
  const [fullArticles, setFullArticles] = useState({});
  const [fullLoading, setFullLoading] = useState({});
  const [theme, setTheme] = useState(() => localStorage.getItem('theme') || 'dark');
  const [settings, setSettingsState] = useState(() => ({
    ollamaUrl: localStorage.getItem('ollama_url') || 'http://localhost:11434',
    ollamaModel: localStorage.getItem('ollama_model') || 'llama3',
    rssKey: localStorage.getItem('rss2json_api_key') || '',
  }));
  const [meta, setMeta] = useState({ totalSources: FEED_SOURCES.length });
  const booted = useRef(false);

  const setSettings = (next) => {
    setSettingsState(next);
    localStorage.setItem('ollama_url', next.ollamaUrl);
    localStorage.setItem('ollama_model', next.ollamaModel);
    localStorage.setItem('rss2json_api_key', next.rssKey);
  };

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
    localStorage.setItem('theme', theme);
  }, [theme]);

  const load = useCallback(async ({ reset = false, nextCategory = category } = {}) => {
    if (loading) return;
    setLoading(true);
    try {
      const start = reset ? 0 : offset;
      const result = await fetchIntelBatch({ category: nextCategory, offset: start, rssKey: settings.rssKey });
      setArticles((prev) => {
        const next = reset ? result.articles : [...prev, ...result.articles];
        return [...new Map(next.map((item) => [item.id, item])).values()];
      });
      setOffset(result.nextOffset);
      setHasMore(result.hasMore);
      setMeta({ totalSources: result.totalSources });
    } finally {
      setLoading(false);
    }
  }, [category, loading, offset, settings.rssKey]);

  useEffect(() => {
    if (booted.current) return;
    booted.current = true;
    load({ reset: true });
  }, [load]);

  const changeCategory = (nextCategory) => {
    setCategory(nextCategory);
    setArticles([]);
    setOffset(0);
    setHasMore(true);
    load({ reset: true, nextCategory });
  };

  const openArticle = useCallback((article) => {
    setReader(article);
    if (fullArticles[article.id] || fullLoading[article.id]) return;
    setFullLoading((prev) => ({ ...prev, [article.id]: true }));
    fetchFullArticle(article)
      .then((content) => setFullArticles((prev) => ({ ...prev, [article.id]: content })))
      .catch(() => setFullArticles((prev) => ({ ...prev, [article.id]: article.body || article.excerpt })))
      .finally(() => setFullLoading((prev) => ({ ...prev, [article.id]: false })));
  }, [fullArticles, fullLoading]);

  const analyze = useCallback(async (article) => {
    setAnalyses((prev) => ({ ...prev, [article.id]: prev[article.id] || { summary: 'Analisando...', score: article.usefulScore } }));
    const result = await analyzeArticleWithOllama(article, settings.ollamaUrl, settings.ollamaModel);
    setAnalyses((prev) => ({ ...prev, [article.id]: result }));
  }, [settings.ollamaModel, settings.ollamaUrl]);

  useEffect(() => {
    const targets = articles.filter((item) => item.isUseful && !analyses[item.id]).slice(0, 3);
    targets.forEach((item) => analyze(item));
  }, [articles, analyses, analyze]);

  const visible = useMemo(() => {
    const needle = query.toLowerCase();
    return articles.filter((item) => !needle ||
      `${item.title} ${item.source} ${item.category}`.toLowerCase().includes(needle));
  }, [articles, query]);

  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      <TopBar
        query={query}
        setQuery={setQuery}
        theme={theme}
        toggleTheme={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
        refresh={() => load({ reset: true })}
        loading={loading}
        settings={() => setSettingsOpen(true)}
        sources={() => setSourcesOpen(true)}
      />
      <main className="mx-auto max-w-7xl space-y-6 px-4 py-6">
        <SignalBoard articles={visible} analyzed={Object.keys(analyses).length} totalSources={meta.totalSources} />
        <nav className="-mx-4 flex gap-2 overflow-x-auto px-4 py-2 sm:mx-0 sm:px-0">
          {CATEGORIES.map((item) => (
            <button key={item} onClick={() => changeCategory(item)} className={`neo-chip ${category === item ? 'bg-cyan-300 text-zinc-950' : ''}`}>
              {item}
            </button>
          ))}
        </nav>
        <ArticleGrid articles={visible} analyses={analyses} selected={reader} onOpen={openArticle} onAnalyze={analyze} loading={loading} />
        {hasMore && <button onClick={() => load()} className="neo-action mx-auto flex">{loading ? 'Lendo fontes...' : 'Carregar mais fontes'}</button>}
      </main>
      <ReaderPanel
        article={reader}
        analysis={reader && analyses[reader.id]}
        fullContent={reader && fullArticles[reader.id]}
        fullLoading={reader && fullLoading[reader.id]}
        onClose={() => setReader(null)}
        onAnalyze={analyze}
      />
      {settingsOpen && <SettingsPanel settings={settings} setSettings={setSettings} onClose={() => setSettingsOpen(false)} />}
      {sourcesOpen && <SourcesModal sources={FEED_SOURCES} onClose={() => setSourcesOpen(false)} />}
    </div>
  );
}
