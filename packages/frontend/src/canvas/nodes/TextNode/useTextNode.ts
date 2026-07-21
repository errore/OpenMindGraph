import { useCallback, useMemo } from 'react';
import { useReactFlow } from '@xyflow/react';

export interface TextNodeData {
  content: string;
  output?: string;
}

export function useTextNode(id: string, data: TextNodeData) {
  const reactFlow = useReactFlow();

  const content = useMemo(() => data.content ?? '', [data.content]);

  const setContent = useCallback(
    (value: string) => {
      reactFlow.updateNodeData(id, { content: value, output: value });
    },
    [reactFlow, id],
  );

  return { content, setContent };
}
