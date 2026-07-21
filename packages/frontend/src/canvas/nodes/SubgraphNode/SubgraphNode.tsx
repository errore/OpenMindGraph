import { memo, useEffect } from 'react';
import type { NodeProps } from '@xyflow/react';
import { BaseNode } from '../../../nodes/BaseNode';
import { NODE_REGISTRY } from '../../../nodes/nodeRegistry';
import { useSubgraphNode } from './useSubgraphNode';
import type { SubgraphNodeData } from './useSubgraphNode';

import './SubgraphNode.css';

function SubgraphNodeImpl({ id, data, selected }: NodeProps) {
  const nodeData = data as unknown as SubgraphNodeData;
  const { summary, collapsed, toggleCollapse, generateSummary } = useSubgraphNode(id, nodeData);

  useEffect(() => {
    if (!summary) {
      generateSummary();
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <BaseNode
      selected={selected}
      registryDef={NODE_REGISTRY.subgraph}
      className="subgraph-node"
      headerLeft="Subgraph"
      nodeId={id}
      headerRight={
        <button className="subgraph-toggle-btn" onClick={toggleCollapse}>
          {collapsed ? '+' : '-'}
        </button>
      }
    >
      {summary ? (
        <div className={`subgraph-body ${collapsed ? 'collapsed' : 'expanded'}`}>
          <div className="subgraph-summary">{summary}</div>
          {collapsed && (
            <div className="subgraph-hint">Double-click to expand subgraph</div>
          )}
          {!collapsed && (
            <div className="subgraph-empty">Subgraph canvas (not yet implemented)</div>
          )}
        </div>
      ) : (
        <div className="subgraph-body">
          <div className="subgraph-loading">Generating summary...</div>
        </div>
      )}
    </BaseNode>
  );
}

export const SubgraphNode = memo(SubgraphNodeImpl);
