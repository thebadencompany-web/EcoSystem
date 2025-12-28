
import React, { useState } from 'react';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { WreathBlueprint } from '../types';
import { BlueprintRenderer } from './BlueprintRenderer';

interface BlueprintGeneratorProps {
    onBlueprintGenerated?: (blueprint: WreathBlueprint) => void;
    inventoryCount: number;
}

export const BlueprintGenerator: React.FC<BlueprintGeneratorProps> = ({ onBlueprintGenerated, inventoryCount }) => {
    const [story, setStory] = useState('');
    const [season, setSeason] = useState('Spring');
    const [diameter, setDiameter] = useState(24);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [generatedBlueprint, setGeneratedBlueprint] = useState<WreathBlueprint | null>(null);

    const handleGenerate = async () => {
        if (!story.trim()) {
            setError("Please tell us a story or memory.");
            return;
        }
        setLoading(true);
        setError(null);
        setGeneratedBlueprint(null);

        const functions = getFunctions();
        const generateWreathBlueprint = httpsCallable(functions, 'generateWreathBlueprint');

        try {
            const result = await generateWreathBlueprint({
                userStory: story,
                season: season,
                wreathDiameter: diameter
            });

            const { success, blueprint } = result.data as any;
            if (success && blueprint) {
                setGeneratedBlueprint(blueprint);
                if (onBlueprintGenerated) onBlueprintGenerated(blueprint);
            } else {
                throw new Error("Invalid response from server.");
            }
        } catch (err: any) {
            console.error("Generation Error:", err);
            setError(err.message || "Failed to generate blueprint. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 max-w-4xl mx-auto">
            <div className="mb-8 border-b border-gray-100 pb-6">
                <h2 className="text-2xl font-serif text-gray-900 mb-2">The Blueprint Studio</h2>
                <p className="text-gray-500 font-light">
                    Tell us a memory, and our 5-Agent Assembly Line will engineer a manufacturable wreath blueprint.
                </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <div className="md:col-span-2 space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Your Story / Memory</label>
                        <textarea
                            value={story}
                            onChange={(e) => setStory(e.target.value)}
                            placeholder="e.g. A sunrise over the Smoky Mountains with my grandmother, smelling of dew and wild honeysuckle..."
                            className="w-full h-32 rounded-lg border-gray-200 focus:ring-emerald-500 focus:border-emerald-500 resize-none p-3 text-sm"
                        />
                    </div>
                </div>

                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Season Context</label>
                        <select
                            value={season}
                            onChange={(e) => setSeason(e.target.value)}
                            className="w-full rounded-lg border-gray-200 focus:ring-emerald-500 focus:border-emerald-500 text-sm"
                        >
                            <option>Spring</option>
                            <option>Summer</option>
                            <option>Autumn</option>
                            <option>Winter</option>
                            <option>Holiday</option>
                            <option>Year-Round</option>
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Wreath Diameter</label>
                        <select
                            value={diameter}
                            onChange={(e) => setDiameter(Number(e.target.value))}
                            className="w-full rounded-lg border-gray-200 focus:ring-emerald-500 focus:border-emerald-500 text-sm"
                        >
                            <option value={18}>18 inches</option>
                            <option value={24}>24 inches</option>
                            <option value={30}>30 inches</option>
                            <option value={36}>36 inches</option>
                        </select>
                    </div>

                    <div className="pt-2">
                        <div className="text-xs text-gray-400 mb-2 flex justify-between">
                            <span>Inventory Access:</span>
                            <span className="font-medium text-gray-600">{inventoryCount} items</span>
                        </div>
                        <button
                            onClick={handleGenerate}
                            disabled={loading}
                            className={`w-full py-3 px-4 rounded-lg text-white font-medium shadow-sm transition-all
                  ${loading
                                    ? 'bg-gray-400 cursor-not-allowed'
                                    : 'bg-emerald-600 hover:bg-emerald-700 hover:shadow-md active:transform active:scale-95'
                                }`}
                        >
                            {loading ? (
                                <span className="flex items-center justify-center gap-2">
                                    <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                    </svg>
                                    Engineering...
                                </span>
                            ) : (
                                "Generate Blueprint"
                            )}
                        </button>
                    </div>
                </div>
            </div>

            {error && (
                <div className="mb-6 bg-red-50 border border-red-100 text-red-600 px-4 py-3 rounded-lg text-sm">
                    {error}
                </div>
            )}

            {/* RESULT DISPLAY */}
            {generatedBlueprint && (
                <div className="border-t border-gray-100 pt-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <div className="flex justify-between items-start mb-6">
                        <div>
                            <h3 className="text-xl font-serif text-gray-900">{generatedBlueprint.name}</h3>
                            <p className="text-sm text-gray-500 italic mt-1">{generatedBlueprint.description}</p>
                        </div>
                        <div className="text-right">
                            <span className="inline-block bg-emerald-100 text-emerald-800 text-xs px-2 py-1 rounded-full font-medium">
                                Methodology V1.0
                            </span>
                            <p className="text-xs text-gray-400 mt-1">ID: {generatedBlueprint.id}</p>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">

                        {/* LEFT COLUMN: SPECS */}
                        <div className="space-y-6">

                            {/* EMOTION */}
                            <div className="bg-gray-50 p-4 rounded-lg border border-gray-100">
                                <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Emotional Profile</h4>
                                <div className="flex flex-wrap gap-2 mb-3">
                                    <span className="px-2 py-1 bg-white border border-gray-200 rounded text-sm font-medium text-gray-700">
                                        Primary: {generatedBlueprint.emotionalProfile?.primaryEmotion}
                                    </span>
                                    <span className="px-2 py-1 bg-white border border-gray-200 rounded text-sm text-gray-600">
                                        Family: {generatedBlueprint.emotionalProfile?.emotionalFamily}
                                    </span>
                                </div>
                                <div className="grid grid-cols-2 gap-2 text-xs text-gray-500">
                                    <div>Texture: <span className="text-gray-900">{generatedBlueprint.emotionalProfile?.designGoals.texture}</span></div>
                                    <div>Density: <span className="text-gray-900">{generatedBlueprint.emotionalProfile?.designGoals.density}</span></div>
                                </div>
                            </div>

                            {/* COLOR */}
                            <div className="bg-gray-50 p-4 rounded-lg border border-gray-100">
                                <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Color Architecture (60-30-10)</h4>
                                <div className="space-y-2">
                                    {generatedBlueprint.colorPalette?.colors.map((c, i) => (
                                        <div key={i} className="flex items-center justify-between text-sm">
                                            <div className="flex items-center gap-2">
                                                <div className="w-4 h-4 rounded-full border border-gray-200 shadow-sm" style={{ backgroundColor: c.hex }}></div>
                                                <span className="font-medium text-gray-700">{c.name}</span>
                                            </div>
                                            <div className="flex items-center gap-3">
                                                <span className="text-xs text-gray-400 uppercase">{c.role}</span>
                                                <span className="font-mono text-gray-500 w-8 text-right">{c.percentage}%</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* MATERIALS */}
                            <div>
                                <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Material Scavenger Results</h4>
                                <ul className="divide-y divide-gray-100 border border-gray-100 rounded-lg overflow-hidden">
                                    {generatedBlueprint.elements.map((el, i) => (
                                        <li key={i} className="p-3 hover:bg-gray-50 flex justify-between items-center text-sm">
                                            <div className="flex items-center gap-3">
                                                <span className="w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center text-xs text-gray-500">{i + 1}</span>
                                                <div>
                                                    <div className="font-medium text-gray-900">{el.name}</div>
                                                    <div className="text-xs text-gray-400">ID: {el.inventoryId}</div>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <div className="text-xs font-medium text-emerald-700">{el.attachmentMethod?.replace('_', ' ')}</div>
                                                <div className="text-[10px] text-gray-400">Phase {el.constructionPhase}</div>
                                            </div>
                                        </li>
                                    ))}
                                </ul>
                            </div>

                        </div>

                        {/* RIGHT COLUMN: CONSTRUCTION & SPATIAL */}
                        <div className="space-y-6">

                            {/* HYBRID VISUALIZATION & AI PROMPT */}
                            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
                                <div className="bg-gradient-to-r from-indigo-50 to-blue-50 px-4 py-3 border-b border-blue-100 flex justify-between items-center">
                                    <h4 className="text-sm font-bold text-indigo-900 uppercase tracking-wider flex items-center gap-2">
                                        <span className="text-lg">🎨</span> Visual Prototype
                                    </h4>
                                </div>

                                <div className="p-4 space-y-4">
                                    {/* 1. THE CANVAS RENDERER */}
                                    {/* This renders the actual "Skeleton" using X/Y coordinates */}
                                    <div className="flex justify-center bg-gray-50 border rounded-lg p-2">
                                        <BlueprintRenderer blueprint={generatedBlueprint} width={600} height={600} />
                                    </div>

                                    {/* 2. THE AI PROMPT */}
                                    <div className="bg-slate-800 rounded-lg p-4 text-slate-200 text-xs font-mono">
                                        <div className="flex justify-between items-center mb-2 border-b border-slate-700 pb-2">
                                            <span className="font-bold text-slate-400">MIDJOURNEY / DALL-E PROMPT</span>
                                            <button
                                                onClick={() => {
                                                    const prompt = `A photorealistic ${generatedBlueprint.emotionalProfile?.emotionalFamily} wreath, ${generatedBlueprint.emotionalProfile?.primaryEmotion} style, ${generatedBlueprint.colorPalette?.paletteName} color palette. Contains: ${generatedBlueprint.elements.slice(0, 5).map(e => e.name).join(", ")}. High detail, professional product photography, white background, soft studio lighting --ar 1:1`;
                                                    navigator.clipboard.writeText(prompt);
                                                }}
                                                className="bg-indigo-600 hover:bg-indigo-500 text-white px-2 py-1 rounded text-[10px] uppercase font-bold tracking-wide transition-colors"
                                            >
                                                Copy Prompt
                                            </button>
                                        </div>
                                        <p className="opacity-80 leading-relaxed">
                                            /imagine prompt: A photorealistic {generatedBlueprint.emotionalProfile?.emotionalFamily} wreath, {generatedBlueprint.emotionalProfile?.primaryEmotion} style, {generatedBlueprint.colorPalette?.paletteName} color palette.
                                            Contains: {generatedBlueprint.elements.slice(0, 5).map(e => e.name).join(", ")}.
                                            High detail, professional product photography, white background, soft studio lighting --ar 1:1
                                        </p>
                                    </div>

                                    <div className="text-[10px] text-gray-500 p-2 bg-blue-50 rounded border border-blue-100 flex gap-2">
                                        <span className="text-lg">💡</span>
                                        <p>
                                            <strong>Pro Tip:</strong> Right-click the wreath image above and "Copy Image". Paste it into Midjourney, then paste the prompt.
                                            This forces the AI to follow your <em>exact</em> layout while making it look real.
                                        </p>
                                    </div>
                                </div>
                            </div>


                            {/* CONSTRUCTION PHASES */}
                            <div className="border border-gray-200 rounded-xl overflow-hidden">
                                <div className="bg-gray-50 px-4 py-3 border-b border-gray-200 flex justify-between items-center">
                                    <h4 className="text-sm font-bold text-gray-700 uppercase tracking-wider">Construction Plan</h4>
                                    <span className="text-xs bg-white border border-gray-200 px-2 py-1 rounded text-gray-500">
                                        {generatedBlueprint.constructionPlan?.totalEstimatedTimeMinutes} mins
                                    </span>
                                </div>
                                <div className="max-h-80 overflow-y-auto p-4 space-y-6">
                                    {generatedBlueprint.constructionPlan?.phases.map((phase) => (
                                        <div key={phase.phaseNumber} className="relative pl-6 border-l-2 border-gray-100 last:border-0 pb-2">
                                            <div className="absolute -left-[9px] top-0 w-4 h-4 rounded-full bg-white border-2 border-emerald-500"></div>
                                            <h5 className="text-sm font-bold text-gray-900 mb-1">
                                                Phase {phase.phaseNumber}: {phase.name}
                                                <span className="ml-2 font-normal text-xs text-gray-400">({phase.estimatedTimeMinutes}m)</span>
                                            </h5>
                                            <ul className="space-y-2 mt-2">
                                                {phase.steps.map((step, sIdx) => (
                                                    <li key={sIdx} className="text-sm text-gray-600 flex gap-2">
                                                        <span className="text-emerald-500 text-xs mt-0.5">›</span>
                                                        {step}
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>
                                    ))}
                                </div>
                            </div>

                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
