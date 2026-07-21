import { useCallback, useMemo } from 'react';
import { useReactFlow } from '@xyflow/react';
import { chatStream } from '../../../services/llm';
import type { LLMMessage } from '../../../services/llm';

export interface SubgraphNodeData {
  subgraphId: string;
  summary: string | null;
  collapsed: boolean;
}

function gatherUpstreamForSummary(
  nodeId: string,
  getEdges: ReturnType<typeof useReactFlow>['getEdges'],
  getNodes: ReturnType<typeof useReactFlow>['getNodes'],
): string {
  const inputEdges = getEdges().filter(
    (e) => e.target === nodeId && e.targetHandle === 'input',
  );
  const parts: string[] = [];
  for (const edge of inputEdges) {
    const upstreamNode = getNodes().find((n) => n.id === edge.source);
    if (!upstreamNode) continue;
    const upstreamData = upstreamNode.data as Record<string, unknown>;
    if (typeof upstreamData.output === 'string' && upstreamData.output) {
      parts.push(upstreamData.output);
    }
  }
  return parts.join('\n');
}

export function useSubgraphNode(id: string, data: SubgraphNodeData) {
  const reactFlow = useReactFlow();

  const summary = useMemo(() => data.summary ?? null, [data.summary]);
  const collapsed = data.collapsed ?? true;

  const updateData = useCallback(
    (partial: Partial<SubgraphNodeData>) => {
      reactFlow.updateNodeData(id, partial);
    },
    [reactFlow, id],
  );

  const toggleCollapse = useCallback(() => {
    updateData({ collapsed: !collapsed });
  }, [collapsed, updateData]);

  const generateSummary = useCallback(async () => {
    if (summary) return;

    updateData({ collapsed: true });

    const input = gatherUpstreamForSummary(id, reactFlow.getEdges, reactFlow.getNodes);
    const prompt = input
      ? `Summarize the following context concisely in 1-2 sentences:\n\n${input}`
      : 'No upstream context to summarize.';

    const messages: LLMMessage[] = [{ role: 'user', content: prompt }];

    let result = '';
    try {
      for await (const chunk of chatStream({ messages })) {
        result += chunk;
        updateData({ summary: result, collapsed: true });
      }
    } catch {
      updateData({ summary: input || 'No context available', collapsed: true });
    }
  }, [id, summary, updateData, reactFlow]);

  return {
    summary,
    collapsed,
    toggleCollapse,
    generateSummary,
  };
}
