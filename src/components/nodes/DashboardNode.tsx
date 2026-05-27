import React from 'react';
import { Handle, Position } from '@xyflow/react';
import { LayoutDashboard, Copy } from 'lucide-react';
import { useStore } from '../../store/useStore';

export function DashboardNode({ id }: { id: string }) {
  const duplicateNode = useStore((s) => s.duplicateNode);
  const edges = useStore(s => s.edges);
  const nodes = useStore(s => s.nodes);

  const incomingEdges = edges.filter(e => e.target === id);

  return (
    <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-lg min-w-[200px] overflow-hidden">
      <Handle type="target" position={Position.Left} className="w-5 h-5 bg-purple-500 border-2 border-white dark:border-slate-800 hover:scale-125 transition-transform cursor-crosshair" />
      
      <div className="bg-purple-50 dark:bg-purple-900/50 p-2 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <LayoutDashboard size={14} className="text-purple-500 dark:text-purple-400" />
          <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">Dashboard</span>
        </div>
        <button 
          onClick={() => duplicateNode(id)}
          className="text-slate-400 hover:text-purple-500 dark:text-slate-500 dark:hover:text-purple-400 transition-colors"
          title="Duplicate Node"
        >
          <Copy size={12} />
        </button>
      </div>
      
      <div className="p-3 flex flex-col gap-3">
        <div className="text-[10px] text-slate-500 dark:text-slate-400">
          Connected Inputs: {incomingEdges.length}
        </div>
        
        <div className="flex flex-col gap-1">
          {incomingEdges.map((edge, i) => (
            <div key={edge.id} className="text-[9px] text-slate-600 dark:text-slate-500 bg-slate-50 dark:bg-slate-900 px-2 py-1 rounded border border-slate-200 dark:border-slate-700">
              IN[{i}]: {nodes.find(n => n.id === edge.source)?.type || 'Unknown'}
            </div>
          ))}
          {incomingEdges.length === 0 && (
            <div className="text-[9px] text-slate-400 dark:text-slate-600 italic">No inputs connected</div>
          )}
        </div>
      </div>
    </div>
  );
}
