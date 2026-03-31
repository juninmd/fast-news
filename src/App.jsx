import React, { useState, useEffect, useMemo } from 'react';
import Feed from './components/Feed';
import TrendingTopics from './components/TrendingTopics';
import Settings from './components/Settings';
import Sidebar from './components/Sidebar';
import { Newspaper, Moon, Sun, Settings as SettingsIcon, Menu, Search, X } from 'lucide-react';
import { FEED_SOURCES } from './services/newsService';

function App() {
  const [darkMode, setDarkMode] = useState(() => {
    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
      return true;
    }
    return false;
  });
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  // Settings State
  const [aiProvider, setAiProvider] = useState(() => localStorage.getItem('ai_provider') || 'ollama');
  const [geminiApiKey, setGeminiApiKey] = useState(() => localStorage.getItem('gemini_api_key'));
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

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [darkMode]);

  const toggleTheme = () => {
    setDarkMode(!darkMode);
  };

  const handleSaveSettings = (newSettings) => {
    setAiProvider(newSettings.aiProvider);
    setGeminiApiKey(newSettings.geminiApiKey);
    setCustomFeeds(newSettings.customFeeds);
    setRss2jsonApiKey(newSettings.rss2jsonApiKey);
    setAutoSummarize(newSettings.autoSummarize);
    setOllamaUrl(newSettings.ollamaUrl);
    setOllamaModel(newSettings.ollamaModel);
    setTelegramBotToken(newSettings.telegramBotToken);
    setTelegramChatId(newSettings.telegramChatId);
  };

  const categories = useMemo(() => {
      const allSources = [...FEED_SOURCES, ...customFeeds];
      const cats = ['Todas', ...new Set(allSources.map(s => s.category).filter(Boolean))];
      return cats.sort();
  }, [customFeeds]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900 transition-colors duration-500 flex font-sans text-slate-900 dark:text-slate-100 selection:bg-blue-500/30">

      {/* Sidebar */}
      <Sidebar
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
        isCollapsed={isSidebarCollapsed}
        toggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
        categories={categories}
        selectedCategory={selectedCategory}
        onSelectCategory={setSelectedCategory}
      />

      {/* Main Content */}
      <div className={`flex-1 flex flex-col min-w-0 transition-all duration-300 ${isSidebarCollapsed ? 'lg:ml-24' : 'lg:ml-80'} bg-transparent`}>

          {/* Header */}
          <header className="bg-white/90 dark:bg-slate-950/90 backdrop-blur-2xl sticky top-0 z-30 border-b border-slate-200/80 dark:border-slate-800/80 px-4 sm:px-8 py-4 sm:py-6 shadow-sm">
            <div className="flex justify-between items-center gap-4 sm:gap-8 max-w-[1600px] mx-auto w-full">
                <div className="flex items-center gap-3 sm:gap-5 lg:hidden">
                    <button
                        onClick={() => setIsSidebarOpen(true)}
                        className="p-2 sm:p-3 -ml-2 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-2xl transition-colors active:scale-95 bg-white/50 dark:bg-slate-900/50 shadow-sm border border-slate-100 dark:border-slate-800"
                    >
                        <Menu size={22} className="sm:w-6 sm:h-6" />
                    </button>
                    <span className="font-black text-2xl sm:text-3xl bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-indigo-600 dark:from-blue-400 dark:to-indigo-400 tracking-tight">NewsAI</span>
                </div>

                <div className="flex-1 max-w-4xl hidden md:block mx-auto">
                   <div className="relative group shadow-sm hover:shadow-md transition-shadow duration-300 rounded-[1.5rem]">
                       <div className="absolute inset-y-0 left-0 pl-5 flex items-center pointer-events-none">
                           <Search size={22} className="text-slate-400 group-focus-within:text-blue-500 transition-colors" />
                       </div>
                       <input
                          type="text"
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          placeholder="Pesquisar notícias, termos ou tópicos..."
                          className="block w-full pl-14 pr-5 py-4 border-2 border-slate-100 dark:border-slate-800/80 rounded-[1.5rem] leading-5 bg-white dark:bg-slate-900/60 text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:bg-white dark:focus:bg-slate-950 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all text-[16px] font-medium"
                       />
                       {searchQuery && (
                           <button
                                onClick={() => setSearchQuery('')}
                                className="absolute inset-y-0 right-0 pr-5 flex items-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
                           >
                               <X size={20} className="bg-slate-100 dark:bg-slate-800 rounded-full p-1" />
                           </button>
                       )}
                   </div>
                </div>

                <div className="flex items-center gap-3 sm:gap-4">
                    <button
                        onClick={toggleTheme}
                        className="p-3 sm:p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-blue-400 dark:hover:border-blue-600 text-slate-600 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 shadow-sm hover:shadow-md transition-all hover:scale-105 active:scale-95"
                        title={darkMode ? "Modo claro" : "Modo escuro"}
                    >
                        {darkMode ? <Sun size={22} /> : <Moon size={22} />}
                    </button>
                    <button
                        onClick={() => setIsSettingsOpen(true)}
                        className="p-3 sm:p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-indigo-400 dark:hover:border-indigo-600 text-slate-600 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 shadow-sm hover:shadow-md transition-all hover:scale-105 active:scale-95"
                        title="Configurações"
                    >
                        <SettingsIcon size={22} />
                    </button>
                </div>
            </div>

            {/* Mobile Search */}
            <div className="md:hidden mt-5 pb-1 px-1">
                 <div className="relative shadow-sm hover:shadow-md transition-shadow rounded-2xl">
                       <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                           <Search size={20} className="text-slate-400" />
                       </div>
                       <input
                          type="text"
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          placeholder="Buscar notícias..."
                          className="block w-full pl-12 pr-4 py-3.5 border-2 border-slate-100 dark:border-slate-800 rounded-2xl leading-5 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all text-[15px] font-medium"
                       />
                       {searchQuery && (
                           <button
                                onClick={() => setSearchQuery('')}
                                className="absolute inset-y-0 right-0 pr-4 flex items-center text-slate-400 hover:text-slate-600"
                           >
                               <X size={18} className="bg-slate-100 dark:bg-slate-800 rounded-full p-0.5" />
                           </button>
                       )}
                   </div>
            </div>
          </header>

          <main className="flex-1 p-4 sm:p-6 lg:p-8 pt-10 overflow-x-hidden">
            <div className="max-w-7xl mx-auto space-y-12">
                {selectedCategory === 'Todas' && !searchQuery && (
                    <section className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                         <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-6 flex items-center gap-3 tracking-tight">
                             <span className="text-blue-600 dark:text-blue-500">Trending</span> Topics
                         </h2>
                         <TrendingTopics />
                    </section>
                )}

                <section className="animate-in fade-in slide-in-from-bottom-8 duration-700 delay-100">
                     <div className="flex items-center justify-between mb-6">
                        <h2 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-3 tracking-tight">
                            {searchQuery ? `Resultados para "${searchQuery}"` : (selectedCategory === 'Todas' ? 'Últimas Notícias' : selectedCategory)}
                        </h2>
                     </div>

                     <Feed
                        aiProvider={aiProvider}
                        geminiApiKey={geminiApiKey}
                        rss2jsonApiKey={rss2jsonApiKey}
                        autoSummarize={autoSummarize}
                        customFeeds={customFeeds}
                        selectedCategory={selectedCategory}
                        searchQuery={searchQuery}
                        ollamaUrl={ollamaUrl}
                        ollamaModel={ollamaModel}
                        telegramBotToken={telegramBotToken}
                        telegramChatId={telegramChatId}
                    />
                </section>
            </div>
          </main>
      </div>

      {isSettingsOpen && (
        <Settings
          isOpen={true}
          onClose={() => setIsSettingsOpen(false)}
          onSave={handleSaveSettings}
          initialCustomFeeds={customFeeds}
        />
      )}
    </div>
  );
}

export default App;
