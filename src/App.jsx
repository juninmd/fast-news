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

  // Settings State
  const [apiKey, setApiKey] = useState(() => localStorage.getItem('gemini_api_key'));
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
    setApiKey(newSettings.apiKey);
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
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors duration-300 flex">

      {/* Sidebar */}
      <Sidebar
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
        categories={categories}
        selectedCategory={selectedCategory}
        onSelectCategory={setSelectedCategory}
      />

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0 transition-all duration-300 lg:ml-72">

          {/* Header */}
          <header className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-md sticky top-0 z-30 border-b border-gray-100 dark:border-gray-700 px-4 sm:px-6 py-3">
            <div className="flex justify-between items-center gap-4">
                <div className="flex items-center gap-3 lg:hidden">
                    <button
                        onClick={() => setIsSidebarOpen(true)}
                        className="p-2 -ml-2 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
                    >
                        <Menu size={24} />
                    </button>
                    <span className="font-bold text-lg dark:text-white">NewsAI</span>
                </div>

                <div className="flex-1 max-w-xl hidden md:block">
                   <div className="relative group">
                       <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                           <Search size={16} className="text-gray-400 group-focus-within:text-blue-500 transition-colors" />
                       </div>
                       <input
                          type="text"
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          placeholder="Buscar notícias..."
                          className="block w-full pl-10 pr-3 py-2 border border-gray-200 dark:border-gray-600 rounded-xl leading-5 bg-gray-50 dark:bg-gray-700/50 text-gray-900 dark:text-gray-100 placeholder-gray-500 focus:outline-none focus:bg-white dark:focus:bg-gray-700 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all sm:text-sm"
                       />
                       {searchQuery && (
                           <button
                                onClick={() => setSearchQuery('')}
                                className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
                           >
                               <X size={14} />
                           </button>
                       )}
                   </div>
                </div>

                <div className="flex items-center gap-2">
                    <button
                        onClick={toggleTheme}
                        className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300 transition-colors"
                        title={darkMode ? "Modo claro" : "Modo escuro"}
                    >
                        {darkMode ? <Sun size={20} /> : <Moon size={20} />}
                    </button>
                    <button
                        onClick={() => setIsSettingsOpen(true)}
                        className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300 transition-colors"
                        title="Configurações"
                    >
                        <SettingsIcon size={20} />
                    </button>
                </div>
            </div>

            {/* Mobile Search */}
            <div className="md:hidden mt-3 pb-1">
                 <div className="relative">
                       <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                           <Search size={16} className="text-gray-400" />
                       </div>
                       <input
                          type="text"
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          placeholder="Buscar notícias..."
                          className="block w-full pl-10 pr-3 py-2 border border-gray-200 dark:border-gray-600 rounded-xl leading-5 bg-gray-50 dark:bg-gray-700/50 text-gray-900 dark:text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-sm"
                       />
                   </div>
            </div>
          </header>

          <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-x-hidden">
            <div className="max-w-7xl mx-auto space-y-8">
                {selectedCategory === 'Todas' && !searchQuery && (
                    <section>
                         <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                             <span className="w-1 h-6 bg-blue-600 rounded-full inline-block"></span>
                             Em Alta
                         </h2>
                         <TrendingTopics apiKey={apiKey || rss2jsonApiKey} />
                    </section>
                )}

                <section>
                     <div className="flex items-center justify-between mb-6">
                        <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                            <span className="w-1 h-6 bg-indigo-600 rounded-full inline-block"></span>
                            {searchQuery ? `Resultados para "${searchQuery}"` : (selectedCategory === 'Todas' ? 'Últimas Notícias' : selectedCategory)}
                        </h2>
                     </div>

                     <Feed
                        apiKey={apiKey}
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
