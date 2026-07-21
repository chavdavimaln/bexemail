import React from 'react';
import { Handle, Position } from '@xyflow/react';
import { CalendarClock } from 'lucide-react';

export default function WaitUntilNode({ data }) {
  const formatWaitTime = () => {
    if (data.waitUntilType === 'specific_date' && data.specificDate) {
      return `Wait until ${new Date(data.specificDate).toLocaleDateString()}`;
    }
    if (data.waitUntilType === 'day_of_week' && data.dayOfWeek) {
      return `Wait until next ${data.dayOfWeek} at ${data.timeOfDay || '09:00'}`;
    }
    return 'Wait until specific time';
  };

  return (
    <div className="bg-white border border-gray-200 rounded-xl shadow-sm hover:shadow-md hover:border-pink-400 transition-all min-w-[220px] overflow-hidden group">
      <Handle type="target" position={Position.Top} className="w-3 h-3 bg-pink-500 border-2 border-white" />
      <div className="bg-gradient-to-r from-pink-500 to-rose-400 px-4 py-3 flex items-center gap-2">
        <div className="bg-white/20 p-1.5 rounded-lg text-white">
          <CalendarClock size={16} fill="none" strokeWidth={2.5} />
        </div>
        <span className="text-white font-bold text-sm tracking-wide">Wait Until</span>
      </div>
      <div className="p-4 text-gray-600 text-sm font-medium bg-white flex justify-center text-center">
        {formatWaitTime()}
      </div>
      <Handle type="source" position={Position.Bottom} className="w-3 h-3 bg-pink-500 border-2 border-white" />
    </div>
  );
}
