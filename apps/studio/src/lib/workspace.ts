import { auth } from "@clerk/nextjs/server";
import { and, eq } from "drizzle-orm";
import { getDb } from "@/db/client";
import { workspaceMembers } from "@/db/schema";

export async function requireWorkspace(workspaceId: string) {
  const { userId } = await auth();
  if (!userId) throw new Error("UNAUTHORIZED");

  const db = getDb();
  const [membership] = await db
    .select()
    .from(workspaceMembers)
    .where(and(
      eq(workspaceMembers.workspaceId, workspaceId),
      eq(workspaceMembers.userId, userId),
    ))
    .limit(1);

  if (!membership) throw new Error("FORBIDDEN");
  return { userId, membership };
}
