"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.stemIsolationAgent = exports.generateThumbnail = exports.fullWreathPipeline = exports.callGPTWithPrompt = exports.fallbackAgent = exports.florosAgent = exports.logicEngineAgent = exports.botanicalAnalysisAgent = exports.clearStemAgent = void 0;
const functions = require("firebase-functions");
const admin = require("firebase-admin");
const Sentry = require("@sentry/node");
const uuid_1 = require("uuid");
// eslint-disable-next-line @typescript-eslint/no-var-requires
const sharp = require("sharp");
const prompts_1 = require("./prompts");
// Use require for node-fetch to match commonjs module target
const fetch = require("node-fetch");
// Initialize Firebase Admin
admin.initializeApp();
// Initialize Sentry (no-op if DSN not set)
if (process.env.SENTRY_DSN) {
    Sentry.init({ dsn: process.env.SENTRY_DSN });
}
const RATE_LIMIT_RPM = Number(process.env.RATE_LIMIT_RPM || 60); // requests/minute
const buckets = {};
function checkRateLimit(ip, key) {
    const now = Date.now();
    const bucketKey = `${key}:${ip}`;
    const capacity = RATE_LIMIT_RPM;
    const refillRatePerMs = capacity / 60000; // tokens per ms
    const bucket = buckets[bucketKey] || { tokens: capacity, lastRefill: now };
    // refill
    const elapsed = now - bucket.lastRefill;
    bucket.tokens = Math.min(capacity, bucket.tokens + elapsed * refillRatePerMs);
    bucket.lastRefill = now;
    if (bucket.tokens >= 1) {
        bucket.tokens -= 1;
        buckets[bucketKey] = bucket;
        return true;
    }
    buckets[bucketKey] = bucket;
    return false;
}
// Helper function to call Gemini 1.5 Flash Vision API
async function callGeminiVisionAPI(prompt, imageBase64) {
    var _a, _b, _c, _d;
    const apiKey = process.env.GEMINI_API_KEY || "";
    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;
    const requestBody = {
        contents: [
            {
                parts: [
                    { text: prompt },
                    {
                        inlineData: {
                            mimeType: "image/png",
                            data: imageBase64
                        }
                    }
                ]
            }
        ],
        generationConfig: {
            temperature: 0.1,
            topK: 32,
            topP: 1,
            maxOutputTokens: 4096,
        }
    };
    try {
        const response = await fetch(endpoint, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify(requestBody),
        });
        if (!response.ok) {
            const errorBody = await response.text();
            functions.logger.error(`Gemini API Error Details:`, {
                status: response.status,
                statusText: response.statusText,
                body: errorBody,
                requestBody: JSON.stringify(requestBody, null, 2)
            });
            throw new Error(`Gemini API error: ${response.status} ${response.statusText} - ${errorBody}`);
        }
        const data = await response.json();
        if (!data.candidates || !((_d = (_c = (_b = (_a = data.candidates[0]) === null || _a === void 0 ? void 0 : _a.content) === null || _b === void 0 ? void 0 : _b.parts) === null || _c === void 0 ? void 0 : _c[0]) === null || _d === void 0 ? void 0 : _d.text)) {
            throw new Error("Invalid response from Gemini API");
        }
        return data.candidates[0].content.parts[0].text;
    }
    catch (error) {
        functions.logger.error("Error calling Gemini Vision API:", error);
        throw new Error(`Gemini API call failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
}
/**
 * clearStemAgent - Remove background from uploaded floral image
 * Input: File (image as base64)
 * Output: Blob (cleaned image as base64)
 * Model: Gemini Pro Vision
 */
exports.clearStemAgent = functions.runWith({ memory: '1GB' }).https.onRequest(async (req, res) => {
    var _a, _b, _c, _d;
    // Enable CORS
    res.set("Access-Control-Allow-Origin", "*");
    res.set("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    res.set("Access-Control-Allow-Headers", "Content-Type");
    if (req.method === "OPTIONS") {
        res.status(200).send();
        return;
    }
    // Handle GET requests for testing
    if (req.method === "GET") {
        res.status(200).json({
            status: "online",
            message: "Clear Stem Agent is running",
            timestamp: new Date().toISOString(),
            function: "clearStemAgent"
        });
        return;
    }
    if (req.method !== "POST") {
        res.status(405).json({ error: "Method not allowed" });
        return;
    }
    try {
        const ip = ((_b = (_a = req.headers['x-forwarded-for']) === null || _a === void 0 ? void 0 : _a.split(',')[0]) === null || _b === void 0 ? void 0 : _b.trim()) || req.socket.remoteAddress || 'unknown';
        if (!checkRateLimit(ip, 'clearStemAgent')) {
            res.status(429).json({ error: 'Rate limit exceeded' });
            return;
        }
        const { imageBase64 } = req.body;
        if (!imageBase64) {
            res.status(400).json({ error: "Missing imageBase64 parameter" });
            return;
        }
        // Thoroughly sanitize the base64 string
        let cleanBase64 = imageBase64;
        // Remove data URL prefix if present (handles various image types)
        cleanBase64 = cleanBase64.replace(/^data:image\/[a-zA-Z0-9+.-]+;base64,/, "");
        // Remove any whitespace or newlines that might have crept in
        cleanBase64 = cleanBase64.replace(/[\s\n\r]/g, "");
        // Validate it's proper base64
        const base64Regex = /^[A-Za-z0-9+/]*={0,2}$/;
        if (!base64Regex.test(cleanBase64)) {
            functions.logger.error("Invalid base64 format detected", {
                originalLength: imageBase64.length,
                cleanedLength: cleanBase64.length,
                sample: cleanBase64.substring(0, 100)
            });
            res.status(400).json({ error: "Invalid base64 image data" });
            return;
        }
        // Check payload size (remove.bg has a ~25MB limit, be conservative at 10MB)
        const estimatedBytes = (cleanBase64.length * 3) / 4;
        const maxBytes = 10 * 1024 * 1024; // 10MB
        if (estimatedBytes > maxBytes) {
            functions.logger.warn("Image too large for background removal", { estimatedBytes });
            res.status(400).json({ error: "Image too large. Please use an image smaller than 10MB." });
            return;
        }
        // Try remove.bg API first, fall back to Gemini if it fails
        const removeBgApiKey = process.env.REMOVE_BG_API_KEY || "";
        let base64String = null;
        let removeBgError = null;
        if (removeBgApiKey) {
            try {
                // Convert base64 to buffer for file upload
                const imageBuffer = Buffer.from(cleanBase64, 'base64');
                const FormData = require('form-data');
                const formData = new FormData();
                // Use image_file instead of image_file_b64, sending actual binary data
                formData.append('image_file', imageBuffer, {
                    filename: 'image.png',
                    contentType: 'image/png'
                });
                formData.append('size', 'auto');
                const response = await fetch('https://api.remove.bg/v1.0/removebg', {
                    method: 'POST',
                    headers: Object.assign({ 'X-Api-Key': removeBgApiKey }, formData.getHeaders()),
                    body: formData,
                });
                if (!response.ok) {
                    const errorText = await response.text();
                    let errorMessage = `Request failed with status ${response.status}`;
                    try {
                        const errorData = JSON.parse(errorText);
                        errorMessage = ((_d = (_c = errorData === null || errorData === void 0 ? void 0 : errorData.errors) === null || _c === void 0 ? void 0 : _c[0]) === null || _d === void 0 ? void 0 : _d.title) || errorMessage;
                    }
                    catch (e) {
                        if (errorText.length < 200)
                            errorMessage = errorText;
                    }
                    removeBgError = `remove.bg: ${errorMessage}`;
                    functions.logger.warn("remove.bg failed, trying Gemini fallback", { error: removeBgError });
                }
                else {
                    const imageBuffer = await response.arrayBuffer();
                    base64String = Buffer.from(imageBuffer).toString('base64');
                }
            }
            catch (e) {
                removeBgError = e instanceof Error ? e.message : 'Unknown remove.bg error';
                functions.logger.warn("remove.bg exception, trying Gemini fallback", { error: removeBgError });
            }
        }
        // Gemini fallback if remove.bg failed or isn't configured
        if (!base64String) {
            functions.logger.info("Background removal failed or not configured");
            res.status(412).json({
                error: "Background removal configuration missing",
                details: removeBgError || "REMOVE_BG_API_KEY not configured on server",
                code: "REMOVE_BG_KEY_MISSING"
            });
            return;
        }
        res.status(200).json({
            success: true,
            message: "Background removal completed",
            cleanedImageBase64: base64String
        });
    }
    catch (error) {
        functions.logger.error("Error in clearStemAgent:", error);
        if (process.env.SENTRY_DSN)
            Sentry.captureException(error);
        res.status(500).json({
            error: "Background removal failed",
            details: error instanceof Error ? error.message : "Unknown error"
        });
    }
});
/**
 * botanicalAnalysisAgent - Extract botanical metadata from cleaned image
 * Input: Blob (cleaned image as base64)
 * Output: BotanicalMetadata[]
 * Model: Gemini Pro Vision
 */
exports.botanicalAnalysisAgent = functions.runWith({ memory: '1GB' }).https.onRequest(async (req, res) => {
    var _a, _b;
    // Enable CORS
    res.set("Access-Control-Allow-Origin", "*");
    res.set("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    res.set("Access-Control-Allow-Headers", "Content-Type");
    if (req.method === "OPTIONS") {
        res.status(200).send();
        return;
    }
    // Handle GET requests for testing
    if (req.method === "GET") {
        res.status(200).json({
            status: "online",
            message: "Botanical Analysis Agent is running",
            timestamp: new Date().toISOString(),
            function: "botanicalAnalysisAgent"
        });
        return;
    }
    if (req.method !== "POST") {
        res.status(405).json({ error: "Method not allowed" });
        return;
    }
    try {
        const ip = ((_b = (_a = req.headers['x-forwarded-for']) === null || _a === void 0 ? void 0 : _a.split(',')[0]) === null || _b === void 0 ? void 0 : _b.trim()) || req.socket.remoteAddress || 'unknown';
        if (!checkRateLimit(ip, 'botanicalAnalysisAgent')) {
            res.status(429).json({ error: 'Rate limit exceeded' });
            return;
        }
        const { imageBase64 } = req.body;
        if (!imageBase64) {
            res.status(400).json({ error: "Missing imageBase64 parameter" });
            return;
        }
        // Remove data URL prefix if present
        const cleanBase64 = imageBase64.replace(/^data:image\/[a-z]+;base64,/, "");
        // Use modular prompt from prompts.ts
        const prompt = prompts_1.botanicalAnalysisPrompt;
        const result = await callGeminiVisionAPI(prompt, cleanBase64);
        // Try to parse the JSON response
        let botanicalData;
        try {
            // Clean the result in case there's extra text around the JSON
            const jsonMatch = result.match(/\[[\s\S]*\]/);
            const jsonString = jsonMatch ? jsonMatch[0] : result;
            botanicalData = JSON.parse(jsonString);
        }
        catch (parseError) {
            // If JSON parsing fails, create a fallback response
            functions.logger.warn("Failed to parse JSON from Gemini response, using fallback");
            botanicalData = [
                {
                    name: "Unknown floral specimen",
                    color: "Varied",
                    emotion: "Natural beauty",
                    symbolism: "Life and growth",
                    svgSchematic: "M50,50 m-20,0 a20,20 0 1,0 40,0 a20,20 0 1,0 -40,0",
                    emotionalImpactScore: 5
                }
            ];
        }
        res.status(200).json({
            success: true,
            botanicalMetadata: botanicalData,
            rawAnalysis: result
        });
    }
    catch (error) {
        functions.logger.error("Error in botanicalAnalysisAgent:", error);
        if (process.env.SENTRY_DSN)
            Sentry.captureException(error);
        res.status(500).json({
            error: "Botanical analysis failed",
            details: error instanceof Error ? error.message : "Unknown error"
        });
    }
});
/**
 * logicEngineAgent - Process botanical metadata into emotional grammar
 * Input: BotanicalMetadata
 * Output: EmotionalTags & storytelling logic
 * Model: Gemini 2.5 Flash
 */
exports.logicEngineAgent = functions.runWith({ memory: '1GB' }).https.onRequest(async (req, res) => {
    var _a, _b;
    // Enable CORS
    res.set("Access-Control-Allow-Origin", "*");
    res.set("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    res.set("Access-Control-Allow-Headers", "Content-Type");
    if (req.method === "OPTIONS") {
        res.status(200).send();
        return;
    }
    if (req.method === "GET") {
        res.status(200).json({
            status: "online",
            message: "Logic Engine Agent is running",
            timestamp: new Date().toISOString(),
            function: "logicEngineAgent"
        });
        return;
    }
    if (req.method !== "POST") {
        res.status(405).json({ error: "Method not allowed" });
        return;
    }
    try {
        const ip = ((_b = (_a = req.headers['x-forwarded-for']) === null || _a === void 0 ? void 0 : _a.split(',')[0]) === null || _b === void 0 ? void 0 : _b.trim()) || req.socket.remoteAddress || 'unknown';
        if (!checkRateLimit(ip, 'logicEngineAgent')) {
            res.status(429).json({ error: 'Rate limit exceeded' });
            return;
        }
        const { botanicalData } = req.body;
        if (!botanicalData) {
            res.status(400).json({ error: "Missing botanicalData parameter" });
            return;
        }
        const apiKey = process.env.GEMINI_API_KEY || "";
        const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;
        const requestBody = {
            contents: [
                {
                    parts: [
                        {
                            text: `${prompts_1.logicEnginePrompt}

Input botanical metadata: ${JSON.stringify(botanicalData, null, 2)}`
                        }
                    ]
                }
            ],
            generationConfig: {
                temperature: 0.3,
                topK: 32,
                topP: 1,
                maxOutputTokens: 4096,
            }
        };
        const response = await fetch(endpoint, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify(requestBody),
        });
        if (!response.ok) {
            throw new Error(`Logic Engine API error: ${response.status}`);
        }
        const data = await response.json();
        const result = data.candidates[0].content.parts[0].text;
        // Parse JSON response
        let emotionalData;
        try {
            const jsonMatch = result.match(/\{[\s\S]*\}/);
            const jsonString = jsonMatch ? jsonMatch[0] : result;
            emotionalData = JSON.parse(jsonString);
        }
        catch (parseError) {
            emotionalData = {
                tags: ["natural beauty", "emotional resonance"],
                tone: "contemplative",
                gesture: "gentle arrangement",
                season: "universal",
                story: "A botanical element that carries deep emotional meaning.",
                score: 0.7
            };
        }
        res.status(200).json({
            success: true,
            emotionalGrammar: emotionalData,
            rawAnalysis: result
        });
    }
    catch (error) {
        functions.logger.error("Error in logicEngineAgent:", error);
        if (process.env.SENTRY_DSN)
            Sentry.captureException(error);
        res.status(500).json({
            error: "Emotional grammar processing failed",
            details: error instanceof Error ? error.message : "Unknown error"
        });
    }
});
/**
 * florosAgent - Generate manufacturable blueprint from emotional grammar
 * Input: EmotionalTags & context
 * Output: Manufacturing blueprint
 * Model: Gemini 2.5 Flash
 */
exports.florosAgent = functions.runWith({ memory: '1GB' }).https.onRequest(async (req, res) => {
    var _a, _b;
    // Enable CORS
    res.set("Access-Control-Allow-Origin", "*");
    res.set("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    res.set("Access-Control-Allow-Headers", "Content-Type");
    if (req.method === "OPTIONS") {
        res.status(200).send();
        return;
    }
    if (req.method === "GET") {
        res.status(200).json({
            status: "online",
            message: "Floros Blueprint Agent is running",
            timestamp: new Date().toISOString(),
            function: "florosAgent"
        });
        return;
    }
    if (req.method !== "POST") {
        res.status(405).json({ error: "Method not allowed" });
        return;
    }
    try {
        const ip = ((_b = (_a = req.headers['x-forwarded-for']) === null || _a === void 0 ? void 0 : _a.split(',')[0]) === null || _b === void 0 ? void 0 : _b.trim()) || req.socket.remoteAddress || 'unknown';
        if (!checkRateLimit(ip, 'florosAgent')) {
            res.status(429).json({ error: 'Rate limit exceeded' });
            return;
        }
        const { emotionalGrammar } = req.body;
        if (!emotionalGrammar) {
            res.status(400).json({ error: "Missing emotionalGrammar parameter" });
            return;
        }
        const apiKey = process.env.GEMINI_API_KEY || "";
        const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;
        const requestBody = {
            contents: [
                {
                    parts: [
                        {
                            text: `${prompts_1.florosAgentPrompt}

Input emotional grammar: ${JSON.stringify(emotionalGrammar, null, 2)}`
                        }
                    ]
                }
            ],
            generationConfig: {
                temperature: 0.4,
                topK: 32,
                topP: 1,
                maxOutputTokens: 4096,
            }
        };
        const response = await fetch(endpoint, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify(requestBody),
        });
        if (!response.ok) {
            throw new Error(`Floros Agent API error: ${response.status}`);
        }
        const data = await response.json();
        const result = data.candidates[0].content.parts[0].text;
        // Parse JSON response
        let blueprintData;
        try {
            const jsonMatch = result.match(/\{[\s\S]*\}/);
            const jsonString = jsonMatch ? jsonMatch[0] : result;
            blueprintData = JSON.parse(jsonString);
        }
        catch (parseError) {
            blueprintData = {
                layout: "centered arrangement with natural flow",
                overlay: "seasonal botanical styling",
                instructions: ["Prepare base structure", "Arrange primary elements", "Add seasonal accents"],
                materials: ["Primary floral elements", "Supporting greenery", "Seasonal accents"],
                impact: "A beautiful floral arrangement with emotional resonance"
            };
        }
        res.status(200).json({
            success: true,
            blueprint: blueprintData,
            rawAnalysis: result
        });
    }
    catch (error) {
        functions.logger.error("Error in florosAgent:", error);
        if (process.env.SENTRY_DSN)
            Sentry.captureException(error);
        res.status(500).json({
            error: "Blueprint generation failed",
            details: error instanceof Error ? error.message : "Unknown error"
        });
    }
});
/**
 * fallbackAgent - Handle incomplete or malformed metadata
 * Input: Partial/malformed data
 * Output: Reconstructed metadata
 * Model: Gemini 2.5 Flash
 */
exports.fallbackAgent = functions.runWith({ memory: '1GB' }).https.onRequest(async (req, res) => {
    var _a, _b;
    // Enable CORS
    res.set("Access-Control-Allow-Origin", "*");
    res.set("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    res.set("Access-Control-Allow-Headers", "Content-Type");
    if (req.method === "OPTIONS") {
        res.status(200).send();
        return;
    }
    if (req.method === "GET") {
        res.status(200).json({
            status: "online",
            message: "Fallback Recovery Agent is running",
            timestamp: new Date().toISOString(),
            function: "fallbackAgent"
        });
        return;
    }
    if (req.method !== "POST") {
        res.status(405).json({ error: "Method not allowed" });
        return;
    }
    try {
        const ip = ((_b = (_a = req.headers['x-forwarded-for']) === null || _a === void 0 ? void 0 : _a.split(',')[0]) === null || _b === void 0 ? void 0 : _b.trim()) || req.socket.remoteAddress || 'unknown';
        if (!checkRateLimit(ip, 'fallbackAgent')) {
            res.status(429).json({ error: 'Rate limit exceeded' });
            return;
        }
        const { partialData, context } = req.body;
        if (!partialData) {
            res.status(400).json({ error: "Missing partialData parameter" });
            return;
        }
        const apiKey = process.env.GEMINI_API_KEY || "";
        const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;
        const requestBody = {
            contents: [
                {
                    parts: [
                        {
                            text: `${prompts_1.fallbackAgentPrompt}

Partial/incomplete data: ${JSON.stringify(partialData, null, 2)}
Context: ${context || "No additional context provided"}`
                        }
                    ]
                }
            ],
            generationConfig: {
                temperature: 0.2,
                topK: 32,
                topP: 1,
                maxOutputTokens: 4096,
            }
        };
        const response = await fetch(endpoint, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify(requestBody),
        });
        if (!response.ok) {
            throw new Error(`Fallback Agent API error: ${response.status}`);
        }
        const data = await response.json();
        const result = data.candidates[0].content.parts[0].text;
        // Parse JSON response
        let recoveredData;
        try {
            const jsonMatch = result.match(/\{[\s\S]*\}/);
            const jsonString = jsonMatch ? jsonMatch[0] : result;
            recoveredData = JSON.parse(jsonString);
        }
        catch (parseError) {
            recoveredData = {
                name: "Botanical specimen",
                emotion: "natural beauty",
                symbolism: "life and growth",
                score: {
                    clarity: 0.5,
                    resonance: 0.5,
                    manufacturability: 0.7
                }
            };
        }
        res.status(200).json({
            success: true,
            recoveredData: recoveredData,
            rawAnalysis: result
        });
    }
    catch (error) {
        functions.logger.error("Error in fallbackAgent:", error);
        if (process.env.SENTRY_DSN)
            Sentry.captureException(error);
        res.status(500).json({
            error: "Fallback recovery failed",
            details: error instanceof Error ? error.message : "Unknown error"
        });
    }
});
// GPT API Helper Function from specification file
async function callGPTWithPrompt(prompt) {
    const apiKey = process.env.OPENAI_API_KEY || "";
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${apiKey}`
        },
        body: JSON.stringify({
            model: 'gpt-4o',
            messages: [{ role: 'user', content: prompt }],
            temperature: 0.7
        })
    });
    return await response.json();
}
exports.callGPTWithPrompt = callGPTWithPrompt;
// Full Wreath Pipeline from specification file
exports.fullWreathPipeline = functions.https.onRequest(async (req, res) => {
    var _a, _b, _c;
    // Enable CORS
    res.set("Access-Control-Allow-Origin", "*");
    res.set("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    res.set("Access-Control-Allow-Headers", "Content-Type");
    if (req.method === "OPTIONS") {
        res.status(200).send();
        return;
    }
    if (req.method !== "POST") {
        res.status(405).json({ error: "Method not allowed" });
        return;
    }
    const { memory, inventory, styleProfile } = req.body;
    try {
        const florosInput = `${prompts_1.florosPrompt}\n\nMemory:\n${memory}\nInventory:\n${JSON.stringify(inventory)}\nStyle:\n${JSON.stringify(styleProfile)}`;
        const florosResult = await callGPTWithPrompt(florosInput);
        const blueprint = ((_c = (_b = (_a = florosResult === null || florosResult === void 0 ? void 0 : florosResult.choices) === null || _a === void 0 ? void 0 : _a[0]) === null || _b === void 0 ? void 0 : _b.message) === null || _c === void 0 ? void 0 : _c.content) || '{}';
        const echoInput = `${prompts_1.echoStemPrompt}\n\nBlueprint:\n${blueprint}\nInventory:\n${JSON.stringify(inventory)}`;
        const echoResult = await callGPTWithPrompt(echoInput);
        const sketchInput = `${prompts_1.sketchAuraPrompt}\n\nMemory:\n${memory}\nStyle:\n${JSON.stringify(styleProfile)}`;
        const sketchResult = await callGPTWithPrompt(sketchInput);
        const mythosInput = `${prompts_1.mythoscribePrompt}\n\nComponents:\n${blueprint}`;
        const mythosResult = await callGPTWithPrompt(mythosInput);
        const buildInput = `${prompts_1.buildBloomPrompt}\n\nBlueprint:\n${blueprint}`;
        const buildResult = await callGPTWithPrompt(buildInput);
        res.status(200).send({
            blueprint,
            suggestions: echoResult,
            schematic: sketchResult,
            narrative: mythosResult,
            manufacturing: buildResult
        });
    }
    catch (error) {
        console.error('Wreath pipeline error:', error);
        if (process.env.SENTRY_DSN)
            Sentry.captureException(error);
        res.status(500).send({ error: 'Pipeline failed', details: error });
    }
});
/**
 * generateThumbnail - Create a cached 320px thumbnail for a storage object and update Firestore doc
 * Input: { storagePath: string, docPath: string }
 * Output: { thumbUrl: string }
 */
exports.generateThumbnail = functions.runWith({ memory: '1GB' }).https.onRequest(async (req, res) => {
    var _a, _b;
    // CORS
    res.set("Access-Control-Allow-Origin", "*");
    res.set("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    res.set("Access-Control-Allow-Headers", "Content-Type");
    if (req.method === 'OPTIONS') {
        res.status(200).send();
        return;
    }
    if (req.method !== 'POST') {
        res.status(405).json({ error: 'Method not allowed' });
        return;
    }
    const ip = ((_b = (_a = req.headers['x-forwarded-for']) === null || _a === void 0 ? void 0 : _a.split(',')[0]) === null || _b === void 0 ? void 0 : _b.trim()) || req.socket.remoteAddress || 'unknown';
    if (!checkRateLimit(ip, 'generateThumbnail')) {
        res.status(429).json({ error: 'Rate limit exceeded' });
        return;
    }
    try {
        const { storagePath, docPath } = req.body || {};
        if (!storagePath) {
            res.status(400).json({ error: 'Missing storagePath' });
            return;
        }
        const bucket = admin.storage().bucket();
        const [fileExists] = await bucket.file(storagePath).exists();
        if (!fileExists) {
            res.status(404).json({ error: 'Source file not found' });
            return;
        }
        const srcFile = bucket.file(storagePath);
        const [srcBuffer] = await srcFile.download();
        // Resize to width 320, keep aspect ratio, output PNG
        const thumbBuffer = await sharp(srcBuffer).resize({ width: 320 }).png({ quality: 85 }).toBuffer();
        const thumbPath = storagePath.replace(/(\.[a-zA-Z0-9]+)?$/, (_m, _ext) => {
            return `_thumb_320.png`;
        });
        const thumbFile = bucket.file(thumbPath);
        const downloadToken = (0, uuid_1.v4)();
        await thumbFile.save(thumbBuffer, {
            metadata: {
                contentType: 'image/png',
                cacheControl: 'public, max-age=31536000, immutable',
                metadata: { firebaseStorageDownloadTokens: downloadToken }
            }
        });
        const bucketName = bucket.name;
        const encodedPath = encodeURIComponent(thumbPath);
        const thumbUrl = `https://firebasestorage.googleapis.com/v0/b/${bucketName}/o/${encodedPath}?alt=media&token=${downloadToken}`;
        if (docPath) {
            await admin.firestore().doc(docPath).set({ thumbUrl }, { merge: true });
        }
        functions.logger.info('Thumbnail generated', { storagePath, thumbPath, docPath });
        res.status(200).json({ success: true, thumbUrl, storagePath: thumbPath });
        return;
    }
    catch (error) {
        functions.logger.error('Error generating thumbnail', { error });
        if (process.env.SENTRY_DSN)
            Sentry.captureException(error);
        res.status(500).json({ error: 'Thumbnail generation failed', details: (error === null || error === void 0 ? void 0 : error.message) || 'Unknown error' });
        return;
    }
});
const prompts_2 = require("./prompts");
/**
 * stemIsolationAgent - Analyze bundle and generate isolation prompts
 * Input: { bundleImageBase64: string, mimeType: string, quantity?: number }
 * Output: StemIsolationOutput (analysis + prompts)
 * Model: Gemini 2.5 Flash
 */
exports.stemIsolationAgent = functions.runWith({ memory: '1GB' }).https.onRequest(async (req, res) => {
    var _a, _b;
    res.set("Access-Control-Allow-Origin", "*");
    res.set("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    res.set("Access-Control-Allow-Headers", "Content-Type");
    if (req.method === "OPTIONS") {
        res.status(200).send();
        return;
    }
    if (req.method !== "POST") {
        res.status(405).json({ error: "Method not allowed" });
        return;
    }
    try {
        const ip = ((_b = (_a = req.headers['x-forwarded-for']) === null || _a === void 0 ? void 0 : _a.split(',')[0]) === null || _b === void 0 ? void 0 : _b.trim()) || req.socket.remoteAddress || 'unknown';
        if (!checkRateLimit(ip, 'stemIsolationAgent')) {
            res.status(429).json({ error: 'Rate limit exceeded' });
            return;
        }
        const { bundleImageBase64, imageUrl } = req.body;
        if (!bundleImageBase64 && !imageUrl) {
            res.status(400).json({ error: "Missing bundleImageBase64 or imageUrl" });
            return;
        }
        let imageBufferBase64 = "";
        if (bundleImageBase64) {
            imageBufferBase64 = bundleImageBase64.replace(/^data:image\/[a-zA-Z0-9+.-]+;base64,/, "").replace(/[\s\n\r]/g, "");
        }
        else if (imageUrl) {
            // Fetch server-side to bypass CORS
            try {
                const fetch = (await Promise.resolve().then(() => require('node-fetch'))).default;
                const imageRes = await fetch(imageUrl);
                if (!imageRes.ok)
                    throw new Error(`Failed to fetch image: ${imageRes.statusText}`);
                const arrayBuffer = await imageRes.arrayBuffer();
                imageBufferBase64 = Buffer.from(arrayBuffer).toString('base64');
            }
            catch (e) {
                functions.logger.error("Server-side image fetch failed", { imageUrl, error: e });
                res.status(400).json({ error: "Failed to fetch remote image", details: e instanceof Error ? e.message : "Unknown error" });
                return;
            }
        }
        // 1. Analyze with Gemini Vision
        const analysisJsonString = await callGeminiVisionAPI(prompts_2.stemIsolationPrompt, imageBufferBase64);
        // Parse the JSON response
        let analysis;
        try {
            const jsonMatch = analysisJsonString.match(/\{[\s\S]*\}/);
            if (!jsonMatch)
                throw new Error("No JSON found in response");
            analysis = JSON.parse(jsonMatch[0]);
        }
        catch (e) {
            functions.logger.error("Failed to parse stem isolation analysis", { response: analysisJsonString });
            throw new Error("Failed to parse flower analysis");
        }
        // 2. Generate Prompts (Logic moved from client)
        const basePrompt = `A single ${analysis.variety} stem, ${analysis.color}, ${analysis.style} style, ${analysis.lighting}, ${analysis.stemDescription}, on a pure transparent background, high detail, product photography, isolated element for digital design`;
        const midjourneyPrompt = `${basePrompt} --style raw --ar 3:4 --q 2`;
        const dallePrompt = `Professional product photo of a single ${analysis.variety} flower stem. 
Color: ${analysis.color}. 
Style: ${analysis.style}, studio lighting from ${analysis.lighting}.
The stem should show ${analysis.stemDescription}.
Isolated on a clean white background, suitable for digital design cutout.
High resolution, detailed, professional botanical photography.`;
        const generatedPrompt = basePrompt;
        res.status(200).json({
            flowerAnalysis: analysis,
            generatedPrompt,
            midjourneyPrompt,
            dallePrompt
        });
    }
    catch (error) {
        functions.logger.error("Error in stemIsolationAgent:", error);
        if (process.env.SENTRY_DSN)
            Sentry.captureException(error);
        res.status(500).json({
            error: "Stem isolation analysis failed",
            details: error instanceof Error ? error.message : "Unknown error"
        });
    }
});
//# sourceMappingURL=index.js.map