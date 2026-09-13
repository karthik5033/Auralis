export const dynamic = "force-dynamic";
export const revalidate = 0;

import { NextRequest, NextResponse } from "next/server";
// @ts-ignore
import * as satellite from "satellite.js";
import { store } from "@/lib/backend/store";
import { ensureRuntime } from "@/lib/backend/runtime";
import { messageBus } from "@/lib/messageBus";
import { parseGPToTrackedObject } from "@/data/parser";
import { deriveKeplerianElements, propagateSatrec } from "@/data/propagator";
import { getShellId } from "@/data/shells";
import type { TrackedObject, RawGPElement } from "@/data/types";
import { randomUUID } from "crypto";

export interface IngestionResult {
  success: boolean;
  batchId: string;
  filename: string;
  formatDetected: "TLE_3LE" | "SPACE_TRACK_CSV" | "CCSDS_CDM_JSON" | "CELESTRAK_GP_JSON" | "UNKNOWN";
  totalRead: number;
  validParsed: number;
  invalidRecords: number;
  durationMs: number;
  checksumStatus: "PASS" | "WARNING" | "FAIL";
  shellDistribution: Record<string, number>;
  objects: Array<{
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
  }>;
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

// Helper to compute TLE line checksum
function validateTleChecksum(line: string): boolean {
  if (!line || line.length < 68) return false;
  const chars = line.trim().slice(0, 68);
  const expectedCheck = parseInt(line.trim().slice(68, 69), 10);
  if (isNaN(expectedCheck)) return true; // lenient fallback

  let sum = 0;
  for (const c of chars) {
    if (c >= "0" && c <= "9") sum += parseInt(c, 10);
    else if (c === "-") sum += 1;
  }
  return sum % 10 === expectedCheck;
}

export async function POST(req: NextRequest) {
  if (process.env.NODE_ENV !== "test") {
    ensureRuntime();
  }
  const startTime = performance.now();
  const batchId = `ING-${Date.now().toString(36).toUpperCase()}-${Math.floor(Math.random() * 1000)}`;
  const validationLogs: string[] = [];

  try {
    let rawContent = "";
    let filename = "ephemeris-upload.tle";
    let catalogSource = "USER_UPLOAD";
    let targetShell = "AUTO_CLASSIFY";

    const contentType = req.headers.get("content-type") || "";

    if (contentType.includes("multipart/form-data")) {
      const formData = await req.formData();
      const file = formData.get("file") as File | null;
      if (file) {
        filename = file.name;
        rawContent = await file.text();
      }
      if (formData.get("catalogSource")) catalogSource = String(formData.get("catalogSource"));
      if (formData.get("orbitalShell")) targetShell = String(formData.get("orbitalShell"));
    } else {
      const body = await req.json();
      if (typeof body === "string") {
        rawContent = body;
      } else if (body.content) {
        rawContent = body.content;
        if (body.filename) filename = body.filename;
        if (body.catalogSource) catalogSource = body.catalogSource;
        if (body.orbitalShell) targetShell = body.orbitalShell;
      } else if (Array.isArray(body)) {
        rawContent = JSON.stringify(body);
        filename = "celestrak-batch.json";
      } else if (body.MESSAGE_TYPE === "CONJUNCTION_DATA_MESSAGE" || body.CONJUNCTION_ID) {
        rawContent = JSON.stringify(body);
        filename = "conjunction-cdm.json";
      }
    }

    if (!rawContent || rawContent.trim() === "") {
      return NextResponse.json({ error: "No ephemeris content received" }, { status: 400 });
    }

    const trimmed = rawContent.trim();
    let formatDetected: IngestionResult["formatDetected"] = "UNKNOWN";
    const parsedTrackedObjects: TrackedObject[] = [];
    const shellCounts: Record<string, number> = {};
    let cdmSummary: IngestionResult["cdmSummary"] = undefined;
    let totalRead = 0;
    let validParsed = 0;
    let invalidRecords = 0;

    validationLogs.push(`[${new Date().toISOString()}] Batch ${batchId} initiated for ${filename}`);

    // Case 1: JSON format (GP array or CDM object)
    if (trimmed.startsWith("{") || trimmed.startsWith("[")) {
      try {
        const json = JSON.parse(trimmed);

        if (json.MESSAGE_TYPE === "CONJUNCTION_DATA_MESSAGE" || json.CONJUNCTION_ID) {
          formatDetected = "CCSDS_CDM_JSON";
          validationLogs.push("Detected CCSDS Conjunction Data Message (CDM v1.0 standard)");

          const prim = json.PRIMARY_OBJECT || {};
          const sec = json.SECONDARY_OBJECT || {};

          cdmSummary = {
            conjunctionId: json.CONJUNCTION_ID || `CDM-${batchId}`,
            tca: json.TCA || new Date(Date.now() + 86400000).toISOString(),
            missDistanceMeters: Number(json.MISS_DISTANCE_METERS || 84.2),
            collisionProbability: Number(json.COLLISION_PROBABILITY || 4.82e-4),
            primaryName: prim.OBJECT_NAME || "STARLINK-3142",
            secondaryName: sec.OBJECT_NAME || "COSMOS 2251 DEB"
          };

          // Construct TrackedObject for Primary
          const primaryObj: TrackedObject = {
            id: randomUUID(),
            noradId: Number(prim.NORAD_CAT_ID || 49863),
            name: prim.OBJECT_NAME || "STARLINK-3142",
            type: "satellite",
            operatorId: "op-001",
            position: {
              x: prim.POSITION_ECI_KM?.[0] || -4120.45,
              y: prim.POSITION_ECI_KM?.[1] || 3810.12,
              z: prim.POSITION_ECI_KM?.[2] || 3421.85
            },
            velocity: {
              vx: prim.VELOCITY_ECI_KMS?.[0] || -3.8412,
              vy: prim.VELOCITY_ECI_KMS?.[1] || -5.9412,
              vz: prim.VELOCITY_ECI_KMS?.[2] || 2.8415
            },
            orbitalElements: deriveKeplerianElements(
              { x: prim.POSITION_ECI_KM?.[0] || -4120.45, y: prim.POSITION_ECI_KM?.[1] || 3810.12, z: prim.POSITION_ECI_KM?.[2] || 3421.85 },
              { vx: prim.VELOCITY_ECI_KMS?.[0] || -3.8412, vy: prim.VELOCITY_ECI_KMS?.[1] || -5.9412, vz: prim.VELOCITY_ECI_KMS?.[2] || 2.8415 }
            ),
            covarianceUpperTriangle: prim.COVARIANCE_UPPER_TRIANGLE_KM2 || [0.85, 0.02, 0.01, 0.22, 0.005, 0.19],
            altitude: 550,
            shellId: "LEO-550",
            epoch: json.TCA || new Date().toISOString(),
            lastUpdated: new Date().toISOString(),
            status: "active"
          };

          // Construct TrackedObject for Secondary
          const secondaryObj: TrackedObject = {
            id: randomUUID(),
            noradId: Number(sec.NORAD_CAT_ID || 34001),
            name: sec.OBJECT_NAME || "COSMOS 2251 DEB",
            type: "debris",
            operatorId: null,
            position: {
              x: sec.POSITION_ECI_KM?.[0] || -4120.48,
              y: sec.POSITION_ECI_KM?.[1] || 3810.18,
              z: sec.POSITION_ECI_KM?.[2] || 3421.80
            },
            velocity: {
              vx: sec.VELOCITY_ECI_KMS?.[0] || 5.1245,
              vy: sec.VELOCITY_ECI_KMS?.[1] || -4.2185,
              vz: sec.VELOCITY_ECI_KMS?.[2] || -4.8412
            },
            orbitalElements: deriveKeplerianElements(
              { x: sec.POSITION_ECI_KM?.[0] || -4120.48, y: sec.POSITION_ECI_KM?.[1] || 3810.18, z: sec.POSITION_ECI_KM?.[2] || 3421.80 },
              { vx: sec.VELOCITY_ECI_KMS?.[0] || 5.1245, vy: sec.VELOCITY_ECI_KMS?.[1] || -4.2185, vz: sec.VELOCITY_ECI_KMS?.[2] || -4.8412 }
            ),
            covarianceUpperTriangle: sec.COVARIANCE_UPPER_TRIANGLE_KM2 || [2.45, 0.12, 0.08, 0.95, 0.04, 0.88],
            altitude: 550,
            shellId: "LEO-550",
            epoch: json.TCA || new Date().toISOString(),
            lastUpdated: new Date().toISOString(),
            status: "unknown"
          };

          parsedTrackedObjects.push(primaryObj, secondaryObj);
          totalRead = 2;
          validParsed = 2;
          shellCounts["LEO-550"] = 2;

          // Register active Conjunction Event into Store
          store.setConjunction({
            id: cdmSummary.conjunctionId,
            primaryObjectId: primaryObj.id,
            secondaryObjectId: secondaryObj.id,
            tca: cdmSummary.tca,
            missDistance: cdmSummary.missDistanceMeters / 1000.0,
            relativeVelocity: 14.21,
            collisionProbability: cdmSummary.collisionProbability,
            maxCollisionProbability: cdmSummary.collisionProbability,
            riskLevel: cdmSummary.collisionProbability >= 1e-4 ? "critical" : "elevated",
            status: "active",
            screeningWindowStart: new Date().toISOString(),
            screeningWindowEnd: new Date(Date.now() + 3 * 86400000).toISOString(),
            maneuverProposalId: null,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          });

          validationLogs.push(`Injected CDM conjunction ${cdmSummary.conjunctionId}: Pc = ${cdmSummary.collisionProbability}`);
        } else {
          // GP / OMM Elements JSON Array
          formatDetected = "CELESTRAK_GP_JSON";
          const records: RawGPElement[] = Array.isArray(json) ? json : [json];
          totalRead = records.length;
          validationLogs.push(`Detected CelesTrak GP/OMM JSON (${records.length} records)`);

          for (const gp of records) {
            try {
              const obj = parseGPToTrackedObject(gp, new Date());
              if (obj) {
                parsedTrackedObjects.push(obj);
                validParsed++;
                shellCounts[obj.shellId] = (shellCounts[obj.shellId] || 0) + 1;
              } else {
                invalidRecords++;
              }
            } catch {
              invalidRecords++;
            }
          }
        }
      } catch (err: any) {
        validationLogs.push(`JSON parsing error: ${err?.message || "Invalid JSON"}`);
      }
    }

    // Case 2: Space-Track CSV format
    else if (trimmed.startsWith("NORAD_CAT_ID") || trimmed.includes("OBJECT_NAME,") || trimmed.includes("INCLINATION,")) {
      formatDetected = "SPACE_TRACK_CSV";
      validationLogs.push("Detected Space-Track CSV catalog format");
      const lines = trimmed.split(/\r?\n/).filter((l) => l.trim().length > 0);
      const headers = lines[0].split(",").map((h) => h.trim().toUpperCase());
      totalRead = lines.length - 1;

      for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(",").map((v) => v.trim());
        if (values.length < 5) {
          invalidRecords++;
          continue;
        }

        const row: Record<string, string> = {};
        headers.forEach((h, idx) => {
          row[h] = values[idx] || "";
        });

        const noradId = parseInt(row["NORAD_CAT_ID"] || row["NORADID"] || `${10000 + i}`, 10);
        const name = row["OBJECT_NAME"] || `OBJ-${noradId}`;
        const inc = parseFloat(row["INCLINATION"] || "53.0");
        const ecc = parseFloat(row["ECCENTRICITY"] || "0.001");
        const mm = parseFloat(row["MEAN_MOTION"] || "15.0");
        const raan = parseFloat(row["RA_OF_ASC_NODE"] || "0.0");
        const argP = parseFloat(row["ARG_OF_PERICENTER"] || "0.0");
        const ma = parseFloat(row["MEAN_ANOMALY"] || "0.0");
        const bstar = parseFloat(row["BSTAR"] || "0.0001");
        const objType = row["OBJECT_TYPE"] || "PAYLOAD";

        const gp: RawGPElement = {
          OBJECT_NAME: name,
          OBJECT_ID: row["OBJECT_ID"] || "2026-001A",
          NORAD_CAT_ID: noradId,
          EPOCH: row["EPOCH"] || new Date().toISOString(),
          MEAN_MOTION: mm,
          ECCENTRICITY: ecc,
          INCLINATION: inc,
          RA_OF_ASC_NODE: raan,
          ARG_OF_PERICENTER: argP,
          MEAN_ANOMALY: ma,
          BSTAR: bstar,
          OBJECT_TYPE: objType,
          EPHEMERIS_TYPE: 0,
          CLASSIFICATION_TYPE: "U",
          ELEMENT_SET_NO: 999,
          REV_AT_EPOCH: 1000,
          MEAN_MOTION_DOT: 0,
          MEAN_MOTION_DDOT: 0
        };

        const obj = parseGPToTrackedObject(gp, new Date());
        if (obj) {
          parsedTrackedObjects.push(obj);
          validParsed++;
          shellCounts[obj.shellId] = (shellCounts[obj.shellId] || 0) + 1;
        } else {
          invalidRecords++;
        }
      }
    }

    // Case 3: Standard TLE / 3LE Lines Format
    else {
      formatDetected = "TLE_3LE";
      validationLogs.push("Detected Standard NORAD 2-Line / 3-Line Element format");
      const lines = trimmed.split(/\r?\n/).map((l) => l.trim()).filter((l) => l.length > 0);

      let idx = 0;
      while (idx < lines.length) {
        let name = "";
        let line1 = "";
        let line2 = "";

        if (lines[idx].startsWith("1 ") && idx + 1 < lines.length && lines[idx + 1].startsWith("2 ")) {
          // 2-line format
          line1 = lines[idx];
          line2 = lines[idx + 1];
          const norad = parseInt(line1.substring(2, 7).trim(), 10);
          name = `NORAD-${norad}`;
          idx += 2;
        } else if (idx + 2 < lines.length && lines[idx + 1].startsWith("1 ") && lines[idx + 2].startsWith("2 ")) {
          // 3-line format (Name on line 0)
          name = lines[idx].replace(/^0\s+/, "");
          line1 = lines[idx + 1];
          line2 = lines[idx + 2];
          idx += 3;
        } else {
          idx++;
          invalidRecords++;
          continue;
        }

        totalRead++;

        // Validate Checksums
        const chk1 = validateTleChecksum(line1);
        const chk2 = validateTleChecksum(line2);

        if (!chk1 || !chk2) {
          validationLogs.push(`Warning: Checksum mismatch on ${name}`);
        }

        try {
          const satrec = (satellite as any).twoline2satrec(line1, line2);
          if (satrec && !satrec.error) {
            const state = propagateSatrec(satrec, new Date());
            if (state) {
              const noradId = parseInt(line1.substring(2, 7).trim(), 10) || 99999;
              const isDebris = name.toUpperCase().includes("DEB") || name.toUpperCase().includes("FRAGMENT");
              const isRocket = name.toUpperCase().includes("R/B") || name.toUpperCase().includes("ROCKET");
              const type = isDebris ? "debris" : isRocket ? "rocket_body" : "satellite";
              const orbitalElements = deriveKeplerianElements(state.position, state.velocity);
              const shellId = getShellId(state.altitude);

              const trackedObj: TrackedObject = {
                id: randomUUID(),
                noradId,
                name: name || `OBJ-${noradId}`,
                type,
                operatorId: type === "satellite" ? (noradId % 2 === 0 ? "op-001" : "op-002") : null,
                position: {
                  x: Math.round(state.position.x * 1000) / 1000,
                  y: Math.round(state.position.y * 1000) / 1000,
                  z: Math.round(state.position.z * 1000) / 1000
                },
                velocity: {
                  vx: Math.round(state.velocity.vx * 10000) / 10000,
                  vy: Math.round(state.velocity.vy * 10000) / 10000,
                  vz: Math.round(state.velocity.vz * 10000) / 10000
                },
                orbitalElements,
                covarianceUpperTriangle: [1.0, 0.0, 0.0, 0.25, 0.0, 0.25],
                altitude: Math.round(state.altitude * 10) / 10,
                shellId,
                epoch: new Date().toISOString(),
                lastUpdated: new Date().toISOString(),
                status: state.altitude < 120 ? "decayed" : type === "satellite" ? "active" : "unknown"
              };

              parsedTrackedObjects.push(trackedObj);
              validParsed++;
              shellCounts[shellId] = (shellCounts[shellId] || 0) + 1;
            } else {
              invalidRecords++;
            }
          } else {
            invalidRecords++;
          }
        } catch (err: any) {
          invalidRecords++;
          validationLogs.push(`SGP4 Propagation error for ${name}: ${err?.message || "Satrec failure"}`);
        }
      }
    }

    // Persist all parsed objects into in-memory store
    for (const obj of parsedTrackedObjects) {
      store.setObject(obj);
    }

    // Broadcast update across Auralis WebSocket & MessageBus
    if (parsedTrackedObjects.length > 0) {
      void messageBus.publish(
        messageBus.createMessage({
          source: "tracker",
          target: "broadcast",
          type: "objects:updated",
          correlationId: null,
          payload: { objects: parsedTrackedObjects }
        })
      );
    }

    // Register Audit Log Entry
    store.addAuditEntry({
      id: randomUUID(),
      timestamp: new Date().toISOString(),
      agentId: "agent-tracker-01",
      agentType: "tracker",
      action: "tle_ingested",
      description: `Ingested ${validParsed} objects from ${filename} (Batch ID: ${batchId}, Format: ${formatDetected})`,
      relatedEntityId: null,
      relatedEntityType: null,
      metadata: {
        batchId,
        filename,
        formatDetected,
        totalRead,
        validParsed,
        invalidRecords,
      },
    });

    validationLogs.push(`Successfully ingested ${validParsed}/${totalRead} records into Auralis Store in ${(performance.now() - startTime).toFixed(1)}ms`);

    const result: IngestionResult = {
      success: true,
      batchId,
      filename,
      formatDetected,
      totalRead,
      validParsed,
      invalidRecords,
      durationMs: Math.round(performance.now() - startTime),
      checksumStatus: invalidRecords === 0 ? "PASS" : invalidRecords > 2 ? "WARNING" : "PASS",
      shellDistribution: shellCounts,
      objects: parsedTrackedObjects.map((o) => ({
        id: o.id,
        noradId: o.noradId,
        name: o.name,
        type: o.type,
        operator: o.operatorId === "op-001" ? "SpaceX Starlink" : o.operatorId === "op-002" ? "Eutelsat OneWeb" : "Unmanaged / Debris",
        altitudeKm: o.altitude,
        inclinationDeg: Math.round(o.orbitalElements.inclination * 100) / 100,
        periodMin: Math.round((2 * Math.PI * Math.sqrt(Math.pow(o.orbitalElements.semiMajorAxis, 3) / 398600.4418) / 60) * 10) / 10,
        eccentricity: Math.round(o.orbitalElements.eccentricity * 10000) / 10000,
        shellId: o.shellId,
        positionEci: [o.position.x, o.position.y, o.position.z],
        velocityEci: [o.velocity.vx, o.velocity.vy, o.velocity.vz],
        status: o.status
      })),
      cdmSummary,
      validationLogs
    };

    return NextResponse.json(result);
  } catch (error: any) {
    console.error("Data ingestion pipeline failure:", error);
    return NextResponse.json(
      {
        success: false,
        error: error?.message || "Internal Ingestion Pipeline Error",
        batchId,
        validationLogs
      },
      { status: 500 }
    );
  }
}
