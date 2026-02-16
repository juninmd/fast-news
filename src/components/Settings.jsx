import React, { useState } from 'react';
import { X, Plus, Trash2, Check, AlertCircle, Loader, ExternalLink, Zap, Bot, Send } from 'lucide-react';
import { summarizeWithOllama } from '../services/ollamaService';

const Settings = ({ isOpen, onClose, onSave, initialCustomFeeds = [] }) => {
  const [rss2jsonApiKey, setRss2jsonApiKey] = useState(() => localStorage.getItem('rss2json_api_key') || '');
  const [autoSummarize, setAutoSummarize] = useState(() => localStorage.getItem('auto_summarize') === 'true');

  // Ollama Settings
  const [ollamaUrl, setOllamaUrl] = useState(() => localStorage.getItem('ollama_url') || 'http://localhost:11434');
  const [ollamaModel, setOllamaModel] = useState(() => localStorage.getItem('ollama_model') || 'llama3');

  // Telegram Settings
  const [telegramBotToken, setTelegramBotToken] = useState(() => localStorage.getItem('telegram_bot_token') || '');
  const [telegramChatId, setTelegramChatId] = useState(() => localStorage.getItem('telegram_chat_id') || '');

  const [localCustomFeeds, setLocalCustomFeeds] = useState(initialCustomFeeds);
  const [newFeedUrl, setNewFeedUrl] = useState('');
  const [newFeedCategory, setNewFeedCategory] = useState('');

  const [ollamaStatus, setOllamaStatus] = useState('idle');

  const handleSave = () => {
    localStorage.setItem('rss2json_api_key', rss2jsonApiKey);
    localStorage.setItem('auto_summarize', autoSummarize);
    localStorage.setItem('custom_feeds', JSON.stringify(localCustomFeeds));

    localStorage.setItem('ollama_url', ollamaUrl);
    localStorage.setItem('ollama_model', ollamaModel);
    localStorage.setItem('telegram_bot_token', telegramBotToken);
    localStorage.setItem('telegram_chat_id', telegramChatId);

    // Pass all settings back to App
    onSave({
        rss2jsonApiKey,
        autoSummarize,
        customFeeds: localCustomFeeds,
        ollamaUrl,
        ollamaModel,
        telegramBotToken,
        telegramChatId
    });
    onClose();
  };

  const testOllama = async () => {
      setOllamaStatus('testing');
      try {
          await summarizeWithOllama('Teste de conexão.', ollamaUrl, ollamaModel);
          setOllamaStatus('success');
      } catch (e) {
          console.error(e);
          setOllamaStatus('error');
      }
  };

  const handleAddFeed = () => {
    if (!newFeedUrl) return;
    const category = newFeedCategory.trim() || 'Personalizado';
    const newFeed = { url: newFeedUrl.trim(), category };

    if (localCustomFeeds.some(f => f.url === newFeed.url)) {
      return;
    }

    setLocalCustomFeeds([...localCustomFeeds, newFeed]);
    setNewFeedUrl('');
    setNewFeedCategory('');
  };

  const handleRemoveFeed = (url) => {
    setLocalCustomFeeds(localCustomFeeds.filter(feed => feed.url !== url));
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-md flex items-center justify-center z-50 animate-in fade-in duration-200">
      <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 w-full max-w-2xl shadow-2xl shadow-black/20 transform transition-all animate-in zoom-in-95 duration-200 border border-gray-100 dark:border-gray-700 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6 border-b border-gray-100 dark:border-gray-700 pb-4">
          <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">Configurações</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:text-gray-500 dark:hover:text-gray-300 dark:hover:bg-gray-700 p-2 rounded-full transition-all">
            <X size={20} />
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Ollama Section */}
            <div className="space-y-4">
                <h3 className="text-sm font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                    <Bot size={16} /> Ollama (IA Local)
                </h3>
                <div>
                    <label htmlFor="ollama-url" className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">URL Base</label>
                    <input
                        id="ollama-url"
                        type="text"
                        value={ollamaUrl}
                        onChange={(e) => { setOllamaUrl(e.target.value); setOllamaStatus('idle'); }}
                        className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700 dark:text-white"
                        placeholder="http://localhost:11434"
                    />
                </div>
                <div>
                    <label htmlFor="ollama-model" className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Modelo</label>
                    <input
                        id="ollama-model"
                        type="text"
                        value={ollamaModel}
                        onChange={(e) => { setOllamaModel(e.target.value); setOllamaStatus('idle'); }}
                        className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700 dark:text-white"
                        placeholder="llama3"
                    />
                </div>
                <div className="flex items-center justify-between">
                    <p className="text-[10px] text-gray-500">Certifique-se de iniciar o Ollama com <code>OLLAMA_ORIGINS="*"</code></p>
                    <button
                        onClick={testOllama}
                        disabled={ollamaStatus === 'testing'}
                        className={`text-xs px-3 py-1 rounded border transition-colors ${
                            ollamaStatus === 'success' ? 'bg-green-100 text-green-700 border-green-200' :
                            ollamaStatus === 'error' ? 'bg-red-100 text-red-700 border-red-200' :
                            'bg-gray-100 text-gray-700 border-gray-200 hover:bg-gray-200'
                        }`}
                    >
                        {ollamaStatus === 'testing' ? 'Testando...' : ollamaStatus === 'success' ? 'Conectado' : ollamaStatus === 'error' ? 'Erro' : 'Testar Conexão'}
                    </button>
                </div>
            </div>

            {/* Telegram Section */}
            <div className="space-y-4">
                <h3 className="text-sm font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                    <Send size={16} /> Telegram
                </h3>
                <div>
                    <label htmlFor="telegram-token" className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Bot Token</label>
                    <input
                        id="telegram-token"
                        type="password"
                        value={telegramBotToken}
                        onChange={(e) => setTelegramBotToken(e.target.value)}
                        className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700 dark:text-white"
                        placeholder="123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11"
                    />
                </div>
                <div>
                    <label htmlFor="telegram-chat-id" className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Chat ID (Canal/Grupo)</label>
                    <input
                        id="telegram-chat-id"
                        type="text"
                        value={telegramChatId}
                        onChange={(e) => setTelegramChatId(e.target.value)}
                        className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700 dark:text-white"
                        placeholder="@meucanal ou -100..."
                    />
                </div>
            </div>
        </div>

        <div className="my-6 border-t border-gray-100 dark:border-gray-700 pt-6">
            <h3 className="text-sm font-bold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
                <Zap size={16} /> Outras Configurações
            </h3>
             <div className="flex flex-col gap-4">
                 <div>
                    <label htmlFor="rss-api-key" className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">RSS2JSON API Key (Opcional)</label>
                    <input
                        id="rss-api-key"
                        type="password"
                        value={rss2jsonApiKey}
                        onChange={(e) => setRss2jsonApiKey(e.target.value)}
                        className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700 dark:text-white"
                        placeholder="Chave para limites maiores"
                    />
                 </div>

                 <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg border border-gray-100 dark:border-gray-700">
                    <span className="text-sm text-gray-700 dark:text-gray-200">Resumo Automático</span>
                    <button
                        onClick={() => setAutoSummarize(!autoSummarize)}
                        className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                        autoSummarize ? 'bg-blue-600' : 'bg-gray-300 dark:bg-gray-600'
                        }`}
                    >
                        <span className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${autoSummarize ? 'translate-x-5' : 'translate-x-1'}`} />
                    </button>
                 </div>
             </div>
        </div>

        <div className="mb-6 border-t border-gray-100 dark:border-gray-700 pt-6">
          <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-4">Gerenciar Fontes</h3>

          <div className="space-y-3 mb-4">
            <div>
              <input
                type="url"
                value={newFeedUrl}
                onChange={(e) => setNewFeedUrl(e.target.value)}
                placeholder="https://exemplo.com/rss"
                className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50 dark:bg-gray-700 dark:text-white"
              />
            </div>
            <div className="flex gap-2">
              <div className="flex-grow">
                <input
                  type="text"
                  value={newFeedCategory}
                  onChange={(e) => setNewFeedCategory(e.target.value)}
                  placeholder="Categoria (Ex: Tecnologia)"
                  className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50 dark:bg-gray-700 dark:text-white"
                />
              </div>
              <div className="flex items-end">
                <button
                  onClick={handleAddFeed}
                  disabled={!newFeedUrl}
                  data-testid="add-feed-btn"
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <Plus size={20} />
                </button>
              </div>
            </div>
          </div>

          {localCustomFeeds.length > 0 && (
            <div className="max-h-40 overflow-y-auto pr-1 space-y-2 no-scrollbar">
              {localCustomFeeds.map((feed, index) => (
                <div key={`${feed.url}-${index}`} className="flex items-center justify-between bg-gray-50 dark:bg-gray-700/50 p-2 rounded-lg border border-gray-100 dark:border-gray-700">
                  <div className="overflow-hidden">
                    <p className="text-xs font-medium text-gray-800 dark:text-gray-200 truncate">{feed.url}</p>
                    <p className="text-[10px] text-gray-500 dark:text-gray-400">{feed.category}</p>
                  </div>
                  <button
                    onClick={() => handleRemoveFeed(feed.url)}
                    data-testid={`remove-feed-btn-${index}`}
                    className="text-gray-400 hover:text-red-500 p-1 transition-colors"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="flex justify-end space-x-3 pt-2">
          <button
            onClick={onClose}
            className="px-5 py-2.5 text-gray-600 hover:bg-gray-50 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-gray-200 rounded-xl font-medium transition-all"
          >
            Cancelar
          </button>
          <button
            onClick={handleSave}
            className="px-5 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl hover:from-blue-700 hover:to-indigo-700 font-medium shadow-lg shadow-blue-500/30 hover:shadow-xl hover:shadow-blue-500/40 transform hover:-translate-y-0.5 transition-all"
          >
            Salvar
          </button>
        </div>
      </div>
    </div>
  );
};

export default Settings;
