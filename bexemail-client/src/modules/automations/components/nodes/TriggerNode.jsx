import React from 'react';
import { Handle, Position } from '@xyflow/react';
import { Zap } from 'lucide-react';

export default function TriggerNode({ data }) {
  return (
    <div className="bg-white border border-gray-200 rounded-xl shadow-sm hover:shadow-md hover:border-green-400 transition-all min-w-[240px] overflow-hidden group">
      <div className="bg-gradient-to-r from-green-500 to-emerald-400 px-4 py-3 flex items-center gap-2">
        <div className="bg-white/20 p-1.5 rounded-lg text-white">
          <Zap size={16} fill="currentColor" />
        </div>
        <span className="text-white font-bold text-sm tracking-wide">Trigger</span>
      </div>
      <div className="p-4 text-gray-700 text-sm font-medium bg-white">
        {data.label || 'Subscriber joins list'}
      </div>
      <Handle type="source" position={Position.Bottom} className="w-3 h-3 bg-green-500 border-2 border-white" />
    </div>
  );
}
