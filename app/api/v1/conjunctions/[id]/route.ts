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
  const primaryObject = resolveObject(conjunction.primaryObjectId);
  const secondaryObject = resolveObject(conjunction.secondaryObjectId);
  if (!primaryObject || !secondaryObject) {
    return Response.json({ error: "Conjunction participants are not available in the current telemetry catalog", conjunctionId: id }, { status: 404 });
  }
  return Response.json({ conjunction, primaryObject, secondaryObject });
}