import React from 'react';
import { Handle, Position } from '@xyflow/react';
import { Split } from 'lucide-react';

export default function ABTestNode({ data }) {
  return (
    <div className="bg-white border border-gray-200 rounded-xl shadow-sm hover:shadow-md hover:border-violet-400 transition-all min-w-[240px] overflow-visible group">
      <Handle type="target" position={Position.Top} className="w-3 h-3 bg-violet-500 border-2 border-white" />
      
      <div className="bg-gradient-to-r from-violet-500 to-fuchsia-500 px-4 py-3 flex items-center gap-2 rounded-t-xl">
        <div className="bg-white/20 p-1.5 rounded-lg text-white">
          <Split size={16} fill="none" strokeWidth={2.5} />
        </div>
        <span className="text-white font-bold text-sm tracking-wide">A/B Test</span>
      </div>
      
      <div className="p-4 text-gray-700 text-sm font-medium bg-white text-center rounded-b-xl border-b border-gray-100">
        {data.label || 'Split Traffic 50/50'}
      </div>

      <div className="flex justify-between mt-2 px-6">
        <div className="text-xs font-bold text-gray-400 uppercase relative">
          Variant A
          <Handle 
            type="source" 
            position={Position.Bottom} 
            id="a" 
            className="w-3 h-3 bg-violet-500 border-2 border-white -bottom-3 left-1/2 -translate-x-1/2" 
          />
        </div>
        <div className="text-xs font-bold text-gray-400 uppercase relative">
          Variant B
          <Handle 
            type="source" 
            position={Position.Bottom} 
            id="b" 
            className="w-3 h-3 bg-fuchsia-500 border-2 border-white -bottom-3 left-1/2 -translate-x-1/2" 
          />
        </div>
      </div>
    </div>
  );
}
