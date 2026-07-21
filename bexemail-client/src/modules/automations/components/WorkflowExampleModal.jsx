import React, { useEffect } from 'react';
import { GitBranch, Mail, MousePointer2, Play, Timer, Trash2, X } from 'lucide-react';

const ExampleCard = ({ className, icon: Icon, eyebrow, title, color }) => (
  <div className={`absolute z-10 w-48 -translate-x-1/2 rounded-xl border bg-white p-3 shadow-md ${className}`}>
    <div className="flex items-center gap-3">
      <span className={`rounded-lg p-2 ${color}`}><Icon size={18} /></span>
      <div>
        <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400">{eyebrow}</p>
        <p className="text-sm font-semibold text-gray-800">{title}</p>
      </div>
    </div>
  </div>
);

export default function WorkflowExampleModal({ isOpen, onClose, onUseExample }) {
  useEffect(() => {
    if (!isOpen) return undefined;

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') onClose();
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleUseExample = () => {
    if (onUseExample() !== false) onClose();
  };

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-gray-950/55 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="workflow-example-title"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div className="flex max-h-[92vh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
          <div>
            <h2 id="workflow-example-title" className="text-xl font-bold text-gray-900">Example: Welcome subscriber workflow</h2>
            <p className="mt-1 text-sm text-gray-500">See how nodes connect from a trigger to actions, delays, and logic.</p>
          </div>
          <button type="button" onClick={onClose} className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-700" aria-label="Close example">
            <X size={21} />
          </button>
        </div>

        <div className="grid min-h-0 flex-1 overflow-y-auto lg:grid-cols-[1fr_280px]">
          <div className="bg-slate-50 p-5">
            <div className="relative mx-auto h-[520px] max-w-3xl overflow-hidden rounded-xl border border-slate-200 bg-white bg-[radial-gradient(#d1d5db_1px,transparent_1px)] [background-size:16px_16px]">
              <svg className="absolute inset-0 h-full w-full" viewBox="0 0 760 520" preserveAspectRatio="none" aria-hidden="true">
                <defs>
                  <marker id="example-arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                    <path d="M 0 0 L 10 5 L 0 10 z" fill="#94a3b8" />
                  </marker>
                </defs>
                <path d="M380 75 V112" stroke="#94a3b8" strokeWidth="2" markerEnd="url(#example-arrow)" />
                <path d="M380 172 V209" stroke="#94a3b8" strokeWidth="2" markerEnd="url(#example-arrow)" />
                <path d="M380 269 V306" stroke="#94a3b8" strokeWidth="2" markerEnd="url(#example-arrow)" />
                <path d="M380 366 C380 405 230 390 230 432" stroke="#94a3b8" strokeWidth="2" fill="none" markerEnd="url(#example-arrow)" />
                <path d="M380 366 C380 405 530 390 530 432" stroke="#94a3b8" strokeWidth="2" fill="none" markerEnd="url(#example-arrow)" />
                <text x="264" y="399" fill="#16a34a" fontSize="12" fontWeight="700">YES</text>
                <text x="480" y="399" fill="#dc2626" fontSize="12" fontWeight="700">NO</text>
              </svg>

              <ExampleCard className="left-1/2 top-4" icon={Play} eyebrow="Trigger" title="Subscriber joins list" color="bg-green-100 text-green-700" />
              <ExampleCard className="left-1/2 top-[112px]" icon={Mail} eyebrow="Action" title="Send welcome email" color="bg-blue-100 text-blue-700" />
              <ExampleCard className="left-1/2 top-[209px]" icon={Timer} eyebrow="Delay" title="Wait 2 days" color="bg-purple-100 text-purple-700" />
              <ExampleCard className="left-1/2 top-[306px]" icon={GitBranch} eyebrow="Logic" title="Opened the email?" color="bg-orange-100 text-orange-700" />
              <ExampleCard className="left-[30%] top-[432px]" icon={Mail} eyebrow="Yes path" title="Send offer email" color="bg-emerald-100 text-emerald-700" />
              <ExampleCard className="left-[70%] top-[432px]" icon={Trash2} eyebrow="No path" title="Add follow-up tag" color="bg-amber-100 text-amber-700" />
            </div>
          </div>

          <aside className="border-l border-gray-200 p-6">
            <h3 className="font-bold text-gray-900">How to build it</h3>
            <ol className="mt-5 space-y-5">
              {[
                ['1', 'Drag a node', 'Drag a Trigger from the left library onto the canvas.'],
                ['2', 'Add the next step', 'Drag an Action, Delay, or Logic node below it.'],
                ['3', 'Connect nodes', 'Drag from a node handle to the handle on the next node.'],
                ['4', 'Configure', 'Select a node and complete its settings in the right panel.'],
                ['5', 'Remove mistakes', 'Select a node or line, then use the red Delete button or keyboard Delete.'],
              ].map(([number, title, detail]) => (
                <li key={number} className="flex gap-3">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-blue-100 text-xs font-bold text-blue-700">{number}</span>
                  <div>
                    <p className="text-sm font-semibold text-gray-800">{title}</p>
                    <p className="mt-0.5 text-xs leading-5 text-gray-500">{detail}</p>
                  </div>
                </li>
              ))}
            </ol>

            <div className="mt-6 rounded-lg border border-blue-100 bg-blue-50 p-3 text-xs leading-5 text-blue-800">
              <MousePointer2 className="mr-1 inline" size={14} /> Lines can be selected too. A selected line is highlighted and can be deleted without removing either node.
            </div>
          </aside>
        </div>

        <div className="flex items-center justify-end gap-3 border-t border-gray-200 px-6 py-4">
          <button type="button" onClick={onClose} className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">Close</button>
          <button type="button" onClick={handleUseExample} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-700">Use this example</button>
        </div>
      </div>
    </div>
  );
}
