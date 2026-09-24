import { auth } from "@clerk/nextjs/server";
import { put } from "@vercel/blob";
import { randomUUID } from "node:crypto";
import { getDb } from "@/db/client";
import { reverseImports } from "@/db/schema";
import { requireWorkspace } from "@/lib/workspace";

const MAX_BYTES = 8 * 1024 * 1024;
const ALLOWED = new Set(["image/jpeg","image/png","image/webp"]);

export async function POST(request: Request) {
  const { userId } = await auth();
  if (!userId) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const url = new URL(request.url);
  const workspaceId = url.searchParams.get("workspaceId") || "";
  const filename = (url.searchParams.get("filename") || "wreath-image").slice(0, 240);
  const contentType = request.headers.get("content-type") || "";
  const contentLength = Number(request.headers.get("content-length") || 0);

  if (!workspaceId) return Response.json({ error: "workspaceId is required" }, { status: 400 });
  await requireWorkspace(workspaceId);

  if (!ALLOWED.has(contentType)) {
    return Response.json({ error: "Use a PNG, JPEG, or WebP image." }, { status: 415 });
  }
  if (contentLength && contentLength > MAX_BYTES) {
    return Response.json({ error: "Image is too large. Maximum size is 8 MB." }, { status: 413 });
  }
  if (!request.body) return Response.json({ error: "Image body is required." }, { status: 400 });

  const ext = contentType === "image/png" ? "png" : contentType === "image/webp" ? "webp" : "jpg";
  const pathname = `evercrafted/reverse/${workspaceId}/${randomUUID()}.${ext}`;

  const blob = await put(pathname, request.body, {
    access: "private",
    contentType,
  });

  const db = getDb();
  const [row] = await db.insert(reverseImports).values({
    workspaceId,
    sourceKey: blob.url,
    sourceContentType: contentType,
    sourceFilename: filename,
  }).returning();

  return Response.json({
    import: row,
    sourceUrl: `/api/reverse/source?id=${row.id}`,
  }, { status: 201 });
}
