import React, { useState, useCallback } from 'react';
import { Bookmark, BookmarkCheck, Loader } from 'lucide-react';
import { getBookmarks, saveBookmarks } from '../utils/bookmarks';

const BookmarkButton = ({ item, className = '' }) => {
  const [isBookmarked, setIsBookmarked] = useState(() => {
    const bookmarks = getBookmarks();
    return bookmarks.some(b => b.id === item.id);
  });
  const [loading, setLoading] = useState(false);

  const toggleBookmark = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setLoading(true);

    const bookmarks = getBookmarks();
    let updated;

    if (isBookmarked) {
      updated = bookmarks.filter(b => b.id !== item.id);
    } else {
      updated = [...bookmarks, {
        id: item.id,
        title: item.title,
        link: item.link,
        source: item.source,
        category: item.category,
        pubDate: item.pubDate,
        bookmarkedAt: new Date().toISOString()
      }];
    }

    saveBookmarks(updated);
    setIsBookmarked(!isBookmarked);
    setLoading(false);
  }, [isBookmarked, item]);

  return (
    <button
      onClick={toggleBookmark}
      disabled={loading}
      className={`p-2 rounded-lg transition-all hover:scale-110 active:scale-90 ${className} ${
        isBookmarked
          ? 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30'
          : 'text-slate-500 dark:text-slate-400 bg-white/80 dark:bg-slate-800/80 hover:bg-slate-100 dark:hover:bg-slate-700'
      }`}
      title={isBookmarked ? 'Remover dos favoritos' : 'Salvar nos favoritos'}
    >
      {loading ? <Loader size={16} className="animate-spin" /> : isBookmarked ? <BookmarkCheck size={16} /> : <Bookmark size={16} />}
    </button>
  );
};

export default BookmarkButton;
