export type NodeType = 'chat' | 'templatechat' | 'subgraph' | 'mcp_memory' | 'router' | 'text' | 'code';

export interface Scene {
  id: string;
  name: string;
  createdAt: number;
  updatedAt: number;
  metadata: Record<string, unknown>;
}

export interface SceneNode {
  id: string;
  type: NodeType;
  position: { x: number; y: number };
  data: NodeData;
  width?: number;
  height?: number;
}

export interface SceneEdge {
  id: string;
  source: string;
  sourceHandle: string;
  target: string;
  targetHandle: string;
  type?: 'default' | 'smoothstep' | 'custom';
}

export interface Canvas {
  sceneId: string;
  parentSubgraphNodeId: string | null;
  nodes: SceneNode[];
  edges: SceneEdge[];
  viewport: { x: number; y: number; zoom: number };
}

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp?: number;
}

export interface ModelConfig {
  provider: string;
  model: string;
  temperature?: number;
  maxTokens?: number;
}

export interface ChatNodeData {
  messages: ChatMessage[];
  modelConfig: ModelConfig;
  systemPrompt?: string;
}

export interface SubgraphNodeData {
  subgraphId: string;
  summary: string | null;
  summaryPromptTemplate?: string;
  collapsed: boolean;
}

export interface TemplateChatNodeData {
  template: string;
  output: string | null;
  modelConfig?: ModelConfig;
}

export interface MCPMemoryNodeData {
  query: string;
  result: unknown | null;
}

export interface RouterNodeData {
  condition: string;
  branches: { label: string; targetNodeId?: string }[];
}

export interface TextNodeData {
  content: string;
}

export interface CodeNodeData {
  language: 'python' | 'javascript';
  code: string;
  result: string | null;
}

export type NodeData =
  | ChatNodeData
  | TemplateChatNodeData
  | SubgraphNodeData
  | MCPMemoryNodeData
  | RouterNodeData
  | TextNodeData
  | CodeNodeData;

export interface PinType {
  name: string;
  type: 'text' | 'json' | 'code' | 'image';
}

export interface MCPProvider {
  queryMemory(query: string, options?: MCPSearchOptions): Promise<MCPSearchResult>;
  storeMemory(content: MemoryEntry): Promise<void>;
  listTools(): Promise<MCPTool[]>;
  callTool(toolName: string, args: Record<string, unknown>): Promise<unknown>;
}

export interface MCPSearchOptions {
  limit?: number;
  threshold?: number;
}

export interface MCPSearchResult {
  matches: Array<{ content: string; score: number; metadata?: Record<string, unknown> }>;
}

export interface MemoryEntry {
  content: string;
  metadata?: Record<string, unknown>;
  timestamp?: number;
}

export interface MCPTool {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
}

export interface HandleDef {
  id: string;
  label: string;
  type: 'text' | 'json' | 'code' | 'image';
  allowMultiple: boolean;
}
