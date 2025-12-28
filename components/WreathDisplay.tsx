import React, { useEffect, useMemo, useState } from 'react';
import type { WreathBlueprint, InventoryItem, NarrativeContent, MemoryName, BlueprintSchematic, ManufacturingSpec } from '../types';
import { InteractiveWreathCanvas } from './InteractiveWreathCanvas';

interface WreathDisplayProps {
    initialBlueprint: WreathBlueprint;
    inventory: InventoryItem[];
    addBlueprint: (bp: WreathBlueprint) => WreathBlueprint;
    onClose: () => void;
    narrative?: NarrativeContent;
    nameOptions?: MemoryName[];
    schematic?: BlueprintSchematic | null;
    manufacturing?: ManufacturingSpec | null;
    selectedName?: string | null;
    onNameSelect?: (name: string | null) => void;
}

type TabType = 'blueprint' | 'narrative' | 'names' | 'manufacturing';

export const WreathDisplay: React.FC<WreathDisplayProps> = ({
    initialBlueprint,
    inventory,
    addBlueprint,
    onClose,
    narrative,
    nameOptions,
    schematic,
    manufacturing,
    selectedName,
    onNameSelect,
}) => {
    const [activeTab, setActiveTab] = useState<TabType>('blueprint');
    const [blueprintName, setBlueprintName] = useState(initialBlueprint.name);

    useEffect(() => {
        setBlueprintName(selectedName || initialBlueprint.name);
    }, [initialBlueprint.name, selectedName]);

    const displayBlueprint = useMemo(() => ({ ...initialBlueprint, name: blueprintName || initialBlueprint.name }), [initialBlueprint, blueprintName]);

    const handleSave = () => {
        const finalName = blueprintName.trim() || selectedName || 'Untitled Wreath';
        const finalBlueprint = { ...initialBlueprint, name: finalName };
        addBlueprint(finalBlueprint);
        onClose();
    };

    const schematicSvg = schematic?.svgContent || initialBlueprint.schematicSvg;
    const schematicName = schematic?.name || initialBlueprint.schematic?.name;

    const renderNarrative = () => {
        if (!narrative) return null;
        return (
            <div className="space-y-6">
                <div>
                    <h3 className="text-2xl font-serif text-gray-900">{blueprintName}</h3>
                    <p className="text-sm text-gray-600">{narrative.voiceAdaptation}</p>
                </div>
                <div className="space-y-4 text-gray-700 leading-relaxed">
                    {narrative.paragraphs.map((p, idx) => (
                        <p key={idx}>{p}</p>
                    ))}
                </div>
                {narrative.emotionTags?.length ? (
                    <div className="flex flex-wrap gap-2">
                        {narrative.emotionTags.map((tag) => (
                            <span key={tag} className="px-3 py-1 bg-navy-50 text-navy-700 text-xs rounded-full border border-navy-100">
                                {tag}
                            </span>
                        ))}
                    </div>
                ) : null}
                {narrative.therapeuticGuidance ? (
                    <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                        <p className="text-sm text-gray-800 font-semibold mb-1">Therapeutic Guidance</p>
                        <p className="text-sm text-gray-700">{narrative.therapeuticGuidance}</p>
                    </div>
                ) : null}
            </div>
        );
    };

    const renderNames = () => {
        if (!nameOptions || nameOptions.length === 0) return null;
        return (
            <div className="space-y-4">
                <h3 className="text-2xl font-serif text-gray-900">Choose a Name</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {nameOptions.map((option) => (
                        <label
                            key={option.name}
                            className={`cursor-pointer p-4 rounded-lg border-2 transition-colors ${selectedName === option.name ? 'border-navy-500 bg-navy-50' : 'border-gray-200 hover:border-gray-300'}`}
                            onClick={() => onNameSelect?.(option.name)}
                        >
                            <div className="flex items-start gap-3">
                                <input
                                    type="radio"
                                    name="wreath-name"
                                    className="mt-1"
                                    checked={selectedName === option.name}
                                    onChange={() => onNameSelect?.(option.name)}
                                />
                                <div>
                                    <p className="text-lg font-semibold text-gray-900">{option.name}</p>
                                    <p className="text-sm text-gray-600 italic">{option.rationale}</p>
                                </div>
                            </div>
                        </label>
                    ))}
                </div>
            </div>
        );
    };

    const renderManufacturing = () => {
        if (!manufacturing) return null;
        return (
            <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="bg-white p-4 rounded-lg border border-gray-200">
                        <p className="text-sm font-semibold text-gray-800 mb-2">Bill of Materials</p>
                        <ul className="space-y-2 text-sm text-gray-700">
                            {manufacturing.billOfMaterials.map((item, idx) => (
                                <li key={`${item.name}-${idx}`} className="flex justify-between">
                                    <span>{item.name}</span>
                                    <span className="text-gray-500">{item.quantity}</span>
                                </li>
                            ))}
                        </ul>
                    </div>
                    <div className="bg-white p-4 rounded-lg border border-gray-200">
                        <p className="text-sm font-semibold text-gray-800 mb-2">Assembly Steps</p>
                        <ol className="space-y-2 text-sm text-gray-700 list-decimal list-inside">
                            {manufacturing.assemblySteps.map((step, idx) => (
                                <li key={`${idx}-${step.substring(0, 6)}`}>{step}</li>
                            ))}
                        </ol>
                    </div>
                </div>
            </div>
        );
    };

    return (
        <div className="max-w-6xl mx-auto animate-fade-in space-y-6">
            <div className="bg-white p-8 rounded-lg shadow-xl">
                <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4 mb-6">
                    <div className="space-y-3 w-full">
                        <h2 className="text-3xl font-serif text-gray-800">Your Custom Wreath</h2>
                        <input
                            type="text"
                            value={blueprintName}
                            onChange={(e) => setBlueprintName(e.target.value)}
                            placeholder="Name your wreath..."
                            className="w-full max-w-md px-4 py-2 border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-navy-500"
                        />
                    </div>
                    <button onClick={onClose} className="text-sm text-gray-600 hover:text-gray-900 self-start">
                        ✕ Close
                    </button>
                </div>

                <div className="flex flex-wrap gap-2 border-b border-gray-200 pb-2 mb-6">
                    <button
                        className={`px-4 py-2 rounded-md text-sm font-semibold ${activeTab === 'blueprint' ? 'bg-navy-50 text-navy-700' : 'text-gray-700 hover:bg-gray-100'}`}
                        onClick={() => setActiveTab('blueprint')}
                    >
                        Blueprint
                    </button>
                    {narrative ? (
                        <button
                            className={`px-4 py-2 rounded-md text-sm font-semibold ${activeTab === 'narrative' ? 'bg-navy-50 text-navy-700' : 'text-gray-700 hover:bg-gray-100'}`}
                            onClick={() => setActiveTab('narrative')}
                        >
                            Story
                        </button>
                    ) : null}
                    {nameOptions && nameOptions.length > 0 ? (
                        <button
                            className={`px-4 py-2 rounded-md text-sm font-semibold ${activeTab === 'names' ? 'bg-navy-50 text-navy-700' : 'text-gray-700 hover:bg-gray-100'}`}
                            onClick={() => setActiveTab('names')}
                        >
                            Names ({nameOptions.length})
                        </button>
                    ) : null}
                    {manufacturing ? (
                        <button
                            className={`px-4 py-2 rounded-md text-sm font-semibold ${activeTab === 'manufacturing' ? 'bg-navy-50 text-navy-700' : 'text-gray-700 hover:bg-gray-100'}`}
                            onClick={() => setActiveTab('manufacturing')}
                        >
                            Manufacturing
                        </button>
                    ) : null}
                </div>

                <div className="mt-4">
                    {activeTab === 'blueprint' ? (
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                            <div className="lg:col-span-2 bg-gray-50 rounded-lg p-3 border">
                                <InteractiveWreathCanvas
                                    blueprint={displayBlueprint}
                                    setBlueprint={() => {}}
                                    inventory={inventory}
                                    isReadOnly={true}
                                />
                            </div>
                            <div className="space-y-4">
                                {schematicSvg ? (
                                    <div className="bg-white p-4 rounded-lg border border-gray-200">
                                        <div className="flex items-center justify-between mb-3">
                                            <h3 className="text-sm font-semibold text-gray-800">Schematic</h3>
                                            <span className="text-xs text-gray-500">{schematicName || 'SVG'}</span>
                                        </div>
                                        <div className="bg-gray-50 border rounded-lg p-3 flex items-center justify-center">
                                            <div className="w-full max-w-sm" dangerouslySetInnerHTML={{ __html: schematicSvg }} />
                                        </div>
                                    </div>
                                ) : null}
                                <div className="bg-white p-4 rounded-lg border border-gray-200">
                                    <h3 className="text-sm font-semibold text-gray-800 mb-3">At a glance</h3>
                                    <div className="space-y-2 text-sm text-gray-700">
                                        <div className="flex justify-between">
                                            <span>Elements</span>
                                            <span className="font-semibold">{displayBlueprint.elements.length}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span>Diameter</span>
                                            <span className="font-semibold">{displayBlueprint.diameterInInches}"</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span>Layout</span>
                                            <span className="font-semibold capitalize">{displayBlueprint.layoutStyle}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ) : null}

                    {activeTab === 'narrative' ? renderNarrative() : null}
                    {activeTab === 'names' ? renderNames() : null}
                    {activeTab === 'manufacturing' ? renderManufacturing() : null}
                </div>

                <div className="flex flex-col sm:flex-row justify-center gap-4 mt-8 pt-6 border-t">
                    <button onClick={handleSave} className="bg-navy-600 text-white px-8 py-3 rounded-md hover:bg-navy-700 transition-colors">
                        Save Wreath
                    </button>
                    <button onClick={onClose} className="bg-gray-700 text-white px-8 py-3 rounded-md hover:bg-gray-800 transition-colors">
                        Cancel
                    </button>
                </div>
            </div>
        </div>
    );
};
