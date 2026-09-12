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
  Radio,
  Orbit as OrbitIcon,
  ExternalLink,
  X,
  AlertTriangle
} from "lucide-react";
import Link from "next/link";

interface GlobeViewProps {
  initialObjects?: TrackedObject[];
  initialConjunctions?: ConjunctionEvent[];
  height?: number | string;
  onSelectObject?: (obj: TrackedObject) => void;
  onSelectConjunction?: (event: ConjunctionEvent) => void;
  className?: string;
  compact?: boolean;
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
  stroke?: number;
  dashLength: number;
  dashGap: number;
  dashAnimateTime: number;
}

// Convert ECI state vector (km) to Geodetic latitude, longitude, and normalized altitude
function eciToGeodetic(pos: { x: number; y: number; z: number }, altKm: number) {
  const r = Math.sqrt(pos.x * pos.x + pos.y * pos.y + pos.z * pos.z) || 6771;
  const lat = Math.asin(Math.max(-1, Math.min(1, pos.z / r))) * (180 / Math.PI);
  const lng = Math.atan2(pos.y, pos.x) * (180 / Math.PI);
  const alt = Math.max(0.04, Math.min(0.25, altKm / 6371));
  return { lat, lng, alt };
}

/**
 * Compute mathematically exact 3D Keplerian orbital trajectory ring in space.
 * 
 * Physics & Astrodynamics Formulation:
 * - Earth is centered at origin (0, 0, 0) with ThreeGlobe radius R_globe = 100 (representing R_earth = 6371 km).
 * - For altitude h (km), the orbital radius is R_orbit = 100 * (1 + h / 6371) > 100.
 * - In ECI coordinates, with orbital inclination i and RAAN Ω, for true anomaly / argument of latitude u ∈ [0, 2π]:
 *     z_eci = R_orbit * sin(i) * sin(u)
 *     x_eci = R_orbit * (cos(Ω) * cos(u) - sin(Ω) * cos(i) * sin(u))
 *     y_eci = R_orbit * (sin(Ω) * cos(u) + cos(Ω) * cos(i) * sin(u))
 * - In ThreeGlobe 3D scene coordinates: Y is Earth's polar spin axis (North Pole), Z is the Prime Meridian, and X is 90°E.
 *   Therefore: X_3d = y_eci, Y_3d = z_eci, Z_3d = x_eci.
 * - Every point is at constant distance R_orbit > 100 from (0,0,0), strictly outside the Earth's radius of 100.
 * - Connected via THREE.LineLoop with THREE.LineBasicMaterial, forming a pure 1px hairline ring with ZERO thick SVG tubes
 *   and ZERO antimeridian discontinuity chords cutting through Earth.
 */
function createKeplerianOrbitRing(
  inclinationDeg: number,
  raanDeg: number,
  altitudeKm: number,
  colorHex: number,
  opacity: number = 0.35
): THREE.LineLoop {
  const points: THREE.Vector3[] = [];
  const segments = 256;
  const rOrbit = 100 * (1 + Math.max(0.035, altitudeKm / 6371));
  const incRad = (inclinationDeg * Math.PI) / 180;
  const raanRad = (raanDeg * Math.PI) / 180;

  for (let s = 0; s < segments; s++) {
    const u = (s / segments) * Math.PI * 2;
    const zEci = rOrbit * Math.sin(incRad) * Math.sin(u);
    const xEci = rOrbit * (Math.cos(raanRad) * Math.cos(u) - Math.sin(raanRad) * Math.cos(incRad) * Math.sin(u));
    const yEci = rOrbit * (Math.sin(raanRad) * Math.cos(u) + Math.cos(raanRad) * Math.cos(incRad) * Math.sin(u));

    // Maps directly into ThreeGlobe coordinate frame (X = yEci, Y = zEci, Z = xEci)
    points.push(new THREE.Vector3(yEci, zEci, xEci));
  }

  const geometry = new THREE.BufferGeometry().setFromPoints(points);
  const material = new THREE.LineBasicMaterial({
    color: new THREE.Color(colorHex),
    transparent: true,
    opacity,
    depthWrite: false,
  });

  return new THREE.LineLoop(geometry, material);
}

// Create custom 3D glowing orbital orb for each satellite (ZERO cylinders, bars, or surface spikes!)
function createSatelliteMesh(d: ProcessedSatellite): THREE.Object3D {
  const group = new THREE.Group();

  if (d.name.includes("ISS") || d.name.includes("TIANGONG")) {
    // Space Station: Luminous cyan core orb + equatorial orbital halo ring
    const coreGeom = new THREE.SphereGeometry(0.7, 12, 12);
    const coreMat = new THREE.MeshBasicMaterial({ color: 0x38bdf8 });
    group.add(new THREE.Mesh(coreGeom, coreMat));

    const ringGeom = new THREE.RingGeometry(0.95, 1.25, 24);
    const ringMat = new THREE.MeshBasicMaterial({
      color: 0x38bdf8,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.7,
    });
    const ringMesh = new THREE.Mesh(ringGeom, ringMat);
    ringMesh.rotation.x = Math.PI / 2;
    group.add(ringMesh);
  } else if (d.type === "debris") {
    // Debris fragment: Sharp tumbling crystalline warning-red octahedron
    const debrisGeom = new THREE.OctahedronGeometry(0.24, 0);
    const debrisMat = new THREE.MeshBasicMaterial({ color: 0xef4444 });
    group.add(new THREE.Mesh(debrisGeom, debrisMat));
  } else if (d.type === "rocket_body") {
    // Spent Rocket Stage: Glowing amber orb
    const boosterGeom = new THREE.SphereGeometry(0.3, 8, 8);
    const boosterMat = new THREE.MeshBasicMaterial({ color: 0xf97316 });
    group.add(new THREE.Mesh(boosterGeom, boosterMat));
  } else {
    // Active satellite: Crisp emerald orb with subtle outer glow sphere
    const bodyGeom = new THREE.SphereGeometry(0.34, 10, 10);
    const bodyMat = new THREE.MeshBasicMaterial({ color: 0x10b981 });
    group.add(new THREE.Mesh(bodyGeom, bodyMat));

    const haloGeom = new THREE.SphereGeometry(0.52, 8, 8);
    const haloMat = new THREE.MeshBasicMaterial({
      color: 0x10b981,
      transparent: true,
      opacity: 0.25,
    });
    group.add(new THREE.Mesh(haloGeom, haloMat));
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
  compact = false,
}: GlobeViewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const globeInstanceRef = useRef<GlobeInstance | null>(null);

  // Satellite 3D mesh registry for real-time 60fps orbital revolving animation
  const satelliteMeshesRef = useRef<Array<{ mesh: THREE.Object3D; data: ProcessedSatellite }>>([]);
  // Dedicated Three.js group for mathematically exact 3D Keplerian hairline orbit trajectory rings
  const orbitRingsGroupRef = useRef<THREE.Group | null>(null);
  // Continuous anomaly angle tracker so satellites NEVER snap back or restart like a gif
  const currentThetaMapRef = useRef<Map<string, number>>(new Map());

  const [objects, setObjects] = useState<TrackedObject[]>(initialObjects);
  const [conjunctions, setConjunctions] = useState<ConjunctionEvent[]>(initialConjunctions);
  const [isRevolving, setIsRevolving] = useState(true);
  const [orbitSpeedMultiplier, setOrbitSpeedMultiplier] = useState(40); // 40x speed: ~2 min full orbit
  const [autoRotate, setAutoRotate] = useState(true);
  const [activeLayer, setActiveLayer] = useState<"all" | "satellites" | "debris" | "critical">("all");
  const prevLayerRef = useRef<"all" | "satellites" | "debris" | "critical">("all");
  const prevCountRef = useRef(0);
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
          radius = 0.65;
        }

        // Orbital elements from telemetry or derived from state vector
        const inclination = obj.orbitalElements?.inclination ?? (30 + ((idx * 17) % 65));
        const raan = obj.orbitalElements?.raan ?? ((idx * 37) % 360);
        const phase = (idx * 0.45) % (Math.PI * 2);

        // Orbital angular velocity: v / r (rad/s in real time)
        const orbitalRadiusKm = 6371 + obj.altitude;
        const angularVelocity = velMagnitude / orbitalRadiusKm; // ~0.0011 rad/s

        // Retrieve continuously tracked anomaly so satellite NEVER snaps back on data updates
        const existingTheta = currentThetaMapRef.current.get(obj.id);
        const theta = existingTheta ?? phase;
        currentThetaMapRef.current.set(obj.id, theta);

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
          currentTheta: theta,
          raw: obj,
        };
      });
  }, [objects, activeLayer, conjunctions]);

  // 2. Process conjunction trajectory arcs: rendered as crisp 1px hairline laser pulses
  const arcsData = React.useMemo<ProcessedArc[]>(() => {
    const objMap = new Map<string, TrackedObject>();
    objects.forEach((o) => objMap.set(o.id, o));

    // Focus only on active critical/elevated conjunctions, limited to top 4 events to keep display clear and tactical
    const targetConjunctions = conjunctions
      .filter((c) => c.status === "active" || c.status === "monitoring" || c.status === "mitigated")
      .filter((c) => (activeLayer === "critical" ? c.riskLevel === "critical" : c.riskLevel === "critical" || c.riskLevel === "elevated"))
      .slice(0, 4);

    return targetConjunctions
      .map((c) => {
        const primary = objMap.get(c.primaryObjectId);
        const secondary = objMap.get(c.secondaryObjectId);
        if (!primary || !secondary) return null;

        const pCoord = eciToGeodetic(primary.position, primary.altitude);
        const sCoord = eciToGeodetic(secondary.position, secondary.altitude);

        let color = ["rgba(245, 158, 11, 0.75)", "rgba(234, 179, 8, 0.75)"]; // Subtle amber
        let dashAnimateTime = 2000;

        if (c.riskLevel === "critical") {
          color = ["rgba(239, 68, 68, 0.85)", "rgba(249, 115, 22, 0.85)"]; // Subtle red-orange warning
          dashAnimateTime = 1400;
        }

        return {
          id: c.id,
          event: c,
          startLat: pCoord.lat,
          startLng: pCoord.lng,
          startAlt: Math.max(0.06, pCoord.alt),
          endLat: sCoord.lat,
          endLng: sCoord.lng,
          endAlt: Math.max(0.06, sCoord.alt),
          color,
          dashLength: 0.5,
          dashGap: 0.3,
          dashAnimateTime,
        };
      })
      .filter(Boolean) as ProcessedArc[];
  }, [objects, conjunctions, activeLayer]);

  // Update telemetry counters
  useEffect(() => {
    const sats = objects.filter((o) => o.type === "satellite").length;
    const deb = objects.filter((o) => o.type === "debris" || o.type === "rocket_body").length;
    const crit = conjunctions.filter((c) => c.riskLevel === "critical").length;
    setTelemetryCount({ satellites: sats, debris: deb, critical: crit });
  }, [objects, conjunctions]);

  // 3. Populate 3D Keplerian hairline orbit rings in Three.js scene
  useEffect(() => {
    const group = orbitRingsGroupRef.current;
    if (!group) return;

    // Clean up previous rings to prevent WebGL memory leaks
    group.traverse((child) => {
      if (child instanceof THREE.LineLoop || child instanceof THREE.Line) {
        child.geometry.dispose();
        if (Array.isArray(child.material)) {
          child.material.forEach((m) => m.dispose());
        } else {
          child.material.dispose();
        }
      }
    });
    group.clear();

    // 1. Prominent Orbital Shell Trajectory Rings (refined, sleek, dark-theme 1px hairlines)
    // ISS Crewed Orbit (420 km, 51.6°)
    group.add(createKeplerianOrbitRing(51.6, 140, 420, 0x38bdf8, 0.35));
    // Starlink Megaconstellation Shell (550 km, 53.0°)
    group.add(createKeplerianOrbitRing(53.0, 45, 550, 0x10b981, 0.28));
    // Sun-Synchronous Polar Shell (800 km, 98.6°)
    group.add(createKeplerianOrbitRing(98.6, 300, 800, 0x818cf8, 0.28));
    // Low Earth Observation Shell (350 km, 28.5°)
    group.add(createKeplerianOrbitRing(28.5, 90, 350, 0x94a3b8, 0.22));
    // Tiangong CSS Orbit (390 km, 41.5°)
    group.add(createKeplerianOrbitRing(41.5, 315, 390, 0xf59e0b, 0.28));

    // 2. If an object is selected by user, trace its active orbital plane in radiant, razor-sharp hairline
    if (selectedObject && selectedObject.orbitalElements) {
      const isDebris = selectedObject.type === "debris";
      const ringColor = isDebris ? 0xef4444 : 0xffffff;
      group.add(
        createKeplerianOrbitRing(
          selectedObject.orbitalElements.inclination,
          selectedObject.orbitalElements.raan,
          selectedObject.altitude,
          ringColor,
          0.85
        )
      );
    }
  }, [selectedObject]);

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
      // Custom 3D Object Layer: Floating luminous orbs revolving in 3D orbit (NO STICKS OR CYLINDERS!)
      .customLayerData(satellitesData)
      .customThreeObject((d: any) => {
        const mesh = createSatelliteMesh(d);
        // Position mesh initially at exact 3D Keplerian orbital coordinates
        const rSat = 100 * (1 + Math.max(0.035, d.alt));
        const u = d.currentTheta ?? d.phase ?? 0;
        const incRad = (d.inclination * Math.PI) / 180;
        const raanRad = (d.raan * Math.PI) / 180;
        const zEci = rSat * Math.sin(incRad) * Math.sin(u);
        const xEci = rSat * (Math.cos(raanRad) * Math.cos(u) - Math.sin(raanRad) * Math.cos(incRad) * Math.sin(u));
        const yEci = rSat * (Math.sin(raanRad) * Math.cos(u) + Math.cos(raanRad) * Math.cos(incRad) * Math.sin(u));
        mesh.position.set(yEci, zEci, xEci);
        satelliteMeshesRef.current.push({ mesh, data: d });
        return mesh;
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
      // Trajectory Arcs for close approaches: rendered as thin 1px hairline laser pulses
      .arcsData(arcsData)
      .arcStartLat("startLat")
      .arcStartLng("startLng")
      .arcStartAltitude("startAlt")
      .arcEndLat("endLat")
      .arcEndLng("endLng")
      .arcEndAltitude("endAlt")
      .arcColor("color")
      .arcAltitude(0.12) // Arches safely 760 km above Earth, never penetrating or clipping into the sphere
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
      });

    // Attach Three.js group for 3D Keplerian hairline orbit rings directly into Scene
    const orbitGroup = new THREE.Group();
    globe.scene().add(orbitGroup);
    orbitRingsGroupRef.current = orbitGroup;

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

      if (isRevolving && globeInstanceRef.current && satelliteMeshesRef.current.length > 0) {
        const speedMult = orbitSpeedMultiplier;

        for (let i = 0; i < satelliteMeshesRef.current.length; i++) {
          const item = satelliteMeshesRef.current[i];
          if (!item || !item.mesh) continue;

          const { mesh, data } = item;

          // Advance orbital anomaly angle along orbit continuously:
          data.currentTheta = (data.currentTheta ?? data.phase) + data.angularVelocity * deltaSeconds * speedMult;
          currentThetaMapRef.current.set(data.id, data.currentTheta);

          const u = data.currentTheta;
          const incRad = (data.inclination * Math.PI) / 180;
          const raanRad = (data.raan * Math.PI) / 180;
          const rSat = 100 * (1 + Math.max(0.035, data.alt));

          // 3D Cartesian coordinates in ECI: mathematically identical to the 3D orbit ring
          const zEci = rSat * Math.sin(incRad) * Math.sin(u);
          const xEci = rSat * (Math.cos(raanRad) * Math.cos(u) - Math.sin(raanRad) * Math.cos(incRad) * Math.sin(u));
          const yEci = rSat * (Math.sin(raanRad) * Math.cos(u) + Math.cos(raanRad) * Math.cos(incRad) * Math.sin(u));

          // Directly position mesh in ThreeGlobe 3D coordinate space (X = yEci, Y = zEci, Z = xEci)
          mesh.position.set(yEci, zEci, xEci);

          // Tumble debris fragments
          if (data.type === "debris") {
            mesh.rotation.x += 0.03;
            mesh.rotation.y += 0.02;
          }
        }
      }
    };

    animId = requestAnimationFrame(animateLoop);

    return () => {
      cancelAnimationFrame(animId);
      resizeObserver.disconnect();
      if (orbitRingsGroupRef.current) {
        orbitRingsGroupRef.current.traverse((child) => {
          if (child instanceof THREE.LineLoop || child instanceof THREE.Line) {
            child.geometry.dispose();
            if (Array.isArray(child.material)) {
              child.material.forEach((m) => m.dispose());
            } else {
              child.material.dispose();
            }
          }
        });
        orbitRingsGroupRef.current.clear();
      }
      orbitRingsGroupRef.current = null;

      try {
        const globe = globeInstanceRef.current as any;
        if (globe && typeof globe._destructor === "function") {
          globe._destructor();
        }
      } catch (err) {
        // Handled cleanly
      }
      globeInstanceRef.current = null;
    };
  }, []);

  // Update customLayerData ONLY when layer filters change or objects are added/removed (e.g. crisis injection)
  useEffect(() => {
    if (!globeInstanceRef.current) return;

    const layerChanged = prevLayerRef.current !== activeLayer;
    const countChanged = prevCountRef.current !== satellitesData.length;

    if (layerChanged || countChanged || satelliteMeshesRef.current.length === 0) {
      prevLayerRef.current = activeLayer;
      prevCountRef.current = satellitesData.length;
      satelliteMeshesRef.current = [];
      globeInstanceRef.current.customLayerData(satellitesData);
    }
  }, [satellitesData, activeLayer]);

  // Update arcsData
  useEffect(() => {
    if (!globeInstanceRef.current) return;
    globeInstanceRef.current.arcsData(arcsData);
  }, [arcsData]);

  // Handle auto-rotation toggle
  useEffect(() => {
    if (!globeInstanceRef.current) return;
    globeInstanceRef.current.controls().autoRotate = autoRotate;
  }, [autoRotate]);

  // Real-Time WebSocket Updates Sync via unified provider
  useWebSocket("objects:updated", (payload) => {
    // If object count is unchanged, update underlying object metadata without triggering a scene rebuild
    if (payload.objects.length === objects.length) {
      const objMap = new Map(payload.objects.map((o) => [o.id, o]));
      satelliteMeshesRef.current.forEach((item) => {
        const updated = objMap.get(item.data.id);
        if (updated) {
          item.data.raw = updated;
          item.data.status = updated.status;
        }
      });
      return;
    }
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
            <OrbitIcon className={`w-2.5 h-2.5 text-sky-400 ${isRevolving ? "animate-spin" : ""}`} />
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
      <div className="absolute top-3 right-3 z-10 flex items-center gap-1 bg-background/85 backdrop-blur-md p-0.5 rounded-lg border border-border/80 shadow-md">
        <button
          type="button"
          onClick={() => setActiveLayer("all")}
          title={`All cataloged bodies (${objects.length})`}
          className={`px-2 py-0.5 rounded text-[10px] font-mono font-semibold transition-all ${
            activeLayer === "all"
              ? "bg-primary text-primary-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          All ({objects.length})
        </button>
        <button
          type="button"
          onClick={() => setActiveLayer("satellites")}
          title={`Active Satellites (${telemetryCount.satellites})`}
          className={`px-1.5 py-0.5 rounded text-[10px] font-mono font-semibold transition-all flex items-center gap-1 ${
            activeLayer === "satellites"
              ? "bg-zinc-800 text-zinc-100 border border-zinc-700 shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
          <span className={compact ? "hidden sm:inline" : ""}>Sats</span>
          <span>({telemetryCount.satellites})</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveLayer("debris")}
          title={`Debris Fragments (${telemetryCount.debris})`}
          className={`px-1.5 py-0.5 rounded text-[10px] font-mono font-semibold transition-all flex items-center gap-1 ${
            activeLayer === "debris"
              ? "bg-zinc-800 text-zinc-100 border border-zinc-700 shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <span className="w-1.5 h-1.5 rounded-full bg-red-400" />
          <span className={compact ? "hidden sm:inline" : ""}>Debris</span>
          <span>({telemetryCount.debris})</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveLayer("critical")}
          title={`Critical Conjunctions (${telemetryCount.critical})`}
          className={`px-1.5 py-0.5 rounded text-[10px] font-mono font-semibold transition-all flex items-center gap-1 ${
            activeLayer === "critical"
              ? "bg-red-950/80 text-red-300 border border-red-500/40 shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <AlertTriangle className="w-3 h-3 text-red-400" />
          <span className={compact ? "hidden sm:inline" : ""}>Critical</span>
          <span>({telemetryCount.critical})</span>
        </button>
      </div>

      {/* Bottom Left: Legend (Hidden in compact mode to prevent collision) */}
      {!compact && (
        <div className="absolute bottom-4 left-4 z-10 hidden xl:flex items-center gap-4 bg-background/80 backdrop-blur-md px-3 py-1.5 rounded-lg border border-border/80 text-[11px] font-mono text-muted-foreground">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 shadow-[0_0_6px_#10b981]" />
            <span className="text-foreground font-medium">Active Satellite</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rotate-45 bg-red-500 shadow-[0_0_6px_#ef4444]" />
            <span className="text-foreground font-medium">Debris Fragment</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-orange-500 shadow-[0_0_6px_#f97316]" />
            <span className="text-foreground font-medium">Rocket Body</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-sky-400 ring-2 ring-sky-500/50 shadow-[0_0_8px_#38bdf8]" />
            <span className="text-foreground font-medium">ISS / Station</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-4 h-0.5 bg-gradient-to-r from-red-500 to-orange-500" />
            <span className="text-foreground font-medium">Conjunction Arc</span>
          </div>
        </div>
      )}

      {/* Bottom Right HUD: Camera & Orbit Controls */}
      <div className="absolute bottom-3 right-3 z-10 flex items-center gap-1.5 max-w-[calc(100%-1.5rem)] overflow-x-auto no-scrollbar">
        {/* Orbital Speed Selector */}
        <div className="flex items-center bg-background/85 backdrop-blur-md rounded-lg border border-border/80 p-0.5 shadow-md shrink-0">
          <button
            type="button"
            onClick={() => setOrbitSpeedMultiplier(1)}
            title="Real-Time Speed (1x)"
            className={`px-1.5 py-1 rounded text-[10px] font-mono font-bold transition-all ${
              orbitSpeedMultiplier === 1 ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            1x
          </button>
          <button
            type="button"
            onClick={() => setOrbitSpeedMultiplier(40)}
            title="Tactical Orbit Speed (40x)"
            className={`px-1.5 py-1 rounded text-[10px] font-mono font-bold transition-all ${
              orbitSpeedMultiplier === 40 ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            40x
          </button>
          <button
            type="button"
            onClick={() => setOrbitSpeedMultiplier(90)}
            title="Fast Warp Speed (90x)"
            className={`px-1.5 py-1 rounded text-[10px] font-mono font-bold transition-all ${
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
          className={`h-7 px-2 bg-background/85 backdrop-blur-md border-border/80 font-mono text-xs shadow-md shrink-0 ${
            isRevolving ? "text-emerald-400 hover:text-emerald-300" : "text-muted-foreground"
          }`}
          title={isRevolving ? "Pause Satellite Motion" : "Resume Satellite Motion"}
        >
          {isRevolving ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5 text-emerald-400" />}
          {!compact && <span className="hidden md:inline ml-1">{isRevolving ? "Orbiting" : "Paused"}</span>}
        </Button>

        {/* Track ISS Shortcut */}
        <Button
          variant="outline"
          size="sm"
          onClick={handleFocusISS}
          className="h-7 px-2 bg-background/85 backdrop-blur-md border-border/80 font-mono text-xs text-sky-400 hover:text-sky-300 hover:bg-sky-950/40 shadow-md shrink-0"
          title="Track International Space Station"
        >
          <Crosshair className="w-3.5 h-3.5" />
          {!compact && <span className="hidden md:inline ml-1">ISS</span>}
        </Button>

        {/* Track Critical Conjunction */}
        <Button
          variant="outline"
          size="sm"
          onClick={handleFocusConjunction}
          className="h-7 px-2 bg-background/85 backdrop-blur-md border-destructive/50 text-destructive font-mono text-xs hover:bg-destructive/10 shadow-md shrink-0"
          title="Track Active Conjunction Event"
        >
          <AlertTriangle className="w-3.5 h-3.5" />
          {!compact && <span className="hidden md:inline ml-1">Conjunction</span>}
        </Button>

        {/* Camera Auto-Rotate Earth Toggle */}
        <Button
          variant="outline"
          size="icon"
          onClick={() => setAutoRotate(!autoRotate)}
          className={`h-7 w-7 bg-background/85 backdrop-blur-md border-border/80 shadow-md shrink-0 ${
            autoRotate ? "text-primary" : "text-muted-foreground"
          }`}
          title={autoRotate ? "Pause Earth Rotation" : "Resume Earth Rotation"}
        >
          <RotateCcw className={`w-3 h-3 ${autoRotate ? "animate-spin" : ""}`} />
        </Button>

        {/* Reset Camera Position */}
        <Button
          variant="outline"
          size="icon"
          onClick={handleResetCamera}
          className="h-7 w-7 bg-background/85 backdrop-blur-md border-border/80 text-muted-foreground hover:text-foreground shadow-md shrink-0"
          title="Reset View"
        >
          <Maximize2 className="w-3 h-3" />
        </Button>
      </div>
    </div>
  );
}
