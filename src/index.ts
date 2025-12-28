import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import { Request, Response } from "express";
import * as Sentry from "@sentry/node";
import { v4 as uuidv4 } from "uuid";
// eslint-disable-next-line @typescript-eslint/no-var-requires
const sharp = require("sharp");
import {
  botanicalAnalysisPrompt,
  logicEnginePrompt,
  florosAgentPrompt,
  fallbackAgentPrompt,
  florosPrompt,
  echoStemPrompt,
  sketchAuraPrompt,
  mythoscribePrompt,
  buildBloomPrompt
} from './prompts';

// Use require for node-fetch to match commonjs module target
const fetch = require("node-fetch");

// Initialize Firebase Admin
admin.initializeApp();

export * from './blueprintOrchestrator';


// Initialize Sentry (no-op if DSN not set)
if (process.env.SENTRY_DSN) {
  Sentry.init({ dsn: process.env.SENTRY_DSN });
}

// Basic in-memory token bucket rate limiter per IP per function
type Bucket = { tokens: number; lastRefill: number };
const RATE_LIMIT_RPM = Number(process.env.RATE_LIMIT_RPM || 60); // requests/minute
const buckets: Record<string, Bucket> = {};
function checkRateLimit(ip: string, key: string): boolean {
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

// Types for the botanical analysis
type Range = { min: number; ideal: number; max: number };

interface BotanicalInventoryProfile {
  physical: {
    dimensionsInches: { length: number; width: number; depth: number };
    weightLbs: number;
    materials: string[];
    flexibility: string;
    durabilityClass: string;
  };
  spatial: {
    placementInches: { x: Range; y: Range; z: Range };
    rotationDegrees: { x: Range; y: Range; z: Range };
    bestViewingSides: string[];
    avoidSides: string[];
    scalingLimits: { minScale: number; maxScale: number };
    wreathPlacement: { clockPosition: string; radialDistanceInches: Range; angleFromPlaneDegrees: Range; compatibleWreathSizes: string };
    arrangementContexts: { vase: string; centerpiece: string; wall: string };
    photography: { cameraDistanceInches: number; anglesDegrees: number[]; lighting: string; renderDimensions: { width: number; height: number } };
    rationale: string;
  };
  aesthetic: { colorPalette: Array<{ hex: string; percentage: number }>; colorTemperature: string; contrastLevel: string; styleTags: string[]; symmetry: string; movement: string; density: string; focalPoints: string[] };
  emotional: { moodSpectrum: string[]; energyLevel: number; sophistication: string; versatilityScore: number };
  application: { useCases: Array<{ category: string; fitScore: number; specificApplications: string[] }>; seasonalAlignment: string[] };
  market: { targetSegments: string[]; psychographics: string[]; priceTier: string; pairingCompatibility: { worksWith: string[]; avoidWith: string[] }; seoKeywords: string[] };
}

interface BotanicalMetadata {
  name: string;
  inventoryProfile: BotanicalInventoryProfile;
}

interface GeminiVisionResponse {
  candidates: Array<{
    content: {
      parts: Array<{
        text: string;
      }>;
    };
  }>;
}

// Helper function to call Gemini 1.5 Flash Vision API
async function callGeminiVisionAPI(
  prompt: string,
  imageBase64: string
): Promise<string> {
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

    const data = await response.json() as GeminiVisionResponse;

    if (!data.candidates || !data.candidates[0]?.content?.parts?.[0]?.text) {
      throw new Error("Invalid response from Gemini API");
    }

    return data.candidates[0].content.parts[0].text;
  } catch (error) {
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
export const clearStemAgent = functions.runWith({ memory: '1GB' }).https.onRequest(async (req: Request, res: Response) => {
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
    const ip = (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() || req.socket.remoteAddress || 'unknown';
    if (!checkRateLimit(ip, 'clearStemAgent')) { res.status(429).json({ error: 'Rate limit exceeded' }); return; }
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
    let base64String: string | null = null;
    let removeBgError: string | null = null;

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
          headers: {
            'X-Api-Key': removeBgApiKey,
            ...formData.getHeaders(),
          },
          body: formData,
        });

        if (!response.ok) {
          const errorText = await response.text();
          let errorMessage = `Request failed with status ${response.status}`;
          try {
            const errorData = JSON.parse(errorText);
            errorMessage = errorData?.errors?.[0]?.title || errorMessage;
          } catch (e) {
            if (errorText.length < 200) errorMessage = errorText;
          }
          removeBgError = `remove.bg: ${errorMessage}`;
          functions.logger.warn("remove.bg failed, trying Gemini fallback", { error: removeBgError });
        } else {
          const imageBuffer = await response.arrayBuffer();
          base64String = Buffer.from(imageBuffer).toString('base64');
        }
      } catch (e) {
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

  } catch (error) {
    functions.logger.error("Error in clearStemAgent:", error);
    if (process.env.SENTRY_DSN) Sentry.captureException(error);
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
export const botanicalAnalysisAgent = functions.runWith({ memory: '1GB' }).https.onRequest(async (req: Request, res: Response) => {
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
    const ip = (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() || req.socket.remoteAddress || 'unknown';
    if (!checkRateLimit(ip, 'botanicalAnalysisAgent')) { res.status(429).json({ error: 'Rate limit exceeded' }); return; }
    const { imageBase64 } = req.body;

    if (!imageBase64) {
      res.status(400).json({ error: "Missing imageBase64 parameter" });
      return;
    }

    // Remove data URL prefix if present
    const cleanBase64 = imageBase64.replace(/^data:image\/[a-z]+;base64,/, "");

    // Use modular prompt from prompts.ts
    const prompt = botanicalAnalysisPrompt;

    const result = await callGeminiVisionAPI(prompt, cleanBase64);

    // Try to parse the JSON response
    let botanicalData: BotanicalMetadata[];
    try {
      // Clean the result in case there's extra text around the JSON
      const jsonMatch = result.match(/\[[\s\S]*\]/);
      const jsonString = jsonMatch ? jsonMatch[0] : result;
      botanicalData = JSON.parse(jsonString);
    } catch (parseError) {
      // If JSON parsing fails, create a fallback response
      functions.logger.warn("Failed to parse JSON from Gemini response, using fallback");
      botanicalData = [
        {
          name: "Unknown botanical",
          inventoryProfile: {
            physical: {
              dimensionsInches: { length: 5, width: 5, depth: 3 },
              weightLbs: 0.3,
              materials: ["polyester"],
              flexibility: "medium",
              durabilityClass: "standard"
            },
            spatial: {
              placementInches: {
                x: { min: -1, ideal: 0, max: 1 },
                y: { min: -1, ideal: 0, max: 1 },
                z: { min: -1, ideal: 0, max: 1 }
              },
              rotationDegrees: {
                x: { min: -15, ideal: 0, max: 15 },
                y: { min: -15, ideal: 0, max: 15 },
                z: { min: -45, ideal: 0, max: 45 }
              },
              bestViewingSides: ["front"],
              avoidSides: [],
              scalingLimits: { minScale: 0.8, maxScale: 1.2 },
              wreathPlacement: {
                clockPosition: "10-2 arc",
                radialDistanceInches: { min: 2, ideal: 3, max: 4 },
                angleFromPlaneDegrees: { min: -10, ideal: 10, max: 25 },
                compatibleWreathSizes: "12-24 inch"
              },
              arrangementContexts: { vase: "upright rim or offset", centerpiece: "clustered accent", wall: "angled slightly outward" },
              photography: { cameraDistanceInches: 36, anglesDegrees: [0, 15, 45], lighting: "soft diffused", renderDimensions: { width: 1200, height: 1200 } },
              rationale: "Fallback inventory profile"
            },
            aesthetic: {
              colorPalette: [{ hex: "#6B7280", percentage: 60 }, { hex: "#9CA3AF", percentage: 40 }],
              colorTemperature: "neutral",
              contrastLevel: "medium",
              styleTags: ["neutral"],
              symmetry: "balanced",
              movement: "radiate",
              density: "medium",
              focalPoints: ["center"]
            },
            emotional: { moodSpectrum: ["calm", "steady"], energyLevel: 0.4, sophistication: "medium", versatilityScore: 0.6 },
            application: { useCases: [{ category: "memorial", fitScore: 0.7, specificApplications: ["general tribute"] }], seasonalAlignment: ["year-round"] },
            market: { targetSegments: ["general"], psychographics: ["comfort-seeking"], priceTier: "mid", pairingCompatibility: { worksWith: ["greenery"], avoidWith: [] }, seoKeywords: ["faux floral"] }
          }
        }
      ];
    }

    res.status(200).json({
      success: true,
      botanicalMetadata: botanicalData,
      rawAnalysis: result
    });

  } catch (error) {
    functions.logger.error("Error in botanicalAnalysisAgent:", error);
    if (process.env.SENTRY_DSN) Sentry.captureException(error);
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
export const logicEngineAgent = functions.runWith({ memory: '1GB' }).https.onRequest(async (req: Request, res: Response) => {
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
    const ip = (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() || req.socket.remoteAddress || 'unknown';
    if (!checkRateLimit(ip, 'logicEngineAgent')) { res.status(429).json({ error: 'Rate limit exceeded' }); return; }
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
              text: `${logicEnginePrompt}

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

    const data = await response.json() as GeminiVisionResponse;
    const result = data.candidates[0].content.parts[0].text;

    // Parse JSON response
    let emotionalData;
    try {
      const jsonMatch = result.match(/\{[\s\S]*\}/);
      const jsonString = jsonMatch ? jsonMatch[0] : result;
      emotionalData = JSON.parse(jsonString);
    } catch (parseError) {
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

  } catch (error) {
    functions.logger.error("Error in logicEngineAgent:", error);
    if (process.env.SENTRY_DSN) Sentry.captureException(error);
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
export const florosAgent = functions.runWith({ memory: '1GB' }).https.onRequest(async (req: Request, res: Response) => {
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
    const ip = (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() || req.socket.remoteAddress || 'unknown';
    if (!checkRateLimit(ip, 'florosAgent')) { res.status(429).json({ error: 'Rate limit exceeded' }); return; }
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
              text: `${florosAgentPrompt}

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

    const data = await response.json() as GeminiVisionResponse;
    const result = data.candidates[0].content.parts[0].text;

    // Parse JSON response
    let blueprintData;
    try {
      const jsonMatch = result.match(/\{[\s\S]*\}/);
      const jsonString = jsonMatch ? jsonMatch[0] : result;
      blueprintData = JSON.parse(jsonString);
    } catch (parseError) {
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

  } catch (error) {
    functions.logger.error("Error in florosAgent:", error);
    if (process.env.SENTRY_DSN) Sentry.captureException(error);
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
export const fallbackAgent = functions.runWith({ memory: '1GB' }).https.onRequest(async (req: Request, res: Response) => {
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
    const ip = (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() || req.socket.remoteAddress || 'unknown';
    if (!checkRateLimit(ip, 'fallbackAgent')) { res.status(429).json({ error: 'Rate limit exceeded' }); return; }
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
              text: `${fallbackAgentPrompt}

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

    const data = await response.json() as GeminiVisionResponse;
    const result = data.candidates[0].content.parts[0].text;

    // Parse JSON response
    let recoveredData;
    try {
      const jsonMatch = result.match(/\{[\s\S]*\}/);
      const jsonString = jsonMatch ? jsonMatch[0] : result;
      recoveredData = JSON.parse(jsonString);
    } catch (parseError) {
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

  } catch (error) {
    functions.logger.error("Error in fallbackAgent:", error);
    if (process.env.SENTRY_DSN) Sentry.captureException(error);
    res.status(500).json({
      error: "Fallback recovery failed",
      details: error instanceof Error ? error.message : "Unknown error"
    });
  }
});

// GPT API Helper Function from specification file
export async function callGPTWithPrompt(prompt: string) {
  const apiKey = process.env.OPENAI_API_KEY || "";
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: 'gpt-4o', // Using gpt-4o instead of non-existent gpt-5-pro
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.7
    })
  });
  return await response.json();
}

// Full Wreath Pipeline from specification file
export const fullWreathPipeline = functions.https.onRequest(async (req: Request, res: Response) => {
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
    const florosInput = `${florosPrompt}\n\nMemory:\n${memory}\nInventory:\n${JSON.stringify(inventory)}\nStyle:\n${JSON.stringify(styleProfile)}`;
    const florosResult = await callGPTWithPrompt(florosInput);

    const blueprint = florosResult?.choices?.[0]?.message?.content || '{}';

    const echoInput = `${echoStemPrompt}\n\nBlueprint:\n${blueprint}\nInventory:\n${JSON.stringify(inventory)}`;
    const echoResult = await callGPTWithPrompt(echoInput);

    const sketchInput = `${sketchAuraPrompt}\n\nMemory:\n${memory}\nStyle:\n${JSON.stringify(styleProfile)}`;
    const sketchResult = await callGPTWithPrompt(sketchInput);

    const mythosInput = `${mythoscribePrompt}\n\nComponents:\n${blueprint}`;
    const mythosResult = await callGPTWithPrompt(mythosInput);

    const buildInput = `${buildBloomPrompt}\n\nBlueprint:\n${blueprint}`;
    const buildResult = await callGPTWithPrompt(buildInput);

    res.status(200).send({
      blueprint,
      suggestions: echoResult,
      schematic: sketchResult,
      narrative: mythosResult,
      manufacturing: buildResult
    });
  } catch (error) {
    console.error('Wreath pipeline error:', error);
    if (process.env.SENTRY_DSN) Sentry.captureException(error);
    res.status(500).send({ error: 'Pipeline failed', details: error });
  }
});

/**
 * generateThumbnail - Create a cached 320px thumbnail for a storage object and update Firestore doc
 * Input: { storagePath: string, docPath: string }
 * Output: { thumbUrl: string }
 */
export const generateThumbnail = functions.runWith({ memory: '1GB' }).https.onRequest(async (req: Request, res: Response) => {
  // CORS
  res.set("Access-Control-Allow-Origin", "*");
  res.set("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.set("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === 'OPTIONS') { res.status(200).send(); return; }
  if (req.method !== 'POST') { res.status(405).json({ error: 'Method not allowed' }); return; }

  const ip = (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() || req.socket.remoteAddress || 'unknown';
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
    if (!fileExists) { res.status(404).json({ error: 'Source file not found' }); return; }

    const srcFile = bucket.file(storagePath);
    const [srcBuffer] = await srcFile.download();

    // Resize to width 320, keep aspect ratio, output PNG
    const thumbBuffer = await sharp(srcBuffer).resize({ width: 320 }).png({ quality: 85 }).toBuffer();

    const thumbPath = storagePath.replace(/(\.[a-zA-Z0-9]+)?$/, (_m: string, _ext: string) => {
      return `_thumb_320.png`;
    });
    const thumbFile = bucket.file(thumbPath);
    const downloadToken = uuidv4();

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
  } catch (error) {
    functions.logger.error('Error generating thumbnail', { error });
    if (process.env.SENTRY_DSN) Sentry.captureException(error);
    res.status(500).json({ error: 'Thumbnail generation failed', details: (error as Error)?.message || 'Unknown error' });
    return;
  }
});

import { stemIsolationPrompt } from './prompts';

/**
 * stemIsolationAgent - Analyze bundle and generate isolation prompts
 * Input: { bundleImageBase64: string, mimeType: string, quantity?: number }
 * Output: StemIsolationOutput (analysis + prompts)
 * Model: Gemini 2.5 Flash
 */
export const stemIsolationAgent = functions.runWith({ memory: '1GB' }).https.onRequest(async (req: Request, res: Response) => {
  res.set("Access-Control-Allow-Origin", "*");
  res.set("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.set("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    res.status(200).send();
    return;
  }
  if (req.method !== "POST") { res.status(405).json({ error: "Method not allowed" }); return; }

  try {
    const ip = (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() || req.socket.remoteAddress || 'unknown';
    if (!checkRateLimit(ip, 'stemIsolationAgent')) { res.status(429).json({ error: 'Rate limit exceeded' }); return; }

    const { bundleImageBase64, imageUrl } = req.body;

    if (!bundleImageBase64 && !imageUrl) {
      res.status(400).json({ error: "Missing bundleImageBase64 or imageUrl" });
      return;
    }

    let imageBufferBase64 = "";

    if (bundleImageBase64) {
      imageBufferBase64 = bundleImageBase64.replace(/^data:image\/[a-zA-Z0-9+.-]+;base64,/, "").replace(/[\s\n\r]/g, "");
    } else if (imageUrl) {
      // Fetch server-side to bypass CORS
      try {
        const fetch = (await import('node-fetch')).default;
        const imageRes = await fetch(imageUrl, {
          headers: {
            "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
            "Accept": "image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8"
          }
        });
        if (!imageRes.ok) throw new Error(`Failed to fetch image: ${imageRes.statusText}`);
        const arrayBuffer = await imageRes.arrayBuffer();
        imageBufferBase64 = Buffer.from(arrayBuffer).toString('base64');
      } catch (e) {
        functions.logger.error("Server-side image fetch failed", { imageUrl, error: e });
        res.status(400).json({ error: "Failed to fetch remote image", details: e instanceof Error ? e.message : "Unknown error" });
        return;
      }
    }

    // 1. Analyze with Gemini Vision
    const analysisJsonString = await callGeminiVisionAPI(stemIsolationPrompt, imageBufferBase64);

    // Parse the JSON response
    let analysis;
    try {
      const jsonMatch = analysisJsonString.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error("No JSON found in response");
      analysis = JSON.parse(jsonMatch[0]);
    } catch (e) {
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

  } catch (error) {
    functions.logger.error("Error in stemIsolationAgent:", error);
    if (process.env.SENTRY_DSN) Sentry.captureException(error);
    res.status(500).json({
      error: "Stem isolation analysis failed",
      details: error instanceof Error ? error.message : "Unknown error"
    });
  }
});