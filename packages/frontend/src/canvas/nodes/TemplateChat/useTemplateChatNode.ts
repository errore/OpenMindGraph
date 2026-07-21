import { useState, useCallback, useMemo, useEffect } from 'react';
import { useReactFlow } from '@xyflow/react';
import type { HandleDef } from '@openmindgraph/core';
import { chatStream } from '../../../services/llm';
import type { LLMMessage } from '../../../services/llm';
import { useSettingsStore } from '../../../store/settingsStore';
import { gatherUpstreamText } from '../../../nodes/gatherUtils';

export interface TemplateChatNodeData {
  template: string;
  output: string | null;
  messages?: LLMMessage[];
  status: 'idle' | 'running' | 'complete' | 'stale';
  model?: string;
  temperature?: number;
  maxTokens?: number;
  systemPrompt?: string;
  warning?: string;
}

export function parseTemplateVariables(template: string): HandleDef[] {
  const matches = template.match(/\{\{(\w+)\}\}/g);
  if (!matches) return [];
  const seen = new Set<string>();
  const result: HandleDef[] = [];
  for (const m of matches) {
    const name = m.slice(2, -2);
    if (seen.has(name)) continue;
    seen.add(name);
    result.push({
      id: `var-${name}`,
      label: name,
      type: 'text',
      allowMultiple: false,
    });
  }
  return result;
}

const DEFAULT_TEMPLATE = 'Summarize the following:\n\n{{context}}';

export function useTemplateChatNode(id: string, data: TemplateChatNodeData) {
  const [template, setTemplate] = useState(data.template || DEFAULT_TEMPLATE);
  const reactFlow = useReactFlow();
  const settings = useSettingsStore();

  const output = useMemo(() => data.output ?? null, [data.output]);
  const status = data.status ?? 'idle';
  const streaming = status === 'running';
  const model = data.model ?? settings.model;
  const temperature = data.temperature ?? settings.temperature;
  const maxTokens = data.maxTokens ?? settings.maxTokens;
  const systemPrompt = data.systemPrompt || settings.systemPrompt;

  const updateData = useCallback(
    (partial: Partial<TemplateChatNodeData>) => {
      reactFlow.updateNodeData(id, partial);
    },
    [reactFlow, id],
  );

  useEffect(() => {
    if (status === 'running') {
      updateData({ status: 'idle' });
    }
    if (!data.template) {
      updateData({ template: DEFAULT_TEMPLATE });
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const setTemplateAndSave = useCallback(
    (value: string) => {
      setTemplate(value);
      updateData({ template: value, warning: undefined });
    },
    [updateData],
  );

  const dynamicTargets = useMemo(() => [
    { id: 'prompt', label: 'prompt', type: 'text' as const, allowMultiple: false },
    ...parseTemplateVariables(template),
  ], [template]);

  const execute = useCallback(async () => {
    const trimmed = template.trim();
    if (!trimmed || streaming) return;

    const vars = parseTemplateVariables(trimmed);

    const handlesToCheck = [{ id: 'prompt', label: 'prompt' }, ...vars.map(v => ({ id: v.id, label: v.label }))];
    for (const handle of handlesToCheck) {
      const edges = reactFlow.getEdges().filter(
        (e) => e.target === id && e.targetHandle === handle.id,
      );
      for (const edge of edges) {
        const upstreamNode = reactFlow.getNodes().find((n) => n.id === edge.source);
        if (!upstreamNode) continue;
        const udata = upstreamNode.data as Record<string, unknown>;
        const hasMessages = Array.isArray(udata.messages) && (udata.messages as unknown[]).length > 0;
        const hasOutput = typeof udata.output === 'string' && udata.output;
        const hasContent = typeof udata.content === 'string' && udata.content;
        if (!hasMessages && !hasOutput && !hasContent) {
          const label = upstreamNode.type ?? '节点';
          updateData({ warning: `上游 ${label}（${handle.label}）未就绪` });
          return;
        }
      }
    }
    updateData({ warning: undefined });

    updateData({ status: 'running', output: null });

    let filledTemplate = trimmed;

    for (const v of vars) {
      const upstreamTexts = gatherUpstreamText(
        id, v.id, reactFlow.getEdges, reactFlow.getNodes,
      );
      const replacement = upstreamTexts.length > 0
        ? upstreamTexts.join('\n')
        : '';
      filledTemplate = filledTemplate.replace(
        new RegExp(`\\{\\{${v.label}\\}\\}`, 'g'),
        replacement,
      );
    }

    const promptTexts = gatherUpstreamText(id, 'prompt', reactFlow.getEdges, reactFlow.getNodes);
    const promptContext = promptTexts.join('\n');
    const effectiveSystemPrompt = promptContext || systemPrompt;

    const messages: LLMMessage[] = [
      { role: 'user', content: filledTemplate },
    ];

    let result = '';

    try {
      for await (const chunk of chatStream({
        messages,
        model,
        temperature,
        max_tokens: maxTokens,
        system_prompt: effectiveSystemPrompt || undefined,
      })) {
        if (chunk.type === 'delta') result += chunk.content;
        updateData({ output: result, status: 'running' });
      }
      updateData({ status: 'complete', output: result, messages: [{ role: 'user' as const, content: filledTemplate }, { role: 'assistant' as const, content: result }] });
    } catch (err) {
      const errorContent = `Error: ${err instanceof Error ? err.message : 'Unknown error'}`;
      updateData({ status: 'complete', output: errorContent });
    }
  }, [id, template, streaming, model, temperature, maxTokens, systemPrompt, updateData, reactFlow]);

  return {
    template,
    output,
    streaming,
    status,
    warning: data.warning,
    dynamicTargets,
    model,
    temperature,
    maxTokens,
    systemPrompt,
    setTemplate: setTemplateAndSave,
    execute,
  };
}
