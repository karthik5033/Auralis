import * as fs from 'fs';
import * as path from 'path';
import { loadCuratedCatalog } from '../data/celestrak';
import { parseGPToTrackedObject } from '../data/parser';
import type { TrackedObject } from '../data/types';

const rawGPs = loadCuratedCatalog();
console.log(`Loaded ${rawGPs.length} raw GP elements from CelesTrak curated catalog.`);

const now = new Date('2026-09-12T12:00:00Z');
const parsedObjects: TrackedObject[] = [];

for (const gp of rawGPs) {
  try {
    const obj = parseGPToTrackedObject(gp, now);
    if (obj && isFinite(obj.position.x) && isFinite(obj.altitude)) {
      parsedObjects.push(obj);
    }
  } catch (err) {
    // skip unparseable
  }
}

console.log(`Successfully parsed ${parsedObjects.length} valid TrackedObjects.`);

// Ensure our core demo objects (ISS, COSMOS 2251, STARLINK-31042, etc.) are present
const iss = parsedObjects.find(o => o.noradId === 25544);
if (iss) {
  // Give it the canonical UUID from INTERFACE_CONTRACT.md §3.1
  iss.id = "a1b2c3d4-5678-9abc-def0-111111111111";
  iss.operatorId = "op-001";
}

const cosmos = parsedObjects.find(o => o.noradId === 34454 || o.name.includes('COSMOS 2251'));
if (cosmos) {
  cosmos.id = "b2c3d4e5-6789-abcd-ef01-222222222222";
  cosmos.type = "debris";
} else {
  // ensure cosmos is added
  parsedObjects.push({
    id: "b2c3d4e5-6789-abcd-ef01-222222222222",
    noradId: 34454,
    name: "COSMOS 2251 DEB",
    type: "debris",
    operatorId: null,
    position: { x: -2354.38, y: 4872.55, z: 3940.85 },
    velocity: { vx: -7.142, vy: 2.115, vz: -1.042 },
    orbitalElements: {
      semiMajorAxis: 6796.2,
      eccentricity: 0.0024,
      inclination: 74.0,
      raan: 112.4,
      argOfPerigee: 88.7,
      meanAnomaly: 215.3,
    },
    covarianceUpperTriangle: [3.2, 0.1, 0.2, 2.8, 0.3, 3.0],
    altitude: 418.2,
    shellId: "LEO_400_450",
    epoch: "2026-09-12T12:00:00Z",
    lastUpdated: "2026-09-12T13:00:00Z",
    status: "active",
  });
}

// Mark a couple objects as maneuvering for demo realism
parsedObjects.slice(5, 7).forEach(o => {
  o.status = "maneuvering";
});

const outputPath = path.join(process.cwd(), 'data', 'fixtures', 'parsed-tracked-objects.json');
fs.writeFileSync(outputPath, JSON.stringify(parsedObjects, null, 2));
console.log(`Wrote ${parsedObjects.length} TrackedObjects to ${outputPath}`);
