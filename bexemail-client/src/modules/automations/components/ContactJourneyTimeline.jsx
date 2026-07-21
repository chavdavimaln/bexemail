import React from 'react';

export default function ContactJourneyTimeline({ isOpen, onClose, logs, subscriberName }) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-gray-900 bg-opacity-50 flex justify-end">
      <div className="w-96 bg-white h-full shadow-xl flex flex-col">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center bg-gray-50">
          <h2 className="text-lg font-bold text-gray-800">Journey: {subscriberName}</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-800 font-bold">X</button>
        </div>

        {/* Timeline Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {logs.length === 0 ? (
            <p className="text-gray-500 text-sm text-center">No activity recorded yet.</p>
          ) : (
            <div className="relative border-l-2 border-blue-200 ml-3 space-y-8">
              {logs.map((log, index) => (
                <div key={index} className="relative pl-6">
                  {/* Timeline Dot */}
                  <div className="absolute -left-2 top-1.5 w-4 h-4 bg-blue-500 rounded-full border-4 border-white shadow"></div>
                  
                  {/* Log Content */}
                  <div>
                    <p className="text-xs text-gray-400 font-semibold mb-1">
                      {new Date(log.timestamp).toLocaleString()}
                    </p>
                    <p className="text-sm font-medium text-gray-800 bg-gray-50 border border-gray-100 p-3 rounded-md shadow-sm">
                      {log.action_taken}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
