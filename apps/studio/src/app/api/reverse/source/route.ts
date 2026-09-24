import { auth } from "@clerk/nextjs/server";
import { get } from "@vercel/blob";
import { eq } from "drizzle-orm";
import { getDb } from "@/db/client";
import { reverseImports } from "@/db/schema";
import { requireWorkspace } from "@/lib/workspace";

export async function GET(request: Request) {
  const { userId } = await auth();
  if (!userId) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const id = new URL(request.url).searchParams.get("id") || "";
  if (!id) return Response.json({ error: "id is required" }, { status: 400 });

  const db = getDb();
  const [row] = await db.select().from(reverseImports).where(eq(reverseImports.id, id)).limit(1);
  if (!row) return Response.json({ error: "Import not found" }, { status: 404 });
  await requireWorkspace(row.workspaceId);

  const result = await get(row.sourceKey, { access: "private", useCache: false });
  if (!result) return Response.json({ error: "Source image not found" }, { status: 404 });

  return new Response(result.stream, {
    headers: {
      "content-type": result.blob.contentType || row.sourceContentType || "application/octet-stream",
      "cache-control": "private, no-store",
    },
  });
}
