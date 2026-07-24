import React, { useState } from 'react';
import { AlertCircle, Merge, Split, Check } from 'lucide-react';

export default function ConflictResolverModal({ conflictData, onClose, onConfirm }) {
  const { conflicts, newContacts, originSite } = conflictData;
  
  // Set default action for all conflicts to 'merge'
  const [actions, setActions] = useState(() => {
    const initialActions = {};
    conflicts.forEach(c => {
      initialActions[c.email] = {
        action: 'merge', // 'merge' or 'separate'
        name: c.currentName || ''
      };
    });
    return initialActions;
  });

  const handleActionChange = (email, action) => {
    setActions(prev => ({
      ...prev,
      [email]: { ...prev[email], action }
    }));
  };

  const handleNameChange = (email, name) => {
    setActions(prev => ({
      ...prev,
      [email]: { ...prev[email], name }
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    // Map new contacts
    const parsedNew = newContacts.map(c => ({
      email: c.email,
      name: '',
      conflictAction: null
    }));

    // Map resolved conflicts
    const parsedConflicts = conflicts.map(c => ({
      email: c.email,
      name: actions[c.email].name,
      conflictAction: actions[c.email].action
    }));

    // Combine and send back
    const finalContacts = [...parsedNew, ...parsedConflicts];
    onConfirm(finalContacts);
  };

  return (
    <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl border border-gray-100 shadow-xl max-w-3xl w-full max-h-[85vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="px-6 py-5 border-b border-gray-100 bg-amber-50/30 flex items-center gap-3">
          <div className="p-2 bg-amber-100 text-amber-700 rounded-lg">
            <AlertCircle size={22} />
          </div>
          <div>
            <h3 className="text-lg font-bold text-gray-900">Duplicate Contacts Found</h3>
            <p className="text-xs text-amber-700 font-medium">
              We found {conflicts.length} emails that already exist in your system. Specify how to resolve each.
            </p>
          </div>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-4">
          <div className="space-y-3.5">
            {conflicts.map((c) => {
              const currentAction = actions[c.email].action;
              const currentName = actions[c.email].name;

              return (
                <div 
                  key={c.email} 
                  className={`p-4 rounded-xl border transition-all flex flex-col md:flex-row md:items-center justify-between gap-4 ${
                    currentAction === 'merge' ? 'border-blue-200 bg-blue-50/10' : 'border-purple-200 bg-purple-50/10'
                  }`}
                >
                  <div className="space-y-1.5 flex-1">
                    <p className="font-bold text-sm text-gray-900">{c.email}</p>
                    <div className="flex flex-wrap gap-1.5 items-center">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Current Origins:</span>
                      {c.existingOrigins.map((o) => (
                        <span key={o} className="px-2 py-0.5 bg-gray-100 text-gray-600 border border-gray-200 text-[10px] font-semibold rounded-full">
                          {o}
                        </span>
                      ))}
                    </div>

                    {/* Site Specific Name Input */}
                    <div className="pt-2">
                      <label className="block text-[11px] font-semibold text-gray-500 mb-1">Name for {originSite}:</label>
                      <input 
                        type="text"
                        value={currentName}
                        onChange={(e) => handleNameChange(c.email, e.target.value)}
                        placeholder="Optional name"
                        className="px-2 py-1 bg-white border border-gray-300 rounded-md text-xs w-48 focus:ring-1 focus:ring-primary-500 outline-none"
                      />
                    </div>
                  </div>

                  {/* Resolution selector */}
                  <div className="flex gap-2 shrink-0 self-start md:self-center">
                    
                    {/* Merge Choice Button */}
                    <button
                      type="button"
                      onClick={() => handleActionChange(c.email, 'merge')}
                      className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold border transition-all ${
                        currentAction === 'merge' 
                          ? 'bg-blue-600 text-white border-blue-600 shadow-sm shadow-blue-100' 
                          : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
                      }`}
                    >
                      <Merge size={14} />
                      Merge Info
                    </button>

                    {/* Separate Choice Button */}
                    <button
                      type="button"
                      onClick={() => handleActionChange(c.email, 'separate')}
                      className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold border transition-all ${
                        currentAction === 'separate' 
                          ? 'bg-purple-600 text-white border-purple-600 shadow-sm shadow-purple-100' 
                          : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
                      }`}
                    >
                      <Split size={14} />
                      Keep Separate
                    </button>

                  </div>
                </div>
              );
            })}
          </div>
        </form>

        {/* Footer */}
        <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex items-center justify-between">
          <p className="text-xs text-gray-400">
            * {newContacts.length} new contact(s) will be automatically imported.
          </p>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-gray-200 text-gray-600 rounded-xl text-xs font-semibold hover:bg-gray-100 transition"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              className="flex items-center gap-1.5 bg-primary-600 hover:bg-primary-700 text-white px-5 py-2 rounded-xl text-xs font-semibold transition shadow-md shadow-primary-200"
            >
              <Check size={14} />
              Resolve & Import
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
