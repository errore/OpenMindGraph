import { useState, useCallback, useMemo } from 'react';
import { useReactFlow } from '@xyflow/react';
import { chatStream } from '../../../services/llm';
import type { LLMMessage } from '../../../services/llm';
import { useSettingsStore } from '../../../store/settingsStore';

export interface ChatNodeData {
  title: string;
  messages: LLMMessage[];
  upstreamMessages?: LLMMessage[];
  provider?: string;
  model?: string;
  temperature?: number;
  maxTokens?: number;
  systemPrompt?: string;
  status: 'idle' | 'running' | 'complete' | 'stale';
  lastRunAt?: number;
  warning?: string;
}

function gatherUpstreamChat(nodeId: string, edges: ReturnType<typeof useReactFlow>['getEdges'], nodes: ReturnType<typeof useReactFlow>['getNodes']): LLMMessage[] {
  const chatEdge = edges().find(
    (e) => e.target === nodeId && e.targetHandle === 'chat-input',
  );
  if (!chatEdge) return [];

  const upstreamNode = nodes().find((n) => n.id === chatEdge.source);
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

export function useChatNode(id: string, data: ChatNodeData) {
  const [input, setInput] = useState('');
  const reactFlow = useReactFlow();
  const settings = useSettingsStore();

  const messages = useMemo(() => data.messages ?? [], [data.messages]);
  const provider = data.provider ?? settings.provider;
  const model = data.model ?? settings.model;
  const temperature = data.temperature ?? settings.temperature;
  const maxTokens = data.maxTokens ?? settings.maxTokens;
  const systemPrompt = data.systemPrompt || settings.systemPrompt;
  const status = data.status ?? 'idle';
  const streaming = status === 'running';

  const updateData = useCallback(
    (partial: Partial<ChatNodeData>) => {
      reactFlow.updateNodeData(id, partial);
    },
    [reactFlow, id],
  );

  const checkUpstreamReady = useCallback(() => {
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
          return false;
        }
      }
    }
    updateData({ warning: undefined });
    return true;
  }, [id, updateData, reactFlow]);

  const send = useCallback(
    async (overrideInput?: string) => {
      const text = (overrideInput ?? input).trim();
      if (!text || streaming) return;

      if (!checkUpstreamReady()) return;

      setInput('');

      const userMsg: LLMMessage = { role: 'user', content: text };

      const upstreamContext = gatherUpstreamChat(id, reactFlow.getEdges, reactFlow.getNodes);

      updateData({ status: 'running', upstreamMessages: upstreamContext });

      const assistantMsg: LLMMessage = { role: 'assistant', content: '' };
      const storedMessages = [...messages, userMsg, assistantMsg];
      const llmMessages = [...upstreamContext, ...messages, userMsg];
      updateData({ messages: storedMessages });

      try {
        for await (const chunk of chatStream({
          messages: llmMessages,
          provider,
          model,
          temperature,
          max_tokens: maxTokens,
          system_prompt: systemPrompt,
        })) {
          assistantMsg.content += chunk;
          updateData({ messages: [...messages, userMsg, { ...assistantMsg }] });
        }
        updateData({ status: 'complete', lastRunAt: Date.now() });
      } catch (err) {
        const errorContent = `Error: ${err instanceof Error ? err.message : 'Unknown error'}`;
        updateData({
          status: 'complete',
          lastRunAt: Date.now(),
          messages: [
            ...messages,
            userMsg,
            { role: 'assistant' as const, content: errorContent },
          ],
        });
      }
    },
    [id, input, messages, provider, model, temperature, maxTokens, systemPrompt, updateData, streaming, reactFlow, checkUpstreamReady],
  );

  const regenerate = useCallback(async () => {
    if (streaming) return;
    if (messages.length < 2) return;

    const lastAsstIdx = messages.length - 1;
    if (messages[lastAsstIdx].role !== 'assistant') return;

    const lastUserIdx = lastAsstIdx - 1;
    if (messages[lastUserIdx].role !== 'user') return;

    const keepMessages = messages.slice(0, lastAsstIdx);

    const upstreamContext = gatherUpstreamChat(id, reactFlow.getEdges, reactFlow.getNodes);
    updateData({ status: 'running', upstreamMessages: upstreamContext });

    const assistantMsg: LLMMessage = { role: 'assistant', content: '' };
    updateData({ messages: [...keepMessages, assistantMsg] });

    const llmMessages = [...upstreamContext, ...keepMessages];

    try {
      for await (const chunk of chatStream({
        messages: llmMessages,
        provider,
        model,
        temperature,
        max_tokens: maxTokens,
        system_prompt: systemPrompt,
      })) {
        assistantMsg.content += chunk;
        updateData({ messages: [...keepMessages, { ...assistantMsg }] });
      }
      updateData({ status: 'complete', lastRunAt: Date.now() });
    } catch (err) {
      const errorContent = `Error: ${err instanceof Error ? err.message : 'Unknown error'}`;
      updateData({
        status: 'complete',
        lastRunAt: Date.now(),
        messages: [...keepMessages, { role: 'assistant' as const, content: errorContent }],
      });
    }
  }, [id, messages, provider, model, temperature, maxTokens, systemPrompt, updateData, streaming, reactFlow]);

  return {
    messages,
    input,
    streaming,
    status,
    lastRunAt: data.lastRunAt,
    warning: data.warning,
    provider,
    model,
    temperature,
    maxTokens,
    systemPrompt,
    setInput,
    send,
    regenerate,
  };
}
