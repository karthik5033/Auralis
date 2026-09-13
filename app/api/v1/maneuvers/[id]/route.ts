export const dynamic = "force-dynamic";
export const revalidate = 0;

import { ensureRuntime } from "@/lib/backend/runtime";
import { store } from "@/lib/backend/store";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<Response> {
  ensureRuntime();
  const { id } = await params;
  const maneuver = store.getManeuver(id);
  return maneuver
    ? Response.json(maneuver)
    : Response.json({ error: "Maneuver not found", maneuverId: id }, { status: 404 });
}