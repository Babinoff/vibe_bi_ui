import React, { useCallback, useRef, useEffect, useState } from 'react';
import {
  ReactFlow,
  MiniMap,
  Controls,
  Background,
  BackgroundVariant,
  Panel,
  NodeMouseHandler,
  ReactFlowProvider,
  useReactFlow,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { Save, Upload, Sun, Moon, Zap } from 'lucide-react';

import { useStore, AppNode } from '../store/useStore';
import { DataSourceNode } from './nodes/DataSourceNode';
import { TransformNode } from './nodes/TransformNode';
import { VisualizationNode } from './nodes/VisualizationNode';
import { WatchNode } from './nodes/WatchNode';
import { DashboardNode } from './nodes/DashboardNode';

const nodeTypes = {
  dataSource: DataSourceNode,
  transform: TransformNode,
  visualization: VisualizationNode,
  watch: WatchNode,
  dashboard: DashboardNode,
};

function FlowEditor() {
  const { nodes, edges, dataSources, onNodesChange, onEdgesChange, onConnect, addNode, setSelectedNodeId, loadWorkspace, theme, toggleTheme, llmProvider, setLlmProvider } = useStore();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { screenToFlowPosition } = useReactFlow();
  const [copiedNode, setCopiedNode] = useState<AppNode | null>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      // Do not trigger copy/paste if user is typing in an input or textarea
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
        return;
      }

      if ((e.ctrlKey || e.metaKey) && e.key === 'c') {
        const selectedNodeId = useStore.getState().selectedNodeId;
        if (selectedNodeId) {
          const nodeToCopy = useStore.getState().nodes.find(n => n.id === selectedNodeId);
          if (nodeToCopy) {
            setCopiedNode(nodeToCopy);
          }
        }
      }

      if ((e.ctrlKey || e.metaKey) && e.key === 'v') {
        if (copiedNode) {
          const newNode = {
            ...copiedNode,
            id: `${copiedNode.type}-${Date.now()}`,
            position: {
              x: copiedNode.position.x + 50,
              y: copiedNode.position.y + 50,
            },
            selected: true,
          };
          
          // Deselect all existing nodes
          useStore.getState().onNodesChange(
            useStore.getState().nodes.map(n => ({ id: n.id, type: 'select', selected: false }))
          );
          
          useStore.getState().addNode(newNode);
          useStore.getState().setSelectedNodeId(newNode.id);
          setCopiedNode(newNode); // Update copied node so pasting again offsets further
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [copiedNode]);

  const handleAddNode = (type: string) => {
    const position = screenToFlowPosition({
      x: window.innerWidth / 2,
      y: window.innerHeight / 2,
    });
    
    // Slight random offset so they don't stack perfectly
    position.x += (Math.random() - 0.5) * 50;
    position.y += (Math.random() - 0.5) * 50;

    const newNode: any = {
      id: `${type}-${Date.now()}`,
      type,
      position,
      data: { label: `New ${type} node` },
    };

    if (type === 'watch') {
      newNode.style = { width: 350, height: 250 };
    }

    addNode(newNode);
  };

  const onNodeClick: NodeMouseHandler = useCallback((_, node) => {
    setSelectedNodeId(node.id);
  }, [setSelectedNodeId]);

  const onPaneClick = useCallback(() => {
    setSelectedNodeId(null);
  }, [setSelectedNodeId]);

  const handleSave = () => {
    const workspace = { 
      nodes: useStore.getState().nodes, 
      edges: useStore.getState().edges, 
      dataSources: useStore.getState().dataSources,
      widgets: useStore.getState().widgets
    };
    const json = JSON.stringify(workspace, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `workspace-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleLoad = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const content = e.target?.result as string;
        const workspace = JSON.parse(content);
        if (workspace.nodes && workspace.edges && workspace.dataSources) {
          loadWorkspace(workspace);
        } else {
          alert('Invalid workspace file format.');
        }
      } catch (err) {
        console.error('Failed to parse workspace file:', err);
        alert('Failed to load workspace.');
      }
    };
    reader.readAsText(file);
    // Reset input so the same file can be loaded again if needed
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const memoizedNodeTypes = React.useMemo(() => nodeTypes, []);

  return (
    <div className="absolute inset-0">
      <input 
        type="file" 
        accept=".json" 
        ref={fileInputRef} 
        onChange={handleLoad} 
        className="hidden" 
      />
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onNodeClick={onNodeClick}
        onPaneClick={onPaneClick}
        nodeTypes={memoizedNodeTypes}
        fitView
        colorMode={theme}
        className="bg-slate-50 dark:bg-slate-950 transition-colors"
      >
        <Background color={theme === 'dark' ? '#475569' : '#cbd5e1'} variant={BackgroundVariant.Dots} gap={24} size={1} />
        <Controls className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 fill-slate-700 dark:fill-slate-200" />
        <MiniMap 
          nodeColor={(node) => {
            switch (node.type) {
              case 'dataSource': return '#6366f1'; // indigo-500
              case 'transform': return '#3b82f6'; // blue-500
              case 'visualization': return '#10b981'; // emerald-500
              case 'watch': return '#f97316'; // orange-500
              default: return '#94a3b8'; // slate-400
            }
          }}
          maskColor={theme === 'dark' ? "rgba(15, 23, 42, 0.7)" : "rgba(248, 250, 252, 0.7)"}
          className="bg-slate-100 dark:bg-slate-900 border-slate-200 dark:border-slate-700"
        />
        
        <Panel position="top-right" className="flex flex-col gap-2">
          <div className="bg-white/80 dark:bg-slate-800/80 p-2 rounded-lg border border-slate-200 dark:border-slate-700 backdrop-blur-sm flex gap-2 justify-end shadow-sm">
            <button 
              onClick={() => setLlmProvider(llmProvider === 'mistral' ? 'gemini' : 'mistral')}
              className={`flex items-center gap-1 px-3 py-1.5 text-xs rounded transition-colors ${
                llmProvider === 'mistral' 
                  ? 'bg-amber-100 text-amber-700 hover:bg-amber-200 dark:bg-amber-900/30 dark:text-amber-400 dark:hover:bg-amber-900/50' 
                  : 'bg-blue-100 text-blue-700 hover:bg-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:hover:bg-blue-900/50'
              }`}
              title="Toggle LLM Provider"
            >
              <Zap size={14} />
              {llmProvider === 'mistral' ? 'Mistral' : 'Gemini'}
            </button>
            <div className="w-px h-7 bg-slate-200 dark:bg-slate-700 mx-1"></div>
            <button 
              onClick={() => toggleTheme()}
              className="flex items-center justify-center w-7 h-7 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-600 dark:text-slate-300 rounded transition-colors"
              title="Toggle Theme"
            >
              {theme === 'dark' ? <Sun size={14} /> : <Moon size={14} />}
            </button>
            <div className="w-px h-7 bg-slate-200 dark:bg-slate-700 mx-1"></div>
            <button 
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-1 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 text-xs rounded transition-colors"
              title="Load Workspace"
            >
              <Upload size={14} />
              Load
            </button>
            <button 
              onClick={handleSave}
              className="flex items-center gap-1 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 text-xs rounded transition-colors"
              title="Save Workspace"
            >
              <Save size={14} />
              Save
            </button>
          </div>
          <div className="bg-white/80 dark:bg-slate-800/80 p-2 rounded-lg border border-slate-200 dark:border-slate-700 backdrop-blur-sm flex gap-2 shadow-sm">
            <button 
              onClick={() => handleAddNode('dataSource')}
              className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs rounded transition-colors"
            >
              + Data Source
            </button>
            <button 
              onClick={() => handleAddNode('transform')}
              className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs rounded transition-colors"
            >
              + Transform
            </button>
            <button 
              onClick={() => handleAddNode('watch')}
              className="px-3 py-1.5 bg-orange-600 hover:bg-orange-700 text-white text-xs rounded transition-colors"
            >
              + Watch
            </button>
            <button 
              onClick={() => handleAddNode('visualization')}
              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs rounded transition-colors"
            >
              + Visualization
            </button>
            <button 
              onClick={() => handleAddNode('dashboard')}
              className="px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white text-xs rounded transition-colors"
            >
              + Dashboard
            </button>
          </div>
        </Panel>
      </ReactFlow>
    </div>
  );
}

export function NodeEditor() {
  return (
    <ReactFlowProvider>
      <FlowEditor />
    </ReactFlowProvider>
  );
}
