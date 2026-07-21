import React from 'react';
import { Handle, Position } from '@xyflow/react';
import { Activity } from 'lucide-react';

export default function ActionNode({ data }) {
  return (
    <div className="bg-white border border-gray-200 rounded-xl shadow-sm hover:shadow-md hover:border-yellow-400 transition-all min-w-[240px] overflow-hidden group">
      <Handle type="target" position={Position.Top} className="w-3 h-3 bg-yellow-500 border-2 border-white" />
      <div className="bg-gradient-to-r from-yellow-500 to-amber-500 px-4 py-3 flex items-center gap-2">
        <div className="bg-white/20 p-1.5 rounded-lg text-white">
          <Activity size={16} fill="none" strokeWidth={2.5} />
        </div>
        <span className="text-white font-bold text-sm tracking-wide">Action</span>
      </div>
      <div className="p-4 text-gray-700 text-sm font-medium bg-white">
        {data.label || 'Action settings...'}
      </div>
      <Handle type="source" position={Position.Bottom} className="w-3 h-3 bg-yellow-500 border-2 border-white" />
    </div>
  );
}
