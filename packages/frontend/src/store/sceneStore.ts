import { create } from 'zustand';
import type { Node, Edge } from '@xyflow/react';

interface SceneState {
  sceneId: string | null;
  nodes: Node[];
  edges: Edge[];
  viewport: { x: number; y: number; zoom: number };

  setScene: (state: {
    sceneId: string;
    nodes: Node[];
    edges: Edge[];
    viewport: { x: number; y: number; zoom: number };
  }) => void;
  setNodes: (nodes: Node[]) => void;
  setEdges: (edges: Edge[]) => void;
  setViewport: (viewport: { x: number; y: number; zoom: number }) => void;
  updateNodeData: (nodeId: string, data: Record<string, unknown>) => void;
  addNode: (node: Node) => void;
  removeNode: (nodeId: string) => void;
  addEdge: (edge: Edge) => void;
  removeEdge: (edgeId: string) => void;
}

export const useSceneStore = create<SceneState>((set) => ({
  sceneId: null,
  nodes: [],
  edges: [],
  viewport: { x: 0, y: 0, zoom: 1 },

  setScene: (canvas) =>
    set({
      sceneId: canvas.sceneId,
      nodes: canvas.nodes,
      edges: canvas.edges,
      viewport: canvas.viewport,
    }),

  setNodes: (nodes) => set({ nodes }),
  setEdges: (edges) => set({ edges }),
  setViewport: (viewport) => set({ viewport }),

  updateNodeData: (nodeId, data) =>
    set((state) => ({
      nodes: state.nodes.map((n) =>
        n.id === nodeId ? { ...n, data: { ...n.data, ...data } } : n,
      ),
    })),

  addNode: (node) => set((state) => ({ nodes: [...state.nodes, node] })),

  removeNode: (nodeId) =>
    set((state) => ({
      nodes: state.nodes.filter((n) => n.id !== nodeId),
      edges: state.edges.filter((e) => e.source !== nodeId && e.target !== nodeId),
    })),

  addEdge: (edge) => set((state) => ({ edges: [...state.edges, edge] })),

  removeEdge: (edgeId) =>
    set((state) => ({
      edges: state.edges.filter((e) => e.id !== edgeId),
    })),
}));
