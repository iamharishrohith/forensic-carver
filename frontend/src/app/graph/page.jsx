"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useState, useRef } from "react";
import { 
  Network, 
  Plus, 
  User, 
  Phone, 
  Mail, 
  MapPin, 
  Smartphone, 
  CreditCard, 
  Database,
  Info,
  Link as LinkIcon
} from "lucide-react";
import { api } from "@/lib/api";
import "./graph.css";

const NODE_COLORS = {
  Person: "#a78bfa",
  Phone: "#60a5fa",
  Email: "#fbbf24",
  Location: "#34d399",
  Device: "#f472b6",
  CryptoWallet: "#22d3ee",
  BankAccount: "#fb923c"
};

export default function KnowledgeGraph() {
  const searchParams = useSearchParams();
  const caseId = Number(searchParams.get("case_id") || "1");

  const [graphData, setGraphData] = useState({ nodes: [], edges: [] });
  const [loading, setLoading] = useState(true);
  const [selectedNode, setSelectedNode] = useState(null);
  const [hoveredNode, setHoveredNode] = useState(null);
  
  const [showAddNode, setShowAddNode] = useState(false);
  const [nodeName, setNodeName] = useState("");
  const [nodeType, setNodeType] = useState("Person");
  
  const [showAddEdge, setShowAddEdge] = useState(false);
  const [sourceId, setSourceId] = useState("");
  const [targetId, setTargetId] = useState("");
  const [edgeType, setEdgeType] = useState("COMMUNICATED_WITH");

  const width = 800;
  const height = 500;
  
  const [draggedNodeId, setDraggedNodeId] = useState(null);
  const draggedNodeIdRef = useRef(null);
  const svgRef = useRef(null);

  useEffect(() => {
    draggedNodeIdRef.current = draggedNodeId;
  }, [draggedNodeId]);

  const fetchGraph = () => {
    setLoading(true);
    api.getGraph(caseId)
      .then((data) => {
        // Initialize positions randomly spread out so they don't lock into local energy minimums
        const positionedNodes = data.nodes.map((node) => {
          return {
            ...node,
            x: width / 2 + (Math.random() - 0.5) * 200,
            y: height / 2 + (Math.random() - 0.5) * 200,
          };
        });
        setGraphData({ nodes: positionedNodes, edges: data.edges });
      })
      .catch((err) => console.error("Error loading graph:", err))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchGraph();
  }, [caseId]);

  // Physics animation loop using Verlet integration & collision prevention
  useEffect(() => {
    if (loading || graphData.nodes.length === 0) return;
    
    let active = true;
    
    const runSimulationStep = (nodes, edges, draggedId) => {
      const kRepulsion = 80000;  // Strong repulsion to keep nodes spaced apart
      const kAttraction = 0.035;  // Moderate attraction to hold links
      const linkLength = 130;    // Standard edge distance
      const gravity = 0.012;     // Weak gravity to pull outliers slowly to center
      const velocityDamping = 0.85; // Damps forces to prevent jittering / oscillations
      
      const dx = {};
      const dy = {};
      nodes.forEach(n => {
        dx[n.id] = 0;
        dy[n.id] = 0;
      });
      
      // 1. Repulsion force & anti-overlap collision prevention
      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const n1 = nodes[i];
          const n2 = nodes[j];
          const xDiff = n1.x - n2.x;
          const yDiff = n1.y - n2.y;
          const distSq = xDiff * xDiff + yDiff * yDiff + 0.01;
          const dist = Math.sqrt(distSq);
          
          if (dist < 300) {
            const force = kRepulsion / distSq;
            const fx = (xDiff / dist) * force;
            const fy = (yDiff / dist) * force;
            dx[n1.id] += fx;
            dy[n1.id] += fy;
            dx[n2.id] -= fx;
            dy[n2.id] -= fy;
          }
          
          // Hard collision preventer (push nodes apart if they get closer than 90px)
          const minDist = 90;
          if (dist < minDist) {
            const overlap = minDist - dist;
            const fx = (xDiff / dist) * overlap * 0.45;
            const fy = (yDiff / dist) * overlap * 0.45;
            dx[n1.id] += fx;
            dy[n1.id] += fy;
            dx[n2.id] -= fx;
            dy[n2.id] -= fy;
          }
        }
      }
      
      // 2. Attraction along links
      edges.forEach(edge => {
        const sNode = nodes.find(n => n.id === edge.source);
        const tNode = nodes.find(n => n.id === edge.target);
        if (sNode && tNode) {
          const xDiff = sNode.x - tNode.x;
          const yDiff = sNode.y - tNode.y;
          const dist = Math.sqrt(xDiff * xDiff + yDiff * yDiff) + 0.01;
          const force = kAttraction * (dist - linkLength);
          const fx = (xDiff / dist) * force;
          const fy = (yDiff / dist) * force;
          dx[edge.source] -= fx;
          dy[edge.source] -= fy;
          dx[edge.target] += fx;
          dy[edge.target] += fy;
        }
      });
      
      // 3. Gravity pulling toward center
      nodes.forEach(n => {
        const xDiff = (width / 2) - n.x;
        const yDiff = (height / 2) - n.y;
        dx[n.id] += xDiff * gravity;
        dy[n.id] += yDiff * gravity;
      });
      
      // 4. Update node positions
      return nodes.map(n => {
        if (n.id === draggedId) return n;
        
        let mx = dx[n.id] * velocityDamping;
        let my = dy[n.id] * velocityDamping;
        
        const disp = Math.sqrt(mx * mx + my * my) + 0.01;
        if (disp > 8) {
          mx = (mx / disp) * 8;
          my = (my / disp) * 8;
        }
        
        const padding = 45;
        return {
          ...n,
          x: Math.max(padding, Math.min(width - padding, n.x + mx)),
          y: Math.max(padding, Math.min(height - padding, n.y + my))
        };
      });
    };

    const tick = () => {
      if (!active) return;
      setGraphData(prev => {
        const nextNodes = runSimulationStep(prev.nodes, prev.edges, draggedNodeIdRef.current);
        return { ...prev, nodes: nextNodes };
      });
      requestAnimationFrame(tick);
    };
    
    requestAnimationFrame(tick);
    return () => {
      active = false;
    };
  }, [loading, graphData.nodes.length === 0]);

  const handleMouseDown = (nodeId) => {
    setDraggedNodeId(nodeId);
  };

  const handleMouseMove = (e) => {
    if (!draggedNodeId || !svgRef.current) return;
    
    const rect = svgRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * width;
    const y = ((e.clientY - rect.top) / rect.height) * height;
    
    setGraphData(prev => ({
      ...prev,
      nodes: prev.nodes.map(n => n.id === draggedNodeId ? { ...n, x, y } : n)
    }));
  };

  const handleMouseUp = () => {
    setDraggedNodeId(null);
  };

  const handleNodeClick = (node, e) => {
    e.stopPropagation();
    setSelectedNode(node);
  };

  const handleCanvasClick = () => {
    setSelectedNode(null);
  };

  const handleAddNodeSubmit = async (e) => {
    e.preventDefault();
    if (!nodeName.trim()) return;
    
    try {
      await api.addNode(caseId, { name: nodeName, type: nodeType });
      setNodeName("");
      setShowAddNode(false);
      fetchGraph();
    } catch (err) {
      alert(`Failed to add custom node: ${err.message}`);
    }
  };

  const handleAddEdgeSubmit = async (e) => {
    e.preventDefault();
    if (!sourceId || !targetId) return;
    
    try {
      await api.addEdge(caseId, {
        source_id: Number(sourceId),
        target_id: Number(targetId),
        type: edgeType
      });
      setSourceId("");
      setTargetId("");
      setShowAddEdge(false);
      fetchGraph();
    } catch (err) {
      alert(`Failed to create connection edge: ${err.message}`);
    }
  };

  const getNodeIcon = (type) => {
    switch(type) {
      case "Person": return <User style={{ height: "1rem", width: "1rem" }} className="text-purple-400" />;
      case "Phone": return <Phone style={{ height: "1rem", width: "1rem" }} className="text-blue-400" />;
      case "Email": return <Mail style={{ height: "1rem", width: "1rem" }} className="text-amber-400" />;
      case "Location": return <MapPin style={{ height: "1rem", width: "1rem" }} className="text-emerald-400" />;
      case "Device": return <Smartphone style={{ height: "1rem", width: "1rem" }} className="text-pink-400" />;
      case "BankAccount": return <CreditCard style={{ height: "1rem", width: "1rem" }} className="text-orange-400" />;
      default: return <Database style={{ height: "1rem", width: "1rem" }} className="text-zinc-400" />;
    }
  };

  return (
    <div className="graph-container">
      {/* Title */}
      <div className="graph-header">
        <div>
          <span className="sidebar-label">Relational Map</span>
          <h2 className="text-3xl font-bold tracking-tight text-white mt-1">Knowledge Graph</h2>
          <p className="text-zinc-400 text-sm mt-1">
            Analyze entity correlations, communication rings, and device logs in an interactive network view.
          </p>
        </div>

        {/* Action Controls */}
        <div className="graph-actions">
          <button 
            onClick={() => setShowAddNode(!showAddNode)}
            className="btn-secondary"
          >
            <Plus style={{ height: "1rem", width: "1rem" }} />
            <span>Add Entity</span>
          </button>
          <button 
            onClick={() => setShowAddEdge(!showAddEdge)}
            className="btn-primary"
          >
            <LinkIcon style={{ height: "1rem", width: "1rem" }} />
            <span>Connect Entities</span>
          </button>
        </div>
      </div>

      {/* Forms Drawer overlay */}
      {(showAddNode || showAddEdge) && (
        <div className="form-drawer">
          {showAddNode && (
            <form onSubmit={handleAddNodeSubmit} className="space-y-4">
              <h3 className="text-sm font-semibold text-zinc-200">Manually Register Entity</h3>
              <div className="form-drawer" style={{ background: "none", border: "none", padding: 0 }}>
                <div>
                  <label className="sidebar-label" style={{ marginBottom: "0.25rem" }}>Entity Name</label>
                  <input 
                    type="text" 
                    placeholder="e.g. suspect alias, phone, email"
                    value={nodeName}
                    onChange={(e) => setNodeName(e.target.value)}
                    className="form-input"
                  />
                </div>
                <div>
                  <label className="sidebar-label" style={{ marginBottom: "0.25rem" }}>Entity Type</label>
                  <select 
                    value={nodeType}
                    onChange={(e) => setNodeType(e.target.value)}
                    className="form-input"
                  >
                    {["Person", "Phone", "Email", "Location", "Device", "BankAccount", "CryptoWallet"].map(t => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="flex space-x-2" style={{ display: "flex", gap: "0.5rem" }}>
                <button type="submit" className="btn-primary" style={{ padding: "0.375rem 1rem", fontSize: "12px" }}>Save</button>
                <button type="button" onClick={() => setShowAddNode(false)} className="btn-secondary" style={{ padding: "0.375rem 1rem", fontSize: "12px" }}>Cancel</button>
              </div>
            </form>
          )}

          {showAddEdge && (
            <form onSubmit={handleAddEdgeSubmit} className="space-y-4">
              <h3 className="text-sm font-semibold text-zinc-200">Establish Link Connection</h3>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "1rem" }}>
                <div>
                  <label className="sidebar-label" style={{ marginBottom: "0.25rem" }}>Source Node</label>
                  <select 
                    value={sourceId}
                    onChange={(e) => setSourceId(e.target.value)}
                    className="form-input"
                  >
                    <option value="">Select source</option>
                    {graphData.nodes.map(n => (
                      <option key={n.id} value={n.id}>{n.label} ({n.type})</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="sidebar-label" style={{ marginBottom: "0.25rem" }}>Connection Type</label>
                  <select 
                    value={edgeType}
                    onChange={(e) => setEdgeType(e.target.value)}
                    className="form-input"
                  >
                    {["COMMUNICATED_WITH", "OWNS", "LOCATED_AT", "ASSOCIATED_WITH", "TRANSFERRED_FUNDS"].map(t => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="sidebar-label" style={{ marginBottom: "0.25rem" }}>Target Node</label>
                  <select 
                    value={targetId}
                    onChange={(e) => setTargetId(e.target.value)}
                    className="form-input"
                  >
                    <option value="">Select target</option>
                    {graphData.nodes.map(n => (
                      <option key={n.id} value={n.id}>{n.label} ({n.type})</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="flex space-x-2" style={{ display: "flex", gap: "0.5rem", marginTop: "1rem" }}>
                <button type="submit" className="btn-primary" style={{ padding: "0.375rem 1rem", fontSize: "12px" }}>Save</button>
                <button type="button" onClick={() => setShowAddEdge(false)} className="btn-secondary" style={{ padding: "0.375rem 1rem", fontSize: "12px" }}>Cancel</button>
              </div>
            </form>
          )}
        </div>
      )}

      {/* Main Graph Area Grid */}
      <div className="graph-workspace">
        {/* Canvas Screen */}
        <div className="graph-canvas-card">
          {/* Top Indicator */}
          <div className="graph-indicator-row">
            <span className="graph-indicator-left">
              <span className="h-2 w-2 bg-emerald-500 rounded-full animate-pulse" style={{ display: "inline-block", height: "0.5rem", width: "0.5rem", borderRadius: "50%" }}></span>
              <span>FORENSIC CORRELATION GRAPH ACTIVE</span>
            </span>
            <span>Drag nodes to organize network structure manually.</span>
          </div>

          {/* Interactive Custom SVG canvas */}
          {loading ? (
            <div className="full-screen-loader" style={{ height: "100%", width: "100%", background: "none", padding: "8rem 0" }}>
              <div className="loader-content">
                <div className="loader-spinner"></div>
                <p className="loader-text">Formulating network relations...</p>
              </div>
            </div>
          ) : (
            <svg
              ref={svgRef}
              width="100%"
              height={height}
              style={{ cursor: "grab", backgroundColor: "rgba(9, 9, 11, 0.45)" }}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
              onClick={handleCanvasClick}
            >
              {/* Define Filters/Markers */}
              <defs>
                <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
                  <feGaussianBlur stdDeviation="3" result="blur" />
                  <feComposite in="SourceGraphic" in2="blur" operator="over" />
                </filter>
                
                {/* Arrow markers for directed edges */}
                <marker
                  id="arrow"
                  viewBox="0 0 10 10"
                  refX="25"
                  refY="5"
                  markerWidth="5"
                  markerHeight="5"
                  orient="auto-start-reverse"
                >
                  <path d="M 0 0 L 10 5 L 0 10 z" fill="rgba(255, 255, 255, 0.4)" />
                </marker>
              </defs>

              {/* Render Connection Edges */}
              {graphData.edges.map((edge) => {
                const sourceNode = graphData.nodes.find(n => n.id === edge.source);
                const targetNode = graphData.nodes.find(n => n.id === edge.target);
                if (!sourceNode || !targetNode) return null;
                
                const isHighlighted = selectedNode && (selectedNode.id === edge.source || selectedNode.id === edge.target);
                const isHovered = hoveredNode && (hoveredNode.id === edge.source || hoveredNode.id === edge.target);

                return (
                  <g key={edge.id}>
                    <line
                      x1={sourceNode.x}
                      y1={sourceNode.y}
                      x2={targetNode.x}
                      y2={targetNode.y}
                      stroke={isHighlighted ? "#8b5cf6" : isHovered ? "rgba(139, 92, 246, 0.75)" : "rgba(255, 255, 255, 0.28)"}
                      strokeWidth={isHighlighted ? 2.8 : isHovered ? 2.0 : 1.4}
                      strokeDasharray={edge.type === "COMMUNICATED_WITH" ? "none" : "3 3"}
                      markerEnd="url(#arrow)"
                      style={{ transition: "stroke 0.2s ease, stroke-width 0.2s ease" }}
                    />
                    {(isHighlighted || isHovered) && (
                      <g transform={`translate(${(sourceNode.x + targetNode.x) / 2}, ${(sourceNode.y + targetNode.y) / 2})`}>
                        <rect
                          x={-45}
                          y={-8}
                          width={90}
                          height={16}
                          rx={3}
                          fill="rgba(9, 9, 11, 0.9)"
                          stroke="rgba(139, 92, 246, 0.3)"
                          strokeWidth={1}
                        />
                        <text
                          y={3}
                          fill="#c084fc"
                          fontSize={8}
                          fontWeight="700"
                          textAnchor="middle"
                          style={{ fontFamily: "monospace", userSelect: "none" }}
                        >
                          {edge.type}
                        </text>
                      </g>
                    )}
                  </g>
                );
              })}

              {/* Render Node Circles */}
              {graphData.nodes.map((node) => {
                const isSelected = selectedNode?.id === node.id;
                const isHovered = hoveredNode?.id === node.id;
                const color = NODE_COLORS[node.type] || "#ffffff";
                
                // Calculate background plate width dynamically
                const labelWidth = Math.max(60, node.label.length * 6 + 12);

                return (
                  <g
                    key={node.id}
                    transform={`translate(${node.x},${node.y})`}
                    style={{ cursor: "grab", userSelect: "none" }}
                    onMouseDown={() => handleMouseDown(node.id)}
                    onClick={(e) => handleNodeClick(node, e)}
                    onMouseEnter={() => setHoveredNode(node)}
                    onMouseLeave={() => setHoveredNode(null)}
                  >
                    {/* Outer glow ring */}
                    {(isSelected || isHovered) && (
                      <circle
                        r={20}
                        fill="none"
                        stroke={color}
                        strokeWidth={1.5}
                        strokeOpacity={isSelected ? 0.8 : 0.4}
                        className={isSelected ? "animate-pulse" : ""}
                        style={{ transition: "all 0.2s ease" }}
                      />
                    )}

                    {/* Outer border ring */}
                    <circle
                      r={14}
                      fill="#09090b"
                      stroke={color}
                      strokeWidth={isSelected ? 3 : 2}
                      style={{ transition: "all 0.2s ease" }}
                    />
                    
                    {/* Node Type Character inside circle */}
                    <text
                      y={4}
                      fill="#ffffff"
                      fontSize={10}
                      fontWeight="800"
                      textAnchor="middle"
                      style={{ fontFamily: "monospace" }}
                    >
                      {node.type.charAt(0)}
                    </text>

                    {/* Clean background plate label tag */}
                    <g transform="translate(0, 26)">
                      <rect
                        x={-labelWidth / 2}
                        y={-8}
                        width={labelWidth}
                        height={16}
                        rx={4}
                        fill="rgba(24, 24, 27, 0.92)"
                        stroke={isSelected ? color : "rgba(255,255,255,0.06)"}
                        strokeWidth={isSelected ? 1.2 : 0.8}
                        style={{ transition: "all 0.2s ease" }}
                      />
                      <text
                        y={3}
                        fill={isSelected ? "#ffffff" : "#a1a1aa"}
                        fontSize={9}
                        fontWeight={isSelected ? "bold" : "500"}
                        textAnchor="middle"
                        style={{ fontFamily: "system-ui" }}
                      >
                        {node.label}
                      </text>
                    </g>
                  </g>
                );
              })}
            </svg>
          )}

          {/* Bottom legend panel */}
          <div className="graph-legend">
            {Object.entries(NODE_COLORS).map(([type, color]) => (
              <div key={type} className="legend-item">
                <span className="legend-dot" style={{ backgroundColor: color }}></span>
                <span>{type}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Right Info sidebar Panel */}
        <div className="glass-card p-6" style={{ borderRadius: "var(--radius)", display: "flex", flexDirection: "column", gap: "1.5rem" }}>
          {selectedNode ? (
            <>
              <div style={{ borderBottom: "1px solid rgba(255,255,255,0.06)", paddingBottom: "1rem" }}>
                <span className="sidebar-label">Entity Profile</span>
                <h3 className="sidebar-title flex items-center space-x-2" style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
                  {getNodeIcon(selectedNode.type)}
                  <span className="break-all">{selectedNode.label}</span>
                </h3>
                <span className="text-xs bg-zinc-900 text-zinc-400 border border-zinc-800 px-2 py-0.5 rounded font-semibold mt-2 inline-block">
                  {selectedNode.type}
                </span>
              </div>

              <div className="inspector-section">
                <h4 className="section-label flex items-center space-x-1" style={{ display: "flex", gap: "0.25rem", alignItems: "center" }}>
                  <Info style={{ height: "1rem", width: "1rem" }} />
                  <span>Metadata Attributes</span>
                </h4>
                <div className="bg-zinc-950 p-4 rounded-xl border border-zinc-900 text-xs space-y-3 font-mono">
                  {Object.entries(selectedNode.properties || {}).map(([k, v]) => (
                    <div key={k} style={{ borderBottom: "1px solid rgba(255,255,255,0.04)", paddingBottom: "0.5rem", marginBottom: "0.5rem" }} className="last:border-0 last:pb-0">
                      <span className="text-zinc-500 block uppercase text-[9px]">{k}</span>
                      <span className="text-zinc-300 break-all">{v}</span>
                    </div>
                  ))}
                  {Object.keys(selectedNode.properties || {}).length === 0 && (
                    <span className="text-zinc-500 block italic">No extra custom attributes mapped.</span>
                  )}
                </div>
              </div>

              <div className="text-zinc-500 bg-zinc-900/30 border border-zinc-800/40 p-3 rounded-lg leading-relaxed" style={{ fontSize: "11px" }}>
                Tip: Drag this entity circle around the grid area on the left to visually segment phone lines, GPS coordinates, or group members.
              </div>
            </>
          ) : (
            <div className="inspector-placeholder">
              <Network style={{ height: "2.5rem", width: "2.5rem", margin: "0 auto 0.5rem auto" }} className="animate-pulse" />
              <p>Click on any network element circle to audit attributes.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
