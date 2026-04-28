import { useState, useEffect } from 'react';
import { Zap } from 'lucide-react';

const ReadingProgress = () => {
  const [progress, setProgress] = useState(0);
  const [showBar, setShowBar] = useState(false);

  useEffect(() => {
    const calculateProgress = () => {
      const scrollTop = window.scrollY;
      const docHeight = document.documentElement.scrollHeight - window.innerHeight;
      const scrollPercent = docHeight > 0 ? (scrollTop / docHeight) * 100 : 0;
      setProgress(Math.min(100, scrollPercent));
      setShowBar(scrollPercent > 5);
    };

    window.addEventListener('scroll', calculateProgress, { passive: true });
    calculateProgress();

    return () => window.removeEventListener('scroll', calculateProgress);
  }, []);

  if (!showBar) return null;

  return (
    <div className="fixed top-0 left-0 right-0 z-[9999] h-1 bg-transparent">
      <div
        className="h-full bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 transition-all duration-150 ease-out"
        style={{ width: `${progress}%` }}
      />
    </div>
  );
};

export default ReadingProgress;