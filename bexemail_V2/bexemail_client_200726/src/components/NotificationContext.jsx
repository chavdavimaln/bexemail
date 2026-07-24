import React, { createContext, useContext, useState, useCallback } from 'react';
import { CheckCircle2, XCircle, X } from 'lucide-react';

const NotificationContext = createContext(null);

export const useNotification = () => useContext(NotificationContext);

export const NotificationProvider = ({ children }) => {
  const [notifications, setNotifications] = useState([]);

  const addNotification = useCallback((type, message, duration = 5000) => {
    const id = Date.now();
    setNotifications(prev => [...prev, { id, type, message }]);
    
    if (duration > 0) {
      setTimeout(() => {
        removeNotification(id);
      }, duration);
    }
  }, []);

  const removeNotification = useCallback((id) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  }, []);

  const success = (msg, duration) => addNotification('success', msg, duration);
  const error = (msg, duration) => addNotification('error', msg, duration);
  const info = (msg, duration) => addNotification('info', msg, duration);

  return (
    <NotificationContext.Provider value={{ success, error, info }}>
      {children}
      <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 pointer-events-none">
        {notifications.map(n => (
          <div 
            key={n.id} 
            className={`pointer-events-auto flex items-center justify-between min-w-[300px] p-4 rounded-lg shadow-lg border transition-all duration-300 transform translate-y-0 opacity-100 ${
              n.type === 'success' ? 'bg-green-50 border-green-200 text-green-800' :
              n.type === 'error' ? 'bg-red-50 border-red-200 text-red-800' :
              'bg-blue-50 border-blue-200 text-blue-800'
            }`}
          >
            <div className="flex items-center gap-3">
              {n.type === 'success' ? <CheckCircle2 className="text-green-500" size={20} /> :
               n.type === 'error' ? <XCircle className="text-red-500" size={20} /> :
               <CheckCircle2 className="text-blue-500" size={20} />}
              <p className="font-medium text-sm">{n.message}</p>
            </div>
            <button 
              onClick={() => removeNotification(n.id)}
              className="text-gray-400 hover:text-gray-600 focus:outline-none ml-4"
            >
              <X size={16} />
            </button>
          </div>
        ))}
      </div>
    </NotificationContext.Provider>
  );
};
