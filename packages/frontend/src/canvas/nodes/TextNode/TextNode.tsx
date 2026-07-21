import { memo, useCallback, useEffect, useRef } from 'react';
import type { NodeProps } from '@xyflow/react';
import { BaseNode } from '../../../nodes/BaseNode';
import { NODE_REGISTRY } from '../../../nodes/nodeRegistry';
import { useScrollLock } from '../../../nodes/scrollUtils';
import { useTextNode } from './useTextNode';
import type { TextNodeData } from './useTextNode';

import './TextNode.css';

const MAX_HEIGHT = 300;

function TextNodeImpl({ id, data, selected }: NodeProps) {
  const nodeData = data as unknown as TextNodeData;
  const { content, setContent } = useTextNode(id, nodeData);

  const areaRef = useRef<HTMLTextAreaElement>(null);
  useScrollLock(areaRef);

  useEffect(() => {
    const textarea = areaRef.current;
    if (!textarea) return;
    textarea.style.height = 'auto';
    textarea.style.height = `${Math.min(textarea.scrollHeight, MAX_HEIGHT)}px`;
  }, [content]);

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      setContent(e.target.value);
    },
    [setContent],
  );

  return (
    <BaseNode
      selected={selected}
      registryDef={NODE_REGISTRY.text}
      className="text-node"
      headerLeft="Text"
      nodeId={id}
    >
      <textarea
        ref={areaRef}
        className="text-node-area omg-scroll-container nodrag"
        value={content}
        onChange={handleChange}
        placeholder="Enter notes or context..."
      />
    </BaseNode>
  );
}

export const TextNode = memo(TextNodeImpl);
