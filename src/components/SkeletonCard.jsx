import React from 'react';

const SkeletonCard = () => {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 flex flex-col h-full overflow-hidden animate-pulse">
      {/* Image Placeholder */}
      <div className="h-52 bg-gray-200 dark:bg-gray-700 w-full" />

      <div className="p-5 flex flex-col flex-grow">
        {/* Meta Placeholder */}
        <div className="flex items-center justify-between mb-3">
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-20" />
            <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-24" />
        </div>

        {/* Title Placeholder */}
        <div className="space-y-2 mb-3">
            <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-full" />
            <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-3/4" />
        </div>

        {/* Content Placeholder */}
        <div className="space-y-2 mb-4 flex-grow">
             <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-full" />
             <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-full" />
             <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-2/3" />
        </div>

        {/* Footer Placeholder */}
        <div className="mt-auto flex items-center justify-between pt-4 border-t border-gray-100 dark:border-gray-700">
             <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded-full w-24" />
             <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-20" />
        </div>
      </div>
    </div>
  );
};

export default React.memo(SkeletonCard);
