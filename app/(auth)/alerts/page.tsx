"use client";

import React, { useState } from "react";
import { 
  BellRing, 
  AlertTriangle, 
  ShieldAlert, 
  CheckCircle2, 
  Orbit, 
  Clock, 
  ArrowRight, 
  TrendingUp, 
  Activity, 
  Check, 
  ExternalLink,
  Radio,
  Crosshair,
  Download
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { MOCK_ALERTS, MockAlert } from "@/lib/mockData";
import Link from "next/link";
import { downloadDataAsCsv } from "@/lib/utils";

export default function AlertsPage() {
  const [alerts, setAlerts] = useState<MockAlert[]>(MOCK_ALERTS);
  const [activeFilter, setActiveFilter] = useState<string>("ALL");

  const handleAcknowledge = (id: string) => {
    setAlerts(prev => prev.map(a => a.id === id ? { ...a, status: "Acknowledged" } : a));
  };

  const filteredAlerts = alerts.filter(a => {
    if (activeFilter === "ALL") return true;
    return a.severity.toUpperCase() === activeFilter.toUpperCase();
  });

  return (
    <div className="flex-1 space-y-6 p-6 lg:p-8 max-w-7xl mx-auto w-full animate-in fade-in duration-300 font-sans">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground flex items-center gap-2">
            <BellRing className="w-7 h-7 text-foreground" />
            Orbital Risk Alerts &amp; Cascade Warnings
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">
            Predictive screening engine identifying high collision probability conjunctions (Pc &gt; 10⁻⁴) and Kessler cascade density spikes.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button 
            onClick={() => downloadDataAsCsv(alerts, "auralis-risk-alerts")}
            variant="outline" 
            size="sm" 
            className="text-xs font-semibold gap-1.5 border-border bg-card hover:bg-muted"
          >
            <Download className="w-3.5 h-3.5" />
            Export Alerts
          </Button>
        </div>
      </div>

      {/* Metric Telemetry Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="border-border bg-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-mono font-semibold text-muted-foreground uppercase">Cascade Threat Index</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-black text-amber-500 flex items-center gap-2 font-mono">
              <AlertTriangle className="h-5 w-5" />
              ELEVATED
            </div>
            <p className="text-xs text-muted-foreground mt-1">Density spike active in SSO-780 shell band.</p>
          </CardContent>
        </Card>

        <Card className="border-border bg-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-mono font-semibold text-muted-foreground uppercase">Propagation Accuracy</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-black text-foreground flex items-center gap-2 font-mono">
              <Activity className="h-5 w-5 text-emerald-500" />
              98.1%
            </div>
            <p className="text-xs text-muted-foreground mt-1">Validated across SGP4 ephemeris telemetry.</p>
          </CardContent>
        </Card>

        <Card className="border-border bg-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-mono font-semibold text-muted-foreground uppercase">Mean Negotiation Horizon</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-black text-foreground flex items-center gap-2 font-mono">
              <Clock className="h-5 w-5" />
              11.8 Hours
            </div>
            <p className="text-xs text-muted-foreground mt-1">Average lead time before Time to Closest Approach.</p>
          </CardContent>
        </Card>
      </div>

      {/* Filter Chips */}
      <div className="flex items-center gap-2">
        <span className="text-xs font-semibold text-muted-foreground">Filter Severity:</span>
        {["ALL", "CRITICAL", "HIGH", "MEDIUM"].map((sev) => (
          <button
            key={sev}
            onClick={() => setActiveFilter(sev)}
            className={`px-3 py-1 rounded-lg text-xs font-mono font-semibold transition-colors ${
              activeFilter === sev 
                ? "bg-foreground text-background shadow-xs" 
                : "border border-border bg-card text-muted-foreground hover:bg-muted"
            }`}
          >
            {sev}
          </button>
        ))}
      </div>

      {/* Alerts Feed List */}
      <div className="space-y-4">
        {filteredAlerts.map((alert) => (
          <Card key={alert.id} className="border-border bg-card shadow-xs">
            <CardContent className="p-5">
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                <div className="space-y-2 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge variant="outline" className={`font-mono text-[10px] font-bold ${
                      alert.severity === "CRITICAL" ? "text-rose-500 border-rose-500/30 bg-rose-500/10" :
                      alert.severity === "HIGH" ? "text-amber-500 border-amber-500/30 bg-amber-500/10" :
                      "text-zinc-400 border-border bg-muted"
                    }`}>
                      {alert.severity} SEVERITY
                    </Badge>
                    <span className="font-mono text-xs font-semibold text-foreground">{alert.district}</span>
                    <span className="text-muted-foreground text-xs">• {alert.time_detected || alert.timestamp}</span>
                  </div>

                  <h3 className="text-base font-bold text-foreground">{alert.title}</h3>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1 font-mono text-xs">
                    <div className="p-2 rounded bg-muted/30 border border-border/60">
                      <span className="text-[10px] text-muted-foreground block uppercase">Confidence</span>
                      <span className="font-bold text-foreground">{alert.confidence}% Foster Pc</span>
                    </div>
                    <div className="p-2 rounded bg-muted/30 border border-border/60">
                      <span className="text-[10px] text-muted-foreground block uppercase">Est. Miss Distance</span>
                      <span className="font-bold text-amber-500">{alert.miss_distance_m || 48} meters</span>
                    </div>
                    <div className="p-2 rounded bg-muted/30 border border-border/60">
                      <span className="text-[10px] text-muted-foreground block uppercase">TCA Window</span>
                      <span className="font-bold text-foreground">{alert.predicted_escalation_window}</span>
                    </div>
                  </div>

                  <div className="space-y-1 pt-2">
                    <span className="text-[11px] font-mono text-muted-foreground uppercase">Recommended Action:</span>
                    <ul className="list-disc list-inside text-xs text-muted-foreground space-y-1">
                      {(alert.recommended_actions || [alert.recommended_action]).map((act, idx) => (
                        <li key={idx} className="leading-relaxed">{act}</li>
                      ))}
                    </ul>
                  </div>
                </div>

                <div className="flex flex-row sm:flex-col gap-2 shrink-0">
                  <Button 
                    size="sm" 
                    variant="outline"
                    onClick={() => handleAcknowledge(alert.id)}
                    className="text-xs font-semibold border-border bg-card hover:bg-muted"
                  >
                    <Check className="w-3.5 h-3.5 mr-1" />
                    {alert.status === "Acknowledged" ? "Acknowledged" : "Acknowledge"}
                  </Button>
                  <Link href="/cases">
                    <Button size="sm" className="w-full text-xs font-semibold bg-foreground text-background">
                      <Crosshair className="w-3.5 h-3.5 mr-1" />
                      View Conjunction
                    </Button>
                  </Link>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
