// components/ManufacturingSpecModal.tsx
import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
// Lazy-load heavy libs when exporting
import { buildBloomAgent, mythoscribeAgent } from '../services/aiAgents';
import type { WreathBlueprint, ManufacturingSpec, InventoryItem, SymbolGlossaryEntry, NarrativeComponentInput, NarrativeContent, NarrativeGestureType, NarrativeZone, LayoutStyle, NarrativeVoice, HealingStage } from '../types';
import { Loader } from './Loader';
// Import emotion utilities
import { getEmotionFamily, emotionFamilies } from '../lib/emotionUtils';

interface ManufacturingSpecModalProps {
  wreath: WreathBlueprint;
  inventory: InventoryItem[];
  onClose: () => void;
  updateBlueprint?: (bp: WreathBlueprint) => void;
}

type SpecTab = 'assembly' | 'schematic' | 'symbolism' | 'narrative';

const TabButton: React.FC<{ active: boolean, onClick: () => void, children: React.ReactNode }> = ({ active, onClick, children }) => (
    <button onClick={onClick} className={`tab ${active ? 'tab-active' : ''}`}>{children}</button>
);

// --- Module 2: Narrative Integration Layer Logic ---
const getZone = (radius: number): NarrativeZone => {
    if (radius < 0.33) return 'core';
    if (radius < 0.66) return 'supporting';
    return 'transitional';
};

const getGesture = (layout: LayoutStyle): NarrativeGestureType => {
    switch(layout) {
        case 'cascade': return 'cascade';
        case 'spiral': return 'spiral';
        case 'radial': return 'radial';
        case 'vertical-line':
        case 'horizontal-line':
            return 'linear';
        default:
            return 'linear'; // A safe default
    }
}

const HEALING_STAGES: HealingStage[] = ['Processing', 'Acceptance', 'Growth'];
const NARRATIVE_VOICES: NarrativeVoice[] = ['therapeutic', 'poetic', 'spiritual', 'personal', 'cultural'];


export const ManufacturingSpecModal: React.FC<ManufacturingSpecModalProps> = ({ wreath, inventory, onClose, updateBlueprint }) => {
  const [spec, setSpec] = useState<ManufacturingSpec | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<SpecTab>('assembly');

  // --- Narrative State ---
  const [originalNarrative, setOriginalNarrative] = useState<NarrativeContent | null>(wreath.narrative || null);
  const [editableNarrative, setEditableNarrative] = useState<NarrativeContent | null>(wreath.narrative || null);
  const [voice, setVoice] = useState<NarrativeVoice>('therapeutic');
  const [healingStage, setHealingStage] = useState<HealingStage>('Processing');
  const [isEditingPara, setIsEditingPara] = useState<number | null>(null);
  const [editingParaText, setEditingParaText] = useState('');
  const [newTag, setNewTag] = useState('');
  const pdfExportRef = useRef<HTMLDivElement>(null);


  const regenerateNarrative = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
        // Module 2: Prepare data
        const gestureType = getGesture(wreath.layoutStyle);
        const narrativeInputs: NarrativeComponentInput[] = wreath.elements
            .map(el => {
                const item = inventory.find(i => i.id === el.inventoryId);
                if (!item) return null;
                return {
                    name: item.name,
                    emotionTags: item.emotionTags,
                    gestureType: gestureType,
                    zone: getZone(el.position.radius),
                    symbolMeaning: item.symbolMeaning,
                };
            })
            .filter((i): i is NarrativeComponentInput => i !== null);
        
        if (narrativeInputs.length === 0) {
            throw new Error("Cannot generate narrative for a blueprint with no elements.");
        }

        // Module 3: Generate story
        const result = await mythoscribeAgent(narrativeInputs, voice, healingStage);
        const finalResult = { ...result, voiceAdaptation: voice, healingStage: healingStage };
        setOriginalNarrative(finalResult);
        setEditableNarrative(finalResult);

    } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to generate narrative.");
    } finally {
        setIsLoading(false);
    }
  }, [wreath, inventory, voice, healingStage]);


  useEffect(() => {
    const fetchSpec = async () => {
        if (activeTab === 'assembly' && !spec) {
            setIsLoading(true);
            setError(null);
            try {
                const result = await buildBloomAgent(wreath);
                setSpec(result);
            } catch (err) {
                setError(err instanceof Error ? err.message : "Failed to load specification.");
            } finally {
                setIsLoading(false);
            }
        }
    };
    fetchSpec();
  }, [wreath, activeTab, spec]);

  // Initial generation of narrative if one doesn't exist
  useEffect(() => {
    if (activeTab === 'narrative' && !originalNarrative) {
        regenerateNarrative();
    }
  }, [activeTab, originalNarrative, regenerateNarrative]);


  const symbolGlossary: SymbolGlossaryEntry[] = useMemo(() => {
    const uniqueInventoryIds = [...new Set(wreath.elements.map(el => el.inventoryId))];
    const entries: SymbolGlossaryEntry[] = [];
    uniqueInventoryIds.forEach(id => {
        const item = inventory.find(i => i.id === id);
        if (item) {
            entries.push({
                name: item.name,
                emotionTags: item.emotionTags,
                symbolMeaning: item.symbolMeaning,
                culturalTags: item.culturalTags,
            });
        }
    });
    return entries.sort((a, b) => a.name.localeCompare(b.name));
  }, [wreath, inventory]);
  
  const handleDownloadSvg = () => {
    if (!wreath.schematicSvg) return;
    const blob = new Blob([wreath.schematicSvg], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${wreath.name.replace(/\s+/g, '-')}-schematic.svg`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };
  
  const handleSaveNarrative = () => {
    if (editableNarrative && updateBlueprint) {
        updateBlueprint({ ...wreath, narrative: editableNarrative });
        alert('Narrative saved to blueprint!');
    }
  }
  
    const handleExportPdf = async () => {
    const element = pdfExportRef.current;
    if (!element || !editableNarrative) return;
    
        const html2canvas = (await import('html2canvas')).default;
        const { jsPDF } = await import('jspdf');
        const canvas = await html2canvas(element, { scale: 2 });
    const imgData = canvas.toDataURL('image/png');

    const pdf = new jsPDF({
      orientation: 'p',
      unit: 'px',
      format: 'a4',
    });
    
    const pdfWidth = pdf.internal.pageSize.getWidth();
    // const pdfHeight = pdf.internal.pageSize.getHeight(); // reserved for future pagination
    const imgWidth = canvas.width;
    const imgHeight = canvas.height;
    const ratio = imgWidth / imgHeight;
    const canvasPdfWidth = pdfWidth - 20; // with margin
    const canvasPdfHeight = canvasPdfWidth / ratio;
    
    pdf.addImage(imgData, 'PNG', 10, 10, canvasPdfWidth, canvasPdfHeight);
    pdf.save(`${wreath.name.replace(/\s+/g, '-')}-narrative.pdf`);
  };

  const NarrativeEditor = () => {
    if (!editableNarrative) return null;

    const handleUpdateParagraph = (index: number) => {
        setEditableNarrative(prev => prev ? {
            ...prev,
            paragraphs: prev.paragraphs.map((p, i) => i === index ? editingParaText : p)
        } : null);
        setIsEditingPara(null);
        setEditingParaText('');
    };

    const handleAddTag = () => {
        if (newTag.trim() && !editableNarrative.emotionTags.includes(newTag.trim())) {
             setEditableNarrative(prev => prev ? {
                ...prev,
                emotionTags: [...prev.emotionTags, newTag.trim()]
            } : null);
            setNewTag('');
        }
    };
    
    const handleRemoveTag = (tagToRemove: string) => {
        setEditableNarrative(prev => prev ? {
            ...prev,
            emotionTags: prev.emotionTags.filter(t => t !== tagToRemove)
        } : null);
    };

    return (
        <div className="space-y-4">
             {/* PDF Export Renderer */}
             <div className="absolute -left-[9999px] top-0">
                <div ref={pdfExportRef} className="p-10 bg-white" style={{width: '600px'}}>
                    <h1 className="text-2xl font-serif mb-2">{wreath.name}</h1>
                    <p className="text-sm text-gray-500 mb-6 italic">"{wreath.description}"</p>
                    <div className="space-y-3 text-base text-gray-800">
                        {editableNarrative.paragraphs.map((p, i) => <p key={i}>{p}</p>)}
                    </div>
                    <div className="mt-8 pt-4 border-t border-gray-200">
                        <h2 className="text-lg font-semibold font-serif text-gray-700">Therapeutic Guidance</h2>
                        <p className="text-base text-gray-700 italic mt-1">"{editableNarrative.therapeuticGuidance}"</p>
                    </div>
                </div>
            </div>

            {/* Controls */}
            <div className="grid grid-cols-2 gap-4 p-4 bg-gray-50 rounded-lg border">
                 <div>
                    <label className="text-sm font-medium text-gray-700">Voice Style</label>
                    <select value={voice} onChange={e => setVoice(e.target.value as NarrativeVoice)} className="w-full mt-1 p-2 border bg-white rounded-md text-sm">
                        {NARRATIVE_VOICES.map(v => <option key={v} value={v} className="capitalize">{v}</option>)}
                    </select>
                </div>
                <div>
                    <label className="text-sm font-medium text-gray-700">Healing Stage</label>
                     <select value={healingStage} onChange={e => setHealingStage(e.target.value as HealingStage)} className="w-full mt-1 p-2 border bg-white rounded-md text-sm">
                        {HEALING_STAGES.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                </div>
                <div className="col-span-2 text-center">
                    <button onClick={regenerateNarrative} className="btn text-sm">Regenerate Narrative</button>
                </div>
            </div>
            
            {/* Narrative */}
            <div className="space-y-2">
                <h3 className="font-semibold">Generated Narrative</h3>
                {editableNarrative.paragraphs.map((p, i) => (
                    <div key={i} className="p-2 rounded-md hover:bg-gray-100 group">
                        {isEditingPara === i ? (
                            <div>
                                <textarea value={editingParaText} onChange={e => setEditingParaText(e.target.value)} className="w-full h-24 p-2 border rounded-md"/>
                                <div className="flex gap-2 mt-1">
                                    <button onClick={() => handleUpdateParagraph(i)} className="text-sm text-green-600">Save</button>
                                    <button onClick={() => setIsEditingPara(null)} className="text-sm text-gray-600">Cancel</button>
                                </div>
                            </div>
                        ) : (
                           <p className="text-gray-700 text-sm leading-relaxed">{p} 
                           <button onClick={() => { setIsEditingPara(i); setEditingParaText(p); }} className="ml-2 text-xs text-navy-600 opacity-0 group-hover:opacity-100">Edit</button></p>
                        )}
                    </div>
                ))}
            </div>

             {/* Tags */}
            <div>
                 <h3 className="font-semibold">Emotional Tags</h3>
                 <div className="flex flex-wrap gap-2 mt-2 items-center">
                    {editableNarrative.emotionTags.map(tag => (
                        <span key={tag} className="flex items-center bg-gray-200 text-gray-800 text-xs font-semibold px-2.5 py-1 rounded-full">
                            {tag}
                            <button onClick={() => handleRemoveTag(tag)} className="ml-1.5 text-gray-600 hover:text-gray-800">&times;</button>
                        </span>
                    ))}
                    <div className="flex gap-1">
                        <input type="text" value={newTag} onChange={e => setNewTag(e.target.value)} placeholder="Add tag..." className="text-xs p-1 border rounded-md w-24"/>
                        <button onClick={handleAddTag} className="btn text-xs">Add</button>
                    </div>
                 </div>
            </div>

            {/* Guidance */}
            <div>
                <h3 className="font-semibold">Therapeutic Guidance</h3>
                 <textarea value={editableNarrative.therapeuticGuidance} onChange={e => setEditableNarrative(p => p ? {...p, therapeuticGuidance: e.target.value} : null)} className="w-full mt-1 p-2 border rounded-md text-sm italic"/>
            </div>

            {/* Actions */}
            <div className="mt-4 pt-4 border-t flex justify-end gap-2">
                <button onClick={() => setEditableNarrative(originalNarrative)} className="btn text-sm">Reset</button>
                <button onClick={handleExportPdf} className="btn text-sm">Export PDF</button>
                {updateBlueprint && <button onClick={handleSaveNarrative} className="btn btn-primary text-sm">Save & Approve</button>}
            </div>
        </div>
    );
  }

  const renderContent = () => {
    if (isLoading) return <div className="min-h-[300px] flex items-center justify-center"><Loader /></div>;
    if (error) return <p className="text-red-500 p-4">{error}</p>;

    switch (activeTab) {
        case 'assembly':
            if (!spec) return <p className="text-gray-500">No assembly instructions available.</p>;
            return (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div>
                        <h3 className="text-xl font-semibold font-serif text-gray-700 mb-2">Bill of Materials</h3>
                        <ul className="space-y-2 text-gray-600 text-sm">
                        {spec.billOfMaterials.map((item, i) => (
                            <li key={i} className="flex justify-between p-2 bg-gray-50 rounded-md">
                            <span>{item.name}</span>
                            <span className="font-bold">{item.quantity}x</span>
                            </li>
                        ))}
                        </ul>
                    </div>
                    <div>
                        <h3 className="text-xl font-semibold font-serif text-gray-700 mb-2">Assembly Steps</h3>
                        <ol className="list-decimal list-inside space-y-2 text-gray-600">
                        {spec.assemblySteps.map((step, i) => <li key={i}>{step}</li>)}
                        </ol>
                    </div>
                </div>
            );
        case 'schematic':
            return (
                <div className="space-y-4 max-w-lg mx-auto">
                    <div className="bg-gray-100 p-2 rounded-md border aspect-square" dangerouslySetInnerHTML={{ __html: wreath.schematicSvg || '<p class="text-center text-gray-500 p-4 flex items-center justify-center h-full">No schematic available for this blueprint.</p>' }}>
                    </div>
                    {wreath.schematicSvg && (
                        <button onClick={handleDownloadSvg} className="w-full btn btn-primary">
                            Download SVG Schematic
                        </button>
                    )}
                </div>
            );
        case 'symbolism':
            return (
                <div className="space-y-6">
                    {symbolGlossary.map(entry => (
                        <div key={entry.name} className="p-4 bg-gray-50 rounded-lg border">
                            <h4 className="text-lg font-semibold text-gray-800 font-serif">{entry.name}</h4>
                            <p className="text-gray-600 mt-1 italic">"{entry.symbolMeaning}"</p>
                            <div className="flex flex-wrap gap-2 mt-3">
                                {entry.emotionTags.map(tag => {
                                    const family = getEmotionFamily(tag);
                                    const color = family ? emotionFamilies[family].color : 'bg-gray-200 text-gray-700';
                                    return <span key={tag} className={`text-xs px-2 py-1 rounded-full ${color}`}>{tag}</span>;
                                })}
                            </div>
                             {(entry.culturalTags && entry.culturalTags.length > 0) && (
                                <p className="text-xs text-gray-500 mt-2">Cultural Context: {entry.culturalTags.join(', ')}</p>
                             )}
                        </div>
                    ))}
                </div>
            );
        case 'narrative':
            return <NarrativeEditor />;
    }
  }

    return (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] flex flex-col">
                <div className="p-4 border-b flex justify-between items-center flex-shrink-0 bg-white/80 backdrop-blur">
          <div>
            <h2 className="text-2xl font-serif text-gray-800">Manufacturing Specification</h2>
            <p className="text-sm text-gray-500">{wreath.name}</p>
          </div>
                    <button onClick={onClose} className="btn btn-ghost text-sm">Close</button>
        </div>

                <div className="border-b flex-shrink-0">
                        <nav className="tabs px-4 py-1">
                <TabButton active={activeTab === 'assembly'} onClick={() => setActiveTab('assembly')}>Assembly & Materials</TabButton>
                <TabButton active={activeTab === 'schematic'} onClick={() => setActiveTab('schematic')}>Schematic</TabButton>
                <TabButton active={activeTab === 'symbolism'} onClick={() => setActiveTab('symbolism')}>Symbol Glossary</TabButton>
                <TabButton active={activeTab === 'narrative'} onClick={() => setActiveTab('narrative')}>Narrative</TabButton>
            </nav>
        </div>
        
        <div className="p-6 overflow-y-auto flex-grow">
            {renderContent()}
        </div>
      </div>
    </div>
  );
};