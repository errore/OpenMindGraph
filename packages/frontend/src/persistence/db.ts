import Dexie, { type EntityTable } from 'dexie';
import type { Node, Edge } from '@xyflow/react';

interface StoredScene {
  id: number;
  sceneId: string;
  name: string;
  nodes: Node[];
  edges: Edge[];
  viewport: { x: number; y: number; zoom: number };
  updatedAt: number;
}

interface StoredSettings {
  id: string;
  provider: string;
  model: string;
  temperature: number;
  maxTokens: number;
  systemPrompt: string;
  updatedAt: number;
}

const db = new Dexie('openmindgraph') as Dexie & {
  scenes: EntityTable<StoredScene, 'id'>;
  settings: EntityTable<StoredSettings, 'id'>;
};

db.version(2).stores({
  scenes: '++id, sceneId, updatedAt',
  settings: 'id',
});

export { db };
export type { StoredScene, StoredSettings };
