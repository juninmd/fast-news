import React, { useState } from 'react';
import { X, Save, Plus, Trash2, RotateCcw, MessageSquare, Bot, Rss, Info, Settings as SettingsIcon, ShieldCheck, Sparkles } from 'lucide-react';
import { summarizeWithOllama } from '../services/ollamaService';
import { testGeminiConnection } from '../services/geminiService';

const Settings = ({ isOpen, onClose, onSave, initialCustomFeeds = [] }) => {
  const [aiProvider, setAiProvider] = useState(() => localStorage.getItem('ai_provider') || 'ollama');
  const [geminiApiKey, setGeminiApiKey] = useState(() => localStorage.getItem('gemini_api_key') || '');
  const [aiSdkProvider, setAiSdkProvider] = useState(() => localStorage.getItem('ai_sdk_provider') || 'openai');
  const [aiSdkApiKey, setAiSdkApiKey] = useState(() => localStorage.getItem('ai_sdk_api_key') || '');
  const [rss2jsonApiKey, setRss2jsonApiKey] = useState(() => localStorage.getItem('rss2json_api_key') || '');
  const [autoSummarize, setAutoSummarize] = useState(() => localStorage.getItem('auto_summarize') === 'true');
  const [ollamaUrl, setOllamaUrl] = useState(() => localStorage.getItem('ollama_url') || 'http://localhost:11434');
  const [ollamaModel, setOllamaModel] = useState(() => localStorage.getItem('ollama_model') || 'llama3');
  const [telegramBotToken, setTelegramBotToken] = useState(() => localStorage.getItem('telegram_bot_token') || '');
  const [telegramChatId, setTelegramChatId] = useState(() => localStorage.getItem('telegram_chat_id') || '');

  const [geminiStatus, setGeminiStatus] = useState(null); // testing, success, error
  const [customFeeds, setCustomFeeds] = useState(initialCustomFeeds);
  const [newFeedUrl, setNewFeedUrl] = useState('');
  const [newFeedCategory, setNewFeedCategory] = useState('Geral');

  const [activeTab, setActiveTab] = useState('geral'); // geral, feeds, ia, telegram
  const [ollamaStatus, setOllamaStatus] = useState('idle');

  if (!isOpen) return null;

  const testGemini = async () => {
      setGeminiStatus('testing');
      try {
          await testGeminiConnection(geminiApiKey);
          setGeminiStatus('success');
      } catch (error) {
          console.error("Gemini test failed", error);
          setGeminiStatus('error');
      }
      setTimeout(() => setGeminiStatus(null), 3000);
  };

  const handleSave = () => {
    localStorage.setItem('ai_provider', aiProvider);
    localStorage.setItem('gemini_api_key', geminiApiKey);
    localStorage.setItem('ai_sdk_provider', aiSdkProvider);
    localStorage.setItem('ai_sdk_api_key', aiSdkApiKey);
    localStorage.setItem('custom_feeds', JSON.stringify(customFeeds));
    localStorage.setItem('rss2json_api_key', rss2jsonApiKey);
    localStorage.setItem('auto_summarize', autoSummarize);
    localStorage.setItem('ollama_url', ollamaUrl);
    localStorage.setItem('ollama_model', ollamaModel);
    localStorage.setItem('telegram_bot_token', telegramBotToken);
    localStorage.setItem('telegram_chat_id', telegramChatId);

    onSave({
      aiProvider,
      geminiApiKey,
      aiSdkProvider,
      aiSdkApiKey,
      customFeeds,
      rss2jsonApiKey,
      autoSummarize,
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
          await summarizeWithOllama('Teste', ollamaUrl, ollamaModel);
          setOllamaStatus('success');
      } catch (e) {
          console.error(e);
          setOllamaStatus('error');
      }
  };

  const addFeed = () => {
    if (newFeedUrl) {
      setCustomFeeds([...customFeeds, { url: newFeedUrl, category: newFeedCategory }]);
      setNewFeedUrl('');
      setNewFeedCategory('Geral');
    }
  };

  const removeFeed = (index) => {
    const newFeeds = [...customFeeds];
    newFeeds.splice(index, 1);
    setCustomFeeds(newFeeds);
  };

  const tabs = [
    { id: 'geral', label: 'Geral', icon: SettingsIcon },
    { id: 'ia', label: 'Inteligência Artificial', icon: Bot },
    { id: 'telegram', label: 'Telegram', icon: MessageSquare },
    { id: 'feeds', label: 'Fontes', icon: Rss },
  ];

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-white dark:bg-gray-800 rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden border border-gray-100 dark:border-gray-700">

        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b border-gray-100 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/50">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            Configurações
          </h2>
          <button type="button" onClick={onClose} className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full transition-colors text-gray-500">
            <X size={20} />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-100 dark:border-gray-700 px-6 pt-2 overflow-x-auto no-scrollbar">
            {tabs.map(tab => (
                <button
                    key={tab.id}
                    type="button"
                    onClick={() => setActiveTab(tab.id)}
                    className={`pb-3 px-4 text-sm font-medium flex items-center gap-2 border-b-2 transition-colors whitespace-nowrap ${
                        activeTab === tab.id
                        ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                        : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
                    }`}
                >
                    <tab.icon size={16} />
                    {tab.label}
                </button>
            ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">

          {activeTab === 'geral' && (
              <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">RSS2JSON API Key (Opcional)</label>
                    <input
                        type="text"
                        value={rss2jsonApiKey}
                        onChange={(e) => setRss2jsonApiKey(e.target.value)}
                        className="w-full p-3 rounded-xl border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700/50 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-sm"
                        placeholder="Melhora a performance e limites de requisição"
                    />
                </div>

                <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700/30 rounded-xl border border-gray-100 dark:border-gray-700">
                    <div>
                        <span className="block text-sm font-bold text-gray-900 dark:text-white">Resumo Automático</span>
                        <span className="text-xs text-gray-500 dark:text-gray-400">Tentar resumir notícias automaticamente na interface.</span>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                        <input type="checkbox" checked={autoSummarize} onChange={(e) => setAutoSummarize(e.target.checked)} className="sr-only peer" />
                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
                    </label>
                </div>
              </div>
          )}

          {activeTab === 'ia' && (
              <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">

                 <div className="flex gap-4 mb-4">
                    <button
                        type="button"
                        onClick={() => setAiProvider('ollama')}
                        className={`flex-1 py-3 px-4 rounded-xl border transition-all ${
                            aiProvider === 'ollama'
                            ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-500 text-blue-700 dark:text-blue-300'
                            : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:border-blue-300'
                        }`}
                    >
                        <div className="font-bold flex items-center justify-center gap-2"><Bot size={18}/> Ollama Local</div>
                    </button>
                    <button
                        type="button"
                        onClick={() => setAiProvider('gemini')}
                        className={`flex-1 py-3 px-4 rounded-xl border transition-all ${
                            aiProvider === 'gemini'
                            ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-500 text-blue-700 dark:text-blue-300'
                            : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:border-blue-300'
                        }`}
                    >
                        <div className="font-bold flex items-center justify-center gap-2"><ShieldCheck size={18}/> Google Gemini</div>
                    </button>
                    <button
                        type="button"
                        onClick={() => setAiProvider('ai-sdk')}
                        className={`flex-1 py-3 px-4 rounded-xl border transition-all ${
                            aiProvider === 'ai-sdk'
                            ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-500 text-blue-700 dark:text-blue-300'
                            : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:border-blue-300'
                        }`}
                    >
                        <div className="font-bold flex items-center justify-center gap-2"><Sparkles size={18}/> Vercel AI SDK</div>
                    </button>
                 </div>

                 {aiProvider === 'ollama' && (
                 <div className="space-y-4 p-4 bg-gray-50 dark:bg-gray-700/30 rounded-xl border border-gray-100 dark:border-gray-700 animate-in fade-in">
                    <div className="flex items-start gap-2 text-xs text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg flex-col">
                        <div className="flex items-center gap-2"><Info size={16} className="shrink-0 mt-0.5" /> <strong>Ollama Local AI</strong></div>
                        <p>O Ollama é usado para resumir as notícias e classificá-las em categorias para envio ao Telegram de forma gratuita e privada. Ele precisa estar rodando na sua máquina.</p>
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">URL do Ollama</label>
                        <input
                            type="text"
                            value={ollamaUrl}
                            onChange={(e) => setOllamaUrl(e.target.value)}
                            className="w-full p-2.5 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm"
                            placeholder="http://localhost:11434"
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Modelo</label>
                        <input
                            type="text"
                            value={ollamaModel}
                            onChange={(e) => setOllamaModel(e.target.value)}
                            className="w-full p-2.5 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm"
                            placeholder="llama3"
                        />
                    </div>
                    <div className="flex items-center justify-between">
                        <button
                            type="button"
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
                 )}

                 {aiProvider === 'ai-sdk' && (
                 <div className="space-y-4 p-4 bg-gray-50 dark:bg-gray-700/30 rounded-xl border border-gray-100 dark:border-gray-700 animate-in fade-in">
                    <div className="flex items-start gap-2 text-xs text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-900/20 p-3 rounded-lg flex-col">
                        <div className="flex items-center gap-2"><Info size={16} className="shrink-0 mt-0.5" /> <strong>Vercel AI SDK</strong></div>
                        <p>Agnóstico a provedor. Funciona totalmente no client-side via APIs públicas. Escolha seu provedor e forneça a chave de API.</p>
                    </div>

                    <div>
                        <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Provedor AI SDK</label>
                        <select
                            value={aiSdkProvider}
                            onChange={(e) => setAiSdkProvider(e.target.value)}
                            className="w-full p-2.5 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none"
                        >
                            <option value="openai">OpenAI (GPT-4o-mini)</option>
                            <option value="anthropic">Anthropic (Claude 3 Haiku)</option>
                            <option value="google">Google (Gemini 1.5 Flash)</option>
                        </select>
                    </div>

                    <div>
                        <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">API Key ({aiSdkProvider})</label>
                        <input
                            type="password"
                            value={aiSdkApiKey}
                            onChange={(e) => setAiSdkApiKey(e.target.value)}
                            className="w-full p-2.5 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                            placeholder="Insira sua API Key..."
                        />
                    </div>
                 </div>
                 )}

                 {aiProvider === 'gemini' && (
                 <div className="space-y-4 p-4 bg-gray-50 dark:bg-gray-700/30 rounded-xl border border-gray-100 dark:border-gray-700 animate-in fade-in">
                    <div className="flex items-start gap-2 text-xs text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20 p-3 rounded-lg flex-col">
                        <div className="flex items-center gap-2"><Info size={16} className="shrink-0 mt-0.5" /> <strong>Google Gemini API</strong></div>
                        <p>O Gemini é executado via API usando seu próprio navegador (client-side). Adicione sua chave de API para resumir e classificar as notícias.</p>
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Gemini API Key</label>
                        <input
                            type="password"
                            value={geminiApiKey}
                            onChange={(e) => setGeminiApiKey(e.target.value)}
                            className="w-full p-2.5 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                            placeholder="AIzaSy..."
                        />
                    </div>
                    <div className="flex items-center justify-between">
                        <button
                            type="button"
                            onClick={testGemini}
                            disabled={geminiStatus === 'testing' || !geminiApiKey}
                            className={`text-xs px-3 py-1 rounded border transition-colors ${
                                geminiStatus === 'success' ? 'bg-green-100 text-green-700 border-green-200' :
                                geminiStatus === 'error' ? 'bg-red-100 text-red-700 border-red-200' :
                                'bg-gray-100 text-gray-700 border-gray-200 hover:bg-gray-200 disabled:opacity-50'
                            }`}
                        >
                            {geminiStatus === 'testing' ? 'Testando...' : geminiStatus === 'success' ? 'Conectado' : geminiStatus === 'error' ? 'Erro' : 'Testar Conexão'}
                        </button>
                    </div>
                 </div>
                 )}

              </div>
          )}

          {activeTab === 'telegram' && (
              <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                  <div className="bg-indigo-50 dark:bg-indigo-900/20 p-4 rounded-xl border border-indigo-100 dark:border-indigo-800 text-sm text-indigo-800 dark:text-indigo-300">
                      <h4 className="font-bold flex items-center gap-2 mb-2"><Bot size={16}/> Automação Telegram (Canal)</h4>
                      <p className="mb-2">Configuração para enviar resumos classificados manualmente via botões nos cards. Para automação em 2º plano, execute <code>node scripts/news-agent.js --loop</code> no terminal do projeto com o Ollama rodando.</p>
                      <ul className="list-disc list-inside text-xs opacity-80 space-y-1">
                         <li>Crie um bot no Telegram com o @BotFather.</li>
                         <li>Adicione o bot ao seu Canal do Telegram como administrador.</li>
                         <li>Insira o Token do Bot e o ID/Username do Canal abaixo (ex: @meucanal).</li>
                      </ul>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2" title="O Token de acesso do seu bot fornecido pelo @BotFather">Bot Token</label>
                    <input
                        type="password"
                        value={telegramBotToken}
                        onChange={(e) => setTelegramBotToken(e.target.value)}
                        className="w-full p-3 rounded-xl border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700/50 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-sm"
                        placeholder="Token"
                        title="O Token de acesso do seu bot fornecido pelo @BotFather"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2" title="O ID do canal que o bot deve enviar, ex: @meucanal">Chat ID</label>
                    <input
                        type="text"
                        value={telegramChatId}
                        onChange={(e) => setTelegramChatId(e.target.value)}
                        className="w-full p-3 rounded-xl border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700/50 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-sm"
                        placeholder="@canal"
                        title="O ID do canal que o bot deve enviar, ex: @meucanal"
                    />
                  </div>
              </div>
          )}

          {activeTab === 'feeds' && (
              <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={newFeedUrl}
                      onChange={(e) => setNewFeedUrl(e.target.value)}
                      placeholder="https://exemplo.com/rss"
                      className="flex-1 p-3 rounded-xl border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700/50 text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none"
                    />
                    <select
                      value={newFeedCategory}
                      onChange={(e) => setNewFeedCategory(e.target.value)}
                      className="p-3 rounded-xl border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700/50 text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none"
                    >
                        {['Geral', 'Tecnologia', 'Brasil', 'Mundo', 'Negócios', 'Ciência', 'Esportes', 'Automóveis', 'Entretenimento', 'Games', 'Saúde', 'Cripto'].map(c => (
                            <option key={c} value={c}>{c}</option>
                        ))}
                    </select>
                    <button
                      type="button"
                      onClick={addFeed}
                      disabled={!newFeedUrl}
                      data-testid="add-feed-btn"
                      className="p-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-lg shadow-blue-500/30"
                    >
                      <Plus size={20} />
                    </button>
                  </div>

                  <div className="space-y-3 max-h-60 overflow-y-auto pr-2 custom-scrollbar">
                    {customFeeds.length === 0 && (
                        <p className="text-center text-gray-400 text-sm py-4">Nenhum feed personalizado adicionado.</p>
                    )}
                    {customFeeds.map((feed, index) => (
                      <div key={index} className="flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-700/30 rounded-xl border border-gray-100 dark:border-gray-700 group">
                        <div className="flex flex-col min-w-0 pr-4">
                            <span className="text-sm font-medium text-gray-900 dark:text-white truncate">{feed.url}</span>
                            <span className="text-xs text-gray-500 dark:text-gray-400">{feed.category}</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => removeFeed(index)}
                          data-testid={`remove-feed-btn-${index}`}
                          className="text-gray-400 hover:text-red-500 p-2 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    ))}
                  </div>
              </div>
          )}

        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-100 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/50 flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 font-medium transition-colors text-sm"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-medium shadow-lg shadow-blue-500/30 hover:shadow-blue-500/40 transition-all transform active:scale-95 text-sm flex items-center gap-2"
          >
            <Save size={18} />
            Salvar Alterações
          </button>
        </div>
      </div>
    </div>
  );
};

export default Settings;
