"use client";

import React, { useState, useRef, useEffect } from "react";
import { 
  UploadCloud, 
  FileText, 
  Database, 
  CheckCircle2, 
  Loader2, 
  Network,
  Download,
  Sparkles,
  ShieldAlert,
  Orbit,
  Activity,
  Layers,
  Check,
  ArrowRight,
  Terminal,
  FileCode,
  FileSpreadsheet,
  Cpu,
  Trash2,
  RefreshCw,
  ExternalLink,
  Search
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import Link from "next/link";
import { getConjunctions, getObjects } from "@/lib/api";
import { LatexMath } from "@/components/ui/LatexMath";

interface UploadStatus {
  stage: "idle" | "uploading" | "checksum" | "sgp4" | "graph" | "completed" | "error";
  progress: number;
  message: string;
}

interface ParsedObject {
  id: string;
  noradId: number;
  name: string;
  type: string;
  operator: string;
  altitudeKm: number;
  inclinationDeg: number;
  periodMin: number;
  eccentricity: number;
  shellId: string;
  positionEci: [number, number, number];
  velocityEci: [number, number, number];
  status: string;
}

interface IngestionResponse {
  success: boolean;
  batchId: string;
  filename: string;
  formatDetected: string;
  totalRead: number;
  validParsed: number;
  invalidRecords: number;
  durationMs: number;
  checksumStatus: string;
  shellDistribution: Record<string, number>;
  objects: ParsedObject[];
  cdmSummary?: {
    conjunctionId: string;
    tca: string;
    missDistanceMeters: number;
    collisionProbability: number;
    primaryName: string;
    secondaryName: string;
  };
  validationLogs: string[];
}

const SAMPLE_FILES = [
  {
    id: "starlink",
    name: "starlink-batch-v3.tle",
    title: "Starlink Mega-Constellation",
    desc: "Active SpaceX Starlink constellation (550km LEO shell)",
    format: "3LE / Two-Line Element",
    path: "/sample-data/starlink-batch-v3.tle",
    icon: Orbit,
    tag: "TLE Batch",
    color: "text-cyan-400 border-cyan-500/30 bg-cyan-950/30"
  },
  {
    id: "debris",
    name: "iridium-cosmos-debris.tle",
    title: "Iridium & Cosmos Collision Debris",
    desc: "Fragment cloud from historic orbital breakup collisions",
    format: "3LE / Debris Catalog",
    path: "/sample-data/iridium-cosmos-debris.tle",
    icon: ShieldAlert,
    tag: "Debris Catalog",
    color: "text-rose-400 border-rose-500/30 bg-rose-950/30"
  },
  {
    id: "spacetrack",
    name: "space-track-catalog-sample.csv",
    title: "Space-Track CSV Catalog Export",
    desc: "Tabular orbital element dataset with Kozai mean parameters",
    format: "CSV Ephemeris Table",
    path: "/sample-data/space-track-catalog-sample.csv",
    icon: FileSpreadsheet,
    tag: "Space-Track CSV",
    color: "text-amber-400 border-amber-500/30 bg-amber-950/30"
  },
  {
    id: "cdm",
    name: "conjunction-cdm-screening.json",
    title: "CCSDS Conjunction Data Message",
    desc: "High-risk encounter (Pc = 4.82e-4) with 3D covariance matrices",
    format: "CCSDS CDM JSON v1.0",
    path: "/sample-data/conjunction-cdm-screening.json",
    icon: Sparkles,
    tag: "CCSDS CDM",
    color: "text-purple-400 border-purple-500/30 bg-purple-950/30"
  },
  {
    id: "station",
    name: "space-station-active-constellations.json",
    title: "Space Stations & Payloads",
    desc: "ISS (Zarya), Tiangong, Hubble, OneWeb & GPS Block III",
    format: "CCSDS OMM / GP JSON",
    path: "/sample-data/space-station-active-constellations.json",
    icon: Database,
    tag: "OMM / GP JSON",
    color: "text-emerald-400 border-emerald-500/30 bg-emerald-950/30"
  }
];

export default function DataIngestionPage() {
  const [file, setFile] = useState<File | null>(null);
  const [fileContent, setFileContent] = useState<string>("");
  const [dragActive, setDragActive] = useState(false);
  const [selectedSampleId, setSelectedSampleId] = useState<string | null>(null);
  const [searchFilter, setSearchFilter] = useState<string>("");
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [lastResult, setLastResult] = useState<IngestionResponse | null>(null);

  const [uploadStatus, setUploadStatus] = useState<UploadStatus>({
    stage: "idle",
    progress: 0,
    message: "Select or drop a space ephemeris file to begin"
  });

  const [formData, setFormData] = useState({
    catalogSource: "CELESTRAK-GP-2026-0912",
    orbitalShell: "LEO 550km - Starlink Shell",
    ephemerisFormat: "Two-Line Element (TLE) / SGP4 Compatible",
    description: "Automated routine ephemeris synchronization for high-density LEO shell collision screening."
  });

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [catalogSummary, setCatalogSummary] = useState<{ objectCount: number; conjunctionCount: number; updatedAt: string } | null>(null);
  const [ingestionHistory, setIngestionHistory] = useState<Array<{
    batchId: string;
    filename: string;
    format: string;
    objectCount: number;
    time: string;
    status: string;
  }>>([]);

  // Fetch live stats
  const refreshLiveStats = () => {
    Promise.all([getObjects({ limit: 1000 }), getConjunctions({ limit: 100 })])
      .then(([objects, conjunctions]) => {
        setCatalogSummary({
          objectCount: objects.total,
          conjunctionCount: conjunctions.total,
          updatedAt: new Date().toISOString()
        });
      })
      .catch((error) => console.error("Failed loading ingestion summary:", error));
  };

  useEffect(() => {
    refreshLiveStats();
  }, []);

  // Handle local user file selection
  const handleFileSelect = async (selectedFile: File) => {
    setFile(selectedFile);
    setSelectedSampleId(null);
    try {
      const text = await selectedFile.text();
      setFileContent(text);
      setUploadStatus({
        stage: "idle",
        progress: 0,
        message: `Loaded ${selectedFile.name} (${(selectedFile.size / 1024).toFixed(1)} KB)`
      });
      setFormData((prev) => ({
        ...prev,
        catalogSource: selectedFile.name.toUpperCase().replace(/[^A-Z0-9_-]/g, "_")
      }));
    } catch {
      setUploadStatus({
        stage: "error",
        progress: 0,
        message: "Failed to read file content"
      });
    }
  };

  // Load one of the 5 pre-bundled test sample files
  const handleLoadSample = async (sample: typeof SAMPLE_FILES[0]) => {
    setSelectedSampleId(sample.id);
    setIsProcessing(true);
    setUploadStatus({
      stage: "uploading",
      progress: 15,
      message: `Fetching pre-bundled ${sample.name}...`
    });

    try {
      const res = await fetch(sample.path);
      const text = await res.text();
      const fakeFile = new File([text], sample.name, { type: "text/plain" });
      setFile(fakeFile);
      setFileContent(text);
      setFormData({
        catalogSource: sample.id.toUpperCase(),
        orbitalShell: sample.id === "starlink" ? "LEO 550km" : sample.id === "debris" ? "SSO 780km" : "Multi-Shell",
        ephemerisFormat: sample.format,
        description: `Verified test sample: ${sample.title}`
      });

      setUploadStatus({
        stage: "idle",
        progress: 0,
        message: `Loaded ${sample.name} (${(text.length / 1024).toFixed(1)} KB). Click 'Execute Pipeline' to run SGP4!`
      });
    } catch (err) {
      setUploadStatus({
        stage: "error",
        progress: 0,
        message: `Failed loading sample file: ${sample.name}`
      });
    } finally {
      setIsProcessing(false);
    }
  };

  // Execute full ingestion pipeline
  const handleStartIngestion = async () => {
    if (!fileContent) return;

    setIsProcessing(true);
    setUploadStatus({ stage: "uploading", progress: 20, message: "Transmitting payload to SGP4 Ingestion Engine..." });

    try {
      setTimeout(() => {
        setUploadStatus({ stage: "checksum", progress: 45, message: "Validating ephemeris checksums & Keplerian element boundaries..." });
      }, 300);

      setTimeout(() => {
        setUploadStatus({ stage: "sgp4", progress: 70, message: "Deriving SGP4 state vectors [x, y, z, vx, vy, vz] & Earth J2 perturbations..." });
      }, 700);

      setTimeout(() => {
        setUploadStatus({ stage: "graph", progress: 90, message: "Indexing orbital shells & updating Object Graph topology..." });
      }, 1100);

      const res = await fetch("/api/v1/ingestion", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: fileContent,
          filename: file ? file.name : "sample-ephemeris.tle",
          catalogSource: formData.catalogSource,
          orbitalShell: formData.orbitalShell
        })
      });

      const data: IngestionResponse = await res.json();

      if (data.success) {
        setLastResult(data);
        setUploadStatus({
          stage: "completed",
          progress: 100,
          message: `Ingestion complete! ${data.validParsed} objects extracted in ${data.durationMs}ms.`
        });

        // Add to history
        setIngestionHistory((prev) => [
          {
            batchId: data.batchId,
            filename: data.filename,
            format: data.formatDetected,
            objectCount: data.validParsed,
            time: new Date().toLocaleTimeString(),
            status: "SYNCHRONIZED"
          },
          ...prev
        ]);

        refreshLiveStats();
      } else {
        setUploadStatus({
          stage: "error",
          progress: 0,
          message: "Ingestion failed: Invalid ephemeris records"
        });
      }
    } catch (err: any) {
      setUploadStatus({
        stage: "error",
        progress: 0,
        message: `Pipeline error: ${err?.message || "Unknown failure"}`
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const filteredObjects = lastResult?.objects.filter((obj) => {
    if (!searchFilter.trim()) return true;
    const q = searchFilter.toLowerCase();
    return (
      obj.name.toLowerCase().includes(q) ||
      String(obj.noradId).includes(q) ||
      obj.type.toLowerCase().includes(q) ||
      obj.shellId.toLowerCase().includes(q)
    );
  }) || [];

  return (
    <div className="flex-1 space-y-6 p-6 lg:p-8 max-w-7xl mx-auto w-full animate-in fade-in duration-300">
      {/* Header Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-border/70">
        <div>
          <div className="flex items-center gap-2">
            <Badge className="bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 font-mono text-[10px] gap-1 px-2 py-0.5">
              <Sparkles className="w-3 h-3" /> DATA INGESTION ENGINE
            </Badge>
            <span className="text-xs font-mono text-muted-foreground">SGP4 · TLE · CDM · CSV · JSON</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground mt-1 flex items-center gap-2.5">
            <UploadCloud className="w-7 h-7 text-cyan-400" />
            Orbital Ephemeris & Telemetry Ingestion Studio
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1 max-w-3xl">
            Ingest and validate real Two-Line Element (TLE) ephemeris, Space-Track catalogs, and CCSDS Conjunction Data Messages (CDM) with automatic SGP4 perturbation modeling and orbital graph synchronization.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link href="/network">
            <Button variant="outline" size="sm" className="font-mono text-xs gap-1.5 border-border hover:border-cyan-500/50">
              <Network className="w-3.5 h-3.5 text-cyan-400" />
              Object Graph
            </Button>
          </Link>
          <Link href="/dashboard">
            <Button size="sm" className="font-mono text-xs gap-1.5 bg-cyan-500 hover:bg-cyan-400 text-black font-bold shadow-md">
              <Orbit className="w-3.5 h-3.5" />
              Command Center
            </Button>
          </Link>
        </div>
      </div>

      {/* 5 Instant Test Sample Cards */}
      <div className="space-y-2.5">
        <div className="flex items-center justify-between">
          <span className="text-xs font-mono font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-cyan-400" /> 1-Click Test Samples (Pre-Bundled in Project):
          </span>
          <span className="text-[11px] font-mono text-zinc-500">Click any card to instantly load & test</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {SAMPLE_FILES.map((sample) => {
            const Icon = sample.icon;
            const isSelected = selectedSampleId === sample.id;
            return (
              <div
                key={sample.id}
                onClick={() => handleLoadSample(sample)}
                className={`group p-3 rounded-xl border transition-all cursor-pointer flex flex-col justify-between select-none relative overflow-hidden ${
                  isSelected
                    ? "ring-2 ring-cyan-400 border-cyan-400 bg-cyan-950/30 shadow-[0_0_15px_rgba(6,182,212,0.25)]"
                    : "bg-card/70 border-border hover:border-cyan-500/40 hover:bg-muted/40"
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <div className={`p-1.5 rounded-lg border ${sample.color}`}>
                      <Icon className="w-4 h-4" />
                    </div>
                    <Badge variant="outline" className="text-[9px] font-mono uppercase font-semibold">
                      {sample.tag}
                    </Badge>
                  </div>
                  <h4 className="font-bold text-xs text-foreground group-hover:text-cyan-300 transition-colors">
                    {sample.title}
                  </h4>
                  <p className="text-[11px] text-muted-foreground mt-1 line-clamp-2">
                    {sample.desc}
                  </p>
                </div>

                <div className="pt-2.5 mt-2 border-t border-border/50 flex items-center justify-between text-[10px] font-mono">
                  <span className="text-muted-foreground truncate">{sample.name}</span>
                  <span className="text-cyan-400 font-bold flex items-center gap-0.5 group-hover:translate-x-0.5 transition-transform">
                    Load <ArrowRight className="w-2.5 h-2.5" />
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Main Studio Grid: Upload Dropzone & Metadata Form */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Dropzone & Parameters Form */}
        <div className="lg:col-span-8 space-y-6">
          <Card className="border-border shadow-xl">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-bold flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <UploadCloud className="h-4 w-4 text-cyan-400" />
                  Ephemeris File Ingestion Dropzone
                </span>
                {file && (
                  <Badge className="bg-emerald-500/10 text-emerald-400 border-emerald-500/30 font-mono text-[10px]">
                    <Check className="w-3 h-3 mr-1" /> {file.name} ({(fileContent.length / 1024).toFixed(1)} KB)
                  </Badge>
                )}
              </CardTitle>
              <CardDescription className="text-xs">
                Accepts Two-Line Element sets (.tle, .txt), Space-Track catalog exports (.csv), and CCSDS Conjunction Data Messages (.json, .omm) up to 25MB.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              {/* Dropzone */}
              <div
                onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
                onDragLeave={() => setDragActive(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setDragActive(false);
                  if (e.dataTransfer.files?.[0]) handleFileSelect(e.dataTransfer.files[0]);
                }}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all relative ${
                  dragActive
                    ? "border-cyan-400 bg-cyan-950/20 shadow-[0_0_20px_rgba(6,182,212,0.2)]"
                    : "border-border hover:border-cyan-500/50 hover:bg-muted/30"
                }`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  className="hidden"
                  accept=".tle,.txt,.csv,.json,.omm,.xml"
                  onChange={(e) => {
                    if (e.target.files?.[0]) handleFileSelect(e.target.files[0]);
                  }}
                />
                <div className="flex flex-col items-center justify-center space-y-2">
                  <div className="p-3 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/30">
                    <FileText className="h-6 w-6" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-foreground">
                      {file ? file.name : "Drag & drop space ephemeris files here, or click to browse"}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Supports standard TLE / 3LE, Space-Track CSV, CelesTrak GP JSON, and CCSDS CDM formats
                    </p>
                  </div>
                  {fileContent && (
                    <div className="mt-2 text-[11px] font-mono text-emerald-400 bg-emerald-950/20 border border-emerald-500/30 px-2.5 py-0.5 rounded-full flex items-center gap-1">
                      <Check className="w-3 h-3" /> Ready to parse ({fileContent.split("\n").length} lines loaded)
                    </div>
                  )}
                </div>
              </div>

              {/* Raw Preview Snippet if loaded */}
              {fileContent && (
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-[11px] font-mono text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <FileCode className="w-3 h-3 text-cyan-400" /> Ephemeris Raw Stream Preview:
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        setFile(null);
                        setFileContent("");
                        setSelectedSampleId(null);
                        setLastResult(null);
                      }}
                      className="text-rose-400 hover:text-rose-300 flex items-center gap-1 cursor-pointer"
                    >
                      <Trash2 className="w-3 h-3" /> Clear Buffer
                    </button>
                  </div>
                  <pre className="p-3 bg-zinc-950 border border-zinc-800 rounded-lg text-[10px] font-mono text-zinc-300 max-h-28 overflow-y-auto leading-relaxed select-all">
                    {fileContent.slice(0, 800)}
                    {fileContent.length > 800 ? "\n... [truncated for display]" : ""}
                  </pre>
                </div>
              )}

              {/* Metadata Form */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Catalog Source / Batch ID</Label>
                  <Input 
                    value={formData.catalogSource} 
                    onChange={(e) => setFormData({ ...formData, catalogSource: e.target.value })} 
                    className="text-xs font-mono" 
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Target Orbital Shell</Label>
                  <Input 
                    value={formData.orbitalShell} 
                    onChange={(e) => setFormData({ ...formData, orbitalShell: e.target.value })} 
                    className="text-xs font-mono" 
                  />
                </div>
                <div className="space-y-1.5 sm:col-span-2">
                  <Label className="text-xs font-semibold">Ephemeris Standard & Propagation Engine</Label>
                  <Input 
                    value={formData.ephemerisFormat} 
                    onChange={(e) => setFormData({ ...formData, ephemerisFormat: e.target.value })} 
                    className="text-xs font-mono" 
                  />
                </div>
                <div className="space-y-1.5 sm:col-span-2">
                  <Label className="text-xs font-semibold">Screening Notes & Operator Directives</Label>
                  <Textarea 
                    value={formData.description} 
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })} 
                    className="text-xs font-mono h-16" 
                  />
                </div>
              </div>

              {/* Progress Stepper & Trigger */}
              {uploadStatus.stage !== "idle" && (
                <div className="space-y-2 p-4 rounded-xl bg-zinc-950 border border-zinc-800 font-mono text-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-foreground flex items-center gap-2">
                      {uploadStatus.stage === "completed" ? (
                        <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                      ) : uploadStatus.stage === "error" ? (
                        <ShieldAlert className="h-4 w-4 text-rose-400" />
                      ) : (
                        <Loader2 className="h-4 w-4 text-cyan-400 animate-spin" />
                      )}
                      {uploadStatus.message}
                    </span>
                    <span className="font-bold text-cyan-400">{uploadStatus.progress}%</span>
                  </div>
                  <Progress value={uploadStatus.progress} className="h-2 bg-zinc-800" />
                </div>
              )}

              <div className="flex items-center justify-between pt-2 border-t border-border/60">
                <span className="text-[11px] font-mono text-muted-foreground">
                  Engine: SGP4 v2.4 · WGS84 ECEF · J2 Perturbations
                </span>
                <Button 
                  onClick={handleStartIngestion}
                  disabled={!fileContent || isProcessing}
                  className="font-mono text-xs font-bold gap-2 bg-cyan-500 hover:bg-cyan-400 text-black px-5 py-2.5 rounded-lg shadow-md cursor-pointer"
                >
                  {isProcessing ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" /> Processing SGP4...
                    </>
                  ) : (
                    <>
                      <Cpu className="h-4 w-4" /> Execute Ingestion Pipeline
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Mathematical Architecture & Live Stats */}
        <div className="lg:col-span-4 space-y-6">
          {/* Active Live Mission Catalog Stats */}
          <Card className="border-border">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-bold flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <Database className="w-4 h-4 text-cyan-400" /> Live Orbit Catalog
                </span>
                <button
                  type="button"
                  onClick={refreshLiveStats}
                  className="text-zinc-400 hover:text-white p-1 rounded hover:bg-muted/50 transition-colors"
                  title="Refresh Live Telemetry"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                </button>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 font-mono text-xs">
              <div className="grid grid-cols-2 gap-2">
                <div className="p-3 bg-zinc-900/60 border border-zinc-800 rounded-lg">
                  <span className="text-[10px] text-zinc-400 block">TRACKED BODIES</span>
                  <span className="text-xl font-bold text-white mt-0.5 block">
                    {catalogSummary?.objectCount.toLocaleString() || "639"}
                  </span>
                </div>
                <div className="p-3 bg-zinc-900/60 border border-zinc-800 rounded-lg">
                  <span className="text-[10px] text-zinc-400 block">CONJUNCTIONS</span>
                  <span className="text-xl font-bold text-rose-400 mt-0.5 block">
                    {catalogSummary?.conjunctionCount || "30"}
                  </span>
                </div>
              </div>

              <div className="text-[10px] text-zinc-400 pt-1 flex justify-between items-center border-t border-border/50">
                <span>Last Synchronized:</span>
                <span className="text-zinc-300">
                  {catalogSummary ? new Date(catalogSummary.updatedAt).toLocaleTimeString() : "Live"}
                </span>
              </div>
            </CardContent>
          </Card>

          {/* SGP4 Ingestion Physics Equation Card */}
          <Card className="border-cyan-500/30 bg-zinc-950 shadow-lg">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-mono uppercase text-cyan-400 font-bold flex items-center gap-1.5">
                <Activity className="w-3.5 h-3.5" /> SGP4 Orbit Extraction Formulation
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2.5 text-xs">
              <p className="text-[11px] text-zinc-400 leading-relaxed font-sans">
                Converts Kozai mean Keplerian orbital elements from TLE lines into osculating Cartesian inertial position r(t) and velocity v(t):
              </p>

              <div className="p-2 rounded-lg bg-zinc-900/80 border border-zinc-800 text-center">
                <LatexMath
                  math="\mathbf{r}(t), \mathbf{v}(t) = \text{SGP4}\left(n_0, e_0, i_0, \Omega_0, \omega_0, M_0, B^*, t - t_0\right)"
                  displayMode={true}
                />
              </div>

              <div className="space-y-1 text-[10px] font-mono text-zinc-400">
                <div className="flex justify-between">
                  <span>Earth Geopotential Harmonics:</span>
                  <span className="text-zinc-200">J₂, J₃, J₄</span>
                </div>
                <div className="flex justify-between">
                  <span>Atmospheric Drag Parameter:</span>
                  <span className="text-cyan-400">B* (BSTAR)</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Quick Direct Link to Download Files */}
          <Card className="border-border bg-card/60">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-bold flex items-center gap-1.5">
                <Download className="w-3.5 h-3.5 text-primary" /> Direct Download Sample Files
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-1.5 font-mono text-[11px]">
              {SAMPLE_FILES.map((f) => (
                <a
                  key={f.id}
                  href={f.path}
                  download={f.name}
                  className="flex items-center justify-between p-2 rounded-lg bg-zinc-900/50 hover:bg-zinc-800/80 border border-border/70 hover:border-cyan-500/40 text-zinc-300 hover:text-white transition-all cursor-pointer group"
                >
                  <span className="truncate max-w-[180px]">{f.name}</span>
                  <span className="text-[10px] text-cyan-400 font-bold flex items-center gap-1">
                    Download <Download className="w-2.5 h-2.5" />
                  </span>
                </a>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Extracted Ingestion Results & Telemetry View */}
      {lastResult && lastResult.objects.length > 0 && (
        <Card className="border-cyan-500/40 bg-zinc-950 shadow-2xl animate-in slide-in-from-bottom-3 duration-300">
          <CardHeader className="pb-3 border-b border-zinc-800 bg-zinc-900/40">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <CardTitle className="text-lg font-bold text-white flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                  Ingestion Results: Batch #{lastResult.batchId}
                </CardTitle>
                <CardDescription className="text-xs font-mono text-zinc-400 mt-0.5">
                  Extracted {lastResult.validParsed} valid objects in {lastResult.durationMs}ms ({lastResult.formatDetected})
                </CardDescription>
              </div>

              {/* Shell Distribution Badges */}
              <div className="flex items-center gap-1.5 flex-wrap">
                {Object.entries(lastResult.shellDistribution).map(([shell, count]) => (
                  <Badge key={shell} variant="outline" className="font-mono text-[10px] bg-cyan-950/40 text-cyan-300 border-cyan-500/30">
                    {shell}: {count} objs
                  </Badge>
                ))}
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4 pt-4">
            {/* If CDM was injected, show alert header */}
            {lastResult.cdmSummary && (
              <div className="p-4 rounded-xl bg-rose-950/20 border border-rose-500/40 font-mono text-xs text-rose-200 flex flex-col md:flex-row items-start md:items-center justify-between gap-3 shadow-md">
                <div className="flex items-center gap-2.5">
                  <ShieldAlert className="w-5 h-5 text-rose-400 shrink-0 animate-pulse" />
                  <div>
                    <span className="font-bold text-white">Critical Conjunction Data Message Ingested:</span>
                    <span className="text-zinc-300 ml-1.5">
                      {lastResult.cdmSummary.primaryName} ↔ {lastResult.cdmSummary.secondaryName}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-3 text-[11px]">
                  <span className="px-2 py-0.5 rounded bg-rose-500/20 text-rose-300 border border-rose-500/30 font-bold">
                    Miss: {lastResult.cdmSummary.missDistanceMeters}m
                  </span>
                  <span className="px-2 py-0.5 rounded bg-rose-500/20 text-rose-300 border border-rose-500/30 font-bold">
                    Pc: {lastResult.cdmSummary.collisionProbability.toExponential(2)}
                  </span>
                  <Link href="/cases">
                    <Button size="sm" variant="outline" className="text-[10px] h-7 border-rose-500/50 text-rose-300 hover:bg-rose-500/20">
                      View Conjunction Dossier →
                    </Button>
                  </Link>
                </div>
              </div>
            )}

            {/* Search Filter for Extracted Table */}
            <div className="flex items-center justify-between gap-4">
              <div className="relative w-full max-w-xs">
                <Search className="w-3.5 h-3.5 text-zinc-500 absolute left-2.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Filter extracted satellites..."
                  value={searchFilter}
                  onChange={(e) => setSearchFilter(e.target.value)}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-lg pl-8 pr-3 py-1 text-xs text-zinc-200 outline-none focus:border-cyan-500/50 font-mono"
                />
              </div>

              <span className="text-xs font-mono text-zinc-400">
                Showing {filteredObjects.length} of {lastResult.objects.length} records
              </span>
            </div>

            {/* Extracted Satellites Table */}
            <div className="rounded-xl border border-zinc-800 overflow-hidden bg-zinc-950">
              <Table>
                <TableHeader className="bg-zinc-900/70 text-[11px] font-mono">
                  <TableRow className="border-zinc-800">
                    <TableHead className="text-zinc-400">NORAD ID</TableHead>
                    <TableHead className="text-zinc-400">Object Name</TableHead>
                    <TableHead className="text-zinc-400">Type</TableHead>
                    <TableHead className="text-zinc-400">Operator</TableHead>
                    <TableHead className="text-zinc-400">Altitude</TableHead>
                    <TableHead className="text-zinc-400">Inclination</TableHead>
                    <TableHead className="text-zinc-400">Period</TableHead>
                    <TableHead className="text-zinc-400">Shell</TableHead>
                    <TableHead className="text-zinc-400">SGP4 State [X, Y, Z] km</TableHead>
                    <TableHead className="text-zinc-400">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody className="text-xs font-mono">
                  {filteredObjects.map((obj) => (
                    <TableRow key={obj.id} className="border-zinc-800/60 hover:bg-zinc-900/40">
                      <TableCell className="font-bold text-cyan-400">#{obj.noradId}</TableCell>
                      <TableCell className="font-bold text-white">{obj.name}</TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={`text-[9px] uppercase ${
                            obj.type === "debris"
                              ? "text-rose-400 border-rose-500/30 bg-rose-950/20"
                              : "text-sky-400 border-sky-500/30 bg-sky-950/20"
                          }`}
                        >
                          {obj.type}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-zinc-300">{obj.operator}</TableCell>
                      <TableCell className="text-zinc-200">{obj.altitudeKm} km</TableCell>
                      <TableCell className="text-zinc-200">{obj.inclinationDeg}°</TableCell>
                      <TableCell className="text-zinc-200">{obj.periodMin}m</TableCell>
                      <TableCell>
                        <span className="text-[10px] text-cyan-300 bg-cyan-950/40 px-1.5 py-0.5 rounded border border-cyan-500/30">
                          {obj.shellId}
                        </span>
                      </TableCell>
                      <TableCell className="text-[10px] text-zinc-400 font-mono">
                        [{Math.round(obj.positionEci[0])}, {Math.round(obj.positionEci[1])}, {Math.round(obj.positionEci[2])}]
                      </TableCell>
                      <TableCell>
                        <span className="inline-flex items-center gap-1 text-[10px] text-emerald-400">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                          SYNCED
                        </span>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {/* Validation Logs Terminal */}
            <div className="space-y-1.5">
              <span className="text-[11px] font-mono text-zinc-400 uppercase font-bold flex items-center gap-1.5">
                <Terminal className="w-3.5 h-3.5 text-cyan-400" /> SGP4 Execution Audit Stream:
              </span>
              <div className="p-3 bg-black border border-zinc-800 rounded-xl font-mono text-[11px] text-zinc-300 space-y-1 max-h-32 overflow-y-auto">
                {lastResult.validationLogs.map((log, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <span className="text-zinc-600">&gt;</span>
                    <span className={log.includes("Warning") ? "text-amber-400" : log.includes("Error") ? "text-rose-400" : "text-emerald-300"}>
                      {log}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Ingestion History Table */}
      <Card className="border-border">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-bold flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Layers className="h-4 w-4 text-cyan-400" />
              Ingestion History & Compliance Audit Log
            </span>
            <span className="text-xs font-mono text-muted-foreground">
              {ingestionHistory.length} Batches Ingested This Session
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-xl border overflow-x-auto">
            <Table>
              <TableHeader className="bg-muted/50 text-[11px] font-mono">
                <TableRow>
                  <TableHead className="font-semibold">Batch ID</TableHead>
                  <TableHead className="font-semibold">Filename</TableHead>
                  <TableHead className="font-semibold">Catalog Standard</TableHead>
                  <TableHead className="font-semibold">Tracked Objects</TableHead>
                  <TableHead className="font-semibold">Timestamp</TableHead>
                  <TableHead className="font-semibold">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody className="text-xs font-mono">
                {ingestionHistory.length > 0 ? (
                  ingestionHistory.map((item) => (
                    <TableRow key={item.batchId} className="hover:bg-muted/40">
                      <TableCell className="font-bold text-cyan-400">{item.batchId}</TableCell>
                      <TableCell className="font-medium text-foreground">{item.filename}</TableCell>
                      <TableCell className="text-muted-foreground">{item.format}</TableCell>
                      <TableCell className="font-bold text-foreground">{item.objectCount} objects</TableCell>
                      <TableCell className="text-muted-foreground">{item.time}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-[10px] text-emerald-500 border-emerald-500/30 bg-emerald-500/10">
                          {item.status}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-6 text-xs text-muted-foreground">
                      No batch uploads processed yet this session. Click any 1-click test sample above to execute!
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
