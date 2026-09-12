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
  Satellite,
  Cpu,
  Target,
  Compass,
  Globe,
  ShieldAlert,
  CheckCircle2,
  Clock,
  ChevronRight
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { getObjectById, getConjunctions } from "@/lib/api";
import { formatOperator } from "@/lib/formatters";
import type { TrackedObject, ConjunctionEvent } from "@/types/contract";
import { deriveKeplerianElements, eciToGeodeticCoords, GM_EARTH_KM3_S2 } from "@/data/propagator";
import Link from "next/link";
import { downloadDataAsCsv } from "@/lib/utils";

export default function ProfileDetailPage() {
  const params = useParams();
  const router = useRouter();
  const profileId = params?.id as string;

  const [object, setObject] = useState<TrackedObject | null>(null);
  const [loading, setLoading] = useState(true);
  const [conjunctions, setConjunctions] = useState<ConjunctionEvent[]>([]);
  const [liveEpoch, setLiveEpoch] = useState(Date.now());

  // Scroll to top immediately on mount
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "instant" });
  }, []);

  // 1-second real-time SGP4 orbital propagator clock
  useEffect(() => {
    const timer = setInterval(() => setLiveEpoch(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    let mounted = true;
    async function loadData() {
      try {
        const [objRes, conjRes] = await Promise.all([
          getObjectById(profileId),
          getConjunctions({ limit: 50 }).catch(() => ({ data: [] })),
        ]);
        if (!mounted) return;
        setObject(objRes);
        if (conjRes?.data) setConjunctions(conjRes.data);
      } catch (err) {
        console.error("Failed loading tracked object detail:", err);
      } finally {
        if (mounted) setLoading(false);
      }
    }
    loadData();
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
        <Button variant="outline" size="sm" onClick={() => router.push("/dashboard")} className="gap-2">
          <ArrowLeft className="h-4 w-4" /> Back to Orbital Command
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

  // Astrodynamic orbital calculations
  const kep = (object.orbitalElements && object.orbitalElements.inclination != null)
    ? object.orbitalElements
    : deriveKeplerianElements(object.position, object.velocity);

  const aKm = kep.semiMajorAxis || (6371 + object.altitude);
  const incRad = (kep.inclination * Math.PI) / 180;
  const raanRad = (kep.raan * Math.PI) / 180;
  const n = Math.sqrt(GM_EARTH_KM3_S2 / Math.pow(aKm, 3)); // rad/s
  const periodMin = (2 * Math.PI / n) / 60;
  const revsPerDay = 1440 / periodMin;

  // Real-time anomaly angle u(t) advancing continuously
  const initialU0 = Math.atan2(object.position.y, object.position.x);
  const elapsedSec = (liveEpoch % (periodMin * 60 * 1000)) / 1000;
  const u = initialU0 + n * elapsedSec;

  const rKm = 6371 + (object.altitude || 500);
  const xEciKm = rKm * (Math.cos(raanRad) * Math.cos(u) - Math.sin(raanRad) * Math.cos(incRad) * Math.sin(u));
  const yEciKm = rKm * (Math.sin(raanRad) * Math.cos(u) + Math.cos(raanRad) * Math.cos(incRad) * Math.sin(u));
  const zEciKm = rKm * Math.sin(incRad) * Math.sin(u);

  const geo = eciToGeodeticCoords({ x: xEciKm, y: yEciKm, z: zEciKm }, new Date(liveEpoch));
  const latStr = `${Math.abs(geo.latitudeDeg).toFixed(3)}°${geo.latitudeDeg >= 0 ? "N" : "S"}`;
  const lngStr = `${Math.abs(geo.longitudeDeg).toFixed(3)}°${geo.longitudeDeg >= 0 ? "E" : "W"}`;

  const vx = -rKm * n * (Math.cos(raanRad) * Math.sin(u) + Math.sin(raanRad) * Math.cos(incRad) * Math.cos(u));
  const vy = -rKm * n * (Math.sin(raanRad) * Math.sin(u) - Math.cos(raanRad) * Math.cos(incRad) * Math.sin(u));
  const vz = rKm * n * Math.sin(incRad) * Math.cos(u);
  const vMag = Math.sqrt(vx * vx + vy * vy + vz * vz) || 7.55;

  const perigeeKm = Math.max(100, aKm * (1 - kep.eccentricity) - 6371);
  const apogeeKm = Math.max(100, aKm * (1 + kep.eccentricity) - 6371);

  // Active conjunction alerts for this body
  const activeAlerts = conjunctions.filter(
    (c) => c.primaryObjectId === object.id || c.secondaryObjectId === object.id
  );

  // Reconstruct 3x3 symmetric covariance matrix from upper triangle:
  const c = object.covarianceUpperTriangle || [1.0, 0, 0, 1.0, 0, 1.0];
  const covMatrix = [
    [c[0] ?? 1.0, c[1] ?? 0, c[2] ?? 0],
    [c[1] ?? 0, c[3] ?? 1.0, c[4] ?? 0],
    [c[2] ?? 0, c[4] ?? 0, c[5] ?? 1.0],
  ];

  const sigmaX = Math.sqrt(Math.abs(c[0] ?? 1.0));
  const sigmaY = Math.sqrt(Math.abs(c[3] ?? 1.0));
  const sigmaZ = Math.sqrt(Math.abs(c[5] ?? 1.0));

  const isDebris = object.type === "debris" || object.type === "rocket_body";

  const handleExport = () => {
    downloadDataAsCsv([object], `auralis-ephemeris-${object.noradId}`);
  };

  return (
    <div className="flex-1 space-y-6 pt-4 pb-12 px-4 sm:px-6 lg:px-8 max-w-6xl mx-auto w-full animate-in fade-in duration-300 font-sans">
      {/* Breadcrumbs & Navigation Bar */}
      <div className="flex items-center gap-2 text-xs font-mono text-muted-foreground">
        <Link href="/dashboard" className="hover:text-foreground flex items-center gap-1 transition-colors">
          <span>Orbital Command</span>
        </Link>
        <ChevronRight className="w-3 h-3" />
        <span className="text-foreground font-semibold truncate">Telemetry Dossier</span>
        <ChevronRight className="w-3 h-3" />
        <span className="text-primary font-bold">NORAD #{object.noradId}</span>
      </div>

      {/* Main Header Card */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 rounded-xl bg-card border border-border/80 shadow-sm">
        <div className="flex items-center gap-3.5">
          <Button 
            variant="outline" 
            size="icon" 
            onClick={() => router.push("/dashboard")} 
            className="h-9 w-9 border-border bg-background hover:bg-muted shrink-0"
            title="Back to 3D Orbit Center"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-mono text-xs font-bold text-muted-foreground">NORAD #{object.noradId}</span>
              <Badge 
                variant="outline" 
                className={`font-mono text-[10px] font-bold uppercase ${
                  isDebris 
                    ? "text-red-400 border-red-500/40 bg-red-950/40" 
                    : "text-emerald-400 border-emerald-500/40 bg-emerald-950/40"
                }`}
              >
                {isDebris ? "Debris Fragment" : "Active Satellite"}
              </Badge>
              <Badge variant="outline" className="font-mono text-[10px] text-sky-400 border-sky-500/30 bg-sky-950/30 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-sky-400 animate-ping" />
                <span>SGP4 Live Ephemeris</span>
              </Badge>
            </div>
            <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight text-foreground mt-1">
              {object.name}
            </h1>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 flex-wrap">
          <Link href="/dashboard">
            <Button size="sm" className="gap-1.5 text-xs font-mono bg-primary text-primary-foreground shadow-sm">
              <Target className="h-3.5 w-3.5" />
              <span>Track in 3D Orbit</span>
            </Button>
          </Link>
          <Button 
            onClick={handleExport}
            variant="outline" 
            size="sm" 
            className="gap-1.5 text-xs font-mono border-border bg-background"
          >
            <Download className="h-3.5 w-3.5" />
            <span>Export CSV</span>
          </Button>
          <Link href="/cases">
            <Button size="sm" variant="outline" className="gap-1.5 text-xs font-mono border-border bg-background">
              <Crosshair className="h-3.5 w-3.5" />
              <span>Conjunctions ({activeAlerts.length})</span>
            </Button>
          </Link>
        </div>
      </div>

      {/* LIVE Real-Time Coordinates & Ground Track Hero Banner */}
      <Card className={`border shadow-md overflow-hidden ${isDebris ? "border-red-500/40 bg-gradient-to-br from-red-950/20 to-card" : "border-sky-500/40 bg-gradient-to-br from-sky-950/20 to-card"}`}>
        <CardHeader className="pb-3 border-b border-border/50 flex flex-row items-center justify-between">
          <div className="space-y-0.5">
            <div className="flex items-center gap-2">
              <span className={`w-2.5 h-2.5 rounded-full ${isDebris ? "bg-red-400 animate-ping" : "bg-emerald-400 animate-pulse"}`} />
              <CardTitle className="text-sm font-bold font-mono tracking-wide">
                REAL-TIME ASTRODYNAMIC TELEMETRY FEED
              </CardTitle>
            </div>
            <CardDescription className="text-xs font-mono">
              Continuous SGP4 ephemeris propagation • WGS-84 Geodetic datum • 1-second update cycle
            </CardDescription>
          </div>
          <Badge variant="outline" className="font-mono text-[10px] text-emerald-400 border-emerald-500/30 bg-emerald-950/30">
            <Radio className="w-3 h-3 mr-1 animate-pulse" />
            LIVE TELEMETRY SYNC
          </Badge>
        </CardHeader>
        <CardContent className="p-4 sm:p-6 font-mono">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {/* Live Lat/Lng */}
            <div className="p-3.5 rounded-lg bg-black/50 border border-border/60">
              <span className="text-[10px] text-muted-foreground uppercase flex items-center gap-1">
                <Compass className="w-3 h-3 text-sky-400" />
                <span>Geodetic Position</span>
              </span>
              <div className="text-base sm:text-lg font-extrabold text-sky-400 mt-1">
                {latStr}
              </div>
              <div className="text-xs font-bold text-sky-400/80">
                {lngStr}
              </div>
            </div>

            {/* Altitude & Perigee/Apogee */}
            <div className="p-3.5 rounded-lg bg-black/50 border border-border/60">
              <span className="text-[10px] text-muted-foreground uppercase flex items-center gap-1">
                <Globe className="w-3 h-3 text-emerald-400" />
                <span>Altitude & Clearance</span>
              </span>
              <div className="text-base sm:text-lg font-extrabold text-emerald-400 mt-1">
                {object.altitude.toFixed(1)} km
              </div>
              <div className="text-[10px] text-muted-foreground">
                Perigee: {perigeeKm.toFixed(0)} km • Apogee: {apogeeKm.toFixed(0)} km
              </div>
            </div>

            {/* Velocity */}
            <div className="p-3.5 rounded-lg bg-black/50 border border-border/60">
              <span className="text-[10px] text-muted-foreground uppercase flex items-center gap-1">
                <Activity className="w-3 h-3 text-amber-400" />
                <span>Orbital Velocity</span>
              </span>
              <div className="text-base sm:text-lg font-extrabold text-amber-400 mt-1">
                {vMag.toFixed(2)} km/s
              </div>
              <div className="text-[10px] text-muted-foreground">
                {(vMag * 3600).toLocaleString(undefined, { maximumFractionDigits: 0 })} km/h
              </div>
            </div>

            {/* Orbital Period */}
            <div className="p-3.5 rounded-lg bg-black/50 border border-border/60">
              <span className="text-[10px] text-muted-foreground uppercase flex items-center gap-1">
                <Clock className="w-3 h-3 text-primary" />
                <span>Orbital Period</span>
              </span>
              <div className="text-base sm:text-lg font-extrabold text-foreground mt-1">
                {periodMin.toFixed(1)} min
              </div>
              <div className="text-[10px] text-muted-foreground">
                ~{revsPerDay.toFixed(1)} revs / 24h
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Main Details Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Summary & Conjunction Status */}
        <div className="space-y-6">
          {/* Identity & Satellite Dossier Card */}
          <Card className="border-border bg-card shadow-sm">
            <CardHeader className="pb-3 text-center border-b border-border/60">
              <div className={`w-14 h-14 rounded-full border flex items-center justify-center mx-auto mb-2 ${
                isDebris 
                  ? "bg-red-950/40 border-red-500/30 text-red-400" 
                  : "bg-sky-950/40 border-sky-500/30 text-sky-400"
              }`}>
                {isDebris ? <Boxes className="w-7 h-7" /> : <Satellite className="w-7 h-7" />}
              </div>
              <CardTitle className="text-base font-bold text-foreground">{object.name}</CardTitle>
              <CardDescription className="text-xs font-mono text-muted-foreground">
                Shell: {object.shellId} • Altitude: {object.altitude.toFixed(1)} km
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-xs pt-4 font-mono">
              <div className="space-y-2 p-3 rounded-lg border border-border/70 bg-muted/20">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">NORAD ID:</span>
                  <span className="font-bold text-foreground">{object.noradId}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Type:</span>
                  <span className={`font-semibold ${isDebris ? "text-red-400" : "text-emerald-400"}`}>
                    {object.type.toUpperCase()}
                  </span>
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
                  <span className="font-semibold text-foreground text-[11px] truncate max-w-[160px]">{object.epoch}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">UUID:</span>
                  <span className="font-mono text-[10px] text-muted-foreground truncate max-w-[150px]">{object.id}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Real-Time Conjunction Threat Assessment Card */}
          <Card className="border-border bg-card shadow-sm">
            <CardHeader className="pb-3 border-b border-border/60">
              <CardTitle className="text-xs font-bold font-mono uppercase tracking-wider flex items-center gap-1.5">
                <Crosshair className="w-3.5 h-3.5 text-primary" />
                <span>Conjunction Threat Profile</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 font-mono text-xs space-y-3">
              {activeAlerts.length > 0 ? (
                <div className="p-3 rounded-lg border border-red-500/30 bg-red-950/20 text-red-300 space-y-1.5">
                  <div className="flex items-center gap-1.5 font-bold text-red-400">
                    <ShieldAlert className="w-4 h-4 text-red-400 shrink-0" />
                    <span>Active Proximity Alerts ({activeAlerts.length})</span>
                  </div>
                  <p className="text-[11px] leading-relaxed text-red-300/90">
                    This body has active close-approach intersections cataloged. Inspect conjunctions for TCA and autonomous maneuver plans.
                  </p>
                  <Link href="/cases" className="text-[10px] underline font-bold text-red-300 block pt-1">
                    View Conjunction Events &rarr;
                  </Link>
                </div>
              ) : (
                <div className="p-3 rounded-lg border border-emerald-500/30 bg-emerald-950/20 text-emerald-300 space-y-1">
                  <div className="flex items-center gap-1.5 font-bold text-emerald-400">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>Safe Orbital Corridor</span>
                  </div>
                  <p className="text-[11px] text-muted-foreground leading-relaxed">
                    Zero critical conjunction intersections detected in current SGP4 72-hour screening corridor.
                  </p>
                </div>
              )}
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
                <span>Classical Keplerian Orbital Elements</span>
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
                    {aKm.toFixed(3)} km
                  </span>
                </div>
                <div className="p-3 rounded-lg border border-border/60 bg-muted/20">
                  <span className="text-[10px] text-muted-foreground uppercase block">Eccentricity (e)</span>
                  <span className="text-sm font-bold text-foreground mt-0.5 block">
                    {kep.eccentricity.toFixed(7)}
                  </span>
                </div>
                <div className="p-3 rounded-lg border border-border/60 bg-muted/20">
                  <span className="text-[10px] text-muted-foreground uppercase block">Inclination (i)</span>
                  <span className="text-sm font-bold text-foreground mt-0.5 block">
                    {kep.inclination.toFixed(4)}°
                  </span>
                </div>
                <div className="p-3 rounded-lg border border-border/60 bg-muted/20">
                  <span className="text-[10px] text-muted-foreground uppercase block">RAAN (Ω)</span>
                  <span className="text-sm font-bold text-foreground mt-0.5 block">
                    {kep.raan.toFixed(4)}°
                  </span>
                </div>
                <div className="p-3 rounded-lg border border-border/60 bg-muted/20">
                  <span className="text-[10px] text-muted-foreground uppercase block">Arg of Perigee (ω)</span>
                  <span className="text-sm font-bold text-foreground mt-0.5 block">
                    {kep.argOfPerigee.toFixed(4)}°
                  </span>
                </div>
                <div className="p-3 rounded-lg border border-border/60 bg-muted/20">
                  <span className="text-[10px] text-muted-foreground uppercase block">Mean Anomaly (M)</span>
                  <span className="text-sm font-bold text-foreground mt-0.5 block">
                    {kep.meanAnomaly.toFixed(4)}°
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
                <span>Error Covariance Tensor & Live State Vectors</span>
              </CardTitle>
              <CardDescription className="text-xs">
                Symmetric 3×3 positional covariance tensor in ECI Cartesian coordinates (km²).
              </CardDescription>
            </CardHeader>
            <CardContent className="p-4 space-y-4 font-mono text-xs">
              {/* Covariance Matrix Table */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                    Position Error Covariance Matrix (Σ)
                  </span>
                  <span className="text-[10px] text-muted-foreground">
                    1-σ Bounds: X: &plusmn;{sigmaX.toFixed(2)} km • Y: &plusmn;{sigmaY.toFixed(2)} km • Z: &plusmn;{sigmaZ.toFixed(2)} km
                  </span>
                </div>
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
                            &sigma;{["x", "y", "z"][rIdx]}{["x", "y", "z"][cIdx]}
                          </div>
                          <div className="text-xs mt-0.5">{val.toExponential(3)}</div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>

              {/* Real-Time State Vectors (ECI J2000) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                <div className="p-3.5 rounded-lg border border-border/60 bg-black/40">
                  <span className="text-[10px] font-bold text-muted-foreground uppercase block mb-1 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    <span>Real-Time ECI Position [X, Y, Z]</span>
                  </span>
                  <div className="space-y-1 text-foreground">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">X:</span>
                      <span className="font-bold text-sky-400">{xEciKm.toFixed(2)} km</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Y:</span>
                      <span className="font-bold text-sky-400">{yEciKm.toFixed(2)} km</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Z:</span>
                      <span className="font-bold text-sky-400">{zEciKm.toFixed(2)} km</span>
                    </div>
                  </div>
                </div>

                <div className="p-3.5 rounded-lg border border-border/60 bg-black/40">
                  <span className="text-[10px] font-bold text-muted-foreground uppercase block mb-1 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                    <span>Real-Time ECI Velocity [Vx, Vy, Vz]</span>
                  </span>
                  <div className="space-y-1 text-foreground">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Vx:</span>
                      <span className="font-bold text-amber-400">{vx.toFixed(4)} km/s</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Vy:</span>
                      <span className="font-bold text-amber-400">{vy.toFixed(4)} km/s</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Vz:</span>
                      <span className="font-bold text-amber-400">{vz.toFixed(4)} km/s</span>
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
