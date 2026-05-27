import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import {
  Connection,
  Edge,
  EdgeChange,
  Node,
  NodeChange,
  addEdge,
  OnNodesChange,
  OnEdgesChange,
  OnConnect,
  applyNodeChanges,
  applyEdgeChanges,
} from '@xyflow/react';

export type AppNode = Node;

export type DataSource = {
  id: string;
  name: string;
  headers: string[];
  previewData: any[][];
};

export interface WidgetConfig {
  id: string;
  type: 'chart' | 'text' | 'table';
  x: number;
  y: number;
  width: number;
  height: number;
  data: any;
  libraryId?: string;
}

type PanelState = 'closed' | 'open' | 'maximized';

type AppState = {
  nodes: AppNode[];
  edges: Edge[];
  onNodesChange: OnNodesChange<AppNode>;
  onEdgesChange: OnEdgesChange;
  onConnect: OnConnect;
  addNode: (node: AppNode) => void;
  duplicateNode: (id: string) => void;
  updateNodeData: (id: string, data: any) => void;

  dataSources: DataSource[];
  addDataSource: (ds: DataSource) => void;
  removeDataSource: (id: string) => void;

  leftPanelState: PanelState;
  rightPanelState: PanelState;
  setLeftPanelState: (state: PanelState) => void;
  setRightPanelState: (state: PanelState) => void;

  selectedNodeId: string | null;
  setSelectedNodeId: (id: string | null) => void;

  selectedDataValue: string | null;
  setSelectedDataValue: (val: string | null) => void;

  widgets: WidgetConfig[];
  addWidget: (widget: WidgetConfig) => void;
  updateWidget: (id: string, data: Partial<WidgetConfig>) => void;
  removeWidget: (id: string) => void;

  isPresentationMode: boolean;
  setIsPresentationMode: (val: boolean) => void;

  theme: 'light' | 'dark';
  toggleTheme: () => void;

  llmProvider: 'mistral' | 'gemini' | 'openai' | 'claude';
  setLlmProvider: (provider: 'mistral' | 'gemini' | 'openai' | 'claude') => void;

  mistralToken: string;
  setMistralToken: (token: string) => void;
  geminiToken: string;
  setGeminiToken: (token: string) => void;
  openaiToken: string;
  setOpenaiToken: (token: string) => void;
  claudeToken: string;
  setClaudeToken: (token: string) => void;

  loadWorkspace: (workspace: { nodes: AppNode[], edges: Edge[], dataSources: DataSource[], widgets?: WidgetConfig[] }) => void;
};

export const useStore = create<AppState>()(
  persist(
    (set, get) => ({
      nodes: [],
      edges: [],
      onNodesChange: (changes: NodeChange<AppNode>[]) => {
        set({
          nodes: applyNodeChanges(changes, get().nodes),
        });
      },
      onEdgesChange: (changes: EdgeChange[]) => {
        set({
          edges: applyEdgeChanges(changes, get().edges),
        });
      },
      onConnect: (connection: Connection) => {
        set({
          edges: addEdge(connection, get().edges),
        });
      },
      addNode: (node: AppNode) => {
        set({
          nodes: [...get().nodes, node],
        });
      },
      duplicateNode: (id: string) => {
        const nodeToCopy = get().nodes.find((n) => n.id === id);
        if (!nodeToCopy) return;

        // Deep copy to prevent shared object references (e.g. prompt history)
        const clonedNode = JSON.parse(JSON.stringify(nodeToCopy));
        
        const newNode: AppNode = {
          ...clonedNode,
          id: `${clonedNode.type}-${Date.now()}`,
          position: {
            x: clonedNode.position.x + 50,
            y: clonedNode.position.y + 50,
          },
          selected: true,
        };

        set({
          nodes: [
            ...get().nodes.map((n) => ({ ...n, selected: false })),
            newNode,
          ],
          selectedNodeId: newNode.id,
        });
      },
      updateNodeData: (id: string, data: any) => {
        set({
          nodes: get().nodes.map((node) => {
            if (node.id === id) {
              return { ...node, data: { ...node.data, ...data } };
            }
            return node;
          }),
        });
      },

      dataSources: [],
      addDataSource: (ds: DataSource) => {
        set({ dataSources: [...get().dataSources, ds] });
      },
      removeDataSource: (id: string) => {
        set({ dataSources: get().dataSources.filter((d) => d.id !== id) });
      },

      leftPanelState: 'open',
      rightPanelState: 'open',
      setLeftPanelState: (state: PanelState) => {
        set({ 
          leftPanelState: state,
          ...(state === 'maximized' ? { rightPanelState: get().rightPanelState === 'maximized' ? 'closed' : get().rightPanelState } : {})
        });
      },
      setRightPanelState: (state: PanelState) => {
        set({ 
          rightPanelState: state,
          ...(state === 'maximized' ? { leftPanelState: get().leftPanelState === 'maximized' ? 'closed' : get().leftPanelState } : {})
        });
      },

      selectedNodeId: null,
      setSelectedNodeId: (id: string | null) => {
        set({ selectedNodeId: id });
      },

      selectedDataValue: null,
      setSelectedDataValue: (val: string | null) => {
        set({ selectedDataValue: val });
      },

      widgets: [],
      addWidget: (widget: WidgetConfig) => {
        set({ widgets: [...get().widgets, widget] });
      },
      updateWidget: (id: string, data: Partial<WidgetConfig>) => {
        set({
          widgets: get().widgets.map((w) => (w.id === id ? { ...w, ...data } : w)),
        });
      },
      removeWidget: (id: string) => {
        set({ widgets: get().widgets.filter((w) => w.id !== id) });
      },

      isPresentationMode: false,
      setIsPresentationMode: (val: boolean) => {
        set({ isPresentationMode: val });
      },

      theme: 'dark',
      toggleTheme: () => {
        set({ theme: get().theme === 'dark' ? 'light' : 'dark' });
      },

      llmProvider: 'mistral',
      setLlmProvider: (provider) => {
        set((state) => {
          const updates: Partial<AppState> = { llmProvider: provider };
          if (provider === 'mistral' && !state.mistralToken) {
            updates.mistralToken = import.meta.env.VITE_MISTRAL_API_KEY || '';
          }
          return updates;
        });
      },

      mistralToken: import.meta.env.VITE_MISTRAL_API_KEY || '',
      setMistralToken: (token) => {
        set({ mistralToken: token });
      },

      geminiToken: '',
      setGeminiToken: (token) => {
        set({ geminiToken: token });
      },

      openaiToken: '',
      setOpenaiToken: (token) => {
        set({ openaiToken: token });
      },

      claudeToken: '',
      setClaudeToken: (token) => {
        set({ claudeToken: token });
      },

      loadWorkspace: (workspace) => {
        set({
          nodes: workspace.nodes || [],
          edges: workspace.edges || [],
          dataSources: workspace.dataSources || [],
          widgets: workspace.widgets || [],
          selectedNodeId: null,
          selectedDataValue: null,
        });
      },
    }),
    {
      name: 'biui-workspace-storage',
      partialize: (state) => ({
        nodes: state.nodes,
        edges: state.edges,
        dataSources: state.dataSources,
        widgets: state.widgets,
        leftPanelState: state.leftPanelState,
        rightPanelState: state.rightPanelState,
        theme: state.theme,
        llmProvider: state.llmProvider,
        mistralToken: state.mistralToken,
        geminiToken: state.geminiToken,
        openaiToken: state.openaiToken,
        claudeToken: state.claudeToken,
      }),
    }
  )
);
