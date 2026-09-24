import { auth } from "@clerk/nextjs/server";
import { desc, eq } from "drizzle-orm";
import { getDb } from "@/db/client";
import { blueprints, materials, productPackages, projects } from "@/db/schema";
import { requireWorkspace } from "@/lib/workspace";
import { buildSellerPackage } from "@/lib/product-engine";

function toCamelPlacement(p: any) {
  return {
    materialId: p.material_id ?? p.materialId ?? null,
    quantity: Number(p.quantity ?? 1),
  };
}

export async function GET(request: Request) {
  const { userId } = await auth();
  if (!userId) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const projectId = new URL(request.url).searchParams.get("projectId");
  if (!projectId) return Response.json({ error: "projectId is required" }, { status: 400 });

  const db = getDb();
  const [project] = await db.select().from(projects).where(eq(projects.id, projectId)).limit(1);
  if (!project) return Response.json({ error: "Project not found" }, { status: 404 });
  await requireWorkspace(project.workspaceId);

  const [pkg] = await db.select().from(productPackages)
    .where(eq(productPackages.projectId, projectId))
    .orderBy(desc(productPackages.updatedAt))
    .limit(1);

  return Response.json({ package: pkg ?? null });
}

export async function POST(request: Request) {
  const { userId } = await auth();
  if (!userId) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const projectId = typeof body.projectId === "string" ? body.projectId : "";
  if (!projectId) return Response.json({ error: "projectId is required" }, { status: 400 });

  const db = getDb();
  const [project] = await db.select().from(projects).where(eq(projects.id, projectId)).limit(1);
  if (!project) return Response.json({ error: "Project not found" }, { status: 404 });
  await requireWorkspace(project.workspaceId);

  const [blueprint] = await db.select().from(blueprints)
    .where(eq(blueprints.projectId, projectId))
    .orderBy(desc(blueprints.revision))
    .limit(1);
  if (!blueprint) return Response.json({ error: "Generate a blueprint first." }, { status: 409 });

  const materialRows = await db.select().from(materials).where(eq(materials.workspaceId, project.workspaceId));
  const result = buildSellerPackage({
    projectName: project.name,
    projectBrief: project.brief,
    formulaId: project.formulaId,
    diameterIn: Number((blueprint.base as any)?.diameter_in ?? 24),
    placements: Array.isArray(blueprint.placements) ? (blueprint.placements as any[]).map(toCamelPlacement) : [],
    materials: materialRows.map(m => ({
      id: m.id,
      sku: m.sku,
      name: m.name,
      role: m.role,
      color: m.color,
      unitCost: m.unitCost,
      seasonTags: m.seasonTags,
    })),
    laborMinutes: Number(body.laborMinutes ?? 90),
    laborRateHour: Number(body.laborRateHour ?? 20),
    packagingCost: Number(body.packagingCost ?? 8),
    platformFeePct: Number(body.platformFeePct ?? 10),
    targetMarginPct: Number(body.targetMarginPct ?? 60),
  });

  const [pkg] = await db.insert(productPackages).values({
    workspaceId: project.workspaceId,
    projectId,
    blueprintId: blueprint.id,
    materialCost: String(result.materialCost),
    laborMinutes: result.pricingInputs.laborMinutes,
    laborRateHour: String(result.pricingInputs.laborRateHour),
    packagingCost: String(result.pricingInputs.packagingCost),
    platformFeePct: String(result.pricingInputs.platformFeePct),
    targetMarginPct: String(result.pricingInputs.targetMarginPct),
    suggestedPrice: String(result.suggestedPrice),
    listingTitle: result.listingTitle,
    listingDescription: result.listingDescription,
    listingTags: result.listingTags,
    materialSummary: result.materialSummary,
    dimensions: result.dimensions,
  }).returning();

  return Response.json({ package: pkg, calculation: result }, { status: 201 });
}

export async function PUT(request: Request) {
  const { userId } = await auth();
  if (!userId) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const id = typeof body.id === "string" ? body.id : "";
  if (!id) return Response.json({ error: "id is required" }, { status: 400 });

  const db = getDb();
  const [existing] = await db.select().from(productPackages).where(eq(productPackages.id, id)).limit(1);
  if (!existing) return Response.json({ error: "Seller package not found" }, { status: 404 });
  await requireWorkspace(existing.workspaceId);

  const [pkg] = await db.update(productPackages).set({
    laborMinutes: Number(body.laborMinutes ?? existing.laborMinutes),
    laborRateHour: String(body.laborRateHour ?? existing.laborRateHour),
    packagingCost: String(body.packagingCost ?? existing.packagingCost),
    platformFeePct: String(body.platformFeePct ?? existing.platformFeePct),
    targetMarginPct: String(body.targetMarginPct ?? existing.targetMarginPct),
    suggestedPrice: String(body.suggestedPrice ?? existing.suggestedPrice),
    listingTitle: typeof body.listingTitle === "string" ? body.listingTitle.slice(0, 140) : existing.listingTitle,
    listingDescription: typeof body.listingDescription === "string" ? body.listingDescription.slice(0, 12000) : existing.listingDescription,
    listingTags: Array.isArray(body.listingTags) ? body.listingTags.slice(0, 13) : existing.listingTags,
    status: typeof body.status === "string" ? body.status : existing.status,
    updatedAt: new Date(),
  }).where(eq(productPackages.id, id)).returning();

  return Response.json({ package: pkg });
}
