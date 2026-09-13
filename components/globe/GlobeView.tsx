"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
import * as THREE from "three";
import Globe, { GlobeInstance } from "globe.gl";
import type { TrackedObject, ConjunctionEvent } from "@/types/contract";
import { deriveKeplerianElements, eciToGeodeticCoords, GM_EARTH_KM3_S2 } from "@/data/propagator";
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
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  Target,
} from "lucide-react";
import Link from "next/link";
import curatedCatalog from "@/data/fixtures/parsed-tracked-objects.json";

interface GlobeViewProps {
  initialObjects?: TrackedObject[];
  initialConjunctions?: ConjunctionEvent[];
  height?: number | string;
  onSelectObject?: (obj: TrackedObject) => void;
  onSelectConjunction?: (event: ConjunctionEvent) => void;
  className?: string;
  compact?: boolean;
  fetchOnEmpty?: boolean;
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
  sizeCategory: "station" | "heavy" | "standard" | "smallsat" | "rocket_body" | "debris_large" | "debris_medium" | "debris_small";
  displaySize: number;
  inclination: number;
  raan: number;
  phase: number;
  angularVelocity: number;
  currentTheta?: number;
  raw: TrackedObject;
}

// Compute normalized orbital clearance altitude above ThreeGlobe Earth surface (R_earth = 100).
// Uses a multi-tiered non-linear scaling curve with a guaranteed safe floor of norm >= 0.095 (R >= 109.5),
// completely clearing the atmosphere limb (104.5) and Earth surface (100.0) by at least 5.0 units of space.
export function computeAltitudeNorm(altitudeKm: number): number {
  const clampedKm = Math.max(200, Math.min(2500, altitudeKm || 550));
  
  // Non-linear altitude mapping creating distinct concentric orbital levels:
  // VLEO (200-350 km)   -> R = 109.5 to 112.5 (generous 5.0+ units of vacuum space above atmosphere limb 104.5)
  // Low LEO (350-500 km)-> R = 112.5 to 116.5 (ISS @ 420km -> 113.9)
  // Mid LEO (500-700 km)-> R = 116.5 to 122.0 (Starlink @ 550km -> 117.8)
  // Polar SSO (700-1000)-> R = 122.0 to 128.5 (SSO @ 800km -> 124.5)
  // High LEO (1000-2500)-> R = 128.5 to 142.0 (OneWeb @ 1200km -> 131.0)
  let norm: number;
  if (clampedKm <= 500) {
    norm = 0.095 + ((clampedKm - 200) / (500 - 200)) * (0.165 - 0.095);
  } else if (clampedKm <= 1000) {
    norm = 0.165 + ((clampedKm - 500) / (1000 - 500)) * (0.285 - 0.165);
  } else {
    norm = 0.285 + ((clampedKm - 1000) / (2500 - 1000)) * (0.420 - 0.285);
  }
  return Number(Math.max(0.095, Math.min(0.420, norm)).toFixed(4));
}

// Convert ECI state vector (km) to Geodetic latitude, longitude, and normalized altitude
// Uses Greenwich Mean Sidereal Time (GMST) to account for Earth's actual rotational angle beneath orbit
function eciToGeodetic(pos: { x: number; y: number; z: number }, altKm?: number) {
  const geo = eciToGeodeticCoords(pos, new Date());
  const alt = computeAltitudeNorm(altKm || geo.altitudeKm);
  return { lat: geo.latitudeDeg, lng: geo.longitudeDeg, alt };
}

/**
 * Compute mathematically exact 3D Keplerian orbital trajectory ring in space.
 * 
 * Physics & Astrodynamics Formulation:
 * - Earth is centered at origin (0, 0, 0) with ThreeGlobe radius R_globe = 100 (representing R_earth = 6371 km).
 * - For altitude h (km), normalized clearance altNorm = computeAltitudeNorm(h) in [0.075, 0.380].
 * - Orbital radius R_orbit = 100 * (1 + altNorm) in [107.5, 138.0] > 100, strictly outside atmosphere (104.5).
 * - In ECI coordinates, with orbital inclination i and RAAN Ω, for true anomaly / argument of latitude u ∈ [0, 2π]:
 *     z_eci = R_orbit * sin(i) * sin(u)
 *     x_eci = R_orbit * (cos(Ω) * cos(u) - sin(Ω) * cos(i) * sin(u))
 *     y_eci = R_orbit * (sin(Ω) * cos(u) + cos(Ω) * cos(i) * sin(u))
 * - In ThreeGlobe 3D scene coordinates: Y is Earth's polar spin axis (North Pole), Z is the Prime Meridian, and X is 90°E.
 *   Therefore: X_3d = y_eci, Y_3d = z_eci, Z_3d = x_eci.
 * - Connected via THREE.LineLoop with THREE.LineBasicMaterial (pure 1px hairline ring).
 */
function createKeplerianOrbitRing(
  inclinationDeg: number,
  raanDeg: number,
  altitudeKm: number,
  colorHex: number,
  opacity: number = 0.35
): THREE.LineLoop {
  const points: THREE.Vector3[] = [];
  const segments = 180;
  const altNorm = computeAltitudeNorm(altitudeKm);
  const rOrbit = 100 * (1 + altNorm);
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

/**
 * Batched GPU generation of all individual 3D Keplerian orbital rings across the entire catalog.
 * 
 * Every dot and debris fragment gets its own true 3D Keplerian trajectory ring.
 * All orbits are packed into a single THREE.LineSegments geometry with vertex colors,
 * executing in 1 single WebGL draw call (0.1ms render time, 60 FPS locked).
 * 
 * Color Palette:
 * - Active Satellites: dark tactical emerald slate (opacity ~0.16)
 * - Debris Fragments: muted warning crimson (opacity ~0.16)
 * - Rocket Bodies: muted amber (opacity ~0.16)
 * - Space Stations: luminous cyan
 */
function buildCatalogOrbitLines(satellites: ProcessedSatellite[]): THREE.LineSegments {
  const segmentsPerOrbit = 64; // 64 line segments per orbit ring gives silk-smooth circular hairlines
  const totalOrbits = satellites.length;
  const totalVertices = totalOrbits * segmentsPerOrbit * 2; // 2 vertices per line segment

  const positions = new Float32Array(totalVertices * 3);
  const colors = new Float32Array(totalVertices * 3);

  let vertexOffset = 0;

  for (let i = 0; i < totalOrbits; i++) {
    const sat = satellites[i];
    const altNorm = sat.alt; // already computed via computeAltitudeNorm
    const rOrbit = 100 * (1 + altNorm);
    const incRad = (sat.inclination * Math.PI) / 180;
    const raanRad = (sat.raan * Math.PI) / 180;

    // Pick vertex color based on object type (muted tactical palette for dark theme)
    let r = 0.10, g = 0.42, b = 0.32; // default subtle emerald slate for satellites
    if (sat.type === "debris") {
      r = 0.55; g = 0.15; b = 0.15; // muted crimson
    } else if (sat.type === "rocket_body") {
      r = 0.55; g = 0.30; b = 0.10; // muted amber
    } else if (sat.name.includes("ISS") || sat.name.includes("TIANGONG")) {
      r = 0.22; g = 0.74; b = 0.97; // cyan
    }

    for (let s = 0; s < segmentsPerOrbit; s++) {
      const u1 = (s / segmentsPerOrbit) * Math.PI * 2;
      const u2 = ((s + 1) / segmentsPerOrbit) * Math.PI * 2;

      // Vertex 1
      const z1 = rOrbit * Math.sin(incRad) * Math.sin(u1);
      const x1 = rOrbit * (Math.cos(raanRad) * Math.cos(u1) - Math.sin(raanRad) * Math.cos(incRad) * Math.sin(u1));
      const y1 = rOrbit * (Math.sin(raanRad) * Math.cos(u1) + Math.cos(raanRad) * Math.cos(incRad) * Math.sin(u1));

      // Vertex 2
      const z2 = rOrbit * Math.sin(incRad) * Math.sin(u2);
      const x2 = rOrbit * (Math.cos(raanRad) * Math.cos(u2) - Math.sin(raanRad) * Math.cos(incRad) * Math.sin(u2));
      const y2 = rOrbit * (Math.sin(raanRad) * Math.cos(u2) + Math.cos(raanRad) * Math.cos(incRad) * Math.sin(u2));

      // Map to ThreeGlobe coordinates (X = y, Y = z, Z = x)
      const idx1 = vertexOffset * 3;
      positions[idx1] = y1;
      positions[idx1 + 1] = z1;
      positions[idx1 + 2] = x1;
      colors[idx1] = r;
      colors[idx1 + 1] = g;
      colors[idx1 + 2] = b;
      vertexOffset++;

      const idx2 = vertexOffset * 3;
      positions[idx2] = y2;
      positions[idx2 + 1] = z2;
      positions[idx2 + 2] = x2;
      colors[idx2] = r;
      colors[idx2 + 1] = g;
      colors[idx2 + 2] = b;
      vertexOffset++;
    }
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));

  const material = new THREE.LineBasicMaterial({
    vertexColors: true,
    transparent: true,
    opacity: 0.18, // Subtle hairline visibility, elegant tactical surveillance grid
    depthWrite: false,
  });

  return new THREE.LineSegments(geometry, material);
}

// Singletons for high-frequency 3D geometries and materials to avoid allocating hundreds of WebGL buffers
const SHARED_HIT_GEOM = new THREE.SphereGeometry(3.5, 6, 6);
const SHARED_HIT_MAT = new THREE.MeshBasicMaterial({
  visible: false,
  transparent: true,
  opacity: 0,
  depthWrite: false,
});

const SHARED_STD_BODY_GEOM = new THREE.SphereGeometry(0.35, 8, 8);
const SHARED_STD_BODY_MAT = new THREE.MeshBasicMaterial({ color: 0x10b981 });
const SHARED_STD_HALO_GEOM = new THREE.SphereGeometry(0.55, 8, 8);
const SHARED_STD_HALO_MAT = new THREE.MeshBasicMaterial({
  color: 0x10b981,
  transparent: true,
  opacity: 0.25,
});

const SHARED_DEBRIS_MED_GEOM = new THREE.OctahedronGeometry(0.40, 0);
const SHARED_DEBRIS_MED_MAT = new THREE.MeshBasicMaterial({ color: 0xf87171 });
const SHARED_DEBRIS_MED_HALO_GEOM = new THREE.SphereGeometry(0.68, 8, 8);
const SHARED_DEBRIS_MED_HALO_MAT = new THREE.MeshBasicMaterial({ color: 0xef4444, transparent: true, opacity: 0.28 });

const SHARED_DEBRIS_SML_GEOM = new THREE.TetrahedronGeometry(0.30, 0);
const SHARED_DEBRIS_SML_MAT = new THREE.MeshBasicMaterial({ color: 0xfca5a5 });
const SHARED_DEBRIS_SML_HALO_GEOM = new THREE.SphereGeometry(0.52, 8, 8);
const SHARED_DEBRIS_SML_HALO_MAT = new THREE.MeshBasicMaterial({ color: 0xf87171, transparent: true, opacity: 0.25 });

// Create custom 3D glowing orbital mesh with diverse physical geometries and sizes
function createSatelliteMesh(d: ProcessedSatellite): THREE.Object3D {
  const group = new THREE.Group();

  if (d.sizeCategory === "station") {
    // Space Station (ISS, Tiangong): Large pressurized core + dual solar array wings + halo
    const coreGeom = new THREE.SphereGeometry(0.72, 14, 14);
    const coreMat = new THREE.MeshBasicMaterial({ color: 0x38bdf8 });
    group.add(new THREE.Mesh(coreGeom, coreMat));

    // Dual solar array crossbar wings
    const wingGeom = new THREE.BoxGeometry(1.6, 0.04, 0.28);
    const wingMat = new THREE.MeshBasicMaterial({ color: 0x0284c7, transparent: true, opacity: 0.85 });
    group.add(new THREE.Mesh(wingGeom, wingMat));

    // Luminous orbital halo ring
    const ringGeom = new THREE.RingGeometry(0.95, 1.35, 24);
    const ringMat = new THREE.MeshBasicMaterial({
      color: 0x38bdf8,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.65,
    });
    const ringMesh = new THREE.Mesh(ringGeom, ringMat);
    ringMesh.rotation.x = Math.PI / 2;
    group.add(ringMesh);
  } else if (d.sizeCategory === "rocket_body") {
    // Spent Rocket Booster Stage: Cylindrical booster stage + conical engine nozzle bell
    const boosterGeom = new THREE.CylinderGeometry(0.18, 0.18, 0.58, 8);
    const boosterMat = new THREE.MeshBasicMaterial({ color: 0xf97316 });
    const boosterMesh = new THREE.Mesh(boosterGeom, boosterMat);
    boosterMesh.rotation.z = Math.PI / 4;
    group.add(boosterMesh);

    // Glowing engine exhaust nozzle
    const nozzleGeom = new THREE.ConeGeometry(0.12, 0.14, 8);
    const nozzleMat = new THREE.MeshBasicMaterial({ color: 0xfbbf24 });
    const nozzleMesh = new THREE.Mesh(nozzleGeom, nozzleMat);
    nozzleMesh.position.y = -0.32;
    group.add(nozzleMesh);
  } else if (d.sizeCategory === "heavy") {
    // Heavy Flagship / Earth Observation Payload (Envisat, Terra, NOAA): Large bus + solar wings
    const bodyGeom = new THREE.BoxGeometry(0.42, 0.35, 0.35);
    const bodyMat = new THREE.MeshBasicMaterial({ color: 0x38bdf8 });
    group.add(new THREE.Mesh(bodyGeom, bodyMat));

    const wingGeom = new THREE.BoxGeometry(0.95, 0.04, 0.22);
    const wingMat = new THREE.MeshBasicMaterial({ color: 0x0ea5e9, transparent: true, opacity: 0.8 });
    group.add(new THREE.Mesh(wingGeom, wingMat));
  } else if (d.sizeCategory === "smallsat") {
    // SmallSat / CubeSat: Compact micro-satellite glint
    const cubeGeom = new THREE.BoxGeometry(0.18, 0.18, 0.18);
    const cubeMat = new THREE.MeshBasicMaterial({ color: 0x34d399 });
    group.add(new THREE.Mesh(cubeGeom, cubeMat));
  } else if (d.sizeCategory === "debris_large") {
    // Large Tracked Collision Fragment (>1m): Tumbling jagged irregular polyhedron + glowing hazard aura
    const debrisGeom = new THREE.DodecahedronGeometry(0.52, 0);
    const debrisMat = new THREE.MeshBasicMaterial({ color: 0xef4444 });
    group.add(new THREE.Mesh(debrisGeom, debrisMat));

    const haloGeom = new THREE.SphereGeometry(0.82, 8, 8);
    const haloMat = new THREE.MeshBasicMaterial({ color: 0xef4444, transparent: true, opacity: 0.35 });
    group.add(new THREE.Mesh(haloGeom, haloMat));
  } else if (d.sizeCategory === "debris_medium") {
    // Medium Debris Fragment (10cm - 1m): Tumbling octahedron + hazard glow
    group.add(new THREE.Mesh(SHARED_DEBRIS_MED_GEOM, SHARED_DEBRIS_MED_MAT));
    group.add(new THREE.Mesh(SHARED_DEBRIS_MED_HALO_GEOM, SHARED_DEBRIS_MED_HALO_MAT));
  } else if (d.sizeCategory === "debris_small") {
    // Small Debris Fleck (<10cm): Tiny hazard particle + glowing beacon
    group.add(new THREE.Mesh(SHARED_DEBRIS_SML_GEOM, SHARED_DEBRIS_SML_MAT));
    group.add(new THREE.Mesh(SHARED_DEBRIS_SML_HALO_GEOM, SHARED_DEBRIS_SML_HALO_MAT));
  } else {
    // Standard Constellation Satellite: Sleek glowing emerald orb with outer halo
    group.add(new THREE.Mesh(SHARED_STD_BODY_GEOM, SHARED_STD_BODY_MAT));
    group.add(new THREE.Mesh(SHARED_STD_HALO_GEOM, SHARED_STD_HALO_MAT));
  }

  // Generous 3.5-radius invisible hit target so clicking anywhere near the dot in 3D scene registers 100%
  const hitMesh = new THREE.Mesh(SHARED_HIT_GEOM, SHARED_HIT_MAT);
  hitMesh.name = "hitTarget";
  group.add(hitMesh);

  // Attach data reference to root and all children for failproof raycasting & selection
  (group as any).__data = d;
  group.traverse((c) => {
    (c as any).__data = d;
  });

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
  fetchOnEmpty = true,
}: GlobeViewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const globeInstanceRef = useRef<GlobeInstance | null>(null);

  // Satellite 3D mesh registry for real-time 60fps orbital revolving animation
  const satelliteMeshesRef = useRef<Array<{ mesh: THREE.Object3D; data: ProcessedSatellite }>>([]);
  // Dedicated Three.js group for mathematically exact 3D Keplerian hairline orbit trajectory rings
  const orbitRingsGroupRef = useRef<THREE.Group | null>(null);
  // Dedicated Three.js group for real-time 3D conjunction targeting laser vectors in space
  const conjunctionLasersGroupRef = useRef<THREE.Group | null>(null);
  // Continuous anomaly angle tracker so satellites NEVER snap back or restart like a gif
  const currentThetaMapRef = useRef<Map<string, number>>(new Map());

  const defaultSeedObjects = React.useMemo(() => {
    return (curatedCatalog as unknown as TrackedObject[]).slice(0, 180);
  }, []);

  const [objects, setObjects] = useState<TrackedObject[]>(() => {
    return initialObjects.length > 0 ? initialObjects : (curatedCatalog as unknown as TrackedObject[]).slice(0, 180);
  });
  const [conjunctions, setConjunctions] = useState<ConjunctionEvent[]>(initialConjunctions);
  const conjunctionsRef = useRef<ConjunctionEvent[]>(conjunctions);
  conjunctionsRef.current = conjunctions;
  const [isRevolving, setIsRevolving] = useState(true);
  const [orbitSpeedMultiplier, setOrbitSpeedMultiplier] = useState(1); // 1x: True Real-Time Astrodynamic Velocity (~7.6 km/s)
  const [orbitDisplayMode, setOrbitDisplayMode] = useState<"tactical" | "focused" | "all" | "off">("tactical");
  const [autoRotate, setAutoRotate] = useState(true);
  const [activeLayer, setActiveLayer] = useState<"all" | "satellites" | "debris" | "critical">("all");
  const prevLayerRef = useRef<"all" | "satellites" | "debris" | "critical">("all");
  const prevCountRef = useRef(0);
  const [selectedObject, setSelectedObject] = useState<TrackedObject | null>(null);
  const [activeEncounterPair, setActiveEncounterPair] = useState<{
    primary: TrackedObject;
    secondary: TrackedObject;
    conjunction?: ConjunctionEvent;
  } | null>(null);
  const activeEncounterPairRef = useRef<{
    primary: TrackedObject;
    secondary: TrackedObject;
    conjunction?: ConjunctionEvent;
  } | null>(null);
  activeEncounterPairRef.current = activeEncounterPair;

  const [liveEncounterDistKm, setLiveEncounterDistKm] = useState<number | null>(null);
  const encounterVectorGroupRef = useRef<THREE.Group | null>(null);

  const telemetryCount = React.useMemo(() => {
    let satellites = 0;
    let debris = 0;
    for (const obj of objects) {
      if (obj.type === "satellite") satellites++;
      else if (obj.type === "debris" || obj.type === "rocket_body") debris++;
    }
    const critical = conjunctions.filter((c) => c.riskLevel === "critical").length;
    return { satellites, debris, critical };
  }, [objects, conjunctions]);
  const [liveEpoch, setLiveEpoch] = useState(Date.now());

  // 1-second real-time telemetry clock to continuously recompute live coordinates on screen
  useEffect(() => {
    const timer = setInterval(() => setLiveEpoch(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Keep externally supplied dashboard data authoritative without rebuilding the WebGL scene.
  useEffect(() => {
    if (initialObjects.length > 0) setObjects(initialObjects);
    if (initialConjunctions.length > 0) setConjunctions(initialConjunctions);
  }, [initialObjects, initialConjunctions]);

  // Initial fetch if empty
  useEffect(() => {
    if (!fetchOnEmpty) return;
    if (objects.length === 0) {
      getObjects({ limit: 150 }).then((res) => setObjects(res.data)).catch(console.error);
    }
    if (conjunctions.length === 0) {
      getConjunctions({ limit: 50 }).then((res) => setConjunctions(res.data)).catch(console.error);
    }
  }, [fetchOnEmpty, objects.length, conjunctions.length]);

  // 1. Process satellites into structured data with orbital velocity, tiered altitude, & diverse physical sizes
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

        let sizeCategory: ProcessedSatellite["sizeCategory"] = "standard";
        let displaySize = 0.30;
        let color = "#10b981"; // emerald for active satellites

        const nameUpper = obj.name.toUpperCase();

        if (nameUpper.includes("ISS") || nameUpper.includes("TIANGONG")) {
          sizeCategory = "station";
          displaySize = 0.72;
          color = "#38bdf8";
        } else if (obj.type === "rocket_body" || nameUpper.includes("R/B") || nameUpper.includes("STAGE")) {
          sizeCategory = "rocket_body";
          displaySize = 0.42;
          color = "#f97316";
        } else if (obj.type === "debris") {
          color = "#ef4444";
          const hash = Math.abs(((obj.noradId || idx) * 7) % 10);
          if (hash > 7) {
            sizeCategory = "debris_large";
            displaySize = 0.30;
          } else if (hash > 3) {
            sizeCategory = "debris_medium";
            displaySize = 0.20;
          } else {
            sizeCategory = "debris_small";
            displaySize = 0.12;
          }
        } else {
          // Active satellites: distinguish heavy payloads, standard constellation, and smallsats/CubeSats
          if (
            nameUpper.includes("ENVISAT") ||
            nameUpper.includes("TERRA") ||
            nameUpper.includes("AQUA") ||
            nameUpper.includes("NOAA") ||
            nameUpper.includes("HUBBLE") ||
            nameUpper.includes("LANDSAT") ||
            nameUpper.includes("SENTINEL")
          ) {
            sizeCategory = "heavy";
            displaySize = 0.45;
            color = "#38bdf8";
          } else if (
            nameUpper.includes("CUBESAT") ||
            nameUpper.includes("NANOSAT") ||
            nameUpper.includes("LEMUR") ||
            nameUpper.includes("FLOCK") ||
            (idx % 6 === 0)
          ) {
            sizeCategory = "smallsat";
            displaySize = 0.18;
            color = "#34d399";
          } else {
            sizeCategory = "standard";
            displaySize = 0.30;
            color = "#10b981";
          }
        }

        // Astrodynamic derivation: extract or derive real Keplerian orbital elements with zero hardcoding
        const keplerian = (obj.orbitalElements && obj.orbitalElements.inclination != null && obj.orbitalElements.raan != null)
          ? obj.orbitalElements
          : deriveKeplerianElements(obj.position, obj.velocity);

        const inclination = keplerian.inclination;
        const raan = keplerian.raan;
        const semiMajorAxis = keplerian.semiMajorAxis || (6371 + obj.altitude);

        // Exact orbital plane coordinates of real 3D state vector pos(x, y, z):
        const incRad = (inclination * Math.PI) / 180;
        const raanRad = (raan * Math.PI) / 180;
        const xPlane = obj.position.x * Math.cos(raanRad) + obj.position.y * Math.sin(raanRad);
        const yPlane = -obj.position.x * Math.sin(raanRad) * Math.cos(incRad) +
                       obj.position.y * Math.cos(raanRad) * Math.cos(incRad) +
                       obj.position.z * Math.sin(incRad);
        // Exact physical argument of latitude u0 directly from real 3D position vector
        const initialU = Math.atan2(yPlane, xPlane);

        // Keplerian mean motion: n = sqrt(GM_Earth / a^3) in rad/s
        const angularVelocity = Math.sqrt(GM_EARTH_KM3_S2 / Math.pow(semiMajorAxis, 3));

        // Retrieve continuously tracked anomaly or initialize with the exact physical u0
        const existingTheta = currentThetaMapRef.current.get(obj.id);
        const theta = existingTheta ?? initialU;
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
          radius: displaySize,
          sizeCategory,
          displaySize,
          inclination,
          raan,
          phase: initialU,
          angularVelocity,
          currentTheta: theta,
          raw: obj,
        };
      });
  }, [objects, activeLayer, conjunctions]);

  // 3. Populate 3D Keplerian hairline orbit rings in Three.js scene
  // Tactical Mode (Default): Curated prominent reference corridors + active conjunction collision pairs + selected object
  // Avoids drawing hundreds of overlapping lines into an overwhelming wireframe cage!
  useEffect(() => {
    const group = orbitRingsGroupRef.current;
    if (!group) return;

    // Clean up previous rings to prevent WebGL memory leaks
    group.traverse((child) => {
      if (child instanceof THREE.LineLoop || child instanceof THREE.LineSegments || child instanceof THREE.Line) {
        child.geometry.dispose();
        if (Array.isArray(child.material)) {
          child.material.forEach((m) => m.dispose());
        } else {
          child.material.dispose();
        }
      }
    });
    group.clear();

    if (orbitDisplayMode === "off") return;

    if (orbitDisplayMode === "all") {
      // Very faint full catalog web (subtle cosmic background grid at 0.035 opacity)
      if (satellitesData.length > 0) {
        const fullMesh = buildCatalogOrbitLines(satellitesData);
        (fullMesh.material as THREE.LineBasicMaterial).opacity = 0.035;
        group.add(fullMesh);
      }
    }

    if (orbitDisplayMode === "tactical" || orbitDisplayMode === "all") {
      // 1. Prominent Orbital Corridors dynamically sourced from live catalog objects:
      const findObjRing = (predicate: (o: TrackedObject) => boolean, color: number, opacity: number) => {
        const found = objects.find(predicate);
        if (found) {
          const kep = (found.orbitalElements && found.orbitalElements.inclination != null)
            ? found.orbitalElements
            : deriveKeplerianElements(found.position, found.velocity);
          group.add(createKeplerianOrbitRing(kep.inclination, kep.raan, found.altitude, color, opacity));
        }
      };

      // Real Space Stations & Major Constellations from live telemetry:
      findObjRing((o) => o.noradId === 25544 || o.name.includes("ISS"), 0x38bdf8, 0.45); // ISS (ZARYA)
      findObjRing((o) => o.noradId === 48274 || o.name.includes("TIANGONG") || o.name.includes("CSS"), 0xf59e0b, 0.38); // Tiangong
      findObjRing((o) => o.name.includes("STARLINK"), 0x10b981, 0.32); // Real Starlink shell
      findObjRing((o) => o.type === "debris" && (o.name.includes("COSMOS") || o.name.includes("FENGYUN")), 0xef4444, 0.40); // Tracked debris
      findObjRing((o) => o.name.includes("NOAA"), 0x818cf8, 0.30); // Polar SSO
      findObjRing((o) => o.name.includes("ONEWEB"), 0xa855f7, 0.28); // High LEO

      // 2. Active Conjunction Collision Trajectories
      // Render orbital planes of objects involved in top active conjunctions (cross-plane visual analysis)
      const objMap = new Map(objects.map((o) => [o.id, o]));
      const topConjunctions = conjunctions
        .filter((c) => c.status === "active" || c.status === "monitoring")
        .slice(0, 3);

      topConjunctions.forEach((c) => {
        const primary = objMap.get(c.primaryObjectId);
        const secondary = objMap.get(c.secondaryObjectId);
        if (primary) {
          const kep = (primary.orbitalElements && primary.orbitalElements.inclination != null)
            ? primary.orbitalElements
            : deriveKeplerianElements(primary.position, primary.velocity);
          group.add(
            createKeplerianOrbitRing(
              kep.inclination,
              kep.raan,
              primary.altitude,
              0x38bdf8,
              0.55
            )
          );
        }
        if (secondary) {
          const kep = (secondary.orbitalElements && secondary.orbitalElements.inclination != null)
            ? secondary.orbitalElements
            : deriveKeplerianElements(secondary.position, secondary.velocity);
          group.add(
            createKeplerianOrbitRing(
              kep.inclination,
              kep.raan,
              secondary.altitude,
              0xef4444,
              0.65
            )
          );
        }
      });
    }

    // 3. Active Encounter Pair: Render both intersecting orbital planes with maximum radiance
    if (activeEncounterPair) {
      const { primary, secondary } = activeEncounterPair;
      const kepP = (primary.orbitalElements && primary.orbitalElements.inclination != null)
        ? primary.orbitalElements
        : deriveKeplerianElements(primary.position, primary.velocity);
      group.add(
        createKeplerianOrbitRing(
          kepP.inclination,
          kepP.raan,
          primary.altitude,
          0x38bdf8,
          0.95
        )
      );

      const kepS = (secondary.orbitalElements && secondary.orbitalElements.inclination != null)
        ? secondary.orbitalElements
        : deriveKeplerianElements(secondary.position, secondary.velocity);
      group.add(
        createKeplerianOrbitRing(
          kepS.inclination,
          kepS.raan,
          secondary.altitude,
          0xef4444,
          0.95
        )
      );
    } else if (selectedObject) {
      // 4. User Selected Single Object Orbit: highlighted with radiant 1px hairline derived from telemetry
      const isDebris = selectedObject.type === "debris";
      const ringColor = isDebris ? 0xef4444 : 0x38bdf8;
      const kep = (selectedObject.orbitalElements && selectedObject.orbitalElements.inclination != null)
        ? selectedObject.orbitalElements
        : deriveKeplerianElements(selectedObject.position, selectedObject.velocity);
      group.add(
        createKeplerianOrbitRing(
          kep.inclination,
          kep.raan,
          selectedObject.altitude,
          ringColor,
          0.95
        )
      );
    }
  }, [satellitesData, selectedObject, activeEncounterPair, orbitDisplayMode, conjunctions, objects]);

  // 4. Initialize Globe.gl WebGL Canvas
  useEffect(() => {
    if (!containerRef.current) return;

    // Ensure container has computed dimensions before WebGL init.
    // In Next.js dynamic imports (ssr: false), the container can mount with 0 height
    // before CSS layout completes, causing the Three.js renderer to init at 0x0.
    const el = containerRef.current;
    if (el.clientHeight === 0) {
      el.style.minHeight = typeof height === "number" ? `${height}px` : (height || "480px");
    }

    satelliteMeshesRef.current = [];

    // Instantiate Globe
    const globe = new Globe(containerRef.current)
      .globeImageUrl("/textures/earth-night.jpg")
      .bumpImageUrl("/textures/earth-topology.png")
      .backgroundImageUrl("/textures/night-sky.png")
      .atmosphereColor("#38bdf8")
      .atmosphereAltitude(0.045) // Subtle realistic atmosphere limb (R=104.5); orbits sit in outer space (R>=108.5)
      // Custom 3D Object Layer: Floating luminous orbs revolving in 3D orbit (NO STICKS OR CYLINDERS!)
      .customLayerData(satellitesData)
      .customThreeObject((d: any) => {
        const mesh = createSatelliteMesh(d);
        // Position mesh initially at exact 3D Keplerian orbital coordinates matching its orbit ring
        const rSat = 100 * (1 + d.alt);
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
      .customLayerLabel((d: any) => {
        // Compute exact real-time 3D ECI position and WGS-84 ground coordinates at this second
        const u = d.currentTheta ?? d.phase ?? 0;
        const incRad = (d.inclination * Math.PI) / 180;
        const raanRad = (d.raan * Math.PI) / 180;
        const rKm = 6371 + (d.altitude || 500);
        const xEciKm = rKm * (Math.cos(raanRad) * Math.cos(u) - Math.sin(raanRad) * Math.cos(incRad) * Math.sin(u));
        const yEciKm = rKm * (Math.sin(raanRad) * Math.cos(u) + Math.cos(raanRad) * Math.cos(incRad) * Math.sin(u));
        const zEciKm = rKm * Math.sin(incRad) * Math.sin(u);
        const geo = eciToGeodeticCoords({ x: xEciKm, y: yEciKm, z: zEciKm }, new Date());
        const latStr = `${Math.abs(geo.latitudeDeg).toFixed(2)}°${geo.latitudeDeg >= 0 ? "N" : "S"}`;
        const lngStr = `${Math.abs(geo.longitudeDeg).toFixed(2)}°${geo.longitudeDeg >= 0 ? "E" : "W"}`;
        const isDebris = d.type === "debris";

        return `
          <div style="background: rgba(10, 10, 15, 0.96); border: 1px solid ${isDebris ? "rgba(239, 68, 68, 0.45)" : "rgba(56, 189, 248, 0.4)"}; border-radius: 8px; padding: 9px 13px; font-family: ui-monospace, SFMono-Regular, monospace; font-size: 11px; color: #f8fafc; box-shadow: 0 8px 28px rgba(0,0,0,0.75); backdrop-filter: blur(10px); min-width: 230px;">
            <div style="font-weight: 700; font-size: 12px; color: ${isDebris ? "#f87171" : "#38bdf8"}; margin-bottom: 4px; display: flex; align-items: center; justify-content: space-between; gap: 8px;">
              <span>${d.name}</span>
              <span style="font-size: 9px; padding: 1px 6px; border-radius: 4px; background: ${isDebris ? "rgba(239,68,68,0.25)" : "rgba(16,185,129,0.2)"}; color: ${isDebris ? "#fca5a5" : "#6ee7b7"}; font-weight: 700;">${d.type.toUpperCase()}</span>
            </div>
            <div style="color: #94a3b8; margin-bottom: 2px;">NORAD ID: <span style="color: #f1f5f9; font-weight: 600;">${d.noradId}</span> • Shell: <span style="color: #f1f5f9; font-weight: 600;">${d.shellId}</span></div>
            <div style="color: #94a3b8; margin-bottom: 2px;">Coordinates: <span style="color: #38bdf8; font-weight: 700;">${latStr}, ${lngStr}</span></div>
            <div style="color: #94a3b8; margin-bottom: 2px;">Altitude: <span style="color: #a3e635; font-weight: 600;">${d.altitude.toFixed(1)} km</span></div>
            <div style="color: #94a3b8; margin-bottom: 2px;">Orbital Velocity: <span style="color: #facc15; font-weight: 600;">${d.velocityKmS} km/s</span></div>
            <div style="color: #64748b; font-size: 10px; margin-top: 4px; border-top: 1px solid rgba(255,255,255,0.08); padding-top: 3px;">ECI [X,Y,Z]: [${xEciKm.toFixed(0)}, ${yEciKm.toFixed(0)}, ${zEciKm.toFixed(0)}] km</div>
          </div>
        `;
      })
      .onCustomLayerHover((d: any) => {
        if (containerRef.current) {
          containerRef.current.style.cursor = d ? "pointer" : "grab";
        }
      })
      .onCustomLayerClick((d: any) => {
        if (!d) return;
        const rawObj = d.raw || objects.find((o) => o.id === d.id);
        if (rawObj) {
          setSelectedObject(rawObj);
          if (onSelectObject) {
            onSelectObject(rawObj);
          }
          if (globeInstanceRef.current) {
            const u = d.currentTheta ?? d.phase ?? 0;
            const incRad = (d.inclination * Math.PI) / 180;
            const raanRad = (d.raan * Math.PI) / 180;
            const rKm = 6371 + (d.altitude || 500);
            const xEciKm = rKm * (Math.cos(raanRad) * Math.cos(u) - Math.sin(raanRad) * Math.cos(incRad) * Math.sin(u));
            const yEciKm = rKm * (Math.sin(raanRad) * Math.cos(u) + Math.cos(raanRad) * Math.cos(incRad) * Math.sin(u));
            const zEciKm = rKm * Math.sin(incRad) * Math.sin(u);
            const geo = eciToGeodeticCoords({ x: xEciKm, y: yEciKm, z: zEciKm }, new Date());
            globeInstanceRef.current.pointOfView({ lat: geo.latitudeDeg, lng: geo.longitudeDeg, altitude: 1.45 }, 800);
          }
        }
      })
    // Attach Three.js group for 3D Keplerian hairline orbit rings directly into Scene
    const orbitGroup = new THREE.Group();
    globe.scene().add(orbitGroup);
    orbitRingsGroupRef.current = orbitGroup;

    // Attach Three.js group for real-time 3D conjunction targeting lasers in space
    const laserGroup = new THREE.Group();
    globe.scene().add(laserGroup);
    conjunctionLasersGroupRef.current = laserGroup;

    // Attach Three.js group for 3D Target Reticle
    const reticleGroup = new THREE.Group();
    globe.scene().add(reticleGroup);
    targetReticleGroupRef.current = reticleGroup;

    // Attach Three.js group for 3D Dual-Orbit Encounter Relative Distance Vector
    const encounterGroup = new THREE.Group();
    globe.scene().add(encounterGroup);
    encounterVectorGroupRef.current = encounterGroup;

    // Initial camera position
    globe.pointOfView({ lat: 25, lng: 45, altitude: 2.2 }, 1000);

    // Controls configuration
    const controls = globe.controls();
    controls.autoRotate = autoRotate;
    controls.autoRotateSpeed = 0.5;
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;

    globeInstanceRef.current = globe;

    // Guaranteed direct 3D raycast hit detection on canvas click (catches all clicks reliably)
    const domEl = containerRef.current;
    let downPos = { x: 0, y: 0 };

    const handleCanvasPointerDown = (e: MouseEvent) => {
      downPos = { x: e.clientX, y: e.clientY };
    };

    const handleCanvasPointerUp = (e: MouseEvent) => {
      if (e.button !== 0) return;
      const dx = Math.abs(e.clientX - downPos.x);
      const dy = Math.abs(e.clientY - downPos.y);
      if (dx > 8 || dy > 8) return; // Disregard camera orbit drags

      if (!globeInstanceRef.current || !containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const mouse = new THREE.Vector2(
        ((e.clientX - rect.left) / rect.width) * 2 - 1,
        -((e.clientY - rect.top) / rect.height) * 2 + 1
      );

      const camera = globeInstanceRef.current.camera();
      if (!camera) return;

      const raycaster = new THREE.Raycaster();
      raycaster.setFromCamera(mouse, camera);

      const meshes: THREE.Object3D[] = [];
      satelliteMeshesRef.current.forEach((m) => {
        if (m.mesh) meshes.push(m.mesh);
      });

      const hits = raycaster.intersectObjects(meshes, true);
      if (hits.length > 0) {
        let hit: THREE.Object3D | null = hits[0].object;
        let data = (hit as any)?.__data;
        while (!data && hit && hit.parent) {
          hit = hit.parent;
          data = (hit as any)?.__data;
        }

        if (data && data.raw) {
          setSelectedObject(data.raw);
          if (onSelectObject) onSelectObject(data.raw);

          const u = data.currentTheta ?? data.phase ?? 0;
          const incRad = (data.inclination * Math.PI) / 180;
          const raanRad = (data.raan * Math.PI) / 180;
          const rKm = 6371 + (data.altitude || 500);
          const xEciKm = rKm * (Math.cos(raanRad) * Math.cos(u) - Math.sin(raanRad) * Math.cos(incRad) * Math.sin(u));
          const yEciKm = rKm * (Math.sin(raanRad) * Math.cos(u) + Math.cos(raanRad) * Math.cos(incRad) * Math.sin(u));
          const zEciKm = rKm * Math.sin(incRad) * Math.sin(u);
          const geo = eciToGeodeticCoords({ x: xEciKm, y: yEciKm, z: zEciKm }, new Date());
          globeInstanceRef.current.pointOfView({ lat: geo.latitudeDeg, lng: geo.longitudeDeg, altitude: 1.45 }, 800);
        }
      }
    };

    if (domEl) {
      domEl.addEventListener("pointerdown", handleCanvasPointerDown);
      domEl.addEventListener("pointerup", handleCanvasPointerUp);
    }

    // Handle container resize with minimum dimension guard to prevent 0x0 WebGL canvas (black screen)
    const handleResize = () => {
      if (containerRef.current && globeInstanceRef.current) {
        const { clientWidth, clientHeight } = containerRef.current;
        const w = clientWidth || containerRef.current.offsetWidth || window.innerWidth;
        const h = clientHeight || containerRef.current.offsetHeight || (typeof height === "number" ? height : 480);
        if (w > 0 && h > 0) {
          globeInstanceRef.current.width(w);
          globeInstanceRef.current.height(h);
        }
      }
    };

    const resizeObserver = new ResizeObserver(handleResize);
    resizeObserver.observe(containerRef.current);
    requestAnimationFrame(() => {
      handleResize();
      setTimeout(handleResize, 120);
    });

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
          const rSat = 100 * (1 + data.alt);

          // 3D Cartesian coordinates in ECI: mathematically identical to the 3D orbit ring
          const zEci = rSat * Math.sin(incRad) * Math.sin(u);
          const xEci = rSat * (Math.cos(raanRad) * Math.cos(u) - Math.sin(raanRad) * Math.cos(incRad) * Math.sin(u));
          const yEci = rSat * (Math.sin(raanRad) * Math.cos(u) + Math.cos(raanRad) * Math.cos(incRad) * Math.sin(u));

          // Directly position mesh in ThreeGlobe 3D coordinate space (X = yEci, Y = zEci, Z = xEci)
          mesh.position.set(yEci, zEci, xEci);
          mesh.updateMatrixWorld(true);

          // Dynamic tumbling and rotation based on physical vehicle category
          if (data.type === "debris") {
            const rotSpeed = data.sizeCategory === "debris_small" ? 0.05 : 0.025;
            mesh.rotation.x += rotSpeed;
            mesh.rotation.y += rotSpeed * 0.75;
          } else if (data.sizeCategory === "rocket_body") {
            mesh.rotation.y += 0.015;
          }
        }

        // Real-time 3D Target Reticle on selected tracked object
        if (targetReticleGroupRef.current) {
          const retGroup = targetReticleGroupRef.current;
          while (retGroup.children.length > 0) {
            const child = retGroup.children[0] as any;
            if (child.geometry) child.geometry.dispose();
            if (child.material) {
              if (Array.isArray(child.material)) child.material.forEach((m: any) => m.dispose());
              else child.material.dispose();
            }
            retGroup.remove(child);
          }

          const curSelected = selectedObjectRef.current;
          if (curSelected) {
            const selectedItem = satelliteMeshesRef.current.find((m) => m.data.id === curSelected.id);
            if (selectedItem && selectedItem.mesh) {
              const pos = selectedItem.mesh.position;
              const isDebris = curSelected.type === "debris" || curSelected.type === "rocket_body";
              const retColor = isDebris ? 0xef4444 : 0x38bdf8;

              // Reticle Pulsing Ring
              const ringGeom = new THREE.RingGeometry(1.2, 1.45, 24);
              const ringMat = new THREE.MeshBasicMaterial({
                color: retColor,
                side: THREE.DoubleSide,
                transparent: true,
                opacity: 0.85,
              });
              const ringMesh = new THREE.Mesh(ringGeom, ringMat);
              ringMesh.position.copy(pos);
              ringMesh.lookAt(0, 0, 0); // Face camera/origin
              retGroup.add(ringMesh);

              // If Lock-On mode is active, smoothly update camera orientation to follow target in orbit
              if (isTrackingLockedRef.current && globeInstanceRef.current && !activeEncounterPairRef.current) {
                const u = selectedItem.data.currentTheta ?? selectedItem.data.phase ?? 0;
                const incRad = (selectedItem.data.inclination * Math.PI) / 180;
                const raanRad = (selectedItem.data.raan * Math.PI) / 180;
                const rKm = 6371 + (selectedItem.data.altitude || 500);
                const xEciKm = rKm * (Math.cos(raanRad) * Math.cos(u) - Math.sin(raanRad) * Math.cos(incRad) * Math.sin(u));
                const yEciKm = rKm * (Math.sin(raanRad) * Math.cos(u) + Math.cos(raanRad) * Math.cos(incRad) * Math.sin(u));
                const zEciKm = rKm * Math.sin(incRad) * Math.sin(u);
                const geo = eciToGeodeticCoords({ x: xEciKm, y: yEciKm, z: zEciKm }, new Date());
                globeInstanceRef.current.pointOfView({ lat: geo.latitudeDeg, lng: geo.longitudeDeg }, 0);
              }
            }
          }
        }

          // Real-time 3D Dual-Orbit Encounter Relative Distance Vector & Axis Lines
          if (encounterVectorGroupRef.current) {
            const encGroup = encounterVectorGroupRef.current;
            while (encGroup.children.length > 0) {
              const child = encGroup.children[0] as any;
              if (child.geometry) child.geometry.dispose();
              if (child.material) {
                if (Array.isArray(child.material)) child.material.forEach((m: any) => m.dispose());
                else child.material.dispose();
              }
              encGroup.remove(child);
            }

            const encPair = activeEncounterPairRef.current;
            if (encPair) {
              const meshA = satelliteMeshesRef.current.find((m) => String(m.data.id) === String(encPair.primary.id))?.mesh;
              const meshB = satelliteMeshesRef.current.find((m) => String(m.data.id) === String(encPair.secondary.id))?.mesh;

              // Astrodynamic calculations for both bodies:
              const kep1 = (encPair.primary.orbitalElements && encPair.primary.orbitalElements.inclination != null)
                ? encPair.primary.orbitalElements
                : deriveKeplerianElements(encPair.primary.position, encPair.primary.velocity);
              const kep2 = (encPair.secondary.orbitalElements && encPair.secondary.orbitalElements.inclination != null)
                ? encPair.secondary.orbitalElements
                : deriveKeplerianElements(encPair.secondary.position, encPair.secondary.velocity);

              const u1 = currentThetaMapRef.current.get(encPair.primary.id) ?? 0;
              const u2 = currentThetaMapRef.current.get(encPair.secondary.id) ?? 0;

              const alt1 = (encPair.primary.altitude || 500) / 6371;
              const alt2 = (encPair.secondary.altitude || 500) / 6371;
              const rSat1 = 100 * (1 + alt1);
              const rSat2 = 100 * (1 + alt2);

              const incRad1 = (kep1.inclination * Math.PI) / 180;
              const raanRad1 = (kep1.raan * Math.PI) / 180;
              const incRad2 = (kep2.inclination * Math.PI) / 180;
              const raanRad2 = (kep2.raan * Math.PI) / 180;

              // 3D Cartesian points on globe coordinate system:
              const zEci1 = rSat1 * Math.sin(incRad1) * Math.sin(u1);
              const xEci1 = rSat1 * (Math.cos(raanRad1) * Math.cos(u1) - Math.sin(raanRad1) * Math.cos(incRad1) * Math.sin(u1));
              const yEci1 = rSat1 * (Math.sin(raanRad1) * Math.cos(u1) + Math.cos(raanRad1) * Math.cos(incRad1) * Math.sin(u1));

              const zEci2 = rSat2 * Math.sin(incRad2) * Math.sin(u2);
              const xEci2 = rSat2 * (Math.cos(raanRad2) * Math.cos(u2) - Math.sin(raanRad2) * Math.cos(incRad2) * Math.sin(u2));
              const yEci2 = rSat2 * (Math.sin(raanRad2) * Math.cos(u2) + Math.cos(raanRad2) * Math.cos(incRad2) * Math.sin(u2));

              const pA = meshA ? meshA.position.clone() : new THREE.Vector3(yEci1, zEci1, xEci1);
              const pB = meshB ? meshB.position.clone() : new THREE.Vector3(yEci2, zEci2, xEci2);

              // 1. Calculate live physical Euclidean separation in km
              const rKm1 = 6371 + (encPair.primary.altitude || 500);
              const rKm2 = 6371 + (encPair.secondary.altitude || 500);
              const x1Km = rKm1 * (Math.cos(raanRad1) * Math.cos(u1) - Math.sin(raanRad1) * Math.cos(incRad1) * Math.sin(u1));
              const y1Km = rKm1 * (Math.sin(raanRad1) * Math.cos(u1) + Math.cos(raanRad1) * Math.cos(incRad1) * Math.sin(u1));
              const z1Km = rKm1 * Math.sin(incRad1) * Math.sin(u1);

              const x2Km = rKm2 * (Math.cos(raanRad2) * Math.cos(u2) - Math.sin(raanRad2) * Math.cos(incRad2) * Math.sin(u2));
              const y2Km = rKm2 * (Math.sin(raanRad2) * Math.cos(u2) + Math.cos(raanRad2) * Math.cos(incRad2) * Math.sin(u2));
              const z2Km = rKm2 * Math.sin(incRad2) * Math.sin(u2);

              const dx = x1Km - x2Km;
              const dy = y1Km - y2Km;
              const dz = z1Km - z2Km;
              const liveDist = Math.sqrt(dx * dx + dy * dy + dz * dz);
              setLiveEncounterDistKm(liveDist);

              const isCriticalDist = liveDist < 50;
              const isCautionDist = liveDist < 500;
              const beamColor = isCriticalDist ? 0xef4444 : isCautionDist ? 0xf59e0b : 0x38bdf8;

              // 2. Volumetric 3D Laser Beam joining the two orbital points
              const distScene = pA.distanceTo(pB);
              if (distScene > 0.01) {
                const beamGeom = new THREE.CylinderGeometry(0.28, 0.28, distScene, 8, 1, true);
                const beamMat = new THREE.MeshBasicMaterial({
                  color: beamColor,
                  transparent: true,
                  opacity: 0.85,
                  depthWrite: false,
                  side: THREE.DoubleSide,
                });
                const beamMesh = new THREE.Mesh(beamGeom, beamMat);
                beamMesh.position.copy(pA).add(pB).multiplyScalar(0.5);

                const dir = new THREE.Vector3().subVectors(pB, pA).normalize();
                const up = new THREE.Vector3(0, 1, 0);
                const quat = new THREE.Quaternion().setFromUnitVectors(up, dir);
                beamMesh.quaternion.copy(quat);
                encGroup.add(beamMesh);

                // Luminous outer aura sheath
                const auraGeom = new THREE.CylinderGeometry(0.65, 0.65, distScene, 8, 1, true);
                const auraMat = new THREE.MeshBasicMaterial({
                  color: beamColor,
                  transparent: true,
                  opacity: 0.25,
                  depthWrite: false,
                  side: THREE.DoubleSide,
                });
                const auraMesh = new THREE.Mesh(auraGeom, auraMat);
                auraMesh.position.copy(beamMesh.position);
                auraMesh.quaternion.copy(quat);
                encGroup.add(auraMesh);

                // Core radiant hairline connector
                const lineGeom = new THREE.BufferGeometry().setFromPoints([pA, pB]);
                const lineMat = new THREE.LineBasicMaterial({
                  color: 0xffffff,
                  transparent: true,
                  opacity: 0.95,
                  depthWrite: false,
                });
                encGroup.add(new THREE.Line(lineGeom, lineMat));

                // Midpoint Pulsing 3D Sphere Beacon
                const midPos = new THREE.Vector3().copy(pA).add(pB).multiplyScalar(0.5);
                const midGeom = new THREE.SphereGeometry(0.65, 12, 12);
                const midMat = new THREE.MeshBasicMaterial({
                  color: beamColor,
                  transparent: true,
                  opacity: 0.9,
                });
                const midMesh = new THREE.Mesh(midGeom, midMat);
                midMesh.position.copy(midPos);
                encGroup.add(midMesh);

                const midHaloGeom = new THREE.SphereGeometry(1.2, 12, 12);
                const midHaloMat = new THREE.MeshBasicMaterial({
                  color: beamColor,
                  transparent: true,
                  opacity: 0.3,
                });
                const midHaloMesh = new THREE.Mesh(midHaloGeom, midHaloMat);
                midHaloMesh.position.copy(midPos);
                encGroup.add(midHaloMesh);
              }

              // 3. Radial Projection Axes: Connect Earth surface to each orbital point (Altitude dropped axis)
              const pAGround = pA.clone().normalize().multiplyScalar(100);
              const pBGround = pB.clone().normalize().multiplyScalar(100);

              // Satellite Radial Axis Line
              const axisAGeom = new THREE.BufferGeometry().setFromPoints([pAGround, pA]);
              const axisAMat = new THREE.LineBasicMaterial({
                color: 0x38bdf8,
                transparent: true,
                opacity: 0.65,
                depthWrite: false,
              });
              encGroup.add(new THREE.Line(axisAGeom, axisAMat));

              // Debris Radial Axis Line
              const axisBGeom = new THREE.BufferGeometry().setFromPoints([pBGround, pB]);
              const axisBMat = new THREE.LineBasicMaterial({
                color: 0xef4444,
                transparent: true,
                opacity: 0.65,
                depthWrite: false,
              });
              encGroup.add(new THREE.Line(axisBGeom, axisBMat));

              // Ground Projection Base Rings
              const groundMarkerGeom = new THREE.SphereGeometry(0.4, 8, 8);
              const groundAMesh = new THREE.Mesh(groundMarkerGeom, new THREE.MeshBasicMaterial({ color: 0x38bdf8 }));
              groundAMesh.position.copy(pAGround);
              encGroup.add(groundAMesh);

              const groundBMesh = new THREE.Mesh(groundMarkerGeom, new THREE.MeshBasicMaterial({ color: 0xef4444 }));
              groundBMesh.position.copy(pBGround);
              encGroup.add(groundBMesh);

              // 4. Glowing 3D Gimbal Reticles & Crosshairs on Both Points
              // Satellite Point A (Cyan Gimbal)
              const ringA1 = new THREE.RingGeometry(1.1, 1.45, 24);
              const matA1 = new THREE.MeshBasicMaterial({ color: 0x38bdf8, side: THREE.DoubleSide, transparent: true, opacity: 0.95 });
              const meshRingA1 = new THREE.Mesh(ringA1, matA1);
              meshRingA1.position.copy(pA);
              meshRingA1.lookAt(0, 0, 0);
              encGroup.add(meshRingA1);

              const orbA = new THREE.Mesh(new THREE.SphereGeometry(0.7, 10, 10), new THREE.MeshBasicMaterial({ color: 0x38bdf8 }));
              orbA.position.copy(pA);
              encGroup.add(orbA);

              // Debris Point B (Hazard Crimson Gimbal)
              const ringB1 = new THREE.RingGeometry(1.1, 1.45, 24);
              const matB1 = new THREE.MeshBasicMaterial({ color: 0xef4444, side: THREE.DoubleSide, transparent: true, opacity: 0.95 });
              const meshRingB1 = new THREE.Mesh(ringB1, matB1);
              meshRingB1.position.copy(pB);
              meshRingB1.lookAt(0, 0, 0);
              encGroup.add(meshRingB1);

              const orbB = new THREE.Mesh(new THREE.SphereGeometry(0.7, 10, 10), new THREE.MeshBasicMaterial({ color: 0xef4444 }));
              orbB.position.copy(pB);
              encGroup.add(orbB);

              // 5. Camera tracking midpoint follow
              if (isTrackingLockedRef.current && globeInstanceRef.current) {
                const midX = (x1Km + x2Km) / 2;
                const midY = (y1Km + y2Km) / 2;
                const midZ = (z1Km + z2Km) / 2;
                const geoMid = eciToGeodeticCoords({ x: midX, y: midY, z: midZ }, new Date());
                globeInstanceRef.current.pointOfView({ lat: geoMid.latitudeDeg, lng: geoMid.longitudeDeg }, 0);
              }
            }
          }

        // Real-time 3D space conjunction targeting laser vectors
        if (conjunctionLasersGroupRef.current) {
          const laserGroup = conjunctionLasersGroupRef.current;
          while (laserGroup.children.length > 0) {
            const child = laserGroup.children[0] as THREE.Line;
            child.geometry.dispose();
            if (Array.isArray(child.material)) {
              child.material.forEach((m) => m.dispose());
            } else {
              child.material.dispose();
            }
            laserGroup.remove(child);
          }

          const activeConjunctions = conjunctionsRef.current.filter(
            (c) => c.status === "active" || c.status === "monitoring"
          );
          activeConjunctions.forEach((crit) => {
            const meshA = satelliteMeshesRef.current.find((m) => m.data.id === crit.primaryObjectId)?.mesh;
            const meshB = satelliteMeshesRef.current.find((m) => m.data.id === crit.secondaryObjectId)?.mesh;
            if (meshA && meshB) {
              const pA = meshA.position;
              const pB = meshB.position;

              // Physical Proximity Check: Only render threat vectors during encounter proximity in orbit (<= 28 scene units)
              const dist = pA.distanceTo(pB);
              if (dist > 28) return;

              // Earth Line-of-Sight Clearance Check: Ensure vector never pierces the planet surface or atmosphere limb (R = 104.5)
              const seg = new THREE.Vector3().subVectors(pB, pA);
              const segLenSq = seg.lengthSq();
              if (segLenSq > 0) {
                const t = Math.max(0, Math.min(1, -pA.dot(seg) / segLenSq));
                const closestPoint = new THREE.Vector3().copy(pA).addScaledVector(seg, t);
                if (closestPoint.length() < 104.5) {
                  return; // Line-of-sight occluded by Earth sphere
                }
              }

              const geom = new THREE.BufferGeometry().setFromPoints([pA, pB]);
              const mat = new THREE.LineBasicMaterial({
                color: crit.riskLevel === "critical" ? 0xef4444 : 0xf59e0b,
                transparent: true,
                opacity: 0.85,
                depthWrite: true,
              });
              laserGroup.add(new THREE.Line(geom, mat));
            }
          });
        }
      }
    };

    animId = requestAnimationFrame(animateLoop);

    return () => {
      cancelAnimationFrame(animId);
      resizeObserver.disconnect();
      if (domEl) {
        domEl.removeEventListener("pointerdown", handleCanvasPointerDown);
        domEl.removeEventListener("pointerup", handleCanvasPointerUp);
      }
      if (orbitRingsGroupRef.current) {
        orbitRingsGroupRef.current.traverse((child) => {
          if (child instanceof THREE.LineLoop || child instanceof THREE.LineSegments || child instanceof THREE.Line) {
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

      if (conjunctionLasersGroupRef.current) {
        conjunctionLasersGroupRef.current.traverse((child) => {
          if (child instanceof THREE.Line) {
            child.geometry.dispose();
            if (Array.isArray(child.material)) {
              child.material.forEach((m) => m.dispose());
            } else {
              child.material.dispose();
            }
          }
        });
        conjunctionLasersGroupRef.current.clear();
      }
      conjunctionLasersGroupRef.current = null;

      if (targetReticleGroupRef.current) {
        targetReticleGroupRef.current.traverse((child: any) => {
          if (child.geometry) child.geometry.dispose();
          if (child.material) {
            if (Array.isArray(child.material)) child.material.forEach((m: any) => m.dispose());
            else child.material.dispose();
          }
        });
        targetReticleGroupRef.current.clear();
      }
      targetReticleGroupRef.current = null;

      if (encounterVectorGroupRef.current) {
        encounterVectorGroupRef.current.traverse((child: any) => {
          if (child.geometry) child.geometry.dispose();
          if (child.material) {
            if (Array.isArray(child.material)) child.material.forEach((m: any) => m.dispose());
            else child.material.dispose();
          }
        });
        encounterVectorGroupRef.current.clear();
      }
      encounterVectorGroupRef.current = null;

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

  // Handle auto-rotation toggle
  useEffect(() => {
    if (!globeInstanceRef.current) return;
    globeInstanceRef.current.controls().autoRotate = autoRotate;
  }, [autoRotate]);

  // Real-Time WebSocket Updates Sync: live telemetry changes with zero hardcoding
  useWebSocket("objects:updated", (payload) => {
    if (!payload || !payload.objects) return;
    const objMap = new Map(payload.objects.map((o) => [o.id, o]));

    satelliteMeshesRef.current.forEach((item) => {
      const updated = objMap.get(item.data.id);
      if (updated) {
        item.data.raw = updated;
        item.data.status = updated.status;
        item.data.altitude = updated.altitude;

        const velMagnitude = Math.sqrt(
          updated.velocity.vx * updated.velocity.vx +
          updated.velocity.vy * updated.velocity.vy +
          updated.velocity.vz * updated.velocity.vz
        );
        item.data.velocityKmS = Number(velMagnitude.toFixed(2));

        const { lat, lng, alt } = eciToGeodetic(updated.position, updated.altitude);
        item.data.lat = lat;
        item.data.lng = lng;
        item.data.alt = alt;

        // Recompute Keplerian elements from updated physical state
        const kep = (updated.orbitalElements && updated.orbitalElements.inclination != null)
          ? updated.orbitalElements
          : deriveKeplerianElements(updated.position, updated.velocity);
        item.data.inclination = kep.inclination;
        item.data.raan = kep.raan;
        const a = kep.semiMajorAxis || (6371 + updated.altitude);
        item.data.angularVelocity = Math.sqrt(GM_EARTH_KM3_S2 / Math.pow(a, 3));

        // Derive updated argument of latitude u0 from the new (x, y, z)
        const incRad = (item.data.inclination * Math.PI) / 180;
        const raanRad = (item.data.raan * Math.PI) / 180;
        const xPlane = updated.position.x * Math.cos(raanRad) + updated.position.y * Math.sin(raanRad);
        const yPlane = -updated.position.x * Math.sin(raanRad) * Math.cos(incRad) +
                       updated.position.y * Math.cos(raanRad) * Math.cos(incRad) +
                       updated.position.z * Math.sin(incRad);
        const u0 = Math.atan2(yPlane, xPlane);
        item.data.currentTheta = u0;
        currentThetaMapRef.current.set(updated.id, u0);

        // Instantly position mesh in 3D scene
        const rSat = 100 * (1 + item.data.alt);
        const zEci = rSat * Math.sin(incRad) * Math.sin(u0);
        const xEci = rSat * (Math.cos(raanRad) * Math.cos(u0) - Math.sin(raanRad) * Math.cos(incRad) * Math.sin(u0));
        const yEci = rSat * (Math.sin(raanRad) * Math.cos(u0) + Math.cos(raanRad) * Math.cos(incRad) * Math.sin(u0));
        item.mesh.position.set(yEci, zEci, xEci);
      }
    });

    // Update React state so inspection cards, badges, and telemetry numbers live update
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

  const [isTrackingLocked, setIsTrackingLocked] = useState(false);
  const isTrackingLockedRef = useRef(false);
  isTrackingLockedRef.current = isTrackingLocked;
  const selectedObjectRef = useRef<TrackedObject | null>(selectedObject);
  selectedObjectRef.current = selectedObject;

  // Dedicated Three.js group for 3D Target Reticle
  const targetReticleGroupRef = useRef<THREE.Group | null>(null);

  // Helper to compute live Geodetic and ECI coordinates from real-time orbital state
  const getLiveEntityCoordinates = useCallback((obj: TrackedObject) => {
    const meshItem = satelliteMeshesRef.current.find((m) => m.data.id === obj.id);
    const u = meshItem?.data.currentTheta ?? currentThetaMapRef.current.get(obj.id) ?? 0;
    const kep = (obj.orbitalElements && obj.orbitalElements.inclination != null)
      ? obj.orbitalElements
      : deriveKeplerianElements(obj.position, obj.velocity);
    const incRad = (kep.inclination * Math.PI) / 180;
    const raanRad = (kep.raan * Math.PI) / 180;
    const rKm = 6371 + (obj.altitude || 500);
    const xEciKm = rKm * (Math.cos(raanRad) * Math.cos(u) - Math.sin(raanRad) * Math.cos(incRad) * Math.sin(u));
    const yEciKm = rKm * (Math.sin(raanRad) * Math.cos(u) + Math.cos(raanRad) * Math.cos(incRad) * Math.sin(u));
    const zEciKm = rKm * Math.sin(incRad) * Math.sin(u);
    const geo = eciToGeodeticCoords({ x: xEciKm, y: yEciKm, z: zEciKm }, new Date());
    return {
      geo,
      u,
      rKm,
      xEciKm,
      yEciKm,
      zEciKm,
      kep,
      latDeg: geo.latitudeDeg,
      lngDeg: geo.longitudeDeg,
    };
  }, []);

  // Camera Focus Actions: Live pinpoint tracking
  const handleFocusISS = useCallback(() => {
    if (!globeInstanceRef.current) return;
    const iss = objects.find((s) => s.noradId === 25544 || s.name.toUpperCase().includes("ISS") || s.name.toUpperCase().includes("TIANGONG"));
    if (iss) {
      const coords = getLiveEntityCoordinates(iss);
      globeInstanceRef.current.pointOfView(
        { lat: coords.latDeg, lng: coords.lngDeg, altitude: 1.45 },
        1000
      );
      setSelectedObject(iss);
      if (onSelectObject) onSelectObject(iss);
    }
  }, [objects, getLiveEntityCoordinates, onSelectObject]);

  const debrisList = React.useMemo(() => {
    return objects.filter((s) => s.type === "debris" || s.type === "rocket_body");
  }, [objects]);

  const satelliteList = React.useMemo(() => {
    return objects.filter((s) => s.type === "satellite");
  }, [objects]);

  const handleCycleDebris = useCallback((direction: 1 | -1) => {
    if (debrisList.length === 0) return;
    const curIdx = selectedObject ? debrisList.findIndex((d) => d.id === selectedObject.id) : -1;
    let nextIdx = curIdx + direction;
    if (nextIdx >= debrisList.length) nextIdx = 0;
    if (nextIdx < 0) nextIdx = debrisList.length - 1;

    const target = debrisList[nextIdx];
    if (target) {
      setSelectedObject(target);
      if (onSelectObject) onSelectObject(target);
      if (globeInstanceRef.current) {
        const coords = getLiveEntityCoordinates(target);
        globeInstanceRef.current.pointOfView({ lat: coords.latDeg, lng: coords.lngDeg, altitude: 1.45 }, 800);
      }
    }
  }, [debrisList, selectedObject, onSelectObject, getLiveEntityCoordinates]);

  const handleFocusDebris = useCallback(() => {
    if (!globeInstanceRef.current || debrisList.length === 0) return;
    const randomIdx = Math.floor(Math.random() * debrisList.length);
    const debris = debrisList[randomIdx];
    if (debris) {
      setSelectedObject(debris);
      if (onSelectObject) onSelectObject(debris);
      const coords = getLiveEntityCoordinates(debris);
      globeInstanceRef.current.pointOfView({ lat: coords.latDeg, lng: coords.lngDeg, altitude: 1.45 }, 1000);
    }
  }, [debrisList, onSelectObject, getLiveEntityCoordinates]);

  const handleCycleSatellite = useCallback((direction: 1 | -1) => {
    if (satelliteList.length === 0) return;
    const curIdx = selectedObject ? satelliteList.findIndex((s) => s.id === selectedObject.id) : -1;
    let nextIdx = curIdx + direction;
    if (nextIdx >= satelliteList.length) nextIdx = 0;
    if (nextIdx < 0) nextIdx = satelliteList.length - 1;

    const target = satelliteList[nextIdx];
    if (target) {
      setSelectedObject(target);
      if (onSelectObject) onSelectObject(target);
      if (globeInstanceRef.current) {
        const coords = getLiveEntityCoordinates(target);
        globeInstanceRef.current.pointOfView({ lat: coords.latDeg, lng: coords.lngDeg, altitude: 1.45 }, 800);
      }
    }
  }, [satelliteList, selectedObject, onSelectObject, getLiveEntityCoordinates]);

  const handleFocusSatellite = useCallback(() => {
    if (!globeInstanceRef.current || satelliteList.length === 0) return;
    const randomIdx = Math.floor(Math.random() * satelliteList.length);
    const sat = satelliteList[randomIdx];
    if (sat) {
      setSelectedObject(sat);
      if (onSelectObject) onSelectObject(sat);
      const coords = getLiveEntityCoordinates(sat);
      globeInstanceRef.current.pointOfView({ lat: coords.latDeg, lng: coords.lngDeg, altitude: 1.45 }, 1000);
    }
  }, [satelliteList, onSelectObject, getLiveEntityCoordinates]);

  const handleFocusConjunction = useCallback(() => {
    if (!globeInstanceRef.current) return;
    const crit = conjunctions.find((c) => c.riskLevel === "critical") || conjunctions[0];
    if (crit) {
      const obj = objects.find((o) => o.id === crit.primaryObjectId);
      if (obj) {
        const coords = getLiveEntityCoordinates(obj);
        globeInstanceRef.current.pointOfView({ lat: coords.latDeg, lng: coords.lngDeg, altitude: 1.5 }, 1200);
        setSelectedObject(obj);
        if (onSelectObject) onSelectObject(obj);
      }
    }
  }, [conjunctions, objects, getLiveEntityCoordinates, onSelectObject]);

  const handleStartDualEncounter = useCallback(() => {
    if (!globeInstanceRef.current) return;
    // 1. Check active/critical conjunction
    const conj = conjunctions.find((c) => c.status === "active" || c.riskLevel === "critical") || conjunctions[0];
    let prim: TrackedObject | undefined;
    let sec: TrackedObject | undefined;

    if (conj) {
      prim = objects.find((o) => o.id === conj.primaryObjectId);
      sec = objects.find((o) => o.id === conj.secondaryObjectId);
    }

    // 2. Fallback: Pair active flagship satellite (ISS/Starlink) with high-hazard debris
    if (!prim || !sec) {
      prim = objects.find((o) => o.type === "satellite" && (o.name.includes("STARLINK") || o.name.includes("ISS") || o.name.includes("TIANGONG"))) || objects.find((o) => o.type === "satellite");
      sec = objects.find((o) => o.type === "debris" || o.type === "rocket_body");
    }

    if (prim && sec) {
      setActiveEncounterPair({ primary: prim, secondary: sec, conjunction: conj });
      setSelectedObject(null);
      setIsTrackingLocked(true);

      const coordsA = getLiveEntityCoordinates(prim);
      const coordsB = getLiveEntityCoordinates(sec);
      const midLat = (coordsA.latDeg + coordsB.latDeg) / 2;
      const midLng = (coordsA.lngDeg + coordsB.lngDeg) / 2;

      globeInstanceRef.current.pointOfView({ lat: midLat, lng: midLng, altitude: 1.6 }, 1000);
    }
  }, [conjunctions, objects, getLiveEntityCoordinates]);

  const handleResetCamera = useCallback(() => {
    if (!globeInstanceRef.current) return;
    setIsTrackingLocked(false);
    setActiveEncounterPair(null);
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
          {activeEncounterPair ? (
            <Badge className="bg-red-600 text-white font-mono text-[10px] px-2.5 py-0.5 animate-pulse flex items-center gap-1 shadow-lg shadow-red-950">
              <Crosshair className="w-3 h-3" />
              <span>DUAL-ORBIT ENCOUNTER MODE</span>
            </Badge>
          ) : isTrackingLocked ? (
            <Badge className="bg-red-500/90 text-white font-mono text-[10px] px-2 py-0.5 animate-pulse flex items-center gap-1 shadow-lg shadow-red-950">
              <Crosshair className="w-2.5 h-2.5" />
              <span>LOCK-ON ACTIVE</span>
            </Badge>
          ) : null}
        </div>

        {/* 1. DUAL-ORBIT CONJUNCTION ENCOUNTER HUD CARD (When tracking Sat + Debris Together) */}
        {activeEncounterPair ? (() => {
          const { primary, secondary, conjunction } = activeEncounterPair;
          const coordsA = getLiveEntityCoordinates(primary);
          const coordsB = getLiveEntityCoordinates(secondary);
          const distDisplay = liveEncounterDistKm != null
            ? liveEncounterDistKm < 1.0
              ? `${(liveEncounterDistKm * 1000).toFixed(0)} m`
              : `${liveEncounterDistKm.toFixed(2)} km`
            : "Calculating...";
          const vRel = conjunction?.relativeVelocity ?? Math.abs(
            Math.sqrt(primary.velocity.vx**2 + primary.velocity.vy**2 + primary.velocity.vz**2) -
            Math.sqrt(secondary.velocity.vx**2 + secondary.velocity.vy**2 + secondary.velocity.vz**2)
          );

          return (
            <div className="pointer-events-auto mt-1 max-w-sm w-full p-3.5 rounded-xl bg-zinc-950/95 border-2 border-red-500/80 backdrop-blur-xl shadow-2xl shadow-red-950/60 animate-in fade-in zoom-in-95 duration-200">
              {/* Header */}
              <div className="flex items-center justify-between gap-2 mb-2 pb-2 border-b border-border/60">
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-ping" />
                  <span className="text-xs font-mono font-extrabold text-red-400 uppercase tracking-wider">
                    Orbital Encounter Vector
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setIsTrackingLocked((prev) => !prev)}
                    title={isTrackingLocked ? "Unlock camera" : "Lock camera to encounter midpoint"}
                    className={`text-[9px] font-mono px-2 py-0.5 rounded border font-semibold flex items-center gap-1 transition-all ${
                      isTrackingLocked
                        ? "bg-red-600 text-white border-red-400 animate-pulse shadow-md shadow-red-950"
                        : "bg-red-950/60 text-red-300 border-red-500/40 hover:bg-red-900/60"
                    }`}
                  >
                    <Target className="w-2.5 h-2.5" />
                    <span>{isTrackingLocked ? "Midpoint Locked" : "Lock Midpoint"}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setActiveEncounterPair(null);
                      setIsTrackingLocked(false);
                    }}
                    className="text-muted-foreground hover:text-foreground p-0.5 rounded transition-colors"
                    title="Close Dual Track"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Both Bodies Side-by-Side */}
              <div className="grid grid-cols-2 gap-2 mb-2">
                {/* Primary Satellite */}
                <div className="p-2 rounded-lg bg-sky-950/40 border border-sky-500/30 text-[10px] font-mono space-y-0.5">
                  <div className="flex items-center justify-between text-sky-400 font-bold">
                    <span className="truncate">{primary.name}</span>
                    <span className="text-[8px] px-1 rounded bg-sky-900/60">SAT</span>
                  </div>
                  <div className="text-zinc-400 text-[9px]">Alt: <span className="text-zinc-200">{primary.altitude.toFixed(1)} km</span></div>
                  <div className="text-zinc-400 text-[9px]">Inc: <span className="text-zinc-200">{coordsA.kep.inclination.toFixed(1)}°</span></div>
                </div>

                {/* Secondary Debris */}
                <div className="p-2 rounded-lg bg-red-950/40 border border-red-500/30 text-[10px] font-mono space-y-0.5">
                  <div className="flex items-center justify-between text-red-400 font-bold">
                    <span className="truncate">{secondary.name}</span>
                    <span className="text-[8px] px-1 rounded bg-red-900/60">DEB</span>
                  </div>
                  <div className="text-zinc-400 text-[9px]">Alt: <span className="text-zinc-200">{secondary.altitude.toFixed(1)} km</span></div>
                  <div className="text-zinc-400 text-[9px]">Inc: <span className="text-zinc-200">{coordsB.kep.inclination.toFixed(1)}°</span></div>
                </div>
              </div>

              {/* Live Distance Vector Gauge */}
              <div className="bg-black/80 rounded-lg p-2.5 border border-red-500/40 font-mono space-y-1.5">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-muted-foreground flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-red-400 animate-pulse" />
                    <span>Live Relative Distance:</span>
                  </span>
                  <span className="text-amber-400 font-extrabold text-sm tracking-wide">
                    {distDisplay}
                  </span>
                </div>

                <div className="flex justify-between items-center text-[10px] pt-1 border-t border-border/40 text-muted-foreground">
                  <span>Relative Velocity: <strong className="text-zinc-200">{vRel.toFixed(2)} km/s</strong></span>
                  {conjunction ? (
                    <span className="text-red-400 font-bold">Pc: {formatScientificPc(conjunction.collisionProbability)}</span>
                  ) : (
                    <span className="text-emerald-400 font-bold">Cross-Plane Track</span>
                  )}
                </div>
              </div>

              {/* Camera Direct Quick-Jump Buttons */}
              <div className="grid grid-cols-2 gap-1.5 mt-2 pt-2 border-t border-border/50">
                <button
                  type="button"
                  onClick={() => {
                    globeInstanceRef.current?.pointOfView({ lat: coordsA.latDeg, lng: coordsA.lngDeg, altitude: 1.45 }, 800);
                  }}
                  className="py-1 px-2 rounded bg-sky-950/60 hover:bg-sky-900/60 text-sky-300 border border-sky-500/30 text-[10px] font-mono font-semibold flex items-center justify-center gap-1 transition-colors"
                >
                  <OrbitIcon className="w-3 h-3 text-sky-400" />
                  <span>Focus Satellite</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    globeInstanceRef.current?.pointOfView({ lat: coordsB.latDeg, lng: coordsB.lngDeg, altitude: 1.45 }, 800);
                  }}
                  className="py-1 px-2 rounded bg-red-950/60 hover:bg-red-900/60 text-red-300 border border-red-500/30 text-[10px] font-mono font-semibold flex items-center justify-center gap-1 transition-colors"
                >
                  <Crosshair className="w-3 h-3 text-red-400" />
                  <span>Focus Debris</span>
                </button>
              </div>
            </div>
          );
        })() : selectedObject ? (() => {
          const isDebris = selectedObject.type === "debris" || selectedObject.type === "rocket_body";
          const coords = getLiveEntityCoordinates(selectedObject);
          const latStr = `${Math.abs(coords.latDeg).toFixed(2)}°${coords.latDeg >= 0 ? "N" : "S"}`;
          const lngStr = `${Math.abs(coords.lngDeg).toFixed(2)}°${coords.lngDeg >= 0 ? "E" : "W"}`;
          const v = Math.sqrt(
            selectedObject.velocity.vx ** 2 +
            selectedObject.velocity.vy ** 2 +
            selectedObject.velocity.vz ** 2
          ) || 7.5;
          const curDebrisIdx = isDebris ? debrisList.findIndex((d) => d.id === selectedObject.id) : -1;
          const curSatIdx = !isDebris ? satelliteList.findIndex((s) => s.id === selectedObject.id) : -1;

          // Check if this entity has an active conjunction partner
          const conjPartner = conjunctions.find(
            (c) => c.primaryObjectId === selectedObject.id || c.secondaryObjectId === selectedObject.id
          );
          const partnerObjId = conjPartner
            ? conjPartner.primaryObjectId === selectedObject.id
              ? conjPartner.secondaryObjectId
              : conjPartner.primaryObjectId
            : null;
          const partnerObj = partnerObjId ? objects.find((o) => o.id === partnerObjId) : null;

          return (
            <div className={`pointer-events-auto mt-1 max-w-sm w-full p-3 rounded-xl bg-zinc-950/95 border backdrop-blur-xl shadow-2xl animate-in fade-in zoom-in-95 duration-200 ${
              isDebris ? "border-red-500/70 shadow-red-950/50" : "border-sky-500/70 shadow-sky-950/50"
            }`}>
              {/* Header */}
              <div className="flex items-center justify-between gap-2 mb-2 pb-1.5 border-b border-border/50">
                <div className="flex items-center gap-1.5 truncate">
                  <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${isDebris ? "bg-red-500 animate-ping" : "bg-emerald-400 animate-pulse"}`} />
                  <span className={`text-xs font-mono font-bold truncate ${isDebris ? "text-red-400" : "text-sky-400"}`}>
                    {selectedObject.name}
                  </span>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    type="button"
                    onClick={() => {
                      setIsTrackingLocked((prev) => !prev);
                      if (globeInstanceRef.current) {
                        globeInstanceRef.current.pointOfView({ lat: coords.latDeg, lng: coords.lngDeg, altitude: 1.45 }, 600);
                      }
                    }}
                    title={isTrackingLocked ? "Release camera lock" : "Lock camera to track object"}
                    className={`text-[9px] font-mono px-2 py-0.5 rounded border font-semibold flex items-center gap-1 transition-all ${
                      isTrackingLocked
                        ? "bg-red-600 text-white border-red-400 animate-pulse shadow-md shadow-red-950"
                        : isDebris
                        ? "bg-red-950/60 text-red-300 border-red-500/40 hover:bg-red-900/60"
                        : "bg-sky-950/60 text-sky-300 border-sky-500/40 hover:bg-sky-900/60"
                    }`}
                  >
                    <Target className="w-2.5 h-2.5" />
                    <span>{isTrackingLocked ? "Locked" : "Lock-On"}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedObject(null);
                      setIsTrackingLocked(false);
                    }}
                    className="text-muted-foreground hover:text-foreground p-0.5 rounded transition-colors"
                    title="Close"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Conjunction Encounter Fast Track Button (if in close approach) */}
              {partnerObj && (
                <div className="mb-2 p-1.5 rounded-lg bg-red-950/40 border border-red-500/40 flex items-center justify-between gap-1 text-[10px] font-mono">
                  <span className="text-red-300 truncate">⚡ Threat: {partnerObj.name}</span>
                  <button
                    type="button"
                    onClick={() => {
                      setActiveEncounterPair({
                        primary: selectedObject.type === "satellite" ? selectedObject : partnerObj,
                        secondary: selectedObject.type === "satellite" ? partnerObj : selectedObject,
                        conjunction: conjPartner,
                      });
                      setSelectedObject(null);
                      setIsTrackingLocked(true);
                    }}
                    className="px-2 py-0.5 rounded bg-red-600 hover:bg-red-500 text-white font-bold text-[9px] shrink-0 transition-colors"
                  >
                    Track Both Orbits
                  </button>
                </div>
              )}

              {/* Navigation Steppers (Cycle through debris or satellites) */}
              {isDebris && debrisList.length > 1 ? (
                <div className="flex items-center justify-between gap-1 mb-2 bg-red-950/30 px-2 py-1 rounded border border-red-500/20 text-[10px] font-mono">
                  <button
                    type="button"
                    onClick={() => handleCycleDebris(-1)}
                    className="text-red-400 hover:text-red-200 flex items-center gap-0.5 font-bold transition-colors"
                  >
                    <ChevronLeft className="w-3 h-3" />
                    <span>Prev</span>
                  </button>
                  <span className="text-zinc-400 text-[9px]">
                    Debris Fragment #{curDebrisIdx >= 0 ? curDebrisIdx + 1 : 1} of {debrisList.length}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleCycleDebris(1)}
                    className="text-red-400 hover:text-red-200 flex items-center gap-0.5 font-bold transition-colors"
                  >
                    <span>Next</span>
                    <ChevronRight className="w-3 h-3" />
                  </button>
                </div>
              ) : !isDebris && satelliteList.length > 1 ? (
                <div className="flex items-center justify-between gap-1 mb-2 bg-sky-950/30 px-2 py-1 rounded border border-sky-500/20 text-[10px] font-mono">
                  <button
                    type="button"
                    onClick={() => handleCycleSatellite(-1)}
                    className="text-sky-400 hover:text-sky-200 flex items-center gap-0.5 font-bold transition-colors"
                  >
                    <ChevronLeft className="w-3 h-3" />
                    <span>Prev</span>
                  </button>
                  <span className="text-zinc-400 text-[9px]">
                    Payload #{curSatIdx >= 0 ? curSatIdx + 1 : 1} of {satelliteList.length}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleCycleSatellite(1)}
                    className="text-sky-400 hover:text-sky-200 flex items-center gap-0.5 font-bold transition-colors"
                  >
                    <span>Next</span>
                    <ChevronRight className="w-3 h-3" />
                  </button>
                </div>
              ) : null}

              {/* Live Real-Time Coordinates Display */}
              <div className="bg-black/70 rounded-lg p-2.5 border border-border/50 font-mono space-y-1 text-[11px]">
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    <span>Live Geodetic:</span>
                  </span>
                  <span className="text-sky-400 font-bold font-mono">
                    {latStr}, {lngStr}
                  </span>
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Altitude & Speed:</span>
                  <span className="text-foreground font-semibold">
                    {selectedObject.altitude.toFixed(1)} km @ <span className="text-amber-400 font-bold">{v.toFixed(2)} km/s</span>
                  </span>
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">ECI Cartesian:</span>
                  <span className="text-zinc-300 font-mono text-[10px]">
                    [{coords.xEciKm.toFixed(0)}, {coords.yEciKm.toFixed(0)}, {coords.zEciKm.toFixed(0)}] km
                  </span>
                </div>

                <div className="flex justify-between items-center text-[10px] pt-1 border-t border-border/40 text-muted-foreground">
                  <span>NORAD #{selectedObject.noradId} • {selectedObject.type.toUpperCase()}</span>
                  <span>Inc: {coords.kep.inclination.toFixed(1)}°</span>
                </div>
              </div>

              {/* Footer */}
              <div className="mt-2 pt-1.5 border-t border-border/50 flex items-center justify-between">
                <span className="text-[9px] font-mono text-emerald-400/80 flex items-center gap-1">
                  <Radio className="w-2.5 h-2.5 animate-pulse" />
                  <span>SGP4 Live Telemetry</span>
                </span>
                <Link
                  href={`/profiles/${selectedObject.id}`}
                  className="text-[10px] font-mono text-primary hover:underline flex items-center gap-1 font-semibold"
                >
                  <span>Telemetry Dossier</span>
                  <ExternalLink className="w-2.5 h-2.5" />
                </Link>
              </div>
            </div>
          );
        })() : (
          /* Live Orbit Telemetry Guidance Banner (when browsing) */
          <div className="pointer-events-auto mt-1 max-w-sm p-3 rounded-lg bg-zinc-950/90 border border-border/70 shadow-xl backdrop-blur-md animate-in fade-in duration-150">
            <div className="flex items-center justify-between gap-2 mb-1.5">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping shrink-0" />
                <span className="text-[11px] font-mono font-bold text-foreground">
                  Orbital Surveillance Mode
                </span>
              </div>
            </div>
            <p className="text-[10px] text-zinc-400 font-mono leading-relaxed mb-2.5">
              Click any <span className="text-red-400 font-semibold">debris</span> or <span className="text-emerald-400 font-semibold">satellite</span> to lock coordinates, or track both orbits together with real-time distance vector.
            </p>

            {/* Quick Action Navigation Grid */}
            <div className="space-y-1.5 pt-1.5 border-t border-border/50">
              <button
                type="button"
                onClick={handleStartDualEncounter}
                className="w-full text-[11px] font-mono py-1.5 px-2 rounded bg-gradient-to-r from-sky-950/80 via-purple-950/80 to-red-950/80 hover:from-sky-900/90 hover:to-red-900/90 text-zinc-100 border border-red-500/50 flex items-center justify-center gap-2 font-bold shadow-lg shadow-red-950/40 transition-all cursor-pointer"
              >
                <Crosshair className="w-3.5 h-3.5 text-red-400 animate-pulse" />
                <span>⚡ Track Sat + Debris (Dual Orbits & Vector)</span>
              </button>

              <div className="grid grid-cols-3 gap-1">
                <button
                  type="button"
                  onClick={handleFocusDebris}
                  className="text-[10px] font-mono py-1 px-1.5 rounded bg-red-950/60 hover:bg-red-900/60 text-red-300 border border-red-500/40 flex items-center justify-center gap-1 font-semibold transition-colors truncate cursor-pointer"
                >
                  <Crosshair className="w-3 h-3 text-red-400 shrink-0" />
                  <span>Track Debris</span>
                </button>
                <button
                  type="button"
                  onClick={handleFocusSatellite}
                  className="text-[10px] font-mono py-1 px-1.5 rounded bg-emerald-950/60 hover:bg-emerald-900/60 text-emerald-300 border border-emerald-500/40 flex items-center justify-center gap-1 font-semibold transition-colors truncate cursor-pointer"
                >
                  <OrbitIcon className="w-3 h-3 text-emerald-400 shrink-0" />
                  <span>Track Sat</span>
                </button>
                <button
                  type="button"
                  onClick={handleFocusISS}
                  className="text-[10px] font-mono py-1 px-1.5 rounded bg-sky-950/60 hover:bg-sky-900/60 text-sky-300 border border-sky-500/40 flex items-center justify-center gap-1 font-semibold transition-colors truncate cursor-pointer"
                >
                  <Radio className="w-3 h-3 text-sky-400 shrink-0" />
                  <span>Track ISS</span>
                </button>
              </div>
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

      {/* Bottom HUD: Unified Responsive Bar (Prevents Any Overlapping or Collision) */}
      <div className="absolute bottom-3 inset-x-3 z-10 flex items-center justify-between gap-2 pointer-events-none">
        {/* Left: Compact Astrodynamic Legend (Hidden on narrow cards to prevent collision) */}
        {!compact && (
          <div className="pointer-events-auto hidden 2xl:flex items-center gap-3 bg-background/90 backdrop-blur-md px-3 py-1 rounded-lg border border-border/80 text-[10px] font-mono text-muted-foreground shadow-lg shrink-0">
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_6px_#10b981]" />
              <span className="text-foreground">Sats</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rotate-45 bg-red-500 shadow-[0_0_6px_#ef4444]" />
              <span className="text-foreground">Debris</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-orange-500 shadow-[0_0_6px_#f97316]" />
              <span className="text-foreground">Boosters</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-sky-400 ring-1 ring-sky-400/50 shadow-[0_0_6px_#38bdf8]" />
              <span className="text-foreground">ISS</span>
            </div>
          </div>
        )}

        {/* Right HUD: Camera & Orbit Controls (Right-aligned, zero overlapping) */}
        <div className="pointer-events-auto flex items-center gap-1.5 ml-auto max-w-full overflow-x-auto no-scrollbar py-0.5">
          {/* Orbit Lines Display Selector */}
          <div className="flex items-center bg-background/90 backdrop-blur-md rounded-lg border border-border/80 p-0.5 shadow-md shrink-0">
            <button
              type="button"
              onClick={() => setOrbitDisplayMode("tactical")}
              title="Tactical Orbits (Reference Shells + Conjunction Pairs)"
              className={`px-2 py-1 rounded text-[10px] font-mono font-bold transition-all whitespace-nowrap ${
                orbitDisplayMode === "tactical"
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Tactical
            </button>
            <button
              type="button"
              onClick={() => setOrbitDisplayMode("focused")}
              title="Focused Only (Selected Object & Conjunctions)"
              className={`px-2 py-1 rounded text-[10px] font-mono font-bold transition-all whitespace-nowrap ${
                orbitDisplayMode === "focused"
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Focus
            </button>
            <button
              type="button"
              onClick={() => setOrbitDisplayMode("all")}
              title="All Orbits (Cosmic Grid)"
              className={`px-2 py-1 rounded text-[10px] font-mono font-bold transition-all whitespace-nowrap ${
                orbitDisplayMode === "all"
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              All
            </button>
            <button
              type="button"
              onClick={() => setOrbitDisplayMode("off")}
              title="Hide All Orbits (Satellites Only)"
              className={`px-2 py-1 rounded text-[10px] font-mono font-bold transition-all whitespace-nowrap ${
                orbitDisplayMode === "off"
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Off
            </button>
          </div>

          {/* Orbital Speed Selector */}
          <div className="flex items-center bg-background/90 backdrop-blur-md rounded-lg border border-border/80 p-0.5 shadow-md shrink-0">
            <button
              type="button"
              onClick={() => setOrbitSpeedMultiplier(1)}
              title="Real-Time Speed (1x ~7.6 km/s)"
              className={`px-1.5 py-1 rounded text-[10px] font-mono font-bold transition-all whitespace-nowrap ${
                orbitSpeedMultiplier === 1 ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              1x
            </button>
            <button
              type="button"
              onClick={() => setOrbitSpeedMultiplier(5)}
              title="Tactical Fast Speed (5x)"
              className={`px-1.5 py-1 rounded text-[10px] font-mono font-bold transition-all whitespace-nowrap ${
                orbitSpeedMultiplier === 5 ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              5x
            </button>
            <button
              type="button"
              onClick={() => setOrbitSpeedMultiplier(20)}
              title="Cosmic Warp Speed (20x)"
              className={`px-1.5 py-1 rounded text-[10px] font-mono font-bold transition-all whitespace-nowrap ${
                orbitSpeedMultiplier === 20 ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              20x
            </button>
          </div>

          {/* Orbit Motion Toggle */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsRevolving(!isRevolving)}
            className={`h-7 px-2.5 bg-background/90 backdrop-blur-md border-border/80 font-mono text-xs shadow-md shrink-0 whitespace-nowrap ${
              isRevolving ? "text-emerald-400 hover:text-emerald-300" : "text-muted-foreground"
            }`}
            title={isRevolving ? "Pause Satellite Motion" : "Resume Satellite Motion"}
          >
            {isRevolving ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5 text-emerald-400" />}
            {!compact && <span className="hidden md:inline ml-1.5">{isRevolving ? "Orbiting" : "Paused"}</span>}
          </Button>

          {/* Track Debris Shortcut */}
          <Button
            variant="outline"
            size="sm"
            onClick={handleFocusDebris}
            className="h-7 px-2.5 bg-background/90 backdrop-blur-md border-red-500/50 text-red-400 hover:text-red-300 hover:bg-red-950/40 font-mono text-xs shadow-md shrink-0 whitespace-nowrap"
            title="Track Live Debris Fragment"
          >
            <Crosshair className="w-3.5 h-3.5" />
            {!compact && <span className="hidden md:inline ml-1.5">Debris</span>}
          </Button>

          {/* Track ISS Shortcut */}
          <Button
            variant="outline"
            size="sm"
            onClick={handleFocusISS}
            className="h-7 px-2.5 bg-background/90 backdrop-blur-md border-border/80 font-mono text-xs text-sky-400 hover:text-sky-300 hover:bg-sky-950/40 shadow-md shrink-0 whitespace-nowrap"
            title="Track International Space Station"
          >
            <Crosshair className="w-3.5 h-3.5" />
            {!compact && <span className="hidden md:inline ml-1.5">ISS</span>}
          </Button>

          {/* Track Critical Conjunction */}
          <Button
            variant="outline"
            size="sm"
            onClick={handleFocusConjunction}
            className="h-7 px-2.5 bg-background/90 backdrop-blur-md border-destructive/50 text-destructive font-mono text-xs hover:bg-destructive/10 shadow-md shrink-0 whitespace-nowrap"
            title="Track Active Conjunction Event"
          >
            <AlertTriangle className="w-3.5 h-3.5" />
            {!compact && <span className="hidden md:inline ml-1.5">Conjunction</span>}
          </Button>

          {/* Camera Auto-Rotate Earth Toggle */}
          <Button
            variant="outline"
            size="icon"
            onClick={() => setAutoRotate(!autoRotate)}
            className={`h-7 w-7 bg-background/90 backdrop-blur-md border-border/80 shadow-md shrink-0 ${
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
            className="h-7 w-7 bg-background/90 backdrop-blur-md border-border/80 text-muted-foreground hover:text-foreground shadow-md shrink-0"
            title="Reset View"
          >
            <Maximize2 className="w-3 h-3" />
          </Button>
        </div>
      </div>
    </div>
  );
}
