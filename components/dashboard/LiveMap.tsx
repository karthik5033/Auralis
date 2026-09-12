"use client";

import React, { useState, useEffect } from "react";
import dynamic from "next/dynamic";
import { 
  Radio, 
  Globe as GlobeIcon, 
  Radar, 
  Layers, 
  Satellite, 
  ShieldAlert, 
  Crosshair,
  Loader2
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getObjects, getConjunctions } from "@/lib/api";
import type { TrackedObject, ConjunctionEvent } from "@/types/contract";

// Dynamically load GlobeView to avoid SSR issues with Three.js / WebGL
const GlobeView = dynamic(() => import("@/components/globe/GlobeView"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-[480px] rounded-xl bg-black flex flex-col items-center justify-center gap-3 border border-border/70 text-muted-foreground font-mono">
      <Loader2 className="h-7 w-7 animate-spin text-primary" />
      <span className="text-xs uppercase tracking-widest text-zinc-400">
        Initializing 3D Orbital WebGL Engine...
      </span>
    </div>
  ),
});

export function LiveMap() {
  const [viewMode, setViewMode] = useState<"3d" | "2d">("3d");
  const [objects, setObjects] = useState<TrackedObject[]>([]);
  const [conjunctions, setConjunctions] = useState<ConjunctionEvent[]>([]);
  const [activeLayer, setActiveLayer] = useState<"conjunctions" | "satellites" | "debris">("conjunctions");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        const [objRes, conjRes] = await Promise.all([
          getObjects({ limit: 100 }),
          getConjunctions({ limit: 50 }),
        ]);
        setObjects(objRes.data);
        setConjunctions(conjRes.data);
      } catch (err) {
        console.error("Failed loading orbital telemetry for LiveMap:", err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  const orbitalNodes = [
    { id: 1, name: "CJ-142: ISS (ZARYA) ⚡ COSMOS-2251", type: "CRITICAL", x: "62%", y: "45%", alt: "415 km", miss: "347m", pc: "2.3e-3" },
    { id: 2, name: "CJ-108: NOAA 19 ⚡ FENGYUN 1C DEB", type: "HIGH", x: "50%", y: "28%", alt: "808 km", miss: "1,120m", pc: "4.8e-4" },
    { id: 3, name: "CJ-219: OneWeb-0142 ⚡ Fragment", type: "WARNING", x: "78%", y: "65%", alt: "1195 km", miss: "2,450m", pc: "4.2e-5" },
    { id: 4, name: "Tiangong CSS Habitat Corridor", type: "NORMAL", x: "35%", y: "52%", alt: "385 km", miss: "1,820m", pc: "Nominal" },
    { id: 5, name: "STARLINK-31042 SSO Track", type: "HIGH", x: "48%", y: "82%", alt: "540 km", miss: "8,400m", pc: "1.2e-6" }
  ];

  return (
    <div className="space-y-3">
      {/* View Switcher Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2 pb-1">
        <div className="flex items-center gap-2">
          <div className="flex items-center p-1 bg-muted/50 border border-border/80 rounded-lg">
            <button
              type="button"
              onClick={() => setViewMode("3d")}
              className={`flex items-center gap-1.5 px-3 py-1 text-xs font-mono font-semibold rounded-md transition-all ${
                viewMode === "3d"
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <GlobeIcon className="h-3.5 w-3.5" />
              3D Tactical Globe
            </button>
            <button
              type="button"
              onClick={() => setViewMode("2d")}
              className={`flex items-center gap-1.5 px-3 py-1 text-xs font-mono font-semibold rounded-md transition-all ${
                viewMode === "2d"
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Radar className="h-3.5 w-3.5" />
              2D Polar Radar
            </button>
          </div>

          <Badge variant="outline" className="text-[10px] font-mono text-emerald-400 border-emerald-500/30 bg-emerald-950/20">
            {objects.length} OBJECTS SCREENED
          </Badge>
        </div>

        <div className="text-xs font-mono text-muted-foreground flex items-center gap-2">
          <span className="hidden sm:inline">COORDINATE FRAME:</span>
          <span className="font-bold text-foreground">ECI J2000 / WGS-84</span>
        </div>
      </div>

      {/* Main Display: 3D Tactical Globe or 2D Polar Radar */}
      {viewMode === "3d" ? (
        <GlobeView
          initialObjects={objects}
          initialConjunctions={conjunctions}
          fetchOnEmpty={false}
          height={500}
          className="shadow-2xl border-border/80"
        />
      ) : (
        <div className="relative w-full h-[450px] rounded-xl overflow-hidden border border-border bg-black/90 shadow-inner flex flex-col justify-between p-4">
          {/* Orbital Coordinate Grid Pattern Background */}
          <div 
            className="absolute inset-0 opacity-20 pointer-events-none"
            style={{
              backgroundImage: "radial-gradient(circle, #71717a 1px, transparent 1px)",
              backgroundSize: "28px 28px"
            }}
          />
          
          {/* Concentric Orbital Shell Rings Graphic Overlay */}
          <div className="absolute inset-0 flex items-center justify-center opacity-25 pointer-events-none">
            <svg viewBox="0 0 400 400" className="w-[90%] h-[90%] stroke-zinc-500 fill-none">
              {/* Earth core */}
              <circle cx="200" cy="200" r="45" className="stroke-zinc-600 fill-zinc-950" strokeWidth="1.5" />
              {/* LEO 400km shell (ISS) */}
              <ellipse cx="200" cy="200" rx="90" ry="70" strokeWidth="1" strokeDasharray="3 3" />
              {/* LEO 550km shell (Starlink) */}
              <ellipse cx="200" cy="200" rx="130" ry="105" strokeWidth="1.2" className="stroke-primary" />
              {/* LEO 780km shell (SSO/Iridium) */}
              <ellipse cx="200" cy="200" rx="165" ry="135" strokeWidth="1" className="stroke-amber-500" strokeDasharray="4 2" />
              {/* LEO 1200km shell (OneWeb) */}
              <ellipse cx="200" cy="200" rx="190" ry="160" strokeWidth="1" strokeDasharray="2 4" />
            </svg>
          </div>

          {/* Top Map HUD */}
          <div className="relative z-10 flex items-center justify-between">
            <div className="flex items-center gap-2 bg-card/90 backdrop-blur-md px-3 py-1.5 rounded-lg border border-border/80 shadow-sm">
              <Radio className="h-4 w-4 text-emerald-500 animate-pulse" />
              <span className="text-xs font-mono font-semibold text-foreground">LEO Orbital Conjunction Radar</span>
              <Badge variant="outline" className="text-[10px] font-mono text-emerald-500 border-emerald-500/30">TLE ACTIVE</Badge>
            </div>

            <div className="flex items-center gap-1 bg-card/90 backdrop-blur-md p-1 rounded-lg border border-border/80 shadow-sm">
              <button 
                type="button"
                onClick={() => setActiveLayer("conjunctions")}
                className={`px-2.5 py-1 text-xs rounded-md font-medium font-mono transition-colors ${activeLayer === "conjunctions" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}
              >
                Conjunctions
              </button>
              <button 
                type="button"
                onClick={() => setActiveLayer("satellites")}
                className={`px-2.5 py-1 text-xs rounded-md font-medium font-mono transition-colors ${activeLayer === "satellites" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}
              >
                Satellites
              </button>
              <button 
                type="button"
                onClick={() => setActiveLayer("debris")}
                className={`px-2.5 py-1 text-xs rounded-md font-medium font-mono transition-colors ${activeLayer === "debris" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}
              >
                Debris Clouds
              </button>
            </div>
          </div>

          {/* Orbital Node Markers */}
          <div className="relative z-10 flex-1 w-full h-full">
            {orbitalNodes.map((node) => {
              let badgeColor = "bg-primary text-primary-foreground";
              let pingColor = "bg-primary";
              if (node.type === "CRITICAL") {
                badgeColor = "bg-red-500 text-white";
                pingColor = "bg-red-500";
              } else if (node.type === "HIGH") {
                badgeColor = "bg-amber-500 text-black font-bold";
                pingColor = "bg-amber-500";
              } else if (node.type === "WARNING") {
                badgeColor = "bg-amber-400/80 text-black";
                pingColor = "bg-amber-400";
              } else if (node.type === "NORMAL") {
                badgeColor = "bg-emerald-500 text-white";
                pingColor = "bg-emerald-500";
              }

              return (
                <div 
                  key={node.id} 
                  className="absolute -translate-x-1/2 -translate-y-1/2 group cursor-pointer"
                  style={{ left: node.x, top: node.y }}
                >
                  <div className="relative flex items-center justify-center">
                    <span className={`animate-ping absolute inline-flex h-6 w-6 rounded-full ${pingColor} opacity-40`} />
                    <div className={`relative inline-flex items-center justify-center w-4 h-4 rounded-full border border-card shadow-lg ${badgeColor}`}>
                      <Crosshair className="w-2.5 h-2.5" />
                    </div>
                  </div>

                  {/* Tooltip on hover */}
                  <div className="hidden group-hover:block absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-56 p-2 rounded-lg bg-card/95 border border-border shadow-xl backdrop-blur-md text-[11px] z-20 pointer-events-none font-mono">
                    <p className="font-bold text-foreground truncate">{node.name}</p>
                    <div className="flex justify-between text-muted-foreground mt-1 text-[10px]">
                      <span>Shell: {node.alt}</span>
                      <span className="text-amber-500">Miss: {node.miss}</span>
                    </div>
                    <div className="text-[10px] text-zinc-400 mt-0.5">
                      Collision Risk: <span className="font-bold text-foreground">{node.pc}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Bottom HUD Bar */}
          <div className="relative z-10 flex items-center justify-between text-xs text-muted-foreground bg-card/90 backdrop-blur-md px-3 py-1.5 rounded-lg border border-border/80 font-mono text-[11px]">
            <div className="flex items-center gap-4">
              <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-red-500" /> CRITICAL CONJUNCTION</span>
              <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-amber-500" /> ELEVATED RISK</span>
              <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-emerald-500" /> CLEAR / AVOIDED</span>
            </div>
            <div className="text-[10px] text-zinc-400">
              PROPAGATION: <span className="text-foreground font-bold">SGP4/SDP4</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
