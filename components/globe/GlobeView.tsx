"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
import Globe, { GlobeInstance } from "globe.gl";
import type { TrackedObject, ConjunctionEvent } from "@/types/contract";
import { mockWs } from "@/lib/mockWs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  RotateCcw,
  Play,
  Pause,
  Crosshair,
  Maximize2,
  Minimize2,
  Layers,
  Radio,
  Satellite,
  AlertTriangle,
} from "lucide-react";

interface GlobeViewProps {
  initialObjects?: TrackedObject[];
  initialConjunctions?: ConjunctionEvent[];
  height?: number | string;
  onSelectObject?: (obj: TrackedObject) => void;
  onSelectConjunction?: (event: ConjunctionEvent) => void;
  className?: string;
}

interface ProcessedPoint {
  id: string;
  name: string;
  noradId: number;
  type: string;
  status: string;
  altitude: number;
  shellId: string;
  velocityKmS: number;
  lat: number;
  lng: number;
  alt: number;
  radius: number;
  color: string;
  raw: TrackedObject;
}

interface ProcessedArc {
  id: string;
  event: ConjunctionEvent;
  startLat: number;
  startLng: number;
  startAlt: number;
  endLat: number;
  endLng: number;
  endAlt: number;
  color: string[];
  stroke: number;
  dashLength: number;
  dashGap: number;
  dashAnimateTime: number;
}

interface ProcessedRing {
  id: string;
  lat: number;
  lng: number;
  maxR: number;
  propagationSpeed: number;
  repeatPeriod: number;
  color: (t: number) => string;
}

interface ProcessedPath {
  id: string;
  name: string;
  points: { lat: number; lng: number; alt: number }[];
  color: string;
}

// Convert ECI J2000 state vector (km) to Geodetic latitude, longitude, and normalized altitude
function eciToGeodetic(pos: { x: number; y: number; z: number }, altKm: number) {
  const r = Math.sqrt(pos.x * pos.x + pos.y * pos.y + pos.z * pos.z) || 6771;
  const lat = Math.asin(pos.z / r) * (180 / Math.PI);
  const lng = Math.atan2(pos.y, pos.x) * (180 / Math.PI);
  // Normalized altitude for globe.gl: Earth radius ~6371 km
  const alt = Math.max(0.04, altKm / 6371);
  return { lat, lng, alt };
}

// Compute 3D orbital trajectory ring from Keplerian elements
function computeOrbitPath(orbitalElements: TrackedObject["orbitalElements"], altitudeKm: number) {
  const points: { lat: number; lng: number; alt: number }[] = [];
  const incRad = (orbitalElements.inclination * Math.PI) / 180;
  const raanRad = (orbitalElements.raan * Math.PI) / 180;
  const altNorm = Math.max(0.04, altitudeKm / 6371);

  for (let u = 0; u <= 360; u += 6) {
    const uRad = (u * Math.PI) / 180;
    const xOrb = Math.cos(uRad);
    const yOrb = Math.sin(uRad);

    const x = xOrb * Math.cos(raanRad) - yOrb * Math.cos(incRad) * Math.sin(raanRad);
    const y = xOrb * Math.sin(raanRad) + yOrb * Math.cos(incRad) * Math.cos(raanRad);
    const z = yOrb * Math.sin(incRad);

    const lat = Math.asin(Math.max(-1, Math.min(1, z))) * (180 / Math.PI);
    const lng = Math.atan2(y, x) * (180 / Math.PI);
    points.push({ lat, lng, alt: altNorm });
  }
  return points;
}

export default function GlobeView({
  initialObjects = [],
  initialConjunctions = [],
  height = 460,
  onSelectObject,
  onSelectConjunction,
  className = "",
}: GlobeViewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const globeInstanceRef = useRef<GlobeInstance | null>(null);

  const [objects, setObjects] = useState<TrackedObject[]>(initialObjects);
  const [conjunctions, setConjunctions] = useState<ConjunctionEvent[]>(initialConjunctions);
  const [autoRotate, setAutoRotate] = useState(true);
  const [activeLayer, setActiveLayer] = useState<"all" | "satellites" | "debris" | "conjunctions">("all");
  const [selectedEntityName, setSelectedEntityName] = useState<string | null>(null);
  const [selectedObject, setSelectedObject] = useState<TrackedObject | null>(null);
  const [telemetryCount, setTelemetryCount] = useState({ satellites: 0, debris: 0, critical: 0 });

  // 1. Process points for globe display
  const pointsData = React.useMemo<ProcessedPoint[]>(() => {
    return objects
      .filter((obj) => {
        if (activeLayer === "satellites") return obj.type === "satellite";
        if (activeLayer === "debris") return obj.type === "debris" || obj.type === "rocket_body";
        return true;
      })
      .map((obj) => {
        const { lat, lng, alt } = eciToGeodetic(obj.position, obj.altitude);
        const velMagnitude = Math.sqrt(
          obj.velocity.vx ** 2 + obj.velocity.vy ** 2 + obj.velocity.vz ** 2
        );

        let color = "#10b981"; // emerald for nominal active satellites
        let radius = 0.35;

        if (obj.type === "debris") {
          color = "#ef4444"; // red for debris
          radius = 0.22;
        } else if (obj.type === "rocket_body") {
          color = "#f97316"; // orange for spent stages
          radius = 0.3;
        } else if (obj.status === "maneuvering") {
          color = "#f59e0b"; // amber for maneuvering
          radius = 0.45;
        } else if (obj.name.includes("ISS")) {
          color = "#38bdf8"; // cyan highlight for space station
          radius = 0.55;
        }

        return {
          id: obj.id,
          name: obj.name,
          noradId: obj.noradId,
          type: obj.type,
          status: obj.status,
          altitude: obj.altitude,
          shellId: obj.shellId,
          velocityKmS: Number(velMagnitude.toFixed(2)),
          lat,
          lng,
          alt,
          radius,
          color,
          raw: obj,
        };
      });
  }, [objects, activeLayer]);

  // 2. Process conjunction trajectory arcs
  const arcsData = React.useMemo<ProcessedArc[]>(() => {
    if (activeLayer === "debris") return [];

    const objMap = new Map<string, TrackedObject>();
    objects.forEach((o) => objMap.set(o.id, o));

    return conjunctions
      .filter((c) => c.status === "active" || c.status === "monitoring" || c.status === "mitigated")
      .map((c) => {
        const primary = objMap.get(c.primaryObjectId);
        const secondary = objMap.get(c.secondaryObjectId);
        if (!primary || !secondary) return null;

        const pCoord = eciToGeodetic(primary.position, primary.altitude);
        const sCoord = eciToGeodetic(secondary.position, secondary.altitude);

        let color = ["rgba(16, 185, 129, 0.8)", "rgba(6, 182, 212, 0.8)"];
        let stroke = 0.8;
        let dashAnimateTime = 3000;

        if (c.riskLevel === "critical") {
          color = ["rgba(239, 68, 68, 0.95)", "rgba(249, 115, 22, 0.95)"];
          stroke = 1.8;
          dashAnimateTime = 1200;
        } else if (c.riskLevel === "elevated") {
          color = ["rgba(245, 158, 11, 0.9)", "rgba(234, 179, 8, 0.85)"];
          stroke = 1.2;
          dashAnimateTime = 2000;
        }

        return {
          id: c.id,
          event: c,
          startLat: pCoord.lat,
          startLng: pCoord.lng,
          startAlt: pCoord.alt,
          endLat: sCoord.lat,
          endLng: sCoord.lng,
          endAlt: sCoord.alt,
          color,
          stroke,
          dashLength: 0.45,
          dashGap: 0.25,
          dashAnimateTime,
        };
      })
      .filter(Boolean) as ProcessedArc[];
  }, [objects, conjunctions, activeLayer]);

  // 3. Process pulsing collision rings on the surface below critical conjunctions
  const ringsData = React.useMemo<ProcessedRing[]>(() => {
    const objMap = new Map<string, TrackedObject>();
    objects.forEach((o) => objMap.set(o.id, o));

    return conjunctions
      .filter((c) => c.riskLevel === "critical" && c.status === "active")
      .map((c) => {
        const primary = objMap.get(c.primaryObjectId);
        if (!primary) return null;
        const { lat, lng } = eciToGeodetic(primary.position, primary.altitude);

        return {
          id: `ring-${c.id}`,
          lat,
          lng,
          maxR: 4.5,
          propagationSpeed: 2.2,
          repeatPeriod: 1400,
          color: (t: number) => `rgba(239, 68, 68, ${Math.max(0, 1 - t)})`,
        };
      })
      .filter(Boolean) as ProcessedRing[];
  }, [objects, conjunctions]);

  // 4. Process orbital trajectory rings (pathsData)
  const pathsData = React.useMemo<ProcessedPath[]>(() => {
    const paths: ProcessedPath[] = [];

    // Always draw ISS orbital plane in cyan
    const iss = objects.find((o) => o.name.includes("ISS"));
    if (iss && iss.orbitalElements) {
      paths.push({
        id: "path-iss",
        name: "ISS Orbital Plane",
        points: computeOrbitPath(iss.orbitalElements, iss.altitude),
        color: "rgba(56, 189, 248, 0.75)",
      });
    }

    // If another object is selected, trace its orbital plane
    if (selectedObject && selectedObject.orbitalElements && selectedObject.id !== iss?.id) {
      paths.push({
        id: `path-${selectedObject.id}`,
        name: `${selectedObject.name} Orbital Trajectory`,
        points: computeOrbitPath(selectedObject.orbitalElements, selectedObject.altitude),
        color: selectedObject.type === "debris" ? "rgba(239, 68, 68, 0.85)" : "rgba(245, 158, 11, 0.85)",
      });
    }

    return paths;
  }, [objects, selectedObject]);

  // Update telemetry counters
  useEffect(() => {
    const sats = objects.filter((o) => o.type === "satellite").length;
    const deb = objects.filter((o) => o.type === "debris" || o.type === "rocket_body").length;
    const crit = conjunctions.filter((c) => c.riskLevel === "critical").length;
    setTelemetryCount({ satellites: sats, debris: deb, critical: crit });
  }, [objects, conjunctions]);

  // 5. Initialize Globe.gl WebGL Canvas
  useEffect(() => {
    if (!containerRef.current) return;

    // Instantiate Globe
    const globe = new Globe(containerRef.current)
      .globeImageUrl("//unpkg.com/three-globe/example/img/earth-night.jpg")
      .bumpImageUrl("//unpkg.com/three-globe/example/img/earth-topology.png")
      .backgroundImageUrl("//unpkg.com/three-globe/example/img/night-sky.png")
      .atmosphereColor("#38bdf8")
      .atmosphereAltitude(0.18)
      .pointLat("lat")
      .pointLng("lng")
      .pointAltitude("alt")
      .pointColor("color")
      .pointRadius("radius")
      .pointLabel(
        (d: any) => `
          <div style="background: rgba(10, 10, 15, 0.94); border: 1px solid rgba(56, 189, 248, 0.3); border-radius: 8px; padding: 8px 12px; font-family: ui-monospace, SFMono-Regular, monospace; font-size: 11px; color: #f8fafc; box-shadow: 0 8px 24px rgba(0,0,0,0.6); backdrop-filter: blur(8px);">
            <div style="font-weight: 700; font-size: 12px; color: #38bdf8; margin-bottom: 4px; display: flex; align-items: center; justify-content: space-between; gap: 8px;">
              <span>${d.name}</span>
              <span style="font-size: 10px; padding: 1px 6px; border-radius: 4px; background: rgba(255,255,255,0.1);">${d.type.toUpperCase()}</span>
            </div>
            <div style="color: #94a3b8; margin-bottom: 2px;">NORAD ID: <span style="color: #f1f5f9; font-weight: 600;">${d.noradId}</span> • Shell: <span style="color: #f1f5f9; font-weight: 600;">${d.shellId}</span></div>
            <div style="color: #94a3b8; margin-bottom: 2px;">Altitude: <span style="color: #a3e635; font-weight: 600;">${d.altitude.toFixed(1)} km</span></div>
            <div style="color: #94a3b8; margin-bottom: 2px;">Orbital Velocity: <span style="color: #facc15; font-weight: 600;">${d.velocityKmS} km/s</span></div>
            <div style="color: #94a3b8;">Status: <span style="color: ${d.status === 'active' ? '#34d399' : '#fbbf24'}; font-weight: 700;">${d.status.toUpperCase()}</span></div>
          </div>
        `
      )
      .onPointClick((point: any) => {
        setSelectedEntityName(point.name);
        setSelectedObject(point.raw);
        if (onSelectObject && point.raw) {
          onSelectObject(point.raw);
        }
      })
      .arcStartLat("startLat")
      .arcStartLng("startLng")
      .arcStartAltitude("startAlt")
      .arcEndLat("endLat")
      .arcEndLng("endLng")
      .arcEndAltitude("endAlt")
      .arcColor("color")
      .arcStroke("stroke")
      .arcDashLength("dashLength")
      .arcDashGap("dashGap")
      .arcDashAnimateTime("dashAnimateTime")
      .arcLabel(
        (arc: any) => `
          <div style="background: rgba(15, 10, 10, 0.94); border: 1px solid rgba(239, 68, 68, 0.4); border-radius: 8px; padding: 8px 12px; font-family: ui-monospace, monospace; font-size: 11px; color: #f8fafc; backdrop-filter: blur(8px);">
            <div style="font-weight: 700; color: #ef4444; margin-bottom: 4px;">⚡ CONJUNCTION TRAJECTORY</div>
            <div style="color: #94a3b8;">Miss Distance: <span style="color: #f59e0b; font-weight: 600;">${(arc.event.missDistance * 1000).toFixed(0)} m</span></div>
            <div style="color: #94a3b8;">Collision Probability: <span style="color: #ef4444; font-weight: 700;">${arc.event.collisionProbability.toExponential(2)}</span></div>
            <div style="color: #94a3b8;">TCA: <span style="color: #f1f5f9;">${arc.event.tca}</span></div>
          </div>
        `
      )
      .onArcClick((arc: any) => {
        if (onSelectConjunction && arc.event) {
          onSelectConjunction(arc.event);
        }
      })
      .ringLat("lat")
      .ringLng("lng")
      .ringMaxRadius("maxR")
      .ringPropagationSpeed("propagationSpeed")
      .ringRepeatPeriod("repeatPeriod")
      .ringColor((d: any) => d.color)
      .pathsData([])
      .pathPoints("points")
      .pathPointLat("lat")
      .pathPointLng("lng")
      .pathPointAlt("alt")
      .pathColor("color")
      .pathStroke(1.2)
      .pathDashLength(0.08)
      .pathDashGap(0.03)
      .pathDashAnimateTime(1800);

    // Initial camera position (framed on Europe/Asia where ISS and COSMOS debris cross)
    globe.pointOfView({ lat: 25, lng: 45, altitude: 2.2 }, 1000);

    // Configure controls
    const controls = globe.controls();
    controls.autoRotate = true;
    controls.autoRotateSpeed = 0.6;
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;

    globeInstanceRef.current = globe;

    // Handle container resize
    const handleResize = () => {
      if (containerRef.current && globeInstanceRef.current) {
        const { clientWidth, clientHeight } = containerRef.current;
        globeInstanceRef.current.width(clientWidth);
        globeInstanceRef.current.height(clientHeight);
      }
    };

    const resizeObserver = new ResizeObserver(handleResize);
    resizeObserver.observe(containerRef.current);
    handleResize();

    return () => {
      resizeObserver.disconnect();
      if (containerRef.current) {
        containerRef.current.innerHTML = "";
      }
      globeInstanceRef.current = null;
    };
  }, []);

  // Update data layers whenever processed arrays change
  useEffect(() => {
    if (!globeInstanceRef.current) return;
    globeInstanceRef.current.pointsData(pointsData);
    globeInstanceRef.current.arcsData(arcsData);
    globeInstanceRef.current.ringsData(ringsData);
    globeInstanceRef.current.pathsData(pathsData);
  }, [pointsData, arcsData, ringsData, pathsData]);

  // Handle auto-rotation toggle
  useEffect(() => {
    if (!globeInstanceRef.current) return;
    globeInstanceRef.current.controls().autoRotate = autoRotate;
  }, [autoRotate]);

  // 5. Real-Time WebSocket Updates Sync
  useEffect(() => {
    // Listen for orbital propagation step
    const unsubObjects = mockWs.on("objects:updated", (payload) => {
      setObjects(payload.objects);
    });

    // Listen for conjunction Pc recomputation
    const unsubConjunction = mockWs.on("conjunction:updated", (payload) => {
      setConjunctions((prev) =>
        prev.map((c) => (c.id === payload.id ? payload : c))
      );
    });

    return () => {
      unsubObjects();
      unsubConjunction();
    };
  }, []);

  // Camera Focus Actions
  const handleFocusISS = useCallback(() => {
    const iss = objects.find((o) => o.name.includes("ISS"));
    if (iss && globeInstanceRef.current) {
      const { lat, lng } = eciToGeodetic(iss.position, iss.altitude);
      globeInstanceRef.current.pointOfView({ lat, lng, altitude: 0.9 }, 1500);
      setSelectedEntityName("ISS (ZARYA)");
      setAutoRotate(false);
    }
  }, [objects]);

  const handleFocusCriticalConjunction = useCallback(() => {
    const crit = conjunctions.find((c) => c.riskLevel === "critical");
    const primary = objects.find((o) => o.id === crit?.primaryObjectId);
    if (primary && globeInstanceRef.current) {
      const { lat, lng } = eciToGeodetic(primary.position, primary.altitude);
      globeInstanceRef.current.pointOfView({ lat, lng, altitude: 0.8 }, 1500);
      setSelectedEntityName("ISS ⚡ COSMOS 2251 Near-Miss");
      setAutoRotate(false);
    }
  }, [objects, conjunctions]);

  const handleResetCamera = useCallback(() => {
    if (globeInstanceRef.current) {
      globeInstanceRef.current.pointOfView({ lat: 20, lng: 30, altitude: 2.2 }, 1500);
      setSelectedEntityName(null);
      setAutoRotate(true);
    }
  }, []);

  return (
    <div
      className={`relative w-full rounded-xl overflow-hidden border border-border/80 bg-black shadow-2xl flex flex-col justify-between ${className}`}
      style={{ height }}
    >
      {/* Three.js Globe Mounting DOM */}
      <div ref={containerRef} className="absolute inset-0 w-full h-full cursor-grab active:cursor-grabbing" />

      {/* Top HUD Controls Overlay */}
      <div className="relative z-10 p-3 sm:p-4 flex flex-wrap items-center justify-between gap-2 pointer-events-none">
        {/* Radar State Chip */}
        <div className="flex items-center gap-2 bg-black/80 backdrop-blur-md px-3 py-1.5 rounded-lg border border-border/70 shadow-lg pointer-events-auto">
          <Radio className="h-4 w-4 text-emerald-400 animate-pulse" />
          <span className="text-xs font-mono font-bold text-foreground">LEO 3D Tactical Orbit</span>
          <Badge variant="outline" className="text-[10px] font-mono text-emerald-400 border-emerald-500/40 bg-emerald-950/40">
            SGP4 LIVE
          </Badge>
          {selectedEntityName && (
            <span className="text-[11px] font-mono text-cyan-400 font-semibold border-l border-border/70 pl-2">
              TARGET: {selectedEntityName}
            </span>
          )}
        </div>

        {/* Filter Layer Chips */}
        <div className="flex items-center gap-1 bg-black/80 backdrop-blur-md p-1 rounded-lg border border-border/70 shadow-lg pointer-events-auto">
          <button
            type="button"
            onClick={() => setActiveLayer("all")}
            className={`px-2.5 py-1 text-xs rounded-md font-mono font-semibold transition-all ${
              activeLayer === "all" ? "bg-primary text-primary-foreground shadow" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            All ({telemetryCount.satellites + telemetryCount.debris})
          </button>
          <button
            type="button"
            onClick={() => setActiveLayer("satellites")}
            className={`px-2.5 py-1 text-xs rounded-md font-mono font-semibold transition-all ${
              activeLayer === "satellites" ? "bg-emerald-600 text-white shadow" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Satellites ({telemetryCount.satellites})
          </button>
          <button
            type="button"
            onClick={() => setActiveLayer("debris")}
            className={`px-2.5 py-1 text-xs rounded-md font-mono font-semibold transition-all ${
              activeLayer === "debris" ? "bg-red-600 text-white shadow" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Debris ({telemetryCount.debris})
          </button>
          <button
            type="button"
            onClick={() => setActiveLayer("conjunctions")}
            className={`px-2.5 py-1 text-xs rounded-md font-mono font-semibold transition-all ${
              activeLayer === "conjunctions" ? "bg-amber-600 text-white shadow" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Critical ({telemetryCount.critical})
          </button>
        </div>
      </div>

      {/* Floating Action Shortcuts Overlay */}
      <div className="relative z-10 p-3 sm:p-4 flex flex-wrap items-end justify-between gap-3 pointer-events-none">
        {/* Selected Object Telemetry Inspector Card */}
        {selectedObject ? (
          <div className="flex flex-col bg-black/90 backdrop-blur-md p-3 rounded-lg border border-cyan-500/40 shadow-2xl pointer-events-auto font-mono text-[11px] w-72 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between gap-2 border-b border-border/70 pb-1.5 mb-1.5">
              <div className="flex items-center gap-1.5 truncate">
                <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
                <span className="font-bold text-cyan-400 truncate">{selectedObject.name}</span>
              </div>
              <button
                type="button"
                onClick={() => {
                  setSelectedObject(null);
                  setSelectedEntityName(null);
                }}
                className="text-zinc-400 hover:text-white text-xs px-1"
              >
                ✕
              </button>
            </div>
            <div className="grid grid-cols-2 gap-x-2 gap-y-1 text-zinc-300 text-[10px]">
              <div>NORAD: <span className="text-white font-semibold">{selectedObject.noradId}</span></div>
              <div>SHELL: <span className="text-white font-semibold">{selectedObject.shellId}</span></div>
              <div>ALTITUDE: <span className="text-lime-400 font-semibold">{selectedObject.altitude.toFixed(1)} km</span></div>
              <div>INCLINATION: <span className="text-amber-400 font-semibold">{selectedObject.orbitalElements.inclination.toFixed(2)}°</span></div>
              <div>ECCENTRICITY: <span className="text-zinc-100 font-semibold">{selectedObject.orbitalElements.eccentricity.toFixed(4)}</span></div>
              <div>STATUS: <span className="text-emerald-400 font-semibold uppercase">{selectedObject.status}</span></div>
            </div>
          </div>
        ) : (
          /* Color Legend */
          <div className="hidden sm:flex items-center gap-3 text-[11px] font-mono bg-black/80 backdrop-blur-md px-3 py-1.5 rounded-lg border border-border/70 pointer-events-auto">
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400" />
              Active Satellite
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-red-500" />
              Debris Fragment
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-orange-400" />
              Rocket Body
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-1 rounded-sm bg-red-500 animate-pulse" />
              Critical Conjunction Arc
            </span>
          </div>
        )}

        {/* Camera and Quick Focus Tools */}
        <div className="flex items-center gap-1.5 pointer-events-auto ml-auto">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleFocusISS}
            className="text-[11px] font-mono font-semibold h-8 bg-black/80 hover:bg-black/95 border-border/70 text-cyan-300 gap-1"
          >
            <Satellite className="h-3.5 w-3.5" />
            Track ISS
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleFocusCriticalConjunction}
            className="text-[11px] font-mono font-semibold h-8 bg-black/80 hover:bg-black/95 border-red-500/40 text-red-400 gap-1"
          >
            <AlertTriangle className="h-3.5 w-3.5" />
            Track Conjunction
          </Button>
          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={() => setAutoRotate(!autoRotate)}
            title={autoRotate ? "Pause Rotation" : "Auto Rotate"}
            className="h-8 w-8 bg-black/80 hover:bg-black/95 border-border/70"
          >
            {autoRotate ? <Pause className="h-3.5 w-3.5 text-amber-400" /> : <Play className="h-3.5 w-3.5 text-emerald-400" />}
          </Button>
          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={handleResetCamera}
            title="Reset Camera"
            className="h-8 w-8 bg-black/80 hover:bg-black/95 border-border/70"
          >
            <RotateCcw className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
    </div>
  );
}
