import { memo, useRef, useCallback, useState } from 'react';
import { type NodeProps, useReactFlow } from '@xyflow/react';
import { IoSettingsSharp } from 'react-icons/io5';
import { BaseNode } from '../../../nodes/BaseNode';
import { NODE_REGISTRY } from '../../../nodes/nodeRegistry';
import { useScrollLock } from '../../../nodes/scrollUtils';
import { useChatNode } from './useChatNode';
import type { ChatNodeData } from './useChatNode';
import { LlmSettingsPopover } from '../../../settings/LlmSettingsPopover';

import './ChatNode.css';

function ChatNodeImpl({ id, data, selected }: NodeProps) {
  const nodeData = data as unknown as ChatNodeData & { _width?: number };
  const width = nodeData._width ?? NODE_REGISTRY.chat.width;
  const { messages, input, streaming, status, warning, provider, model, temperature, maxTokens, systemPrompt, setInput, send, regenerate } = useChatNode(
    id,
    nodeData as unknown as ChatNodeData,
  );

  const [showSettings, setShowSettings] = useState(false);

  const messagesRef = useRef<HTMLDivElement>(null);
  useScrollLock(messagesRef);

  const reactFlow = useReactFlow();

  const handleConvertToText = useCallback(
    (content: string) => {
      const currentNode = reactFlow.getNode(id);
      const textDef = NODE_REGISTRY.text;
      const newNode = {
        id: `node_text_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        type: 'text' as const,
        position: {
          x: (currentNode?.position.x ?? 0) + (width ?? 380) + 60,
          y: (currentNode?.position.y ?? 0),
        },
        data: {
          ...textDef.defaultData,
          content,
          output: content,
        },
      };
      reactFlow.addNodes(newNode);
    },
    [id, reactFlow, width],
  );

  const handleFork = useCallback(
    (index: number) => {
      const forkedMessages = messages.slice(0, index + 1);
      const currentNode = reactFlow.getNode(id);
      const newNodeId = `node_chat_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
      const chatDef = NODE_REGISTRY.chat;
      const newNode = {
        id: newNodeId,
        type: 'chat' as const,
        position: {
          x: (currentNode?.position.x ?? 0) + (width ?? 380) + 60,
          y: (currentNode?.position.y ?? 0),
        },
        data: {
          ...chatDef.defaultData,
          title: `Fork: ${chatDef.defaultData.title}`,
          messages: forkedMessages,
        },
      };
      reactFlow.addNodes(newNode);
    },
    [id, messages, reactFlow, width],
  );

  const handleRevert = useCallback(
    (index: number) => {
      const currentMessages = (reactFlow.getNode(id)?.data.messages as unknown[]) ?? [];
      const userIdx = index - 1;
      if (userIdx >= 0) {
        const userMsg = currentMessages[userIdx] as { content?: string } | undefined;
        if (userMsg?.content) setInput(userMsg.content);
        reactFlow.updateNodeData(id, { messages: currentMessages.slice(0, userIdx) });
      }
    },
    [id, reactFlow, setInput],
  );

  const handleCopy = useCallback((content: string) => {
    navigator.clipboard.writeText(content).catch(() => {
      // fallback ignored
    });
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  };

  const statusClass = streaming ? 'running' : status === 'stale' ? 'stale' : '';

  const toolbarNode = streaming ? (
    <button className="btn-stop" onClick={() => {}}>
      Running...
    </button>
  ) : (
    <div style={{ display: 'flex', gap: 4 }}>
      <button className="btn-run" onClick={() => send()} disabled={!input.trim()}>
        Run
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

  return (
    <>
      <BaseNode
        selected={selected}
        registryDef={NODE_REGISTRY.chat}
        width={width}
        className={statusClass}
        nodeId={id}
        toolbar={toolbarNode}
        headerLeft={nodeData.title ?? 'Chat'}
        headerRight={<span className={`omg-node-status ${statusClass}`} />}
        footer={
          <div className="chat-input-wrap nodrag">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Type a message..."
              disabled={streaming}
            />
          </div>
        }
        warning={warning}
      >
        <div ref={messagesRef} className="chat-node-messages omg-scroll-container">
          {messages.map((msg, i) => {
            const isLast = i === messages.length - 1;
            const isAssistant = msg.role === 'assistant';
            return (
              <div key={i} className="chat-bubble-wrap">
                <div className={`chat-bubble ${msg.role}`}>
                  {msg.content}
                </div>
                {isAssistant && (
                  <div className="chat-actions nodrag">
                    {msg.content && (
                      <button
                        className="chat-action-btn"
                        title="Convert to TextNode"
                        onClick={() => handleConvertToText(msg.content)}
                      >
                        TextNode
                      </button>
                    )}
                    <button
                      className="chat-action-btn"
                      title="Fork"
                      onClick={() => handleFork(i)}
                    >
                      Fork
                    </button>
                    <button
                      className="chat-action-btn"
                      title="Copy"
                      onClick={() => handleCopy(msg.content)}
                    >
                      Copy
                    </button>
                    {isLast && (
                      <button
                        className="chat-action-btn"
                        title="Redo"
                        onClick={() => regenerate()}
                        disabled={streaming}
                      >
                        Redo
                      </button>
                    )}
                    <button
                      className="chat-action-btn"
                      title="Revert"
                      onClick={() => handleRevert(i)}
                    >
                      Revert
                    </button>
                  </div>
                )}
              </div>
            );
          })}
          {messages.length === 0 && (
            <div className="chat-bubble placeholder">Type a message and press Run</div>
          )}
        </div>
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

export const ChatNode = memo(ChatNodeImpl);
