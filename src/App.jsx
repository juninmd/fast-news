import React, { useState, useEffect, useMemo } from 'react';
import Feed from './components/Feed';
import TrendingTopics from './components/TrendingTopics';
import Settings from './components/Settings';
import Sidebar from './components/Sidebar';
import ErrorBoundary from './components/ErrorBoundary';
import { ToastProvider, useToast } from './components/Toast';
import NetworkStatus from './components/NetworkStatus';
import GlobalErrorHandler from './components/GlobalErrorHandler';
import BookmarkPanel from './components/BookmarkPanel';
import ReadingProgress from './components/ReadingProgress';
import { Newspaper, Moon, Sun, Settings as SettingsIcon, Menu, Search, X, Keyboard, Bookmark } from 'lucide-react';
import { FEED_SOURCES } from './services/newsService';
import { useKeyboardShortcut, useDebounce } from './hooks';

function AppContent() {
  const [darkMode, setDarkMode] = useState(() => {
    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
      return true;
    }
    return false;
  });
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [showShortcuts, setShowShortcuts] = useState(false);
  const [showBookmarks, setShowBookmarks] = useState(false);

  const [apiKey, setApiKey] = useState(() => localStorage.getItem('gemini_api_key'));
  const [aiProvider, setAiProvider] = useState(() => localStorage.getItem('ai_provider') || 'ollama');
  const [rss2jsonApiKey, setRss2jsonApiKey] = useState(() => localStorage.getItem('rss2json_api_key'));
  const [autoSummarize, setAutoSummarize] = useState(() => localStorage.getItem('auto_summarize') === 'true');
  const [ollamaUrl, setOllamaUrl] = useState(() => localStorage.getItem('ollama_url') || 'http://localhost:11434');
  const [ollamaModel, setOllamaModel] = useState(() => localStorage.getItem('ollama_model') || 'llama3');
  const [telegramBotToken, setTelegramBotToken] = useState(() => localStorage.getItem('telegram_bot_token'));
  const [telegramChatId, setTelegramChatId] = useState(() => localStorage.getItem('telegram_chat_id'));

  const [customFeeds, setCustomFeeds] = useState(() => {
    try {
      const stored = localStorage.getItem('custom_feeds');
      return stored ? JSON.parse(stored) : [];
    } catch (e) {
      console.error("Error parsing custom_feeds", e);
      return [];
    }
  });

  const [selectedCategory, setSelectedCategory] = useState('Todas');
  const [searchQuery, setSearchQuery] = useState('');
  const debouncedSearch = useDebounce(searchQuery, 300);

  const toast = useToast();

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [darkMode]);

  useKeyboardShortcut('k', () => setShowShortcuts(p => !p), { ctrl: true });
  useKeyboardShortcut('s', () => setIsSettingsOpen(true), { ctrl: true });
  useKeyboardShortcut('d', () => setDarkMode(d => !d), { alt: true });
  useKeyboardShortcut('b', () => setShowBookmarks(p => !p), { ctrl: true });

  const toggleTheme = () => {
    setDarkMode(!darkMode);
  };

  const handleSaveSettings = (newSettings) => {
    setApiKey(newSettings.geminiApiKey);
    setAiProvider(newSettings.aiProvider);
    setCustomFeeds(newSettings.customFeeds);
    setRss2jsonApiKey(newSettings.rss2jsonApiKey);
    setAutoSummarize(newSettings.autoSummarize);
    setOllamaUrl(newSettings.ollamaUrl);
    setOllamaModel(newSettings.ollamaModel);
    setTelegramBotToken(newSettings.telegramBotToken);
    setTelegramChatId(newSettings.telegramChatId);
    toast.success('Configurações salvas com sucesso!');
  };

  const categories = useMemo(() => {
    const allSources = [...FEED_SOURCES, ...customFeeds];
    const cats = ['Todas', ...new Set(allSources.map(s => s.category).filter(Boolean))];
    return cats.sort();
  }, [customFeeds]);

  return (
    <ErrorBoundary>
      <NetworkStatus />
      <ReadingProgress />
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900 transition-colors duration-300 flex font-sans">

        <Sidebar
          isOpen={isSidebarOpen}
          onClose={() => setIsSidebarOpen(false)}
          isCollapsed={isSidebarCollapsed}
          toggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
          categories={categories}
          selectedCategory={selectedCategory}
          onSelectCategory={setSelectedCategory}
        />

        <div className={`flex-1 flex flex-col min-w-0 transition-all duration-300 ${isSidebarCollapsed ? 'lg:ml-20' : 'lg:ml-72'} bg-transparent`}>

          <header className="bg-white/80 dark:bg-[#0f172a]/80 backdrop-blur-2xl sticky top-0 z-30 border-b border-slate-200/50 dark:border-slate-800/80 px-4 sm:px-8 py-5">
            <div className="flex justify-between items-center gap-6 max-w-[1600px] mx-auto w-full">
              <div className="flex items-center gap-4 lg:hidden">
                <button
                  onClick={() => setIsSidebarOpen(true)}
                  className="p-2 -ml-2 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors"
                >
                  <Menu size={24} />
                </button>
                <span className="font-bold text-xl dark:text-white bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-indigo-600">NewsAI</span>
              </div>

              <div className="flex-1 max-w-3xl hidden md:block">
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <Search size={18} className="text-slate-400 group-focus-within:text-blue-500 transition-colors" />
                  </div>
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Pesquise por termos ou palavras-chave..."
                    className="block w-full pl-11 pr-4 py-3 border border-slate-200 dark:border-slate-800/80 rounded-[1rem] leading-5 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:bg-white dark:focus:bg-slate-950 focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition-all text-[15px] shadow-sm"
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery('')}
                      className="absolute inset-y-0 right-0 pr-4 flex items-center text-slate-400 hover:text-slate-600"
                    >
                      <X size={18} />
                    </button>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-3">
                <button
                  onClick={() => setShowShortcuts(p => !p)}
                  className="p-3 rounded-[1rem] hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400 transition-all hover:scale-105 active:scale-95 border border-transparent dark:hover:border-slate-700"
                  title="Atalhos de teclado"
                >
                  <Keyboard size={20} />
                </button>
                <button
                  onClick={() => setShowBookmarks(p => !p)}
                  className="p-3 rounded-[1rem] hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400 transition-all hover:scale-105 active:scale-95 border border-transparent dark:hover:border-slate-700"
                  title="Favoritos"
                >
                  <Bookmark size={20} />
                </button>
                <button
                  onClick={toggleTheme}
                  className="p-3 rounded-[1rem] hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400 transition-all hover:scale-105 active:scale-95 border border-transparent dark:hover:border-slate-700"
                  title={darkMode ? "Modo claro" : "Modo escuro"}
                >
                  {darkMode ? <Sun size={20} /> : <Moon size={20} />}
                </button>
                <button
                  onClick={() => setIsSettingsOpen(true)}
                  className="p-3 rounded-[1rem] hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400 transition-all hover:scale-105 active:scale-95 border border-transparent dark:hover:border-slate-700"
                  title="Configurações"
                >
                  <SettingsIcon size={20} />
                </button>
              </div>
            </div>

            <div className="md:hidden mt-3 pb-1">
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Search size={16} className="text-slate-400" />
                </div>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Buscar notícias..."
                  className="block w-full pl-10 pr-3 py-2 border border-slate-200 dark:border-slate-800 rounded-xl leading-5 bg-slate-100/50 dark:bg-slate-900/50 text-slate-900 dark:text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition-all text-sm"
                />
              </div>
            </div>
          </header>

          <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-x-hidden">
            <div className="max-w-7xl mx-auto space-y-12">
              {selectedCategory === 'Todas' && !debouncedSearch && (
                <section className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                  <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-6 flex items-center gap-3 tracking-tight">
                    <span className="text-blue-600 dark:text-blue-500">Trending</span> Topics
                  </h2>
                  <TrendingTopics apiKey={apiKey || rss2jsonApiKey} />
                </section>
              )}

              <section className="animate-in fade-in slide-in-from-bottom-8 duration-700 delay-100">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-3 tracking-tight">
                    {debouncedSearch ? `Resultados para "${debouncedSearch}"` : (selectedCategory === 'Todas' ? 'Últimas Notícias' : selectedCategory)}
                  </h2>
                </div>

                <Feed
                  apiKey={apiKey}
                  aiProvider={aiProvider}
                  rss2jsonApiKey={rss2jsonApiKey}
                  autoSummarize={autoSummarize}
                  customFeeds={customFeeds}
                  selectedCategory={selectedCategory}
                  searchQuery={debouncedSearch}
                  ollamaUrl={ollamaUrl}
                  ollamaModel={ollamaModel}
                  telegramBotToken={telegramBotToken}
                  telegramChatId={telegramChatId}
                />
              </section>
            </div>
          </main>
        </div>

        {showShortcuts && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200" onClick={() => setShowShortcuts(false)}>
            <div className="bg-white dark:bg-gray-800 rounded-2xl w-full max-w-md p-6 shadow-2xl border border-gray-100 dark:border-gray-700" onClick={e => e.stopPropagation()}>
              <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                <Keyboard size={20} />
                Atalhos de Teclado
              </h3>
              <div className="space-y-3">
                {[
                  { key: 'Ctrl + K', action: 'Abrir atalhos' },
                  { key: 'Ctrl + S', action: 'Abrir configurações' },
                  { key: 'Ctrl + B', action: 'Ver favoritos' },
                  { key: 'Alt + D', action: 'Alternar tema escuro' },
                ].map(({ key, action }) => (
                  <div key={key} className="flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-700/30 rounded-xl">
                    <span className="text-gray-600 dark:text-gray-300">{action}</span>
                    <kbd className="px-3 py-1.5 bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-200 text-xs font-bold rounded-lg">{key}</kbd>
                  </div>
                ))}
              </div>
              <button onClick={() => setShowShortcuts(false)} className="mt-4 w-full py-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 text-sm">Pressione ESC ou clique fora</button>
            </div>
          </div>
        )}

        {isSettingsOpen && (
          <Settings
            isOpen={true}
            onClose={() => setIsSettingsOpen(false)}
            onSave={handleSaveSettings}
            initialCustomFeeds={customFeeds}
          />
        )}

        {showBookmarks && (
          <BookmarkPanel isOpen={showBookmarks} onClose={() => setShowBookmarks(false)} />
        )}
      </div>
    </ErrorBoundary>
  );
}

function App() {
  return (
    <ToastProvider>
      <GlobalErrorHandler>
        <AppContent />
      </GlobalErrorHandler>
    </ToastProvider>
  );
}

export default App;