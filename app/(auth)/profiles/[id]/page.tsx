"use client";

import React from "react";
import { useParams, useRouter } from "next/navigation";
import { 
  ArrowLeft, 
  Orbit, 
  ShieldAlert, 
  MapPin, 
  AlertTriangle, 
  Calendar, 
  FileText, 
  Network, 
  Radio,
  Share2,
  Crosshair,
  Boxes
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { MOCK_PERSONS } from "@/lib/mockData";
import Link from "next/link";

export default function ProfileDetailPage() {
  const params = useParams();
  const router = useRouter();
  const profileId = params?.id as string;

  const person = MOCK_PERSONS.find(p => p.id === profileId) || MOCK_PERSONS[0];
  const displayName = person.full_name || person.name || "Tracked Orbital Body";

  return (
    <div className="flex-1 space-y-6 p-6 lg:p-8 max-w-6xl mx-auto w-full animate-in fade-in duration-300 font-sans">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Button variant="outline" size="icon" onClick={() => router.back()} className="h-8 w-8 border-border bg-card">
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs font-bold text-muted-foreground">{person.id}</span>
              <Badge variant="outline" className={`font-mono text-[10px] font-bold ${person.risk_score > 70 ? "text-rose-500 border-rose-500/30 bg-rose-500/10" : "text-emerald-500 border-emerald-500/30 bg-emerald-500/10"}`}>
                Kessler Threat: {person.risk_score}/100
              </Badge>
            </div>
            <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight text-foreground mt-0.5">{displayName}</h1>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Link href="/network">
            <Button variant="outline" size="sm" className="gap-1.5 text-xs border-border bg-card">
              <Network className="h-3.5 w-3.5" />
              Object Graph
            </Button>
          </Link>
          <Link href="/cases">
            <Button size="sm" className="gap-1.5 text-xs bg-foreground text-background">
              <Crosshair className="h-3.5 w-3.5" />
              View Conjunctions
            </Button>
          </Link>
        </div>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Object Summary */}
        <div className="space-y-6">
          <Card className="border-border bg-card">
            <CardHeader className="pb-3 text-center border-b border-border/60">
              <div className="w-20 h-20 rounded-full bg-muted border border-border flex items-center justify-center mx-auto mb-3 text-foreground font-extrabold text-xl">
                <Boxes className="w-8 h-8" />
              </div>
              <CardTitle className="text-base font-bold text-foreground">{displayName}</CardTitle>
              <CardDescription className="text-xs font-mono text-muted-foreground">
                NORAD #{person.norad_id || 52109} • {person.aliases?.join(", ") || "Active"}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-xs pt-4 font-mono">
              <div className="space-y-2 p-3 rounded-lg border border-border bg-muted/30">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">State:</span>
                  <span className={`font-bold ${person.maneuverable ? "text-emerald-500" : "text-zinc-400"}`}>
                    {person.maneuverable ? "Active Payload" : "Defunct Fragment"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Orbital Age:</span>
                  <span className="font-semibold text-foreground">{person.age} Years in Orbit</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Operator / Nation:</span>
                  <span className="font-semibold text-foreground truncate">{person.district}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">RCS Radar Signature:</span>
                  <span className="font-semibold text-foreground">{person.rcs}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Encounter History:</span>
                  <span className="font-bold text-foreground">{person.fir_count} Conjunctions</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right 2 Columns: Astrodynamic Ephemeris */}
        <div className="lg:col-span-2 space-y-6">
          <Card className="border-border bg-card">
            <CardHeader className="pb-3 border-b border-border/60">
              <CardTitle className="text-base font-bold flex items-center gap-2">
                <Orbit className="h-4 w-4" />
                Orbital Ephemeris &amp; Covariance State Vector
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4 space-y-4 text-xs font-sans">
              <p className="text-foreground/90 bg-muted/40 p-4 rounded-xl border border-border/60 leading-relaxed">
                {person.notes}
              </p>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 font-mono">
                <div className="p-3 rounded-lg border border-border bg-card">
                  <span className="text-[10px] text-muted-foreground uppercase block">Apogee Altitude</span>
                  <span className="font-bold text-foreground text-sm mt-0.5 block">{person.apogee_km} km</span>
                </div>
                <div className="p-3 rounded-lg border border-border bg-card">
                  <span className="text-[10px] text-muted-foreground uppercase block">Perigee Altitude</span>
                  <span className="font-bold text-foreground text-sm mt-0.5 block">{person.perigee_km} km</span>
                </div>
                <div className="p-3 rounded-lg border border-border bg-card">
                  <span className="text-[10px] text-muted-foreground uppercase block">Inclination</span>
                  <span className="font-bold text-foreground text-sm mt-0.5 block">{person.inclination_deg}°</span>
                </div>
                <div className="p-3 rounded-lg border border-border bg-card">
                  <span className="text-[10px] text-muted-foreground uppercase block">Propulsion</span>
                  <span className={`font-bold text-sm mt-0.5 block ${person.maneuverable ? "text-emerald-500" : "text-zinc-400"}`}>
                    {person.maneuverable ? "Yes (Δv)" : "None"}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
