"use client";

import React, { useState } from "react";
import { Activity, AlertTriangle, Crosshair, CheckCircle2, Flame, ArrowRight, Radio } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export interface OrbitalEvent {
  id: string;
  type: "CONJUNCTION_DETECTED" | "MANEUVER_NEGOTIATED" | "ANOMALY_BURN" | "TLE_UPDATED";
  shell: string;
  message: string;
  time: string;
}

const SAMPLE_EVENTS: OrbitalEvent[] = [
  {
    id: "evt_1",
    type: "CONJUNCTION_DETECTED",
    shell: "LEO 550km",
    message: "Conjunction detected: Object 44521 vs Object 38221 (Miss: 48m, Pc: 3.8e-4).",
    time: "2 mins ago"
  },
  {
    id: "evt_2",
    type: "ANOMALY_BURN",
    shell: "LEO 600km",
    message: "Anomaly: unexpected burn detected on Sat-7 (Δv 1.45 m/s).",
    time: "14 mins ago"
  },
  {
    id: "evt_3",
    type: "MANEUVER_NEGOTIATED",
    shell: "SSO 780km",
    message: "Maneuver negotiated: Operator B yields, Δv 0.2 m/s.",
    time: "35 mins ago"
  },
  {
    id: "evt_4",
    type: "TLE_UPDATED",
    shell: "Global Catalogs",
    message: "CelesTrak ephemeris batch synchronized: 8,412 orbital objects validated.",
    time: "1 hour ago"
  }
];

export function LiveEventFeed() {
  const [events] = useState<OrbitalEvent[]>(SAMPLE_EVENTS);
  const [isLive, setIsLive] = useState(true);

  const getEventIcon = (type: string) => {
    switch (type) {
      case "CONJUNCTION_DETECTED": return <Crosshair className="w-4 h-4 text-amber-500" />;
      case "MANEUVER_NEGOTIATED": return <CheckCircle2 className="w-4 h-4 text-emerald-500" />;
      case "ANOMALY_BURN": return <Flame className="w-4 h-4 text-red-500" />;
      case "TLE_UPDATED": return <Activity className="w-4 h-4 text-primary" />;
      default: return <Activity className="w-4 h-4 text-muted-foreground" />;
    }
  };

  return (
    <div className="flex flex-col h-full justify-between">
      <div>
        <div className="flex items-center justify-between pb-3 border-b border-border/50">
          <div className="flex items-center gap-2">
            <Activity className="h-4 w-4 text-primary" />
            <h3 className="font-semibold text-sm text-foreground">Live Telemetry Event Feed</h3>
          </div>
          <button 
            onClick={() => setIsLive(!isLive)}
            className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            <span className={`w-2 h-2 rounded-full ${isLive ? 'bg-emerald-500 animate-pulse' : 'bg-muted-foreground'}`} />
            <span className="font-mono text-[10px]">{isLive ? 'STREAMING' : 'PAUSED'}</span>
          </button>
        </div>

        <div className="space-y-3 mt-3">
          {events.map((evt) => (
            <div 
              key={evt.id}
              className="p-3 rounded-lg border border-border/50 bg-muted/20 hover:bg-muted/40 transition-colors flex items-start gap-3 group"
            >
              <div className="p-1.5 rounded-md bg-card border border-border/50 mt-0.5 group-hover:border-primary/50 transition-colors">
                {getEventIcon(evt.type)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-0.5">
                  <span className="font-mono text-[10px] font-semibold text-primary">{evt.shell}</span>
                  <span className="text-[10px] text-muted-foreground">{evt.time}</span>
                </div>
                <p className="text-xs text-foreground font-medium leading-relaxed">
                  {evt.message}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="pt-4 border-t border-border/50 mt-4">
        <Link href="/audit">
          <Button variant="outline" size="sm" className="w-full text-xs font-semibold justify-center">
            View Autonomous Negotiation Log <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
          </Button>
        </Link>
      </div>
    </div>
  );
}
