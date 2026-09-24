import { and, eq, type SQL } from "drizzle-orm";
import type { AnyPgColumn } from "drizzle-orm/pg-core";

/**
 * Tenant safety helper.
 * Every workspace-owned read/update/delete must include workspace_id.
 */
export function tenantWhere(
  workspaceColumn: AnyPgColumn,
  workspaceId: string,
  extra?: SQL,
) {
  const tenant = eq(workspaceColumn, workspaceId);
  return extra ? and(tenant, extra) : tenant;
}
