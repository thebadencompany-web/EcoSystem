export type FormulaSpec = {
  formulaId: string;
  version: string;
  label: string;
  flowDirection: "clockwise" | "counterclockwise" | "radial" | "mixed";
  anchors: Array<{ role: string; clock: string; strength: number }>;
  silenceArcs: Array<{ from: string; to: string }>;
  focalRegions: Array<{ from: string; to: string }>;
  roleRatios: Record<string, number>;
  constraints: Record<string, number | string | boolean>;
};

export const FORMULAS: FormulaSpec[] = [
  { formulaId:"crescent",version:"1.0.0",label:"Crescent",flowDirection:"counterclockwise",anchors:[{role:"hero",clock:"8:00",strength:1}],silenceArcs:[{from:"12:30",to:"3:30"}],focalRegions:[{from:"7:00",to:"9:30"}],roleRatios:{greenery:0.55,focal:0.15,secondary:0.15,accent:0.10,ribbon:0.05},constraints:{preserveOpenCenter:true}},
  { formulaId:"double_echo",version:"1.0.0",label:"Double Echo",flowDirection:"mixed",anchors:[{role:"hero",clock:"8:00",strength:1},{role:"echo",clock:"2:00",strength:0.45}],silenceArcs:[{from:"10:30",to:"12:30"},{from:"3:30",to:"5:30"}],focalRegions:[{from:"7:00",to:"9:00"}],roleRatios:{greenery:0.50,focal:0.15,secondary:0.15,accent:0.15,ribbon:0.05},constraints:{echoMustRemainSubordinate:true}},
  { formulaId:"bottom_heavy",version:"1.0.0",label:"Bottom Heavy",flowDirection:"mixed",anchors:[{role:"hero",clock:"6:30",strength:1}],silenceArcs:[{from:"10:30",to:"1:30"}],focalRegions:[{from:"5:00",to:"8:00"}],roleRatios:{greenery:0.52,focal:0.18,secondary:0.15,accent:0.10,ribbon:0.05},constraints:{upperArcLight:true}},
  { formulaId:"side_sweep",version:"1.0.0",label:"Side Sweep",flowDirection:"clockwise",anchors:[{role:"hero",clock:"4:30",strength:1}],silenceArcs:[{from:"8:30",to:"11:30"}],focalRegions:[{from:"3:00",to:"6:00"}],roleRatios:{greenery:0.58,focal:0.14,secondary:0.14,accent:0.09,ribbon:0.05},constraints:{directionalSweep:true}},
  { formulaId:"open_arc",version:"1.0.0",label:"Open Arc",flowDirection:"counterclockwise",anchors:[{role:"hero",clock:"9:00",strength:1}],silenceArcs:[{from:"1:30",to:"5:30"}],focalRegions:[{from:"7:30",to:"10:30"}],roleRatios:{greenery:0.50,focal:0.16,secondary:0.14,accent:0.12,ribbon:0.08},constraints:{largeSilenceArc:true}},
  { formulaId:"full_halo",version:"1.0.0",label:"Full Halo",flowDirection:"radial",anchors:[{role:"hero",clock:"7:30",strength:0.65}],silenceArcs:[],focalRegions:[{from:"6:30",to:"9:00"}],roleRatios:{greenery:0.62,focal:0.10,secondary:0.10,accent:0.13,ribbon:0.05},constraints:{continuousCoverage:true}},
  { formulaId:"split_garden",version:"1.0.0",label:"Split Garden",flowDirection:"mixed",anchors:[{role:"hero",clock:"8:00",strength:1},{role:"secondary",clock:"2:30",strength:0.6}],silenceArcs:[{from:"11:30",to:"1:00"},{from:"4:00",to:"6:00"}],focalRegions:[{from:"7:00",to:"9:00"}],roleRatios:{greenery:0.52,focal:0.14,secondary:0.18,accent:0.11,ribbon:0.05},constraints:{separateMasses:true}},
  { formulaId:"focal_burst",version:"1.0.0",label:"Focal Burst",flowDirection:"radial",anchors:[{role:"hero",clock:"8:00",strength:1}],silenceArcs:[{from:"12:00",to:"4:30"}],focalRegions:[{from:"7:00",to:"9:00"}],roleRatios:{greenery:0.45,focal:0.25,secondary:0.15,accent:0.10,ribbon:0.05},constraints:{heroDominant:true}},
  { formulaId:"laddered_rhythm",version:"1.0.0",label:"Laddered Rhythm",flowDirection:"clockwise",anchors:[{role:"hero",clock:"8:30",strength:1},{role:"secondary",clock:"10:30",strength:0.65}],silenceArcs:[{from:"1:00",to:"5:00"}],focalRegions:[{from:"7:30",to:"11:00"}],roleRatios:{greenery:0.54,focal:0.14,secondary:0.17,accent:0.10,ribbon:0.05},constraints:{steppedHierarchy:true}},
  { formulaId:"radial_burst",version:"1.0.0",label:"Radial Burst",flowDirection:"radial",anchors:[{role:"hero",clock:"7:30",strength:1}],silenceArcs:[{from:"12:30",to:"3:30"}],focalRegions:[{from:"6:30",to:"9:00"}],roleRatios:{greenery:0.55,focal:0.16,secondary:0.14,accent:0.10,ribbon:0.05},constraints:{outwardEnergy:true}},
  { formulaId:"bow_anchor",version:"1.0.0",label:"Bow Anchor",flowDirection:"counterclockwise",anchors:[{role:"bow",clock:"7:00",strength:1},{role:"hero",clock:"9:30",strength:0.8}],silenceArcs:[{from:"12:30",to:"3:30"}],focalRegions:[{from:"8:30",to:"10:30"}],roleRatios:{greenery:0.52,focal:0.13,secondary:0.12,accent:0.08,ribbon:0.15},constraints:{bowRequired:true}},
  { formulaId:"inventory_salvage",version:"1.0.0",label:"Inventory Salvage",flowDirection:"mixed",anchors:[{role:"hero",clock:"8:00",strength:1}],silenceArcs:[{from:"12:30",to:"3:30"}],focalRegions:[{from:"7:00",to:"9:30"}],roleRatios:{greenery:0.50,focal:0.12,secondary:0.13,accent:0.20,ribbon:0.05},constraints:{preferAvailableStock:true}},
];
