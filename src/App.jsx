import React, { useState, useEffect } from 'react';
import Feed from './components/Feed';
import TrendingTopics from './components/TrendingTopics';
import Settings from './components/Settings';
import { Newspaper, Moon, Sun, Settings as SettingsIcon } from 'lucide-react';

function App() {
  const [darkMode, setDarkMode] = useState(() => {
    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
      return true;
    }
    return false;
  });
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  const [aiConfig, setAiConfig] = useState(() => {
    const autoSummarizeVal = localStorage.getItem('auto_summarize');
    return {
      geminiApiKey: localStorage.getItem('gemini_api_key') || '',
      aiProvider: localStorage.getItem('ai_provider') || 'gemini',
      aiSdkProvider: localStorage.getItem('ai_sdk_provider') || 'openai',
      aiSdkApiKey: localStorage.getItem('ai_sdk_api_key') || '',
      aiSdkModel: localStorage.getItem('ai_sdk_model') || '',
      autoSummarize: autoSummarizeVal !== null ? autoSummarizeVal === 'true' : true
    };
  });

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

  const handleSaveSettings = (newConfig) => {
    setAiConfig(prev => ({ ...prev, ...newConfig }));
  };

  const isAiConfigured = () => {
    if (aiConfig.aiProvider === 'gemini') return !!aiConfig.geminiApiKey;
    if (aiConfig.aiProvider === 'ai-sdk') return !!aiConfig.aiSdkApiKey;
    return false;
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors duration-300">
      <header className="bg-white dark:bg-gray-800 shadow-sm sticky top-0 z-10 transition-colors duration-300">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-3">
              <Newspaper className="h-8 w-8 text-blue-600 dark:text-blue-400" />
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">NewsAI</h1>
            </div>

            <div className="flex items-center space-x-4">
              <button
                onClick={toggleTheme}
                className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300 transition-colors"
                title={darkMode ? "Modo claro" : "Modo escuro"}
              >
                {darkMode ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
              </button>
              <button
                onClick={() => setIsSettingsOpen(true)}
                className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300 transition-colors"
                title="Configurações"
              >
                <SettingsIcon className="h-5 w-5" />
              </button>
            </div>
          </div>

        </div>
      </header>

      <TrendingTopics />

      {!isAiConfigured() && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-6">
          <div className="bg-yellow-50 dark:bg-yellow-900/20 border-l-4 border-yellow-400 p-4 rounded-md">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm text-yellow-700 dark:text-yellow-200">
                  Por favor configure seu Provedor de IA e Chave de API nas configurações para habilitar os resumos inteligentes.
                  <button
                    onClick={() => setIsSettingsOpen(true)}
                    className="font-medium underline hover:text-yellow-600 dark:hover:text-yellow-100 ml-2"
                  >
                    Configurações
                  </button>
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Feed aiConfig={aiConfig} />
      </main>

      <Settings
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        onSave={handleSaveSettings}
      />
    </div>
  );
}

export default App;
