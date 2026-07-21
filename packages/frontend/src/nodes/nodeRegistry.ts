import type { HandleDef } from '@openmindgraph/core';

export interface NodeDef {
  type: string;
  label: string;
  width: number;
  sources: HandleDef[];
  targets: HandleDef[];
  defaultData: Record<string, unknown>;
}

export const NODE_REGISTRY: Record<string, NodeDef> = {
  chat: {
    type: 'chat',
    label: 'ChatNode',
    width: 380,
    sources: [
      { id: 'output', label: 'output', type: 'json', allowMultiple: true },
    ],
    targets: [
      { id: 'input', label: 'prompt', type: 'text', allowMultiple: false },
      { id: 'chat-input', label: 'chat', type: 'json', allowMultiple: false },
    ],
    defaultData: {
      title: 'Chat',
      messages: [],
      status: 'idle',
    },
  },
  text: {
    type: 'text',
    label: 'TextNode',
    width: 380,
    sources: [
      { id: 'output', label: 'text', type: 'text', allowMultiple: true },
    ],
    targets: [],
    defaultData: {
      content: '',
      output: '',
    },
  },
  templatechat: {
    type: 'templatechat',
    label: 'Template Chat',
    width: 380,
    sources: [
      { id: 'output', label: 'text', type: 'text', allowMultiple: true },
      { id: 'chat-output', label: 'chat', type: 'json', allowMultiple: true },
    ],
    targets: [],
    defaultData: {
      template: '',
      output: null,
      status: 'idle',
    },
  },
  subgraph: {
    type: 'subgraph',
    label: 'SubgraphNode',
    width: 380,
    sources: [
      { id: 'output', label: 'summary', type: 'text', allowMultiple: false },
    ],
    targets: [
      { id: 'input', label: 'context', type: 'text', allowMultiple: true },
    ],
    defaultData: {
      subgraphId: '',
      summary: null,
      collapsed: true,
    },
  },
  summary: {
    type: 'summary',
    label: 'Summary',
    width: 380,
    sources: [
      { id: 'output', label: 'text', type: 'text', allowMultiple: true },
    ],
    targets: [
      { id: 'chat-input', label: 'chat', type: 'json', allowMultiple: false },
    ],
    defaultData: {
      output: null,
      status: 'idle',
    },
  },
};

export function findHandleDef(
  nodeType: string | undefined,
  handleId: string,
  direction: 'source' | 'target',
): HandleDef | undefined {
  if (!nodeType) return undefined;
  const def = NODE_REGISTRY[nodeType];
  if (!def) return undefined;
  return direction === 'source'
    ? def.sources.find((h) => h.id === handleId)
    : def.targets.find((h) => h.id === handleId);
}
