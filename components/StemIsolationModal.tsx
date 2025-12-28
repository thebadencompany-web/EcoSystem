import React, { useState, useEffect } from 'react';
import { InventoryItem } from '../types';
import { isolateSingleStem, StemIsolationOutput } from '../services/stemIsolationAgent';

interface StemIsolationModalProps {
    item: InventoryItem;
    onClose: () => void;
}

export const StemIsolationModal: React.FC<StemIsolationModalProps> = ({ item, onClose }) => {
    const [isLoading, setIsLoading] = useState(true);
    const [result, setResult] = useState<StemIsolationOutput | null>(null);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const analyze = async () => {
            try {
                // If it's a data URL, pass as base64. If it's a remote URL, pass as imageUrl for server-side fetching.
                const input: any = { quantity: 1 };

                if (!item.imageUrl) {
                    throw new Error("Product has no image to analyze.");
                }

                if (item.imageUrl.startsWith('data:')) {
                    const parts = item.imageUrl.split(',');
                    if (parts.length < 2) throw new Error("Invalid image data");
                    input.bundleImageBase64 = parts[1];
                    input.mimeType = parts[0].split(':')[1].split(';')[0];
                } else {
                    input.imageUrl = item.imageUrl;
                    input.mimeType = 'image/jpeg';
                }

                const output = await isolateSingleStem(input);

                if (!output || !output.flowerAnalysis) {
                    throw new Error("Analysis completed but returned empty results.");
                }

                setResult(output);
            } catch (err) {
                console.error("Stem Isolation Analysis Error:", err);
                setError(err instanceof Error ? err.message : 'Unknown error occurred processing image');
            } finally {
                setIsLoading(false);
            }
        };

        analyze();
    }, [item]);

    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text);
        // Could add toast here
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto flex flex-col">
                {/* Header */}
                <div className="p-4 border-b flex justify-between items-center bg-gray-50 rounded-t-lg">
                    <h3 className="text-lg font-serif font-semibold text-gray-800 flex items-center gap-2">
                        ✂️ Stem Isolator: {item.name}
                    </h3>
                    <button onClick={onClose} className="text-gray-500 hover:text-gray-700">✕</button>
                </div>

                {/* Content */}
                <div className="p-6 flex-1 overflow-y-auto">
                    <div className="flex gap-4 mb-6">
                        <div className="w-1/3">
                            <p className="text-xs font-bold text-gray-500 mb-2 uppercase">Original Bundle</p>
                            <div className="aspect-square bg-gray-100 rounded-lg overflow-hidden border">
                                <img src={item.imageUrl} alt="Original" className="w-full h-full object-cover" />
                            </div>
                        </div>
                        <div className="w-2/3">
                            <p className="text-xs font-bold text-gray-500 mb-2 uppercase">Gemini Analysis</p>
                            {isLoading ? (
                                <div className="h-32 flex items-center justify-center bg-blue-50 rounded-lg border border-blue-100 text-blue-600 animate-pulse">
                                    🔮 Analyzing botanical features...
                                </div>
                            ) : error ? (
                                <div className="p-4 bg-red-50 text-red-700 rounded-lg text-sm border border-red-200">
                                    Error: {error}
                                    <br /><span className="text-xs mt-2 block opacity-75">(Note: Images must be data URIs for this prototype)</span>
                                </div>
                            ) : result ? (
                                <div className="bg-gray-50 p-3 rounded-lg border text-sm space-y-2">
                                    <div className="grid grid-cols-2 gap-2">
                                        <div>
                                            <span className="text-gray-500 text-xs">Variety:</span>
                                            <p className="font-medium">{typeof result.flowerAnalysis?.variety === 'object' ? JSON.stringify(result.flowerAnalysis.variety) : (result.flowerAnalysis?.variety || 'Unknown')}</p>
                                        </div>
                                        <div>
                                            <span className="text-gray-500 text-xs">Color:</span>
                                            <p className="font-medium">{typeof result.flowerAnalysis?.color === 'object' ? JSON.stringify(result.flowerAnalysis.color) : (result.flowerAnalysis?.color || 'N/A')}</p>
                                        </div>
                                        <div>
                                            <span className="text-gray-500 text-xs">Style:</span>
                                            <p className="font-medium">{typeof result.flowerAnalysis?.style === 'object' ? JSON.stringify(result.flowerAnalysis.style) : (result.flowerAnalysis?.style || 'N/A')}</p>
                                        </div>
                                        <div>
                                            <span className="text-gray-500 text-xs">Est. Count:</span>
                                            <p className="font-medium">{result.flowerAnalysis?.bundleCount?.toString() || '1'}</p>
                                        </div>
                                    </div>
                                    <div>
                                        <span className="text-gray-500 text-xs">Detected Features:</span>
                                        <p className="italic text-gray-600">
                                            {(() => {
                                                const details = result.flowerAnalysis?.additionalDetails;
                                                if (!details) return 'No details detected';
                                                if (typeof details === 'object') return JSON.stringify(details);
                                                return details;
                                            })()}
                                        </p>
                                    </div>
                                </div>
                            ) : null}
                        </div>
                    </div>

                    {!isLoading && result && (
                        <div className="space-y-4">
                            <div className="border-t pt-4">
                                <h4 className="font-semibold text-gray-800 mb-3">🚀 Generation Prompts</h4>
                                <p className="text-sm text-gray-600 mb-4">Copy these prompts into your preferred AI image generator to verify the result.</p>

                                {/* Midjourney */}
                                <div className="bg-gray-900 text-gray-100 p-3 rounded-lg mb-3">
                                    <div className="flex justify-between items-center mb-2">
                                        <span className="text-xs font-bold text-gray-400">MIDJOURNEY (/imagine)</span>
                                        <button
                                            onClick={() => copyToClipboard(result.midjourneyPrompt)}
                                            className="text-xs bg-gray-700 hover:bg-gray-600 px-2 py-1 rounded transition-colors"
                                        >
                                            Copy
                                        </button>
                                    </div>
                                    <code className="text-xs block whitespace-pre-wrap font-mono opacity-90">{result.midjourneyPrompt}</code>
                                </div>

                                {/* DALL-E */}
                                <div className="bg-emerald-50 text-emerald-900 p-3 rounded-lg border border-emerald-100">
                                    <div className="flex justify-between items-center mb-2">
                                        <span className="text-xs font-bold text-emerald-600">DALL-E 3 / CHATGPT</span>
                                        <button
                                            onClick={() => copyToClipboard(result.dallePrompt)}
                                            className="text-xs bg-emerald-200 hover:bg-emerald-300 px-2 py-1 rounded transition-colors"
                                        >
                                            Copy
                                        </button>
                                    </div>
                                    <code className="text-xs block whitespace-pre-wrap font-mono opacity-90">{result.dallePrompt}</code>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="p-4 border-t bg-gray-50 rounded-b-lg flex justify-end">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 bg-gray-200 text-gray-800 rounded hover:bg-gray-300 font-medium transition-colors"
                    >
                        Close
                    </button>
                </div>
            </div>
        </div>
    );
};
