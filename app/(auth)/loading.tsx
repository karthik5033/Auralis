import React from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { Orbit, Radar, Activity } from "lucide-react";

export default function AuthLoading() {
  return (
    <div className="flex-1 flex flex-col w-full h-full min-h-[calc(100vh-4rem)] p-6 space-y-6 overflow-hidden bg-background">
      {/* Top Laser Scanning Line */}
      <div className="fixed top-0 left-0 right-0 z-50 h-[2px] bg-gradient-to-r from-transparent via-cyan-400 to-transparent animate-pulse" />

      {/* Header HUD Skeleton */}
      <div className="flex items-center justify-between border-b border-border/60 pb-4">
        <div className="flex items-center space-x-3">
          <div className="h-9 w-9 rounded-lg bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center">
            <Radar className="h-5 w-5 text-cyan-400 animate-spin" style={{ animationDuration: "3s" }} />
          </div>
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <Skeleton className="h-5 w-44 bg-cyan-500/10" />
              <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-mono font-semibold bg-cyan-500/10 text-cyan-400 border border-cyan-500/30">
                SYNCING TELEMETRY
              </span>
            </div>
            <Skeleton className="h-3.5 w-64 bg-muted/40" />
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <Skeleton className="h-8 w-24 rounded-md bg-muted/40" />
          <Skeleton className="h-8 w-32 rounded-md bg-muted/40" />
        </div>
      </div>

      {/* 4 Metric HUD Cards Skeleton */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="p-4 rounded-xl border border-border/50 bg-card/60 relative overflow-hidden space-y-3"
          >
            <div className="flex items-center justify-between">
              <Skeleton className="h-3.5 w-24 bg-muted/40" />
              <Skeleton className="h-4 w-4 rounded-full bg-cyan-500/10" />
            </div>
            <Skeleton className="h-7 w-20 bg-muted/50" />
            <Skeleton className="h-3 w-32 bg-muted/30" />
            <div className="absolute bottom-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-cyan-500/20 to-transparent" />
          </div>
        ))}
      </div>

      {/* Main Tactical Display Skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 flex-1 min-h-[400px]">
        <div className="lg:col-span-2 rounded-xl border border-border/50 bg-card/40 p-6 flex flex-col relative overflow-hidden">
          <div className="flex items-center justify-between pb-4 border-b border-border/40 mb-6">
            <div className="flex items-center gap-2">
              <Activity className="h-4 w-4 text-cyan-400/80 animate-pulse" />
              <Skeleton className="h-4 w-36 bg-muted/40" />
            </div>
            <Skeleton className="h-7 w-28 rounded bg-muted/30" />
          </div>

          <div className="flex-1 flex flex-col items-center justify-center relative min-h-[280px]">
            {/* Concentric Radar Rings */}
            <div className="relative flex items-center justify-center">
              <div className="absolute h-48 w-48 rounded-full border border-cyan-500/10 animate-ping" style={{ animationDuration: "3s" }} />
              <div className="h-36 w-36 rounded-full border border-cyan-500/20 flex items-center justify-center">
                <div className="h-24 w-24 rounded-full border border-cyan-500/30 flex items-center justify-center">
                  <Orbit className="h-8 w-8 text-cyan-400/60 animate-spin" style={{ animationDuration: "6s" }} />
                </div>
              </div>
            </div>

            <p className="mt-6 font-mono text-xs text-muted-foreground uppercase tracking-wider flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-cyan-400 animate-ping" />
              Establishing Telemetry Stream...
            </p>
          </div>
        </div>

        {/* Right Event Stream Skeleton */}
        <div className="rounded-xl border border-border/50 bg-card/40 p-5 space-y-4 flex flex-col">
          <div className="flex items-center justify-between pb-3 border-b border-border/40">
            <Skeleton className="h-4 w-28 bg-muted/40" />
            <Skeleton className="h-5 w-14 rounded-full bg-muted/30" />
          </div>

          <div className="space-y-3 flex-1">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="p-3 rounded-lg border border-border/30 bg-muted/10 space-y-2">
                <div className="flex items-center justify-between">
                  <Skeleton className="h-3.5 w-20 bg-muted/40" />
                  <Skeleton className="h-3 w-12 bg-muted/30" />
                </div>
                <Skeleton className="h-3 w-full bg-muted/30" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
