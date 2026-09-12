"use client";

import React from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, ArrowRight, Orbit } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export function EarlyWarningSection() {
  const alerts = [
    {
      id: "ew-1",
      title: "Critical Conjunction: Starlink-4821 vs Cosmos-2251",
      location: "Orbital Shell: LEO 550.2 km | Inclination: 53.2°",
      confidence: "96.8% Covariance Confidence",
      impact: "CRITICAL COLLISION RISK",
      suggestion: "TCA in T-11h 54m (Miss distance: 48m, Pc: 3.8e-4). Autonomous yield protocol scheduled."
    },
    {
      id: "ew-2",
      title: "Kessler Cascade Density Spike in SSO-780 Band",
      location: "Sun-Synchronous 780-800km Polar Corridor",
      confidence: "91.4% SIR Model Confidence",
      impact: "HIGH CASCADE RISK",
      suggestion: "Percolation threshold exceeded around SL-16 rocket body. Recommend proactive Sentinel-2A orbital phasing."
    }
  ];

  return (
    <Card className="border-amber-500/30 bg-amber-500/5">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Orbit className="h-5 w-5 text-amber-500" />
            <CardTitle className="text-base font-bold text-foreground">
              Orbital Cascade & Conjunction Alerts
            </CardTitle>
          </div>
          <Link href="/alerts">
            <Button variant="ghost" size="sm" className="text-xs font-semibold text-amber-500 hover:text-amber-500/80">
              View All Alerts <ArrowRight className="ml-1 h-3.5 w-3.5" />
            </Button>
          </Link>
        </div>
        <CardDescription className="text-xs">
          Epidemiological SIR cascade modeling & SGP4 covariance propagation predicting collision chains before escalation.
        </CardDescription>
      </CardHeader>
      <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
        {alerts.map((alert) => (
          <div key={alert.id} className="p-3.5 rounded-lg border bg-card/80 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <Badge variant="outline" className="text-[10px] font-bold text-amber-500 border-amber-500/40">
                  {alert.impact}
                </Badge>
                <span className="text-[11px] font-mono text-muted-foreground">{alert.confidence}</span>
              </div>
              <h4 className="font-semibold text-sm text-foreground mb-1">{alert.title}</h4>
              <p className="text-xs font-mono text-muted-foreground mb-2">{alert.location}</p>
              <p className="text-xs text-foreground/80 bg-muted/50 p-2 rounded border border-border/50 font-mono">
                {alert.suggestion}
              </p>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
