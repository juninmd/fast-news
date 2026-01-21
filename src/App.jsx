import React, { useState } from 'react';
import Feed from './components/Feed';
import Settings from './components/Settings';
import { Settings as SettingsIcon, Newspaper } from 'lucide-react';

function App() {
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [apiKey, setApiKey] = useState(() => localStorage.getItem('gemini_api_key') || '');

  const handleSaveSettings = (key) => {
    setApiKey(key);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 selection:bg-blue-100 selection:text-blue-900">
      {/* Header */}
      <header className="bg-white/90 backdrop-blur-lg shadow-sm sticky top-0 z-40 border-b border-gray-200/50 transition-all supports-[backdrop-filter]:bg-white/60">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-3 group cursor-pointer">
              <div className="bg-gradient-to-tr from-blue-600 to-indigo-600 p-2.5 rounded-xl text-white shadow-lg shadow-blue-500/20 group-hover:scale-105 transition-transform duration-300">
                <Newspaper size={24} strokeWidth={2.5} />
              </div>
              <h1 className="text-2xl font-bold text-gray-900 tracking-tight">
                News<span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600">AI</span>
              </h1>
            </div>

            <button
              onClick={() => setIsSettingsOpen(true)}
              className="p-2.5 text-gray-500 hover:bg-white hover:text-blue-600 hover:shadow-md rounded-full transition-all duration-300 relative border border-transparent hover:border-gray-100"
              title="Configurações"
            >
              <SettingsIcon size={22} strokeWidth={2} />
              {!apiKey && (
                 <span className="absolute top-2 right-2 w-2.5 h-2.5 bg-red-500 border-2 border-white rounded-full animate-pulse"></span>
              )}
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {!apiKey && (
            <div className="bg-amber-50 border-l-4 border-amber-400 p-4 mb-8 rounded-r-lg shadow-sm">
                <div className="flex">
                    <div className="ml-3">
                        <p className="text-sm text-amber-800">
                            Por favor configure sua Chave de API Gemini em <button onClick={() => setIsSettingsOpen(true)} className="font-bold underline hover:text-amber-900 cursor-pointer">Configurações</button> para ativar os resumos com IA.
                        </p>
                    </div>
                </div>
            </div>
        )}

        <Feed apiKey={apiKey} />
      </main>

      {/* Settings Modal */}
      <Settings
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        onSave={handleSaveSettings}
      />
    </div>
  );
}

export default App;
