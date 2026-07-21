import { useCallback, useEffect, useState, useRef } from 'react';
import {
  ReactFlow,
  Background,
  BackgroundVariant,
  Controls,
  MiniMap,
  Panel,
  useNodesState,
  useEdgesState,
  addEdge,
  type Connection,
  type Node,
  type Edge,
  type FinalConnectionState,
  type ReactFlowInstance,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import './Canvas.css';
import { ChatNode } from './nodes/ChatNode';
import { TextNode } from './nodes/TextNode';
import { TemplateChatNode } from './nodes/TemplateChat';
import { SubgraphNode } from './nodes/SubgraphNode';
import { SummaryNode } from './nodes/SummaryNode';
import { restoreScene, scheduleSave } from '../persistence/autoSave';
import { NODE_REGISTRY, findHandleDef } from '../nodes/nodeRegistry';
import { validateConnection, shouldReplaceOnConnect } from '../nodes/connectionValidator';
import { CanvasActionsContext } from './CanvasContext';
import { useSettingsStore } from '../store/settingsStore';
import { SettingsModal } from '../settings/SettingsModal';
import { Topbar } from './Topbar';

const nodeTypes = {
  chat: ChatNode,
  text: TextNode,
  templatechat: TemplateChatNode,
  subgraph: SubgraphNode,
  summary: SummaryNode,
};

interface PendingConnection {
  sourceNodeId: string;
  sourceHandleId: string | null;
  clientPosition: { x: number; y: number };
}

let nodeIdCounter = 1;
function nextId() {
  return `node_${Date.now()}_${nodeIdCounter++}`;
}

export function Canvas() {
  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);
  const [viewport, setViewport] = useState({ x: 0, y: 0, zoom: 1 });

  const [menu, setMenu] = useState<{ x: number; y: number } | null>(null);
  const [fileMenuOpen, setFileMenuOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const pendingConnection = useRef<PendingConnection | null>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const rfInstance = useRef<ReactFlowInstance | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const settingsStore = useSettingsStore();

  useEffect(() => {
    restoreScene().then((scene) => {
      if (scene) {
        setNodes(scene.nodes);
        setEdges(scene.edges);
        setViewport(scene.viewport);
      } else {
        setNodes([createNode('chat', { x: 300, y: 200 })]);
      }
    });
    settingsStore.loadSettings();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    scheduleSave(nodes, edges, viewport);
  }, [nodes, edges, viewport]);

  const screenToFlowPos = useCallback((clientX: number, clientY: number) => {
    if (rfInstance.current) {
      return rfInstance.current.screenToFlowPosition({ x: clientX, y: clientY });
    }
    return { x: clientX, y: clientY };
  }, []);

  const addNodeWithEdge = useCallback(
    (nodeType: string) => {
      const pending = pendingConnection.current;
      if (!pending) return;

      const flowPos = screenToFlowPos(pending.clientPosition.x, pending.clientPosition.y);
      const newNode = createNode(nodeType, flowPos);

      setNodes((nds) => [...nds, newNode]);

      if (pending.sourceHandleId) {
        const flow = rfInstance.current;
        const allNodes = flow?.getNodes();
        const sourceNode = allNodes?.find((n) => n.id === pending.sourceNodeId);
        const sourceHandle = findHandleDef(sourceNode?.type, pending.sourceHandleId, 'source');

        if (sourceHandle) {
          const targetDef = NODE_REGISTRY[nodeType];
          const matchingTarget = targetDef?.targets.find((h) => h.type === sourceHandle.type);

          if (matchingTarget) {
            setEdges((eds) =>
              addEdge(
                {
                  source: pending.sourceNodeId,
                  sourceHandle: pending.sourceHandleId,
                  target: newNode.id,
                  targetHandle: matchingTarget.id,
                  id: `edge_${Date.now()}`,
                },
                eds,
              ),
            );
          }
        }
      }

      pendingConnection.current = null;
      setMenu(null);
    },
    [setNodes, setEdges, screenToFlowPos],
  );

  const addNodeAtPosition = useCallback(
    (nodeType: string, clientX: number, clientY: number) => {
      const flowPos = screenToFlowPos(clientX, clientY);
      setNodes((nds) => [...nds, createNode(nodeType, flowPos)]);
      pendingConnection.current = null;
      setMenu(null);
    },
    [setNodes, screenToFlowPos],
  );

  const handleClearCanvas = useCallback(() => {
    setNodes([]);
    setEdges([]);
    setFileMenuOpen(false);
  }, [setNodes, setEdges]);

  const handleExportMG = useCallback(() => {
    const data = { version: 1, nodes, edges, viewport };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'openmindgraph-scene.mg';
    a.click();
    URL.revokeObjectURL(url);
    setFileMenuOpen(false);
  }, [nodes, edges, viewport]);

  const handleImportMG = useCallback(() => {
    setFileMenuOpen(false);
    fileInputRef.current?.click();
  }, []);

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const data = JSON.parse(event.target?.result as string);
          if (!data.nodes || !Array.isArray(data.nodes)) throw new Error('Invalid .mg file: missing nodes');
          if (!data.edges || !Array.isArray(data.edges)) throw new Error('Invalid .mg file: missing edges');

          setNodes([]);
          setEdges([]);
          setTimeout(() => {
            setNodes(data.nodes);
            setEdges(data.edges);
            if (data.viewport) setViewport(data.viewport);
          }, 0);
        } catch (err) {
          console.error('Import failed:', err);
        }
      };
      reader.readAsText(file);

      e.target.value = '';
    },
    [setNodes, setEdges],
  );

  const onConnect = useCallback(
    (connection: Connection) => {
      const flow = rfInstance.current;
      const allNodes = flow?.getNodes();

      setEdges((eds) => {
        let filtered = eds;

        if (allNodes) {
          const targetNode = allNodes.find((n) => n.id === connection.target);
          if (
            connection.targetHandle &&
            shouldReplaceOnConnect(targetNode?.type, connection.targetHandle, 'target')
          ) {
            filtered = filtered.filter(
              (e) => !(e.target === connection.target && e.targetHandle === connection.targetHandle),
            );
          }

          const sourceNode = allNodes.find((n) => n.id === connection.source);
          if (
            connection.sourceHandle &&
            shouldReplaceOnConnect(sourceNode?.type, connection.sourceHandle, 'source')
          ) {
            filtered = filtered.filter(
              (e) => !(e.source === connection.source && e.sourceHandle === connection.sourceHandle),
            );
          }
        }

        return addEdge(connection, filtered);
      });
    },
    [setEdges],
  );

  const isValidConnection = useCallback(
    (connection: Connection | Edge) => {
      if (!connection.sourceHandle || !connection.targetHandle) return false;
      const flow = rfInstance.current;
      if (!flow) return false;
      const allNodes = flow.getNodes();
      const sourceNode = allNodes.find((n) => n.id === connection.source);
      const targetNode = allNodes.find((n) => n.id === connection.target);
      return validateConnection(connection, sourceNode?.type, targetNode?.type);
    },
    [],
  );

  const onConnectEnd = useCallback(
    (_event: MouseEvent | TouchEvent, connectionState: FinalConnectionState) => {
      if (!connectionState.isValid && connectionState.fromHandle) {
        const event = _event as MouseEvent;
        pendingConnection.current = {
          sourceNodeId: connectionState.fromNode.id,
          sourceHandleId: connectionState.fromHandle.id ?? null,
          clientPosition: { x: event.clientX, y: event.clientY },
        };
        setMenu({ x: event.clientX, y: event.clientY });
      }
    },
    [],
  );

  const onMoveEnd = useCallback(
    (_event: unknown, vp: { x: number; y: number; zoom: number }) => {
      setViewport(vp);
    },
    [],
  );

  const onContextMenu = useCallback((event: React.MouseEvent) => {
    event.preventDefault();
    const target = event.target as HTMLElement;
    if (!target.closest('.react-flow__node') && !target.closest('.omg-topbar')) {
      pendingConnection.current = null;
      setMenu({ x: event.clientX, y: event.clientY });
    }
  }, []);

  const onPaneClick = useCallback(() => {
    setMenu(null);
    pendingConnection.current = null;
  }, []);

  const createTextNodeFromSource = useCallback(
    (sourceNodeId: string, sourceHandleId: string) => {
      const flow = rfInstance.current;
      const sourceNode = flow?.getNode(sourceNodeId);
      if (!sourceNode) return;

      const sourceData = sourceNode.data as Record<string, unknown>;
      const output =
        (typeof sourceData.output === 'string' && sourceData.output) ||
        (typeof sourceData.summary === 'string' && sourceData.summary) ||
        (typeof sourceData.content === 'string' && sourceData.content) ||
        '';

      const textDef = NODE_REGISTRY.text;
      const newNode = createNode('text', {
        x: sourceNode.position.x + (sourceNode.width ?? textDef.width) + 60,
        y: sourceNode.position.y,
      });
      newNode.data = { content: output, output };

      setNodes((nds) => [...nds, newNode]);

      const sourceHandle = findHandleDef(sourceNode.type, sourceHandleId, 'source');
      const matchingTarget = textDef?.targets.find((h) => h.type === (sourceHandle?.type ?? ''));

      if (matchingTarget) {
        setEdges((eds) =>
          addEdge(
            {
              source: sourceNodeId,
              sourceHandle: sourceHandleId,
              target: newNode.id,
              targetHandle: matchingTarget.id,
              id: `edge_${Date.now()}`,
            },
            eds,
          ),
        );
      }
    },
    [setNodes, setEdges],
  );

  const menuEntries = Object.values(NODE_REGISTRY);

  return (
    <CanvasActionsContext.Provider value={{ createTextNodeFromSource }}>
      <div ref={wrapperRef} style={{ width: '100%', height: '100%' }} onContextMenu={onContextMenu}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        isValidConnection={isValidConnection}
        onConnectEnd={onConnectEnd}
        onMoveEnd={onMoveEnd}
        onPaneClick={onPaneClick}
        nodeTypes={nodeTypes}
        onInit={(instance) => { rfInstance.current = instance; }}
        defaultViewport={viewport}
        snapToGrid
        snapGrid={[20, 20]}
        deleteKeyCode={['Backspace', 'Delete']}
        fitView
      >
        <Background variant={BackgroundVariant.Dots} color="#d1d5db" gap={20} size={1.5} />
        <Controls />
        <MiniMap />

        <Panel position="top-left" className="omg-topbar">
          <Topbar
            fileMenuOpen={fileMenuOpen}
            setFileMenuOpen={setFileMenuOpen}
            setSettingsOpen={setSettingsOpen}
            onClearCanvas={handleClearCanvas}
            onImportMG={handleImportMG}
            onExportMG={handleExportMG}
          />
        </Panel>

        <Panel position="top-center">
          <div className="omg-breadcrumb">
            <span className="omg-breadcrumb-item active">Root</span>
          </div>
        </Panel>
      </ReactFlow>

      {menu && (
        <div className="canvas-context-menu" style={{ left: menu.x, top: menu.y }}>
          {menuEntries.map((def) => (
            <button
              key={def.type}
              onClick={() =>
                pendingConnection.current
                  ? addNodeWithEdge(def.type)
                  : addNodeAtPosition(def.type, menu.x, menu.y)
              }
            >
              + {def.label}
            </button>
          ))}
        </div>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept=".mg"
        style={{ display: 'none' }}
        onChange={handleFileChange}
      />

      {settingsOpen && <SettingsModal onClose={() => setSettingsOpen(false)} />}

    </div>
    </CanvasActionsContext.Provider>
  );
}

function createNode(type: string, position: { x: number; y: number }): Node {
  const def = NODE_REGISTRY[type];
  return {
    id: nextId(),
    type,
    position,
    data: def ? { ...def.defaultData } : {},
  };
}
