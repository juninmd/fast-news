import React, { useState, useEffect } from 'react';
import Feed from './components/Feed';
import Settings from './components/Settings';
import { Settings as SettingsIcon, Newspaper } from 'lucide-react';

function App() {
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [apiKey, setApiKey] = useState('');

  useEffect(() => {
    const savedKey = localStorage.getItem('gemini_api_key');
    if (savedKey) {
      setApiKey(savedKey);
    }
  }, []);

  const handleSaveSettings = (key) => {
    setApiKey(key);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-2">
              <div className="bg-blue-600 p-2 rounded-lg text-white">
                <Newspaper size={24} />
              </div>
              <h1 className="text-xl font-bold text-gray-900 tracking-tight">
                News<span className="text-blue-600">AI</span>ggregator
              </h1>
            </div>

            <button
              onClick={() => setIsSettingsOpen(true)}
              className="p-2 text-gray-500 hover:bg-gray-100 rounded-full transition-colors relative"
              title="Settings"
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
            <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-6 rounded-r-md">
                <div className="flex">
                    <div className="ml-3">
                        <p className="text-sm text-yellow-700">
                            Please configure your Gemini API Key in <button onClick={() => setIsSettingsOpen(true)} className="font-medium underline hover:text-yellow-600">Settings</button> to enable AI summarization.
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
