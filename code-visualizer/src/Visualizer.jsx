import React, { useState, useEffect } from 'react';
import { ReactFlow, Controls, Background, MarkerType, Handle, Position } from '@xyflow/react';
import '@xyflow/react/dist/style.css';

// 1. Define the Custom Node with Side Handles
const CustomNode = ({ data }) => {
  return (
    <div style={{
      border: data.isActive ? '2px solid #ca8a04' : '1px solid #777',
      padding: '10px',
      borderRadius: '5px',
      background: data.isActive ? '#fef08a' : '#fff',
      width: 250,
      textAlign: 'center',
      fontFamily: 'monospace',
      transition: 'all 0.2s ease'
    }}>
      {/* Top and Bottom handles for the main straight line */}
      <Handle type="target" position={Position.Top} id="top" />
      
      <div>{data.label}</div>
      
      <Handle type="source" position={Position.Bottom} id="bottom" />
      
      {/* Invisible Right handles specifically for routing the curved loop */}
      <Handle type="source" position={Position.Right} id="right-source" style={{ opacity: 0 }} />
      <Handle type="target" position={Position.Right} id="right-target" style={{ opacity: 0 }} />
    </div>
  );
};

// React Flow requires custom node types to be defined outside the main component
const nodeTypes = { custom: CustomNode };

export default function Visualizer() {
  const [code, setCode] = useState(`def is_palindrome(s):
    left = 0
    right = len(s) - 1
    while left < right:
        if s[left] != s[right]:
            return False
        left += 1
        right -= 1
    return True

result = is_palindrome("radar")`);
  const [nodes, setNodes] = useState([]);
  const [edges, setEdges] = useState([]);
  const [trace, setTrace] = useState([]);
  const [currentStep, setCurrentStep] = useState(0);
  const [executionError, setExecutionError] = useState(null);
  const [aiInsight, setAiInsight] = useState('');
  const [overallSummary, setOverallSummary] = useState('');
  
  const handleVisualize = async () => {
    setExecutionError(null);
    setTrace([]);
    setCurrentStep(0);
    setAiInsight('');
    setNodes([]);
    setEdges([]);
    setOverallSummary('');
    try {
      const response = await fetch('http://localhost:8080/api/v1/code/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code }),
      });

      if (!response.ok) throw new Error('Failed to connect to the Python backend');
      
      const data = await response.json();
      setOverallSummary(data.overall_summary || '');
      
      if (data.error) setExecutionError(data.error);

      // 2. Use our 'custom' node type
      // Calculate a branching 2D layout for nested & control-flow structures
      let currentY = 50;
      const formattedNodes = data.graph.nodes.map((node, index) => {
        let posX = 250;

        // Visual branch: shift base case returns to the left, recursive branches to the right
        if (node.data.label.includes('return 1') || node.data.label.includes('return 0')) {
          posX = 120; // Base case branch (left)
        } else if (node.data.label.includes('factorial(') && !node.data.label.startsWith('def') && !node.data.label.startsWith('result')) {
          posX = 380; // Recursive call branch (right)
        }

        const nodeObj = {
          id: node.id,
          type: 'custom',
          position: { x: posX, y: index * 110 + 40 },
          data: { 
            label: node.data.label, 
            explanation: node.data.explanation, 
            line: node.line,
            isActive: false 
          }
        };
        return nodeObj;
      });

      // 3. Route cyclical edges to the right side using a Bezier curve
      const formattedEdges = data.graph.edges.map(edge => {
        const isCycle = edge.id.includes('cycle');
        return {
          ...edge,
          type: isCycle ? 'bezier' : 'smoothstep',
          sourceHandle: isCycle ? 'right-source' : 'bottom',
          targetHandle: isCycle ? 'right-target' : 'top',
          markerEnd: { type: MarkerType.ArrowClosed }
        };
      });

      setNodes(formattedNodes);
      setEdges(formattedEdges);
      setTrace(data.trace || []);
      
    } catch (err) {
      setExecutionError({ type: 'Connection Error', message: err.message });
    }
  };

  useEffect(() => {
    if (trace.length === 0) return;
    
    const currentTraceStep = trace[currentStep];
    if (!currentTraceStep) return;

    setNodes(nds => nds.map(node => {
      const isActive = node.data.line === currentTraceStep.line;
      if (isActive) {
        setAiInsight(node.data.explanation || 'No insight available.');
      }
      return {
        ...node,
        data: { ...node.data, isActive } // Update data instead of style for custom nodes
      };
    }));
  }, [currentStep, trace]);

  const currentMemory = trace[currentStep]?.memorySnapshot || {};

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', fontFamily: 'sans-serif' }}>
      
      {executionError?.message && (
        <div style={{ backgroundColor: '#fef2f2', border: '1px solid #f87171', color: '#991b1b', padding: '12px 20px', margin: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderRadius: '6px' }}>
          <span>⚠️ <strong>{executionError.type || 'Error'}:</strong> {executionError.message}</span>
          <button onClick={() => setExecutionError(null)} style={{ border: 'none', background: 'transparent', cursor: 'pointer', fontWeight: 'bold', color: '#991b1b', fontSize: '16px' }}>✕</button>
        </div>
      )}

      <div style={{ padding: '15px', borderBottom: '1px solid #e2e8f0', display: 'flex', gap: '20px', alignItems: 'center', backgroundColor: '#f8fafc' }}>
        <button onClick={handleVisualize} style={{ padding: '8px 20px', background: '#2563eb', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}>
          Visualize Code
        </button>
        <button onClick={() => setCurrentStep(Math.max(0, currentStep - 1))} disabled={currentStep === 0} style={{ padding: '6px 12px', cursor: currentStep === 0 ? 'not-allowed' : 'pointer' }}>
          ◀ Step Back
        </button>
        <span style={{ fontWeight: '500' }}>
          Step: {trace.length > 0 ? currentStep + 1 : 0} of {trace.length}
        </span>
        <button onClick={() => setCurrentStep(Math.min(trace.length - 1, currentStep + 1))} disabled={currentStep >= trace.length - 1} style={{ padding: '6px 12px', cursor: currentStep >= trace.length - 1 ? 'not-allowed' : 'pointer' }}>
          Step Forward ▶
        </button>
      </div>

      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        
        <div style={{ width: '300px', borderRight: '1px solid #e2e8f0', padding: '15px', display: 'flex', flexDirection: 'column' }}>
          <h3 style={{ marginTop: 0, color: '#334155' }}>Python Code</h3>
          <textarea 
            value={code} 
            onChange={(e) => setCode(e.target.value)}
            spellCheck="false"
            style={{ flex: 1, fontFamily: 'monospace', fontSize: '14px', padding: '12px', resize: 'none', border: '1px solid #cbd5e1', borderRadius: '6px', outline: 'none' }}
          />
        </div>

        <div style={{ flex: 1, position: 'relative' }}>
          <ReactFlow nodes={nodes} edges={edges} nodeTypes={nodeTypes} fitView>
            <Controls />
            <Background color="#cbd5e1" gap={16} />
          </ReactFlow>
        </div>
        
        <div style={{ width: '350px', borderLeft: '1px solid #e2e8f0', padding: '20px', backgroundColor: '#f8fafc', overflowY: 'auto' }}>
          {overallSummary && (
            <div style={{ marginBottom: '20px', padding: '15px', backgroundColor: '#f8fafc', borderRadius: '8px', border: '1px solid #cbd5e1' }}>
              <h4 style={{ margin: '0 0 10px 0', color: '#334155', display: 'flex', alignItems: 'center', gap: '8px' }}>
                📝 Script Overview
              </h4>
              <p style={{ margin: 0, fontSize: '0.9em', color: '#475569', lineHeight: '1.5' }}>
                {overallSummary}
              </p>
            </div>
          )}
          <div style={{ marginBottom: '25px', padding: '15px', backgroundColor: '#eff6ff', borderRadius: '8px', border: '1px solid #bfdbfe' }}>
            <h4 style={{ margin: '0 0 10px 0', color: '#1e3a8a', display: 'flex', alignItems: 'center', gap: '8px' }}>
              🤖 AI Insight
            </h4>
            <p style={{ margin: 0, fontSize: '0.95em', color: '#1e40af', lineHeight: '1.5' }}>
              {aiInsight || 'Click "Visualize Code" and step forward to generate AI context.'}
            </p>
          </div>

          <div>
            <h4 style={{ borderBottom: '2px solid #e2e8f0', paddingBottom: '8px', color: '#334155', marginTop: 0 }}>Live Memory</h4>
            {Object.keys(currentMemory).length === 0 ? (
              <p style={{ color: '#94a3b8', fontSize: '0.9em', fontStyle: 'italic' }}>No variables in memory.</p>
            ) : (
              <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                {Object.entries(currentMemory).map(([key, data]) => (
                  <li key={key} style={{ padding: '12px', margin: '8px 0', backgroundColor: 'white', border: '1px solid #e2e8f0', borderRadius: '6px', display: 'flex', justifyContent: 'space-between', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}>
                    <strong style={{ color: '#0f172a', fontFamily: 'monospace' }}>{key}</strong>
                    <span style={{ 
                      color: data.mutated ? '#16a34a' : '#475569', 
                      fontWeight: data.mutated ? 'bold' : 'normal',
                      fontFamily: 'monospace',
                      backgroundColor: data.mutated ? '#dcfce7' : 'transparent',
                      padding: '2px 6px',
                      borderRadius: '4px'
                    }}>
                      {typeof data.value === 'object' && data.value !== null 
                        ? JSON.stringify(data.value) 
                        : String(data.value)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}