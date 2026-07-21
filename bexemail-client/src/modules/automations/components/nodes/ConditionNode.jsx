import React from 'react';
import { Handle, Position } from '@xyflow/react';
import { GitBranch } from 'lucide-react';

export default function ConditionNode({ data }) {
  return (
    <div className="bg-white border border-gray-200 rounded-xl shadow-sm hover:shadow-md hover:border-purple-400 transition-all min-w-[260px] overflow-hidden group">
      <Handle type="target" position={Position.Top} className="w-3 h-3 bg-purple-500 border-2 border-white" />
      <div className="bg-gradient-to-r from-purple-500 to-fuchsia-500 px-4 py-3 flex items-center gap-2">
        <div className="bg-white/20 p-1.5 rounded-lg text-white">
          <GitBranch size={16} fill="none" strokeWidth={2.5} />
        </div>
        <span className="text-white font-bold text-sm tracking-wide">Condition Split</span>
      </div>
      <div className="p-4 text-gray-700 text-sm bg-white font-medium text-center border-b border-gray-100">
        {data.label || 'Condition...'}
      </div>
      <div className="flex bg-gray-50 text-xs font-semibold text-gray-500 divide-x divide-gray-200">
        <div className="flex-1 py-2 text-center relative group-hover:text-purple-600 transition-colors">
          Yes
          <Handle 
            type="source" 
            position={Position.Bottom} 
            id="true"
            className="w-3 h-3 bg-green-500 border-2 border-white translate-y-[5px]"
            style={{ left: '50%' }}
          />
        </div>
        <div className="flex-1 py-2 text-center relative group-hover:text-purple-600 transition-colors">
          No
          <Handle 
            type="source" 
            position={Position.Bottom} 
            id="false"
            className="w-3 h-3 bg-red-500 border-2 border-white translate-y-[5px]"
            style={{ left: '50%' }}
          />
        </div>
      </div>
    </div>
  );
}
