import React, { useCallback, useEffect, useState } from 'react';

import { ReactFlow, useNodesState, useEdgesState } from 'reactflow';

import { Canvas } from './CanvasModel';

import 'reactflow/dist/style.css';

function Canvas() {

  const [nodes, setNodes, onNodesChange] = useNodesState([]);

  const [edges, setEdges, onEdgesChange] = useEdgesState([]);

  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {

    const saved = Canvas.loadFromStorage('default-canvas');

    if (saved) {

      setNodes(saved.nodes || []);

      setEdges(saved.edges || []);

      setSearchTerm(saved.searchTerm || '');

    }

  }, []);

  useEffect(() => {

    const model = new Canvas('default-canvas', 'Canvas');

    model.nodes = nodes;

    model.edges = edges;

    model.searchTerm = searchTerm;

    model.saveToStorage();

  }, [nodes, edges, searchTerm]);

  const addNode = useCallback(() => {

    const newNode = {

      id: `${Date.now()}-${Math.random()}`,

      type: 'default',

      data: { label: `Node ${nodes.length}` },

      position: { x: Math.random() * 400, y: Math.random() * 300 },

    };

    setNodes((nds) => nds.concat(newNode));

  }, [setNodes, nodes.length]);

  const removeNode = useCallback(() => {

    setNodes((nds) => nds.slice(0, -1));

  }, [setNodes]);

  // Filter nodes based on search term
  const filteredNodes = nodes.map((node) => {

    const isVisible = !searchTerm ||

      node.data.label.toLowerCase().includes(searchTerm.toLowerCase());

    return {

      ...node,

      hidden: !isVisible,

      style: {

        ...node.style,

        opacity: searchTerm && !isVisible ? 0.3 : 1,

        border: searchTerm && isVisible ? '2px solid red' : '1px solid #999',

      },

    };

  });

  return (

    <div style={{ width: '100vw', height: '100vh' }}>

      <div style={{ position: 'absolute', zIndex: 10, top: 10, left: 10 }}>

        <input

          type="text"

          placeholder="Search nodes..."

          value={searchTerm}

          onChange={(e) => setSearchTerm(e.target.value)}

          style={{ marginBottom: '10px', width: '200px' }}

        />

        <button onClick={addNode}>Add Node</button>

        <button onClick={removeNode} style={{ marginLeft: '5px' }}>Remove Last Node</button>

      </div>

      <ReactFlow

        nodes={filteredNodes}

        edges={edges}

        onNodesChange={onNodesChange}

        onEdgesChange={onEdgesChange}

fitView

      />

    </div>

  );

}

export default Canvas;