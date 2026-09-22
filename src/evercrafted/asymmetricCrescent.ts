import {
    AsymmetricCrescentInput,
    BlueprintElement,
    BlueprintRole,
    SelectedInventoryItem,
    WreathBlueprint,
} from './contracts';
import {
    angleInClockwiseArc,
    angleToClockPosition,
    normalizeAngle,
    polarToPhysicalCartesian,
    shortestAngleDistance,
} from './geometry';
import { createSeededRandom, randomBetween, stableIdentifier } from './seededRandom';

export const ASYMMETRIC_CRESCENT_FORMULA_ID = 'asymmetric_crescent_v1' as const;
export const ASYMMETRIC_CRESCENT_FORMULA_VERSION = '1.0.0' as const;

interface ExpandedSelection extends SelectedInventoryItem {
    role: BlueprintRole;
    ordinal: number;
}

function canonicalRole(role: string): BlueprintRole {
    switch (role.trim().toLowerCase()) {
        case 'base':
        case 'greenery':
        case 'structural_green':
            return 'structural_green';
        case 'transitional':
        case 'transitional_green':
            return 'transitional_green';
        case 'primary':
        case 'focal':
            return 'focal';
        case 'secondary':
            return 'secondary';
        case 'supporting':
            return 'supporting';
        case 'filler':
            return 'filler';
        case 'ribbon':
            return 'ribbon';
        default:
            return 'accent';
    }
}

function expandSelections(selectedItems: SelectedInventoryItem[]): ExpandedSelection[] {
    const expanded: ExpandedSelection[] = [];
    selectedItems.forEach((item) => {
        const quantity = Math.max(0, Math.min(80, Math.floor(item.quantity)));
        for (let ordinal = 0; ordinal < quantity; ordinal += 1) {
            expanded.push({ ...item, role: canonicalRole(item.role), ordinal });
        }
    });
    return expanded;
}

function zIndexForRole(role: BlueprintRole): number {
    if (role === 'structural_green' || role === 'transitional_green' || role === 'base') return 1;
    if (role === 'focal') return 3;
    return 2;
}

function round(value: number): number {
    return Math.round(value * 1000) / 1000;
}

function createElement(
    selection: ExpandedSelection,
    angleDeg: number,
    radiusIn: number,
    rotationDeg: number,
    seed: string,
    placementReason: string,
    pocketId?: string,
    clusterId?: string,
): BlueprintElement {
    const angle = normalizeAngle(angleDeg);
    const physical = polarToPhysicalCartesian(radiusIn, angle);
    const identity = `${seed}|${selection.inventoryId}|${selection.role}|${selection.ordinal}`;
    return {
        elementId: stableIdentifier('element', identity),
        inventoryItemId: selection.inventoryId,
        role: selection.role,
        pocketId,
        clusterId,
        angleDeg: round(angle),
        clockPosition: angleToClockPosition(angle),
        radiusIn: round(radiusIn),
        xIn: round(physical.xIn),
        yIn: round(physical.yIn),
        rotationDeg: round(normalizeAngle(rotationDeg)),
        scale: 1,
        zIndex: zIndexForRole(selection.role),
        quantity: 1,
        locked: true,
        placementReason,
    };
}

export function generateAsymmetricCrescent(input: AsymmetricCrescentInput): WreathBlueprint {
    if (!input.seed.trim()) throw new Error('A deterministic blueprint seed is required.');
    if (!Number.isFinite(input.finishedDiameterIn) || input.finishedDiameterIn <= 0) {
        throw new Error('finishedDiameterIn must be a positive number.');
    }
    if (![1, 2, 3].includes(input.focalClock)) throw new Error('focalClock must be 1, 2, or 3.');

    const flowDirection = input.flowDirection || 'clockwise';
    const direction = flowDirection === 'clockwise' ? 1 : -1;
    const density = input.density || 'balanced';
    const random = createSeededRandom(`${ASYMMETRIC_CRESCENT_FORMULA_VERSION}|${input.seed}`);
    const focalAngle = input.focalClock * 30;
    const occupiedStart = normalizeAngle(focalAngle - 70);
    const occupiedSpan = 200;
    const pocketHalfWidth = 18;
    const silenceStart = normalizeAngle(focalAngle + 145);
    const silenceEnd = normalizeAngle(focalAngle + 285);
    const baseRadius = input.finishedDiameterIn * 0.39;
    const expanded = expandSelections(input.selectedItems);
    const greens = expanded.filter((item) => item.role === 'structural_green' || item.role === 'transitional_green');
    const focals = expanded.filter((item) => item.role === 'focal');
    const supporting = expanded.filter((item) => !greens.includes(item) && !focals.includes(item));
    const elements: BlueprintElement[] = [];

    greens.forEach((selection, index) => {
        const ratio = greens.length <= 1 ? 0.5 : index / (greens.length - 1);
        let angle = occupiedStart + direction * ratio * occupiedSpan + randomBetween(random, -4, 4);
        if (shortestAngleDistance(angle, focalAngle) < pocketHalfWidth) {
            angle += normalizeAngle(angle) < focalAngle ? -pocketHalfWidth : pocketHalfWidth;
        }
        elements.push(createElement(
            selection,
            angle,
            baseRadius + randomBetween(random, -0.55, 0.55),
            angle + 90 + randomBetween(random, -7, 7),
            input.seed,
            'Structural sweep along the occupied crescent arc.',
        ));
    });

    const focalOffsets = [-14, 0, 16];
    focals.forEach((selection, index) => {
        const clusterIndex = index % focalOffsets.length;
        const layer = Math.floor(index / focalOffsets.length);
        const pocketId = `pocket_${clusterIndex + 1}`;
        elements.push(createElement(
            selection,
            focalAngle + focalOffsets[clusterIndex] + randomBetween(random, -3, 3),
            baseRadius + 0.45 - layer * 0.22 + randomBetween(random, -0.18, 0.18),
            focalAngle + randomBetween(random, -5, 5),
            input.seed,
            'Primary focal microcluster around the emotional anchor.',
            pocketId,
            `cluster_focal_${clusterIndex + 1}`,
        ));
    });

    supporting.forEach((selection, index) => {
        const side = index % 2 === 0 ? -1 : 1;
        const distance = 24 + Math.floor(index / 2) * 13;
        const pocketId = `pocket_${(index % 3) + 1}`;
        const angle = focalAngle + side * distance * direction + randomBetween(random, -4, 4);
        elements.push(createElement(
            selection,
            angle,
            baseRadius + randomBetween(random, -0.35, 0.5),
            angle + randomBetween(random, -8, 8),
            input.seed,
            'Supporting bridge from the focal pocket into the crescent flow.',
            pocketId,
            `cluster_support_${Math.floor(index / 3) + 1}`,
        ));
    });

    elements.sort((left, right) => left.elementId.localeCompare(right.elementId));
    const silenceArcViolations = elements.filter((element) =>
        angleInClockwiseArc(element.angleDeg, silenceStart, silenceEnd),
    ).length;
    const selectedInventoryIds = new Set(input.selectedItems.map((item) => item.inventoryId));
    const missingInventoryReferences = elements.filter((element) => !selectedInventoryIds.has(element.inventoryItemId)).length;
    const failed = silenceArcViolations > 0 || missingInventoryReferences > 0;
    const pass1ElementIds = elements.filter((element) => element.zIndex === 1).map((element) => element.elementId);
    const pass2ElementIds = elements.filter((element) => element.zIndex > 1).map((element) => element.elementId);

    return {
        schemaVersion: '1.0',
        blueprintId: stableIdentifier('blueprint', `${input.essenceId}|${input.seed}|${input.inventorySnapshotId}`),
        essenceId: input.essenceId,
        formulaId: ASYMMETRIC_CRESCENT_FORMULA_ID,
        formulaVersion: ASYMMETRIC_CRESCENT_FORMULA_VERSION,
        seed: input.seed,
        inventorySource: input.inventorySource,
        inventorySnapshotId: input.inventorySnapshotId,
        finishedDiameterIn: input.finishedDiameterIn,
        baseDiameterIn: input.baseDiameterIn || input.finishedDiameterIn * 0.75,
        focalClock: input.focalClock,
        flowDirection,
        density,
        pockets: focalOffsets.map((offset, index) => ({
            pocketId: `pocket_${index + 1}`,
            centerAngleDeg: normalizeAngle(focalAngle + offset),
            halfWidthDeg: pocketHalfWidth,
        })),
        silenceArcs: [{
            startAngleDeg: silenceStart,
            endAngleDeg: silenceEnd,
            minimumClearanceIn: 1,
        }],
        elements,
        passes: {
            pass1ElementIds,
            pass2ElementIds,
            pass3ElementIds: elements.map((element) => element.elementId),
        },
        quality: {
            status: failed ? 'FAILED' : 'NEEDS_REVIEW',
            silenceArcViolations,
            missingInventoryReferences,
            physicalCollisionCheck: 'PENDING',
            notes: failed
                ? ['Resolve deterministic contract violations before rendering.']
                : ['Physical dimensions and collision clearance require inventory geometry before approval.'],
        },
    };
}
