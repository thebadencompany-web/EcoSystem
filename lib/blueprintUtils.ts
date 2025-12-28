// lib/blueprintUtils.ts
import type { WreathBlueprint } from '../types';

/**
 * Creates a deep, clean copy of a blueprint, ensuring it's a plain JSON-serializable object.
 * This is crucial for preventing "circular structure" errors when stringifying state that may have been
 * inadvertently contaminated with complex objects.
 * @param blueprint The potentially "dirty" blueprint object from the state.
 * @returns A clean, safe-to-serialize copy of the blueprint, or null if the input was null.
 */
export const sanitizeBlueprintForSerialization = (blueprint: WreathBlueprint | null): WreathBlueprint | null => {
    if (!blueprint) return null;

    // Manually reconstruct the object to ensure it's clean and matches the type definition.
    // This strips any extraneous properties or complex object instances.
    const cleanBlueprint: WreathBlueprint = {
        id: blueprint.id,
        name: blueprint.name,
        description: blueprint.description,
        diameterInInches: blueprint.diameterInInches,
        layoutStyle: blueprint.layoutStyle,
        wreathBaseImageUrl: blueprint.wreathBaseImageUrl || null,
        schematicSvg: blueprint.schematicSvg || null,
        narrative: blueprint.narrative ? {
            paragraphs: [...(blueprint.narrative.paragraphs || [])],
            emotionTags: [...(blueprint.narrative.emotionTags || [])],
            therapeuticGuidance: blueprint.narrative.therapeuticGuidance,
            voiceAdaptation: blueprint.narrative.voiceAdaptation,
            healingStage: blueprint.narrative.healingStage,
        } : undefined,
        elements: blueprint.elements.map(el => ({
            id: el.id,
            inventoryId: el.inventoryId,
            name: el.name,
            position: { ...el.position },
            rotation: el.rotation,
            layer: el.layer,
            realWorldSizeInInches: { ...el.realWorldSizeInInches },
            tuckPoint: { ...el.tuckPoint },
            // Preserve emotional metadata when serializing
            emotionTags: Array.isArray((el as any).emotionTags) ? [...(el as any).emotionTags] : [],
            symbolMeaning: (el as any).symbolMeaning,
            culturalTags: Array.isArray((el as any).culturalTags) ? [...(el as any).culturalTags] : [],
            emotionalWeight: (el as any).emotionalWeight,
        })),
    };

    return cleanBlueprint;
};
