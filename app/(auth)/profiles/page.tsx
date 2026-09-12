"use client";

import React, { useState, useEffect, useMemo } from "react";
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
  Radio,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Layers,
  ShieldAlert,
  AlertTriangle,
  RefreshCw
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getObjects, getShells } from "@/lib/api";
import { useWebSocket } from "@/components/providers/WebSocketProvider";
import { formatOperator } from "@/lib/formatters";
import type { TrackedObject, ObjectType, ShellRiskSnapshot } from "@/types/contract";
import Link from "next/link";
import { downloadDataAsCsv } from "@/lib/utils";

type SortField = "noradId" | "name" | "altitude" | "inclination";
type SortDirection = "asc" | "desc";

export default function ProfilesPage() {
  const [objects, setObjects] = useState<TrackedObject[]>([]);
  const [shells, setShells] = useState<ShellRiskSnapshot[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("ALL");
  const [shellFilter, setShellFilter] = useState<string>("ALL");
  const [sortField, setSortField] = useState<SortField>("noradId");
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(25);
  const [loading, setLoading] = useState(true);

  const loadCatalogData = async () => {
    setLoading(true);
    try {
      const [objRes, shellsRes] = await Promise.all([
        getObjects({ limit: 1000, offset: 0 }),
        getShells(),
      ]);

      setObjects(objRes.data || []);
      setTotalCount(objRes.total || (objRes.data || []).length);
      setShells(shellsRes.data || []);
    } catch (err) {
      console.error("Failed loading tracked objects catalog:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCatalogData();
  }, []);

  // Real-time WebSocket subscriptions
  useWebSocket("crisis:injected", () => {
    loadCatalogData();
  });

  useWebSocket("objects:updated", (payload) => {
    if (payload?.objects) {
      setObjects((prev) => {
        const idMap = new Set(payload.objects.map((o) => o.id));
        return [...payload.objects, ...prev.filter((o) => !idMap.has(o.id))];
      });
    }
  });

  // KPI Metrics Calculation
  const kpis = useMemo(() => {
    const total = objects.length;
    const satellites = objects.filter((o) => o.type === "satellite").length;
    const debris = objects.filter((o) => o.type === "debris").length;
    const rocketBodies = objects.filter((o) => o.type === "rocket_body").length;

    return { total, satellites, debris, rocketBodies };
  }, [objects]);

  // Filtering
  const filteredObjects = useMemo(() => {
    return objects.filter((obj) => {
      // Type Filter
      if (typeFilter !== "ALL" && obj.type.toLowerCase() !== typeFilter.toLowerCase()) {
        return false;
      }

      // Shell Filter
      if (shellFilter !== "ALL" && obj.shellId !== shellFilter) {
        return false;
      }

      // Search Query
      if (search.trim()) {
        const q = search.toLowerCase();
        const searchTarget = [
          obj.name,
          obj.noradId.toString(),
          obj.shellId,
          obj.type,
          obj.status,
          formatOperator(obj.operatorId, obj.name),
        ].join(" ").toLowerCase();

        return searchTarget.includes(q);
      }

      return true;
    });
  }, [objects, typeFilter, shellFilter, search]);

  // Sorting
  const sortedObjects = useMemo(() => {
    return [...filteredObjects].sort((a, b) => {
      let comparison = 0;
      switch (sortField) {
        case "noradId":
          comparison = a.noradId - b.noradId;
          break;
        case "name":
          comparison = a.name.localeCompare(b.name);
          break;
        case "altitude":
          comparison = a.altitude - b.altitude;
          break;
        case "inclination":
          comparison = (a.orbitalElements?.inclination || 0) - (b.orbitalElements?.inclination || 0);
          break;
      }
      return sortDirection === "asc" ? comparison : -comparison;
    });
  }, [filteredObjects, sortField, sortDirection]);

  // Pagination
  const totalPages = Math.max(1, Math.ceil(sortedObjects.length / pageSize));
  const safePage = Math.min(page, totalPages - 1);
  const paginated = sortedObjects.slice(safePage * pageSize, (safePage + 1) * pageSize);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };

  const getSortIcon = (field: SortField) => {
    if (sortField !== field) {
      return <ArrowUpDown className="h-3 w-3 opacity-40 ml-1 inline" />;
    }
    return sortDirection === "asc" ? (
      <ArrowUp className="h-3 w-3 text-primary ml-1 inline" />
    ) : (
      <ArrowDown className="h-3 w-3 text-primary ml-1 inline" />
    );
  };

  const handleExport = () => {
    const exportRows = filteredObjects.map((o) => ({
      id: o.id,
      noradId: o.noradId,
      name: o.name,
      type: o.type,
      altitudeKm: o.altitude,
      shellId: o.shellId,
      status: o.status,
      semiMajorAxisKm: o.orbitalElements?.semiMajorAxis || 0,
      inclinationDeg: o.orbitalElements?.inclination || 0,
      eccentricity: o.orbitalElements?.eccentricity || 0,
      operator: formatOperator(o.operatorId, o.name),
      lastUpdated: o.lastUpdated,
    }));
    downloadDataAsCsv(exportRows, "auralis-tracked-objects-catalog");
  };

  const getTypeBadge = (type: ObjectType) => {
    switch (type) {
      case "satellite":
        return (
          <Badge className="font-mono text-[10px] font-semibold bg-emerald-950/60 text-emerald-400 border-emerald-500/40 shadow-xs">
            PAYLOAD
          </Badge>
        );
      case "debris":
        return (
          <Badge className="font-mono text-[10px] font-semibold bg-rose-950/50 text-rose-400 border-rose-500/40 shadow-xs">
            DEBRIS
          </Badge>
        );
      case "rocket_body":
        return (
          <Badge className="font-mono text-[10px] font-semibold bg-amber-950/60 text-amber-400 border-amber-500/40 shadow-xs">
            ROCKET BODY
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
              CONTRACT §1.1 • CELESTRAK HIGH-PRECISION EPHEMERIDES
            </Badge>
            <span className="text-xs font-mono text-muted-foreground">
              {kpis.total.toLocaleString()} CATALOGED ASSETS
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
        <div className="flex items-center gap-2">
          <Button 
            onClick={loadCatalogData}
            variant="outline" 
            size="sm" 
            className="text-xs font-mono gap-1.5 border-border bg-card hover:bg-muted"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            Sync TLE
          </Button>
          <Button 
            onClick={handleExport}
            variant="outline" 
            size="sm"
            className="gap-1.5 text-xs font-semibold font-mono border-border bg-card hover:bg-muted"
          >
            <Download className="h-4 w-4" />
            Export Catalog Manifest
          </Button>
        </div>
      </div>

      {/* Catalog KPI Metrics Overview */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="border-border/80 bg-card/80 shadow-xs">
          <CardContent className="p-4 font-mono">
            <div className="text-[10px] uppercase text-muted-foreground font-semibold">Total Cataloged Bodies</div>
            <div className="text-2xl font-black text-foreground mt-1">{kpis.total.toLocaleString()}</div>
            <p className="text-[10px] text-muted-foreground mt-0.5">SGP4 calibrated ephemerides</p>
          </CardContent>
        </Card>

        <Card className="border-emerald-500/30 bg-emerald-950/10 shadow-xs">
          <CardContent className="p-4 font-mono">
            <div className="text-[10px] uppercase text-emerald-400 font-semibold">Active Satellites (S)</div>
            <div className="text-2xl font-black text-emerald-400 mt-1 flex items-center gap-2">
              {kpis.satellites.toLocaleString()}
              <span className="text-xs font-bold px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400">
                ACTIVE
              </span>
            </div>
            <p className="text-[10px] text-emerald-400/80 mt-0.5">Operational communications & science</p>
          </CardContent>
        </Card>

        <Card className="border-rose-500/30 bg-rose-950/10 shadow-xs">
          <CardContent className="p-4 font-mono">
            <div className="text-[10px] uppercase text-rose-400 font-semibold">Tracked Lethal Debris (I)</div>
            <div className="text-2xl font-black text-rose-400 mt-1 flex items-center gap-2">
              {kpis.debris.toLocaleString()}
              <span className="text-xs font-bold px-1.5 py-0.5 rounded bg-rose-500/20 text-rose-400">
                NON-MANEUVERABLE
              </span>
            </div>
            <p className="text-[10px] text-rose-400/80 mt-0.5">Hypervelocity collision fragments</p>
          </CardContent>
        </Card>

        <Card className="border-amber-500/30 bg-amber-950/10 shadow-xs">
          <CardContent className="p-4 font-mono">
            <div className="text-[10px] uppercase text-amber-400 font-semibold">Rocket Bodies (R/B)</div>
            <div className="text-2xl font-black text-amber-400 mt-1 flex items-center gap-2">
              {kpis.rocketBodies.toLocaleString()}
              <span className="text-xs font-bold px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-400">
                DERELICT
              </span>
            </div>
            <p className="text-[10px] text-amber-400/80 mt-0.5">Spent upper stages with high mass</p>
          </CardContent>
        </Card>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-3 bg-card/80 p-3.5 rounded-xl border border-border/80 backdrop-blur-sm shadow-xs">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full lg:w-auto flex-1 max-w-xl">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by name, NORAD ID, shell, operator..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(0);
              }}
              className="pl-9 h-9 text-xs bg-muted/40 border-border font-mono placeholder:text-muted-foreground"
            />
          </div>

          {/* Shell Dropdown Filter */}
          <select
            value={shellFilter}
            onChange={(e) => {
              setShellFilter(e.target.value);
              setPage(0);
            }}
            className="h-9 px-2.5 rounded-lg border border-border bg-muted/40 text-xs font-mono text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
          >
            <option value="ALL">ALL ORBITAL SHELLS</option>
            {shells.map((s) => (
              <option key={s.shellId} value={s.shellId}>
                {s.shellId} ({s.altitudeMin}-{s.altitudeMax} km)
              </option>
            ))}
          </select>
        </div>

        {/* Object Classification Filter Buttons */}
        <div className="flex items-center gap-1 overflow-x-auto w-full lg:w-auto pb-1 lg:pb-0">
          {[
            { id: "ALL", label: "ALL ASSETS" },
            { id: "SATELLITE", label: "SATELLITES" },
            { id: "DEBRIS", label: "DEBRIS" },
            { id: "ROCKET_BODY", label: "ROCKET BODIES" },
          ].map((btn) => (
            <button
              key={btn.id}
              type="button"
              onClick={() => {
                setTypeFilter(btn.id);
                setPage(0);
              }}
              className={`px-3 py-1.5 text-xs font-mono font-bold rounded-lg transition-colors whitespace-nowrap cursor-pointer ${
                typeFilter === btn.id 
                  ? "bg-foreground text-background shadow-xs" 
                  : "text-muted-foreground hover:bg-muted"
              }`}
            >
              {btn.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tracked Objects Table */}
      <Card className="shadow-sm border-border/80 bg-card/80 backdrop-blur-sm">
        <CardHeader className="pb-3 border-b border-border/60">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base font-bold flex items-center gap-2">
                <Orbit className="h-4 w-4 text-primary" />
                Orbital Catalog Directory
              </CardTitle>
              <CardDescription className="text-xs">
                Click any row to view high-precision Keplerian orbital elements and 3×3 error covariance tensors.
              </CardDescription>
            </div>
            <div className="flex items-center gap-3 text-xs font-mono text-muted-foreground">
              <span>
                Showing {sortedObjects.length === 0 ? 0 : safePage * pageSize + 1}–{Math.min((safePage + 1) * pageSize, sortedObjects.length)} of {sortedObjects.length}
              </span>
              <div className="flex items-center gap-1">
                <span>Per page:</span>
                <select
                  value={pageSize}
                  onChange={(e) => {
                    setPageSize(Number(e.target.value));
                    setPage(0);
                  }}
                  className="bg-muted border border-border rounded px-1 py-0.5 text-xs font-mono text-foreground"
                >
                  <option value={25}>25</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                </select>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/40 border-b border-border text-[11px]">
                  <TableHead 
                    className="font-mono font-semibold cursor-pointer select-none hover:text-foreground"
                    onClick={() => handleSort("noradId")}
                  >
                    NORAD ID {getSortIcon("noradId")}
                  </TableHead>
                  <TableHead 
                    className="font-semibold cursor-pointer select-none hover:text-foreground"
                    onClick={() => handleSort("name")}
                  >
                    Object Name {getSortIcon("name")}
                  </TableHead>
                  <TableHead className="font-semibold">Classification</TableHead>
                  <TableHead 
                    className="font-semibold cursor-pointer select-none hover:text-foreground"
                    onClick={() => handleSort("altitude")}
                  >
                    Altitude (km) {getSortIcon("altitude")}
                  </TableHead>
                  <TableHead className="font-semibold">Orbital Shell</TableHead>
                  <TableHead 
                    className="font-semibold cursor-pointer select-none hover:text-foreground"
                    onClick={() => handleSort("inclination")}
                  >
                    Inclination {getSortIcon("inclination")}
                  </TableHead>
                  <TableHead className="font-semibold">Status</TableHead>
                  <TableHead className="font-semibold">Operator / Origin</TableHead>
                  <TableHead className="font-semibold text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginated.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-8 text-muted-foreground font-mono text-xs">
                      No tracked space objects match the search or filter criteria.
                    </TableCell>
                  </TableRow>
                ) : (
                  paginated.map((obj) => (
                    <TableRow key={obj.id} className="hover:bg-muted/30 transition-colors border-b border-border/50">
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
                        {obj.orbitalElements?.inclination ? `${obj.orbitalElements.inclination.toFixed(2)}°` : "N/A"}
                      </TableCell>
                      <TableCell className="whitespace-nowrap">
                        <Badge variant="outline" className="font-mono text-[10px] font-semibold uppercase">
                          {obj.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs font-mono text-muted-foreground whitespace-nowrap">
                        {formatOperator(obj.operatorId, obj.name)}
                      </TableCell>
                      <TableCell className="text-right whitespace-nowrap">
                        <Link href={`/profiles/${obj.id}`}>
                          <Button size="sm" variant="ghost" className="h-7 text-xs font-mono gap-1 text-primary hover:text-primary hover:bg-primary/10">
                            Telemetry <ArrowRight className="h-3 w-3" />
                          </Button>
                        </Link>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {/* Enhanced Pagination Controls */}
          {totalPages > 1 && (
            <div className="flex flex-col sm:flex-row items-center justify-between p-4 border-t border-border font-mono text-xs text-muted-foreground gap-3">
              <span>
                Page {safePage + 1} of {totalPages} ({sortedObjects.length} total catalog records)
              </span>
              <div className="flex items-center gap-1.5">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.max(0, p - 1))}
                  disabled={safePage === 0}
                  className="h-8 gap-1 font-mono text-xs"
                >
                  <ChevronLeft className="h-3.5 w-3.5" /> Previous
                </Button>

                {/* Page Jump Numbers */}
                <div className="hidden sm:flex items-center gap-1 mx-1">
                  {Array.from({ length: Math.min(5, totalPages) }, (_, idx) => {
                    let pageNum: number;
                    if (totalPages <= 5) {
                      pageNum = idx;
                    } else if (safePage <= 2) {
                      pageNum = idx;
                    } else if (safePage >= totalPages - 3) {
                      pageNum = totalPages - 5 + idx;
                    } else {
                      pageNum = safePage - 2 + idx;
                    }

                    return (
                      <button
                        key={pageNum}
                        type="button"
                        onClick={() => setPage(pageNum)}
                        className={`w-7 h-7 rounded text-xs font-bold transition-colors ${
                          safePage === pageNum
                            ? "bg-foreground text-background font-black"
                            : "hover:bg-muted text-muted-foreground"
                        }`}
                      >
                        {pageNum + 1}
                      </button>
                    );
                  })}
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                  disabled={safePage >= totalPages - 1}
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
