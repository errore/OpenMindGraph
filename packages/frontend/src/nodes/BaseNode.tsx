import { type ReactNode, useMemo, useContext, useCallback } from 'react';
import { Handle, Position, NodeToolbar, useStore } from '@xyflow/react';
import { getPinStyle } from './pinStyles';
import type { NodeDef } from './nodeRegistry';
import type { HandleDef } from '@openmindgraph/core';
import { CanvasActionsContext } from '../canvas/CanvasContext';

import './BaseNode.css';

interface BaseNodeProps {
  selected: boolean;
  registryDef: NodeDef;
  width?: number;
  className?: string;
  toolbar?: ReactNode;
  headerLeft?: ReactNode;
  headerRight?: ReactNode;
  footer?: ReactNode;
  dynamicTargets?: HandleDef[];
  dynamicSources?: HandleDef[];
  warning?: string;
  nodeId?: string;
  children: ReactNode;
}

function calcHandlePosition(index: number, total: number): string {
  if (total <= 1) return '50%';
  const step = 60 / (total - 1);
  return `${20 + index * step}%`;
}

export function BaseNode({
  selected,
  registryDef,
  width,
  className,
  toolbar,
  headerLeft,
  headerRight,
  footer,
  dynamicTargets,
  dynamicSources,
  warning,
  nodeId,
  children,
}: BaseNodeProps) {
  const edges = useStore((s) => s.edges);
  const canvasActions = useContext(CanvasActionsContext);
  const nodeWidth = width ?? registryDef.width;
  const targets = dynamicTargets ?? registryDef.targets;
  const sources = dynamicSources ?? registryDef.sources;

  const handleCreateTextNode = useCallback(
    (handleId: string) => {
      if (canvasActions && nodeId) {
        canvasActions.createTextNodeFromSource(nodeId, handleId);
      }
    },
    [canvasActions, nodeId],
  );

  const connectedHandleIds = useMemo(() => {
    if (!nodeId) return new Set<string>();
    const ids = new Set<string>();
    for (const e of edges) {
      if (e.source === nodeId && e.sourceHandle) ids.add(e.sourceHandle);
      if (e.target === nodeId && e.targetHandle) ids.add(e.targetHandle);
    }
    return ids;
  }, [nodeId, edges]);

  return (
    <div
      className={`omg-node ${selected ? 'selected' : ''} ${className ?? ''}`}
      style={{ width: nodeWidth }}
    >
      {toolbar && (
        <NodeToolbar position={Position.Top}>
          {toolbar}
        </NodeToolbar>
      )}

      {(headerLeft || headerRight) && (
        <div className="omg-node-header">
          <span className="omg-node-title">{headerLeft}</span>
          {headerRight && <div className="omg-node-header-right">{headerRight}</div>}
        </div>
      )}

      <div className="omg-node-body">
        {targets.map((handle, i) => (
          <Handle
            key={handle.id}
            type="target"
            position={Position.Left}
            id={handle.id}
            style={{
              top: calcHandlePosition(i, targets.length),
              ...getPinStyle(handle.type, handle.allowMultiple),
            }}
          />
        ))}
        {targets.map((handle, i) =>
          connectedHandleIds.has(handle.id) ? null : (
            <span
              key={`label-${handle.id}`}
              className="omg-pin-label omg-pin-label-left"
              style={{ top: calcHandlePosition(i, targets.length) }}
            >
              {handle.label}
            </span>
          ),
        )}

        {warning && <div className="omg-node-warning">{warning}</div>}

        {children}

        {sources.map((handle, i) => (
          <Handle
            key={handle.id}
            type="source"
            position={Position.Right}
            id={handle.id}
            style={{
              top: calcHandlePosition(i, sources.length),
              ...getPinStyle(handle.type, handle.allowMultiple),
            }}
          />
        ))}
        {sources.map((handle, i) =>
          connectedHandleIds.has(handle.id) ? null : (
            <span
              key={`label-${handle.id}`}
              className="omg-pin-label omg-pin-label-right"
              style={{ top: calcHandlePosition(i, sources.length) }}
            >
              {handle.label}
            </span>
          ),
        )}

        {canvasActions &&
          sources.map(
            (handle, i) =>
              handle.type === 'text' ? (
                <button
                  key={`triangle-${handle.id}`}
                  className="omg-pin-triangle"
                  title="Create TextNode"
                  style={{ top: calcHandlePosition(i, sources.length) }}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleCreateTextNode(handle.id);
                  }}
                >
                  <svg width="8" height="8" viewBox="0 0 8 8">
                    <polygon points="0,0 8,4 0,8" fill="currentColor" />
                  </svg>
                </button>
              ) : null,
          )}
      </div>

      {footer && <div className="omg-node-footer">{footer}</div>}
    </div>
  );
}
