import type { Connection, Edge } from '@xyflow/react';
import { findHandleDef } from './nodeRegistry';

export function validateConnection(
  connection: Connection | Edge,
  sourceNodeType: string | undefined,
  targetNodeType: string | undefined,
): boolean {
  if (!connection.sourceHandle || !connection.targetHandle) return false;
  if (!sourceNodeType || !targetNodeType) return false;

  const sourceHandle = findHandleDef(sourceNodeType, connection.sourceHandle, 'source');
  const targetHandle = findHandleDef(targetNodeType, connection.targetHandle, 'target');

  const sourceType = sourceHandle?.type ?? 'text';
  const targetType = targetHandle?.type ?? 'text';
  return sourceType === targetType;
}

export function shouldReplaceOnConnect(
  nodeType: string | undefined,
  handleId: string,
  direction: 'source' | 'target',
): boolean {
  const handle = findHandleDef(nodeType, handleId, direction);
  return handle ? !handle.allowMultiple : true;
}
