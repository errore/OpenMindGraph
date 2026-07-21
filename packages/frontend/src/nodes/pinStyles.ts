import type { HandleDef } from '@openmindgraph/core';
import type { CSSProperties } from 'react';

export const DATA_TYPE_COLORS: Record<HandleDef['type'], string> = {
  text: '#22c55e',
  json: '#3b82f6',
  code: '#f59e0b',
  image: '#8b5cf6',
};

export function getPinStyle(dataType: HandleDef['type'], allowMultiple: boolean): CSSProperties {
  const color = DATA_TYPE_COLORS[dataType];
  if (allowMultiple) {
    return {
      width: 8,
      height: 20,
      background: color,
      border: '2px solid #fff',
      borderRadius: 4,
    };
  }
  return {
    width: 12,
    height: 12,
    background: color,
    border: '2px solid #fff',
    borderRadius: '50%',
  };
}
