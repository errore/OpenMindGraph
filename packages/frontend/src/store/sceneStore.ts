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
}));
