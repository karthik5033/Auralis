"use client";

import React, { useRef, useEffect, useState, useMemo, useCallback } from "react";
import {
  Radio,
  Layers,
  Satellite,
  ShieldAlert,
  Crosshair,
  Compass,
  Maximize2,
  Minimize2,
  ZoomIn,
  ZoomOut,
  Play,
  Pause,
  RotateCcw,
  Sparkles,
  Info,
  Sliders,
  Filter,
  Activity,
  AlertTriangle,
  Flame,
  Search,
  Eye
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { TrackedObject, ConjunctionEvent } from "@/types/contract";

interface PolarRadarViewProps {
  objects: TrackedObject[];
  conjunctions: ConjunctionEvent[];
  className?: string;
}

interface RadarNode {
  object: TrackedObject;
  azimuthDeg: number; // 0 to 360 deg
  radiusNormalized: number; // 0 (Earth core) to 1.0 (Outer ring)
  altitudeKm: number;
  x: number; // canvas pixels
  y: number;
  isConjunction: boolean;
  conjunctionRisk?: "critical" | "elevated" | "nominal";
  conjunctionPartnerName?: string;
  conjunctionMissKm?: number;
  conjunctionPc?: number;
  blipIntensity: number; // 0 to 1 for phosphor decay
}

export function PolarRadarView({
  objects,
  conjunctions,
  className = "",
}: PolarRadarViewProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Radar Controls State
  const [filterMode, setFilterMode] = useState<"all" | "conjunctions" | "satellites" | "debris">("conjunctions");
  const [rangeMode, setRangeMode] = useState<"leo_inner" | "leo_all" | "extended">("leo_all");
  const [isScanning, setIsScanning] = useState(true);
  const [scanSpeed, setScanSpeed] = useState<number>(1); // 1x, 2x, 4x
  const [selectedObjectId, setSelectedObjectId] = useState<string | null>(null);
  const [hoveredNode, setHoveredNode] = useState<RadarNode | null>(null);
  const [sweepAngleDeg, setSweepAngleDeg] = useState(0);
  const [searchQuery, setSearchQuery] = useState("");

  // Animation refs
  const sweepAngleRef = useRef(0);
  const lastTimeRef = useRef(0);
  const animFrameIdRef = useRef<number | null>(null);
  const radarNodesRef = useRef<RadarNode[]>([]);

  // Max altitude based on range mode
  const maxAltKm = useMemo(() => {
    switch (rangeMode) {
      case "leo_inner":
        return 700; // ISS to Starlink
      case "leo_all":
        return 1400; // Complete LEO up to OneWeb
      case "extended":
        return 2200; // MEO threshold
      default:
        return 1400;
    }
  }, [rangeMode]);

  // Conjunction map for fast lookup
  const conjMap = useMemo(() => {
    const map = new Map<string, { event: ConjunctionEvent; partnerId: string }>();
    for (const c of conjunctions) {
      map.set(c.primaryObjectId, { event: c, partnerId: c.secondaryObjectId });
      map.set(c.secondaryObjectId, { event: c, partnerId: c.primaryObjectId });
    }
    return map;
  }, [conjunctions]);

  // Map tracked objects into Polar radar coordinates
  const allRadarNodes = useMemo(() => {
    return objects.map((obj) => {
      // Calculate Azimuth (Right ascension / polar angle from state vectors or Keplerian RAAN + Mean Anomaly)
      let azimuthDeg = 0;
      if (obj.position && (obj.position.x !== 0 || obj.position.y !== 0)) {
        const rad = Math.atan2(obj.position.y, obj.position.x);
        azimuthDeg = ((rad * 180) / Math.PI + 360) % 360;
      } else if (obj.orbitalElements) {
        azimuthDeg = (obj.orbitalElements.raan + obj.orbitalElements.meanAnomaly) % 360;
      } else {
        // Fallback hash by NORAD ID
        azimuthDeg = (obj.noradId * 137.5) % 360;
      }

      // Radius normalized: Earth surface = 0.20, Max Alt = 0.92
      const minAlt = 150; // Karman line buffer
      const altClamped = Math.max(minAlt, Math.min(maxAltKm, obj.altitude || 500));
      const radiusNormalized = 0.22 + ((altClamped - minAlt) / (maxAltKm - minAlt)) * 0.70;

      const conjInfo = conjMap.get(obj.id);
      let isConjunction = false;
      let conjunctionRisk: "critical" | "elevated" | "nominal" | undefined;
      let conjunctionPartnerName: string | undefined;
      let conjunctionMissKm: number | undefined;
      let conjunctionPc: number | undefined;

      if (conjInfo) {
        isConjunction = true;
        conjunctionRisk = conjInfo.event.riskLevel;
        conjunctionMissKm = conjInfo.event.missDistance;
        conjunctionPc = conjInfo.event.collisionProbability;
        const partner = objects.find((o) => o.id === conjInfo.partnerId);
        conjunctionPartnerName = partner?.name || `NORAD-${conjInfo.partnerId.slice(0, 5)}`;
      }

      const node: RadarNode = {
        object: obj,
        azimuthDeg,
        radiusNormalized,
        altitudeKm: obj.altitude || 500,
        x: 0,
        y: 0,
        isConjunction,
        conjunctionRisk,
        conjunctionPartnerName,
        conjunctionMissKm,
        conjunctionPc,
        blipIntensity: 0.15,
      };

      return node;
    });
  }, [objects, conjMap, maxAltKm]);

  // Filter nodes based on active layer & search query
  const filteredNodes = useMemo(() => {
    return allRadarNodes.filter((node) => {
      // Search filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesName = node.object.name.toLowerCase().includes(q);
        const matchesNorad = node.object.noradId.toString().includes(q);
        const matchesShell = (node.object.shellId || "").toLowerCase().includes(q);
        if (!matchesName && !matchesNorad && !matchesShell) return false;
      }

      // Category Layer filter
      if (filterMode === "conjunctions") {
        return node.isConjunction;
      }
      if (filterMode === "satellites") {
        return node.object.type === "satellite";
      }
      if (filterMode === "debris") {
        return node.object.type === "debris" || node.object.type === "rocket_body";
      }
      return true;
    });
  }, [allRadarNodes, filterMode, searchQuery]);

  radarNodesRef.current = filteredNodes;

  // Currently selected node object
  const selectedNode = useMemo(() => {
    if (!selectedObjectId) return null;
    return allRadarNodes.find((n) => n.object.id === selectedObjectId) || null;
  }, [selectedObjectId, allRadarNodes]);

  // Handle Canvas Drawing Loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let isRunning = true;

    const render = (time: number) => {
      if (!isRunning) return;

      if (!lastTimeRef.current) lastTimeRef.current = time;
      const deltaTime = (time - lastTimeRef.current) / 1000;
      lastTimeRef.current = time;

      // Update sweep angle if scanning is enabled
      if (isScanning) {
        const sweepSpeedDegPerSec = 45 * scanSpeed; // 45 deg/s = 8 seconds per revolution
        sweepAngleRef.current = (sweepAngleRef.current + sweepSpeedDegPerSec * deltaTime) % 360;
        setSweepAngleDeg(Math.round(sweepAngleRef.current));
      }

      const currentSweep = sweepAngleRef.current;

      // Handle Canvas size & High DPI
      const rect = canvas.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      const width = rect.width;
      const height = rect.height;

      if (canvas.width !== width * dpr || canvas.height !== height * dpr) {
        canvas.width = width * dpr;
        canvas.height = height * dpr;
      }

      ctx.save();
      ctx.scale(dpr, dpr);

      // 1. Clear with deep space black / dark cyan glow gradient
      const cx = width / 2;
      const cy = height / 2;
      const maxRadarRadius = Math.min(cx, cy) - 28;

      ctx.fillStyle = "#030712"; // Deep space background
      ctx.fillRect(0, 0, width, height);

      // Radial background gradient
      const bgGrad = ctx.createRadialGradient(cx, cy, 10, cx, cy, maxRadarRadius);
      bgGrad.addColorStop(0, "rgba(6, 78, 59, 0.08)");
      bgGrad.addColorStop(0.5, "rgba(2, 44, 34, 0.05)");
      bgGrad.addColorStop(1, "rgba(0, 0, 0, 0.4)");
      ctx.fillStyle = bgGrad;
      ctx.beginPath();
      ctx.arc(cx, cy, maxRadarRadius, 0, Math.PI * 2);
      ctx.fill();

      // 2. Draw Outer Radar Scope Bezel Ring
      ctx.strokeStyle = "rgba(6, 182, 212, 0.35)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(cx, cy, maxRadarRadius, 0, Math.PI * 2);
      ctx.stroke();

      ctx.strokeStyle = "rgba(6, 182, 212, 0.15)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(cx, cy, maxRadarRadius + 8, 0, Math.PI * 2);
      ctx.stroke();

      // 3. Draw Degree Compass Ticks around perimeter
      ctx.font = "9px monospace";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";

      for (let deg = 0; deg < 360; deg += 10) {
        const rad = (deg * Math.PI) / 180;
        const isMajor = deg % 30 === 0;
        const isCardinal = deg % 90 === 0;
        const tickLength = isCardinal ? 10 : isMajor ? 6 : 3;

        const x1 = cx + Math.cos(rad) * maxRadarRadius;
        const y1 = cy + Math.sin(rad) * maxRadarRadius;
        const x2 = cx + Math.cos(rad) * (maxRadarRadius - tickLength);
        const y2 = cy + Math.sin(rad) * (maxRadarRadius - tickLength);

        ctx.strokeStyle = isCardinal
          ? "rgba(6, 182, 212, 0.8)"
          : isMajor
          ? "rgba(6, 182, 212, 0.4)"
          : "rgba(6, 182, 212, 0.18)";
        ctx.lineWidth = isCardinal ? 1.5 : 1;
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();

        if (isMajor) {
          const labelRad = (deg * Math.PI) / 180;
          const lx = cx + Math.cos(labelRad) * (maxRadarRadius + 16);
          const ly = cy + Math.sin(labelRad) * (maxRadarRadius + 16);
          ctx.fillStyle = isCardinal ? "rgba(34, 211, 238, 0.9)" : "rgba(100, 116, 139, 0.8)";
          let labelText = `${deg}°`;
          if (deg === 0) labelText = "0° / +X";
          if (deg === 90) labelText = "90° / +Y";
          if (deg === 180) labelText = "180°";
          if (deg === 270) labelText = "270°";
          ctx.fillText(labelText, lx, ly);
        }
      }

      // 4. Draw Azimuth Radial Rays (every 30 deg)
      ctx.strokeStyle = "rgba(6, 182, 212, 0.10)";
      ctx.lineWidth = 1;
      ctx.setLineDash([2, 4]);

      for (let deg = 0; deg < 360; deg += 30) {
        const rad = (deg * Math.PI) / 180;
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.lineTo(cx + Math.cos(rad) * maxRadarRadius, cy + Math.sin(rad) * maxRadarRadius);
        ctx.stroke();
      }
      ctx.setLineDash([]);

      // 5. Draw Concentric Orbital Shell Range Rings
      const rangeRings = [
        { label: "LEO 300km (VLEO)", alt: 300, frac: 0.32, color: "rgba(148, 163, 184, 0.25)" },
        { label: "LEO 415km (ISS / CSS)", alt: 415, frac: 0.44, color: "rgba(52, 211, 153, 0.35)", bold: true },
        { label: "LEO 550km (Starlink Shell)", alt: 550, frac: 0.58, color: "rgba(6, 182, 212, 0.40)", bold: true },
        { label: "LEO 780km (SSO / Iridium / Debris)", alt: 780, frac: 0.74, color: "rgba(245, 158, 11, 0.40)", bold: true },
        { label: "LEO 1200km (OneWeb)", alt: 1200, frac: 0.90, color: "rgba(168, 85, 247, 0.30)" },
      ];

      for (const ring of rangeRings) {
        const ringRadius = maxRadarRadius * ring.frac;
        if (ringRadius > maxRadarRadius) continue;

        ctx.strokeStyle = ring.color;
        ctx.lineWidth = ring.bold ? 1.5 : 1;
        if (!ring.bold) ctx.setLineDash([3, 5]);

        ctx.beginPath();
        ctx.arc(cx, cy, ringRadius, 0, Math.PI * 2);
        ctx.stroke();
        ctx.setLineDash([]);

        // Label on the ring (top-right quadrant)
        ctx.fillStyle = ring.color;
        ctx.font = "9px monospace";
        ctx.textAlign = "left";
        ctx.fillText(`— ${ring.label}`, cx + 8, cy - ringRadius + 4);
      }

      // 6. Draw Rotating Phosphor Radar Sweep Beam with trailing Alpha Fan
      const sweepRad = (currentSweep * Math.PI) / 180;
      const trailAngleRad = (40 * Math.PI) / 180; // 40 degrees trail

      // Trailing sector gradient
      const sweepGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, maxRadarRadius);
      sweepGrad.addColorStop(0, "rgba(6, 182, 212, 0.25)");
      sweepGrad.addColorStop(0.7, "rgba(16, 185, 129, 0.15)");
      sweepGrad.addColorStop(1, "rgba(6, 182, 212, 0.0)");

      ctx.fillStyle = sweepGrad;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.arc(cx, cy, maxRadarRadius, sweepRad - trailAngleRad, sweepRad, false);
      ctx.closePath();
      ctx.fill();

      // Sharp Leading Sweep Line
      const sweepLineX = cx + Math.cos(sweepRad) * maxRadarRadius;
      const sweepLineY = cy + Math.sin(sweepRad) * maxRadarRadius;

      ctx.strokeStyle = "rgba(52, 211, 153, 0.95)";
      ctx.lineWidth = 2;
      ctx.shadowColor = "#10b981";
      ctx.shadowBlur = 12;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(sweepLineX, sweepLineY);
      ctx.stroke();
      ctx.shadowBlur = 0; // reset

      // 7. Central Glowing Earth Core
      const earthRadius = maxRadarRadius * 0.20;

      // Outer atmosphere glow
      const atmoGrad = ctx.createRadialGradient(cx, cy, earthRadius * 0.8, cx, cy, earthRadius * 1.3);
      atmoGrad.addColorStop(0, "rgba(14, 165, 233, 0.35)");
      atmoGrad.addColorStop(1, "rgba(14, 165, 233, 0.0)");
      ctx.fillStyle = atmoGrad;
      ctx.beginPath();
      ctx.arc(cx, cy, earthRadius * 1.3, 0, Math.PI * 2);
      ctx.fill();

      // Earth body disc
      const earthBodyGrad = ctx.createRadialGradient(cx - 5, cy - 5, 2, cx, cy, earthRadius);
      earthBodyGrad.addColorStop(0, "#0c4a6e");
      earthBodyGrad.addColorStop(0.7, "#032b43");
      earthBodyGrad.addColorStop(1, "#021622");
      ctx.fillStyle = earthBodyGrad;
      ctx.beginPath();
      ctx.arc(cx, cy, earthRadius, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = "rgba(56, 189, 248, 0.7)";
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // Center crosshair
      ctx.fillStyle = "rgba(224, 242, 254, 0.9)";
      ctx.font = "bold 9px monospace";
      ctx.textAlign = "center";
      ctx.fillText("EARTH", cx, cy - 2);
      ctx.font = "8px monospace";
      ctx.fillStyle = "rgba(148, 163, 184, 0.8)";
      ctx.fillText("6378 km", cx, cy + 9);

      // 8. Draw Conjunction Threat Vectors (Connecting lines between conjunction pairs)
      const currentNodes = radarNodesRef.current;
      const nodePosMap = new Map<string, { x: number; y: number; node: RadarNode }>();

      // Compute and update node canvas positions
      for (const node of currentNodes) {
        const nodeRad = (node.azimuthDeg * Math.PI) / 180;
        const nodeRadius = maxRadarRadius * node.radiusNormalized;
        node.x = cx + Math.cos(nodeRad) * nodeRadius;
        node.y = cy + Math.sin(nodeRad) * nodeRadius;

        // Check if sweep line passed near this node to illuminate blip
        const angleDiff = (currentSweep - node.azimuthDeg + 360) % 360;
        if (angleDiff < 15) {
          node.blipIntensity = 1.0;
        } else {
          node.blipIntensity = Math.max(0.15, node.blipIntensity - deltaTime * 0.35);
        }

        nodePosMap.set(node.object.id, { x: node.x, y: node.y, node });
      }

      // Draw Threat Lines
      for (const conj of conjunctions) {
        const p1 = nodePosMap.get(conj.primaryObjectId);
        const p2 = nodePosMap.get(conj.secondaryObjectId);

        if (p1 && p2) {
          const isCritical = conj.riskLevel === "critical";
          ctx.strokeStyle = isCritical ? "rgba(239, 68, 68, 0.85)" : "rgba(245, 158, 11, 0.75)";
          ctx.lineWidth = isCritical ? 2 : 1.2;
          ctx.setLineDash([4, 4]);

          ctx.beginPath();
          ctx.moveTo(p1.x, p1.y);
          ctx.lineTo(p2.x, p2.y);
          ctx.stroke();
          ctx.setLineDash([]);

          // Midpoint threat indicator
          const midX = (p1.x + p2.x) / 2;
          const midY = (p1.y + p2.y) / 2;

          ctx.fillStyle = isCritical ? "#ef4444" : "#f59e0b";
          ctx.shadowColor = isCritical ? "#ef4444" : "#f59e0b";
          ctx.shadowBlur = 8;
          ctx.beginPath();
          ctx.arc(midX, midY, 3, 0, Math.PI * 2);
          ctx.fill();
          ctx.shadowBlur = 0;

          // Threat tag
          ctx.font = "8px monospace";
          ctx.fillStyle = isCritical ? "#fca5a5" : "#fde68a";
          ctx.textAlign = "center";
          ctx.fillText(`Pc: ${conj.collisionProbability.toExponential(1)}`, midX, midY - 6);
        }
      }

      // 9. Render Orbital Nodes (Satellites, Debris, Conjunctions)
      for (const node of currentNodes) {
        const isSelected = selectedObjectId === node.object.id;
        const isHovered = hoveredNode?.object.id === node.object.id;

        ctx.save();
        ctx.translate(node.x, node.y);

        // Color coding by status & object type
        let baseColor = "#06b6d4"; // Cyan default for satellite
        let glowColor = "rgba(6, 182, 212, 0.8)";
        let size = 4;

        if (node.isConjunction) {
          if (node.conjunctionRisk === "critical") {
            baseColor = "#ef4444";
            glowColor = "rgba(239, 68, 68, 0.9)";
            size = 6;
          } else {
            baseColor = "#f59e0b";
            glowColor = "rgba(245, 158, 11, 0.8)";
            size = 5;
          }
        } else if (node.object.type === "debris") {
          baseColor = "#a855f7"; // Purple for debris
          glowColor = "rgba(168, 85, 247, 0.6)";
          size = 3.5;
        } else if (node.object.type === "rocket_body") {
          baseColor = "#ec4899"; // Pink for rocket body
          glowColor = "rgba(236, 72, 153, 0.6)";
          size = 4;
        } else if (node.object.type === "satellite") {
          baseColor = "#10b981"; // Emerald green for active sat
          glowColor = "rgba(16, 185, 129, 0.8)";
          size = 4.5;
        }

        // Phosphor sweep illumination multiplier
        const intensity = node.blipIntensity;
        ctx.globalAlpha = Math.max(0.4, intensity);

        // Draw Ping Glow Ring if illuminated or conjunction
        if (node.isConjunction || intensity > 0.6 || isSelected) {
          ctx.strokeStyle = glowColor;
          ctx.lineWidth = 1;
          ctx.beginPath();
          const pingRadius = size + (1.0 - intensity) * 12;
          ctx.arc(0, 0, pingRadius, 0, Math.PI * 2);
          ctx.stroke();
        }

        // Draw Object Symbol
        ctx.fillStyle = baseColor;
        ctx.shadowColor = glowColor;
        ctx.shadowBlur = isSelected || isHovered ? 12 : 6;

        if (node.object.type === "satellite") {
          // Diamond for satellite
          ctx.beginPath();
          ctx.moveTo(0, -size);
          ctx.lineTo(size, 0);
          ctx.lineTo(0, size);
          ctx.lineTo(-size, 0);
          ctx.closePath();
          ctx.fill();
        } else if (node.object.type === "debris") {
          // Small dot for debris
          ctx.beginPath();
          ctx.arc(0, 0, size - 0.5, 0, Math.PI * 2);
          ctx.fill();
        } else {
          // Square for rocket body / other
          ctx.fillRect(-size / 2, -size / 2, size, size);
        }

        ctx.shadowBlur = 0;

        // Target Lock Reticle if Selected
        if (isSelected) {
          ctx.strokeStyle = "#38bdf8";
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.arc(0, 0, size + 8, 0, Math.PI * 2);
          ctx.stroke();

          // Reticle ticks
          ctx.beginPath();
          ctx.moveTo(0, -(size + 12));
          ctx.lineTo(0, -(size + 4));
          ctx.moveTo(0, size + 4);
          ctx.lineTo(0, size + 12);
          ctx.moveTo(-(size + 12), 0);
          ctx.lineTo(-(size + 4), 0);
          ctx.moveTo(size + 4, 0);
          ctx.lineTo(size + 12, 0);
          ctx.stroke();
        }

        // Label on hover or selected
        if (isSelected || isHovered || (node.isConjunction && node.conjunctionRisk === "critical")) {
          ctx.font = "bold 9px monospace";
          ctx.fillStyle = isSelected ? "#38bdf8" : "#f8fafc";
          ctx.textAlign = "left";
          ctx.fillText(node.object.name, size + 6, -2);

          ctx.font = "8px monospace";
          ctx.fillStyle = "rgba(148, 163, 184, 0.9)";
          ctx.fillText(`${node.altitudeKm.toFixed(0)} km`, size + 6, 8);
        }

        ctx.restore();
      }

      ctx.restore();

      animFrameIdRef.current = requestAnimationFrame(render);
    };

    animFrameIdRef.current = requestAnimationFrame(render);

    return () => {
      isRunning = false;
      if (animFrameIdRef.current) cancelAnimationFrame(animFrameIdRef.current);
    };
  }, [isScanning, scanSpeed, selectedObjectId, hoveredNode, conjunctions, maxAltKm]);

  // Handle Mouse Hover & Click on Canvas
  const handleCanvasMouseMove = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;

      const nodes = radarNodesRef.current;
      let found: RadarNode | null = null;
      let minDistance = 14; // hover radius px

      for (const node of nodes) {
        const dx = node.x - mouseX;
        const dy = node.y - mouseY;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < minDistance) {
          minDistance = dist;
          found = node;
        }
      }

      setHoveredNode(found);
    },
    []
  );

  const handleCanvasClick = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;

      const nodes = radarNodesRef.current;
      let clickedNode: RadarNode | null = null;
      let minDistance = 18;

      for (const node of nodes) {
        const dx = node.x - mouseX;
        const dy = node.y - mouseY;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < minDistance) {
          minDistance = dist;
          clickedNode = node;
        }
      }

      if (clickedNode) {
        setSelectedObjectId((prev) => (prev === clickedNode?.object.id ? null : clickedNode.object.id));
      } else {
        setSelectedObjectId(null);
      }
    },
    []
  );

  // Statistics summaries
  const criticalCount = useMemo(
    () => conjunctions.filter((c) => c.riskLevel === "critical").length,
    [conjunctions]
  );
  const elevatedCount = useMemo(
    () => conjunctions.filter((c) => c.riskLevel === "elevated").length,
    [conjunctions]
  );
  const satelliteCount = useMemo(
    () => objects.filter((o) => o.type === "satellite").length,
    [objects]
  );
  const debrisCount = useMemo(
    () => objects.filter((o) => o.type === "debris" || o.type === "rocket_body").length,
    [objects]
  );

  return (
    <div
      ref={containerRef}
      className={`relative w-full rounded-xl overflow-hidden border border-border/80 bg-zinc-950 shadow-2xl flex flex-col ${className}`}
    >
      {/* Top Tactical HUD Header */}
      <div className="relative z-20 flex flex-wrap items-center justify-between gap-2 p-3 bg-zinc-900/90 border-b border-border/80 backdrop-blur-md">
        {/* Radar Status Badge */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-emerald-950/40 border border-emerald-500/40 text-emerald-400 font-mono text-xs font-semibold">
            <Radio className="w-3.5 h-3.5 animate-pulse text-emerald-400" />
            <span>LEO POLAR RADAR</span>
            <span className="text-[10px] text-emerald-500/80">
              {isScanning ? `${(45 * scanSpeed).toFixed(0)}°/s` : "PAUSED"}
            </span>
          </div>

          <div className="hidden sm:flex items-center gap-1 text-[11px] font-mono text-zinc-400 bg-zinc-800/60 px-2 py-1 rounded border border-zinc-700/50">
            <span>AZ:</span>
            <span className="text-cyan-400 font-bold">{sweepAngleDeg.toString().padStart(3, "0")}°</span>
          </div>

          <Badge variant="outline" className="text-[10px] font-mono text-cyan-400 border-cyan-500/30 bg-cyan-950/30">
            {filteredNodes.length} / {objects.length} OBJECTS ON SCOPE
          </Badge>
        </div>

        {/* Filter Layer Tabs */}
        <div className="flex items-center gap-1 bg-zinc-950/80 p-1 rounded-lg border border-zinc-800">
          <button
            type="button"
            onClick={() => setFilterMode("conjunctions")}
            className={`px-2.5 py-1 text-xs rounded font-medium font-mono transition-all flex items-center gap-1 ${
              filterMode === "conjunctions"
                ? "bg-red-500/20 text-red-400 border border-red-500/40 shadow-sm"
                : "text-zinc-400 hover:text-zinc-200"
            }`}
          >
            <ShieldAlert className="w-3 h-3 text-red-400" />
            Conjunctions ({conjunctions.length})
          </button>
          <button
            type="button"
            onClick={() => setFilterMode("satellites")}
            className={`px-2.5 py-1 text-xs rounded font-medium font-mono transition-all flex items-center gap-1 ${
              filterMode === "satellites"
                ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 shadow-sm"
                : "text-zinc-400 hover:text-zinc-200"
            }`}
          >
            <Satellite className="w-3 h-3 text-emerald-400" />
            Satellites ({satelliteCount})
          </button>
          <button
            type="button"
            onClick={() => setFilterMode("debris")}
            className={`px-2.5 py-1 text-xs rounded font-medium font-mono transition-all flex items-center gap-1 ${
              filterMode === "debris"
                ? "bg-purple-500/20 text-purple-400 border border-purple-500/40 shadow-sm"
                : "text-zinc-400 hover:text-zinc-200"
            }`}
          >
            <Flame className="w-3 h-3 text-purple-400" />
            Debris ({debrisCount})
          </button>
          <button
            type="button"
            onClick={() => setFilterMode("all")}
            className={`px-2.5 py-1 text-xs rounded font-medium font-mono transition-all ${
              filterMode === "all"
                ? "bg-cyan-500/20 text-cyan-400 border border-cyan-500/40 shadow-sm"
                : "text-zinc-400 hover:text-zinc-200"
            }`}
          >
            All Catalog
          </button>
        </div>

        {/* Quick Search Box */}
        <div className="relative w-40 sm:w-48">
          <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-500" />
          <input
            type="text"
            placeholder="Search NORAD/Name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-zinc-950/90 border border-zinc-800 rounded-md pl-8 pr-2 py-1 text-xs font-mono text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:border-cyan-500"
          />
        </div>
      </div>

      {/* Main Radar Screen Layout */}
      <div className="relative w-full h-[520px] bg-black flex items-center justify-center">
        {/* Background Grid Accent Lines */}
        <div
          className="absolute inset-0 opacity-10 pointer-events-none"
          style={{
            backgroundImage: "radial-gradient(circle, #38bdf8 1px, transparent 1px)",
            backgroundSize: "32px 32px",
          }}
        />

        {/* The HTML5 Canvas Canvas element */}
        <canvas
          ref={canvasRef}
          onMouseMove={handleCanvasMouseMove}
          onClick={handleCanvasClick}
          className="w-full h-full cursor-crosshair relative z-10"
        />

        {/* Floating Top Left Tactical Telemetry Overlay */}
        <div className="absolute top-3 left-3 z-20 pointer-events-none bg-zinc-950/80 border border-zinc-800/80 p-2.5 rounded-lg backdrop-blur-md text-[10px] font-mono space-y-1 text-zinc-400 shadow-xl max-w-[200px]">
          <div className="text-cyan-400 font-bold flex items-center gap-1 uppercase tracking-wider text-[11px]">
            <Compass className="w-3.5 h-3.5" /> Scope Telemetry
          </div>
          <div className="flex justify-between">
            <span>Projection:</span>
            <span className="text-zinc-200">ECI J2000 Polar</span>
          </div>
          <div className="flex justify-between">
            <span>Range Max:</span>
            <span className="text-zinc-200">{maxAltKm} km LEO</span>
          </div>
          <div className="flex justify-between">
            <span>Crit Conjunctions:</span>
            <span className="text-red-400 font-bold">{criticalCount}</span>
          </div>
          <div className="flex justify-between">
            <span>Elevated Risk:</span>
            <span className="text-amber-400 font-bold">{elevatedCount}</span>
          </div>
        </div>

        {/* Floating Top Right Radar Controls Overlay */}
        <div className="absolute top-3 right-3 z-20 flex flex-col gap-1.5 bg-zinc-950/80 border border-zinc-800/80 p-1.5 rounded-lg backdrop-blur-md shadow-xl">
          {/* Play/Pause Sweep */}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsScanning((prev) => !prev)}
            className="h-7 px-2 text-[11px] font-mono text-zinc-300 hover:text-cyan-400 justify-start"
          >
            {isScanning ? <Pause className="w-3 h-3 mr-1 text-amber-400" /> : <Play className="w-3 h-3 mr-1 text-emerald-400" />}
            {isScanning ? "Pause Sweep" : "Resume Sweep"}
          </Button>

          {/* Speed Toggle */}
          <div className="flex items-center gap-1 px-1 py-0.5 border-t border-zinc-800/60 pt-1">
            <span className="text-[9px] font-mono text-zinc-500">Speed:</span>
            {[1, 2, 4].map((spd) => (
              <button
                key={spd}
                type="button"
                onClick={() => setScanSpeed(spd)}
                className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${
                  scanSpeed === spd
                    ? "bg-cyan-500/20 text-cyan-300 font-bold border border-cyan-500/40"
                    : "text-zinc-400 hover:text-zinc-200"
                }`}
              >
                {spd}x
              </button>
            ))}
          </div>

          {/* Range Mode Toggle */}
          <div className="flex flex-col gap-0.5 border-t border-zinc-800/60 pt-1">
            <span className="text-[9px] font-mono text-zinc-500 px-1">Range Band:</span>
            <button
              type="button"
              onClick={() => setRangeMode("leo_inner")}
              className={`text-[10px] font-mono text-left px-1.5 py-0.5 rounded ${
                rangeMode === "leo_inner" ? "bg-cyan-500/20 text-cyan-400 font-bold" : "text-zinc-400 hover:text-zinc-200"
              }`}
            >
              Inner (200-700km)
            </button>
            <button
              type="button"
              onClick={() => setRangeMode("leo_all")}
              className={`text-[10px] font-mono text-left px-1.5 py-0.5 rounded ${
                rangeMode === "leo_all" ? "bg-cyan-500/20 text-cyan-400 font-bold" : "text-zinc-400 hover:text-zinc-200"
              }`}
            >
              LEO Full (1400km)
            </button>
            <button
              type="button"
              onClick={() => setRangeMode("extended")}
              className={`text-[10px] font-mono text-left px-1.5 py-0.5 rounded ${
                rangeMode === "extended" ? "bg-cyan-500/20 text-cyan-400 font-bold" : "text-zinc-400 hover:text-zinc-200"
              }`}
            >
              MEO (2200km)
            </button>
          </div>
        </div>

        {/* Target Inspector Card (when object is hovered or selected) */}
        {(selectedNode || hoveredNode) && (
          <div className="absolute bottom-12 left-4 z-30 max-w-sm w-80 bg-zinc-950/95 border border-cyan-500/40 rounded-xl p-3 shadow-2xl backdrop-blur-md font-mono text-xs text-zinc-200 animate-in fade-in slide-in-from-bottom-2">
            {(() => {
              const activeNode = selectedNode || hoveredNode!;
              const obj = activeNode.object;
              const isCrit = activeNode.isConjunction && activeNode.conjunctionRisk === "critical";

              return (
                <div className="space-y-2">
                  <div className="flex items-center justify-between border-b border-zinc-800 pb-1.5">
                    <div className="flex items-center gap-1.5">
                      <Crosshair className={`w-4 h-4 ${isCrit ? "text-red-400" : "text-cyan-400"}`} />
                      <span className="font-bold truncate text-foreground">{obj.name}</span>
                    </div>
                    <Badge
                      variant="outline"
                      className={`text-[9px] font-mono uppercase ${
                        isCrit
                          ? "bg-red-950/40 text-red-400 border-red-500/40"
                          : "bg-cyan-950/40 text-cyan-400 border-cyan-500/40"
                      }`}
                    >
                      {obj.type}
                    </Badge>
                  </div>

                  <div className="grid grid-cols-2 gap-x-2 gap-y-1 text-[11px] text-zinc-400">
                    <div>
                      <span>NORAD ID:</span>{" "}
                      <span className="text-zinc-200 font-bold">{obj.noradId}</span>
                    </div>
                    <div>
                      <span>Altitude:</span>{" "}
                      <span className="text-cyan-400 font-bold">{activeNode.altitudeKm.toFixed(1)} km</span>
                    </div>
                    <div>
                      <span>Shell:</span>{" "}
                      <span className="text-zinc-200">{obj.shellId || "LEO"}</span>
                    </div>
                    <div>
                      <span>Azimuth / RA:</span>{" "}
                      <span className="text-zinc-200">{activeNode.azimuthDeg.toFixed(1)}°</span>
                    </div>
                    {obj.orbitalElements && (
                      <>
                        <div>
                          <span>Inclination:</span>{" "}
                          <span className="text-zinc-200">{obj.orbitalElements.inclination.toFixed(2)}°</span>
                        </div>
                        <div>
                          <span>Eccentricity:</span>{" "}
                          <span className="text-zinc-200">{obj.orbitalElements.eccentricity.toFixed(4)}</span>
                        </div>
                      </>
                    )}
                  </div>

                  {activeNode.isConjunction && (
                    <div className="mt-2 p-2 rounded-lg bg-red-950/30 border border-red-500/30 text-[10px] text-red-300 space-y-1">
                      <div className="font-bold flex items-center gap-1 text-red-400">
                        <AlertTriangle className="w-3 h-3" />
                        ACTIVE CONJUNCTION THREAT
                      </div>
                      <div className="flex justify-between">
                        <span>Secondary Object:</span>
                        <span className="font-bold text-zinc-200">{activeNode.conjunctionPartnerName}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Collision Prob (Pc):</span>
                        <span className="font-bold text-red-400">{activeNode.conjunctionPc?.toExponential(2)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Miss Distance:</span>
                        <span className="font-bold text-amber-300">{activeNode.conjunctionMissKm?.toFixed(3)} km</span>
                      </div>
                    </div>
                  )}

                  {selectedNode && (
                    <div className="text-[9px] text-cyan-400/80 pt-1 flex items-center justify-between">
                      <span>Target Locked</span>
                      <button
                        type="button"
                        onClick={() => setSelectedObjectId(null)}
                        className="text-zinc-400 hover:text-white underline"
                      >
                        Release Lock
                      </button>
                    </div>
                  )}
                </div>
              );
            })()}
          </div>
        )}
      </div>

      {/* Bottom HUD Legend and Status Bar */}
      <div className="relative z-20 flex flex-wrap items-center justify-between gap-3 px-4 py-2.5 bg-zinc-900/90 border-t border-border/80 backdrop-blur-md text-[11px] font-mono text-zinc-400">
        <div className="flex items-center gap-4 flex-wrap">
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-red-500 shadow-[0_0_8px_#ef4444]" />
            <span className="text-zinc-300">Critical Conjunction (Pc ≥ 1e-3)</span>
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500 shadow-[0_0_8px_#f59e0b]" />
            <span className="text-zinc-300">Elevated Risk (Pc ≥ 1e-4)</span>
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rotate-45 bg-emerald-400 shadow-[0_0_8px_#10b981]" />
            <span className="text-zinc-300">Active Satellite</span>
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-purple-500 shadow-[0_0_8px_#a855f7]" />
            <span className="text-zinc-300">Debris / Fragment</span>
          </span>
        </div>

        <div className="flex items-center gap-3 text-[10px] text-zinc-400">
          <span>ASTRODYNAMICS: <span className="text-cyan-400 font-bold">SGP4 / FOSTER-1992</span></span>
          <span>FRAME: <span className="text-foreground font-bold">ECI J2000</span></span>
        </div>
      </div>
    </div>
  );
}
