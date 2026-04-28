import React, { useState, useCallback, useEffect } from 'react';
import { X, BookmarkCheck, Trash2, ExternalLink, Clock, Calendar } from 'lucide-react';
import { getBookmarks } from '../utils/bookmarks';

const BookmarkPanel = ({ isOpen, onClose }) => {
  const [bookmarks, setBookmarks] = useState([]);

  const refreshBookmarks = useCallback(() => {
    setBookmarks(getBookmarks());
  }, []);

  useEffect(() => {
    if (isOpen) {
      refreshBookmarks();
    }
  }, [isOpen, refreshBookmarks]);

  if (!isOpen) return null;

  const removeBookmark = (id) => {
    const updated = bookmarks.filter(b => b.id !== id);
    setBookmarks(updated);
    localStorage.setItem('newsai_bookmarks', JSON.stringify(updated));
  };

  const formatDate = (dateString) => {
    try {
      return new Date(dateString).toLocaleDateString('pt-BR', {
        day: '2-digit', month: '2-digit', year: 'numeric'
      });
    } catch {
      return '';
    }
  };

  const estimateReadTime = (text) => {
    const words = text?.split(/\s+/).length || 0;
    return Math.max(1, Math.ceil(words / 200));
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-white dark:bg-gray-800 rounded-2xl w-full max-w-2xl max-h-[85vh] flex flex-col shadow-2xl border border-gray-100 dark:border-gray-700">
        <div className="flex justify-between items-center p-6 border-b border-gray-100 dark:border-gray-700">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <BookmarkCheck size={22} className="text-blue-600" />
            Favoritos Salvos
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full transition-colors text-gray-500">
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {bookmarks.length === 0 ? (
            <div className="text-center py-16">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gray-100 dark:bg-gray-700 mb-4">
                <BookmarkCheck className="text-gray-400" size={32} />
              </div>
              <p className="text-gray-500 dark:text-gray-400 text-lg font-medium">Nenhum favorito salvo</p>
              <p className="text-gray-400 dark:text-gray-500 text-sm mt-2">Clique no ícone de bookmark para salvar artigos</p>
            </div>
          ) : (
            <div className="space-y-4">
              {bookmarks.map((item) => (
                <div key={item.id} className="flex gap-4 p-4 bg-gray-50 dark:bg-gray-700/30 rounded-xl border border-gray-100 dark:border-gray-700 group hover:border-blue-200 dark:hover:border-blue-800 transition-colors">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">{item.source}</p>
                    <h3 className="text-base font-semibold text-gray-900 dark:text-white line-clamp-2 mb-2">{item.title}</h3>
                    <div className="flex items-center gap-4 text-xs text-gray-400 dark:text-gray-500">
                      <span className="flex items-center gap-1"><Clock size={12} />{estimateReadTime(item.title)} min de leitura</span>
                      <span className="flex items-center gap-1"><Calendar size={12} />{formatDate(item.pubDate)}</span>
                    </div>
                  </div>
                  <div className="flex flex-col gap-2">
                    <a href={item.link} target="_blank" rel="noopener noreferrer" className="p-2 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg transition-colors">
                      <ExternalLink size={16} />
                    </a>
                    <button onClick={() => removeBookmark(item.id)} className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-colors opacity-0 group-hover:opacity-100">
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default BookmarkPanel;
