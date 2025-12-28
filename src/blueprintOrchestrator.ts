import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
const fetch = require('node-fetch');

import {
    emotionAnalyzerPrompt,
    colorPalettePrompt,
    materialSelectorPrompt,
    spatialCoordinatorPrompt,
    constructionSequencerPrompt
} from './prompts';

// Interfaces matching the Prompt JSON outputs
interface Agent01Output {
    primaryEmotion: string;
    supportingEmotions: string[];
    emotionalFamily: string;
    designGoals: { texture: string; density: any };
}
interface Agent02Output {
    paletteName: string;
    harmonyType: string;
    colors: Array<{ role: string; hex: string; name: string; percentage: number }>;
}
interface Agent03Output {
    selectedItems: Array<{ inventoryId: string; role: string; quantity: number; reason: string }>;
}
interface Agent04Output {
    layoutStyle: string;
    placements: Array<{
        inventoryId: string;
        role: string;
        position: { r: number; theta: number; layer: string };
    }>;
}
interface Agent07Output {
    phases: Array<{
        phaseNumber: number;
        name: string;
        steps: string[];
        estimatedTimeMinutes: number;
    }>;
    totalEstimatedTimeMinutes: number;
}

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

// Helper to call Gemini (text-only)
async function callGemini(systemPrompt: string, userMessage: string, model: string = "gemini-1.5-flash"): Promise<any> {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${GEMINI_API_KEY}`;

    const payload = {
        contents: [{
            role: "user",
            parts: [{ text: systemPrompt + "\n\nUser Input:\n" + userMessage }]
        }],
        generationConfig: {
            response_mime_type: "application/json"
        }
    };

    const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
    });

    if (!response.ok) {
        const errText = await response.text();
        throw new Error(`Gemini API Error: ${response.status} - ${errText}`);
    }

    const data = await response.json();
    // @ts-ignore
    const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text || "{}";
    // Clean potential markdown code blocks
    const cleanJson = rawText.replace(/```json/g, '').replace(/```/g, '').trim();
    return JSON.parse(cleanJson);
}

export const generateWreathBlueprint = functions.https.onCall(async (data, context) => {
    console.log("🚀 Starting GenerateWreathBlueprint...");
    console.log("API Key configured:", !!process.env.GEMINI_API_KEY);

    // 0. Auth Check
    // if (!context.auth) throw new functions.https.HttpsError('unauthenticated', 'User must be logged in.');

    const { userStory, season = "Any", wreathDiameter = 24 } = data;

    try {
        // ========================================================================
        // STEP 1: EMOTION ANALYZER (Agent 01)
        // ========================================================================
        const agent01Result = await callGemini(emotionAnalyzerPrompt, `Story: "${userStory}"`) as Agent01Output;
        console.log("Agent 01 (Emotion) Done:", agent01Result.primaryEmotion);

        // ========================================================================
        // STEP 2: COLOR ARCHITECT (Agent 02)
        // ========================================================================
        const agent02Input = JSON.stringify({
            emotionData: agent01Result,
            season: season
        });
        const agent02Result = await callGemini(colorPalettePrompt, agent02Input) as Agent02Output;
        console.log("Agent 02 (Color) Done:", agent02Result.paletteName);

        // ========================================================================
        // STEP 3: MATERIAL SCAVENGER (Agent 03)
        // ========================================================================
        // Fetch a subset of inventory to feed the agent
        // Optimally, we would vector search here. For V1, we fetch "All Active" and map to a simplified list.
        const inventorySnapshot = await admin.firestore().collection('inventory').where('quantity', '>', 0).limit(50).get();
        const availableInventory = inventorySnapshot.docs.map(doc => {
            const d = doc.data();
            return { inventoryId: doc.id, name: d.name, color: d.color, type: d.botanicalType, tags: d.tags, imageUrl: d.imageUrl };
        });

        const agent03Input = JSON.stringify({
            colorPalette: agent02Result,
            designGoals: agent01Result.designGoals,
            availableInventory: availableInventory
        });
        const agent03Result = await callGemini(materialSelectorPrompt, agent03Input) as Agent03Output;
        console.log("Agent 03 (Materials) Done. Selected:", agent03Result.selectedItems.length);

        // ========================================================================
        // STEP 4: SPATIAL COORDINATOR (Agent 04)
        // ========================================================================
        const agent04Input = JSON.stringify({
            selectedMaterials: agent03Result.selectedItems,
            wreathDiameter: wreathDiameter
        });
        const agent04Result = await callGemini(spatialCoordinatorPrompt, agent04Input) as Agent04Output;
        console.log("Agent 04 (Spatial) Done. Placements:", agent04Result.placements.length);

        // ========================================================================
        // STEP 5: CONSTRUCTION MARSHAL (Agent 07)
        // ========================================================================
        // We can run this in parallel with Spatial, or after. Let's run after to include spatial context if needed (though prompt focuses on assembly).
        // Actually, Construction benefits from knowing "Where" things go (e.g. glue heavy items on bottom?), but mostly "What" things are.
        // We'll feed it placements too.
        const agent07Input = JSON.stringify({
            placements: agent04Result.placements,
            materials: agent03Result.selectedItems
        });
        const agent07Result = await callGemini(constructionSequencerPrompt, agent07Input) as Agent07Output;
        console.log("Agent 07 (Construction) Done. Phases:", agent07Result.phases.length);

        // ========================================================================
        // FINAL ASSEMBLY: WREATH BLUEPRINT
        // ========================================================================

        // Convert Agent 04 placements to WreathElements
        const elements = agent04Result.placements.map((p, index) => {
            // Find original inventory item to get metadata if possible
            const invItem = availableInventory.find(i => i.inventoryId === p.inventoryId);

            return {
                id: `elem_${index}_${Date.now()}`,
                inventoryId: p.inventoryId,
                name: invItem ? invItem.name : "Unknown Item",
                imageUrl: invItem ? invItem.imageUrl : undefined,
                position: {
                    // Map r/theta to x/y if needed for 2D canvas, but we store r/theta primarily now?
                    // types.ts has `angle` and `radius` in position.
                    angle: p.position.theta,
                    radius: p.position.r, // Provide raw inches? Or normalized 0-1? types.ts says `radius?: number; // 0-1 (from center to edge)`
                    // We need to normalize r. Max r = wreathDiameter / 2.
                    // Normalized R = p.position.r / (wreathDiameter / 2)
                },
                // We'll calculate xy client side or here.
                rotation: 0, // Default, client handles auto-rotation
                layer: p.position.layer === 'background' ? 1 : p.position.layer === 'mid' ? 2 : 3,
                rotationMode: 'auto',
                constructionPhase: 1, // We need to map this from Agent 07? Agent 07 gives phases for valid assembly, not per-item? 
                // Actually Agent 07 gives "Steps". We could try to map items to phases. 
                // For V1, we'll leave phase on the element generic or attempt a basic map based on Role.
                attachmentMethod: 'hot_glue' // Default
            };
        });

        const blueprint = {
            id: `bp_${Date.now()}`,
            name: `The ${agent01Result.primaryEmotion} ${agent02Result.paletteName} Wreath`,
            description: `Generated for story: "${userStory.substring(0, 50)}..."`,
            diameterInInches: wreathDiameter,
            elements: elements,
            layoutStyle: agent04Result.layoutStyle,

            // New V1.0 Fields
            emotionalProfile: agent01Result,
            colorPalette: agent02Result,
            constructionPlan: agent07Result,
        };

        return { success: true, blueprint: blueprint };

    } catch (error) {
        console.error("Blueprint Generation Failed:", error);
        // @ts-ignore
        throw new functions.https.HttpsError('internal', error.message);
    }
});
