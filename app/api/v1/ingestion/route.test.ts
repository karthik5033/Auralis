import { describe, it } from "node:test";
import assert from "node:assert";
import fs from "node:fs";
import path from "node:path";
import { POST } from "./route";
import { NextRequest } from "next/server";

describe("Data Ingestion Pipeline API & 5 Sample Test Files", () => {
  it("should parse Starlink 3LE batch file", async () => {
    const filePath = path.join(process.cwd(), "public/sample-data/starlink-batch-v3.tle");
    const content = fs.readFileSync(filePath, "utf-8");

    const req = new NextRequest("http://localhost:3000/api/v1/ingestion", {
      method: "POST",
      body: JSON.stringify({ content, filename: "starlink-batch-v3.tle" }),
      headers: { "Content-Type": "application/json" }
    });

    const res = await POST(req);
    const data = await res.json();

    assert.strictEqual(data.success, true);
    assert.strictEqual(data.formatDetected, "TLE_3LE");
    assert.strictEqual(data.validParsed, 6);
    assert.ok(data.objects.length === 6);
    assert.ok(data.objects[0].name.includes("STARLINK"));
  });

  it("should parse Iridium and Cosmos Debris 3LE batch file", async () => {
    const filePath = path.join(process.cwd(), "public/sample-data/iridium-cosmos-debris.tle");
    const content = fs.readFileSync(filePath, "utf-8");

    const req = new NextRequest("http://localhost:3000/api/v1/ingestion", {
      method: "POST",
      body: JSON.stringify({ content, filename: "iridium-cosmos-debris.tle" }),
      headers: { "Content-Type": "application/json" }
    });

    const res = await POST(req);
    const data = await res.json();

    assert.strictEqual(data.success, true);
    assert.strictEqual(data.formatDetected, "TLE_3LE");
    assert.strictEqual(data.validParsed, 5);
    assert.ok(data.objects.some((o: any) => o.type === "debris"));
  });

  it("should parse Space-Track CSV catalog extract", async () => {
    const filePath = path.join(process.cwd(), "public/sample-data/space-track-catalog-sample.csv");
    const content = fs.readFileSync(filePath, "utf-8");

    const req = new NextRequest("http://localhost:3000/api/v1/ingestion", {
      method: "POST",
      body: JSON.stringify({ content, filename: "space-track-catalog-sample.csv" }),
      headers: { "Content-Type": "application/json" }
    });

    const res = await POST(req);
    const data = await res.json();

    assert.strictEqual(data.success, true);
    assert.strictEqual(data.formatDetected, "SPACE_TRACK_CSV");
    assert.strictEqual(data.validParsed, 8);
    assert.ok(data.objects.length === 8);
  });

  it("should parse CCSDS Conjunction Data Message (CDM) JSON", async () => {
    const filePath = path.join(process.cwd(), "public/sample-data/conjunction-cdm-screening.json");
    const content = fs.readFileSync(filePath, "utf-8");

    const req = new NextRequest("http://localhost:3000/api/v1/ingestion", {
      method: "POST",
      body: JSON.stringify({ content, filename: "conjunction-cdm-screening.json" }),
      headers: { "Content-Type": "application/json" }
    });

    const res = await POST(req);
    const data = await res.json();

    assert.strictEqual(data.success, true);
    assert.strictEqual(data.formatDetected, "CCSDS_CDM_JSON");
    assert.strictEqual(data.validParsed, 2);
    assert.ok(data.cdmSummary !== undefined);
    assert.strictEqual(data.cdmSummary.primaryName, "STARLINK-3142");
    assert.strictEqual(data.cdmSummary.secondaryName, "COSMOS 2251 DEB");
  });

  it("should parse Space Stations and Active Constellations JSON", async () => {
    const filePath = path.join(process.cwd(), "public/sample-data/space-station-active-constellations.json");
    const content = fs.readFileSync(filePath, "utf-8");

    const req = new NextRequest("http://localhost:3000/api/v1/ingestion", {
      method: "POST",
      body: JSON.stringify({ content, filename: "space-station-active-constellations.json" }),
      headers: { "Content-Type": "application/json" }
    });

    const res = await POST(req);
    const data = await res.json();

    assert.strictEqual(data.success, true);
    assert.strictEqual(data.formatDetected, "CELESTRAK_GP_JSON");
    assert.strictEqual(data.validParsed, 5);
    assert.ok(data.objects.some((o: any) => o.name.includes("ISS")));
  });
});
