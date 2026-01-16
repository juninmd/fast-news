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
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm sticky top-0 z-40 border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-3">
              <div className="bg-gradient-to-tr from-blue-600 to-indigo-600 p-2 rounded-xl text-white shadow-md">
                <Newspaper size={24} />
              </div>
              <h1 className="text-xl font-bold text-gray-900 tracking-tight">
                News<span className="text-blue-600">AI</span>
              </h1>
            </div>

            <button
              onClick={() => setIsSettingsOpen(true)}
              className="p-2 text-gray-500 hover:bg-gray-100 rounded-full transition-colors relative"
              title="Configurações"
            >
              <SettingsIcon size={24} />
              {!apiKey && (
                 <span className="absolute top-1 right-1 w-3 h-3 bg-red-500 border-2 border-white rounded-full"></span>
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
