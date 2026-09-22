import { auth } from "@clerk/nextjs/server";
import { and, desc, eq } from "drizzle-orm";
import { db } from "@/db/client";
import { projects, workspaceMembers } from "@/db/schema";
import { createProjectSchema } from "@/lib/contracts";

async function canAccessWorkspace(workspaceId: string, userId: string) {
  const [row] = await db
    .select({ id: workspaceMembers.id })
    .from(workspaceMembers)
    .where(and(eq(workspaceMembers.workspaceId, workspaceId), eq(workspaceMembers.userId, userId)))
    .limit(1);
  return Boolean(row);
}

export async function GET(request: Request) {
  const { userId } = await auth();
  if (!userId) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const workspaceId = new URL(request.url).searchParams.get("workspaceId");
  if (!workspaceId) return Response.json({ error: "workspaceId is required" }, { status: 400 });
  if (!(await canAccessWorkspace(workspaceId, userId))) return Response.json({ error: "Forbidden" }, { status: 403 });

  const rows = await db
    .select()
    .from(projects)
    .where(eq(projects.workspaceId, workspaceId))
    .orderBy(desc(projects.updatedAt));

  return Response.json({ projects: rows });
}

export async function POST(request: Request) {
  const { userId } = await auth();
  if (!userId) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = createProjectSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "Invalid project request", issues: parsed.error.issues }, { status: 400 });
  if (!(await canAccessWorkspace(parsed.data.workspaceId, userId))) return Response.json({ error: "Forbidden" }, { status: 403 });

  const [project] = await db.insert(projects).values({
    workspaceId: parsed.data.workspaceId,
    ownerUserId: userId,
    name: parsed.data.name,
    startingMode: parsed.data.startingMode,
    brief: parsed.data.brief,
  }).returning();

  return Response.json({ project }, { status: 201 });
}
