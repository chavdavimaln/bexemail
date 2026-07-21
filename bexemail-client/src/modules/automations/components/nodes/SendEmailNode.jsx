import React from 'react';
import { Handle, Position } from '@xyflow/react';
import { Mail } from 'lucide-react';

export default function SendEmailNode({ data }) {
  return (
    <div className="bg-white border border-gray-200 rounded-xl shadow-sm hover:shadow-md hover:border-blue-400 transition-all min-w-[240px] overflow-hidden group">
      <Handle type="target" position={Position.Top} className="w-3 h-3 bg-blue-500 border-2 border-white" />
      <div className="bg-gradient-to-r from-blue-500 to-indigo-500 px-4 py-3 flex items-center gap-2">
        <div className="bg-white/20 p-1.5 rounded-lg text-white">
          <Mail size={16} fill="currentColor" />
        </div>
        <span className="text-white font-bold text-sm tracking-wide">Send Email</span>
      </div>
      <div className="p-4 text-gray-700 text-sm font-medium bg-white">
        {data.label || 'Select a template...'}
      </div>
      <Handle type="source" position={Position.Bottom} className="w-3 h-3 bg-blue-500 border-2 border-white" />
    </div>
  );
}
