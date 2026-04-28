import React from 'react';

const SkeletonCard = () => {
  return (
    <div className="bg-white dark:bg-slate-900 rounded-[2rem] shadow-sm overflow-hidden border border-slate-200/50 dark:border-slate-800/80">
      <div className="p-3">
        <div className="aspect-[16/10] rounded-[1.5rem] bg-gradient-to-br from-slate-200 to-slate-300 dark:from-slate-800 dark:to-slate-700 animate-pulse" />
      </div>

      <div className="px-6 py-5 space-y-4">
        <div className="space-y-2">
          <div className="h-5 bg-gradient-to-r from-slate-200 to-slate-300 dark:from-slate-800 dark:to-slate-700 rounded-lg animate-pulse w-3/4" />
          <div className="h-5 bg-gradient-to-r from-slate-200 to-slate-300 dark:from-slate-800 dark:to-slate-700 rounded-lg animate-pulse w-1/2" />
        </div>

        <div className="space-y-2">
          <div className="h-4 bg-gradient-to-r from-slate-100 to-slate-200 dark:from-slate-800 dark:to-slate-700 rounded animate-pulse" />
          <div className="h-4 bg-gradient-to-r from-slate-100 to-slate-200 dark:from-slate-800 dark:to-slate-700 rounded animate-pulse w-5/6" />
          <div className="h-4 bg-gradient-to-r from-slate-100 to-slate-200 dark:from-slate-800 dark:to-slate-700 rounded animate-pulse w-4/6" />
        </div>
      </div>

      <div className="px-5 pb-5">
        <div className="h-12 bg-gradient-to-r from-slate-100 to-slate-200 dark:from-slate-800 dark:to-slate-700 rounded-2xl animate-pulse" />
      </div>

      <style>{`
        @keyframes shimmer {
          0% { background-position: -200% 0; }
          100% { background-position: 200% 0; }
        }
        .animate-pulse {
          animation: shimmer 1.5s ease-in-out infinite;
          background-size: 200% 100%;
        }
      `}</style>
    </div>
  );
};

export default SkeletonCard;