import { useState, useCallback, useMemo } from 'react';
import { useReactFlow } from '@xyflow/react';
import { chatStream } from '../../../services/llm';
import type { LLMMessage } from '../../../services/llm';
import { useSettingsStore } from '../../../store/settingsStore';

export interface SummaryNodeData {
  output: string | null;
  messages?: LLMMessage[];
  provider?: string;
  model?: string;
  temperature?: number;
  maxTokens?: number;
  systemPrompt?: string;
  status: 'idle' | 'running' | 'complete' | 'stale';
  lastRunAt?: number;
  warning?: string;
}

function gatherUpstreamChat(
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

  const upstreamData = upstreamNode.data as unknown as { messages?: LLMMessage[]; upstreamMessages?: LLMMessage[]; output?: string };
  const context = [...(upstreamData.upstreamMessages ?? []), ...(upstreamData.messages ?? [])];
  if (context.length > 0) {
    return context;
  }
  if (upstreamData.output) {
    return [{ role: 'assistant' as const, content: upstreamData.output }];
  }
  return [];
}

export function useSummaryNode(id: string, data: SummaryNodeData) {
  const [prompt, setPrompt] = useState('');
  const reactFlow = useReactFlow();
  const settings = useSettingsStore();

  const output = useMemo(() => data.output ?? null, [data.output]);
  const status = data.status ?? 'idle';
  const streaming = status === 'running';
  const provider = data.provider ?? settings.provider;
  const model = data.model ?? settings.model;
  const temperature = data.temperature ?? settings.temperature;
  const maxTokens = data.maxTokens ?? settings.maxTokens;
  const systemPrompt = data.systemPrompt || settings.systemPrompt;

  const updateData = useCallback(
    (partial: Partial<SummaryNodeData>) => {
      reactFlow.updateNodeData(id, partial);
    },
    [reactFlow, id],
  );

  const execute = useCallback(async () => {
    if (streaming) return;

    const chatEdge = reactFlow.getEdges().find(
      (e) => e.target === id && e.targetHandle === 'chat-input',
    );
    if (chatEdge) {
      const upstreamNode = reactFlow.getNodes().find((n) => n.id === chatEdge.source);
      if (upstreamNode) {
        const udata = upstreamNode.data as Record<string, unknown>;
        const hasMessages = Array.isArray(udata.messages) && (udata.messages as unknown[]).length > 0;
        const hasOutput = typeof udata.output === 'string' && udata.output;
        if (!hasMessages && !hasOutput) {
          const label = upstreamNode.type ?? '节点';
          updateData({ warning: `上游 ${label} 未就绪` });
          return;
        }
      }
    }
    updateData({ warning: undefined });

    const upstreamContext = gatherUpstreamChat(id, reactFlow.getEdges, reactFlow.getNodes);

    updateData({ status: 'running', output: null, messages: upstreamContext });

    const summaryPrompt = prompt.trim()
      ? prompt.trim()
      : 'Please provide a concise summary of the above conversation.';

    const messages: LLMMessage[] = [
      ...upstreamContext,
      { role: 'user', content: summaryPrompt },
    ];

    let result = '';

    try {
      for await (const chunk of chatStream({
        messages,
        provider,
        model,
        temperature,
        max_tokens: maxTokens,
        system_prompt: systemPrompt,
      })) {
        result += chunk;
        updateData({ output: result, status: 'running' });
      }
      updateData({ status: 'complete', output: result, lastRunAt: Date.now() });
    } catch (err) {
      const errorContent = `Error: ${err instanceof Error ? err.message : 'Unknown error'}`;
      updateData({ status: 'complete', output: errorContent });
    }
  }, [id, prompt, streaming, provider, model, temperature, maxTokens, systemPrompt, updateData, reactFlow]);

  return {
    output,
    prompt,
    streaming,
    status,
    warning: data.warning,
    lastRunAt: data.lastRunAt,
    provider,
    model,
    temperature,
    maxTokens,
    systemPrompt,
    setPrompt,
    execute,
  };
}
