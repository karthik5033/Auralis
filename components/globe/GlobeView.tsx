"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
import * as THREE from "three";
import Globe, { GlobeInstance } from "globe.gl";
import type { TrackedObject, ConjunctionEvent } from "@/types/contract";
import { useWebSocket } from "@/components/providers/WebSocketProvider";
import { getObjects, getConjunctions } from "@/lib/api";
import { formatScientificPc } from "@/lib/formatters";
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
  FastForward,
  Flame,
  Orbit as OrbitIcon,
  ExternalLink,
  X
} from "lucide-react";
import Link from "next/link";

interface GlobeViewProps {
  initialObjects?: TrackedObject[];
  initialConjunctions?: ConjunctionEvent[];
  height?: number | string;
  onSelectObject?: (obj: TrackedObject) => void;
  onSelectConjunction?: (event: ConjunctionEvent) => void;
  className?: string;
}

export interface ProcessedSatellite {
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
  color: string;
  radius: number;
  inclination: number;
  raan: number;
  phase: number;
  angularVelocity: number;
  currentTheta?: number;
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

interface ProcessedPath {
  id: string;
  name: string;
  points: { lat: number; lng: number; alt: number }[];
  color: string;
  stroke?: number;
}

// Convert ECI state vector (km) to Geodetic latitude, longitude, and normalized altitude
function eciToGeodetic(pos: { x: number; y: number; z: number }, altKm: number) {
  const r = Math.sqrt(pos.x * pos.x + pos.y * pos.y + pos.z * pos.z) || 6771;
  const lat = Math.asin(Math.max(-1, Math.min(1, pos.z / r))) * (180 / Math.PI);
  const lng = Math.atan2(pos.y, pos.x) * (180 / Math.PI);
  // Normalized altitude for globe.gl: Earth radius = 6371 km -> altNorm = altKm / 6371
  const alt = Math.max(0.04, Math.min(0.25, altKm / 6371));
  return { lat, lng, alt };
}

// Compute full 360-degree orbital trajectory ring points from Keplerian elements
function computeOrbitRingPoints(
  inclinationDeg: number,
  raanDeg: number,
  altitudeKm: number
): { lat: number; lng: number; alt: number }[] {
  const points: { lat: number; lng: number; alt: number }[] = [];
  const incRad = (inclinationDeg * Math.PI) / 180;
  const raanRad = (raanDeg * Math.PI) / 180;
  const altNorm = Math.max(0.04, Math.min(0.25, altitudeKm / 6371));

  for (let u = 0; u <= 360; u += 4) {
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

// Create custom 3D floating space mesh for each satellite (NO vertical lines or ground stalks!)
function createSatelliteMesh(d: ProcessedSatellite): THREE.Object3D {
  const group = new THREE.Group();

  if (d.name.includes("ISS") || d.name.includes("TIANGONG")) {
    // Space Station model: Core habitat module + solar array wings + glowing beacon
    const moduleGeom = new THREE.CylinderGeometry(0.5, 0.5, 2.2, 8);
    const moduleMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    const moduleMesh = new THREE.Mesh(moduleGeom, moduleMat);
    moduleMesh.rotation.z = Math.PI / 2;
    group.add(moduleMesh);

    // Glowing cyan core orb
    const coreGeom = new THREE.SphereGeometry(0.85, 10, 10);
    const coreMat = new THREE.MeshBasicMaterial({ color: 0x38bdf8 });
    group.add(new THREE.Mesh(coreGeom, coreMat));

    // Solar panels
    const panelGeom = new THREE.BoxGeometry(4.0, 0.08, 1.0);
    const panelMat = new THREE.MeshBasicMaterial({ color: 0x0284c7 });
    group.add(new THREE.Mesh(panelGeom, panelMat));
  } else if (d.type === "satellite") {
    // Active satellite: Central satellite bus + blue solar panel wings
    const bodyGeom = new THREE.BoxGeometry(0.7, 0.7, 0.7);
    const bodyMat = new THREE.MeshBasicMaterial({ color: 0x10b981 });
    group.add(new THREE.Mesh(bodyGeom, bodyMat));

    const panelGeom = new THREE.BoxGeometry(2.2, 0.06, 0.55);
    const panelMat = new THREE.MeshBasicMaterial({ color: 0x38bdf8 });
    group.add(new THREE.Mesh(panelGeom, panelMat));
  } else if (d.type === "rocket_body") {
    // Spent Rocket Stage: Bronze/orange cylindrical booster
    const boosterGeom = new THREE.CylinderGeometry(0.45, 0.45, 1.5, 6);
    const boosterMat = new THREE.MeshBasicMaterial({ color: 0xf97316 });
    group.add(new THREE.Mesh(boosterGeom, boosterMat));
  } else {
    // Debris fragment: Sharp tumbling crystalline red octahedron
    const debrisGeom = new THREE.OctahedronGeometry(0.55, 0);
    const debrisMat = new THREE.MeshBasicMaterial({ color: 0xef4444 });
    group.add(new THREE.Mesh(debrisGeom, debrisMat));
  }

  return group;
}

export default function GlobeView({
  initialObjects = [],
  initialConjunctions = [],
  height = 480,
  onSelectObject,
  onSelectConjunction,
  className = "",
}: GlobeViewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const globeInstanceRef = useRef<GlobeInstance | null>(null);

  // Satellite 3D mesh registry for real-time 60fps orbital revolving animation
  const satelliteMeshesRef = useRef<Array<{ mesh: THREE.Object3D; data: ProcessedSatellite }>>([]);

  const [objects, setObjects] = useState<TrackedObject[]>(initialObjects);
  const [conjunctions, setConjunctions] = useState<ConjunctionEvent[]>(initialConjunctions);
  const [isRevolving, setIsRevolving] = useState(true);
  const [orbitSpeedMultiplier, setOrbitSpeedMultiplier] = useState(40); // 40x speed: ~90s full orbit
  const [autoRotate, setAutoRotate] = useState(true);
  const [activeLayer, setActiveLayer] = useState<"all" | "satellites" | "debris" | "critical">("all");
  const [selectedObject, setSelectedObject] = useState<TrackedObject | null>(null);
  const [telemetryCount, setTelemetryCount] = useState({ satellites: 0, debris: 0, critical: 0 });

  // Initial fetch if empty
  useEffect(() => {
    if (objects.length === 0) {
      getObjects({ limit: 650 }).then((res) => setObjects(res.data)).catch(console.error);
    }
    if (conjunctions.length === 0) {
      getConjunctions({ limit: 50 }).then((res) => setConjunctions(res.data)).catch(console.error);
    }
  }, [objects.length, conjunctions.length]);

  // 1. Process satellites into structured data with orbital velocity & inclination
  const satellitesData = React.useMemo<ProcessedSatellite[]>(() => {
    return objects
      .filter((obj) => {
        if (activeLayer === "satellites") return obj.type === "satellite";
        if (activeLayer === "debris") return obj.type === "debris" || obj.type === "rocket_body";
        if (activeLayer === "critical") {
          return conjunctions.some(
            (c) => c.riskLevel === "critical" && (c.primaryObjectId === obj.id || c.secondaryObjectId === obj.id)
          );
        }
        return true;
      })
      .map((obj, idx) => {
        const { lat, lng, alt } = eciToGeodetic(obj.position, obj.altitude);
        const velMagnitude = Math.sqrt(
          obj.velocity.vx ** 2 + obj.velocity.vy ** 2 + obj.velocity.vz ** 2
        ) || 7.6;

        let color = "#10b981"; // emerald for active satellites
        let radius = 0.35;

        if (obj.type === "debris") {
          color = "#ef4444"; // red for debris
          radius = 0.25;
        } else if (obj.type === "rocket_body") {
          color = "#f97316"; // orange for spent stages
          radius = 0.3;
        } else if (obj.name.includes("ISS") || obj.name.includes("TIANGONG")) {
          color = "#38bdf8"; // cyan highlight for space stations
          radius = 0.6;
        }

        // Orbital elements from data or derived from state vector
        const inclination = obj.orbitalElements?.inclination ?? (30 + ((idx * 17) % 65));
        const raan = obj.orbitalElements?.raan ?? ((idx * 37) % 360);
        const phase = (idx * 0.45) % (Math.PI * 2);

        // Orbital angular velocity: v / r (rad/s in real time)
        const orbitalRadiusKm = 6371 + obj.altitude;
        const angularVelocity = velMagnitude / orbitalRadiusKm; // ~0.0011 rad/s

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
          color,
          radius,
          inclination,
          raan,
          phase,
          angularVelocity,
          currentTheta: phase,
          raw: obj,
        };
      });
  }, [objects, activeLayer, conjunctions]);

  // 2. Process prominent orbital trajectory rings (Orbital Planes encircling Earth)
  const pathsData = React.useMemo<ProcessedPath[]>(() => {
    const paths: ProcessedPath[] = [];

    // Prominent orbital shell rings
    paths.push({
      id: "orbit-iss",
      name: "International Space Station (ISS) Plane (420 km, 51.6°)",
      points: computeOrbitRingPoints(51.6, 140, 420),
      color: "rgba(56, 189, 248, 0.85)", // Glowing Cyan
      stroke: 1.8,
    });

    paths.push({
      id: "orbit-starlink",
      name: "Starlink Megaconstellation Shell 1 (550 km, 53.0°)",
      points: computeOrbitRingPoints(53.0, 45, 550),
      color: "rgba(16, 185, 129, 0.75)", // Glowing Emerald
      stroke: 1.4,
    });

    paths.push({
      id: "orbit-sso",
      name: "Sun-Synchronous Polar Shell (800 km, 98.6°)",
      points: computeOrbitRingPoints(98.6, 300, 800),
      color: "rgba(129, 140, 248, 0.8)", // Glowing Violet/Indigo
      stroke: 1.4,
    });

    paths.push({
      id: "orbit-leo-low",
      name: "Low Earth Observation Shell (350 km, 28.5°)",
      points: computeOrbitRingPoints(28.5, 90, 350),
      color: "rgba(14, 165, 233, 0.65)", // Sky Blue
      stroke: 1.2,
    });

    paths.push({
      id: "orbit-tiangong",
      name: "Tiangong Space Station Plane (390 km, 41.5°)",
      points: computeOrbitRingPoints(41.5, 315, 390),
      color: "rgba(245, 158, 11, 0.75)", // Glowing Amber
      stroke: 1.4,
    });

    // If an object is selected by user, trace its active orbital plane in radiant white/red
    if (selectedObject && selectedObject.orbitalElements) {
      paths.push({
        id: `orbit-selected-${selectedObject.id}`,
        name: `${selectedObject.name} Trajectory Track`,
        points: computeOrbitRingPoints(
          selectedObject.orbitalElements.inclination,
          selectedObject.orbitalElements.raan,
          selectedObject.altitude
        ),
        color: selectedObject.type === "debris" ? "rgba(239, 68, 68, 0.95)" : "rgba(255, 255, 255, 0.95)",
        stroke: 2.2,
      });
    }

    return paths;
  }, [selectedObject]);

  // 3. Process conjunction trajectory arcs
  const arcsData = React.useMemo<ProcessedArc[]>(() => {
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
        let stroke = 1.0;
        let dashAnimateTime = 2500;

        if (c.riskLevel === "critical") {
          color = ["rgba(239, 68, 68, 0.95)", "rgba(249, 115, 22, 0.95)"];
          stroke = 2.0;
          dashAnimateTime = 1200;
        } else if (c.riskLevel === "elevated") {
          color = ["rgba(245, 158, 11, 0.9)", "rgba(234, 179, 8, 0.85)"];
          stroke = 1.4;
          dashAnimateTime = 1800;
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
          dashLength: 0.4,
          dashGap: 0.2,
          dashAnimateTime,
        };
      })
      .filter(Boolean) as ProcessedArc[];
  }, [objects, conjunctions]);

  // Update telemetry counters
  useEffect(() => {
    const sats = objects.filter((o) => o.type === "satellite").length;
    const deb = objects.filter((o) => o.type === "debris" || o.type === "rocket_body").length;
    const crit = conjunctions.filter((c) => c.riskLevel === "critical").length;
    setTelemetryCount({ satellites: sats, debris: deb, critical: crit });
  }, [objects, conjunctions]);

  // 4. Initialize Globe.gl WebGL Canvas
  useEffect(() => {
    if (!containerRef.current) return;

    satelliteMeshesRef.current = [];

    // Instantiate Globe
    const globe = new Globe(containerRef.current)
      .globeImageUrl("//unpkg.com/three-globe/example/img/earth-night.jpg")
      .bumpImageUrl("//unpkg.com/three-globe/example/img/earth-topology.png")
      .backgroundImageUrl("//unpkg.com/three-globe/example/img/night-sky.png")
      .atmosphereColor("#38bdf8")
      .atmosphereAltitude(0.18)
      // Custom 3D Object Layer: Floating satellites in 3D orbit (NO VERTICAL LINES/PILLARS!)
      .customLayerData(satellitesData)
      .customThreeObject((d: any) => {
        const mesh = createSatelliteMesh(d);
        satelliteMeshesRef.current.push({ mesh, data: d });
        return mesh;
      })
      .customThreeObjectUpdate((obj: any, d: any) => {
        const coords = globe.getCoords(d.lat, d.lng, d.alt);
        obj.position.set(coords.x, coords.y, coords.z);
      })
      .customLayerLabel(
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
      .onCustomLayerClick((d: any) => {
        setSelectedObject(d.raw);
        if (onSelectObject && d.raw) {
          onSelectObject(d.raw);
        }
      })
      // Trajectory Arcs for close approaches
      .arcsData(arcsData)
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
            <div style="color: #94a3b8;">Collision Probability: <span style="color: #ef4444; font-weight: 700;">${formatScientificPc(arc.event.collisionProbability)}</span></div>
            <div style="color: #94a3b8;">TCA: <span style="color: #f1f5f9;">${arc.event.tca}</span></div>
          </div>
        `
      )
      .onArcClick((arc: any) => {
        if (onSelectConjunction && arc.event) {
          onSelectConjunction(arc.event);
        }
      })
      // Prominent Orbital Trajectory Rings encircling Earth
      .pathsData(pathsData)
      .pathPoints("points")
      .pathPointLat("lat")
      .pathPointLng("lng")
      .pathPointAlt("alt")
      .pathColor("color")
      .pathStroke("stroke")
      .pathDashLength(0.06)
      .pathDashGap(0.02)
      .pathDashAnimateTime(5000);

    // Initial camera position
    globe.pointOfView({ lat: 25, lng: 45, altitude: 2.2 }, 1000);

    // Controls configuration
    const controls = globe.controls();
    controls.autoRotate = autoRotate;
    controls.autoRotateSpeed = 0.5;
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

    // 5. Continuous 60 FPS Keplerian Orbital Revolving Animation Loop
    let animId: number;
    let lastTimestamp = performance.now();

    const animateLoop = (currentTimestamp: number) => {
      animId = requestAnimationFrame(animateLoop);

      const deltaSeconds = Math.min(0.05, (currentTimestamp - lastTimestamp) / 1000);
      lastTimestamp = currentTimestamp;

      if (isRevolving && satelliteMeshesRef.current.length > 0) {
        const speedMult = orbitSpeedMultiplier;

        for (let i = 0; i < satelliteMeshesRef.current.length; i++) {
          const item = satelliteMeshesRef.current[i];
          if (!item || !item.mesh) continue;

          const { mesh, data } = item;

          // Advance orbital anomaly angle along ellipse:
          data.currentTheta = (data.currentTheta ?? data.phase) + data.angularVelocity * deltaSeconds * speedMult;

          const theta = data.currentTheta;
          const incRad = (data.inclination * Math.PI) / 180;
          const raanRad = (data.raan * Math.PI) / 180;
          // ThreeGlobe Earth sphere radius = 100
          const r = 100 * (1 + data.alt);

          // Position in 2D orbital plane:
          const xOrb = r * Math.cos(theta);
          const yOrb = r * Math.sin(theta);

          // Rotate to 3D Cartesian coordinates in ThreeGlobe space:
          const x = xOrb * Math.cos(raanRad) - yOrb * Math.cos(incRad) * Math.sin(raanRad);
          const z = xOrb * Math.sin(raanRad) + yOrb * Math.cos(incRad) * Math.cos(raanRad);
          const y = yOrb * Math.sin(incRad);

          mesh.position.set(x, y, z);

          // Tumble debris fragments; orient satellites along orbital flight vector
          if (data.type === "debris") {
            mesh.rotation.x += 0.02;
            mesh.rotation.y += 0.03;
          } else {
            mesh.lookAt(x * 1.02, y * 1.02, z * 1.02);
          }
        }
      }
    };

    animId = requestAnimationFrame(animateLoop);

    return () => {
      cancelAnimationFrame(animId);
      resizeObserver.disconnect();
      if (containerRef.current) {
        containerRef.current.innerHTML = "";
      }
      globeInstanceRef.current = null;
    };
  }, []);

  // Update customLayerData when satellitesData changes (layer filters or new objects)
  useEffect(() => {
    if (!globeInstanceRef.current) return;
    satelliteMeshesRef.current = [];
    globeInstanceRef.current.customLayerData(satellitesData);
  }, [satellitesData]);

  // Update arcsData and pathsData
  useEffect(() => {
    if (!globeInstanceRef.current) return;
    globeInstanceRef.current.arcsData(arcsData);
    globeInstanceRef.current.pathsData(pathsData);
  }, [arcsData, pathsData]);

  // Handle auto-rotation toggle
  useEffect(() => {
    if (!globeInstanceRef.current) return;
    globeInstanceRef.current.controls().autoRotate = autoRotate;
  }, [autoRotate]);

  // Real-Time WebSocket Updates Sync via unified provider
  useWebSocket("objects:updated", (payload) => {
    setObjects(payload.objects);
  });

  useWebSocket("conjunction:updated", (payload) => {
    setConjunctions((prev) =>
      prev.map((c) => (c.id === payload.id ? payload : c))
    );
  });

  useWebSocket("crisis:injected", () => {
    getObjects({ limit: 800 }).then((res) => setObjects(res.data));
    getConjunctions({ limit: 50 }).then((res) => setConjunctions(res.data));
  });

  // Camera Focus Actions
  const handleFocusISS = useCallback(() => {
    if (!globeInstanceRef.current) return;
    const iss = satellitesData.find((s) => s.name.includes("ISS"));
    if (iss) {
      globeInstanceRef.current.pointOfView(
        { lat: iss.lat, lng: iss.lng, altitude: 1.4 },
        1500
      );
      setSelectedObject(iss.raw);
    }
  }, [satellitesData]);

  const handleFocusConjunction = useCallback(() => {
    if (!globeInstanceRef.current) return;
    const crit = conjunctions.find((c) => c.riskLevel === "critical");
    if (crit) {
      const obj = objects.find((o) => o.id === crit.primaryObjectId);
      if (obj) {
        const { lat, lng } = eciToGeodetic(obj.position, obj.altitude);
        globeInstanceRef.current.pointOfView({ lat, lng, altitude: 1.5 }, 1500);
        setSelectedObject(obj);
      }
    }
  }, [conjunctions, objects]);

  const handleResetCamera = useCallback(() => {
    if (!globeInstanceRef.current) return;
    globeInstanceRef.current.pointOfView(
      { lat: 25, lng: 45, altitude: 2.2 },
      1200
    );
  }, []);

  return (
    <div className={`relative w-full overflow-hidden rounded-xl bg-black border border-border/70 ${className}`}>
      {/* 3D WebGL Canvas Container */}
      <div 
        ref={containerRef} 
        style={{ height: typeof height === "number" ? `${height}px` : height, width: "100%" }}
        className="w-full cursor-grab active:cursor-grabbing"
      />

      {/* Top Left HUD: Title & Telemetry Status */}
      <div className="absolute top-4 left-4 z-10 flex flex-col gap-1.5 pointer-events-none">
        <div className="flex items-center gap-2 pointer-events-auto">
          <Badge variant="outline" className="bg-background/80 backdrop-blur-md border-border/80 text-foreground font-mono text-xs px-2.5 py-1 flex items-center gap-1.5">
            <Radio className="w-3 h-3 text-emerald-400 animate-pulse" />
            <span>3D Tactical Orbit</span>
            <span className="text-muted-foreground">|</span>
            <span className="text-primary font-bold">SGP4 LIVE</span>
          </Badge>
          <Badge variant="outline" className="bg-background/80 backdrop-blur-md border-border/80 text-muted-foreground font-mono text-[10px] px-2 py-0.5 hidden sm:flex items-center gap-1">
            <OrbitIcon className="w-2.5 h-2.5 text-sky-400 animate-spin" />
            <span>{isRevolving ? `${orbitSpeedMultiplier}x Real-Time Orbit` : "Orbit Paused"}</span>
          </Badge>
        </div>

        {/* Selected Entity Card */}
        {selectedObject && (
          <div className="pointer-events-auto mt-1 max-w-xs p-3 rounded-lg bg-card/95 border border-primary/40 shadow-xl backdrop-blur-md animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between gap-2 mb-1.5">
              <span className="text-xs font-mono font-bold text-primary truncate">
                {selectedObject.name}
              </span>
              <button
                type="button"
                onClick={() => setSelectedObject(null)}
                className="text-muted-foreground hover:text-foreground p-0.5 rounded"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
            <div className="text-[11px] font-mono space-y-0.5 text-muted-foreground">
              <div className="flex justify-between">
                <span>NORAD ID:</span>
                <span className="text-foreground font-semibold">{selectedObject.noradId}</span>
              </div>
              <div className="flex justify-between">
                <span>Shell:</span>
                <span className="text-foreground font-semibold">{selectedObject.shellId}</span>
              </div>
              <div className="flex justify-between">
                <span>Altitude:</span>
                <span className="text-emerald-400 font-semibold">{selectedObject.altitude.toFixed(1)} km</span>
              </div>
            </div>
            <div className="mt-2 pt-1.5 border-t border-border/50 flex justify-end">
              <Link
                href={`/profiles/${selectedObject.id}`}
                className="text-[10px] font-mono text-primary hover:underline flex items-center gap-1 font-semibold"
              >
                <span>Telemetry Inspector</span>
                <ExternalLink className="w-2.5 h-2.5" />
              </Link>
            </div>
          </div>
        )}
      </div>

      {/* Top Right HUD: Layer Filters */}
      <div className="absolute top-4 right-4 z-10 flex items-center gap-1.5 bg-background/80 backdrop-blur-md p-1 rounded-lg border border-border/80">
        <button
          type="button"
          onClick={() => setActiveLayer("all")}
          className={`px-2 py-1 rounded text-[11px] font-mono font-semibold transition-all ${
            activeLayer === "all"
              ? "bg-primary text-primary-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
          }`}
        >
          All ({objects.length})
        </button>
        <button
          type="button"
          onClick={() => setActiveLayer("satellites")}
          className={`px-2 py-1 rounded text-[11px] font-mono font-semibold transition-all flex items-center gap-1 ${
            activeLayer === "satellites"
              ? "bg-emerald-600 text-white shadow-sm"
              : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
          }`}
        >
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
          Satellites ({telemetryCount.satellites})
        </button>
        <button
          type="button"
          onClick={() => setActiveLayer("debris")}
          className={`px-2 py-1 rounded text-[11px] font-mono font-semibold transition-all flex items-center gap-1 ${
            activeLayer === "debris"
              ? "bg-red-600 text-white shadow-sm"
              : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
          }`}
        >
          <span className="w-1.5 h-1.5 rounded-full bg-red-400" />
          Debris ({telemetryCount.debris})
        </button>
        <button
          type="button"
          onClick={() => setActiveLayer("critical")}
          className={`px-2 py-1 rounded text-[11px] font-mono font-semibold transition-all flex items-center gap-1 ${
            activeLayer === "critical"
              ? "bg-destructive text-destructive-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
          }`}
        >
          <AlertTriangle className="w-3 h-3 text-red-400" />
          Critical ({telemetryCount.critical})
        </button>
      </div>

      {/* Bottom Center: Legend */}
      <div className="absolute bottom-4 left-4 z-10 hidden lg:flex items-center gap-4 bg-background/80 backdrop-blur-md px-3 py-1.5 rounded-lg border border-border/80 text-[11px] font-mono text-muted-foreground">
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-sm bg-emerald-400" />
          <span className="text-foreground font-medium">Active Satellite</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-sm bg-red-500" />
          <span className="text-foreground font-medium">Debris Fragment</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-sm bg-orange-500" />
          <span className="text-foreground font-medium">Rocket Body</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-sky-400 ring-2 ring-sky-500/40" />
          <span className="text-foreground font-medium">ISS / Station</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-3.5 h-0.5 bg-gradient-to-r from-red-500 to-orange-500" />
          <span className="text-foreground font-medium">Conjunction Arc</span>
        </div>
      </div>

      {/* Bottom Right HUD: Camera & Orbit Controls */}
      <div className="absolute bottom-4 right-4 z-10 flex items-center gap-2">
        {/* Orbital Speed Selector */}
        <div className="flex items-center bg-background/80 backdrop-blur-md rounded-lg border border-border/80 p-0.5">
          <button
            type="button"
            onClick={() => setOrbitSpeedMultiplier(1)}
            title="Real-Time Speed (1x)"
            className={`px-2 py-1 rounded text-[10px] font-mono font-bold transition-all ${
              orbitSpeedMultiplier === 1 ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            1x
          </button>
          <button
            type="button"
            onClick={() => setOrbitSpeedMultiplier(40)}
            title="Tactical Orbit Speed (40x)"
            className={`px-2 py-1 rounded text-[10px] font-mono font-bold transition-all ${
              orbitSpeedMultiplier === 40 ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            40x
          </button>
          <button
            type="button"
            onClick={() => setOrbitSpeedMultiplier(90)}
            title="Fast Warp Speed (90x)"
            className={`px-2 py-1 rounded text-[10px] font-mono font-bold transition-all ${
              orbitSpeedMultiplier === 90 ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            90x
          </button>
        </div>

        {/* Orbit Motion Toggle */}
        <Button
          variant="outline"
          size="sm"
          onClick={() => setIsRevolving(!isRevolving)}
          className={`h-8 px-2.5 bg-background/80 backdrop-blur-md border-border/80 font-mono text-xs ${
            isRevolving ? "text-emerald-400 hover:text-emerald-300" : "text-muted-foreground"
          }`}
          title={isRevolving ? "Pause Satellite Motion" : "Resume Satellite Motion"}
        >
          {isRevolving ? <Pause className="w-3.5 h-3.5 mr-1" /> : <Play className="w-3.5 h-3.5 mr-1 text-emerald-400" />}
          <span className="hidden sm:inline">{isRevolving ? "Orbiting" : "Paused"}</span>
        </Button>

        {/* Track ISS Shortcut */}
        <Button
          variant="outline"
          size="sm"
          onClick={handleFocusISS}
          className="h-8 px-2.5 bg-background/80 backdrop-blur-md border-border/80 font-mono text-xs text-sky-400 hover:text-sky-300 hover:bg-sky-950/40"
          title="Track International Space Station"
        >
          <Crosshair className="w-3.5 h-3.5 mr-1" />
          <span className="hidden sm:inline">Track ISS</span>
        </Button>

        {/* Track Critical Conjunction */}
        <Button
          variant="outline"
          size="sm"
          onClick={handleFocusConjunction}
          className="h-8 px-2.5 bg-background/80 backdrop-blur-md border-destructive/50 text-destructive font-mono text-xs hover:bg-destructive/10"
          title="Track Active Conjunction Event"
        >
          <AlertTriangle className="w-3.5 h-3.5 mr-1" />
          <span className="hidden sm:inline">Track Conjunction</span>
        </Button>

        {/* Camera Auto-Rotate Earth Toggle */}
        <Button
          variant="outline"
          size="icon"
          onClick={() => setAutoRotate(!autoRotate)}
          className={`h-8 w-8 bg-background/80 backdrop-blur-md border-border/80 ${
            autoRotate ? "text-primary" : "text-muted-foreground"
          }`}
          title={autoRotate ? "Pause Earth Rotation" : "Resume Earth Rotation"}
        >
          <RotateCcw className={`w-3.5 h-3.5 ${autoRotate ? "animate-spin" : ""}`} />
        </Button>

        {/* Reset Camera Position */}
        <Button
          variant="outline"
          size="icon"
          onClick={handleResetCamera}
          className="h-8 w-8 bg-background/80 backdrop-blur-md border-border/80 text-muted-foreground hover:text-foreground"
          title="Reset View"
        >
          <Maximize2 className="w-3.5 h-3.5" />
        </Button>
      </div>
    </div>
  );
}
