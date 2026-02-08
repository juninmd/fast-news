import React, { useState, useEffect } from 'react';
import { X, Plus, Trash2, Check, AlertCircle, Loader, ExternalLink } from 'lucide-react';
import { summarizeText } from '../services/geminiService';

const Settings = ({ isOpen, onClose, onSave, initialCustomFeeds = [] }) => {
  const [apiKey, setApiKey] = useState(() => localStorage.getItem('gemini_api_key') || '');
  const [rss2jsonApiKey, setRss2jsonApiKey] = useState(() => localStorage.getItem('rss2json_api_key') || '');
  const [localCustomFeeds, setLocalCustomFeeds] = useState(initialCustomFeeds);
  const [newFeedUrl, setNewFeedUrl] = useState('');
  const [newFeedCategory, setNewFeedCategory] = useState('');
  const [testStatus, setTestStatus] = useState('idle'); // idle, testing, success, error
  const [testMessage, setTestMessage] = useState('');

  useEffect(() => {
    if (isOpen) {
      setLocalCustomFeeds(initialCustomFeeds);
      setRss2jsonApiKey(localStorage.getItem('rss2json_api_key') || '');
      setTestStatus('idle');
      setTestMessage('');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  const handleSave = () => {
    localStorage.setItem('gemini_api_key', apiKey);
    localStorage.setItem('rss2json_api_key', rss2jsonApiKey);
    localStorage.setItem('custom_feeds', JSON.stringify(localCustomFeeds));
    onSave(apiKey, localCustomFeeds, rss2jsonApiKey);
    onClose();
  };

  const handleTestKey = async () => {
    if (!apiKey) {
      setTestStatus('error');
      setTestMessage('Por favor, insira uma chave de API.');
      return;
    }

    setTestStatus('testing');
    setTestMessage('');

    try {
      await summarizeText("Esta é uma mensagem de teste para verificar a conexão com a API Gemini.", apiKey);
      setTestStatus('success');
      setTestMessage('Conexão bem-sucedida!');
    } catch (error) {
      console.error(error);
      setTestStatus('error');
      setTestMessage('Falha na conexão. Verifique sua chave.');
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
      <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 w-full max-w-md shadow-2xl shadow-black/20 transform transition-all animate-in zoom-in-95 duration-200 border border-gray-100 dark:border-gray-700">
        <div className="flex justify-between items-center mb-6 border-b border-gray-100 dark:border-gray-700 pb-4">
          <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">Configurações</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:text-gray-500 dark:hover:text-gray-300 dark:hover:bg-gray-700 p-2 rounded-full transition-all">
            <X size={20} />
          </button>
        </div>

        <div className="mb-6">
          <label htmlFor="api-key-input" className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
            Token da API Gemini
          </label>
          <div className="flex gap-2">
            <input
              id="api-key-input"
              type="password"
              value={apiKey}
              onChange={(e) => {
                setApiKey(e.target.value);
                setTestStatus('idle');
                setTestMessage('');
              }}
              className="flex-grow px-4 py-3 border border-gray-200 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all bg-gray-50 dark:bg-gray-700 dark:text-white"
              placeholder="Cole sua chave de API aqui"
            />
            <button
              onClick={handleTestKey}
              disabled={testStatus === 'testing' || !apiKey}
              className={`px-4 py-2 rounded-lg font-medium transition-all flex items-center justify-center min-w-[100px] ${
                testStatus === 'success'
                  ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                  : testStatus === 'error'
                  ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600'
              }`}
              title="Testar Conexão"
            >
              {testStatus === 'testing' ? (
                <Loader size={18} className="animate-spin" />
              ) : testStatus === 'success' ? (
                <Check size={18} />
              ) : testStatus === 'error' ? (
                <AlertCircle size={18} />
              ) : (
                'Testar'
              )}
            </button>
          </div>
          {testMessage && (
            <p className={`text-xs mt-2 ${
                testStatus === 'success' ? 'text-green-600 dark:text-green-400' :
                testStatus === 'error' ? 'text-red-600 dark:text-red-400' : 'text-gray-500'
            }`}>
                {testMessage}
            </p>
          )}
          <div className="flex justify-between items-center mt-2">
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Sua chave é armazenada localmente no seu navegador.
            </p>
            <a
              href="https://aistudio.google.com/app/apikey"
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
            >
              Obter chave de API
              <ExternalLink size={10} />
            </a>
          </div>

          <label htmlFor="rss-api-key-input" className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2 mt-4">
            Chave da API RSS2JSON (Opcional)
          </label>
          <div className="flex gap-2">
            <input
              id="rss-api-key-input"
              type="password"
              value={rss2jsonApiKey}
              onChange={(e) => setRss2jsonApiKey(e.target.value)}
              className="flex-grow px-4 py-3 border border-gray-200 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all bg-gray-50 dark:bg-gray-700 dark:text-white"
              placeholder="Para maiores limites de requisição"
            />
          </div>
          <div className="flex justify-between items-center mt-2">
             <p className="text-xs text-gray-500 dark:text-gray-400">
               Aumenta a velocidade e limites de feeds.
             </p>
             <a
               href="https://rss2json.com/plans"
               target="_blank"
               rel="noopener noreferrer"
               className="text-xs text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
             >
               Obter chave
               <ExternalLink size={10} />
             </a>
          </div>
        </div>

        <div className="mb-6 border-t border-gray-100 dark:border-gray-700 pt-6">
          <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-4">Gerenciar Fontes</h3>

          <div className="space-y-3 mb-4">
            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">URL do RSS Feed</label>
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
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Categoria (Opcional)</label>
                <input
                  type="text"
                  value={newFeedCategory}
                  onChange={(e) => setNewFeedCategory(e.target.value)}
                  placeholder="Ex: Tecnologia"
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
