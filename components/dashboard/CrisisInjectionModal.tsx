"use client";

import React, { useState, useEffect } from "react";
import { 
  Flame, 
  AlertTriangle, 
  X, 
  Bomb, 
  Radio, 
  Orbit, 
  ShieldAlert, 
  CheckCircle2, 
  Loader2,
  Sparkles
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { injectCrisis, getObjects } from "@/lib/api";
import type { CrisisInjectionRequest, CrisisInjectionResponse, TrackedObject } from "@/types/contract";

interface CrisisInjectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onInjected?: (response: CrisisInjectionResponse) => void;
}

export function CrisisInjectionModal({ isOpen, onClose, onInjected }: CrisisInjectionModalProps) {
  const [crisisType, setCrisisType] = useState<"fragmentation" | "collision" | "asat">("asat");
  const [altitude, setAltitude] = useState<number>(780);
  const [fragmentCount, setFragmentCount] = useState<number>(250);
  const [sourceObjectId, setSourceObjectId] = useState<string>("");
  const [label, setLabel] = useState<string>("Simulated ASAT Test — 780 km");
  const [sourceObjects, setSourceObjects] = useState<TrackedObject[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [resultResponse, setResultResponse] = useState<CrisisInjectionResponse | null>(null);

  useEffect(() => {
    if (isOpen) {
      getObjects({ limit: 50 }).then((res) => {
        setSourceObjects(res.data);
      }).catch(err => console.error(err));
    }
  }, [isOpen]);

  useEffect(() => {
    // Update label default when type or altitude changes
    if (crisisType === "asat") {
      setLabel(`Simulated Direct-Ascent ASAT Test — ${altitude} km`);
    } else if (crisisType === "collision") {
      setLabel(`Catastrophic Hypervelocity Impact — ${altitude} km`);
    } else {
      setLabel(`Pressure Vessel Battery Fragmentation — ${altitude} km`);
    }
  }, [crisisType, altitude]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setResultResponse(null);

    try {
      const payload: CrisisInjectionRequest = {
        type: crisisType,
        altitude,
        fragmentCount,
        sourceObjectId: sourceObjectId || null,
        label,
      };

      const res = await injectCrisis(payload);
      setResultResponse(res);
      if (onInjected) {
        onInjected(res);
      }
    } catch (err) {
      console.error("Failed injecting crisis:", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div 
        className="w-full max-w-lg bg-card border border-red-500/40 rounded-2xl shadow-2xl overflow-hidden relative flex flex-col font-sans max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Glow Header */}
        <div className="p-5 border-b border-border/80 bg-red-950/20 relative">
          <button 
            type="button"
            onClick={onClose}
            className="absolute top-4 right-4 p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>

          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-red-500/20 text-red-500 border border-red-500/30">
              <Bomb className="h-6 w-6 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-extrabold tracking-tight text-foreground">
                  Simulate Catastrophic Crisis
                </h2>
                <Badge className="font-mono text-[10px] font-bold bg-red-500 text-white animate-pulse">
                  CHAOS INJECTION
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground font-mono mt-0.5">
                Inject hypervelocity kinetic breakup into orbital shells to test cascade resilience.
              </p>
            </div>
          </div>
        </div>

        {/* Form Body */}
        <div className="p-5 overflow-y-auto space-y-4 text-xs font-mono">
          {resultResponse ? (
            <div className="p-4 rounded-xl border border-emerald-500/40 bg-emerald-950/20 space-y-3 animate-in zoom-in-95 duration-200">
              <div className="flex items-center gap-2 text-emerald-400 font-bold text-sm">
                <CheckCircle2 className="h-5 w-5" />
                <span>KINETIC BREAKUP BROADCAST COMPLETE</span>
              </div>
              <p className="text-xs text-emerald-300 font-sans leading-relaxed">
                Successfully injected <strong>{resultResponse.injectedObjectCount}</strong> high-velocity fragments into shells <strong>{resultResponse.affectedShellIds.join(" & ")}</strong>.
              </p>
              <div className="p-3 rounded-lg border border-border/60 bg-card text-[11px] space-y-1 text-foreground">
                <div>New Conjunctions Flagged: <strong className="text-red-400">+{resultResponse.newConjunctionEventCount}</strong></div>
                <div>Affected Shells: <strong>{resultResponse.affectedShellIds.join(", ")}</strong></div>
                <div>Timestamp: <span className="text-muted-foreground">{new Date(resultResponse.timestamp).toLocaleTimeString()}</span></div>
              </div>
              <div className="pt-2 flex justify-end gap-2">
                <Button 
                  size="sm" 
                  onClick={() => setResultResponse(null)}
                  variant="outline"
                  className="text-xs font-mono"
                >
                  Inject Another
                </Button>
                <Button 
                  size="sm" 
                  onClick={onClose}
                  className="text-xs font-mono bg-primary text-primary-foreground"
                >
                  Close & Watch Live Cascade
                </Button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Crisis Type Selector */}
              <div>
                <label className="text-[11px] font-bold uppercase text-muted-foreground block mb-1.5">
                  Breakup Event Physics
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { type: "asat", label: "ASAT Kinetic", desc: "Hypersonic impact" },
                    { type: "collision", label: "Collision", desc: "Debris cross-track" },
                    { type: "fragmentation", label: "Explosion", desc: "Pressure vessel" },
                  ].map((item) => (
                    <button
                      key={item.type}
                      type="button"
                      onClick={() => setCrisisType(item.type as any)}
                      className={`p-2.5 rounded-lg border text-left transition-all cursor-pointer ${
                        crisisType === item.type
                          ? "border-red-500 bg-red-950/40 text-foreground ring-1 ring-red-500"
                          : "border-border/70 bg-muted/20 text-muted-foreground hover:bg-muted/40"
                      }`}
                    >
                      <div className="font-bold text-xs capitalize">{item.label}</div>
                      <div className="text-[10px] text-muted-foreground">{item.desc}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Altitude Slider */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-[11px] font-bold uppercase text-muted-foreground">
                    Breakup Altitude Band
                  </label>
                  <span className="text-xs font-bold text-red-400 font-mono">
                    {altitude} km (LEO_{Math.floor(altitude / 50) * 50}_{Math.floor(altitude / 50) * 50 + 50})
                  </span>
                </div>
                <input
                  type="range"
                  min={200}
                  max={1400}
                  step={25}
                  value={altitude}
                  onChange={(e) => setAltitude(Number(e.target.value))}
                  className="w-full accent-red-500 cursor-pointer h-2 bg-muted rounded-lg"
                />
                <div className="flex justify-between text-[10px] text-muted-foreground mt-1">
                  <span>200 km (VLEO)</span>
                  <span>780 km (Iridium/SSO)</span>
                  <span>1,400 km (High LEO)</span>
                </div>
              </div>

              {/* Fragment Count Input */}
              <div>
                <label className="text-[11px] font-bold uppercase text-muted-foreground block mb-1">
                  Synthetic Debris Fragment Count
                </label>
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    min={50}
                    max={1000}
                    step={25}
                    value={fragmentCount}
                    onChange={(e) => setFragmentCount(Number(e.target.value))}
                    className="font-mono text-xs h-9 bg-muted/40 border-border"
                  />
                  <div className="flex gap-1">
                    {[100, 250, 500].map((count) => (
                      <button
                        key={count}
                        type="button"
                        onClick={() => setFragmentCount(count)}
                        className="px-2.5 py-1 text-xs font-mono rounded border border-border bg-muted/30 hover:bg-muted text-muted-foreground hover:text-foreground cursor-pointer"
                      >
                        {count}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Optional Source Object Selector */}
              <div>
                <label className="text-[11px] font-bold uppercase text-muted-foreground block mb-1">
                  Source Object (Optional Target)
                </label>
                <select
                  value={sourceObjectId}
                  onChange={(e) => setSourceObjectId(e.target.value)}
                  className="w-full h-9 rounded-md border border-border bg-muted/40 px-3 text-xs font-mono text-foreground focus:outline-none focus:ring-1 focus:ring-red-500"
                >
                  <option value="">Synthetic Kinetic Projectile (No target)</option>
                  {sourceObjects.map((obj) => (
                    <option key={obj.id} value={obj.id}>
                      {obj.name} (NORAD #{obj.noradId} • {obj.altitude.toFixed(0)} km)
                    </option>
                  ))}
                </select>
              </div>

              {/* Label Input */}
              <div>
                <label className="text-[11px] font-bold uppercase text-muted-foreground block mb-1">
                  Crisis Advisory Label
                </label>
                <Input
                  type="text"
                  value={label}
                  onChange={(e) => setLabel(e.target.value)}
                  className="font-mono text-xs h-9 bg-muted/40 border-border"
                />
              </div>

              {/* Submit Button */}
              <div className="pt-2">
                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full h-11 font-mono font-bold text-xs uppercase tracking-wider bg-red-600 hover:bg-red-500 text-white shadow-lg gap-2 cursor-pointer transition-all"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Computing Hydrodynamic Breakup Physics...
                    </>
                  ) : (
                    <>
                      <Flame className="h-4 w-4" />
                      Trigger Crisis & Broadcast Cascade
                    </>
                  )}
                </Button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
