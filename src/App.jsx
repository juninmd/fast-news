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
  // Default to ollama to strictly enforce the requested feature
  const [aiProvider, setAiProvider] = useState(() => 'ollama');
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
    <div className="min-h-screen bg-[#F5F7FA] dark:bg-[#0B0F19] transition-colors duration-500 flex font-sans text-[#1A202C] dark:text-[#E2E8F0] selection:bg-blue-500/30">

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
          <header className="bg-white/80 dark:bg-[#111827]/80 backdrop-blur-xl sticky top-0 z-30 border-b border-gray-200 dark:border-gray-800 px-4 sm:px-8 py-4 shadow-[0_2px_10px_-3px_rgba(6,81,237,0.1)]">
            <div className="flex justify-between items-center gap-6 max-w-[1600px] mx-auto w-full">
                <div className="flex items-center gap-4 lg:hidden">
                    <button
                        onClick={() => setIsSidebarOpen(true)}
                        className="p-2.5 -ml-2 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition-colors active:scale-95"
                    >
                        <Menu size={24} />
                    </button>
                    <span className="font-black text-2xl dark:text-white bg-clip-text text-transparent bg-gradient-to-r from-indigo-500 to-cyan-400 tracking-tight">NewsAI</span>
                </div>

                <div className="flex-1 max-w-2xl hidden md:block mx-auto">
                   <div className="relative group shadow-sm rounded-full overflow-hidden transition-all duration-300 hover:shadow-md hover:shadow-indigo-500/10 focus-within:shadow-md focus-within:shadow-indigo-500/20">
                       <div className="absolute inset-y-0 left-0 pl-5 flex items-center pointer-events-none">
                           <Search size={18} className="text-gray-400 group-focus-within:text-indigo-500 transition-colors" />
                       </div>
                       <input
                          type="text"
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          placeholder="Encontre as notícias que importam para você..."
                          className="block w-full pl-12 pr-10 py-3.5 border-none bg-gray-100/80 dark:bg-gray-800/80 text-gray-900 dark:text-gray-100 placeholder-gray-500 focus:outline-none focus:bg-white dark:focus:bg-[#1A202C] focus:ring-2 focus:ring-indigo-500/50 transition-all text-[15px] font-medium"
                       />
                       {searchQuery && (
                           <button
                                onClick={() => setSearchQuery('')}
                                className="absolute inset-y-0 right-0 pr-5 flex items-center text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
                           >
                               <X size={16} />
                           </button>
                       )}
                   </div>
                </div>

                <div className="flex items-center gap-3">
                    <button
                        onClick={toggleTheme}
                        className="p-3 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 hover:text-indigo-600 dark:hover:text-indigo-400 transition-all duration-200 active:scale-95"
                        title={darkMode ? "Modo claro" : "Modo escuro"}
                    >
                        {darkMode ? <Sun size={18} /> : <Moon size={18} />}
                    </button>
                    <button
                        onClick={() => setIsSettingsOpen(true)}
                        className="p-3 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 hover:text-indigo-600 dark:hover:text-indigo-400 transition-all duration-200 active:scale-95"
                        title="Configurações"
                    >
                        <SettingsIcon size={18} />
                    </button>
                </div>
            </div>

            {/* Mobile Search */}
            <div className="md:hidden mt-4 pb-2">
                 <div className="relative shadow-sm rounded-full overflow-hidden">
                       <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                           <Search size={16} className="text-gray-400" />
                       </div>
                       <input
                          type="text"
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          placeholder="Buscar notícias..."
                          className="block w-full pl-10 pr-4 py-3 border-none bg-gray-100 dark:bg-gray-800/80 text-gray-900 dark:text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all text-[14px]"
                       />
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
                     <div className="flex items-center justify-between mb-8">
                        <h2 className="text-3xl font-extrabold text-gray-900 dark:text-white flex items-center gap-3 tracking-tight border-l-4 border-indigo-500 pl-4 rounded-sm">
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
