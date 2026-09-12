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

  const primaryObject = store.getObject(conjunction.primaryObjectId);
  const secondaryObject = store.getObject(conjunction.secondaryObjectId);
  if (!primaryObject || !secondaryObject) {
    return Response.json({ error: "Conjunction objects not found", conjunctionId: id }, { status: 409 });
  }
  return Response.json({ conjunction, primaryObject, secondaryObject });
}