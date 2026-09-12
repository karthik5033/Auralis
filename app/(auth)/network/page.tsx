"use client";

import React, { useState } from "react";
import { 
  Network, 
  Search, 
  Filter, 
  ShieldAlert, 
  ExternalLink, 
  Boxes, 
  Orbit, 
  AlertTriangle, 
  Layers,
  X,
  Crosshair
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { MOCK_NETWORK_GRAPH } from "@/lib/mockData";
import Link from "next/link";

export default function ObjectGraphPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedNode, setSelectedNode] = useState<any>(MOCK_NETWORK_GRAPH.nodes[0]);
  const [filterType, setFilterType] = useState("ALL");

  const nodeCoords: Record<string, { x: number; y: number }> = {
    "SAT-52109": { x: 280, y: 200 },
    "DEB-34120": { x: 440, y: 160 },
    "SAT-40697": { x: 220, y: 360 },
    "DEB-22444": { x: 480, y: 380 },
    "SAT-45132": { x: 340, y: 480 },
    "SHELL-550": { x: 180, y: 120 },
    "SHELL-780": { x: 620, y: 280 }
  };

  const getNodeIcon = (type: string) => {
    switch (type) {
      case "ACTIVE_SATELLITE": return <Boxes className="h-4 w-4" />;
      case "LETHAL_DEBRIS": return <AlertTriangle className="h-4 w-4" />;
      case "ROCKET_BODY": return <Orbit className="h-4 w-4" />;
      case "ORBITAL_SHELL": return <Layers className="h-4 w-4" />;
      default: return <Network className="h-4 w-4" />;
    }
  };

  const getNodeColor = (type: string, risk: string) => {
    if (risk === "CRITICAL") return "bg-rose-600 border-rose-700 text-white";
    if (type === "ACTIVE_SATELLITE") return "bg-emerald-600 border-emerald-700 text-white";
    if (type === "ROCKET_BODY") return "bg-amber-600 border-amber-700 text-white";
    return "bg-zinc-800 border-zinc-700 text-white";
  };

  const filteredNodes = MOCK_NETWORK_GRAPH.nodes.filter(node => {
    const matchesFilter = filterType === "ALL" || node.type.toUpperCase() === filterType.toUpperCase();
    const nodeTitle = (node.name || node.label || "").toLowerCase();
    const matchesSearch = nodeTitle.includes(searchQuery.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] w-full overflow-hidden bg-background font-sans">
      {/* Top Controls Bar */}
      <div className="h-14 border-b border-border flex items-center justify-between px-6 bg-card shrink-0 shadow-xs z-20">
        <div className="flex items-center gap-3">
          <div className="p-1.5 rounded-md bg-foreground/10 text-foreground">
            <Network className="h-5 w-5" />
          </div>
          <div>
            <h1 className="font-bold text-sm text-foreground">Orbital Object Graph</h1>
          </div>
          <Badge variant="outline" className="text-[10px] text-emerald-500 border-emerald-500/30 bg-emerald-500/10 font-mono">
            7 BODIES • 5 CONJUNCTION PAIRINGS
          </Badge>
        </div>

        <div className="flex items-center gap-3">
          {/* Search Box */}
          <div className="relative w-48 sm:w-64">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Filter cataloged bodies..."
              className="pl-8 py-1 h-8 text-xs bg-muted/40 border-border"
            />
          </div>

          {/* Filter Types */}
          <div className="hidden sm:flex items-center gap-1 bg-muted/40 p-1 rounded-lg border border-border">
            {["ALL", "ACTIVE_SATELLITE", "LETHAL_DEBRIS", "ROCKET_BODY", "ORBITAL_SHELL"].map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setFilterType(cat)}
                className={`px-2 py-1 text-[10px] font-mono font-bold rounded ${
                  filterType === cat ? "bg-foreground text-background shadow-xs" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {cat === "ACTIVE_SATELLITE" ? "SATELLITE" : cat === "LETHAL_DEBRIS" ? "DEBRIS" : cat === "ROCKET_BODY" ? "ROCKET" : cat === "ORBITAL_SHELL" ? "SHELL" : cat}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Main Canvas + Sidebar Area */}
      <div className="flex flex-1 overflow-hidden relative">
        {/* Canvas */}
        <div className="flex-1 relative bg-black overflow-hidden select-none">
          {/* Background Grid Pattern */}
          <div 
            className="absolute inset-0 opacity-20 pointer-events-none"
            style={{
              backgroundImage: "radial-gradient(circle, #3f3f46 1px, transparent 1px)",
              backgroundSize: "28px 28px"
            }}
          />

          {/* SVG Links */}
          <svg className="absolute inset-0 w-full h-full pointer-events-none">
            {MOCK_NETWORK_GRAPH.links.map((link, idx) => {
              const src = nodeCoords[link.source] || { x: 200, y: 200 };
              const tgt = nodeCoords[link.target] || { x: 400, y: 400 };

              return (
                <g key={idx}>
                  <line
                    x1={src.x}
                    y1={src.y}
                    x2={tgt.x}
                    y2={tgt.y}
                    stroke="rgba(113, 113, 122, 0.5)"
                    strokeWidth={(link.strength || link.weight || 0.8) * 2.5}
                    strokeDasharray={link.type === "conjunction_pairing" ? "4 4" : undefined}
                  />
                  <text
                    x={(src.x + tgt.x) / 2}
                    y={(src.y + tgt.y) / 2 - 6}
                    fill="#a1a1aa"
                    fontSize="10"
                    textAnchor="middle"
                    className="font-mono bg-black px-1 font-semibold"
                  >
                    {link.relationship || link.type}
                  </text>
                </g>
              );
            })}
          </svg>

          {/* Interactive Nodes */}
          {filteredNodes.map((node) => {
            const coords = nodeCoords[node.id] || { x: 300, y: 300 };
            const isSelected = selectedNode?.id === node.id;

            return (
              <div
                key={node.id}
                onClick={() => setSelectedNode(node)}
                style={{ left: coords.x, top: coords.y }}
                className={`absolute -translate-x-1/2 -translate-y-1/2 z-10 cursor-pointer group transition-all duration-200 ${
                  isSelected ? "scale-110" : "hover:scale-105"
                }`}
              >
                <div className={`flex items-center gap-2 px-3 py-2 rounded-xl border shadow-xl backdrop-blur-md ${getNodeColor(node.type, node.risk)} ${
                  isSelected ? "ring-2 ring-white shadow-white/20" : ""
                }`}>
                  <div className="p-1 rounded bg-black/30">
                    {getNodeIcon(node.type)}
                  </div>
                  <div className="text-left">
                    <p className="text-xs font-bold whitespace-nowrap leading-none">{node.name || node.label}</p>
                    <span className="text-[9px] uppercase tracking-wider opacity-80 mt-0.5 block font-mono">
                      {node.role || node.type} • {node.risk}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}

          {/* Canvas Floating Legend */}
          <div className="absolute bottom-4 left-4 z-20 flex items-center gap-4 p-2.5 rounded-lg bg-zinc-950/90 border border-zinc-800 text-[11px] text-zinc-300 backdrop-blur-md font-mono">
            <span className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-full bg-emerald-500" /> Active Satellite</span>
            <span className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-full bg-rose-500" /> Lethal Debris</span>
            <span className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-full bg-amber-500" /> Rocket Body</span>
            <span className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-full bg-zinc-700" /> Orbital Shell</span>
          </div>
        </div>

        {/* Right Inspector Drawer */}
        {selectedNode && (
          <aside className="w-80 border-l border-border bg-card flex flex-col shadow-xl z-20 overflow-y-auto animate-in slide-in-from-right-2 duration-300">
            <div className="p-4 border-b border-border flex items-center justify-between sticky top-0 bg-card z-10">
              <div className="flex items-center gap-2">
                <Boxes className="h-4 w-4 text-foreground" />
                <h3 className="font-bold text-sm text-foreground">Object Telemetry</h3>
              </div>
              <button 
                onClick={() => setSelectedNode(null)}
                className="p-1 rounded-md hover:bg-muted text-muted-foreground transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="p-4 space-y-6">
              <div>
                <Badge variant="outline" className="text-[10px] font-mono font-bold uppercase mb-2">
                  {selectedNode.type}
                </Badge>
                <h2 className="text-lg font-bold text-foreground leading-snug">{selectedNode.name || selectedNode.label}</h2>
                <p className="text-xs font-mono text-muted-foreground uppercase tracking-wider mt-0.5">
                  ID: {selectedNode.id}
                </p>
              </div>

              {/* Threat Level */}
              <div className="p-3.5 rounded-lg border border-border bg-muted/30 space-y-2">
                <div className="flex items-center justify-between text-xs font-mono">
                  <span className="font-semibold text-muted-foreground">Collision Threat Rating</span>
                  <span className={`font-bold ${selectedNode.risk === "CRITICAL" ? "text-rose-500" : selectedNode.risk === "HIGH" ? "text-amber-500" : "text-emerald-500"}`}>
                    {selectedNode.risk}
                  </span>
                </div>
              </div>

              {/* Connected Associations */}
              <div className="space-y-2 font-mono text-xs">
                <h4 className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Direct Conjunction Associations</h4>
                <div className="space-y-1.5">
                  {MOCK_NETWORK_GRAPH.links
                    .filter(l => l.source === selectedNode.id || l.target === selectedNode.id)
                    .map((link, idx) => {
                      const otherId = link.source === selectedNode.id ? link.target : link.source;
                      const otherNode = MOCK_NETWORK_GRAPH.nodes.find(n => n.id === otherId);
                      return (
                        <div key={idx} className="p-2.5 rounded-lg border border-border bg-card text-xs flex items-center justify-between">
                          <div>
                            <p className="font-semibold text-foreground">{otherNode?.name || otherNode?.label}</p>
                            <span className="text-[10px] text-muted-foreground">{link.relationship || link.type}</span>
                          </div>
                          <Badge variant="outline" className="text-[9px] border-border">
                            {link.strength ? `${Math.round(link.strength * 100)}%` : "Tracked"}
                          </Badge>
                        </div>
                      );
                    })}
                </div>
              </div>

              <div className="pt-4">
                <Link href="/cases">
                  <Button className="w-full text-xs font-semibold bg-foreground text-background">
                    <Crosshair className="w-3.5 h-3.5 mr-1.5" />
                    Inspect Active Conjunctions
                  </Button>
                </Link>
              </div>
            </div>
          </aside>
        )}
      </div>
    </div>
  );
}
