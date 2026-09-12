"use client";

import React, { useState, useEffect } from "react";
import { 
  Boxes, 
  Search, 
  Orbit, 
  Download, 
  Satellite, 
  Trash2, 
  ArrowRight,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  Activity,
  Radio
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getObjects } from "@/lib/api";
import type { TrackedObject, ObjectType } from "@/types/contract";
import Link from "next/link";
import { downloadDataAsCsv } from "@/lib/utils";

export default function ProfilesPage() {
  const [objects, setObjects] = useState<TrackedObject[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("ALL");
  const [page, setPage] = useState(0);
  const [pageSize] = useState(25);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    async function loadObjects() {
      setLoading(true);
      try {
        const queryParams: any = {
          limit: 200, // Load catalog batch for client-side fluid filtering
          offset: 0,
        };
        if (typeFilter !== "ALL") {
          queryParams.type = typeFilter.toLowerCase();
        }
        const res = await getObjects(queryParams);
        if (!mounted) return;
        setObjects(res.data);
        setTotalCount(res.total);
      } catch (err) {
        console.error("Failed loading tracked objects catalog:", err);
      } finally {
        if (mounted) setLoading(false);
      }
    }
    loadObjects();
    return () => {
      mounted = false;
    };
  }, [typeFilter]);

  const filteredObjects = objects.filter((obj) => {
    const searchTarget = [
      obj.name,
      obj.noradId.toString(),
      obj.shellId,
      obj.type,
      obj.status,
      obj.operatorId || "",
    ].join(" ").toLowerCase();

    return searchTarget.includes(search.toLowerCase());
  });

  const paginated = filteredObjects.slice(page * pageSize, (page + 1) * pageSize);
  const totalPages = Math.ceil(filteredObjects.length / pageSize);

  const handleExport = () => {
    const exportRows = filteredObjects.map((o) => ({
      id: o.id,
      noradId: o.noradId,
      name: o.name,
      type: o.type,
      altitudeKm: o.altitude,
      shellId: o.shellId,
      status: o.status,
      semiMajorAxisKm: o.orbitalElements.semiMajorAxis,
      inclinationDeg: o.orbitalElements.inclination,
      eccentricity: o.orbitalElements.eccentricity,
      operatorId: o.operatorId || "UNTRACKED",
      lastUpdated: o.lastUpdated,
    }));
    downloadDataAsCsv(exportRows, "auralis-tracked-objects-catalog");
  };

  const getTypeBadge = (type: ObjectType) => {
    switch (type) {
      case "satellite":
        return (
          <Badge className="font-mono text-[10px] font-semibold bg-emerald-950/60 text-emerald-400 border-emerald-500/40">
            PAYLOAD
          </Badge>
        );
      case "debris":
        return (
          <Badge className="font-mono text-[10px] font-semibold bg-zinc-900 text-zinc-400 border-zinc-700">
            DEBRIS
          </Badge>
        );
      case "rocket_body":
        return (
          <Badge className="font-mono text-[10px] font-semibold bg-amber-950/60 text-amber-400 border-amber-500/40">
            R/B
          </Badge>
        );
      default:
        return (
          <Badge variant="outline" className="font-mono text-[10px]">
            {type}
          </Badge>
        );
    }
  };

  return (
    <div className="flex-1 space-y-6 p-6 lg:p-8 max-w-7xl mx-auto w-full animate-in fade-in duration-300 font-sans">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Badge variant="outline" className="text-[10px] font-mono text-primary border-primary/30">
              CONTRACT §1.1 • CELESTRAK EPHEMERIDES
            </Badge>
            <span className="text-xs font-mono text-muted-foreground">
              {totalCount.toLocaleString()} CATALOGED ASSETS
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground flex items-center gap-2.5">
            <Boxes className="w-7 h-7 text-primary" />
            Tracked Objects & Orbital Ephemerides
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">
            Active payloads, hypervelocity debris fragments, rocket bodies, and orbital covariance uncertainty matrices.
          </p>
        </div>
        <Button 
          onClick={handleExport}
          variant="outline" 
          className="gap-1.5 text-xs font-semibold font-mono border-border bg-card hover:bg-muted"
        >
          <Download className="h-4 w-4" />
          Export Catalog Manifest
        </Button>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-card/80 p-3 rounded-xl border border-border/80 backdrop-blur-sm shadow-sm">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by satellite name, NORAD ID, or orbital shell..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(0);
            }}
            className="pl-9 h-9 text-xs bg-muted/40 border-border font-mono"
          />
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto">
          {["ALL", "SATELLITE", "DEBRIS", "ROCKET_BODY"].map((typeKey) => (
            <button
              key={typeKey}
              type="button"
              onClick={() => {
                setTypeFilter(typeKey);
                setPage(0);
              }}
              className={`px-3 py-1.5 text-xs font-mono font-semibold rounded-lg transition-colors whitespace-nowrap cursor-pointer ${
                typeFilter === typeKey 
                  ? "bg-primary text-primary-foreground shadow-xs" 
                  : "text-muted-foreground hover:bg-muted"
              }`}
            >
              {typeKey === "ALL" ? "ALL ASSETS" : typeKey.replace("_", " ")}
            </button>
          ))}
        </div>
      </div>

      {/* Tracked Objects Table */}
      <Card className="shadow-sm border-border/80 bg-card/80 backdrop-blur-sm">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base font-bold flex items-center gap-2">
                <Orbit className="h-4 w-4 text-primary" />
                Orbital Catalog Directory
              </CardTitle>
              <CardDescription className="text-xs">
                Click any row to view high-precision Keplerian orbital elements and $3 \times 3$ error covariance tensors.
              </CardDescription>
            </div>
            <span className="text-xs font-mono text-muted-foreground">
              Showing {paginated.length} of {filteredObjects.length}
            </span>
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-lg border border-border/70 overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/40">
                  <TableHead className="font-mono font-semibold text-xs">NORAD ID</TableHead>
                  <TableHead className="font-semibold text-xs">Object Name</TableHead>
                  <TableHead className="font-semibold text-xs">Classification</TableHead>
                  <TableHead className="font-semibold text-xs">Altitude (km)</TableHead>
                  <TableHead className="font-semibold text-xs">Orbital Shell</TableHead>
                  <TableHead className="font-semibold text-xs">Inclination</TableHead>
                  <TableHead className="font-semibold text-xs">Status</TableHead>
                  <TableHead className="font-semibold text-xs">Operator</TableHead>
                  <TableHead className="font-semibold text-xs text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginated.map((obj) => (
                  <TableRow key={obj.id} className="hover:bg-muted/30 transition-colors">
                    <TableCell className="font-mono text-xs font-bold text-primary whitespace-nowrap">
                      <Link href={`/profiles/${obj.id}`} className="hover:underline flex items-center gap-1">
                        #{obj.noradId}
                        <ExternalLink className="h-2.5 w-2.5 opacity-60" />
                      </Link>
                    </TableCell>
                    <TableCell className="text-xs font-semibold">
                      <div className="flex flex-col">
                        <span className="text-foreground">{obj.name}</span>
                        <span className="text-[10px] text-muted-foreground font-mono truncate max-w-[180px]">
                          UUID: {obj.id.slice(0, 13)}...
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="whitespace-nowrap">
                      {getTypeBadge(obj.type)}
                    </TableCell>
                    <TableCell className="text-xs font-mono font-semibold whitespace-nowrap">
                      {obj.altitude.toFixed(1)} km
                    </TableCell>
                    <TableCell className="text-xs font-mono text-muted-foreground whitespace-nowrap">
                      {obj.shellId}
                    </TableCell>
                    <TableCell className="text-xs font-mono text-muted-foreground whitespace-nowrap">
                      {obj.orbitalElements.inclination.toFixed(2)}°
                    </TableCell>
                    <TableCell className="whitespace-nowrap">
                      <Badge variant="outline" className="font-mono text-[10px] font-semibold uppercase">
                        {obj.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs font-mono text-muted-foreground whitespace-nowrap">
                      {obj.operatorId || "Untracked Body"}
                    </TableCell>
                    <TableCell className="text-right whitespace-nowrap">
                      <Link href={`/profiles/${obj.id}`}>
                        <Button size="sm" variant="ghost" className="h-7 text-xs font-mono gap-1 text-primary hover:text-primary hover:bg-primary/10">
                          Telemetry <ArrowRight className="h-3 w-3" />
                        </Button>
                      </Link>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between pt-4 font-mono text-xs text-muted-foreground">
              <span>
                Page {page + 1} of {totalPages}
              </span>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.max(0, p - 1))}
                  disabled={page === 0}
                  className="h-8 gap-1 font-mono text-xs"
                >
                  <ChevronLeft className="h-3.5 w-3.5" /> Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                  disabled={page >= totalPages - 1}
                  className="h-8 gap-1 font-mono text-xs"
                >
                  Next <ChevronRight className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
