import { memo, useRef, useCallback, useState } from 'react';
import type { NodeProps } from '@xyflow/react';
import { useReactFlow } from '@xyflow/react';
import { IoSettingsSharp } from 'react-icons/io5';
import { BaseNode } from '../../../nodes/BaseNode';
import { NODE_REGISTRY } from '../../../nodes/nodeRegistry';
import { useScrollLock } from '../../../nodes/scrollUtils';
import { useSummaryNode } from './useSummaryNode';
import type { SummaryNodeData } from './useSummaryNode';
import { LlmSettingsPopover } from '../../../settings/LlmSettingsPopover';

import './SummaryNode.css';

function SummaryNodeImpl({ id, data, selected }: NodeProps) {
  const nodeData = data as unknown as SummaryNodeData;
  const {
    output, prompt, streaming, status, warning,
    model, temperature, maxTokens, systemPrompt,
    setPrompt, execute,
  } = useSummaryNode(id, nodeData);

  const [showSettings, setShowSettings] = useState(false);

  const bodyRef = useRef<HTMLDivElement>(null);
  useScrollLock(bodyRef);

  const reactFlow = useReactFlow();

  const handleSettingsChange = useCallback(
    (values: { model?: string; temperature?: number; maxTokens?: number; systemPrompt?: string }) => {
      reactFlow.updateNodeData(id, values);
    },
    [id, reactFlow],
  );

  const handleSettingsReset = useCallback(() => {
    reactFlow.updateNodeData(id, {
      model: undefined,
      temperature: undefined,
      maxTokens: undefined,
      systemPrompt: undefined,
    });
  }, [id, reactFlow]);

  const statusClass = streaming ? 'running' : status === 'stale' ? 'stale' : '';

  const toolbarNode = (
    <div style={{ display: 'flex', gap: 4 }}>
      {streaming ? (
        <button className="smr-btn-stop" onClick={() => {}}>
          Running...
        </button>
      ) : (
        <button className="smr-btn-run" onClick={execute} disabled={streaming}>
          Run
        </button>
      )}
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
        registryDef={NODE_REGISTRY.summary}
        className={statusClass}
        toolbar={toolbarNode}
        headerLeft="Summary"
        headerRight={<span className={`omg-node-status ${statusClass}`} />}
        warning={warning}
        nodeId={id}
        footer={
          <div className="smr-prompt-wrap nodrag">
            <input
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Summary prompt (optional)..."
              disabled={streaming}
            />
          </div>
        }
      >
        <div ref={bodyRef} className="smr-output omg-scroll-container">
          {output ? (
            <div className="smr-output-text">{output}</div>
          ) : (
            <div className="smr-placeholder">
              Connect a chat node and press Run to summarize
            </div>
          )}
        </div>
      </BaseNode>
      {showSettings && (
        <LlmSettingsPopover
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

export const SummaryNode = memo(SummaryNodeImpl);
