import React, { useState } from 'react';
import { X } from 'lucide-react';

const Settings = ({ isOpen, onClose, onSave }) => {
  const [apiKey, setApiKey] = useState(() => localStorage.getItem('gemini_api_key') || '');
  const [aiProvider, setAiProvider] = useState(() => localStorage.getItem('ai_provider') || 'gemini');
  const [aiSdkProvider, setAiSdkProvider] = useState(() => localStorage.getItem('ai_sdk_provider') || 'openai');
  const [aiSdkApiKey, setAiSdkApiKey] = useState(() => localStorage.getItem('ai_sdk_api_key') || '');
  const [aiSdkModel, setAiSdkModel] = useState(() => localStorage.getItem('ai_sdk_model') || '');
  const [autoSummarize, setAutoSummarize] = useState(() => {
    const val = localStorage.getItem('auto_summarize');
    return val !== null ? val === 'true' : true;
  });

  const handleSave = () => {
    localStorage.setItem('gemini_api_key', apiKey);
    localStorage.setItem('ai_provider', aiProvider);
    localStorage.setItem('ai_sdk_provider', aiSdkProvider);
    localStorage.setItem('ai_sdk_api_key', aiSdkApiKey);
    localStorage.setItem('ai_sdk_model', aiSdkModel);
    localStorage.setItem('auto_summarize', autoSummarize.toString());

    onSave({
      geminiApiKey: apiKey,
      aiProvider,
      aiSdkProvider,
      aiSdkApiKey,
      aiSdkModel,
      autoSummarize
    });
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-md flex items-center justify-center z-50 animate-in fade-in duration-200">
      <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 w-full max-w-md shadow-2xl shadow-black/20 transform transition-all animate-in zoom-in-95 duration-200 border border-gray-100 dark:border-gray-700 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6 border-b border-gray-100 dark:border-gray-700 pb-4">
          <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">Configurações</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:text-gray-500 dark:hover:text-gray-300 dark:hover:bg-gray-700 p-2 rounded-full transition-all">
            <X size={20} />
          </button>
        </div>

        <div className="mb-6 space-y-4">
          <div>
            <label className="flex items-center space-x-3 cursor-pointer">
              <input
                type="checkbox"
                checked={autoSummarize}
                onChange={(e) => setAutoSummarize(e.target.checked)}
                className="w-5 h-5 text-blue-600 rounded border-gray-300 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:focus:ring-blue-600"
              />
              <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                Resumir notícias automaticamente
              </span>
            </label>
          </div>

          <div>
            <label htmlFor="ai-provider-select" className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
              Provedor de IA
            </label>
            <select
              id="ai-provider-select"
              value={aiProvider}
              onChange={(e) => setAiProvider(e.target.value)}
              className="w-full px-4 py-3 border border-gray-200 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all bg-gray-50 dark:bg-gray-700 dark:text-white"
            >
              <option value="gemini">Gemini (Direct)</option>
              <option value="ai-sdk">AI SDK</option>
            </select>
          </div>

          {aiProvider === 'gemini' && (
            <div>
              <label htmlFor="api-key-input" className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                Token da API Gemini
              </label>
              <input
                id="api-key-input"
                type="password"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                className="w-full px-4 py-3 border border-gray-200 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all bg-gray-50 dark:bg-gray-700 dark:text-white"
                placeholder="Cole sua chave de API aqui"
              />
            </div>
          )}

          {aiProvider === 'ai-sdk' && (
            <div className="space-y-4">
              <div>
                <label htmlFor="ai-sdk-provider-select" className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                  AI SDK Provider
                </label>
                <select
                  id="ai-sdk-provider-select"
                  value={aiSdkProvider}
                  onChange={(e) => setAiSdkProvider(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-200 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all bg-gray-50 dark:bg-gray-700 dark:text-white"
                >
                  <option value="openai">OpenAI</option>
                  <option value="anthropic">Anthropic</option>
                  <option value="google">Google</option>
                  <option value="mistral">Mistral</option>
                  <option value="deepseek">DeepSeek</option>
                </select>
              </div>

              <div>
                <label htmlFor="ai-sdk-api-key-input" className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                  AI SDK API Key
                </label>
                <input
                  id="ai-sdk-api-key-input"
                  type="password"
                  value={aiSdkApiKey}
                  onChange={(e) => setAiSdkApiKey(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-200 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all bg-gray-50 dark:bg-gray-700 dark:text-white"
                  placeholder="API Key"
                />
              </div>

              <div>
                <label htmlFor="ai-sdk-model-input" className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                  Model (Opcional)
                </label>
                <input
                  id="ai-sdk-model-input"
                  type="text"
                  value={aiSdkModel}
                  onChange={(e) => setAiSdkModel(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-200 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all bg-gray-50 dark:bg-gray-700 dark:text-white"
                  placeholder="Ex: gpt-4o, claude-3-opus"
                />
              </div>
            </div>
          )}

          <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
            Sua chave é armazenada localmente no seu navegador.
          </p>
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
