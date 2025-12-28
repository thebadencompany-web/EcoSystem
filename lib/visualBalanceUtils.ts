// lib/visualBalanceUtils.ts
// Utilities for calculating visual balance and weight distribution on the wreath

import type { WreathElement, InventoryItem } from '../types';

/**
 * Visual weight distribution across the four quadrants of the wreath
 */
export interface QuadrantWeights {
    topRight: number;     // 0-90 degrees
    bottomRight: number;  // 90-180 degrees
    bottomLeft: number;   // 180-270 degrees
    topLeft: number;      // 270-360 degrees
}

/**
 * Result of balance analysis
 */
export interface BalanceAnalysis {
    weights: QuadrantWeights;
    score: number;           // 0-1 (1 = perfect balance)
    isBalanced: boolean;     // Whether it meets the threshold
    threshold: number;       // The threshold used
    heaviestQuadrant: keyof QuadrantWeights;
    lightestQuadrant: keyof QuadrantWeights;
    suggestion?: string;     // Suggestion for improvement
}

/**
 * Style-dependent balance thresholds
 */
export type DesignStyle = 'traditional' | 'modern' | 'romantic' | 'bohemian' | 'naturalistic';

const BALANCE_THRESHOLDS: Record<DesignStyle, number> = {
    traditional: 0.85,    // High symmetry expected
    modern: 0.75,         // Clean but allows asymmetry
    romantic: 0.80,       // Balanced but soft
    bohemian: 0.60,       // Intentionally organic
    naturalistic: 0.55    // Mimics wild growth
};

/**
 * Get the balance threshold for a given style
 */
export function getBalanceThreshold(style: DesignStyle = 'modern'): number {
    return BALANCE_THRESHOLDS[style] || 0.70;
}

/**
 * Determine which quadrant an angle falls into
 */
function getQuadrant(angle: number): keyof QuadrantWeights {
    const normalized = ((angle % 360) + 360) % 360;

    if (normalized >= 0 && normalized < 90) return 'topRight';
    if (normalized >= 90 && normalized < 180) return 'bottomRight';
    if (normalized >= 180 && normalized < 270) return 'bottomLeft';
    return 'topLeft';
}

/**
 * Calculate the visual weight of a single element
 * Takes into account:
 * - Composition role (focal = high weight)
 * - Physical size
 * - Visual weight from enhanced properties
 */
export function calculateElementWeight(
    element: WreathElement,
    inventoryItem: InventoryItem | undefined | null
): number {
    // Base weight from composition role
    let baseWeight = 5; // Default mid-range weight

    if (inventoryItem?.compositionRole) {
        switch (inventoryItem.compositionRole) {
            case 'focal':
                baseWeight = 9;
                break;
            case 'secondary':
                baseWeight = 6;
                break;
            case 'filler':
                baseWeight = 3;
                break;
            case 'accent':
                baseWeight = 5;
                break;
        }
    }

    // Size contribution (larger elements have more visual weight)
    const area = element.realWorldSizeInInches.width * element.realWorldSizeInInches.height;
    const sizeWeight = Math.min(3, area / 10); // Cap at 3 points from size

    // Visual weight from enhanced properties (if available)
    const enhancedWeight = inventoryItem?.enhancedProperties?.compositionalBehavior?.visualWeight;
    if (enhancedWeight !== undefined) {
        // Enhanced weight is 0-1, scale to 0-10
        return (enhancedWeight * 6) + sizeWeight + 2;
    }

    return baseWeight + sizeWeight;
}

/**
 * Calculate visual weight distribution across quadrants
 */
export function calculateQuadrantWeights(
    elements: WreathElement[],
    inventory: InventoryItem[]
): QuadrantWeights {
    const weights: QuadrantWeights = {
        topRight: 0,
        bottomRight: 0,
        bottomLeft: 0,
        topLeft: 0
    };

    elements.forEach(element => {
        // Skip base elements - they don't contribute to balance
        if (element.isBase) return;

        const angle = element.position.angle || 0;
        const quadrant = getQuadrant(angle);
        const inventoryItem = inventory.find(i => i.id === element.inventoryId);
        const weight = calculateElementWeight(element, inventoryItem);

        weights[quadrant] += weight;
    });

    return weights;
}

/**
 * Calculate balance score (0-1 where 1 is perfect balance)
 * Uses the formula: 1 - (max - min) / max
 */
export function calculateBalanceScore(weights: QuadrantWeights): number {
    const values = Object.values(weights);
    const max = Math.max(...values);
    const min = Math.min(...values);

    // Empty wreath or all zeros
    if (max === 0) return 1;

    // Perfect balance when all quadrants are equal
    // Lower score when weight is concentrated in one area
    return 1 - ((max - min) / max);
}

/**
 * Find the heaviest and lightest quadrants
 */
function findExtremeQuadrants(weights: QuadrantWeights): {
    heaviest: keyof QuadrantWeights;
    lightest: keyof QuadrantWeights;
} {
    const entries = Object.entries(weights) as [keyof QuadrantWeights, number][];

    const sorted = entries.sort((a, b) => b[1] - a[1]);

    return {
        heaviest: sorted[0][0],
        lightest: sorted[sorted.length - 1][0]
    };
}

/**
 * Get opposite quadrant (for balance suggestions)
 */
function getOppositeQuadrant(quadrant: keyof QuadrantWeights): keyof QuadrantWeights {
    switch (quadrant) {
        case 'topRight': return 'bottomLeft';
        case 'bottomRight': return 'topLeft';
        case 'bottomLeft': return 'topRight';
        case 'topLeft': return 'bottomRight';
    }
}

/**
 * Perform complete balance analysis
 */
export function analyzeBalance(
    elements: WreathElement[],
    inventory: InventoryItem[],
    style: DesignStyle = 'modern'
): BalanceAnalysis {
    const weights = calculateQuadrantWeights(elements, inventory);
    const score = calculateBalanceScore(weights);
    const threshold = getBalanceThreshold(style);
    const { heaviest, lightest } = findExtremeQuadrants(weights);

    let suggestion: string | undefined;

    if (score < threshold) {
        const opposite = getOppositeQuadrant(heaviest);
        const quadrantNames: Record<keyof QuadrantWeights, string> = {
            topRight: 'top-right (1-3 o\'clock)',
            bottomRight: 'bottom-right (3-6 o\'clock)',
            bottomLeft: 'bottom-left (6-9 o\'clock)',
            topLeft: 'top-left (9-12 o\'clock)'
        };

        suggestion = `Consider adding visual weight to ${quadrantNames[lightest]} or moving some elements from ${quadrantNames[heaviest]} to ${quadrantNames[opposite]}`;
    }

    return {
        weights,
        score,
        isBalanced: score >= threshold,
        threshold,
        heaviestQuadrant: heaviest,
        lightestQuadrant: lightest,
        suggestion
    };
}

/**
 * Find the best position to add a new element for balance improvement
 */
export function suggestBalancingPosition(
    currentWeights: QuadrantWeights
): { suggestedQuadrant: keyof QuadrantWeights; angleRange: { min: number; max: number } } {
    const { lightest } = findExtremeQuadrants(currentWeights);

    const angleRanges: Record<keyof QuadrantWeights, { min: number; max: number }> = {
        topRight: { min: 15, max: 75 },
        bottomRight: { min: 105, max: 165 },
        bottomLeft: { min: 195, max: 255 },
        topLeft: { min: 285, max: 345 }
    };

    return {
        suggestedQuadrant: lightest,
        angleRange: angleRanges[lightest]
    };
}
