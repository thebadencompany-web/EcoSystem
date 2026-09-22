import { auth } from "@clerk/nextjs/server";
import { desc, eq } from "drizzle-orm";
import { getDb } from "@/db/client";
import { projects, workspaceMembers, workspaces } from "@/db/schema";
import StudioClient from "./studio-client";

export default async function StudioPage() {
  const { userId } = await auth();
  if (!userId) return null;

  const db = getDb();
  const memberships = await db
    .select({ workspace: workspaces, membership: workspaceMembers })
    .from(workspaceMembers)
    .innerJoin(workspaces, eq(workspaceMembers.workspaceId, workspaces.id))
    .where(eq(workspaceMembers.userId, userId));

  const workspace = memberships[0]?.workspace ?? null;
  const projectRows = workspace
    ? await db.select().from(projects).where(eq(projects.workspaceId, workspace.id)).orderBy(desc(projects.updatedAt)).limit(12)
    : [];

  return <StudioClient workspace={workspace} initialProjects={projectRows} />;
}
