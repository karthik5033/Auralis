export const dynamic = "force-dynamic";
export const revalidate = 0;

export function GET(): Response {
  return Response.json({
    status: "ok",
    timestamp: new Date().toISOString(),
    persistenceEnabled: process.env.AURALIS_PERSISTENCE === "true",
    authenticationEnabled: Boolean(process.env.AURALIS_API_KEY),
  });
}