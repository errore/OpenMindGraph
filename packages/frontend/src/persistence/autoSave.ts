import { db } from './db';
import type { Node, Edge } from '@xyflow/react';

const DEBOUNCE_MS = 200;
const SCENE_ID = 'default';

let saveTimer: ReturnType<typeof setTimeout>;

export async function restoreScene(): Promise<{
  nodes: Node[];
  edges: Edge[];
  viewport: { x: number; y: number; zoom: number };
} | null> {
  const scene = await db.scenes.where('sceneId').equals(SCENE_ID).last();
  if (!scene) return null;
  return {
    nodes: scene.nodes,
    edges: scene.edges,
    viewport: scene.viewport,
  };
}

export function scheduleSave(
  nodes: Node[],
  edges: Edge[],
  viewport: { x: number; y: number; zoom: number },
) {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(async () => {
    await db.scenes.put({
      sceneId: SCENE_ID,
      name: 'Default Scene',
      nodes: structuredClone(nodes),
      edges: structuredClone(edges),
      viewport: { ...viewport },
      updatedAt: Date.now(),
    });
  }, DEBOUNCE_MS);
}
