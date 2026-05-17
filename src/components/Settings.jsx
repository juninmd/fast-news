import React, { useState } from 'react';
import { MessageSquare, Plus, RotateCcw, Rss, Save, Settings as SettingsIcon, Trash2, X } from 'lucide-react';

const Settings = ({ isOpen, onClose, onSave = () => {}, initialCustomFeeds = [] }) => {
  const [rss2jsonApiKey, setRss2jsonApiKey] = useState(() => localStorage.getItem('rss2json_api_key') || '');
  const [autoSummarize, setAutoSummarize] = useState(() => localStorage.getItem('auto_summarize') === 'true');
  const [telegramBotToken, setTelegramBotToken] = useState(() => localStorage.getItem('telegram_bot_token') || '');
  const [telegramChatId, setTelegramChatId] = useState(() => localStorage.getItem('telegram_chat_id') || '');
  const [customFeeds, setCustomFeeds] = useState(initialCustomFeeds);
  const [newFeedUrl, setNewFeedUrl] = useState('');
  const [newFeedCategory, setNewFeedCategory] = useState('Geral');
  const [activeTab, setActiveTab] = useState('geral');

  if (!isOpen) return null;

  const handleSave = () => {
    localStorage.setItem('custom_feeds', JSON.stringify(customFeeds));
    localStorage.setItem('rss2json_api_key', rss2jsonApiKey);
    localStorage.setItem('auto_summarize', String(autoSummarize));
    localStorage.setItem('telegram_bot_token', telegramBotToken);
    localStorage.setItem('telegram_chat_id', telegramChatId);
    onSave({ customFeeds, rss2jsonApiKey, autoSummarize, telegramBotToken, telegramChatId });
    onClose?.();
  };

  const addFeed = () => {
    if (!newFeedUrl.trim()) return;
    setCustomFeeds([...customFeeds, { url: newFeedUrl.trim(), category: newFeedCategory }]);
    setNewFeedUrl('');
    setNewFeedCategory('Geral');
  };

  const removeFeed = (index) => {
    setCustomFeeds(customFeeds.filter((_, itemIndex) => itemIndex !== index));
  };

  const tabs = [
    { id: 'geral', label: 'Geral', icon: SettingsIcon },
    { id: 'telegram', label: 'Telegram', icon: MessageSquare },
    { id: 'feeds', label: 'Fontes', icon: Rss },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div className="flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-2xl dark:border-gray-700 dark:bg-gray-800">
        <div className="flex items-center justify-between border-b border-gray-100 bg-gray-50/50 p-6 dark:border-gray-700 dark:bg-gray-800/50">
          <h2 className="flex items-center gap-2 text-xl font-bold text-gray-900 dark:text-white">Configuracoes</h2>
          <button type="button" onClick={onClose} className="rounded-full p-2 text-gray-500 transition-colors hover:bg-gray-200 dark:hover:bg-gray-700">
            <X size={20} />
          </button>
        </div>

        <div className="flex overflow-x-auto border-b border-gray-100 px-6 pt-2 dark:border-gray-700">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 whitespace-nowrap border-b-2 px-4 pb-3 text-sm font-medium transition-colors ${
                activeTab === tab.id ? 'border-blue-600 text-blue-600 dark:text-blue-400' : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400'
              }`}
            >
              <tab.icon size={16} />
              {tab.label}
            </button>
          ))}
        </div>

        <div className="flex-1 space-y-6 overflow-y-auto p-6">
          {activeTab === 'geral' && (
            <>
              <Field label="RSS2JSON API Key (opcional)" value={rss2jsonApiKey} onChange={setRss2jsonApiKey} placeholder="Melhora limites de requisicao RSS" />
              <label className="flex items-center justify-between rounded-xl border border-gray-100 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-700/30">
                <span>
                  <span className="block text-sm font-medium text-gray-900 dark:text-white">Resumo automatico</span>
                  <span className="text-xs text-gray-500 dark:text-gray-400">Usa a API backend de IA configurada no servidor.</span>
                </span>
                <input type="checkbox" checked={autoSummarize} onChange={(e) => setAutoSummarize(e.target.checked)} className="h-4 w-4" />
              </label>
            </>
          )}

          {activeTab === 'telegram' && (
            <>
              <Field label="Telegram Bot Token" type="password" value={telegramBotToken} onChange={setTelegramBotToken} placeholder="Configurado localmente" />
              <Field label="Chat ID" value={telegramChatId} onChange={setTelegramChatId} placeholder="123456789" />
            </>
          )}

          {activeTab === 'feeds' && (
            <div className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-[1fr_140px_auto]">
                <input value={newFeedUrl} onChange={(e) => setNewFeedUrl(e.target.value)} placeholder="https://site.com/feed.xml" className="rounded-xl border border-gray-200 bg-gray-50 p-3 text-sm dark:border-gray-600 dark:bg-gray-700/50" />
                <input value={newFeedCategory} onChange={(e) => setNewFeedCategory(e.target.value)} className="rounded-xl border border-gray-200 bg-gray-50 p-3 text-sm dark:border-gray-600 dark:bg-gray-700/50" />
                <button type="button" onClick={addFeed} className="rounded-xl bg-blue-600 px-4 py-2 text-white"><Plus size={18} /></button>
              </div>
              {customFeeds.map((feed, index) => (
                <div key={`${feed.url}-${index}`} className="flex items-center gap-3 rounded-xl border border-gray-100 bg-gray-50 p-3 dark:border-gray-700 dark:bg-gray-700/30">
                  <span className="min-w-0 flex-1 truncate text-sm">{feed.url}</span>
                  <span className="text-xs text-gray-500">{feed.category}</span>
                  <button type="button" onClick={() => removeFeed(index)} className="text-red-500"><Trash2 size={16} /></button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="flex justify-between border-t border-gray-100 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-800/50">
          <button type="button" onClick={() => setCustomFeeds([])} className="flex items-center gap-2 rounded-xl px-4 py-2 text-sm text-gray-500 hover:bg-gray-200 dark:hover:bg-gray-700">
            <RotateCcw size={16} /> Resetar
          </button>
          <button type="button" onClick={handleSave} className="flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-blue-700">
            <Save size={16} /> Salvar
          </button>
        </div>
      </div>
    </div>
  );
};

function Field({ label, value, onChange, placeholder, type = 'text' }) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">{label}</span>
      <input type={type} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className="w-full rounded-xl border border-gray-200 bg-gray-50 p-3 text-sm dark:border-gray-600 dark:bg-gray-700/50" />
    </label>
  );
}

export default Settings;
