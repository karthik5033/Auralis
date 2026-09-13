"use client";

import React, { useState, useEffect } from "react";
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
import dynamic from "next/dynamic";
import curatedCatalog from "@/data/fixtures/parsed-tracked-objects.json";
import { getObjects, getConjunctions } from "@/lib/api";
import type { TrackedObject, ConjunctionEvent } from "@/types/contract";

const loadGlobe = () => import("@/components/globe/GlobeView");
const GlobeView = dynamic(loadGlobe, {
  ssr: false,
  loading: () => (
    <div className="w-full h-[480px] bg-slate-950/80 flex flex-col items-center justify-center gap-3 text-muted-foreground font-mono">
      <Loader2 className="h-7 w-7 animate-spin text-cyan-400" />
      <span className="text-xs uppercase tracking-widest text-zinc-400">
        Initializing 3D Orbital WebGL Engine...
      </span>
    </div>
  ),
});

// Immediately pre-fetch GlobeView chunk so it renders instantaneously
if (typeof window !== "undefined") {
  loadGlobe();
}

import { PolarRadarView } from "@/components/dashboard/PolarRadarView";

export function LiveMap() {
  const [viewMode, setViewMode] = useState<"3d" | "2d">("3d");
  const [objects, setObjects] = useState<TrackedObject[]>(() =>
    (curatedCatalog as unknown as TrackedObject[]).slice(0, 180)
  );
  const [conjunctions, setConjunctions] = useState<ConjunctionEvent[]>([]);
  const [loading, setLoading] = useState(false);

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
          height={520}
          className="shadow-2xl border-border/80"
        />
      ) : (
        <PolarRadarView
          objects={objects}
          conjunctions={conjunctions}
          className="shadow-2xl border-border/80"
        />
      )}
    </div>
  );
}

