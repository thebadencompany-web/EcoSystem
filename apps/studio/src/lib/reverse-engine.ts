import type { z } from "zod";
import { reverseAnalysisSchema } from "./reverse-contracts";

type ReverseAnalysisInput=z.infer<typeof reverseAnalysisSchema>;

export function normalizeReverseAnalysis(input: ReverseAnalysisInput){
  return {
    ...input,
    placements:input.placements.map((p,index)=>{
      const rad=(p.angleDeg-90)*Math.PI/180;
      return {
        placementId:`r${String(index+1).padStart(3,"0")}`,
        materialId:null,
        materialName:p.materialName,
        role:p.role,
        clockPosition:p.clockPosition,
        angleDeg:p.angleDeg,
        radiusIn:p.radiusIn,
        xIn:Number((p.radiusIn*Math.cos(rad)).toFixed(2)),
        yIn:Number((-p.radiusIn*Math.sin(rad)).toFixed(2)),
        widthIn:p.widthIn,
        heightIn:p.heightIn,
        rotationDeg:p.rotationDeg,
        layer:p.layer,
        zOrder:index+1,
        quantity:p.quantity,
      };
    }),
  };
}

export function reverseAnalysisToBlueprint(input: ReverseAnalysisInput){
  const normalized=normalizeReverseAnalysis(input);
  return {
    schemaVersion:"evercrafted.blueprint/1.0" as const,
    base:{diameter_in:24,type:"grapevine",center_clearance_in:6},
    anchors:[],
    pockets:normalized.placements.filter(p=>p.role==="focal"||p.role==="secondary").map(p=>({
      placement_id:p.placementId,clock_position:p.clockPosition,angle_deg:p.angleDeg,radius_in:p.radiusIn,
    })),
    placements:normalized.placements,
    silenceArcs:[],
    bowSpec:{required:normalized.placements.some(p=>p.role==="ribbon")},
    constraints:{
      reverse_engineered:true,
      formula_id:normalized.formulaId,
      formula_version:"1.0.0",
      source_confidence:normalized.confidence,
    },
    qualityResults:{
      status:"NEEDS_REVIEW",
      issues:["Reverse-engineered placements require human approval before production."],
    },
  };
}
