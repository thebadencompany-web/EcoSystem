export type SellerMaterial = {
  id: string;
  sku: string;
  name: string;
  role?: string | null;
  color?: string | null;
  unitCost?: string | number | null;
  seasonTags?: unknown;
};

export type SellerPlacement = {
  materialId?: string | null;
  quantity?: number;
};

export function buildSellerPackage(args: {
  projectName: string;
  projectBrief?: string | null;
  formulaId?: string | null;
  diameterIn?: number;
  placements: SellerPlacement[];
  materials: SellerMaterial[];
  laborMinutes?: number;
  laborRateHour?: number;
  packagingCost?: number;
  platformFeePct?: number;
  targetMarginPct?: number;
}) {
  const round2=(n:number)=>Math.round(n*100)/100;
  const byId=new Map(args.materials.map(m=>[m.id,m]));
  const counts=new Map<string,number>();

  for(const p of args.placements){
    if(!p.materialId) continue;
    counts.set(p.materialId,(counts.get(p.materialId)||0)+(p.quantity||1));
  }

  const materialSummary=[...counts.entries()].map(([id,quantity])=>{
    const m=byId.get(id);
    const unitCost=Number(m?.unitCost||0);
    return {
      materialId:id,
      sku:m?.sku||"",
      name:m?.name||"Unknown material",
      role:m?.role||"",
      color:m?.color||"",
      quantity,
      unitCost:round2(unitCost),
      extendedCost:round2(unitCost*quantity),
    };
  });

  const materialCost=round2(materialSummary.reduce((sum,x)=>sum+x.extendedCost,0));
  const laborMinutes=args.laborMinutes ?? 90;
  const laborRateHour=args.laborRateHour ?? 20;
  const packagingCost=args.packagingCost ?? 8;
  const platformFeePct=args.platformFeePct ?? 10;
  const targetMarginPct=args.targetMarginPct ?? 60;
  const laborCost=round2((laborMinutes/60)*laborRateHour);
  const directCost=round2(materialCost+laborCost+packagingCost);
  const denominator=Math.max(.1,1-(platformFeePct/100)-(targetMarginPct/100));
  const suggestedPrice=round2(directCost/denominator);

  const formula=(args.formulaId||"asymmetric").replaceAll("_"," ");
  const colors=[...new Set(materialSummary.map(x=>x.color).filter(Boolean))].slice(0,4);
  const hero=materialSummary.filter(x=>x.role==="focal").map(x=>x.name).slice(0,2);
  const listingTitle=[colors.join(" "),formula,"faux wreath",hero.join(" ")].filter(Boolean).join(" · ").slice(0,140);

  const keyMaterials=[...materialSummary].sort((a,b)=>b.quantity-a.quantity).slice(0,6).map(x=>x.name);
  const diameterIn=args.diameterIn ?? 24;
  const listingDescription=[
    args.projectName,
    "",
    `A handcrafted ${diameterIn}-inch premium faux-botanical wreath built from a measured Evercrafted ${formula} composition.`,
    args.projectBrief||"",
    "",
    "Design details:",
    "• Premium faux florals and botanicals",
    "• Grapevine base with intentional visible texture",
    `• ${formula} composition with preserved negative space`,
    colors.length?`• Palette: ${colors.join(", ")}`:"",
    keyMaterials.length?`• Featured materials: ${keyMaterials.join(", ")}`:"",
    "",
    "Made with high-quality artificial botanicals for long-term seasonal display.",
    "",
    `Approximate finished diameter: ${diameterIn} inches. Handmade placement may vary slightly while preserving the approved blueprint.`,
  ].filter(Boolean).join("\n");

  const listingTags=[...new Set([
    "faux floral wreath","front door wreath","luxury wreath","grapevine wreath",`${formula} wreath`,
    ...colors.map(c=>`${c} wreath`),...hero.map(h=>h.toLowerCase())
  ])].map(x=>x.slice(0,20)).slice(0,13);

  return {
    materialCost,laborCost,directCost,suggestedPrice,
    materialSummary,listingTitle,listingDescription,listingTags,
    dimensions:{diameterIn},
    pricingInputs:{laborMinutes,laborRateHour,packagingCost,platformFeePct,targetMarginPct},
  };
}
