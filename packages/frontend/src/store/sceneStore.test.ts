import { describe, it, expect } from 'vitest';
import { useSceneStore } from '../store/sceneStore';

describe('sceneStore', () => {
  it('should start with empty state', () => {
    const { sceneId, nodes, edges } = useSceneStore.getState();
    expect(sceneId).toBeNull();
    expect(nodes).toEqual([]);
    expect(edges).toEqual([]);
  });

  it('should update nodes', () => {
    const node = { id: 'test', type: 'default', position: { x: 0, y: 0 }, data: {} };
    useSceneStore.getState().setNodes([node]);
    expect(useSceneStore.getState().nodes).toEqual([node]);
  });
});
