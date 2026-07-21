import { memo, useRef, useCallback, useState } from 'react';
import type { NodeProps } from '@xyflow/react';
import { useReactFlow } from '@xyflow/react';
import { IoSettingsSharp } from 'react-icons/io5';
import { BaseNode } from '../../../nodes/BaseNode';
import { NODE_REGISTRY } from '../../../nodes/nodeRegistry';
import { useScrollLock } from '../../../nodes/scrollUtils';
import { useTemplateChatNode } from './useTemplateChatNode';
import type { TemplateChatNodeData } from './useTemplateChatNode';
import { LlmSettingsPopover } from '../../../settings/LlmSettingsPopover';

import './TemplateChatNode.css';

function TemplateChatNodeImpl({ id, data, selected }: NodeProps) {
  const nodeData = data as unknown as TemplateChatNodeData;
  const {
    template, output, streaming, status, warning,
    dynamicTargets, provider, model, temperature, maxTokens, systemPrompt,
    setTemplate, execute,
  } = useTemplateChatNode(id, nodeData);

  const [showSettings, setShowSettings] = useState(false);

  const statusClass = streaming ? 'running' : status === 'stale' ? 'stale' : '';

  const areaRef = useRef<HTMLTextAreaElement>(null);
  const outputRef = useRef<HTMLDivElement>(null);
  useScrollLock(areaRef);
  useScrollLock(outputRef);

  const reactFlow = useReactFlow();

  const handleSettingsChange = useCallback(
    (values: { provider?: string; model?: string; temperature?: number; maxTokens?: number; systemPrompt?: string }) => {
      reactFlow.updateNodeData(id, values);
    },
    [id, reactFlow],
  );

  const handleSettingsReset = useCallback(() => {
    reactFlow.updateNodeData(id, {
      provider: undefined,
      model: undefined,
      temperature: undefined,
      maxTokens: undefined,
      systemPrompt: undefined,
    });
  }, [id, reactFlow]);

  const toolbarNode = (
    <div style={{ display: 'flex', gap: 4 }}>
      <button
        className="tc-btn-run"
        onClick={execute}
        disabled={streaming || !template.trim()}
      >
        {streaming ? 'Running...' : 'Run'}
      </button>
      <button
        className="btn-settings-gear"
        onClick={() => setShowSettings((v) => !v)}
        title="LLM Settings"
      >
        <IoSettingsSharp size={14} />
      </button>
    </div>
  );

  return (
    <>
      <BaseNode
        selected={selected}
        registryDef={NODE_REGISTRY.templatechat}
        className={statusClass}
        toolbar={toolbarNode}
        headerLeft="Template Chat"
        headerRight={<span className={`omg-node-status ${statusClass}`} />}
        dynamicTargets={dynamicTargets}
        warning={warning}
        nodeId={id}
      >
        <textarea
          ref={areaRef}
          className="tc-template-area nodrag omg-scroll-container"
          value={template}
          onChange={(e) => setTemplate(e.target.value)}
          placeholder={'Enter template with {{variables}}...\n\nExample: Summarize {{topic}} for {{audience}}'}
          disabled={streaming}
        />

        {output && (
          <div className="tc-output">
            <div className="tc-output-label">Output</div>
            <div ref={outputRef} className="tc-output-content omg-scroll-container">{output}</div>
          </div>
        )}
      </BaseNode>
      {showSettings && (
        <LlmSettingsPopover
          provider={provider}
          model={model}
          temperature={temperature}
          maxTokens={maxTokens}
          systemPrompt={systemPrompt}
          onChange={handleSettingsChange}
          onReset={handleSettingsReset}
          onClose={() => setShowSettings(false)}
        />
      )}
    </>
  );
}

export const TemplateChatNode = memo(TemplateChatNodeImpl);
