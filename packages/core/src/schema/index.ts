import { z } from 'zod';

export const NodeTypeSchema = z.enum([
  'chat',
  'prompt',
  'subgraph',
  'mcp_memory',
  'router',
  'text',
  'code',
]);

export const ModelConfigSchema = z.object({
  provider: z.string(),
  model: z.string(),
  temperature: z.number().min(0).max(2).optional(),
  maxTokens: z.number().int().positive().optional(),
});

export const ChatMessageSchema = z.object({
  role: z.enum(['user', 'assistant', 'system']),
  content: z.string(),
  timestamp: z.number().optional(),
});

export const SceneNodeSchema = z.object({
  id: z.string(),
  type: NodeTypeSchema,
  position: z.object({ x: z.number(), y: z.number() }),
  data: z.record(z.unknown()),
  width: z.number().optional(),
  height: z.number().optional(),
});

export const SceneEdgeSchema = z.object({
  id: z.string(),
  source: z.string(),
  sourceHandle: z.string(),
  target: z.string(),
  targetHandle: z.string(),
  type: z.enum(['default', 'smoothstep', 'custom']).optional(),
});

export const CanvasSchema = z.object({
  sceneId: z.string(),
  parentSubgraphNodeId: z.string().nullable(),
  nodes: z.array(SceneNodeSchema),
  edges: z.array(SceneEdgeSchema),
  viewport: z.object({ x: z.number(), y: z.number(), zoom: z.number() }),
});

export const SceneSchema = z.object({
  id: z.string(),
  name: z.string(),
  createdAt: z.number(),
  updatedAt: z.number(),
  metadata: z.record(z.unknown()),
});
