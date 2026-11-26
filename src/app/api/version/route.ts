import { connection } from "next/server";

/** The version that is deployed right now (compared by the client's update checker). */
export async function GET() {
  await connection();
  return Response.json(
    { version: process.env.APP_VERSION ?? "dev", builtAt: process.env.APP_BUILT_AT ?? null },
    { headers: { "Cache-Control": "no-store, max-age=0" } },
  );
}
