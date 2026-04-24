import React, { useState } from 'react';
import PropTypes from 'prop-types';
import { X } from 'lucide-react';

const Settings = ({ isOpen, onClose, onSave }) => {
  const [aiProvider, setAiProvider] = useState(() => localStorage.getItem('ai_provider') || 'gemini');
  const [apiKey, setApiKey] = useState(() => localStorage.getItem('ai_api_key') || localStorage.getItem('gemini_api_key') || '');
  const [aiModel, setAiModel] = useState(() => localStorage.getItem('ai_model') || '');

  const handleSave = () => {
    localStorage.setItem('ai_provider', aiProvider); // NOSONAR
    localStorage.setItem('ai_api_key', apiKey); // NOSONAR
    localStorage.setItem('ai_model', aiModel); // NOSONAR
    // Backward compatibility for existing users
    if (aiProvider === 'gemini') {
      localStorage.setItem('gemini_api_key', apiKey); // NOSONAR
    }
    onSave({ provider: aiProvider, apiKey, model: aiModel });
    onClose();
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

        <div className="mb-6 space-y-4">
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
              <option value="gemini">Google Gemini (Direct)</option>
              <option value="openai">OpenAI (via AI SDK)</option>
              <option value="google">Google (via AI SDK)</option>
              <option value="anthropic">Anthropic (via AI SDK)</option>
              <option value="mistral">Mistral (via AI SDK)</option>
            </select>
          </div>

          <div>
            <label htmlFor="api-key-input" className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
              Token da API
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

          {aiProvider !== 'gemini' && (
            <div>
              <label htmlFor="ai-model-input" className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                Modelo da IA (opcional)
              </label>
              <input
                id="ai-model-input"
                type="text"
                value={aiModel}
                onChange={(e) => setAiModel(e.target.value)}
                className="w-full px-4 py-3 border border-gray-200 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all bg-gray-50 dark:bg-gray-700 dark:text-white"
                placeholder="Ex: gpt-4o-mini"
              />
            </div>
          )}

          <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
            Suas chaves são armazenadas localmente no seu navegador.
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

Settings.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  onSave: PropTypes.func.isRequired
};

export default Settings;
