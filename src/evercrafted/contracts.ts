export type InventorySource = 'evercrafted' | 'owner' | 'client';

export type BlueprintRole =
    | 'base'
    | 'structural_green'
    | 'transitional_green'
    | 'focal'
    | 'secondary'
    | 'supporting'
    | 'filler'
    | 'accent'
    | 'ribbon';

export type FlowDirection = 'clockwise' | 'counterclockwise';
export type Density = 'airy' | 'balanced' | 'lush';
export type QualityStatus = 'PASSED' | 'NEEDS_REVIEW' | 'FAILED';
export type FocalClock = 1 | 2 | 3;

export interface SelectedInventoryItem {
    inventoryId: string;
    role: string;
    quantity: number;
    reason?: string;
}

export interface BlueprintElement {
    elementId: string;
    inventoryItemId: string;
    role: BlueprintRole;
    pocketId?: string;
    clusterId?: string;
    angleDeg: number;
    clockPosition: string;
    radiusIn: number;
    xIn: number;
    yIn: number;
    rotationDeg: number;
    scale: number;
    zIndex: number;
    quantity: number;
    locked: boolean;
    placementReason: string;
}

export interface PocketSpec {
    pocketId: string;
    centerAngleDeg: number;
    halfWidthDeg: number;
}

export interface SilenceArc {
    startAngleDeg: number;
    endAngleDeg: number;
    minimumClearanceIn: number;
}

export interface QualityResult {
    status: QualityStatus;
    silenceArcViolations: number;
    missingInventoryReferences: number;
    physicalCollisionCheck: 'PENDING' | 'PASSED' | 'FAILED';
    notes: string[];
}

export interface WreathBlueprint {
    schemaVersion: '1.0';
    blueprintId: string;
    essenceId: string;
    formulaId: 'asymmetric_crescent_v1';
    formulaVersion: '1.0.0';
    seed: string;
    inventorySource: InventorySource;
    inventorySnapshotId: string;
    finishedDiameterIn: number;
    baseDiameterIn: number;
    focalClock: FocalClock;
    flowDirection: FlowDirection;
    density: Density;
    pockets: PocketSpec[];
    silenceArcs: SilenceArc[];
    elements: BlueprintElement[];
    passes: {
        pass1ElementIds: string[];
        pass2ElementIds: string[];
        pass3ElementIds: string[];
    };
    quality: QualityResult;
}

export interface AsymmetricCrescentInput {
    seed: string;
    essenceId: string;
    inventorySource: InventorySource;
    inventorySnapshotId: string;
    finishedDiameterIn: number;
    baseDiameterIn?: number;
    focalClock: FocalClock;
    flowDirection?: FlowDirection;
    density?: Density;
    selectedItems: SelectedInventoryItem[];
}
