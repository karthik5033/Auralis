import { ensureRuntime } from "@/lib/backend/runtime";
import { store } from "@/lib/backend/store";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<Response> {
  ensureRuntime();
  const { id } = await params;
  const object = store.getObject(id);
  if (!object) {
    return Response.json({ error: "Object not found", objectId: id }, { status: 404 });
  }
  return Response.json(object);
}