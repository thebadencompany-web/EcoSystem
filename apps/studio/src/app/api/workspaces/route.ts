import { auth, currentUser } from "@clerk/nextjs/server";
import { eq } from "drizzle-orm";
import { getDb } from "@/db/client";
import { workspaceMembers, workspaces } from "@/db/schema";

export async function GET() {
  const { userId } = await auth();
  if (!userId) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const db = getDb();
  const rows = await db
    .select({ workspace: workspaces, membership: workspaceMembers })
    .from(workspaceMembers)
    .innerJoin(workspaces, eq(workspaceMembers.workspaceId, workspaces.id))
    .where(eq(workspaceMembers.userId, userId));

  return Response.json({ workspaces: rows });
}

export async function POST(request: Request) {
  const { userId } = await auth();
  if (!userId) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const db = getDb();
  const body = await request.json().catch(() => ({}));
  const user = await currentUser();
  const requestedName = typeof body.name === "string" ? body.name.trim() : "";
  const fallbackName = user?.firstName ? `${user.firstName}'s Studio` : "My Evercrafted Studio";
  const name = requestedName || fallbackName;

  const [workspace] = await db.insert(workspaces).values({
    name,
    ownerUserId: userId,
  }).returning();

  await db.insert(workspaceMembers).values({
    workspaceId: workspace.id,
    userId,
    role: "owner",
  });

  return Response.json({ workspace }, { status: 201 });
}
