// components/BlueprintImport.tsx
import React, { useState, useCallback, useRef } from 'react';
import type { WreathBlueprint, InventoryItem } from '../types';
import {
    validateBlueprintJson,
    convertToWreathBlueprint,
    extractColorPalette,
    extractMaterialSummary,
    type ExternalBlueprintJson,
    type ImportOptions,
    type ImportValidationResult
} from '../lib/blueprintImportUtils';

interface BlueprintImportProps {
    inventory: InventoryItem[];
    onImportBlueprint: (blueprint: WreathBlueprint) => void;
}

type ImportStep = 'upload' | 'preview' | 'error';

export const BlueprintImport: React.FC<BlueprintImportProps> = ({
    inventory,
    onImportBlueprint
}) => {
    const [step, setStep] = useState<ImportStep>('upload');
    const [jsonInput, setJsonInput] = useState('');
    const [validationResult, setValidationResult] = useState<ImportValidationResult | null>(null);
    const [parsedJson, setParsedJson] = useState<ExternalBlueprintJson | null>(null);
    const [options, setOptions] = useState<ImportOptions>({
        matchInventory: true,
        createPlaceholders: true,
        overrideDiameter: false,
        customDiameter: 24
    });
    const [isDragging, setIsDragging] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleValidate = useCallback(() => {
        const result = validateBlueprintJson(jsonInput);
        setValidationResult(result);

        if (result.isValid && result.parsedBlueprint) {
            setParsedJson(result.parsedBlueprint);
            setStep('preview');
        } else {
            setStep('error');
        }
    }, [jsonInput]);

    const handleImport = useCallback(() => {
        if (!parsedJson) return;

        const blueprint = convertToWreathBlueprint(parsedJson, inventory, options);
        onImportBlueprint(blueprint);
    }, [parsedJson, inventory, options, onImportBlueprint]);

    const handleFileUpload = useCallback((file: File) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            const text = e.target?.result as string;
            setJsonInput(text);
        };
        reader.readAsText(file);
    }, []);

    const handleDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);

        const file = e.dataTransfer.files[0];
        if (file && (file.type === 'application/json' || file.name.endsWith('.json'))) {
            handleFileUpload(file);
        }
    }, [handleFileUpload]);

    const handleDragOver = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(true);
    }, []);

    const handleDragLeave = useCallback(() => {
        setIsDragging(false);
    }, []);

    const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            handleFileUpload(file);
        }
    }, [handleFileUpload]);

    const resetImport = useCallback(() => {
        setStep('upload');
        setJsonInput('');
        setValidationResult(null);
        setParsedJson(null);
    }, []);

    // Extract preview data
    const colorPalette = parsedJson ? extractColorPalette(parsedJson) : [];
    const materials = parsedJson ? extractMaterialSummary(parsedJson) : null;
    const elementCount = parsedJson?.wreath_blueprint.spatial_design?.element_positions?.length || 0;

    return (
        <div className="h-full flex flex-col p-4 overflow-auto">
            <div className="mb-4">
                <h3 className="text-lg font-light text-gray-800 mb-2">Import Blueprint</h3>
                <p className="text-sm text-gray-500">
                    Upload a JSON blueprint file to lay out your wreath design automatically.
                </p>
            </div>

            {step === 'upload' && (
                <div className="space-y-4 flex-grow">
                    {/* Drag & Drop Zone */}
                    <div
                        onDrop={handleDrop}
                        onDragOver={handleDragOver}
                        onDragLeave={handleDragLeave}
                        onClick={() => fileInputRef.current?.click()}
                        className={`
              border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors
              ${isDragging
                                ? 'border-blue-500 bg-blue-50'
                                : 'border-gray-300 hover:border-gray-400 bg-gray-50'
                            }
            `}
                    >
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept=".json,application/json"
                            onChange={handleFileSelect}
                            className="hidden"
                        />
                        <svg
                            className="w-10 h-10 mx-auto mb-3 text-gray-400"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={1.5}
                                d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                            />
                        </svg>
                        <p className="text-sm text-gray-600 mb-1">
                            <span className="font-medium">Drop JSON file here</span> or click to browse
                        </p>
                        <p className="text-xs text-gray-500">Supports .json files</p>
                    </div>

                    {/* Or paste JSON */}
                    <div className="relative">
                        <div className="absolute inset-x-0 top-0 flex items-center justify-center">
                            <span className="bg-white px-2 text-xs text-gray-400">or paste JSON</span>
                        </div>
                        <div className="border-t border-gray-200 mt-2" />
                    </div>

                    <textarea
                        value={jsonInput}
                        onChange={(e) => setJsonInput(e.target.value)}
                        placeholder='{"wreath_blueprint": { ... }}'
                        className="w-full h-40 p-3 border border-gray-200 rounded-md text-sm font-mono resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />

                    <button
                        onClick={handleValidate}
                        disabled={!jsonInput.trim()}
                        className="w-full py-2.5 rounded-md text-white font-medium transition-colors disabled:opacity-50"
                        style={{ backgroundColor: '#1E3A5F' }}
                    >
                        Validate & Preview
                    </button>
                </div>
            )}

            {step === 'error' && validationResult && (
                <div className="space-y-4 flex-grow">
                    <div className="p-4 bg-red-50 border border-red-200 rounded-md">
                        <h4 className="text-sm font-medium text-red-800 mb-2">Validation Errors</h4>
                        <ul className="list-disc list-inside text-sm text-red-700 space-y-1">
                            {validationResult.errors.map((error, i) => (
                                <li key={i}>{error}</li>
                            ))}
                        </ul>
                    </div>

                    <button
                        onClick={resetImport}
                        className="w-full py-2.5 rounded-md text-gray-700 font-medium border border-gray-300 hover:bg-gray-50"
                    >
                        Go Back
                    </button>
                </div>
            )}

            {step === 'preview' && parsedJson && (
                <div className="space-y-4 flex-grow overflow-auto">
                    {/* Blueprint Info */}
                    <div className="p-3 bg-gray-50 rounded-md">
                        <h4 className="text-sm font-medium text-gray-800 mb-2">
                            {parsedJson.wreath_blueprint.name}
                        </h4>
                        <div className="grid grid-cols-2 gap-2 text-xs text-gray-600">
                            <div>
                                <span className="font-medium">Diameter:</span>{' '}
                                {parsedJson.wreath_blueprint.specifications.base_dimensions.outer_diameter_inches}"
                            </div>
                            <div>
                                <span className="font-medium">Elements:</span> {elementCount}
                            </div>
                            {parsedJson.wreath_blueprint.collection && (
                                <div>
                                    <span className="font-medium">Collection:</span>{' '}
                                    {parsedJson.wreath_blueprint.collection}
                                </div>
                            )}
                            {parsedJson.wreath_blueprint.emotional_design?.primary_emotion && (
                                <div>
                                    <span className="font-medium">Emotion:</span>{' '}
                                    {parsedJson.wreath_blueprint.emotional_design.primary_emotion}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Color Palette */}
                    {colorPalette.length > 0 && (
                        <div>
                            <h4 className="text-xs font-medium text-gray-700 mb-2">Color Palette</h4>
                            <div className="flex flex-wrap gap-1">
                                {colorPalette.slice(0, 12).map((color, i) => (
                                    <div
                                        key={i}
                                        className="w-6 h-6 rounded-full border border-gray-200"
                                        style={{ backgroundColor: color }}
                                        title={color}
                                    />
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Materials Summary */}
                    {materials && (
                        <div className="text-xs space-y-2">
                            {materials.focalFlowers.length > 0 && (
                                <div>
                                    <span className="font-medium text-gray-700">Focal:</span>{' '}
                                    <span className="text-gray-600">{materials.focalFlowers.join(', ')}</span>
                                </div>
                            )}
                            {materials.secondaryFlowers.length > 0 && (
                                <div>
                                    <span className="font-medium text-gray-700">Secondary:</span>{' '}
                                    <span className="text-gray-600">{materials.secondaryFlowers.join(', ')}</span>
                                </div>
                            )}
                            {materials.greenery.length > 0 && (
                                <div>
                                    <span className="font-medium text-gray-700">Greenery:</span>{' '}
                                    <span className="text-gray-600">{materials.greenery.join(', ')}</span>
                                </div>
                            )}
                            {materials.accents.length > 0 && (
                                <div>
                                    <span className="font-medium text-gray-700">Accents:</span>{' '}
                                    <span className="text-gray-600">{materials.accents.join(', ')}</span>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Warnings */}
                    {validationResult?.warnings && validationResult.warnings.length > 0 && (
                        <div className="p-3 bg-amber-50 border border-amber-200 rounded-md">
                            <h4 className="text-xs font-medium text-amber-800 mb-1">Warnings</h4>
                            <ul className="list-disc list-inside text-xs text-amber-700 space-y-0.5">
                                {validationResult.warnings.map((warning, i) => (
                                    <li key={i}>{warning}</li>
                                ))}
                            </ul>
                        </div>
                    )}

                    {/* Import Options */}
                    <div className="border-t pt-3 space-y-2">
                        <h4 className="text-xs font-medium text-gray-700 mb-2">Import Options</h4>

                        <label className="flex items-center gap-2 text-sm cursor-pointer">
                            <input
                                type="checkbox"
                                checked={options.matchInventory}
                                onChange={(e) => setOptions(o => ({ ...o, matchInventory: e.target.checked }))}
                                className="rounded"
                            />
                            <span className="text-gray-700">Match to inventory items</span>
                        </label>

                        <label className="flex items-center gap-2 text-sm cursor-pointer">
                            <input
                                type="checkbox"
                                checked={options.createPlaceholders}
                                onChange={(e) => setOptions(o => ({ ...o, createPlaceholders: e.target.checked }))}
                                className="rounded"
                            />
                            <span className="text-gray-700">Create placeholders for missing items</span>
                        </label>

                        <label className="flex items-center gap-2 text-sm cursor-pointer">
                            <input
                                type="checkbox"
                                checked={options.overrideDiameter}
                                onChange={(e) => setOptions(o => ({ ...o, overrideDiameter: e.target.checked }))}
                                className="rounded"
                            />
                            <span className="text-gray-700">Override diameter</span>
                        </label>

                        {options.overrideDiameter && (
                            <div className="ml-6">
                                <input
                                    type="number"
                                    value={options.customDiameter}
                                    onChange={(e) => setOptions(o => ({ ...o, customDiameter: parseInt(e.target.value) || 24 }))}
                                    className="w-20 px-2 py-1 border border-gray-200 rounded text-sm"
                                    min={12}
                                    max={48}
                                />
                                <span className="text-xs text-gray-500 ml-1">inches</span>
                            </div>
                        )}
                    </div>

                    {/* Action Buttons */}
                    <div className="flex gap-2 pt-2">
                        <button
                            onClick={resetImport}
                            className="flex-1 py-2 rounded-md text-gray-700 font-medium border border-gray-300 hover:bg-gray-50"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleImport}
                            className="flex-1 py-2 rounded-md text-white font-medium"
                            style={{ backgroundColor: '#1E3A5F' }}
                        >
                            Import Design
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default BlueprintImport;
