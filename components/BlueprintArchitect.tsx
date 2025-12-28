// components/BlueprintArchitect.tsx
import React, { useState, useRef, useMemo } from 'react';
import type { BlueprintSchematic, EmotionalGrammarItem, LayoutStyle, InventoryItem, UserStyleProfile } from '../types';
import { sketchAuraAgent } from '../services/aiAgents';
import { Loader } from './Loader';

// === QUICK TEMPLATES ===
interface DesignTemplate {
    id: string;
    name: string;
    description: string;
    emotion: string;
    season: string;
    layout: LayoutStyle;
    density: string;
    focalStrategy: string;
    keywords: string;
    composition: { focal: string; secondary: string; filler: string; accent: string };
}

const QUICK_TEMPLATES: DesignTemplate[] = [
    {
        id: 'classic-memorial',
        name: 'Classic Memorial',
        description: 'Dignified and peaceful tribute',
        emotion: 'peaceful',
        season: 'A Memorial',
        layout: 'crescent',
        density: 'Standard',
        focalStrategy: 'Clustered Focal Point',
        keywords: 'classic, elegant, timeless',
        composition: { focal: '3', secondary: '5', filler: '8', accent: '3' }
    },
    {
        id: 'celebration-of-life',
        name: 'Celebration of Life',
        description: 'Joyful remembrance with warmth',
        emotion: 'cherished',
        season: 'A Celebration',
        layout: 'radial',
        density: 'Lush',
        focalStrategy: 'Distributed Focal Points',
        keywords: 'vibrant, celebratory, warm',
        composition: { focal: '4', secondary: '6', filler: '10', accent: '4' }
    },
    {
        id: 'spring-wedding',
        name: 'Spring Wedding',
        description: 'Romantic and fresh',
        emotion: 'loving',
        season: 'A Wedding',
        layout: 'cascade',
        density: 'Lush',
        focalStrategy: 'Clustered Focal Point',
        keywords: 'romantic, fresh, delicate',
        composition: { focal: '5', secondary: '7', filler: '12', accent: '5' }
    },
    {
        id: 'peaceful-sympathy',
        name: 'Peaceful Sympathy',
        description: 'Gentle comfort in simplicity',
        emotion: 'serene',
        season: 'A Memorial',
        layout: 'oval',
        density: 'Sparse',
        focalStrategy: 'Clustered Focal Point',
        keywords: 'gentle, calm, soothing',
        composition: { focal: '2', secondary: '4', filler: '6', accent: '2' }
    },
    {
        id: 'autumn-harvest',
        name: 'Autumn Harvest',
        description: 'Rich, warm seasonal tones',
        emotion: 'grounded',
        season: 'Autumn',
        layout: 'fan',
        density: 'Standard',
        focalStrategy: 'Distributed Focal Points',
        keywords: 'rustic, harvest, warm earth tones',
        composition: { focal: '3', secondary: '5', filler: '8', accent: '4' }
    }
];

// === EMOTIONAL FLOW VISUALIZATION ===
interface EmotionalFlowProps {
    grammar: EmotionalGrammarItem[];
    coreEmotion: string;
    season: string;
    keywords: string;
}

const SEASON_EMOTION_MAP: Record<string, string> = {
    'Autumn': 'grounded',
    'Winter': 'composed',
    'Spring': 'gentle',
    'Summer': 'radiant',
    'A Wedding': 'loving',
    'A Memorial': 'peaceful',
    'A Celebration': 'cherished',
    'A Birthday': 'radiant',
};

interface EmotionalPoint {
    tag: string;
    color: string;
    cx: number;
    cy: number;
    radius: number;
    isCore: boolean;
}

const EmotionalFlow: React.FC<EmotionalFlowProps> = ({ grammar, coreEmotion, season, keywords }) => {
    
    const emotionalPoints = useMemo(() => {
        const points: EmotionalPoint[] = [];
        const viewBoxSize = 500;
        const center = viewBoxSize / 2;
        
        const coreGrammarItem = grammar.find(g => g.tag === coreEmotion);
        if (!coreGrammarItem) {
            return [];
        }

        points.push({
            tag: coreGrammarItem.tag,
            color: coreGrammarItem.color,
            cx: center,
            cy: center,
            radius: 40,
            isCore: true,
        });
        
        const usedTags = new Set<string>([coreEmotion]);
        const satelliteEmotions: EmotionalGrammarItem[] = [];

        const seasonEmotionTag = SEASON_EMOTION_MAP[season];
        if (seasonEmotionTag && !usedTags.has(seasonEmotionTag)) {
            const seasonGrammarItem = grammar.find(g => g.tag === seasonEmotionTag);
            if (seasonGrammarItem) {
                satelliteEmotions.push(seasonGrammarItem);
                usedTags.add(seasonEmotionTag);
            }
        }
        
        const keywordTags = keywords.split(',').map(k => k.trim().toLowerCase()).filter(Boolean);
        keywordTags.forEach(keyword => {
            if (!usedTags.has(keyword)) {
                const keywordGrammarItem = grammar.find(g => keyword.includes(g.tag));
                if (keywordGrammarItem && !usedTags.has(keywordGrammarItem.tag)) {
                    satelliteEmotions.push(keywordGrammarItem);
                    usedTags.add(keywordGrammarItem.tag);
                }
            }
        });

        const angleStep = satelliteEmotions.length > 0 ? 360 / satelliteEmotions.length : 0;
        const orbitRadius = 150;

        satelliteEmotions.forEach((item, index) => {
            const angle = angleStep * index - 90;
            const rad = angle * (Math.PI / 180);
            points.push({
                tag: item.tag,
                color: item.color,
                cx: center + orbitRadius * Math.cos(rad),
                cy: center + orbitRadius * Math.sin(rad),
                radius: 25,
                isCore: false,
            });
        });

        return points;
    }, [grammar, coreEmotion, season, keywords]);

    if (emotionalPoints.length === 0) {
        return (
            <div className="h-48 flex items-center justify-center bg-gray-100 rounded-md border text-center text-gray-500 text-sm p-4">
                Select a "Core Emotion" to begin visualizing the wreath's emotional flow.
            </div>
        );
    }
    
    const corePoint = emotionalPoints.find(p => p.isCore)!;

    return (
        <div className="bg-gray-100 rounded-md border p-2">
            <svg viewBox="0 0 500 500" width="100%" height="100%">
                {emotionalPoints.filter(p => !p.isCore).map((point, index) => (
                    <line
                        key={`line-${point.tag}`}
                        x1={corePoint.cx}
                        y1={corePoint.cy}
                        x2={point.cx}
                        y2={point.cy}
                        stroke={point.color}
                        strokeWidth="2"
                        strokeOpacity="0.5"
                        className="animate-flow-path"
                        style={{ animationDelay: `${index * 150}ms` }}
                    />
                ))}

                {emotionalPoints.map((point, index) => (
                    <g key={`point-${point.tag}`} className="animate-flow-node" style={{ animationDelay: `${index * 100}ms` }}>
                        <circle
                            cx={point.cx}
                            cy={point.cy}
                            r={point.radius}
                            fill={point.color}
                            stroke="#fff"
                            strokeWidth="3"
                        />
                         <text
                            x={point.cx}
                            y={point.cy}
                            textAnchor="middle"
                            dy=".3em"
                            fill="#374151"
                            fontSize={point.isCore ? "18" : "14"}
                            fontWeight="500"
                            className="select-none capitalize"
                        >
                            {point.tag}
                        </text>
                    </g>
                ))}
            </svg>
        </div>
    );
};

// === HELPER COMPONENTS ===
interface BlueprintArchitectProps {
    addSchematic: (schematic: Omit<BlueprintSchematic, 'id'>) => BlueprintSchematic;
    onDevelop: (schematic: BlueprintSchematic) => void;
    grammar: EmotionalGrammarItem[];
    inventory: InventoryItem[];
    styleProfile: UserStyleProfile | null;
    schematics?: BlueprintSchematic[];
}

const LAYOUT_STYLES: LayoutStyle[] = [
  'crescent', 'spiral', 'radial', 'cascade', 'vertical-line', 
  'horizontal-line', 'triangular', 'oval', 'fan', 's-shaped', 
  'ikebana', 'freeform'
];
const SEASONS_OCCASIONS = ['Autumn', 'Winter', 'Spring', 'Summer', 'A Wedding', 'A Memorial', 'A Celebration', 'A Birthday'];
const DENSITIES = ['Sparse', 'Standard', 'Lush'];
const FOCAL_STRATEGIES = ['Clustered Focal Point', 'Distributed Focal Points', 'No Clear Focal Point'];

const GuidedInput: React.FC<{ label: string; children: React.ReactNode, className?: string }> = ({ label, children, className }) => (
    <div className={className}>
        <label className="block text-sm font-medium text-gray-700">{label}</label>
        {children}
    </div>
);

const SectionHeader: React.FC<{ title: string, onInspire?: () => void }> = ({ title, onInspire }) => (
     <div className="flex justify-between items-center mt-4 mb-2">
        <h3 className="font-semibold text-gray-700">{title}</h3>
        {onInspire && (
            <button type="button" onClick={onInspire} className="text-sm font-medium" style={{ color: '#1E3A5F' }}>
                Inspire Me
            </button>
        )}
    </div>
);

// === MAIN COMPONENT ===
export const BlueprintArchitect: React.FC<BlueprintArchitectProps> = ({ addSchematic, onDevelop, grammar, inventory, styleProfile, schematics = [] }) => {
    // Conceptual inputs
    const [coreEmotion, setCoreEmotion] = useState('');
    const [season, setSeason] = useState('');
    const [layout, setLayout] = useState<LayoutStyle | ''>('');
    const [keywords, setKeywords] = useState('');
    
    // Composition inputs
    const [composition, setComposition] = useState({ focal: '', secondary: '', filler: '', accent: '' });
    const [mustHaves, setMustHaves] = useState<string[]>([]);
    
    // Directive inputs
    const [density, setDensity] = useState('');
    const [focalStrategy, setFocalStrategy] = useState('');
    
    // Visual input
    const [inspirationImage, setInspirationImage] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Detailed text input
    const [detailedPrompt, setDetailedPrompt] = useState('');

    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [generatedSchematic, setGeneratedSchematic] = useState<BlueprintSchematic | null>(null);
    
    // Filter to only show core emotions (not discovered/archived)
    const coreEmotions = useMemo(() => 
        grammar.filter(g => g.tier === 'core' || !g.tier), 
        [grammar]
    );
    
    // Get selected emotion details for color preview
    const selectedEmotionDetails = useMemo(() => 
        grammar.find(g => g.tag === coreEmotion),
        [grammar, coreEmotion]
    );
    
    const availableInventory = inventory.filter(i => i.isAvailable);
    
    // Recent schematics (last 5)
    const recentSchematics = useMemo(() => 
        schematics.slice(-5).reverse(),
        [schematics]
    );

    // Apply template
    const applyTemplate = (template: DesignTemplate) => {
        setCoreEmotion(template.emotion);
        setSeason(template.season);
        setLayout(template.layout);
        setKeywords(template.keywords);
        setComposition(template.composition);
        setDensity(template.density);
        setFocalStrategy(template.focalStrategy);
    };

    const constructFinalPrompt = () => {
        let finalPrompt = '## High-Level Concept\n';
        if (inspirationImage) finalPrompt += `The user has provided an inspirational image to guide the design. Analyze it carefully.\n`;
        if (layout) finalPrompt += `Design a ${layout} wreath`;
        if (season) finalPrompt += ` for ${season}`;
        if (layout || season) finalPrompt += `. `;

        if (coreEmotion) finalPrompt += `The core emotion is ${coreEmotion}. `;
        if (keywords) finalPrompt += `Incorporate themes of: ${keywords}. `;
        
        const compositionParts = [
            composition.focal && `${composition.focal} focal elements`,
            composition.secondary && `${composition.secondary} secondary elements`,
            composition.filler && `${composition.filler} filler elements`,
            composition.accent && `${composition.accent} accent elements`,
            mustHaves.length > 0 && `MUST incorporate: ${mustHaves.join(', ')}`,
        ].filter(Boolean);
        
        if (compositionParts.length > 0) {
            finalPrompt += `\n\n## Floral Composition\n- ${compositionParts.join('\n- ')}`;
        }
        
        const directiveParts = [
            density && `Density: ${density}`,
            focalStrategy && `Focal Point Strategy: ${focalStrategy}`,
        ].filter(Boolean);
        
        if (directiveParts.length > 0) {
            finalPrompt += `\n\n## Design Directives\n- ${directiveParts.join('\n- ')}`;
        }

        if (detailedPrompt) finalPrompt += `\n\n## Designer's Notes\n"${detailedPrompt}"`;

        return finalPrompt.trim();
    };

    const handleInspireMe = () => {
        const randomCoreEmotion = coreEmotions[Math.floor(Math.random() * coreEmotions.length)];
        setCoreEmotion(randomCoreEmotion?.tag || '');
        setSeason(SEASONS_OCCASIONS[Math.floor(Math.random() * SEASONS_OCCASIONS.length)]);
        setLayout(LAYOUT_STYLES[Math.floor(Math.random() * LAYOUT_STYLES.length)]);
        setKeywords(['ethereal', 'delicate', 'rustic', 'elegant'][Math.floor(Math.random() * 4)]);
        setComposition({ focal: '3', secondary: '5', filler: '8', accent: '4' });
        setDensity('Standard');
        setFocalStrategy('Clustered Focal Point');
        setInspirationImage(null);
        setDetailedPrompt("Surprise me with a unique take on these concepts.");
    };
    
    const resetForm = () => {
        setCoreEmotion('');
        setSeason('');
        setLayout('');
        setKeywords('');
        setComposition({ focal: '', secondary: '', filler: '', accent: '' });
        setMustHaves([]);
        setDensity('');
        setFocalStrategy('');
        setDetailedPrompt('');
        setInspirationImage(null);
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                setInspirationImage(reader.result as string);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const finalPrompt = constructFinalPrompt();
        if (!finalPrompt.trim()) return;

        setIsLoading(true);
        setError(null);
        setGeneratedSchematic(null);

        try {
            let imagePayload: { base64: string; mimeType: string; } | null = null;
            if (inspirationImage) {
                 const [header, data] = inspirationImage.split(',');
                 const mimeType = header.match(/:(.*?);/)?.[1];
                 if (data && mimeType) {
                    imagePayload = { base64: data, mimeType };
                 }
            }

            const { name, svgContent } = await sketchAuraAgent({
              emotionalPrompt: finalPrompt,
              styleProfile,
              imagePayload
            });
            const newSchematicData: Omit<BlueprintSchematic, 'id'> = {
                name,
                prompt: finalPrompt,
                svgContent,
            };
            setGeneratedSchematic({ ...newSchematicData, id: `temp-${Date.now()}` });

        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to generate schematic.');
        } finally {
            setIsLoading(false);
        }
    };
    
    const handleSave = () => {
        if (generatedSchematic) {
            const { id, ...dataToSave } = generatedSchematic;
            addSchematic(dataToSave);
            alert("Schematic saved to your library!");
            setGeneratedSchematic(null);
            resetForm();
        }
    }
    
    const handleDevelop = () => {
        if(generatedSchematic) {
            onDevelop(generatedSchematic);
        }
    }

    // Check if we have enough data to show summary
    const hasSelections = coreEmotion || season || layout || mustHaves.length > 0;

    const renderContent = () => {
        if (isLoading) {
            return <Loader />;
        }
        if (error) {
            return <p className="text-red-500 text-center">{error}</p>;
        }
        if (generatedSchematic) {
            return (
                 <div className="w-full animate-fade-in">
                    <h3 className="text-lg font-medium text-gray-800 mb-3 text-center">{generatedSchematic.name}</h3>
                    <div className="aspect-square border bg-white shadow-lg rounded-lg p-4 relative" dangerouslySetInnerHTML={{ __html: generatedSchematic.svgContent }} />
                    
                    {/* Legend */}
                    <div className="mt-4 p-3 bg-gray-50 rounded-lg border text-sm">
                        <h4 className="font-medium text-gray-700 mb-2">Design Legend</h4>
                        <div className="grid grid-cols-2 gap-2 text-gray-600">
                            <div className="flex items-center gap-2">
                                <div className="w-4 h-4 rounded-full bg-gray-400"></div>
                                <span>Focal elements</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <div className="w-3 h-3 rounded-full bg-gray-300"></div>
                                <span>Secondary elements</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <div className="w-2 h-2 rounded-full bg-gray-200"></div>
                                <span>Filler/texture</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <div className="w-2 h-2 bg-gray-300 rotate-45"></div>
                                <span>Accent pieces</span>
                            </div>
                        </div>
                    </div>
                    
                    <div className="flex justify-center gap-4 mt-6">
                        <button onClick={() => setGeneratedSchematic(null)} className="px-6 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300">Back to Editor</button>
                        <button onClick={handleSave} className="px-6 py-2 bg-gray-700 text-white rounded-md hover:bg-gray-800">Save to Library</button>
                        <button onClick={handleDevelop} className="px-6 py-2 text-white rounded-md transition-colors" style={{ backgroundColor: '#1E3A5F' }}>Develop into Blueprint</button>
                    </div>
                </div>
            );
        }
        return (
             <p className="text-gray-500">Your generated schematic will appear here.</p>
        );
    }

    return (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="bg-white p-8 rounded-lg shadow-md">
                <h2 className="text-2xl font-light text-gray-800 mb-4">Blueprint Architect</h2>
                <p className="text-gray-500 text-sm mb-6">
                    Build a design concept using guided inputs and visual inspiration. The AI Architect will generate a schematic for you to approve and develop.
                </p>
                
                {/* Quick Templates */}
                <div className="mb-6">
                    <h3 className="text-sm font-medium text-gray-700 mb-3">Quick Start Templates</h3>
                    <div className="flex flex-wrap gap-2">
                        {QUICK_TEMPLATES.map(template => (
                            <button
                                key={template.id}
                                type="button"
                                onClick={() => applyTemplate(template)}
                                className="px-3 py-1.5 text-xs rounded-full border border-gray-300 hover:border-gray-500 hover:bg-gray-50 transition-colors"
                                title={template.description}
                            >
                                {template.name}
                            </button>
                        ))}
                    </div>
                </div>
                
                <form onSubmit={handleSubmit}>
                    <div className="space-y-4 p-4 border border-gray-200 rounded-md bg-gray-50 mb-6">
                        {/* Visual Inspiration */}
                        <SectionHeader title="Visual Inspiration (Optional)" />
                        <div className="p-4 border-2 border-dashed rounded-lg text-center bg-white">
                            {inspirationImage ? (
                                <div className="relative group w-32 h-32 mx-auto">
                                    <img src={inspirationImage} alt="Inspiration preview" className="w-32 h-32 rounded-md object-cover shadow-md" />
                                    <button 
                                        type="button" 
                                        onClick={() => {
                                            setInspirationImage(null);
                                            if(fileInputRef.current) fileInputRef.current.value = '';
                                        }}
                                        className="absolute top-1 right-1 bg-red-500 text-white rounded-full h-6 w-6 flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition-opacity"
                                        aria-label="Remove image"
                                    >
                                        &times;
                                    </button>
                                </div>
                            ) : (
                                <button type="button" onClick={() => fileInputRef.current?.click()} className="text-sm font-medium" style={{ color: '#1E3A5F', background: 'transparent' }}>
                                    Upload an inspirational image
                                </button>
                            )}
                            <input
                                type="file"
                                ref={fileInputRef}
                                onChange={handleImageUpload}
                                className="hidden"
                                accept="image/png, image/jpeg"
                            />
                        </div>

                        <SectionHeader title="Guided Design" onInspire={handleInspireMe} />
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                           <GuidedInput label="Core Emotion">
                                <div className="flex items-center gap-2 mt-1">
                                    {selectedEmotionDetails && (
                                        <div 
                                            className="w-6 h-6 rounded-full border border-gray-300 shadow-inner flex-shrink-0"
                                            style={{ backgroundColor: selectedEmotionDetails.color }}
                                            title={selectedEmotionDetails.tag}
                                        />
                                    )}
                                    <select 
                                        value={coreEmotion} 
                                        onChange={e => setCoreEmotion(e.target.value)} 
                                        className="flex-1 p-2 border bg-white border-gray-300 rounded-md text-sm"
                                    >
                                        <option value="">Select...</option>
                                        {coreEmotions.map(g => (
                                            <option key={g.id} value={g.tag}>
                                                {g.tag.charAt(0).toUpperCase() + g.tag.slice(1)}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                           </GuidedInput>
                           <GuidedInput label="Season / Occasion">
                                <select value={season} onChange={e => setSeason(e.target.value)} className="w-full mt-1 p-2 border bg-white border-gray-300 rounded-md text-sm">
                                    <option value="">Select...</option>
                                    {SEASONS_OCCASIONS.map(s => <option key={s} value={s}>{s}</option>)}
                                </select>
                           </GuidedInput>
                            <GuidedInput label="Layout Style">
                                <select value={layout} onChange={e => setLayout(e.target.value as LayoutStyle)} className="w-full mt-1 p-2 border bg-white border-gray-300 rounded-md text-sm">
                                    <option value="">Select...</option>
                                    {LAYOUT_STYLES.map(s => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1).replace(/-/g, ' ')}</option>)}
                                </select>
                           </GuidedInput>
                        </div>
                         <GuidedInput label="Descriptive Keywords (e.g., Rustic, Wildflowers, Minimalist)">
                            <input type="text" value={keywords} onChange={e => setKeywords(e.target.value)} placeholder="Enter comma-separated words..." className="w-full mt-1 p-2 border border-gray-300 rounded-md text-sm" />
                        </GuidedInput>
                        
                        <SectionHeader title="Floral Composition" />
                         <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <GuidedInput label="Focal">
                                <input type="number" min="0" value={composition.focal} onChange={e => setComposition(p => ({...p, focal: e.target.value}))} className="w-full mt-1 p-2 border border-gray-300 rounded-md text-sm" placeholder="e.g., 3"/>
                            </GuidedInput>
                            <GuidedInput label="Secondary">
                                <input type="number" min="0" value={composition.secondary} onChange={e => setComposition(p => ({...p, secondary: e.target.value}))} className="w-full mt-1 p-2 border border-gray-300 rounded-md text-sm" placeholder="e.g., 5"/>
                            </GuidedInput>
                            <GuidedInput label="Filler">
                                <input type="number" min="0" value={composition.filler} onChange={e => setComposition(p => ({...p, filler: e.target.value}))} className="w-full mt-1 p-2 border border-gray-300 rounded-md text-sm" placeholder="e.g., 8"/>
                            </GuidedInput>
                            <GuidedInput label="Accent">
                                <input type="number" min="0" value={composition.accent} onChange={e => setComposition(p => ({...p, accent: e.target.value}))} className="w-full mt-1 p-2 border border-gray-300 rounded-md text-sm" placeholder="e.g., 4"/>
                            </GuidedInput>
                        </div>
                        
                        {/* Must-Have Botanicals with Thumbnails */}
                        <GuidedInput label="Must-Have Botanicals">
                            {availableInventory.length === 0 ? (
                                <p className="text-sm text-gray-400 mt-1 italic">No botanicals in inventory yet. Add some via Image Tagger.</p>
                            ) : (
                                <div className="mt-2 grid grid-cols-3 sm:grid-cols-4 gap-2 max-h-40 overflow-y-auto p-2 bg-white border rounded-md">
                                    {availableInventory.map(item => {
                                        const isSelected = mustHaves.includes(item.name);
                                        return (
                                            <button
                                                key={item.id}
                                                type="button"
                                                onClick={() => {
                                                    if (isSelected) {
                                                        setMustHaves(prev => prev.filter(n => n !== item.name));
                                                    } else {
                                                        setMustHaves(prev => [...prev, item.name]);
                                                    }
                                                }}
                                                className={`p-1 rounded-md border-2 transition-all ${
                                                    isSelected 
                                                        ? 'border-gray-800 bg-gray-100' 
                                                        : 'border-transparent hover:border-gray-300'
                                                }`}
                                                title={item.name}
                                            >
                                                {item.processedImageUrl ? (
                                                    <img 
                                                        src={item.processedImageUrl} 
                                                        alt={item.name} 
                                                        className="w-full h-12 object-contain rounded"
                                                    />
                                                ) : (
                                                    <div 
                                                        className="w-full h-12 rounded flex items-center justify-center"
                                                        style={{ backgroundColor: item.dominantColors?.[0] || '#E5E7EB' }}
                                                    >
                                                        <span className="text-xs text-gray-600 truncate px-1">{item.name}</span>
                                                    </div>
                                                )}
                                                <p className="text-xs text-gray-600 truncate mt-1">{item.name}</p>
                                            </button>
                                        );
                                    })}
                                </div>
                            )}
                            {mustHaves.length > 0 && (
                                <div className="mt-2 flex flex-wrap gap-1">
                                    {mustHaves.map(name => (
                                        <span key={name} className="text-xs bg-gray-200 px-2 py-1 rounded-full flex items-center gap-1">
                                            {name}
                                            <button 
                                                type="button" 
                                                onClick={() => setMustHaves(prev => prev.filter(n => n !== name))}
                                                className="text-gray-500 hover:text-gray-700"
                                            >
                                                &times;
                                            </button>
                                        </span>
                                    ))}
                                </div>
                            )}
                        </GuidedInput>

                        <SectionHeader title="Design Directives" />
                         <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <GuidedInput label="Density">
                                <select value={density} onChange={e => setDensity(e.target.value)} className="w-full mt-1 p-2 border bg-white border-gray-300 rounded-md text-sm">
                                     <option value="">Select...</option>
                                     {DENSITIES.map(d => <option key={d} value={d}>{d}</option>)}
                                </select>
                            </GuidedInput>
                             <GuidedInput label="Focal Point Strategy">
                                <select value={focalStrategy} onChange={e => setFocalStrategy(e.target.value)} className="w-full mt-1 p-2 border bg-white border-gray-300 rounded-md text-sm">
                                     <option value="">Select...</option>
                                     {FOCAL_STRATEGIES.map(s => <option key={s} value={s}>{s}</option>)}
                                </select>
                            </GuidedInput>
                        </div>

                        <SectionHeader title="Emotional Flow" />
                        <EmotionalFlow
                            grammar={grammar}
                            coreEmotion={coreEmotion}
                            season={season}
                            keywords={keywords}
                        />
                    </div>
                    
                    {/* Summary Preview */}
                    {hasSelections && (
                        <div className="mb-4 p-3 bg-gray-100 rounded-lg border border-gray-200">
                            <h4 className="text-sm font-medium text-gray-700 mb-2">Design Summary</h4>
                            <p className="text-sm text-gray-600">
                                You're designing a 
                                {layout && <strong> {layout}</strong>} wreath
                                {season && <> for <strong>{season}</strong></>}
                                {coreEmotion && <> with a <strong>{coreEmotion}</strong> mood</>}
                                {mustHaves.length > 0 && <> featuring <strong>{mustHaves.join(', ')}</strong></>}
                                {density && <> in a <strong>{density.toLowerCase()}</strong> arrangement</>}
                                .
                            </p>
                        </div>
                    )}

                    <label className="block text-sm font-medium text-gray-700 mb-2">Detailed Designer's Notes (Optional)</label>
                    <textarea
                        value={detailedPrompt}
                        onChange={(e) => setDetailedPrompt(e.target.value)}
                        placeholder="Add any final, specific details here. For example, 'I want the focal cluster to be slightly off-center...'"
                        className="w-full h-24 p-4 border border-gray-300 rounded-md focus:ring-2 focus:ring-navy-500 transition-shadow resize-none"
                    />

                    <button
                        type="submit"
                        disabled={isLoading}
                        className="mt-4 w-full text-white py-3 px-6 rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
                        style={{ backgroundColor: isLoading ? undefined : '#1E3A5F' }}
                    >
                        {isLoading ? 'Architecting...' : 'Generate Schematic'}
                    </button>
                </form>
            </div>
            
            <div className="space-y-6">
                {/* Main content area */}
                <div className="min-h-[500px] flex items-center justify-center bg-white p-6 rounded-lg shadow-md">
                    {renderContent()}
                </div>
                
                {/* Recent Generations */}
                {recentSchematics.length > 0 && !generatedSchematic && (
                    <div className="bg-white p-4 rounded-lg shadow-md">
                        <h3 className="text-sm font-medium text-gray-700 mb-3">Recent Schematics</h3>
                        <div className="grid grid-cols-5 gap-2">
                            {recentSchematics.map(schematic => (
                                <button
                                    key={schematic.id}
                                    type="button"
                                    onClick={() => setGeneratedSchematic(schematic)}
                                    className="aspect-square border rounded-md p-1 bg-gray-50 hover:bg-gray-100 transition-colors overflow-hidden"
                                    title={schematic.name}
                                >
                                    <div 
                                        className="w-full h-full"
                                        dangerouslySetInnerHTML={{ __html: schematic.svgContent }}
                                    />
                                </button>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};
