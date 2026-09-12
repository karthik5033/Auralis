"use client";

import React, { useState, useEffect, useMemo, useRef, useCallback } from "react";
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
  Crosshair,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Maximize2,
  Activity,
  Flame,
  Zap,
  Globe2,
  Radar,
  ArrowUpRight,
  Radio,
  Sparkles,
  Info
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import Link from "next/link";
import { getObjects, getConjunctions, getShells } from "@/lib/api";
import { useWebSocket } from "@/components/providers/WebSocketProvider";
import { 
  formatScientificPc, 
  formatCountdown, 
  formatDistance, 
  formatVelocity 
} from "@/lib/formatters";
import type { 
  TrackedObject, 
  ConjunctionEvent, 
  ShellRiskSnapshot, 
  RiskLevel, 
  ObjectType 
} from "@/types/contract";

// View modes
type ViewMode = "RADIAL" | "CONJUNCTION_CLUSTER";

// Unified node type for the graph
interface GraphNode {
  id: string;
  kind: "object" | "shell";
  name: string;
  type: ObjectType | "shell";
  altitude: number;
  shellId: string;
  risk: "NOMINAL" | "ELEVATED" | "CRITICAL";
  x: number;
  y: number;
  rawObject?: TrackedObject;
  rawShell?: ShellRiskSnapshot;
  conjunctionCount: number;
  maxPc: number;
}

interface GraphLink {
  id: string;
  sourceId: string;
  targetId: string;
  sourceX: number;
  sourceY: number;
  targetX: number;
  targetY: number;
  type: "conjunction" | "shell_resident";
  riskLevel: RiskLevel;
  collisionProbability?: number;
  missDistance?: number;
  tca?: string;
  conjunction?: ConjunctionEvent;
}

export default function ObjectGraphPage() {
  // Core API State
  const [objects, setObjects] = useState<TrackedObject[]>([]);
  const [conjunctions, setConjunctions] = useState<ConjunctionEvent[]>([]);
  const [shells, setShells] = useState<ShellRiskSnapshot[]>([]);
  const [loading, setLoading] = useState(true);

  // User Controls
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState<string>("ALL");
  const [selectedShellFilter, setSelectedShellFilter] = useState<string>("ALL");
  const [viewMode, setViewMode] = useState<ViewMode>("RADIAL");
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [selectedConjunctionId, setSelectedConjunctionId] = useState<string | null>(null);
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);
  const [hoveredConjunctionId, setHoveredConjunctionId] = useState<string | null>(null);
  const [hoveredShellId, setHoveredShellId] = useState<string | null>(null);

  // Canvas Pan & Zoom
  const [zoom, setZoom] = useState<number>(1.0);
  const [pan, setPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const dragStartRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);

  // Live Timer for TCA countdowns
  const [nowMs, setNowMs] = useState<number>(Date.now());
  useEffect(() => {
    const interval = setInterval(() => setNowMs(Date.now()), 1000);
    return () => clearInterval(interval);
  }, []);

  // Fetch real data on mount
  useEffect(() => {
    let active = true;

    async function fetchData() {
      try {
        setLoading(true);
        const [objRes, conjRes, shellRes] = await Promise.all([
          getObjects({ limit: 120 }),
          getConjunctions({ limit: 60 }),
          getShells(),
        ]);

        if (!active) return;

        setObjects(objRes.data || []);
        setConjunctions(conjRes.data || []);
        setShells(shellRes.data || []);

        // Select the highest-risk conjunction's primary object by default if available
        if (conjRes.data && conjRes.data.length > 0) {
          const criticalConj = conjRes.data.find(c => c.riskLevel === "critical") || conjRes.data[0];
          setSelectedNodeId(criticalConj.primaryObjectId);
        } else if (objRes.data && objRes.data.length > 0) {
          setSelectedNodeId(objRes.data[0].id);
        }
      } catch (err) {
        console.error("Failed to load Object Graph telemetry:", err);
      } finally {
        if (active) setLoading(false);
      }
    }

    fetchData();

    return () => {
      active = false;
    };
  }, []);

  // Real-time WebSocket Listeners
  useWebSocket("conjunction:created", (newConj) => {
    setConjunctions((prev) => [newConj, ...prev.filter((c) => c.id !== newConj.id)]);
  });

  useWebSocket("conjunction:updated", (updated) => {
    setConjunctions((prev) =>
      prev.map((c) => (c.id === updated.id ? updated : c))
    );
  });

  useWebSocket("crisis:injected", () => {
    // Refresh catalog and shells upon simulated debris explosion
    Promise.all([
      getObjects({ limit: 120 }),
      getConjunctions({ limit: 60 }),
      getShells(),
    ]).then(([objRes, conjRes, shellRes]) => {
      setObjects(objRes.data || []);
      setConjunctions(conjRes.data || []);
      setShells(shellRes.data || []);
    });
  });

  // Map of objects by ID for fast lookup
  const objectsMap = useMemo(() => {
    const map = new Map<string, TrackedObject>();
    objects.forEach((o) => map.set(o.id, o));
    return map;
  }, [objects]);

  // Map of shells by shellId
  const shellsMap = useMemo(() => {
    const map = new Map<string, ShellRiskSnapshot>();
    shells.forEach((s) => map.set(s.shellId, s));
    return map;
  }, [shells]);

  // Object Conjunction Relationships Map
  const objectConjunctionsMap = useMemo(() => {
    const map = new Map<string, ConjunctionEvent[]>();
    conjunctions.forEach((c) => {
      if (!map.has(c.primaryObjectId)) map.set(c.primaryObjectId, []);
      if (!map.has(c.secondaryObjectId)) map.set(c.secondaryObjectId, []);
      map.get(c.primaryObjectId)!.push(c);
      map.get(c.secondaryObjectId)!.push(c);
    });
    return map;
  }, [conjunctions]);

  // Compute Layout & Coordinates dynamically (ZERO HARDCODING)
  const { nodes, links, shellRings, center } = useMemo(() => {
    const cx = 800;
    const cy = 600;
    const centerPoint = { x: cx, y: cy };

    // Group objects by shell for even angular distribution
    const shellGroups = new Map<string, TrackedObject[]>();
    objects.forEach((obj) => {
      const sId = obj.shellId || "LEO_500_550";
      if (!shellGroups.has(sId)) shellGroups.set(sId, []);
      shellGroups.get(sId)!.push(obj);
    });

    // Altitude mapping parameters: 200 km to 1400 km
    const minAlt = 250;
    const maxAlt = 1350;
    const minRadius = 180;
    const maxRadius = 520;

    const getRadiusForAltitude = (alt: number) => {
      const normalized = Math.min(Math.max((alt - minAlt) / (maxAlt - minAlt), 0), 1);
      return minRadius + normalized * (maxRadius - minRadius);
    };

    // Construct shell concentric rings metadata
    const rings = shells.map((shell, idx) => {
      const avgAlt = (shell.altitudeMin + shell.altitudeMax) / 2;
      const radius = getRadiusForAltitude(avgAlt);
      const isCritical = shell.r0 > 1.0;
      return {
        shellId: shell.shellId,
        altitudeMin: shell.altitudeMin,
        altitudeMax: shell.altitudeMax,
        avgAlt,
        radius,
        r0: shell.r0,
        trend: shell.trend,
        isCritical,
        color: isCritical ? "rgba(225, 29, 72, 0.35)" : "rgba(63, 63, 70, 0.4)",
      };
    });

    // Node coordinate generator
    const calculatedNodes: GraphNode[] = [];
    const nodePositionMap = new Map<string, { x: number; y: number }>();

    if (viewMode === "RADIAL") {
      // 1. Orbital Shell Hubs (Only added as nodes when user specifically filters by SHELL)
      shells.forEach((shell, sIdx) => {
        const avgAlt = (shell.altitudeMin + shell.altitudeMax) / 2;
        const radius = getRadiusForAltitude(avgAlt);
        // Distribute shell hubs cleanly in the outer perimeter
        const angle = -0.35 - (sIdx * 0.28);
        const x = cx + (radius + 20) * Math.cos(angle);
        const y = cy + (radius + 20) * Math.sin(angle);

        const node: GraphNode = {
          id: `SHELL_${shell.shellId}`,
          kind: "shell",
          name: `${shell.shellId.replace(/_/g, " ")}`,
          type: "shell",
          altitude: avgAlt,
          shellId: shell.shellId,
          risk: shell.r0 > 1.0 ? "CRITICAL" : shell.r0 > 0.85 ? "ELEVATED" : "NOMINAL",
          x,
          y,
          rawShell: shell,
          conjunctionCount: 0,
          maxPc: 0,
        };

        if (filterType === "SHELL") {
          calculatedNodes.push(node);
        }
        nodePositionMap.set(node.id, { x, y });
      });

      // 2. Position Tracked Objects along their shell rings with true 360-degree mathematical dispersion
      // Priority 1: High-risk conjunction encounters to ensure localized, clean geometry
      // Priority 2: Equitable angular distribution around each shell ring using golden-ratio offsets
      const assignedCoords = new Map<string, { x: number; y: number; angle: number; radius: number }>();
      const shellIndices = Array.from(shellGroups.keys());

      // Helper to compute deterministic orbital phase [0, 360)
      const getOrbitalPhase = (obj: TrackedObject, fallbackIdx: number, totalInShell: number): number => {
        if (obj.orbitalElements?.raan !== undefined) {
          const raan = obj.orbitalElements.raan || 0;
          const argP = obj.orbitalElements.argOfPerigee || 0;
          const ma = obj.orbitalElements.meanAnomaly || 0;
          return (raan + argP + ma) % 360;
        }
        return (fallbackIdx * (360 / Math.max(totalInShell, 1))) % 360;
      };

      // Step A: First, position conjunction primary anchors so critical encounters have localized geometry
      const criticalOrElevatedConjs = conjunctions.filter(c => c.riskLevel === "critical" || c.riskLevel === "elevated");
      criticalOrElevatedConjs.forEach((conj, conjIdx) => {
        const prim = objectsMap.get(conj.primaryObjectId);
        const sec = objectsMap.get(conj.secondaryObjectId);
        if (!prim) return;

        // Anchor primary at an angular slot based on conjunction index around the radar
        if (!assignedCoords.has(prim.id)) {
          const primAlt = prim.altitude || 420;
          const primRadius = getRadiusForAltitude(primAlt);
          // Distribute active threat encounters across distinct angular sectors
          const primAngle = ((conjIdx * 1.37) % (2 * Math.PI)) - Math.PI / 4;
          const px = cx + primRadius * Math.cos(primAngle);
          const py = cy + primRadius * Math.sin(primAngle);
          assignedCoords.set(prim.id, { x: px, y: py, angle: primAngle, radius: primRadius });
        }

        // Place secondary object in physical close encounter proximity:
        // Angular offset: ~4.8 degrees (0.085 rad), Radial offset: ±14px (distinct altitude track)
        if (sec && !assignedCoords.has(sec.id)) {
          const primCoord = assignedCoords.get(prim.id)!;
          const dir = conjIdx % 2 === 0 ? 1 : -1;
          const secAngle = primCoord.angle + dir * 0.085;
          const secRadius = primCoord.radius + (sec.altitude > (prim.altitude || 400) ? 14 : -14);
          const sx = cx + secRadius * Math.cos(secAngle);
          const sy = cy + secRadius * Math.sin(secAngle);
          assignedCoords.set(sec.id, { x: sx, y: sy, angle: secAngle, radius: secRadius });
        }
      });

      // Step B: Position all remaining objects per shell using full 360-degree equidistant dispersion
      shellGroups.forEach((groupObjs, sId) => {
        const shellIdx = shellIndices.indexOf(sId);
        // Golden ratio phase offset so adjacent shells don't create radial spokes
        const shellPhase = (shellIdx * 0.6180339887 * 2 * Math.PI) % (2 * Math.PI);
        
        // Filter out already anchored conjunction objects in this shell
        const unplaced = groupObjs.filter(o => !assignedCoords.has(o.id));
        const N = unplaced.length;
        if (N === 0) return;

        // Sort unplaced objects by their natural orbital phase to preserve relative astrodynamic ordering
        const sorted = [...unplaced].sort((a, b) => {
          const pA = getOrbitalPhase(a, 0, N);
          const pB = getOrbitalPhase(b, 0, N);
          if (Math.abs(pA - pB) > 0.01) return pA - pB;
          return a.id.localeCompare(b.id);
        });

        // Distribute uniformly across the 2*PI circumference
        sorted.forEach((obj, k) => {
          const angle = (shellPhase + (2 * Math.PI * k) / N) % (2 * Math.PI);
          const radius = getRadiusForAltitude(obj.altitude);
          const x = cx + radius * Math.cos(angle);
          const y = cy + radius * Math.sin(angle);
          assignedCoords.set(obj.id, { x, y, angle, radius });
        });
      });

      // Step C: Compile GraphNode array with coordinates
      objects.forEach((obj) => {
        const coords = assignedCoords.get(obj.id);
        if (!coords) return;

        const conjs = objectConjunctionsMap.get(obj.id) || [];
        let maxPc = 0;
        let nodeRisk: "NOMINAL" | "ELEVATED" | "CRITICAL" = "NOMINAL";

        conjs.forEach((c) => {
          if (c.collisionProbability > maxPc) maxPc = c.collisionProbability;
          if (c.riskLevel === "critical") nodeRisk = "CRITICAL";
          else if (c.riskLevel === "elevated" && nodeRisk !== "CRITICAL") nodeRisk = "ELEVATED";
        });

        const node: GraphNode = {
          id: obj.id,
          kind: "object",
          name: obj.name,
          type: obj.type,
          altitude: obj.altitude,
          shellId: obj.shellId,
          risk: nodeRisk,
          x: coords.x,
          y: coords.y,
          rawObject: obj,
          conjunctionCount: conjs.length,
          maxPc,
        };

        calculatedNodes.push(node);
        nodePositionMap.set(obj.id, { x: coords.x, y: coords.y });
      });
    } else {
      // CONJUNCTION_CLUSTER Mode: Group by active conjunction pairings in radial clusters
      const processedPairs = new Set<string>();
      let clusterIndex = 0;
      const clusterRadius = 340;
      const maxClusters = Math.min(conjunctions.length, 14);

      conjunctions.slice(0, 16).forEach((conj) => {
        const primary = objectsMap.get(conj.primaryObjectId);
        const secondary = objectsMap.get(conj.secondaryObjectId);
        if (!primary || !secondary) return;

        const clusterAngle = (2 * Math.PI * clusterIndex) / Math.max(maxClusters, 1);
        const clusterCenterX = cx + clusterRadius * Math.cos(clusterAngle);
        const clusterCenterY = cy + clusterRadius * Math.sin(clusterAngle);

        // Position pair offset around cluster center
        const offset = 32;
        const p1x = clusterCenterX - offset * Math.cos(clusterAngle);
        const p1y = clusterCenterY - offset * Math.sin(clusterAngle);
        const p2x = clusterCenterX + offset * Math.cos(clusterAngle);
        const p2y = clusterCenterY + offset * Math.sin(clusterAngle);

        if (!nodePositionMap.has(primary.id)) {
          nodePositionMap.set(primary.id, { x: p1x, y: p1y });
          calculatedNodes.push({
            id: primary.id,
            kind: "object",
            name: primary.name,
            type: primary.type,
            altitude: primary.altitude,
            shellId: primary.shellId,
            risk: conj.riskLevel === "critical" ? "CRITICAL" : "ELEVATED",
            x: p1x,
            y: p1y,
            rawObject: primary,
            conjunctionCount: 1,
            maxPc: conj.collisionProbability,
          });
        }

        if (!nodePositionMap.has(secondary.id)) {
          nodePositionMap.set(secondary.id, { x: p2x, y: p2y });
          calculatedNodes.push({
            id: secondary.id,
            kind: "object",
            name: secondary.name,
            type: secondary.type,
            altitude: secondary.altitude,
            shellId: secondary.shellId,
            risk: conj.riskLevel === "critical" ? "CRITICAL" : "ELEVATED",
            x: p2x,
            y: p2y,
            rawObject: secondary,
            conjunctionCount: 1,
            maxPc: conj.collisionProbability,
          });
        }

        clusterIndex++;
      });

      // Disperse remaining non-conjunction objects around periphery
      objects.forEach((obj, idx) => {
        if (!nodePositionMap.has(obj.id)) {
          const angle = (2 * Math.PI * idx) / objects.length;
          const r = 500;
          const x = cx + r * Math.cos(angle);
          const y = cy + r * Math.sin(angle);
          nodePositionMap.set(obj.id, { x, y });
          calculatedNodes.push({
            id: obj.id,
            kind: "object",
            name: obj.name,
            type: obj.type,
            altitude: obj.altitude,
            shellId: obj.shellId,
            risk: "NOMINAL",
            x,
            y,
            rawObject: obj,
            conjunctionCount: 0,
            maxPc: 0,
          });
        }
      });
    }

    // 3. Generate Links between connected nodes
    const calculatedLinks: GraphLink[] = [];

    // Real Conjunction Links
    conjunctions.forEach((conj) => {
      const p1 = nodePositionMap.get(conj.primaryObjectId);
      const p2 = nodePositionMap.get(conj.secondaryObjectId);
      if (p1 && p2) {
        calculatedLinks.push({
          id: conj.id,
          sourceId: conj.primaryObjectId,
          targetId: conj.secondaryObjectId,
          sourceX: p1.x,
          sourceY: p1.y,
          targetX: p2.x,
          targetY: p2.y,
          type: "conjunction",
          riskLevel: conj.riskLevel,
          collisionProbability: conj.collisionProbability,
          missDistance: conj.missDistance,
          tca: conj.tca,
          conjunction: conj,
        });
      }
    });

    return {
      nodes: calculatedNodes,
      links: calculatedLinks,
      shellRings: rings,
      center: centerPoint,
    };
  }, [objects, conjunctions, shells, viewMode, objectConjunctionsMap, objectsMap, filterType]);

  // Filtered nodes according to search and filter criteria
  const filteredNodes = useMemo(() => {
    return nodes.filter((node) => {
      // Type Filter
      if (filterType !== "ALL") {
        if (filterType === "CRITICAL_THREATS" && node.risk !== "CRITICAL") return false;
        if (filterType === "SATELLITE" && node.type !== "satellite") return false;
        if (filterType === "DEBRIS" && node.type !== "debris") return false;
        if (filterType === "ROCKET_BODY" && node.type !== "rocket_body") return false;
        if (filterType === "SHELL" && node.kind !== "shell") return false;
      }

      // Shell Filter
      if (selectedShellFilter !== "ALL" && node.shellId !== selectedShellFilter) {
        return false;
      }

      // Search Query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesName = node.name.toLowerCase().includes(q);
        const matchesId = node.id.toLowerCase().includes(q);
        const matchesNorad = node.rawObject?.noradId?.toString().includes(q);
        const matchesShell = node.shellId.toLowerCase().includes(q);
        return matchesName || matchesId || matchesNorad || matchesShell;
      }

      return true;
    });
  }, [nodes, filterType, selectedShellFilter, searchQuery]);

  // Selected Node Details
  const selectedNode = useMemo(() => {
    if (!selectedNodeId) return null;
    return nodes.find((n) => n.id === selectedNodeId) || null;
  }, [selectedNodeId, nodes]);

  // Direct Conjunctions for Selected Node
  const selectedNodeConjunctions = useMemo(() => {
    if (!selectedNode || selectedNode.kind !== "object") return [];
    return objectConjunctionsMap.get(selectedNode.id) || [];
  }, [selectedNode, objectConjunctionsMap]);

  // Active Critical Conjunction Count
  const criticalConjunctionCount = useMemo(() => {
    return conjunctions.filter((c) => c.riskLevel === "critical").length;
  }, [conjunctions]);

  // Milestone altitude rings spaced at least 48px apart along radius to prevent any label collision
  const milestoneRings = useMemo(() => {
    const res: typeof shellRings = [];
    let lastRad = 0;
    shellRings.forEach((r) => {
      if (r.radius - lastRad >= 48) {
        res.push(r);
        lastRad = r.radius;
      }
    });
    return res;
  }, [shellRings]);

  // Zoom / Pan handlers
  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    const zoomFactor = e.deltaY < 0 ? 1.1 : 0.9;
    setZoom((prev) => Math.min(Math.max(prev * zoomFactor, 0.4), 3.0));
  }, []);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button !== 0) return; // only left click
    setIsDragging(true);
    dragStartRef.current = { x: e.clientX - pan.x, y: e.clientY - pan.y };
  }, [pan]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isDragging) return;
    setPan({
      x: e.clientX - dragStartRef.current.x,
      y: e.clientY - dragStartRef.current.y,
    });
  }, [isDragging]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  const resetView = () => {
    setZoom(1.0);
    setPan({ x: 0, y: 0 });
  };

  const centerOnSelected = () => {
    if (!selectedNode) return;
    setPan({
      x: 800 - selectedNode.x,
      y: 600 - selectedNode.y,
    });
    setZoom(1.4);
  };

  // Icon selector helper
  const getNodeIcon = (type: string, kind: string) => {
    if (kind === "shell") return <Layers className="h-3.5 w-3.5" />;
    switch (type) {
      case "satellite": return <Boxes className="h-3.5 w-3.5 text-emerald-400" />;
      case "debris": return <AlertTriangle className="h-3.5 w-3.5 text-rose-400" />;
      case "rocket_body": return <Orbit className="h-3.5 w-3.5 text-amber-400" />;
      default: return <Radio className="h-3.5 w-3.5 text-cyan-400" />;
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] w-full overflow-hidden bg-background font-sans">
      {/* Top Controls HUD Bar */}
      <header className="h-14 border-b border-border flex items-center justify-between px-5 bg-card/95 backdrop-blur-md shrink-0 shadow-xs z-20">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-foreground/10 text-foreground border border-border">
            <Network className="h-4 w-4" />
          </div>
          <div>
            <h1 className="font-bold text-sm tracking-tight text-foreground flex items-center gap-2">
              Orbital Object Graph
              <span className="flex h-2 w-2 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
              </span>
            </h1>
          </div>
          <Badge variant="outline" className="text-[10px] text-emerald-500 border-emerald-500/30 bg-emerald-500/10 font-mono hidden sm:inline-flex items-center gap-1.5">
            <span>{objects.length} BODIES</span>
            <span>•</span>
            <span>{conjunctions.length} CONJUNCTIONS</span>
            {criticalConjunctionCount > 0 && (
              <>
                <span>•</span>
                <span className="text-rose-500 font-bold animate-pulse">
                  {criticalConjunctionCount} CRITICAL
                </span>
              </>
            )}
          </Badge>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          {/* Search Box */}
          <div className="relative w-44 sm:w-56">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search catalog, NORAD..."
              className="pl-8 pr-7 py-1 h-8 text-xs bg-muted/40 border-border font-mono placeholder:text-muted-foreground"
            />
            {searchQuery && (
              <button 
                onClick={() => setSearchQuery("")}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <X className="h-3 w-3" />
              </button>
            )}
          </div>

          {/* View Mode Toggle */}
          <div className="flex items-center bg-muted/40 p-0.5 rounded-lg border border-border">
            <button
              onClick={() => setViewMode("RADIAL")}
              title="Radial Astrodynamics View"
              className={`px-2.5 py-1 text-[11px] font-mono font-medium rounded-md transition-all flex items-center gap-1.5 ${
                viewMode === "RADIAL"
                  ? "bg-foreground text-background shadow-xs font-bold"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Radar className="h-3 w-3" />
              <span className="hidden md:inline">RADIAL</span>
            </button>
            <button
              onClick={() => setViewMode("CONJUNCTION_CLUSTER")}
              title="Conjunction Threat Cluster View"
              className={`px-2.5 py-1 text-[11px] font-mono font-medium rounded-md transition-all flex items-center gap-1.5 ${
                viewMode === "CONJUNCTION_CLUSTER"
                  ? "bg-foreground text-background shadow-xs font-bold"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Crosshair className="h-3 w-3" />
              <span className="hidden md:inline">CLUSTERS</span>
            </button>
          </div>

          {/* Type Filter Buttons */}
          <div className="hidden lg:flex items-center gap-1 bg-muted/40 p-1 rounded-lg border border-border">
            {[
              { id: "ALL", label: "ALL" },
              { id: "SATELLITE", label: "SATS" },
              { id: "DEBRIS", label: "DEBRIS" },
              { id: "ROCKET_BODY", label: "ROCKETS" },
              { id: "SHELL", label: "SHELLS" },
              { id: "CRITICAL_THREATS", label: "THREATS" },
            ].map((filter) => (
              <button
                key={filter.id}
                type="button"
                onClick={() => setFilterType(filter.id)}
                className={`px-2 py-0.5 text-[10px] font-mono font-semibold rounded transition-colors ${
                  filterType === filter.id
                    ? filter.id === "CRITICAL_THREATS"
                      ? "bg-rose-600 text-white shadow-xs"
                      : "bg-foreground text-background shadow-xs"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {filter.label}
              </button>
            ))}
          </div>
        </div>
      </header>

      {/* Main Canvas Area */}
      <div className="flex flex-1 overflow-hidden relative">
        <div 
          ref={containerRef}
          onWheel={handleWheel}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          className={`flex-1 relative bg-black overflow-hidden select-none cursor-grab ${
            isDragging ? "cursor-grabbing" : ""
          }`}
        >
          {/* Deep Space Background Grid */}
          <div 
            className="absolute inset-0 opacity-15 pointer-events-none"
            style={{
              backgroundImage: "radial-gradient(circle, #71717a 1px, transparent 1px)",
              backgroundSize: "32px 32px",
            }}
          />

          {/* SVG Interactive Astrodynamics Layer */}
          <svg 
            className="absolute inset-0 w-full h-full pointer-events-none"
            viewBox="0 0 1600 1200"
            preserveAspectRatio="xMidYMid meet"
          >
            <g 
              style={{
                transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
                transformOrigin: "800px 600px",
                transition: isDragging ? "none" : "transform 0.1s ease-out",
              }}
            >
              {/* Radial Astrodynamics Orbits & Earth */}
              {viewMode === "RADIAL" && (
                <>
                  {/* Concentric Orbital Shell Rings */}
                  {shellRings.map((ring) => {
                    const isHovered = hoveredShellId === ring.shellId;
                    const isSelected = selectedNode?.kind === "shell" && selectedNode?.shellId === ring.shellId;
                    return (
                      <g 
                        key={ring.shellId} 
                        className="cursor-pointer pointer-events-auto transition-all"
                        onMouseEnter={() => setHoveredShellId(ring.shellId)}
                        onMouseLeave={() => setHoveredShellId(null)}
                        onClick={() => {
                          setSelectedNodeId(`SHELL_${ring.shellId}`);
                          setSelectedConjunctionId(null);
                        }}
                      >
                        <circle
                          cx={center.x}
                          cy={center.y}
                          r={ring.radius}
                          fill="none"
                          stroke={
                            isSelected
                              ? "#818cf8"
                              : isHovered
                              ? "#e4e4e7"
                              : ring.isCritical
                              ? "rgba(244, 63, 94, 0.45)"
                              : "rgba(63, 63, 70, 0.35)"
                          }
                          strokeWidth={isSelected ? "2.5" : isHovered ? "2.0" : ring.isCritical ? "1.5" : "0.75"}
                          strokeDasharray={ring.isCritical ? "6 6" : "3 5"}
                          className={ring.isCritical ? "animate-pulse" : ""}
                        />
                      </g>
                    );
                  })}

                  {/* Clean Milestone Altitude Scale along the top radial axis - ZERO overlapping! */}
                  {milestoneRings.map((ring) => (
                    <g key={`scale_${ring.shellId}`} className="pointer-events-none select-none">
                      <line
                        x1={center.x - 8}
                        y1={center.y - ring.radius}
                        x2={center.x + 8}
                        y2={center.y - ring.radius}
                        stroke="#71717a"
                        strokeWidth="1"
                        strokeOpacity="0.8"
                      />
                      <rect
                        x={center.x - 44}
                        y={center.y - ring.radius - 8}
                        width="88"
                        height="16"
                        rx="3"
                        fill="#09090b"
                        fillOpacity="0.85"
                        stroke={ring.isCritical ? "#f43f5e" : "#3f3f46"}
                        strokeWidth="0.75"
                      />
                      <text
                        x={center.x}
                        y={center.y - ring.radius + 3.5}
                        fill={ring.isCritical ? "#f43f5e" : "#a1a1aa"}
                        fontSize="8.5"
                        textAnchor="middle"
                        className="font-mono font-bold"
                      >
                        {Math.round(ring.avgAlt)} km {ring.isCritical ? "⚠️ R₀>1" : ""}
                      </text>
                    </g>
                  ))}

                  {/* Earth Core Graphic */}
                  <g>
                    {/* Atmospheric Glow */}
                    <circle
                      cx={center.x}
                      cy={center.y}
                      r="130"
                      fill="url(#earthAtmosphere)"
                      className="opacity-75"
                    />
                    {/* Earth Body */}
                    <circle
                      cx={center.x}
                      cy={center.y}
                      r="110"
                      fill="#090d16"
                      stroke="#1e3a8a"
                      strokeWidth="2"
                    />
                    {/* Earth Lat/Long Contours */}
                    <ellipse
                      cx={center.x}
                      cy={center.y}
                      rx="110"
                      ry="40"
                      fill="none"
                      stroke="#1e40af"
                      strokeWidth="1"
                      strokeDasharray="4 4"
                      opacity="0.4"
                    />
                    <ellipse
                      cx={center.x}
                      cy={center.y}
                      rx="40"
                      ry="110"
                      fill="none"
                      stroke="#1e40af"
                      strokeWidth="1"
                      strokeDasharray="4 4"
                      opacity="0.4"
                    />
                    <text
                      x={center.x}
                      y={center.y - 8}
                      fill="#93c5fd"
                      fontSize="11"
                      fontWeight="bold"
                      textAnchor="middle"
                      className="font-mono tracking-widest"
                    >
                      EARTH
                    </text>
                    <text
                      x={center.x}
                      y={center.y + 10}
                      fill="#60a5fa"
                      fontSize="8"
                      textAnchor="middle"
                      className="font-mono tracking-wider opacity-70"
                    >
                      WGS-84 CORE
                    </text>
                  </g>
                </>
              )}

              {/* Defs for gradients & glowing filters */}
              <defs>
                <radialGradient id="earthAtmosphere" cx="50%" cy="50%" r="50%">
                  <stop offset="60%" stopColor="#1e3a8a" stopOpacity="0.4" />
                  <stop offset="90%" stopColor="#38bdf8" stopOpacity="0.15" />
                  <stop offset="100%" stopColor="#000000" stopOpacity="0" />
                </radialGradient>
                <linearGradient id="criticalLinkGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#f43f5e" />
                  <stop offset="100%" stopColor="#fb7185" />
                </linearGradient>
              </defs>

              {/* Conjunction Threat Links */}
              {links.map((link, linkIdx) => {
                const isSelected = 
                  selectedNodeId === link.sourceId || 
                  selectedNodeId === link.targetId ||
                  selectedConjunctionId === link.id;

                const isHovered =
                  hoveredNodeId === link.sourceId ||
                  hoveredNodeId === link.targetId ||
                  hoveredConjunctionId === link.id;

                const isCritical = link.riskLevel === "critical";
                const isElevated = link.riskLevel === "elevated";

                const strokeColor = isCritical 
                  ? "#f43f5e" 
                  : isElevated 
                  ? "#f59e0b" 
                  : "#0284c7";

                const invZoom = 1 / Math.max(zoom, 0.4);
                const strokeWidth = ((isSelected || isHovered) ? 2.0 : isCritical ? 1.4 : 0.8) * invZoom;

                // Only show midpoint badge when selected or hovered
                const showBadge = isSelected || isHovered;

                // Midpoint placement along the threat line
                const staggerT = 0.45 + ((linkIdx % 2) * 0.1);
                const badgeX = link.sourceX + (link.targetX - link.sourceX) * staggerT;
                const badgeY = link.sourceY + (link.targetY - link.sourceY) * staggerT;

                return (
                  <g 
                    key={link.id} 
                    className="cursor-pointer pointer-events-auto"
                    onMouseEnter={() => setHoveredConjunctionId(link.id)}
                    onMouseLeave={() => setHoveredConjunctionId(null)}
                    onClick={() => {
                      setSelectedConjunctionId(link.id);
                      setSelectedNodeId(link.sourceId);
                    }}
                  >
                    {/* Wider hit area for hovering and clicking */}
                    <line
                      x1={link.sourceX}
                      y1={link.sourceY}
                      x2={link.targetX}
                      y2={link.targetY}
                      stroke="transparent"
                      strokeWidth={14 * invZoom}
                    />
                    {/* Pulsing glow for critical or selected pairings */}
                    {(isCritical || isSelected) && (
                      <line
                        x1={link.sourceX}
                        y1={link.sourceY}
                        x2={link.targetX}
                        y2={link.targetY}
                        stroke={strokeColor}
                        strokeWidth={strokeWidth + (3 * invZoom)}
                        strokeOpacity={isSelected ? 0.35 : 0.2}
                        strokeLinecap="round"
                        className={isCritical ? "animate-pulse" : ""}
                      />
                    )}
                    {/* Main threat vector line */}
                    <line
                      x1={link.sourceX}
                      y1={link.sourceY}
                      x2={link.targetX}
                      y2={link.targetY}
                      stroke={strokeColor}
                      strokeWidth={strokeWidth}
                      strokeDasharray={`${5 * invZoom} ${3.5 * invZoom}`}
                      strokeOpacity={isSelected || isHovered ? 1.0 : 0.6}
                      className={isCritical ? "animate-pulse" : ""}
                    />
                    {/* Midpoint Conjunction Badge - ONLY shown when selected or hovered */}
                    {showBadge && (
                      <g 
                        transform={`translate(${badgeX}, ${badgeY}) scale(${invZoom})`}
                        className="pointer-events-none"
                      >
                        <rect
                          x="-30"
                          y="-8"
                          width="60"
                          height="16"
                          rx="3"
                          fill="#09090b"
                          fillOpacity="0.95"
                          stroke={strokeColor}
                          strokeWidth="1.0"
                        />
                        <text
                          x="0"
                          y="3"
                          fill={strokeColor}
                          fontSize="7"
                          fontWeight="bold"
                          textAnchor="middle"
                          fontFamily="monospace"
                        >
                          {link.collisionProbability ? `Pc: ${link.collisionProbability.toExponential(1)}` : "TCA PAIR"}
                        </text>
                      </g>
                    )}
                  </g>
                );
              })}

              {/* Native SVG Nodes Layer - Mission Control Aerospace Vector Radar Symbology */}
              {filteredNodes.map((node) => {
                const isSelected = selectedNodeId === node.id;
                const isHovered = hoveredNodeId === node.id;
                const isCritical = node.risk === "CRITICAL";
                const isElevated = node.risk === "ELEVATED";

                // Scale compensation: Elements stay crisp & fixed in screen pixels when zooming in!
                const invZoom = 1 / Math.max(zoom, 0.4);

                // Tactical color palette: Cyan for satellites, Crimson for debris, Amber for rocket bodies
                const glyphColor = node.type === "satellite" 
                  ? "#38bdf8" 
                  : node.type === "debris" 
                  ? "#f43f5e" 
                  : "#f59e0b";

                return (
                  <g
                    key={node.id}
                    className="cursor-pointer pointer-events-auto"
                    onMouseEnter={() => setHoveredNodeId(node.id)}
                    onMouseLeave={() => setHoveredNodeId(null)}
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedNodeId(node.id);
                      setSelectedConjunctionId(null);
                    }}
                  >
                    {/* Invisible 20px hit area for easy click & hover */}
                    <circle cx={node.x} cy={node.y} r={12 * invZoom} fill="transparent" />

                    {/* Critical Pulsing Outer Hazard Reticle */}
                    {isCritical && (
                      <circle
                        cx={node.x}
                        cy={node.y}
                        r={8.5 * invZoom}
                        fill="none"
                        stroke="#f43f5e"
                        strokeWidth={0.8 * invZoom}
                        strokeDasharray={`${2.5 * invZoom} ${2.5 * invZoom}`}
                        className="animate-pulse"
                      />
                    )}

                    {/* Target Acquisition Corner Brackets for Selected Node */}
                    {isSelected && (
                      <g className="pointer-events-none">
                        {/* Top-Left Bracket */}
                        <path
                          d={`M ${node.x - 9 * invZoom} ${node.y - 4 * invZoom} L ${node.x - 9 * invZoom} ${node.y - 9 * invZoom} L ${node.x - 4 * invZoom} ${node.y - 9 * invZoom}`}
                          fill="none"
                          stroke="#38bdf8"
                          strokeWidth={1.4 * invZoom}
                        />
                        {/* Top-Right Bracket */}
                        <path
                          d={`M ${node.x + 4 * invZoom} ${node.y - 9 * invZoom} L ${node.x + 9 * invZoom} ${node.y - 9 * invZoom} L ${node.x + 9 * invZoom} ${node.y - 4 * invZoom}`}
                          fill="none"
                          stroke="#38bdf8"
                          strokeWidth={1.4 * invZoom}
                        />
                        {/* Bottom-Left Bracket */}
                        <path
                          d={`M ${node.x - 9 * invZoom} ${node.y + 4 * invZoom} L ${node.x - 9 * invZoom} ${node.y + 9 * invZoom} L ${node.x - 4 * invZoom} ${node.y + 9 * invZoom}`}
                          fill="none"
                          stroke="#38bdf8"
                          strokeWidth={1.4 * invZoom}
                        />
                        {/* Bottom-Right Bracket */}
                        <path
                          d={`M ${node.x + 4 * invZoom} ${node.y + 9 * invZoom} L ${node.x + 9 * invZoom} ${node.y + 9 * invZoom} L ${node.x + 9 * invZoom} ${node.y + 4 * invZoom}`}
                          fill="none"
                          stroke="#38bdf8"
                          strokeWidth={1.4 * invZoom}
                        />
                      </g>
                    )}

                    {/* Precision Vector Radar Glyph */}
                    {node.type === "satellite" ? (
                      /* Operational Satellite: Cyan hollow precision ring with pinpoint core */
                      <g>
                        <circle
                          cx={node.x}
                          cy={node.y}
                          r={4.0 * invZoom}
                          fill="rgba(56, 189, 248, 0.12)"
                          stroke={isSelected ? "#ffffff" : isCritical ? "#f43f5e" : glyphColor}
                          strokeWidth={0.9 * invZoom}
                        />
                        <circle
                          cx={node.x}
                          cy={node.y}
                          r={1.8 * invZoom}
                          fill={isSelected ? "#ffffff" : isCritical ? "#f43f5e" : glyphColor}
                        />
                      </g>
                    ) : node.type === "debris" ? (
                      /* Debris: Razor-sharp hazard diamond */
                      <g>
                        <polygon
                          points={`
                            ${node.x},${node.y - 4.5 * invZoom} 
                            ${node.x + 4.5 * invZoom},${node.y} 
                            ${node.x},${node.y + 4.5 * invZoom} 
                            ${node.x - 4.5 * invZoom},${node.y}
                          `}
                          fill="rgba(244, 63, 94, 0.20)"
                          stroke={isSelected ? "#ffffff" : glyphColor}
                          strokeWidth={1.0 * invZoom}
                        />
                        <circle
                          cx={node.x}
                          cy={node.y}
                          r={1.2 * invZoom}
                          fill={isSelected ? "#ffffff" : glyphColor}
                        />
                      </g>
                    ) : (
                      /* Rocket Body: Tactical hollow square */
                      <g>
                        <rect
                          x={node.x - 3.5 * invZoom}
                          y={node.y - 3.5 * invZoom}
                          width={7 * invZoom}
                          height={7 * invZoom}
                          rx={1.0 * invZoom}
                          fill="rgba(245, 158, 11, 0.15)"
                          stroke={isSelected ? "#ffffff" : glyphColor}
                          strokeWidth={1.0 * invZoom}
                        />
                        <circle
                          cx={node.x}
                          cy={node.y}
                          r={1.2 * invZoom}
                          fill={isSelected ? "#ffffff" : glyphColor}
                        />
                      </g>
                    )}

                    {/* Tactical Hover Tooltip - Clean, compact, scale-invariant */}
                    {isHovered && !isSelected && (
                      <g transform={`translate(${node.x}, ${node.y - 14 * invZoom}) scale(${invZoom})`} className="pointer-events-none">
                        <rect
                          x="-55"
                          y="-16"
                          width="110"
                          height="16"
                          rx="3"
                          fill="#09090b"
                          fillOpacity="0.95"
                          stroke={isCritical ? "#f43f5e" : "#38bdf8"}
                          strokeWidth="0.9"
                        />
                        <text
                          y="-5"
                          textAnchor="middle"
                          fill="#e0f2fe"
                          fontSize="7.5"
                          fontWeight="bold"
                          fontFamily="monospace"
                        >
                          {node.name.length > 13 ? node.name.slice(0, 12) + '…' : node.name} // {Math.round(node.altitude)}km
                        </text>
                      </g>
                    )}

                    {/* Selected Node Compact Target Tag */}
                    {isSelected && (
                      <g transform={`translate(${node.x}, ${node.y - 12 * invZoom}) scale(${invZoom})`} className="pointer-events-auto">
                        <line x1="0" y1="0" x2="0" y2="-6" stroke="#38bdf8" strokeWidth="1.2" />
                        <rect
                          x="-75"
                          y="-36"
                          width="150"
                          height="30"
                          rx="4"
                          fill="#09090b"
                          fillOpacity="0.95"
                          stroke={isCritical ? "#f43f5e" : isElevated ? "#f59e0b" : "#38bdf8"}
                          strokeWidth="1.2"
                        />
                        <text
                          x="-68"
                          y="-22"
                          fill="#ffffff"
                          fontSize="9"
                          fontWeight="bold"
                          fontFamily="monospace"
                        >
                          {node.name.length > 15 ? node.name.slice(0, 14) + '…' : node.name}
                        </text>
                        <text
                          x="-68"
                          y="-10"
                          fill="#94a3b8"
                          fontSize="7"
                          fontFamily="monospace"
                        >
                          {Math.round(node.altitude)} KM • {node.type.toUpperCase()} • {node.risk}
                        </text>
                      </g>
                    )}
                  </g>
                );
              })}
            </g>
          </svg>

          {/* Floating Canvas Legend (Bottom Left) */}
          <div className="absolute bottom-4 left-4 z-20 flex flex-wrap items-center gap-3 p-2.5 rounded-lg bg-card/90 border border-border text-[11px] text-foreground backdrop-blur-md font-mono shadow-lg">
            <span className="flex items-center gap-1.5">
              <div className="w-2.5 h-2.5 rounded-full border border-sky-400 bg-sky-400/20" />
              Active Satellite ({objects.filter(o => o.type === "satellite").length})
            </span>
            <span className="flex items-center gap-1.5">
              <div className="w-2.5 h-2.5 rotate-45 border border-rose-500 bg-rose-500/30" />
              Lethal Debris ({objects.filter(o => o.type === "debris").length})
            </span>
            <span className="flex items-center gap-1.5">
              <div className="w-2.5 h-2.5 border border-amber-500 bg-amber-500/20" />
              Rocket Body ({objects.filter(o => o.type === "rocket_body").length})
            </span>
            <span className="flex items-center gap-1.5">
              <div className="w-2.5 h-2.5 rounded-full bg-indigo-500" />
              Orbital Shell ({shells.length})
            </span>
            <span className="flex items-center gap-1.5 border-l border-border pl-2">
              <div className="w-3 h-0.5 bg-rose-500 animate-pulse" />
              Conjunction Vector ({conjunctions.length})
            </span>
          </div>

          {/* Floating Canvas Zoom & Pan Controls (Bottom Right) */}
          <div className="absolute bottom-4 right-4 z-20 flex items-center gap-1 p-1 rounded-lg bg-card/90 border border-border backdrop-blur-md shadow-lg font-mono text-xs">
            <button
              onClick={() => setZoom((z) => Math.min(z + 0.2, 3.0))}
              title="Zoom In"
              className="p-1.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
            >
              <ZoomIn className="h-4 w-4" />
            </button>
            <button
              onClick={() => setZoom((z) => Math.max(z - 0.2, 0.4))}
              title="Zoom Out"
              className="p-1.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
            >
              <ZoomOut className="h-4 w-4" />
            </button>
            <button
              onClick={resetView}
              title="Reset View"
              className="p-1.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
            >
              <RotateCcw className="h-4 w-4" />
            </button>
            {selectedNode && (
              <button
                onClick={centerOnSelected}
                title="Center on Selected Node"
                className="p-1.5 rounded hover:bg-muted text-foreground transition-colors border-l border-border pl-2"
              >
                <Crosshair className="h-4 w-4 text-sky-400" />
              </button>
            )}
          </div>
        </div>

        {/* Right Telemetry Inspector Drawer */}
        {selectedNode && (
          <aside className="w-84 sm:w-96 border-l border-border bg-card flex flex-col shadow-2xl z-20 overflow-y-auto animate-in slide-in-from-right-3 duration-200">
            {/* Drawer Header */}
            <div className="p-4 border-b border-border flex items-center justify-between sticky top-0 bg-card/95 backdrop-blur-md z-10">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded bg-foreground/10 text-foreground">
                  {getNodeIcon(selectedNode.type, selectedNode.kind)}
                </div>
                <div>
                  <h3 className="font-bold text-sm text-foreground">
                    {selectedNode.kind === "shell" ? "Orbital Shell Telemetry" : "Object Telemetry"}
                  </h3>
                  <p className="text-[10px] font-mono text-muted-foreground uppercase">
                    ASTRODYNAMICS & RISK PROFILE
                  </p>
                </div>
              </div>
              <button 
                onClick={() => setSelectedNodeId(null)}
                className="p-1.5 rounded-md hover:bg-muted text-muted-foreground transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Drawer Content */}
            <div className="p-4 space-y-5">
              {/* Primary Identity Badge & Title */}
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Badge variant="outline" className="text-[10px] font-mono font-bold uppercase">
                    {selectedNode.type.replace("_", " ")}
                  </Badge>
                  <Badge 
                    className={`text-[10px] font-mono font-bold uppercase ${
                      selectedNode.risk === "CRITICAL"
                        ? "bg-rose-600 text-white"
                        : selectedNode.risk === "ELEVATED"
                        ? "bg-amber-600 text-white"
                        : "bg-emerald-600 text-white"
                    }`}
                  >
                    {selectedNode.risk} RISK
                  </Badge>
                </div>
                <h2 className="text-xl font-bold text-foreground leading-tight">{selectedNode.name}</h2>
                <p className="text-xs font-mono text-muted-foreground uppercase tracking-wider mt-0.5">
                  ID: {selectedNode.id}
                </p>
              </div>

              {/* Specific Object Metrics */}
              {selectedNode.rawObject && (
                <>
                  {/* Astrodynamics Quick Grid */}
                  <div className="grid grid-cols-2 gap-2 font-mono text-xs">
                    <div className="p-2.5 rounded-lg border border-border bg-muted/20">
                      <p className="text-[10px] text-muted-foreground uppercase">NORAD Catalog</p>
                      <p className="text-sm font-bold text-foreground mt-0.5">
                        {selectedNode.rawObject.noradId}
                      </p>
                    </div>
                    <div className="p-2.5 rounded-lg border border-border bg-muted/20">
                      <p className="text-[10px] text-muted-foreground uppercase">Orbital Altitude</p>
                      <p className="text-sm font-bold text-foreground mt-0.5">
                        {selectedNode.rawObject.altitude.toFixed(1)} km
                      </p>
                    </div>
                    <div className="p-2.5 rounded-lg border border-border bg-muted/20">
                      <p className="text-[10px] text-muted-foreground uppercase">Shell Band</p>
                      <p className="text-xs font-bold text-foreground mt-0.5 truncate">
                        {selectedNode.rawObject.shellId}
                      </p>
                    </div>
                    <div className="p-2.5 rounded-lg border border-border bg-muted/20">
                      <p className="text-[10px] text-muted-foreground uppercase">Velocity (ECI)</p>
                      <p className="text-xs font-bold text-foreground mt-0.5">
                        {formatVelocity(
                          Math.sqrt(
                            Math.pow(selectedNode.rawObject.velocity.vx, 2) +
                            Math.pow(selectedNode.rawObject.velocity.vy, 2) +
                            Math.pow(selectedNode.rawObject.velocity.vz, 2)
                          )
                        )}
                      </p>
                    </div>
                  </div>

                  {/* Keplerian Elements Card */}
                  {selectedNode.rawObject.orbitalElements && (
                    <div className="p-3 rounded-lg border border-border bg-muted/10 space-y-1.5 font-mono text-xs">
                      <h4 className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center justify-between">
                        <span>Keplerian Orbital Elements</span>
                        <Orbit className="h-3.5 w-3.5 text-muted-foreground" />
                      </h4>
                      <div className="grid grid-cols-3 gap-2 pt-1 text-[11px]">
                        <div>
                          <span className="text-muted-foreground text-[10px] block">Inclination</span>
                          <span className="font-semibold text-foreground">
                            {selectedNode.rawObject.orbitalElements.inclination.toFixed(2)}°
                          </span>
                        </div>
                        <div>
                          <span className="text-muted-foreground text-[10px] block">Eccentricity</span>
                          <span className="font-semibold text-foreground">
                            {selectedNode.rawObject.orbitalElements.eccentricity.toFixed(4)}
                          </span>
                        </div>
                        <div>
                          <span className="text-muted-foreground text-[10px] block">Semi-Major Axis</span>
                          <span className="font-semibold text-foreground">
                            {selectedNode.rawObject.orbitalElements.semiMajorAxis.toFixed(0)} km
                          </span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Connected Direct Conjunctions */}
                  <div className="space-y-2 font-mono text-xs">
                    <div className="flex items-center justify-between">
                      <h4 className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                        <Crosshair className="h-3.5 w-3.5 text-rose-500" />
                        Direct Conjunction Pairings ({selectedNodeConjunctions.length})
                      </h4>
                    </div>

                    {selectedNodeConjunctions.length === 0 ? (
                      <div className="p-3 rounded-lg border border-border bg-muted/10 text-muted-foreground text-center text-xs">
                        No active conjunction screening events flagged for this body.
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {selectedNodeConjunctions.map((conj) => {
                          const otherId = conj.primaryObjectId === selectedNode.id 
                            ? conj.secondaryObjectId 
                            : conj.primaryObjectId;
                          const otherObj = objectsMap.get(otherId);

                          const isCritical = conj.riskLevel === "critical";

                          return (
                            <div 
                              key={conj.id} 
                              className={`p-3 rounded-lg border transition-all ${
                                isCritical 
                                  ? "border-rose-500/50 bg-rose-950/20" 
                                  : "border-border bg-card hover:border-zinc-700"
                              }`}
                            >
                              <div className="flex items-start justify-between">
                                <div>
                                  <p className="font-bold text-foreground text-xs">
                                    {otherObj?.name || "Target Space Object"}
                                  </p>
                                  <p className="text-[10px] text-muted-foreground uppercase mt-0.5">
                                    {otherObj?.type} • NORAD: {otherObj?.noradId || "N/A"}
                                  </p>
                                </div>
                                <Badge 
                                  variant="outline" 
                                  className={`text-[10px] font-bold ${
                                    isCritical 
                                      ? "border-rose-500 text-rose-400 bg-rose-500/10" 
                                      : "border-amber-500 text-amber-400 bg-amber-500/10"
                                  }`}
                                >
                                  {formatScientificPc(conj.collisionProbability)}
                                </Badge>
                              </div>

                              <div className="grid grid-cols-2 gap-2 mt-2 pt-2 border-t border-border/60 text-[10px]">
                                <div>
                                  <span className="text-muted-foreground block">Miss Distance:</span>
                                  <span className="font-bold text-foreground">{formatDistance(conj.missDistance)}</span>
                                </div>
                                <div>
                                  <span className="text-muted-foreground block">Countdown TCA:</span>
                                  <span className="font-bold text-emerald-400">{formatCountdown(conj.tca, nowMs)}</span>
                                </div>
                              </div>

                              <div className="mt-2.5 flex items-center justify-end gap-2">
                                <Link href={`/cases/${conj.id}`}>
                                  <Button size="sm" variant="outline" className="h-6 text-[10px] font-mono">
                                    <Crosshair className="h-3 w-3 mr-1" />
                                    Review Case
                                  </Button>
                                </Link>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* Action Link: Dossier */}
                  <div className="pt-2">
                    <Link href={`/profiles/${selectedNode.id}`}>
                      <Button className="w-full text-xs font-semibold bg-foreground text-background">
                        <ExternalLink className="w-3.5 h-3.5 mr-1.5" />
                        View Full Object Dossier
                      </Button>
                    </Link>
                  </div>
                </>
              )}

              {/* Specific Shell Metrics */}
              {selectedNode.rawShell && (
                <>
                  <div className="p-3 rounded-lg border border-border bg-muted/20 space-y-2 font-mono text-xs">
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Altitude Band:</span>
                      <span className="font-bold text-foreground">
                        {selectedNode.rawShell.altitudeMin} - {selectedNode.rawShell.altitudeMax} km
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Kessler R₀ Reproduction:</span>
                      <span className={`font-bold ${
                        selectedNode.rawShell.r0 > 1.0 ? "text-rose-500 animate-pulse" : "text-emerald-400"
                      }`}>
                        {selectedNode.rawShell.r0.toFixed(2)} {selectedNode.rawShell.r0 > 1.0 ? "(CASCADE DANGER)" : "(STABLE)"}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Debris Density:</span>
                      <span className="font-bold text-foreground">
                        {selectedNode.rawShell.debrisDensity.toExponential(2)} / km³
                      </span>
                    </div>
                  </div>

                  {/* SIR Population breakdown */}
                  <div className="p-3 rounded-lg border border-border bg-muted/10 space-y-2 font-mono text-xs">
                    <h4 className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                      SIR Epidemic Population Breakdown
                    </h4>
                    <div className="grid grid-cols-3 gap-2 text-center pt-1">
                      <div className="p-2 rounded bg-muted/30">
                        <p className="text-[10px] text-muted-foreground">Susceptible</p>
                        <p className="text-sm font-bold text-foreground mt-0.5">
                          {selectedNode.rawShell.susceptibleCount}
                        </p>
                      </div>
                      <div className="p-2 rounded bg-rose-950/30 border border-rose-900/50">
                        <p className="text-[10px] text-rose-400">Infected</p>
                        <p className="text-sm font-bold text-rose-400 mt-0.5">
                          {selectedNode.rawShell.infectedCount}
                        </p>
                      </div>
                      <div className="p-2 rounded bg-muted/30">
                        <p className="text-[10px] text-muted-foreground">Removed</p>
                        <p className="text-sm font-bold text-foreground mt-0.5">
                          {selectedNode.rawShell.removedCount}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="pt-2">
                    <Link href="/analytics">
                      <Button className="w-full text-xs font-semibold bg-foreground text-background">
                        <Activity className="w-3.5 h-3.5 mr-1.5" />
                        Open Shell Cascade Analytics
                      </Button>
                    </Link>
                  </div>
                </>
              )}
            </div>
          </aside>
        )}
      </div>
    </div>
  );
}
