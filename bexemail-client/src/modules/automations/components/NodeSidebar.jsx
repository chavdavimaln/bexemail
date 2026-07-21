import React from 'react';

export default function NodeSidebar() {
  const onDragStart = (event, nodeType) => {
    event.dataTransfer.setData('application/reactflow', nodeType);
    event.dataTransfer.effectAllowed = 'move';
  };

  return (
    <aside className="w-64 bg-white border-r border-gray-200 p-4 h-full flex flex-col">
      <h3 className="text-lg font-semibold text-gray-800 mb-4">Node Library</h3>
      
      <div className="space-y-4">
        <div>
          <h4 className="text-xs font-bold text-gray-400 uppercase mb-2">Triggers</h4>
          <div 
            className="bg-green-50 border border-green-200 text-green-700 p-3 rounded cursor-grab hover:bg-green-100 transition"
            onDragStart={(event) => onDragStart(event, 'triggerNode')}
            draggable
          >
            + Subscriber joins list
          </div>
          <div 
            className="bg-cyan-50 border border-cyan-200 text-cyan-700 p-3 rounded cursor-grab hover:bg-cyan-100 transition mt-2 flex items-center gap-2"
            onDragStart={(event) => onDragStart(event, 'webhookNode')}
            draggable
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 16.98h-5.99c-1.1 0-1.95.94-2.48 1.9n0a3.3 3.3 0 0 1-5.85-1.9c-.3-1.89 1.25-3.55 3.12-3.88l1.32-.23c1.68-.3 2.88-1.78 2.88-3.48V8c0-2.2 1.8-4 4-4h4"/></svg>
            Webhook
          </div>
        </div>

        <div>
          <h4 className="text-xs font-bold text-gray-400 uppercase mb-2">Actions</h4>
          <div 
            className="bg-blue-50 border border-blue-200 text-blue-700 p-3 rounded cursor-grab hover:bg-blue-100 transition"
            onDragStart={(event) => onDragStart(event, 'emailNode')}
            draggable
          >
            ✉️ Send Email
          </div>
          <div 
            className="bg-yellow-50 border border-yellow-200 text-yellow-700 p-3 rounded cursor-grab hover:bg-yellow-100 transition mt-2"
            onDragStart={(event) => onDragStart(event, 'actionNode')}
            draggable
          >
            🏷️ Tag / Untag
          </div>
        </div>

        <div>
          <h4 className="text-xs font-bold text-gray-400 uppercase mb-2">Delays</h4>
          <div 
            className="bg-purple-50 border border-purple-200 text-purple-700 p-3 rounded cursor-grab hover:bg-purple-100 transition"
            onDragStart={(event) => onDragStart(event, 'delayNode')}
            draggable
          >
            ⏳ Time Delay
          </div>
          <div 
            className="bg-pink-50 border border-pink-200 text-pink-700 p-3 rounded cursor-grab hover:bg-pink-100 transition mt-2 flex items-center gap-2"
            onDragStart={(event) => onDragStart(event, 'waitUntilNode')}
            draggable
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
            Wait Until
          </div>
        </div>

        <div>
          <h4 className="text-xs font-bold text-gray-400 uppercase mb-2">Logic</h4>
          <div 
            className="bg-orange-50 border border-orange-200 text-orange-700 p-3 rounded cursor-grab hover:bg-orange-100 transition"
            onDragStart={(event) => onDragStart(event, 'ifElseNode')}
            draggable
          >
            ❓ If / Else
          </div>
          <div 
            className="bg-indigo-50 border border-indigo-200 text-indigo-700 p-3 rounded cursor-grab hover:bg-indigo-100 transition mt-2"
            onDragStart={(event) => onDragStart(event, 'splitNode')}
            draggable
          >
            🔀 Percentage Split
          </div>
          <div 
            className="bg-fuchsia-50 border border-fuchsia-200 text-fuchsia-700 p-3 rounded cursor-grab hover:bg-fuchsia-100 transition mt-2 flex items-center gap-2"
            onDragStart={(event) => onDragStart(event, 'conditionNode')}
            draggable
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="6" y1="3" x2="6" y2="15"></line><circle cx="18" cy="6" r="3"></circle><circle cx="6" cy="18" r="3"></circle><path d="M18 9a9 9 0 0 1-9 9"></path></svg>
            Condition Split
          </div>
          <div 
            className="bg-violet-50 border border-violet-200 text-violet-700 p-3 rounded cursor-grab hover:bg-violet-100 transition mt-2 flex items-center gap-2"
            onDragStart={(event) => onDragStart(event, 'abTestNode')}
            draggable
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 3h5v5"/><path d="M8 3H3v5"/><path d="M12 22v-8.3a4 4 0 0 0-1.172-2.872L3 3"/><path d="m15 9 6-6"/></svg>
            A/B Test
          </div>
        </div>

        <div>
          <h4 className="text-xs font-bold text-gray-400 uppercase mb-2">Goals</h4>
          <div 
            className="bg-yellow-50 border border-yellow-200 text-yellow-700 p-3 rounded cursor-grab hover:bg-yellow-100 transition"
            onDragStart={(event) => onDragStart(event, 'goalNode')}
            draggable
          >
            🏆 Goal Reached
          </div>
        </div>
      </div>
    </aside>
  );
}
