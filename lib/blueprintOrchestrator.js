"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateWreathBlueprint = void 0;
const functions = require("firebase-functions");
const admin = require("firebase-admin");
const fetch = require('node-fetch');
const prompts_1 = require("./prompts");
const asymmetricCrescent_1 = require("./evercrafted/asymmetricCrescent");
const seededRandom_1 = require("./evercrafted/seededRandom");
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
// Helper to call Gemini (text-only)
async function callGemini(systemPrompt, userMessage, model = "gemini-1.5-flash") {
    var _a, _b, _c, _d, _e;
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
    const rawText = ((_e = (_d = (_c = (_b = (_a = data.candidates) === null || _a === void 0 ? void 0 : _a[0]) === null || _b === void 0 ? void 0 : _b.content) === null || _c === void 0 ? void 0 : _c.parts) === null || _d === void 0 ? void 0 : _d[0]) === null || _e === void 0 ? void 0 : _e.text) || "{}";
    // Clean potential markdown code blocks
    const cleanJson = rawText.replace(/```json/g, '').replace(/```/g, '').trim();
    return JSON.parse(cleanJson);
}
exports.generateWreathBlueprint = functions.https.onCall(async (data, context) => {
    console.log("🚀 Starting GenerateWreathBlueprint...");
    console.log("API Key configured:", !!process.env.GEMINI_API_KEY);
    // 0. Auth Check
    // if (!context.auth) throw new functions.https.HttpsError('unauthenticated', 'User must be logged in.');
    const { userStory, season = "Any", wreathDiameter = 24 } = data;
    try {
        // ========================================================================
        // STEP 1: EMOTION ANALYZER (Agent 01)
        // ========================================================================
        const agent01Result = await callGemini(prompts_1.emotionAnalyzerPrompt, `Story: "${userStory}"`);
        console.log("Agent 01 (Emotion) Done:", agent01Result.primaryEmotion);
        // ========================================================================
        // STEP 2: COLOR ARCHITECT (Agent 02)
        // ========================================================================
        const agent02Input = JSON.stringify({
            emotionData: agent01Result,
            season: season
        });
        const agent02Result = await callGemini(prompts_1.colorPalettePrompt, agent02Input);
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
        const agent03Result = await callGemini(prompts_1.materialSelectorPrompt, agent03Input);
        console.log("Agent 03 (Materials) Done. Selected:", agent03Result.selectedItems.length);
        // ========================================================================
        // STEP 4: DETERMINISTIC SPATIAL COMPOSITION
        // ========================================================================
        const requestedFocalClock = Number(data.focalClock);
        const focalClock = ([1, 2, 3].includes(requestedFocalClock)
            ? requestedFocalClock
            : agent01Result.focalClock || 2);
        const densityValue = Number(agent01Result.designGoals.density);
        const density = Number.isFinite(densityValue)
            ? densityValue < 0.4 ? 'airy' : densityValue > 0.7 ? 'lush' : 'balanced'
            : 'balanced';
        const seed = String(data.seed || (0, seededRandom_1.stableIdentifier)('seed', `${userStory}|${season}|${wreathDiameter}|${focalClock}`));
        const canonicalBlueprint = (0, asymmetricCrescent_1.generateAsymmetricCrescent)({
            seed,
            essenceId: String(data.essenceId || (0, seededRandom_1.stableIdentifier)('essence', userStory)),
            inventorySource: data.inventorySource === 'owner' || data.inventorySource === 'client'
                ? data.inventorySource
                : 'evercrafted',
            inventorySnapshotId: String(data.inventorySnapshotId || 'firestore-active-inventory'),
            finishedDiameterIn: Number(wreathDiameter),
            focalClock,
            density,
            selectedItems: agent03Result.selectedItems,
        });
        console.log("Deterministic spatial composition done. Placements:", canonicalBlueprint.elements.length);
        // ========================================================================
        // STEP 5: CONSTRUCTION MARSHAL (Agent 07)
        // ========================================================================
        // We can run this in parallel with Spatial, or after. Let's run after to include spatial context if needed (though prompt focuses on assembly).
        // Actually, Construction benefits from knowing "Where" things go (e.g. glue heavy items on bottom?), but mostly "What" things are.
        // We'll feed it placements too.
        const agent07Input = JSON.stringify({
            placements: canonicalBlueprint.elements,
            materials: agent03Result.selectedItems
        });
        const agent07Result = await callGemini(prompts_1.constructionSequencerPrompt, agent07Input);
        console.log("Agent 07 (Construction) Done. Phases:", agent07Result.phases.length);
        // ========================================================================
        // FINAL ASSEMBLY: WREATH BLUEPRINT
        // ========================================================================
        // Preserve the existing client shape while attaching canonical coordinates.
        const elements = canonicalBlueprint.elements.map((placement) => {
            // Find original inventory item to get metadata if possible
            const invItem = availableInventory.find(i => i.inventoryId === placement.inventoryItemId);
            return {
                id: placement.elementId,
                inventoryId: placement.inventoryItemId,
                name: invItem ? invItem.name : "Unknown Item",
                imageUrl: invItem ? invItem.imageUrl : undefined,
                position: {
                    angle: placement.angleDeg,
                    radius: placement.radiusIn / (wreathDiameter / 2),
                },
                angleDeg: placement.angleDeg,
                radiusIn: placement.radiusIn,
                xIn: placement.xIn,
                yIn: placement.yIn,
                clockPosition: placement.clockPosition,
                role: placement.role,
                rotation: placement.rotationDeg,
                layer: placement.zIndex,
                rotationMode: 'locked',
                constructionPhase: placement.zIndex,
                attachmentMethod: 'hot_glue',
                canonicalPlacement: placement,
            };
        });
        const blueprint = {
            id: canonicalBlueprint.blueprintId,
            name: `The ${agent01Result.primaryEmotion} ${agent02Result.paletteName} Wreath`,
            description: `Generated for story: "${userStory.substring(0, 50)}..."`,
            diameterInInches: wreathDiameter,
            elements: elements,
            layoutStyle: 'asymmetric_crescent',
            // New V1.0 Fields
            emotionalProfile: agent01Result,
            colorPalette: agent02Result,
            constructionPlan: agent07Result,
            canonicalBlueprint,
        };
        return { success: true, blueprint: blueprint };
    }
    catch (error) {
        console.error("Blueprint Generation Failed:", error);
        // @ts-ignore
        throw new functions.https.HttpsError('internal', error.message);
    }
});
//# sourceMappingURL=blueprintOrchestrator.js.map