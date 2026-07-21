import React from 'react';
import { Handle, Position } from '@xyflow/react';
import { Clock } from 'lucide-react';

export default function DelayNode({ data }) {
  return (
    <div className="bg-white border border-gray-200 rounded-xl shadow-sm hover:shadow-md hover:border-purple-400 transition-all min-w-[240px] overflow-hidden group">
      <Handle type="target" position={Position.Top} className="w-3 h-3 bg-purple-500 border-2 border-white" />
      <div className="bg-gradient-to-r from-purple-500 to-fuchsia-500 px-4 py-3 flex items-center gap-2">
        <div className="bg-white/20 p-1.5 rounded-lg text-white">
          <Clock size={16} fill="none" strokeWidth={2.5} />
        </div>
        <span className="text-white font-bold text-sm tracking-wide">Delay</span>
      </div>
      <div className="p-4 text-gray-700 text-sm font-medium bg-white">
        {data.label || 'Wait 1 day'}
      </div>
      <Handle type="source" position={Position.Bottom} className="w-3 h-3 bg-purple-500 border-2 border-white" />
    </div>
  );
}
