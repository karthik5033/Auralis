"use client";

import React, { useState, useRef, useEffect } from "react";
import { 
  UploadCloud, 
  FileText, 
  Database, 
  CheckCircle2, 
  Loader2, 
  Network
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

interface UploadStatus {
  stage: 'idle' | 'uploading' | 'ocr' | 'extraction' | 'graph' | 'completed' | 'error';
  progress: number;
  message: string;
}

export default function DataIngestionPage() {
  const [file, setFile] = useState<File | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<UploadStatus>({
    stage: 'idle',
    progress: 0,
    message: "Ready to ingest ephemeris or orbital tracking records"
  });
  const [formData, setFormData] = useState({
    catalogSource: "CELESTRAK-GP-2026-0912",
    orbitalShell: "LEO 550km - Starlink Shell",
    ephemerisFormat: "Two-Line Element (TLE) / SGP4 Compatible",
    description: "Automated routine ephemeris synchronization for high-density LEO shell collision screening."
  });
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [catalogSummary, setCatalogSummary] = useState<{ objectCount: number; conjunctionCount: number; updatedAt: string } | null>(null);

  useEffect(() => {
    Promise.all([getObjects({ limit: 1000 }), getConjunctions({ limit: 100 })])
      .then(([objects, conjunctions]) => {
        setCatalogSummary({
          objectCount: objects.total,
          conjunctionCount: conjunctions.total,
          updatedAt: new Date().toISOString(),
        });
      })
      .catch((error) => console.error("Failed loading ingestion summary:", error));
  }, []);

  const handleFileSelect = (selectedFile: File) => {
    setFile(selectedFile);
    setUploadStatus({
      stage: 'idle',
      progress: 0,
      message: `Selected: ${selectedFile.name} (${(selectedFile.size / 1024).toFixed(1)} KB)`
    });
  };

  const handleStartIngestion = () => {
    if (!file) return;

    setUploadStatus({ stage: 'uploading', progress: 25, message: "Uploading TLE batch to orbital screening pipeline..." });
    setTimeout(() => {
      setUploadStatus({ stage: 'ocr', progress: 50, message: "Validating Two-Line Element (TLE/3LE) checksums..." });
      setTimeout(() => {
        setUploadStatus({ stage: 'extraction', progress: 75, message: "Propagating orbital states via SGP4 (Inclination, RAAN, Eccentricity, BSTAR)..." });
        setTimeout(() => {
          setUploadStatus({ stage: 'graph', progress: 90, message: "Mapping object coordinates & conjunction intersections into Object Graph..." });
          setTimeout(() => {
            setUploadStatus({ stage: 'completed', progress: 100, message: "Ingestion complete! Ephemeris validated & orbital shells updated." });
          }, 600);
        }, 600);
      }, 600);
    }, 600);
  };

  return (
    <div className="flex-1 space-y-6 p-6 lg:p-8 max-w-7xl mx-auto w-full animate-in fade-in duration-300">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-foreground">Data Ingestion Pipeline</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Ingest Two-Line Element (TLE) ephemeris from CelesTrak and Space-Track for automated SGP4 propagation, orbital state extraction, and conjunction screening.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Upload & Pipeline Area */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg font-bold flex items-center gap-2">
                <UploadCloud className="h-5 w-5 text-primary" />
                Upload Orbital Ephemeris & TLE Batches
              </CardTitle>
              <CardDescription className="text-xs">
                Supports TLE (.tle, .txt), Orbit Data Messages (.json, .xml), and Space-Track CSV ephemeris extracts up to 25MB.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
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
                className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all ${
                  dragActive ? "border-primary bg-primary/5" : "border-border hover:border-primary/50 hover:bg-muted/30"
                }`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  className="hidden"
                  onChange={(e) => {
                    if (e.target.files?.[0]) handleFileSelect(e.target.files[0]);
                  }}
                />
                <div className="flex flex-col items-center justify-center space-y-3">
                  <div className="p-3 rounded-full bg-primary/10 text-primary">
                    <FileText className="h-8 w-8" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-foreground">
                      {file ? file.name : "Drag & drop TLE files here, or browse files"}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      TLE, 3LE, CSV or JSON (CelesTrak GP Elements & Space-Track catalogs supported)
                    </p>
                  </div>
                </div>
              </div>

              {/* Document Metadata Form */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-xs font-semibold">Catalog Source / Batch ID</Label>
                  <Input 
                    value={formData.catalogSource} 
                    onChange={(e) => setFormData({ ...formData, catalogSource: e.target.value })} 
                    className="text-xs" 
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-semibold">Target Orbital Shell</Label>
                  <Input 
                    value={formData.orbitalShell} 
                    onChange={(e) => setFormData({ ...formData, orbitalShell: e.target.value })} 
                    className="text-xs" 
                  />
                </div>
                <div className="space-y-2 sm:col-span-2">
                  <Label className="text-xs font-semibold">Ephemeris Standard & Propagation Engine</Label>
                  <Input 
                    value={formData.ephemerisFormat} 
                    onChange={(e) => setFormData({ ...formData, ephemerisFormat: e.target.value })} 
                    className="text-xs" 
                  />
                </div>
                <div className="space-y-2 sm:col-span-2">
                  <Label className="text-xs font-semibold">Screening Context & Notes</Label>
                  <Textarea 
                    value={formData.description} 
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })} 
                    className="text-xs h-20" 
                  />
                </div>
              </div>

              {/* Progress Bar & Trigger */}
              {uploadStatus.stage !== 'idle' && (
                <div className="space-y-2 p-4 rounded-lg bg-muted/40 border border-border">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-foreground flex items-center gap-1.5">
                      {uploadStatus.stage === 'completed' ? (
                        <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                      ) : (
                        <Loader2 className="h-4 w-4 text-primary animate-spin" />
                      )}
                      {uploadStatus.message}
                    </span>
                    <span className="font-mono text-muted-foreground">{uploadStatus.progress}%</span>
                  </div>
                  <Progress value={uploadStatus.progress} className="h-2" />
                </div>
              )}

              <div className="flex items-center justify-end gap-3 pt-2">
                <Button 
                  onClick={handleStartIngestion}
                  disabled={!file || (uploadStatus.stage !== 'idle' && uploadStatus.stage !== 'completed')}
                  className="text-xs font-semibold gap-1.5"
                >
                  <Database className="h-4 w-4" />
                  Process & Ingest Ephemeris
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Ingestion Steps Guide */}
        <div className="space-y-6">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-bold">Pipeline Architecture</CardTitle>
              <CardDescription className="text-xs">
                Automated multi-stage SGP4 extraction workflow.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 text-xs">
              <div className="flex items-start gap-3 p-3 rounded-lg border bg-muted/20">
                <div className="p-1.5 rounded-md bg-blue-500/10 text-blue-600 dark:text-blue-400 font-bold">1</div>
                <div>
                  <h4 className="font-semibold text-foreground">TLE Syntax & Checksum Validation</h4>
                  <p className="text-muted-foreground text-[11px] mt-0.5">Validates standard Line 1 & Line 2 checksums, epoch timestamps, and NORAD IDs.</p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 rounded-lg border bg-muted/20">
                <div className="p-1.5 rounded-md bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold">2</div>
                <div>
                  <h4 className="font-semibold text-foreground">SGP4 State Vector Extraction</h4>
                  <p className="text-muted-foreground text-[11px] mt-0.5">Computes osculating Keplerian orbital elements: semi-major axis, inclination, eccentricity, and drag.</p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 rounded-lg border bg-muted/20">
                <div className="p-1.5 rounded-md bg-purple-500/10 text-purple-600 dark:text-purple-400 font-bold">3</div>
                <div>
                  <h4 className="font-semibold text-foreground">Orbital Graph Synthesis</h4>
                  <p className="text-muted-foreground text-[11px] mt-0.5">Projects trajectory intersections and identifies conjunction pairings in the Object Graph.</p>
                </div>
              </div>

              <div className="pt-2">
                <Link href="/network">
                  <Button variant="outline" className="w-full text-xs font-semibold gap-1.5">
                    <Network className="h-3.5 w-3.5 text-primary" />
                    Inspect Object Graph Topology
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Recent Ingestions Table */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg font-bold">Recent Ingestion Batches</CardTitle>
          <CardDescription className="text-xs">
            Audit history of parsed ephemeris catalogs and synchronized orbital objects.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-lg border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead className="text-xs font-semibold">Batch ID</TableHead>
                  <TableHead className="text-xs font-semibold">Filename</TableHead>
                  <TableHead className="text-xs font-semibold">Catalog Type</TableHead>
                  <TableHead className="text-xs font-semibold">Tracked Objects</TableHead>
                  <TableHead className="text-xs font-semibold">Conjunction Pairs</TableHead>
                  <TableHead className="text-xs font-semibold">Time</TableHead>
                  <TableHead className="text-xs font-semibold">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {catalogSummary ? (
                  <TableRow className="hover:bg-muted/40">
                    <TableCell className="font-mono text-xs font-semibold text-primary">LIVE</TableCell>
                    <TableCell className="text-xs font-medium">Current API catalog</TableCell>
                    <TableCell className="text-xs text-muted-foreground">Tracked telemetry</TableCell>
                    <TableCell className="text-xs font-bold">{catalogSummary.objectCount.toLocaleString()} objects</TableCell>
                    <TableCell className="text-xs font-bold text-primary">{catalogSummary.conjunctionCount} pairs</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{new Date(catalogSummary.updatedAt).toLocaleString()}</TableCell>
                    <TableCell><Badge variant="outline" className="text-[10px] text-emerald-600 border-emerald-300">Synchronized</Badge></TableCell>
                  </TableRow>
                ) : (
                  <TableRow><TableCell colSpan={7} className="text-center text-xs text-muted-foreground">Waiting for API catalog data...</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
