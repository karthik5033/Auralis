export const dynamic = "force-dynamic";
export const revalidate = 0;

import { store } from "@/lib/backend/store";
import { ensureRuntime } from "@/lib/backend/runtime";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<Response> {
  ensureRuntime();
  const { id } = await params;
  const conjunction = store.getConjunction(id);
  if (!conjunction) {
    return Response.json({ error: "Conjunction not found", conjunctionId: id }, { status: 404 });
  }

  const resolveObject = (reference: string) => {
    const direct = store.getObject(reference);
    if (direct) return direct;
    if (!reference.startsWith("norad-")) return undefined;
    const noradId = Number(reference.slice(6));
    return store.listObjects().find((object) => object.noradId === noradId);
  };
  const createFallbackObject = (reference: string) => {
    const noradId = reference.startsWith("norad-") ? Number(reference.slice(6)) : undefined;
    const obj = {
      id: reference,
      noradId: noradId ?? 99999,
      name: noradId ? `OBJECT ${noradId}` : reference,
      type: "satellite" as const,
      status: "active" as const,
      operatorId: null,
      position: { x: 0, y: 0, z: 0 },
      velocity: { vx: 0, vy: 0, vz: 0 },
      orbitalElements: {
        semiMajorAxis: 7000,
        eccentricity: 0.001,
        inclination: 53.0,
        raan: 0,
        argOfPerigee: 0,
        meanAnomaly: 0,
      },
      covarianceUpperTriangle: [1, 0, 0, 1, 0, 1] as [number, number, number, number, number, number],
      altitude: 600,
      shellId: "LEO_600_650",
      epoch: new Date().toISOString(),
      lastUpdated: new Date().toISOString(),
    };
    store.setObject(obj);
    return obj;
  };

  const primaryObject = resolveObject(conjunction.primaryObjectId) ?? createFallbackObject(conjunction.primaryObjectId);
  const secondaryObject = resolveObject(conjunction.secondaryObjectId) ?? createFallbackObject(conjunction.secondaryObjectId);

  return Response.json({ conjunction, primaryObject, secondaryObject });
}