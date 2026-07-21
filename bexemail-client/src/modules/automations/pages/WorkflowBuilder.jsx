import React, { useState, useCallback, useRef, useMemo, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import {
  ReactFlow,
  ReactFlowProvider,
  addEdge,
  useNodesState,
  useEdgesState,
  Controls,
  MiniMap,
  Background,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

import NodeSidebar from '../components/NodeSidebar';
import ConfigurationPanel from '../components/ConfigurationPanel';
import AutomationHeader from '../components/AutomationHeader';
import AIGenerateModal from '../components/AIGenerateModal';

import TriggerNode from '../components/nodes/TriggerNode';
import SendEmailNode from '../components/nodes/SendEmailNode';
import DelayNode from '../components/nodes/DelayNode';
import IfElseNode from '../components/nodes/IfElseNode';
import ActionNode from '../components/nodes/ActionNode';
import PercentageSplitNode from '../components/nodes/PercentageSplitNode';
import GoalNode from '../components/nodes/GoalNode';
import WebhookNode from '../components/nodes/WebhookNode';
import ABTestNode from '../components/nodes/ABTestNode';
import WaitUntilNode from '../components/nodes/WaitUntilNode';
import ConditionNode from '../components/nodes/ConditionNode';
import WorkflowExampleModal from '../components/WorkflowExampleModal';
import { MousePointer2, Trash2 } from 'lucide-react';

let id = 0;
const getId = () => `dndnode_${id++}`;

const emptyBuilderOptions = { products: [], tags: [], automations: [], lists: [], emailTemplates: [] };

const exampleNodes = [
  { id: 'example_trigger', type: 'triggerNode', position: { x: 340, y: 40 }, data: { label: 'Subscriber joins list' } },
  { id: 'example_welcome', type: 'emailNode', position: { x: 340, y: 180 }, data: { label: 'Send welcome email', subject: 'Welcome! Here is what happens next' } },
  { id: 'example_delay', type: 'delayNode', position: { x: 340, y: 320 }, data: { label: 'Wait 2 days', delayTime: 2, delayUnit: 'days' } },
  { id: 'example_condition', type: 'ifElseNode', position: { x: 340, y: 460 }, data: { label: 'Opened welcome email?', conditionField: 'Tag', operator: 'equals' } },
  { id: 'example_offer', type: 'emailNode', position: { x: 150, y: 640 }, data: { label: 'Send special offer', subject: 'A special offer for you' } },
  { id: 'example_followup', type: 'actionNode', position: { x: 530, y: 640 }, data: { label: 'Add follow-up tag', actionType: 'addTag', tag: 't3' } },
];

const exampleEdges = [
  { id: 'example_e1', source: 'example_trigger', target: 'example_welcome' },
  { id: 'example_e2', source: 'example_welcome', target: 'example_delay' },
  { id: 'example_e3', source: 'example_delay', target: 'example_condition' },
  { id: 'example_e4', source: 'example_condition', sourceHandle: 'yes', target: 'example_offer' },
  { id: 'example_e5', source: 'example_condition', sourceHandle: 'no', target: 'example_followup' },
];

const prepareEdges = (items) => items.map((edge) => ({
  ...edge,
  animated: true,
  selectable: true,
  deletable: true,
  interactionWidth: 24,
  style: { stroke: '#9ca3af', strokeWidth: 2, ...edge.style },
}));

const normalizeWorkflowGraph = (graph) => {
  if (Array.isArray(graph?.nodes)) {
    return { nodes: graph.nodes, edges: Array.isArray(graph.edges) ? graph.edges : [] };
  }

  if (!Array.isArray(graph?.steps)) return { nodes: [], edges: [] };

  const typeMap = {
    trigger: 'triggerNode',
    email: 'emailNode',
    action: 'actionNode',
    delay: 'delayNode',
    condition: 'ifElseNode',
  };
  const legacyNodes = graph.steps.map((step, index) => ({
    id: `legacy_${step.id ?? index}`,
    type: typeMap[step.type] || 'actionNode',
    position: { x: 340, y: 50 + (index * 150) },
    data: {
      ...step,
      label: step.label || step.description || `Step ${index + 1}`,
    },
  }));
  const legacyEdges = legacyNodes.slice(1).map((node, index) => ({
    id: `legacy_edge_${index}`,
    source: legacyNodes[index].id,
    target: node.id,
  }));

  return { nodes: legacyNodes, edges: legacyEdges };
};

const BuilderLayout = () => {
  const { id: automationId } = useParams();
  const navigate = useNavigate();
  const reactFlowWrapper = useRef(null);
  
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [reactFlowInstance, setReactFlowInstance] = useState(null);
  const [selectedNodeId, setSelectedNodeId] = useState(null);
  const [selection, setSelection] = useState({ nodeIds: [], edgeIds: [] });
  const [automationInfo, setAutomationInfo] = useState({
    name: 'Untitled Automation',
    trigger_type: 'custom',
    status: 'draft',
    audience_id: null,
    reentry_policy: { allowReentry: true, cooldownDays: 7, exitTag: '' },
  });
  const [builderOptions, setBuilderOptions] = useState(emptyBuilderOptions);
  const [loading, setLoading] = useState(!!automationId);
  const [showExampleModal, setShowExampleModal] = useState(false);

  useEffect(() => {
    if (automationId) {
      axios.get(`/api/automations/${automationId}`).then(res => {
        setAutomationInfo({
          name: res.data.name,
          trigger_type: res.data.trigger_type || 'custom',
          status: res.data.status || 'draft',
          audience_id: res.data.audience_id || null,
          reentry_policy: {
            allowReentry: true,
            cooldownDays: 7,
            exitTag: '',
            ...(res.data.reentry_policy || {}),
          },
        });
        const graph = res.data.workflow_graph || { nodes: [], edges: [] };
        // Handle parsing graph if it's a string, else it's an object
        const parsedGraph = typeof graph === 'string' ? JSON.parse(graph) : graph;
        const normalizedGraph = normalizeWorkflowGraph(parsedGraph);
        setNodes(normalizedGraph.nodes);
        
        const loadedEdges = prepareEdges(normalizedGraph.edges);
        setEdges(loadedEdges);
        
        setLoading(false);
      }).catch(err => {
        console.error("Error loading workflow", err);
        setLoading(false);
      });
    }
  }, [automationId, setNodes, setEdges]);

  useEffect(() => {
    let active = true;
    axios.get('/api/automations/builder-options')
      .then(({ data }) => {
        if (active && data && typeof data === 'object') {
          setBuilderOptions({ ...emptyBuilderOptions, ...data });
        }
      })
      .catch((error) => console.error('Failed to load database-backed builder options', error));
    return () => { active = false; };
  }, []);

  const onSave = async () => {
    const workflow_graph = { nodes, edges };
    try {
      if (automationId) {
        await axios.put(`/api/automations/${automationId}`, { workflow_graph, ...automationInfo });
        return automationId;
      } else {
        const res = await axios.post(`/api/automations`, { workflow_graph, ...automationInfo });
        navigate(`/automations/builder/${res.data.id}`);
        return res.data.id;
      }
    } catch (error) {
      console.error('Error saving workflow', error);
      throw error;
    }
  };

  const nodeTypes = useMemo(() => ({
    triggerNode: TriggerNode,
    emailNode: SendEmailNode,
    delayNode: DelayNode,
    ifElseNode: IfElseNode,
    actionNode: ActionNode,
    splitNode: PercentageSplitNode,
    goalNode: GoalNode,
    webhookNode: WebhookNode,
    abTestNode: ABTestNode,
    waitUntilNode: WaitUntilNode,
    conditionNode: ConditionNode,
  }), []);

  const onConnect = useCallback(
    (params) => setEdges((eds) => addEdge(prepareEdges([params])[0], eds)),
    [setEdges]
  );

  const onDragOver = useCallback((event) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  const onDrop = useCallback(
    (event) => {
      event.preventDefault();
      const type = event.dataTransfer.getData('application/reactflow');
      if (typeof type === 'undefined' || !type) return;

      const position = reactFlowInstance.screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      });

      const newNode = {
        id: getId(),
        type,
        position,
        data: { label: `New ${type.replace('Node', '')}` },
      };

      setNodes((nds) => nds.concat(newNode));
    },
    [reactFlowInstance, setNodes]
  );

  const onNodeClick = useCallback((event, node) => {
    setSelectedNodeId(node.id);
  }, []);

  const onSelectionChange = useCallback(({ nodes: selectedNodes, edges: selectedEdges }) => {
    setSelection({
      nodeIds: selectedNodes.map((node) => node.id),
      edgeIds: selectedEdges.map((edge) => edge.id),
    });
    setSelectedNodeId(selectedNodes[0]?.id || null);
  }, []);

  const removeElements = useCallback((nodeIds = [], edgeIds = []) => {
    const nodeIdSet = new Set(nodeIds);
    const edgeIdSet = new Set(edgeIds);

    setEdges((currentEdges) => currentEdges.filter((edge) => (
      !edgeIdSet.has(edge.id)
      && !nodeIdSet.has(edge.source)
      && !nodeIdSet.has(edge.target)
    )));
    setNodes((currentNodes) => currentNodes.filter((node) => !nodeIdSet.has(node.id)));
    setSelectedNodeId(null);
    setSelection({ nodeIds: [], edgeIds: [] });
  }, [setEdges, setNodes]);

  const deleteSelectedElements = useCallback(() => {
    removeElements(selection.nodeIds, selection.edgeIds);
  }, [removeElements, selection]);

  const updateNodeData = useCallback((nodeId, newData) => {
    setNodes((nds) =>
      nds.map((node) => {
        if (node.id === nodeId) {
          return {
            ...node,
            data: { ...node.data, ...newData },
          };
        }
        return node;
      })
    );
  }, [setNodes]);

  const selectedNode = nodes.find((node) => node.id === selectedNodeId);

  const [showAIModal, setShowAIModal] = useState(false);

  const handleUseExample = useCallback(() => {
    if (nodes.length > 0 && !window.confirm('Replace the current canvas with the example workflow? Unsaved canvas changes will be removed.')) {
      return false;
    }

    setNodes(exampleNodes.map((node) => ({ ...node, data: { ...node.data } })));
    setEdges(prepareEdges(exampleEdges));
    setSelectedNodeId(null);
    setSelection({ nodeIds: [], edgeIds: [] });
    setAutomationInfo((current) => ({
      ...current,
      trigger_type: current.trigger_type || 'subscriber_joins_list',
    }));
    window.setTimeout(() => reactFlowInstance?.fitView({ padding: 0.16, duration: 450 }), 0);
    return true;
  }, [nodes.length, reactFlowInstance, setEdges, setNodes]);

  const handleAIGenerate = async (prompt) => {
    const { data } = await axios.post('/api/automations/ai-generate', { prompt });
    const graph = data.workflow_graph || { nodes: [], edges: [] };
    setNodes(Array.isArray(graph.nodes) ? graph.nodes : []);
    setEdges(prepareEdges(Array.isArray(graph.edges) ? graph.edges : []));
    setSelection({ nodeIds: [], edgeIds: [] });
    setSelectedNodeId(null);
    setAutomationInfo((current) => ({ ...current, name: data.name || 'Generated Automation' }));
    window.setTimeout(() => reactFlowInstance?.fitView({ padding: 0.18, duration: 450 }), 0);
  };

  if (loading) {
    return <div className="flex h-screen items-center justify-center">Loading automation...</div>;
  }

  return (
    <div className="flex flex-col h-screen w-full bg-gray-50">
      <AIGenerateModal 
        isOpen={showAIModal}
        onClose={() => setShowAIModal(false)}
        onGenerate={handleAIGenerate}
      />
      <WorkflowExampleModal
        isOpen={showExampleModal}
        onClose={() => setShowExampleModal(false)}
        onUseExample={handleUseExample}
      />
      <AutomationHeader 
        nodes={nodes} 
        edges={edges} 
        automationInfo={automationInfo}
        setAutomationInfo={setAutomationInfo}
        onSave={onSave}
        onAIGenerateClick={() => setShowAIModal(true)}
        onExampleClick={() => setShowExampleModal(true)}
      />

      <div className="flex h-[calc(100vh-73px)] w-full">
        <NodeSidebar />
        
        <div className="flex-grow h-full relative" ref={reactFlowWrapper}>
          <div className="absolute left-4 top-4 z-20 flex items-center gap-2 rounded-xl border border-gray-200 bg-white/95 p-2 shadow-md backdrop-blur">
            <button
              type="button"
              onClick={deleteSelectedElements}
              disabled={selection.nodeIds.length + selection.edgeIds.length === 0}
              className="flex items-center gap-1.5 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm font-semibold text-red-700 transition hover:bg-red-100 disabled:cursor-not-allowed disabled:border-gray-200 disabled:bg-gray-50 disabled:text-gray-400"
              title="Delete selected nodes or lines"
            >
              <Trash2 size={16} /> Delete selected
              {selection.nodeIds.length + selection.edgeIds.length > 0 && ` (${selection.nodeIds.length + selection.edgeIds.length})`}
            </button>
            <span className="hidden items-center gap-1 text-xs text-gray-500 xl:flex">
              <MousePointer2 size={14} /> Select a node or line · Delete/Backspace
            </span>
          </div>
          <ReactFlow
            nodes={nodes}
            edges={edges}
            nodeTypes={nodeTypes}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onInit={setReactFlowInstance}
            onDrop={onDrop}
            onDragOver={onDragOver}
            onNodeClick={onNodeClick}
            onSelectionChange={onSelectionChange}
            onPaneClick={() => {
              setSelectedNodeId(null);
              setSelection({ nodeIds: [], edgeIds: [] });
            }}
            onNodesDelete={(deletedNodes) => {
              if (deletedNodes.some((node) => node.id === selectedNodeId)) setSelectedNodeId(null);
            }}
            deleteKeyCode={['Backspace', 'Delete']}
            defaultEdgeOptions={{ selectable: true, deletable: true, interactionWidth: 24 }}
            fitView
          >
            <Background color="#ccc" gap={16} />
            <Controls />
            <MiniMap nodeStrokeColor={() => '#2563eb'} nodeColor={() => '#fff'} />
          </ReactFlow>
        </div>
        
        <ConfigurationPanel 
          selectedNode={selectedNode} 
          updateNodeData={updateNodeData}
          onDeleteNode={() => removeElements([selectedNode.id], [])}
          automationId={automationId}
          automationInfo={automationInfo}
          setAutomationInfo={setAutomationInfo}
          builderOptions={builderOptions}
        />
      </div>
    </div>
  );
};

export default function WorkflowBuilder() {
  return (
    <ReactFlowProvider>
      <BuilderLayout />
    </ReactFlowProvider>
  );
}
