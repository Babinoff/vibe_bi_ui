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

  llmProvider: 'mistral' | 'gemini';
  setLlmProvider: (provider: 'mistral' | 'gemini') => void;

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
        set({ llmProvider: provider });
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
      }),
    }
  )
);
