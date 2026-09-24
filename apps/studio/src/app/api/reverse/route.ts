import { auth } from "@clerk/nextjs/server";
import { get } from "@vercel/blob";
import { desc, eq } from "drizzle-orm";
import { getDb } from "@/db/client";
import { blueprints, projects, reverseImports } from "@/db/schema";
import { requireWorkspace } from "@/lib/workspace";
import { reverseAnalysisSchema } from "@/lib/reverse-contracts";
import { reverseAnalysisToBlueprint } from "@/lib/reverse-engine";

export async function GET(request: Request) {
  const { userId } = await auth();
  if (!userId) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const url = new URL(request.url);
  const id = url.searchParams.get("id");
  const workspaceId = url.searchParams.get("workspaceId");
  const db = getDb();

  if (id) {
    const [row] = await db.select().from(reverseImports).where(eq(reverseImports.id, id)).limit(1);
    if (!row) return Response.json({ error: "Import not found" }, { status: 404 });
    await requireWorkspace(row.workspaceId);
    return Response.json({ import: row });
  }

  if (!workspaceId) return Response.json({ error: "workspaceId is required" }, { status: 400 });
  await requireWorkspace(workspaceId);

  const rows = await db.select().from(reverseImports)
    .where(eq(reverseImports.workspaceId, workspaceId))
    .orderBy(desc(reverseImports.createdAt));

  return Response.json({ items: rows });
}

export async function POST(request: Request) {
  const { userId } = await auth();
  if (!userId) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const action = typeof body.action === "string" ? body.action : "create";
  const db = getDb();

  if (action === "create") {
    const workspaceId = typeof body.workspaceId === "string" ? body.workspaceId : "";
    const sourceKey = typeof body.sourceKey === "string" ? body.sourceKey : "";
    if (!workspaceId || !sourceKey) return Response.json({ error: "workspaceId and sourceKey are required" }, { status: 400 });
    await requireWorkspace(workspaceId);

    const [row] = await db.insert(reverseImports).values({
      workspaceId,
      sourceKey,
      sourceContentType: typeof body.sourceContentType === "string" ? body.sourceContentType : null,
      sourceFilename: typeof body.sourceFilename === "string" ? body.sourceFilename.slice(0, 240) : null,
    }).returning();

    return Response.json({ import: row }, { status: 201 });
  }

  if (action === "analyze") {
    const id = typeof body.id === "string" ? body.id : "";
    if (!id) return Response.json({ error: "id is required" }, { status: 400 });

    const [row] = await db.select().from(reverseImports).where(eq(reverseImports.id, id)).limit(1);
    if (!row) return Response.json({ error: "Import not found" }, { status: 404 });
    await requireWorkspace(row.workspaceId);

    const apiKey = process.env.COMET_API_KEY;
    if (!apiKey) {
      return Response.json({
        error: "COMET_API_KEY is not configured.",
        manualAvailable: true,
      }, { status: 412 });
    }

    let imageUrl = typeof body.imageUrl === "string" ? body.imageUrl : "";
    if (!imageUrl) {
      const stored = await get(row.sourceKey, { access: "private", useCache: false });
      if (!stored) return Response.json({ error: "Stored wreath image was not found." }, { status: 404 });
      const bytes = await new Response(stored.stream).arrayBuffer();
      const mime = stored.blob.contentType || row.sourceContentType || "image/jpeg";
      imageUrl = `data:${mime};base64,${Buffer.from(bytes).toString("base64")}`;
    }

    const prompt = [
      "Analyze this finished faux-botanical wreath for Evercrafted reverse engineering.",
      "Return ONLY valid JSON.",
      "Use clock mapping 12=0°, 3=90°, 6=180°, 9=270°.",
      "Infer visible composition only; hidden construction is uncertain.",
      "Choose formulaId from: crescent,double_echo,bottom_heavy,side_sweep,open_arc,full_halo,split_garden,focal_burst,laddered_rhythm,radial_burst,bow_anchor,inventory_salvage.",
      "Return {formulaId,confidence,summary,palette,observedMaterials,placements,notes}.",
      "Placement keys: materialName,role,clockPosition,angleDeg,radiusIn,widthIn,heightIn,rotationDeg,layer,quantity.",
      "Roles: greenery,focal,secondary,filler,accent,ribbon,decorative.",
      "Use premium faux-botanical terminology.",
    ].join("\n");

    const upstream = await fetch("https://api.cometapi.com/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "content-type": "application/json" },
      body: JSON.stringify({
        model: "kimi-k3",
        messages: [{ role: "user", content: [
          { type: "text", text: prompt },
          { type: "image_url", image_url: { url: imageUrl } },
        ]}],
        max_completion_tokens: 7000,
      }),
    });

    const payload = await upstream.json().catch(() => null);
    if (!upstream.ok) return Response.json({ error: "CometAPI vision analysis failed." }, { status: 502 });

    const content = payload?.choices?.[0]?.message?.content;
    if (typeof content !== "string") return Response.json({ error: "CometAPI returned no analysis." }, { status: 502 });

    const clean = content.trim().replace(/^```(?:json)?\s*/,"").replace(/\s*```$/,"");
    let raw: unknown;
    try {
      raw = JSON.parse(clean);
    } catch {
      return Response.json({ error: "Vision returned malformed JSON. Manual review is still available.", manualAvailable: true }, { status: 422 });
    }
    const parsed = reverseAnalysisSchema.safeParse(raw);
    if (!parsed.success) return Response.json({ error: "Vision analysis did not match the reverse-engineering contract.", issues: parsed.error.issues, manualAvailable: true }, { status: 422 });

    const proposedBlueprint = reverseAnalysisToBlueprint(parsed.data);
    const [updated] = await db.update(reverseImports).set({
      analysisStatus: "analyzed",
      analysis: parsed.data,
      proposedFormulaId: parsed.data.formulaId,
      proposedBlueprint,
      updatedAt: new Date(),
    }).where(eq(reverseImports.id, id)).returning();

    return Response.json({ import: updated });
  }

  if (action === "commit") {
    const id = typeof body.id === "string" ? body.id : "";
    const projectName = typeof body.projectName === "string" ? body.projectName.trim() : "Imported Wreath";
    if (!id) return Response.json({ error: "id is required" }, { status: 400 });

    const [row] = await db.select().from(reverseImports).where(eq(reverseImports.id, id)).limit(1);
    if (!row) return Response.json({ error: "Import not found" }, { status: 404 });
    await requireWorkspace(row.workspaceId);
    if (row.committedBlueprintId) return Response.json({ error: "Import already committed" }, { status: 409 });

    const proposal = row.proposedBlueprint as any;
    if (!proposal?.placements?.length) return Response.json({ error: "Review or map placements before committing." }, { status: 409 });

    const [project] = await db.insert(projects).values({
      workspaceId: row.workspaceId,
      ownerUserId: userId,
      name: projectName.slice(0, 140),
      startingMode: "existing_wreath",
      brief: typeof (row.analysis as any)?.summary === "string" ? (row.analysis as any).summary : "Reverse-engineered from an existing wreath image.",
      formulaId: row.proposedFormulaId ?? "crescent",
      formulaVersion: "1.0.0",
      compositionSpec: { reverseImportId: row.id },
    }).returning();

    const [blueprint] = await db.insert(blueprints).values({
      workspaceId: row.workspaceId,
      projectId: project.id,
      revision: 1,
      base: proposal.base ?? {},
      anchors: proposal.anchors ?? [],
      pockets: proposal.pockets ?? [],
      placements: proposal.placements ?? [],
      silenceArcs: proposal.silenceArcs ?? [],
      bowSpec: proposal.bowSpec ?? {},
      constraints: proposal.constraints ?? {},
      qualityResults: proposal.qualityResults ?? { status: "NEEDS_REVIEW" },
    }).returning();

    await db.update(projects).set({ currentBlueprintId: blueprint.id, updatedAt: new Date() }).where(eq(projects.id, project.id));
    await db.update(reverseImports).set({
      projectId: project.id,
      committedBlueprintId: blueprint.id,
      analysisStatus: "committed",
      updatedAt: new Date(),
    }).where(eq(reverseImports.id, row.id));

    return Response.json({ project, blueprint }, { status: 201 });
  }

  return Response.json({ error: "Unknown action" }, { status: 400 });
}

export async function PUT(request: Request) {
  const { userId } = await auth();
  if (!userId) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const id = typeof body.id === "string" ? body.id : "";
  if (!id) return Response.json({ error: "id is required" }, { status: 400 });

  const db = getDb();
  const [row] = await db.select().from(reverseImports).where(eq(reverseImports.id, id)).limit(1);
  if (!row) return Response.json({ error: "Import not found" }, { status: 404 });
  await requireWorkspace(row.workspaceId);

  const [updated] = await db.update(reverseImports).set({
    proposedFormulaId: typeof body.proposedFormulaId === "string" ? body.proposedFormulaId : row.proposedFormulaId,
    proposedBlueprint: body.proposedBlueprint ?? row.proposedBlueprint,
    analysis: body.analysis ?? row.analysis,
    analysisStatus: "reviewed",
    updatedAt: new Date(),
  }).where(eq(reverseImports.id, id)).returning();

  return Response.json({ import: updated });
}
