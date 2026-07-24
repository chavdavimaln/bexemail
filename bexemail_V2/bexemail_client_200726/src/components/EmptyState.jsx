import React from 'react';
import { FileQuestion } from 'lucide-react';

const EmptyState = ({ title, description, icon, actionText, onAction }) => {
  return (
    <div className="flex flex-col items-center justify-center p-12 text-center bg-white border border-gray-200 border-dashed rounded-xl shadow-sm">
      <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mb-4 text-gray-400">
        {icon || <FileQuestion size={32} />}
      </div>
      <h3 className="text-lg font-semibold text-gray-900 mb-2">{title}</h3>
      <p className="text-gray-500 max-w-sm mb-6">{description}</p>
      
      {actionText && onAction && (
        <button 
          onClick={onAction}
          className="px-4 py-2 bg-primary-600 text-white font-medium rounded-lg hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 transition-colors"
        >
          {actionText}
        </button>
      )}
    </div>
  );
};

export default EmptyState;
