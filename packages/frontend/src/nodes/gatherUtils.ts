import { useReactFlow } from '@xyflow/react';
import type { LLMMessage } from '../services/llm';

export function gatherUpstreamChat(
  nodeId: string,
  getEdges: ReturnType<typeof useReactFlow>['getEdges'],
  getNodes: ReturnType<typeof useReactFlow>['getNodes'],
): LLMMessage[] {
  const chatEdge = getEdges().find(
    (e) => e.target === nodeId && e.targetHandle === 'chat-input',
  );
  if (!chatEdge) return [];

  const upstreamNode = getNodes().find((n) => n.id === chatEdge.source);
  if (!upstreamNode) return [];

  const upstreamData = upstreamNode.data as unknown as {
    messages?: LLMMessage[];
    upstreamMessages?: LLMMessage[];
    output?: string;
  };
  const context = [
    ...(upstreamData.upstreamMessages ?? []),
    ...(upstreamData.messages ?? []),
  ];
  if (context.length > 0) {
    return context;
  }
  if (upstreamData.output) {
    return [{ role: 'assistant' as const, content: upstreamData.output }];
  }
  return [];
}

export function gatherUpstreamText(
  nodeId: string,
  handleId: string,
  getEdges: ReturnType<typeof useReactFlow>['getEdges'],
  getNodes: ReturnType<typeof useReactFlow>['getNodes'],
): string[] {
  const edges = getEdges().filter(
    (e) => e.target === nodeId && e.targetHandle === handleId,
  );
  if (edges.length === 0) return [];

  const nodes = getNodes();
  const nodeMap = new Map(nodes.map((n) => [n.id, n]));

  const results: string[] = [];
  for (const edge of edges) {
    const upstream = nodeMap.get(edge.source);
    if (!upstream) continue;
    const data = upstream.data as Record<string, unknown>;
    if (typeof data.output === 'string' && data.output) {
      results.push(data.output);
    } else if (typeof data.content === 'string' && data.content) {
      results.push(data.content);
    }
  }
  return results;
}
