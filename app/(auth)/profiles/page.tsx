"use client";

import React, { useState } from "react";
import { 
  Boxes, 
  Search, 
  ShieldAlert, 
  AlertTriangle, 
  MapPin, 
  FileText, 
  Eye, 
  ArrowRight,
  Orbit,
  Radio,
  Download
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { MOCK_PERSONS, MockPerson } from "@/lib/mockData";
import Link from "next/link";
import { downloadDataAsCsv } from "@/lib/utils";

export default function ProfilesPage() {
  const [persons] = useState<MockPerson[]>(MOCK_PERSONS);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");

  const filteredPersons = persons.filter((p) => {
    const objectName = (p.full_name || p.name || "").toLowerCase();
    const primaryCat = (p.primary_crime_category || p.primary_crime || "").toLowerCase();
    const matchesSearch = objectName.includes(search.toLowerCase()) ||
                          p.aliases.some(a => a.toLowerCase().includes(search.toLowerCase())) ||
                          primaryCat.includes(search.toLowerCase()) ||
                          (p.norad_id && p.norad_id.toString().includes(search));
    const matchesStatus = statusFilter === "ALL" || 
      (statusFilter === "ACTIVE" && p.maneuverable) ||
      (statusFilter === "DEBRIS" && !p.maneuverable);
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="flex-1 space-y-6 p-6 lg:p-8 max-w-7xl mx-auto w-full animate-in fade-in duration-300 font-sans">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground flex items-center gap-2">
            <Boxes className="w-7 h-7 text-foreground" />
            Tracked Objects &amp; Orbital Catalog
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">
            Active payloads, hypervelocity debris fragments, apogee/perigee elements, and Kessler collision threat scores.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button 
            onClick={() => downloadDataAsCsv(persons, "auralis-tracked-objects")}
            variant="outline" 
            size="sm" 
            className="text-xs font-semibold gap-1.5 border-border bg-card hover:bg-muted"
          >
            <Download className="w-3.5 h-3.5" />
            Export Catalog
          </Button>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-card p-3 rounded-xl border border-border">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by object name, NORAD ID (e.g. '52109'), or operator..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-9 text-xs bg-muted/40 border-border"
          />
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto">
          {["ALL", "ACTIVE", "DEBRIS"].map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1.5 text-xs font-mono font-semibold rounded-lg transition-colors whitespace-nowrap ${
                statusFilter === st 
                  ? "bg-foreground text-background shadow-xs" 
                  : "text-muted-foreground hover:bg-muted"
              }`}
            >
              {st === "ALL" ? "ALL OBJECTS" : st === "ACTIVE" ? "MANEUVERABLE" : "DEBRIS / INACTIVE"}
            </button>
          ))}
        </div>
      </div>

      {/* Profiles Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
        {filteredPersons.map((person) => (
          <Card key={person.id} className="flex flex-col justify-between border-border bg-card shadow-xs hover:border-zinc-500 transition-colors">
            <CardHeader className="pb-3 border-b border-border/60">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h3 className="font-bold text-base text-foreground leading-tight">{person.full_name || person.name}</h3>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {person.aliases.map((alias, idx) => (
                      <span key={idx} className="text-[10px] font-mono text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                        {alias}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="flex flex-col items-end font-mono">
                  <span className={`text-xs font-bold ${person.risk_score > 75 ? "text-rose-500" : person.risk_score > 40 ? "text-amber-500" : "text-emerald-500"}`}>
                    {person.risk_score}
                  </span>
                  <span className="text-[9px] uppercase tracking-wider text-muted-foreground">THREAT</span>
                </div>
              </div>
            </CardHeader>

            <CardContent className="pt-3 pb-4 space-y-3 text-xs font-sans">
              <div className="space-y-1">
                <span className="text-[10px] font-mono text-muted-foreground uppercase">Classification</span>
                <p className="font-semibold text-foreground text-xs">{person.primary_crime_category || person.primary_crime}</p>
              </div>

              <div className="grid grid-cols-2 gap-2 pt-1 font-mono text-[11px]">
                <div className="p-2 rounded bg-muted/40 border border-border/60">
                  <span className="text-[9px] text-muted-foreground block uppercase">Apogee / Perigee</span>
                  <span className="font-semibold text-foreground">{person.apogee_km} / {person.perigee_km} km</span>
                </div>
                <div className="p-2 rounded bg-muted/40 border border-border/60">
                  <span className="text-[9px] text-muted-foreground block uppercase">Propulsion</span>
                  <span className={`font-semibold ${person.maneuverable ? "text-emerald-500" : "text-zinc-400"}`}>
                    {person.maneuverable ? "Active Thrusters" : "Passive Ballistic"}
                  </span>
                </div>
              </div>

              <div className="pt-2">
                <Link href={`/profiles/${person.id}`}>
                  <Button variant="outline" size="sm" className="w-full text-xs font-semibold gap-1.5 border-border bg-card hover:bg-muted">
                    <Orbit className="w-3.5 h-3.5" />
                    Inspect Ephemeris
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
