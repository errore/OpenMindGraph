import { describe, it, expect, beforeEach } from 'vitest';
import { useSceneStore } from '../store/sceneStore';
import type { Node, Edge } from '@xyflow/react';

function makeNode(overrides: Partial<Node> = {}): Node {
  return {
    id: 'node-1',
    type: 'chat',
    position: { x: 0, y: 0 },
    data: { title: 'Test' },
    ...overrides,
  };
}

function makeEdge(overrides: Partial<Edge> = {}): Edge {
  return {
    id: 'edge-1',
    source: 'node-a',
    target: 'node-b',
    ...overrides,
  };
}

describe('sceneStore', () => {
  beforeEach(() => {
    useSceneStore.setState({ nodes: [], edges: [], sceneId: null, viewport: { x: 0, y: 0, zoom: 1 } });
  });

  it('should start with empty state', () => {
    const { sceneId, nodes, edges } = useSceneStore.getState();
    expect(sceneId).toBeNull();
    expect(nodes).toEqual([]);
    expect(edges).toEqual([]);
  });

  it('should add a node', () => {
    const node = makeNode();
    useSceneStore.getState().addNode(node);
    expect(useSceneStore.getState().nodes).toEqual([node]);
  });

  it('should remove a node and its edges', () => {
    useSceneStore.getState().addNode(makeNode({ id: 'a' }));
    useSceneStore.getState().addNode(makeNode({ id: 'b' }));
    useSceneStore.getState().addEdge(makeEdge({ id: 'e1', source: 'a', target: 'b' }));
    useSceneStore.getState().addEdge(makeEdge({ id: 'e2', source: 'b', target: 'a' }));

    useSceneStore.getState().removeNode('a');
    const { nodes, edges } = useSceneStore.getState();
    expect(nodes).toHaveLength(1);
    expect(nodes[0].id).toBe('b');
    expect(edges).toHaveLength(0);
  });

  it('should update node data', () => {
    useSceneStore.getState().addNode(makeNode({ id: 'a', data: { title: 'Old' } }));
    useSceneStore.getState().updateNodeData('a', { title: 'New', status: 'running' });
    const node = useSceneStore.getState().nodes[0];
    expect(node.data).toEqual({ title: 'New', status: 'running' });
  });

  it('should add and remove an edge', () => {
    useSceneStore.getState().addEdge(makeEdge({ id: 'e1' }));
    expect(useSceneStore.getState().edges).toHaveLength(1);
    useSceneStore.getState().removeEdge('e1');
    expect(useSceneStore.getState().edges).toEqual([]);
  });

  it('should set a full scene', () => {
    const node = makeNode({ id: 'n1' });
    const edge = makeEdge({ id: 'e1' });
    useSceneStore.getState().setScene({
      sceneId: 'scene-1',
      nodes: [node],
      edges: [edge],
      viewport: { x: 100, y: 200, zoom: 0.5 },
    });
    const state = useSceneStore.getState();
    expect(state.sceneId).toBe('scene-1');
    expect(state.nodes).toEqual([node]);
    expect(state.edges).toEqual([edge]);
    expect(state.viewport).toEqual({ x: 100, y: 200, zoom: 0.5 });
  });
});
