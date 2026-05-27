import React from 'react';
import { Handle, Position } from '@xyflow/react';
import { Cpu, Copy } from 'lucide-react';
import { PromptEditor } from '../PromptEditor/PromptEditor';
import { useStore } from '../../store/useStore';

export function TransformNode({ id, data }: { id: string, data: any }) {
  const duplicateNode = useStore((s) => s.duplicateNode);

  return (
    <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-lg min-w-[350px] max-w-[450px] overflow-hidden">
      <Handle
        type="target"
        position={Position.Left}
        className="w-5 h-5 bg-blue-500 border-2 border-white dark:border-slate-800 hover:scale-125 transition-transform cursor-crosshair"
      />
      <div className="bg-blue-50 dark:bg-blue-900/50 p-2 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Cpu size={14} className="text-blue-500 dark:text-blue-400" />
          <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">Transform</span>
        </div>
        <button 
          onClick={() => duplicateNode(id)}
          className="text-slate-400 hover:text-blue-500 dark:text-slate-500 dark:hover:text-blue-400 transition-colors"
          title="Duplicate Node"
        >
          <Copy size={12} />
        </button>
      </div>
      <div className="p-3">
        <PromptEditor nodeId={id} />
      </div>
      <Handle
        type="source"
        position={Position.Right}
        className="w-5 h-5 bg-blue-500 border-2 border-white dark:border-slate-800 hover:scale-125 transition-transform cursor-crosshair"
      />
    </div>
  );
}
