import { and, eq, type SQL } from "drizzle-orm";

/**
 * Tenant safety helper.
 * Every workspace-owned read/update/delete must include workspace_id.
 */
export function tenantWhere<TColumn>(
  workspaceColumn: TColumn,
  workspaceId: string,
  extra?: SQL,
) {
  const tenant = eq(workspaceColumn as never, workspaceId);
  return extra ? and(tenant, extra) : tenant;
}
