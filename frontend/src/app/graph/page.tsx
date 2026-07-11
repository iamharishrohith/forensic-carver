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
  Layers,
  Link as LinkIcon
} from "lucide-react";
import { api } from "@/lib/api";

const NODE_COLORS: Record<string, string> = {
  Person: "#a78bfa",      // Purple
  Phone: "#60a5fa",       // Blue
  Email: "#fbbf24",       // Amber
  Location: "#34d399",    // Emerald
  Device: "#f472b6",      // Pink
  CryptoWallet: "#22d3ee",  // Cyan
  BankAccount: "#fb923c"  // Orange
};

export default function KnowledgeGraph() {
  const searchParams = useSearchParams();
  const caseId = Number(searchParams.get("case_id") || "1");

  const [graphData, setGraphData] = useState<{ nodes: any[]; edges: any[] }>({ nodes: [], edges: [] });
  const [loading, setLoading] = useState(true);
  const [selectedNode, setSelectedNode] = useState<any>(null);
  
  // Custom Node form states
  const [showAddNode, setShowAddNode] = useState(false);
  const [nodeName, setNodeName] = useState("");
  const [nodeType, setNodeType] = useState("Person");
  
  // Custom Edge form states
  const [showAddEdge, setShowAddEdge] = useState(false);
  const [sourceId, setSourceId] = useState("");
  const [targetId, setTargetId] = useState("");
  const [edgeType, setEdgeType] = useState("COMMUNICATED_WITH");

  // SVG dimensions
  const width = 800;
  const height = 500;
  
  // Dragging states
  const [draggedNodeId, setDraggedNodeId] = useState<string | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  const fetchGraph = () => {
    setLoading(true);
    api.getGraph(caseId)
      .then((data) => {
        // Assign initial random circular coordinates to nodes for representation
        const positionedNodes = data.nodes.map((node: any, idx: number) => {
          const angle = (idx / data.nodes.length) * 2 * Math.PI;
          const radius = 180 + Math.random() * 20;
          return {
            ...node,
            x: width / 2 + radius * Math.cos(angle),
            y: height / 2 + radius * Math.sin(angle),
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

  // Handle Dragging
  const handleMouseDown = (nodeId: string) => {
    setDraggedNodeId(nodeId);
  };

  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement, MouseEvent>) => {
    if (!draggedNodeId || !svgRef.current) return;
    
    // Get mouse coords relative to SVG container
    const rect = svgRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    setGraphData(prev => ({
      ...prev,
      nodes: prev.nodes.map(n => n.id === draggedNodeId ? { ...n, x, y } : n)
    }));
  };

  const handleMouseUp = () => {
    setDraggedNodeId(null);
  };

  const handleNodeClick = (node: any, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedNode(node);
  };

  const handleCanvasClick = () => {
    setSelectedNode(null);
  };

  const handleAddNodeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nodeName.trim()) return;
    
    try {
      await api.addNode(caseId, { name: nodeName, type: nodeType });
      setNodeName("");
      setShowAddNode(false);
      fetchGraph();
    } catch (err: any) {
      alert(`Failed to add custom node: ${err.message}`);
    }
  };

  const handleAddEdgeSubmit = async (e: React.FormEvent) => {
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
    } catch (err: any) {
      alert(`Failed to create connection edge: ${err.message}`);
    }
  };

  const getNodeIcon = (type: string) => {
    switch(type) {
      case "Person": return <User className="h-4 w-4 text-purple-400" />;
      case "Phone": return <Phone className="h-4 w-4 text-blue-400" />;
      case "Email": return <Mail className="h-4 w-4 text-amber-400" />;
      case "Location": return <MapPin className="h-4 w-4 text-emerald-400" />;
      case "Device": return <Smartphone className="h-4 w-4 text-pink-400" />;
      case "BankAccount": return <CreditCard className="h-4 w-4 text-orange-400" />;
      default: return <Database className="h-4 w-4 text-zinc-400" />;
    }
  };

  return (
    <div className="p-8 max-w-7xl mx-auto h-full flex flex-col space-y-6">
      {/* Title */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-4 md:space-y-0">
        <div>
          <span className="text-xs text-purple-400 font-semibold uppercase tracking-widest">Relational Map</span>
          <h2 className="text-3xl font-bold tracking-tight text-white mt-1">Knowledge Graph</h2>
          <p className="text-zinc-400 text-sm mt-1">
            Analyze entity correlations, communication rings, and device logs in an interactive network view.
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex items-center space-x-3">
          <button 
            onClick={() => setShowAddNode(!showAddNode)}
            className="flex items-center space-x-2 bg-zinc-900 border border-zinc-800 hover:border-purple-500/30 text-zinc-300 px-4 py-2.5 rounded-lg text-sm font-semibold transition-all focus:outline-none"
          >
            <Plus className="h-4 w-4" />
            <span>Add Entity</span>
          </button>
          <button 
            onClick={() => setShowAddEdge(!showAddEdge)}
            className="flex items-center space-x-2 bg-purple-600 hover:bg-purple-700 text-white px-4 py-2.5 rounded-lg text-sm font-semibold transition-all focus:outline-none"
          >
            <LinkIcon className="h-4 w-4" />
            <span>Connect Entities</span>
          </button>
        </div>
      </div>

      {/* Forms Drawer overlay */}
      {(showAddNode || showAddEdge) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-zinc-900/60 border border-zinc-800 p-6 rounded-xl">
          {showAddNode && (
            <form onSubmit={handleAddNodeSubmit} className="space-y-4">
              <h3 className="text-sm font-semibold text-zinc-200">Manually Register Entity</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] text-zinc-500 block mb-1">Entity Name</label>
                  <input 
                    type="text" 
                    placeholder="e.g. suspect alias, phone, email"
                    value={nodeName}
                    onChange={(e) => setNodeName(e.target.value)}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-purple-500/50"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-zinc-500 block mb-1">Entity Type</label>
                  <select 
                    value={nodeType}
                    onChange={(e) => setNodeType(e.target.value)}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-purple-500/50"
                  >
                    {["Person", "Phone", "Email", "Location", "Device", "BankAccount", "CryptoWallet"].map(t => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="flex space-x-2">
                <button type="submit" className="bg-purple-600 px-3 py-1.5 rounded-lg text-xs font-semibold text-white">Save</button>
                <button type="button" onClick={() => setShowAddNode(false)} className="bg-zinc-850 px-3 py-1.5 rounded-lg text-xs text-zinc-400">Cancel</button>
              </div>
            </form>
          )}

          {showAddEdge && (
            <form onSubmit={handleAddEdgeSubmit} className="space-y-4">
              <h3 className="text-sm font-semibold text-zinc-200">Establish Link Connection</h3>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="text-[10px] text-zinc-500 block mb-1">Source Node</label>
                  <select 
                    value={sourceId}
                    onChange={(e) => setSourceId(e.target.value)}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-purple-500/50"
                  >
                    <option value="">Select source</option>
                    {graphData.nodes.map(n => (
                      <option key={n.id} value={n.id}>{n.label} ({n.type})</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-[10px] text-zinc-500 block mb-1">Connection Type</label>
                  <select 
                    value={edgeType}
                    onChange={(e) => setEdgeType(e.target.value)}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-purple-500/50"
                  >
                    {["COMMUNICATED_WITH", "OWNS", "LOCATED_AT", "ASSOCIATED_WITH", "TRANSFERRED_FUNDS"].map(t => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-[10px] text-zinc-500 block mb-1">Target Node</label>
                  <select 
                    value={targetId}
                    onChange={(e) => setTargetId(e.target.value)}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-purple-500/50"
                  >
                    <option value="">Select target</option>
                    {graphData.nodes.map(n => (
                      <option key={n.id} value={n.id}>{n.label} ({n.type})</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="flex space-x-2">
                <button type="submit" className="bg-purple-600 px-3 py-1.5 rounded-lg text-xs font-semibold text-white">Save</button>
                <button type="button" onClick={() => setShowAddEdge(false)} className="bg-zinc-850 px-3 py-1.5 rounded-lg text-xs text-zinc-400">Cancel</button>
              </div>
            </form>
          )}
        </div>
      )}

      {/* Main Graph Area Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8 min-h-[500px]">
        {/* Canvas Screen */}
        <div className="lg:col-span-3 glass-card rounded-xl bg-zinc-950 border border-zinc-800 relative overflow-hidden flex flex-col justify-between">
          {/* Top Indicator */}
          <div className="p-4 border-b border-zinc-900 bg-zinc-900/20 text-xs font-mono text-zinc-500 flex items-center justify-between">
            <span className="flex items-center space-x-2">
              <span className="h-2 w-2 bg-emerald-500 rounded-full animate-pulse"></span>
              <span>FORENSIC CORRELATION GRAPH ACTIVE</span>
            </span>
            <span>Drag nodes to organize network structure manually.</span>
          </div>

          {/* Interactive Custom SVG canvas */}
          {loading ? (
            <div className="flex-1 flex items-center justify-center text-zinc-500 text-sm">
              <div className="h-8 w-8 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mr-3"></div>
              <span>Formulating network relations...</span>
            </div>
          ) : (
            <svg
              ref={svgRef}
              width="100%"
              height={height}
              className="flex-1 cursor-grab active:cursor-grabbing bg-zinc-950/80"
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
                  refX="22"
                  refY="5"
                  markerWidth="6"
                  markerHeight="6"
                  orient="auto-start-reverse"
                >
                  <path d="M 0 0 L 10 5 L 0 10 z" fill="#3f3f46" />
                </marker>
              </defs>

              {/* Render Connection Edges */}
              {graphData.edges.map((edge) => {
                const sourceNode = graphData.nodes.find(n => n.id === edge.source);
                const targetNode = graphData.nodes.find(n => n.id === edge.target);
                if (!sourceNode || !targetNode) return null;
                
                const isHighlighted = selectedNode && (selectedNode.id === edge.source || selectedNode.id === edge.target);

                return (
                  <g key={edge.id}>
                    <line
                      x1={sourceNode.x}
                      y1={sourceNode.y}
                      x2={targetNode.x}
                      y2={targetNode.y}
                      stroke={isHighlighted ? "#a78bfa" : "#27272a"}
                      strokeWidth={isHighlighted ? 2.5 : 1.2}
                      strokeDasharray={edge.type === "COMMUNICATED_WITH" ? "none" : "4 4"}
                      markerEnd="url(#arrow)"
                      className="transition-all duration-300"
                    />
                    {/* Connection label on mouse hover */}
                    <text
                      x={(sourceNode.x + targetNode.x) / 2}
                      y={(sourceNode.y + targetNode.y) / 2 - 4}
                      fill={isHighlighted ? "#c084fc" : "#52525b"}
                      fontSize={9}
                      textAnchor="middle"
                      className="font-mono select-none"
                    >
                      {edge.type}
                    </text>
                  </g>
                );
              })}

              {/* Render Node Circles */}
              {graphData.nodes.map((node) => {
                const isSelected = selectedNode?.id === node.id;
                const color = NODE_COLORS[node.type] || "#ffffff";
                
                return (
                  <g
                    key={node.id}
                    transform={`translate(${node.x},${node.y})`}
                    className="cursor-pointer select-none"
                    onMouseDown={() => handleMouseDown(node.id)}
                    onClick={(e) => handleNodeClick(node, e)}
                  >
                    <circle
                      r={isSelected ? 16 : 12}
                      fill="#09090b"
                      stroke={color}
                      strokeWidth={isSelected ? 3.5 : 2}
                      filter={isSelected ? "url(#glow)" : undefined}
                      className="transition-all duration-300"
                    />
                    <text
                      y={isSelected ? 32 : 28}
                      fill={isSelected ? "#ffffff" : "#a1a1aa"}
                      fontSize={11}
                      fontWeight={isSelected ? "bold" : "normal"}
                      textAnchor="middle"
                      className="font-sans font-medium"
                    >
                      {node.label}
                    </text>
                  </g>
                );
              })}
            </svg>
          )}

          {/* Bottom legend panel */}
          <div className="p-4 border-t border-zinc-900 bg-zinc-900/10 flex flex-wrap gap-4 text-xs font-medium text-zinc-500">
            {Object.entries(NODE_COLORS).map(([type, color]) => (
              <div key={type} className="flex items-center space-x-1.5">
                <span className="h-3 w-3 rounded-full border border-zinc-950" style={{ backgroundColor: color }}></span>
                <span>{type}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Right Info sidebar Panel */}
        <div className="glass-card rounded-xl p-6 flex flex-col space-y-6">
          {selectedNode ? (
            <>
              <div className="border-b border-zinc-800 pb-4">
                <span className="text-[10px] text-zinc-500 uppercase tracking-widest font-semibold">Entity Profile</span>
                <h3 className="text-lg font-bold text-white mt-1 flex items-center space-x-2">
                  {getNodeIcon(selectedNode.type)}
                  <span className="break-all">{selectedNode.label}</span>
                </h3>
                <span className="text-xs bg-zinc-900 text-zinc-400 border border-zinc-800 px-2 py-0.5 rounded font-semibold mt-2 inline-block">
                  {selectedNode.type}
                </span>
              </div>

              <div className="space-y-4">
                <h4 className="text-xs text-zinc-400 uppercase tracking-wider font-semibold flex items-center space-x-1">
                  <Info className="h-3.5 w-3.5" />
                  <span>Metadata Attributes</span>
                </h4>
                <div className="bg-zinc-950 p-4 rounded-xl border border-zinc-900 text-xs space-y-3 font-mono">
                  {Object.entries(selectedNode.properties || {}).map(([k, v]: any) => (
                    <div key={k} className="border-b border-zinc-900/60 pb-2 last:border-0 last:pb-0">
                      <span className="text-zinc-500 block uppercase text-[9px]">{k}</span>
                      <span className="text-zinc-300 break-all">{v}</span>
                    </div>
                  ))}
                  {Object.keys(selectedNode.properties || {}).length === 0 && (
                    <span className="text-zinc-500 block italic">No extra custom attributes mapped.</span>
                  )}
                </div>
              </div>

              <div className="text-[11px] text-zinc-500 bg-zinc-900/30 border border-zinc-800/40 p-3 rounded-lg leading-relaxed">
                Tip: Drag this entity circle around the grid area on the left to visually segment phone lines, GPS coordinates, or group members.
              </div>
            </>
          ) : (
            <div className="h-full flex items-center justify-center text-zinc-500 text-sm text-center py-20">
              <div>
                <Network className="h-8 w-8 mx-auto text-zinc-700 mb-2 animate-pulse" />
                <p>Click on any network element circle to audit attributes.</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
