import React from 'react';
import { Handle, Position } from '@xyflow/react';
import { GitBranch } from 'lucide-react';

export default function IfElseNode({ data }) {
  return (
    <div className="bg-white border border-gray-200 rounded-xl shadow-sm hover:shadow-md hover:border-orange-400 transition-all min-w-[240px] overflow-hidden group">
      <Handle type="target" position={Position.Top} className="w-3 h-3 bg-orange-500 border-2 border-white" />
      <div className="bg-gradient-to-r from-orange-500 to-amber-500 px-4 py-3 flex items-center justify-center gap-2">
        <div className="bg-white/20 p-1.5 rounded-lg text-white">
          <GitBranch size={16} fill="none" strokeWidth={2.5} />
        </div>
        <span className="text-white font-bold text-sm tracking-wide">Condition</span>
      </div>
      <div className="p-4 text-gray-700 text-sm font-medium text-center border-b border-gray-100 bg-white">
        {data.label || 'Has tag: Premium?'}
      </div>
      <div className="flex justify-between px-6 py-2.5 text-xs font-bold text-gray-600 bg-gray-50/50">
        <span className="text-green-600 bg-green-50 px-2 py-0.5 rounded border border-green-100">Yes</span>
        <span className="text-red-600 bg-red-50 px-2 py-0.5 rounded border border-red-100">No</span>
      </div>
      {/* Yes Handle */}
      <Handle type="source" position={Position.Bottom} id="yes" style={{ left: '25%' }} className="w-3 h-3 bg-green-500 border-2 border-white" />
      {/* No Handle */}
      <Handle type="source" position={Position.Bottom} id="no" style={{ left: '75%' }} className="w-3 h-3 bg-red-500 border-2 border-white" />
    </div>
  );
}
