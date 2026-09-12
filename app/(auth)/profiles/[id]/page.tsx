"use client";

import React, { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { 
  ArrowLeft, 
  Orbit, 
  Boxes, 
  Activity, 
  Radio, 
  Crosshair, 
  Network, 
  Download,
  Calendar,
  Satellite,
  Trash2,
  Cpu
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { getObjectById } from "@/lib/api";
import { formatOperator } from "@/lib/formatters";
import type { TrackedObject } from "@/types/contract";
import Link from "next/link";
import { downloadDataAsCsv } from "@/lib/utils";

export default function ProfileDetailPage() {
  const params = useParams();
  const router = useRouter();
  const profileId = params?.id as string;

  const [object, setObject] = useState<TrackedObject | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    async function loadObject() {
      try {
        const res = await getObjectById(profileId);
        if (!mounted) return;
        setObject(res);
      } catch (err) {
        console.error("Failed loading tracked object detail:", err);
      } finally {
        if (mounted) setLoading(false);
      }
    }
    loadObject();
    return () => {
      mounted = false;
    };
  }, [profileId]);

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-3 text-muted-foreground font-mono text-xs">
          <Activity className="h-6 w-6 animate-spin text-primary" />
          <span>Synchronizing SGP4 ephemeris state vector...</span>
        </div>
      </div>
    );
  }

  if (!object) {
    return (
      <div className="flex-1 p-8 max-w-4xl mx-auto space-y-4">
        <Button variant="outline" size="sm" onClick={() => router.back()} className="gap-2">
          <ArrowLeft className="h-4 w-4" /> Back to Catalog
        </Button>
        <Card className="border-border">
          <CardContent className="p-8 text-center space-y-2">
            <h2 className="text-lg font-bold">Orbital Object Not Found</h2>
            <p className="text-xs text-muted-foreground">Object ID: {profileId}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Reconstruct 3x3 symmetric covariance matrix from upper triangle:
  // [c0, c1, c2]
  // [c1, c3, c4]
  // [c2, c4, c5]
  const c = object.covarianceUpperTriangle;
  const covMatrix = [
    [c[0], c[1], c[2]],
    [c[1], c[3], c[4]],
    [c[2], c[4], c[5]],
  ];

  const handleExport = () => {
    downloadDataAsCsv([object], `auralis-ephemeris-${object.noradId}`);
  };

  return (
    <div className="flex-1 space-y-6 p-6 lg:p-8 max-w-6xl mx-auto w-full animate-in fade-in duration-300 font-sans">
      {/* Header & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Button variant="outline" size="icon" onClick={() => router.back()} className="h-8 w-8 border-border bg-card">
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs font-bold text-muted-foreground">NORAD #{object.noradId}</span>
              <Badge 
                variant="outline" 
                className={`font-mono text-[10px] font-bold uppercase ${
                  object.type === "satellite" 
                    ? "text-emerald-400 border-emerald-500/30 bg-emerald-950/40" 
                    : object.type === "debris" 
                    ? "text-zinc-400 border-zinc-700 bg-zinc-900" 
                    : "text-amber-400 border-amber-500/30 bg-amber-950/40"
                }`}
              >
                {object.type}
              </Badge>
              <Badge variant="secondary" className="font-mono text-[10px] font-semibold uppercase">
                {object.status}
              </Badge>
            </div>
            <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight text-foreground mt-0.5">
              {object.name}
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button 
            onClick={handleExport}
            variant="outline" 
            size="sm" 
            className="gap-1.5 text-xs font-mono border-border bg-card"
          >
            <Download className="h-3.5 w-3.5" />
            Export Ephemeris
          </Button>
          <Link href="/cases">
            <Button size="sm" variant="outline" className="gap-1.5 text-xs">
              <Crosshair className="h-3.5 w-3.5" />
              Check Conjunctions
            </Button>
          </Link>
          <Link href="/network">
            <Button size="sm" className="gap-1.5 text-xs bg-primary text-primary-foreground">
              <Network className="h-3.5 w-3.5" />
              Object Graph
            </Button>
          </Link>
        </div>
      </div>

      {/* Main Details Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Summary Card */}
        <div className="space-y-6">
          <Card className="border-border bg-card shadow-sm">
            <CardHeader className="pb-3 text-center border-b border-border/60">
              <div className="w-16 h-16 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center mx-auto mb-2 text-primary">
                {object.type === "satellite" ? <Satellite className="w-8 h-8" /> : <Boxes className="w-8 h-8" />}
              </div>
              <CardTitle className="text-base font-bold text-foreground">{object.name}</CardTitle>
              <CardDescription className="text-xs font-mono text-muted-foreground">
                Shell: {object.shellId} • Altitude: {object.altitude.toFixed(1)} km
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-xs pt-4 font-mono">
              <div className="space-y-2 p-3 rounded-lg border border-border bg-muted/30">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">UUID:</span>
                  <span className="font-semibold text-foreground truncate max-w-[170px]">{object.id}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Operator / Origin:</span>
                  <span className="font-semibold text-foreground">{formatOperator(object.operatorId, object.name)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Orbital Shell:</span>
                  <span className="font-semibold text-foreground">{object.shellId}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Mean Altitude:</span>
                  <span className="font-semibold text-foreground">{object.altitude.toFixed(2)} km</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Epoch:</span>
                  <span className="font-semibold text-foreground text-[11px] truncate max-w-[170px]">{object.epoch}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Last Propagated:</span>
                  <span className="font-semibold text-foreground text-[11px] truncate max-w-[170px]">{object.lastUpdated}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right 2 Columns: Astrodynamic Elements & Covariance Matrix */}
        <div className="lg:col-span-2 space-y-6">
          {/* Keplerian Orbital Elements */}
          <Card className="border-border bg-card shadow-sm">
            <CardHeader className="pb-3 border-b border-border/60">
              <CardTitle className="text-base font-bold flex items-center gap-2">
                <Orbit className="h-4 w-4 text-primary" />
                Classical Keplerian Orbital Elements
              </CardTitle>
              <CardDescription className="text-xs">
                Derived directly from SGP4 ephemeris state vectors.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-4 space-y-4 font-mono text-xs">
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <div className="p-3 rounded-lg border border-border/60 bg-muted/20">
                  <span className="text-[10px] text-muted-foreground uppercase block">Semi-Major Axis (a)</span>
                  <span className="text-sm font-bold text-foreground mt-0.5 block">
                    {object.orbitalElements.semiMajorAxis.toFixed(3)} km
                  </span>
                </div>
                <div className="p-3 rounded-lg border border-border/60 bg-muted/20">
                  <span className="text-[10px] text-muted-foreground uppercase block">Eccentricity (e)</span>
                  <span className="text-sm font-bold text-foreground mt-0.5 block">
                    {object.orbitalElements.eccentricity.toFixed(7)}
                  </span>
                </div>
                <div className="p-3 rounded-lg border border-border/60 bg-muted/20">
                  <span className="text-[10px] text-muted-foreground uppercase block">Inclination (i)</span>
                  <span className="text-sm font-bold text-foreground mt-0.5 block">
                    {object.orbitalElements.inclination.toFixed(4)}°
                  </span>
                </div>
                <div className="p-3 rounded-lg border border-border/60 bg-muted/20">
                  <span className="text-[10px] text-muted-foreground uppercase block">RAAN (Ω)</span>
                  <span className="text-sm font-bold text-foreground mt-0.5 block">
                    {object.orbitalElements.raan.toFixed(4)}°
                  </span>
                </div>
                <div className="p-3 rounded-lg border border-border/60 bg-muted/20">
                  <span className="text-[10px] text-muted-foreground uppercase block">Arg of Perigee (ω)</span>
                  <span className="text-sm font-bold text-foreground mt-0.5 block">
                    {object.orbitalElements.argOfPerigee.toFixed(4)}°
                  </span>
                </div>
                <div className="p-3 rounded-lg border border-border/60 bg-muted/20">
                  <span className="text-[10px] text-muted-foreground uppercase block">Mean Anomaly (M)</span>
                  <span className="text-sm font-bold text-foreground mt-0.5 block">
                    {object.orbitalElements.meanAnomaly.toFixed(4)}°
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Covariance Matrix & State Vectors */}
          <Card className="border-border bg-card shadow-sm">
            <CardHeader className="pb-3 border-b border-border/60">
              <CardTitle className="text-base font-bold flex items-center gap-2">
                <Cpu className="h-4 w-4 text-primary" />
                Error Covariance Tensor & State Vectors
              </CardTitle>
              <CardDescription className="text-xs">
                Symmetric 3×3 positional covariance tensor in ECI Cartesian coordinates (km²).
              </CardDescription>
            </CardHeader>
            <CardContent className="p-4 space-y-4 font-mono text-xs">
              {/* Covariance Matrix Table */}
              <div>
                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block mb-2">
                  Position Error Covariance Matrix (Σ)
                </span>
                <div className="p-3 rounded-lg border border-border/60 bg-muted/20 overflow-x-auto">
                  <div className="grid grid-cols-3 gap-2 min-w-[280px] text-center">
                    {covMatrix.map((row, rIdx) =>
                      row.map((val, cIdx) => (
                        <div 
                          key={`${rIdx}-${cIdx}`}
                          className={`p-2 rounded border ${
                            rIdx === cIdx ? "bg-primary/10 border-primary/30 font-bold text-primary" : "bg-card border-border/50 text-foreground/80"
                          }`}
                        >
                          <div className="text-[9px] text-muted-foreground">
                            σ{["x", "y", "z"][rIdx]}{["x", "y", "z"][cIdx]}
                          </div>
                          <div className="text-xs mt-0.5">{val.toExponential(3)}</div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>

              {/* State Vectors */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                <div className="p-3 rounded-lg border border-border/60 bg-muted/20">
                  <span className="text-[10px] font-bold text-muted-foreground uppercase block mb-1">
                    Position Vector [x, y, z] km
                  </span>
                  <div className="space-y-1 text-foreground">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">X:</span>
                      <span className="font-bold">{object.position.x.toFixed(3)} km</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Y:</span>
                      <span className="font-bold">{object.position.y.toFixed(3)} km</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Z:</span>
                      <span className="font-bold">{object.position.z.toFixed(3)} km</span>
                    </div>
                  </div>
                </div>

                <div className="p-3 rounded-lg border border-border/60 bg-muted/20">
                  <span className="text-[10px] font-bold text-muted-foreground uppercase block mb-1">
                    Velocity Vector [vx, vy, vz] km/s
                  </span>
                  <div className="space-y-1 text-foreground">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Vx:</span>
                      <span className="font-bold">{object.velocity.vx.toFixed(4)} km/s</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Vy:</span>
                      <span className="font-bold">{object.velocity.vy.toFixed(4)} km/s</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Vz:</span>
                      <span className="font-bold">{object.velocity.vz.toFixed(4)} km/s</span>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
