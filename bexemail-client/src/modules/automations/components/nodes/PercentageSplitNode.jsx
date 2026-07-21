import React from 'react';
import { Handle, Position } from '@xyflow/react';
import { Split } from 'lucide-react';

export default function PercentageSplitNode() {
  return (
    <div className="bg-white border border-gray-200 rounded-xl shadow-sm hover:shadow-md hover:border-indigo-400 transition-all min-w-[240px] overflow-hidden group">
      <Handle type="target" position={Position.Top} className="w-3 h-3 bg-indigo-500 border-2 border-white" />
      <div className="bg-gradient-to-r from-indigo-500 to-indigo-600 px-4 py-3 flex items-center justify-center gap-2">
        <div className="bg-white/20 p-1.5 rounded-lg text-white">
          <Split size={16} fill="none" strokeWidth={2.5} />
        </div>
        <span className="text-white font-bold text-sm tracking-wide">Percentage Split</span>
      </div>
      <div className="flex justify-between px-4 py-3 text-xs font-bold text-gray-600 bg-white">
        <div className="flex flex-col items-center">
          <span>Path A</span>
          <span className="text-indigo-600 px-2 py-0.5 bg-indigo-50 rounded mt-1">50%</span>
        </div>
        <div className="w-px bg-gray-200"></div>
        <div className="flex flex-col items-center">
          <span>Path B</span>
          <span className="text-indigo-600 px-2 py-0.5 bg-indigo-50 rounded mt-1">50%</span>
        </div>
      </div>
      {/* Branch A Handle */}
      <Handle type="source" position={Position.Bottom} id="path_a" style={{ left: '25%' }} className="w-3 h-3 bg-indigo-500 border-2 border-white" />
      {/* Branch B Handle */}
      <Handle type="source" position={Position.Bottom} id="path_b" style={{ left: '75%' }} className="w-3 h-3 bg-indigo-500 border-2 border-white" />
    </div>
  );
}
