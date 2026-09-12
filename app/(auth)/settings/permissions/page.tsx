"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

const PERMISSION_MATRIX = [
  { feature: "View Command Center & Orbital Radar", operator: true, flightLead: true, missionDirector: true, admin: true },
  { feature: "Access Global Tracked Objects & TLE Ingestion", operator: true, flightLead: true, missionDirector: true, admin: true },
  { feature: "Interactive Object Graph Exploration", operator: true, flightLead: true, missionDirector: true, admin: true },
  { feature: "AI Orbital Advisory Copilot Queries", operator: true, flightLead: true, missionDirector: true, admin: true },
  { feature: "Delta-V & Maneuver Fuel Ledger Auditing", operator: false, flightLead: true, missionDirector: true, admin: true },
  { feature: "Authorize Autonomous Maneuver Yields", operator: false, flightLead: true, missionDirector: true, admin: true },
  { feature: "Sign Off Cryptographic Audit Ledger Blocks", operator: false, flightLead: false, missionDirector: true, admin: true },
  { feature: "Constellation Safety Policies & Parameter Provisioning", operator: false, flightLead: false, missionDirector: false, admin: true },
];

export default function PermissionsPage() {
  const router = useRouter();

  return (
    <div className="flex-1 space-y-6 p-6 lg:p-8 max-w-5xl mx-auto w-full animate-in fade-in duration-300">
      <div className="flex items-center gap-3">
        <Button variant="outline" size="icon" onClick={() => router.back()} className="h-8 w-8">
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Role-Based Permissions Matrix</h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Clearance hierarchy across Auralis mission operations and astrodynamics governance roles.
          </p>
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead className="text-xs font-semibold">Capability / Operation</TableHead>
                <TableHead className="text-xs font-semibold text-center">Operator</TableHead>
                <TableHead className="text-xs font-semibold text-center">Flight Dynamics Lead</TableHead>
                <TableHead className="text-xs font-semibold text-center">Mission Director</TableHead>
                <TableHead className="text-xs font-semibold text-center">Admin</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {PERMISSION_MATRIX.map((row, idx) => (
                <TableRow key={idx}>
                  <TableCell className="text-xs font-medium text-foreground">
                    {row.feature}
                  </TableCell>
                  <TableCell className="text-center">
                    {row.operator ? <Check className="h-4 w-4 text-emerald-500 mx-auto" /> : <X className="h-4 w-4 text-muted-foreground/40 mx-auto" />}
                  </TableCell>
                  <TableCell className="text-center">
                    {row.flightLead ? <Check className="h-4 w-4 text-emerald-500 mx-auto" /> : <X className="h-4 w-4 text-muted-foreground/40 mx-auto" />}
                  </TableCell>
                  <TableCell className="text-center">
                    {row.missionDirector ? <Check className="h-4 w-4 text-emerald-500 mx-auto" /> : <X className="h-4 w-4 text-muted-foreground/40 mx-auto" />}
                  </TableCell>
                  <TableCell className="text-center">
                    {row.admin ? <Check className="h-4 w-4 text-emerald-500 mx-auto" /> : <X className="h-4 w-4 text-muted-foreground/40 mx-auto" />}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
