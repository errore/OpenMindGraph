import { ReactFlow, Background, Controls, MiniMap } from '@xyflow/react';
import type { Node } from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { useSceneStore } from '../store/sceneStore';

const initialNodes: Node[] = [
  {
    id: 'hello',
    type: 'default',
    position: { x: 300, y: 200 },
    data: { label: 'Hello, OpenMindGraph!' },
  },
];

export function Canvas() {
  const nodes = useSceneStore((s) => s.nodes);
  const displayNodes = nodes.length > 0 ? nodes : initialNodes;

  return (
    <div style={{ width: '100vw', height: '100vh' }}>
      <ReactFlow nodes={displayNodes}>
        <Background />
        <Controls />
        <MiniMap />
      </ReactFlow>
    </div>
  );
}
