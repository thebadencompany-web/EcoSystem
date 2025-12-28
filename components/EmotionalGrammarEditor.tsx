// components/EmotionalGrammarEditor.tsx
import React, { useState, useMemo } from 'react';
import type { EmotionalGrammarItem, ColorFamily, EmotionTier } from '../types';
import { colorFamilyDefinitions, getColorFamilyDefinition, classifyColorFamily } from '../lib/colorFamilies';

interface EmotionalGrammarEditorProps {
    grammar: EmotionalGrammarItem[];
    addGrammarItem: (item: Omit<EmotionalGrammarItem, 'id'>) => void;
    updateGrammarItem: (item: EmotionalGrammarItem) => void;
    removeGrammarItem: (id: string) => void;
}

type ViewMode = 'list' | 'families';

export const EmotionalGrammarEditor: React.FC<EmotionalGrammarEditorProps> = ({ 
    grammar, 
    addGrammarItem, 
    updateGrammarItem, 
    removeGrammarItem 
}) => {
    const [newItem, setNewItem] = useState({ tag: '', color: '#E8D4C4' });
    const [editingItem, setEditingItem] = useState<EmotionalGrammarItem | null>(null);
    const [viewMode, setViewMode] = useState<ViewMode>('families');
    const [expandedFamily, setExpandedFamily] = useState<ColorFamily | null>(null);

    // Separate emotions by tier
    const { coreEmotions, discoveredEmotions, archivedEmotions } = useMemo(() => {
        const core: EmotionalGrammarItem[] = [];
        const discovered: EmotionalGrammarItem[] = [];
        const archived: EmotionalGrammarItem[] = [];
        
        grammar.forEach(item => {
            // Handle legacy items without tier
            const tier = item.tier || 'core';
            if (tier === 'core') core.push(item);
            else if (tier === 'discovered') discovered.push(item);
            else archived.push(item);
        });
        
        return { coreEmotions: core, discoveredEmotions: discovered, archivedEmotions: archived };
    }, [grammar]);

    // Group by color family
    const groupedByFamily = useMemo(() => {
        const groups: Record<ColorFamily, EmotionalGrammarItem[]> = {
            'warm-neutrals': [],
            'deep-comfort': [],
            'peaceful-tones': [],
            'golden-warmth': [],
            'soft-romance': [],
            'earth-grounded': [],
            'cool-serenity': [],
            'other': []
        };
        
        coreEmotions.forEach(item => {
            const family = item.colorFamily || classifyColorFamily(item.color);
            groups[family].push(item);
        });
        
        return groups;
    }, [coreEmotions]);

    const handleAdd = () => {
        if (newItem.tag.trim()) {
            const colorFamily = classifyColorFamily(newItem.color);
            addGrammarItem({
                ...newItem,
                tier: 'core',
                colorFamily
            });
            setNewItem({ tag: '', color: '#E8D4C4' });
        }
    };
    
    const handleUpdate = () => {
        if (editingItem && editingItem.tag.trim()) {
            // Find original item to preserve metadata
            const originalItem = grammar.find(g => g.id === editingItem.id);
            updateGrammarItem({
                ...originalItem,
                ...editingItem,
                colorFamily: classifyColorFamily(editingItem.color)
            });
            setEditingItem(null);
        }
    };

    const handlePromote = (item: EmotionalGrammarItem) => {
        updateGrammarItem({ 
            ...item, 
            tier: 'core',
            usageCount: (item.usageCount || 0) + 1,
            lastUsed: new Date().toISOString()
        });
    };

    const handleDemote = (item: EmotionalGrammarItem) => {
        updateGrammarItem({ ...item, tier: 'discovered' });
    };

    const handleArchive = (item: EmotionalGrammarItem) => {
        updateGrammarItem({ ...item, tier: 'archived' });
    };

    const handleRestore = (item: EmotionalGrammarItem) => {
        updateGrammarItem({ ...item, tier: 'discovered' });
    };

    const renderEmotionItem = (item: EmotionalGrammarItem, showActions: boolean = true) => (
        <div key={item.id} className="flex items-center justify-between p-2 bg-white rounded-md border hover:shadow-sm transition-shadow">
            <div className="flex items-center gap-3">
                <div 
                    className="w-6 h-6 rounded-full border border-gray-300 shadow-inner" 
                    style={{ backgroundColor: item.color }} 
                />
                {editingItem?.id === item.id ? (
                    <input 
                        type="text" 
                        value={editingItem.tag} 
                        onChange={(e) => setEditingItem(p => p ? {...p, tag: e.target.value} : null)}
                        className="p-1 border rounded text-sm"
                        autoFocus
                    />
                ) : (
                    <span className="text-sm font-medium text-gray-800">{item.tag}</span>
                )}
                {item.sourceFloral && (
                    <span className="text-xs text-gray-400 italic">from {item.sourceFloral}</span>
                )}
            </div>
            {showActions && (
                <div className="flex items-center gap-2">
                    {editingItem?.id === item.id ? (
                        <>
                            <input 
                                type="color" 
                                value={editingItem.color} 
                                onChange={(e) => setEditingItem(p => p ? {...p, color: e.target.value} : null)}
                                className="w-8 h-6 cursor-pointer"
                            />
                            <button 
                                onClick={handleUpdate} 
                                className="text-xs px-2 py-1 bg-gray-800 text-white rounded hover:bg-gray-700"
                            >
                                Save
                            </button>
                            <button 
                                onClick={() => setEditingItem(null)} 
                                className="text-xs px-2 py-1 text-gray-500 hover:text-gray-700"
                            >
                                Cancel
                            </button>
                        </>
                    ) : (
                        <>
                            <span className="text-xs text-gray-400 font-mono">{item.color}</span>
                            <button 
                                onClick={() => setEditingItem(item)} 
                                className="text-xs text-gray-500 hover:text-gray-800"
                            >
                                Edit
                            </button>
                            {item.tier === 'discovered' && (
                                <button 
                                    onClick={() => handlePromote(item)} 
                                    className="text-xs text-gray-800 font-medium hover:underline"
                                >
                                    Promote
                                </button>
                            )}
                            {item.tier === 'core' && coreEmotions.length > 5 && (
                                <button 
                                    onClick={() => handleDemote(item)} 
                                    className="text-xs text-gray-500 hover:text-gray-700"
                                >
                                    Demote
                                </button>
                            )}
                            {item.tier !== 'archived' && (
                                <button 
                                    onClick={() => handleArchive(item)} 
                                    className="text-xs text-gray-400 hover:text-gray-600"
                                >
                                    Archive
                                </button>
                            )}
                            {item.tier === 'archived' && (
                                <button 
                                    onClick={() => handleRestore(item)} 
                                    className="text-xs text-gray-600 hover:text-gray-800"
                                >
                                    Restore
                                </button>
                            )}
                            <button 
                                onClick={() => removeGrammarItem(item.id)} 
                                className="text-xs text-red-400 hover:text-red-600"
                            >
                                Delete
                            </button>
                        </>
                    )}
                </div>
            )}
        </div>
    );

    const renderFamilyGroup = (familyId: ColorFamily) => {
        const familyDef = getColorFamilyDefinition(familyId);
        const items = groupedByFamily[familyId];
        const isExpanded = expandedFamily === familyId;
        
        if (items.length === 0) return null;
        
        return (
            <div key={familyId} className="mb-4">
                <button
                    onClick={() => setExpandedFamily(isExpanded ? null : familyId)}
                    className="w-full flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                >
                    <div className="flex items-center gap-3">
                        <div className="flex -space-x-1">
                            {familyDef.sampleColors.slice(0, 4).map((c, i) => (
                                <div 
                                    key={i}
                                    className="w-4 h-4 rounded-full border border-white shadow-sm"
                                    style={{ backgroundColor: c }}
                                />
                            ))}
                        </div>
                        <span className="font-medium text-gray-800">{familyDef.name}</span>
                        <span className="text-xs text-gray-500">({items.length})</span>
                    </div>
                    <svg 
                        className={`w-4 h-4 text-gray-500 transition-transform ${isExpanded ? 'rotate-180' : ''}`} 
                        fill="none" 
                        stroke="currentColor" 
                        viewBox="0 0 24 24"
                    >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                </button>
                {isExpanded && (
                    <div className="mt-2 pl-4 space-y-2">
                        {items.map(item => renderEmotionItem(item))}
                    </div>
                )}
            </div>
        );
    };

    return (
        <div className="bg-white p-6 rounded-lg shadow-md animate-fade-in">
            <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-light text-gray-800">Emotional Palette</h2>
                <div className="flex gap-2">
                    <button
                        onClick={() => setViewMode('families')}
                        className={`px-3 py-1 text-sm rounded ${viewMode === 'families' ? 'bg-gray-800 text-white' : 'bg-gray-100 text-gray-600'}`}
                    >
                        By Family
                    </button>
                    <button
                        onClick={() => setViewMode('list')}
                        className={`px-3 py-1 text-sm rounded ${viewMode === 'list' ? 'bg-gray-800 text-white' : 'bg-gray-100 text-gray-600'}`}
                    >
                        All
                    </button>
                </div>
            </div>
            
            <p className="text-gray-500 text-sm mb-6">
                Your curated emotional vocabulary. Core emotions are your primary palette, while discovered colors are automatically suggested from botanical analysis.
            </p>

            {/* Core Palette Section */}
            <div className="mb-8">
                <h3 className="text-sm font-medium text-gray-700 uppercase tracking-wide mb-3 flex items-center gap-2">
                    <span className="w-2 h-2 bg-gray-800 rounded-full"></span>
                    Core Palette ({coreEmotions.length})
                </h3>
                
                {viewMode === 'families' ? (
                    <div>
                        {(Object.keys(groupedByFamily) as ColorFamily[]).map(familyId => 
                            renderFamilyGroup(familyId)
                        )}
                    </div>
                ) : (
                    <div className="space-y-2">
                        {coreEmotions.map(item => renderEmotionItem(item))}
                    </div>
                )}
            </div>

            {/* Discovered Section */}
            {discoveredEmotions.length > 0 && (
                <div className="mb-8">
                    <h3 className="text-sm font-medium text-gray-600 uppercase tracking-wide mb-3 flex items-center gap-2">
                        <span className="w-2 h-2 bg-amber-400 rounded-full"></span>
                        Discovered ({discoveredEmotions.length})
                        <span className="text-xs font-normal normal-case text-gray-400">
                            - colors found from your botanicals
                        </span>
                    </h3>
                    <div className="space-y-2 pl-4 border-l-2 border-amber-200">
                        {discoveredEmotions.map(item => renderEmotionItem(item))}
                    </div>
                </div>
            )}

            {/* Archived Section (collapsed by default) */}
            {archivedEmotions.length > 0 && (
                <details className="mb-8">
                    <summary className="text-sm font-medium text-gray-400 uppercase tracking-wide mb-3 cursor-pointer hover:text-gray-600">
                        Archived ({archivedEmotions.length})
                    </summary>
                    <div className="space-y-2 pl-4 border-l-2 border-gray-200 mt-3 opacity-60">
                        {archivedEmotions.map(item => renderEmotionItem(item))}
                    </div>
                </details>
            )}
            
            {/* Add New Emotion */}
            <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                <h3 className="text-sm font-medium text-gray-700 mb-3">Add New Emotion</h3>
                <div className="flex items-center gap-3">
                    <input 
                        type="text" 
                        placeholder="e.g., nostalgic, tender, luminous..."
                        value={newItem.tag}
                        onChange={(e) => setNewItem(p => ({...p, tag: e.target.value}))}
                        className="flex-grow p-2 border rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-gray-400"
                        onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
                    />
                    <input 
                        type="color"
                        value={newItem.color}
                        onChange={(e) => setNewItem(p => ({...p, color: e.target.value}))}
                        className="h-9 w-12 cursor-pointer rounded border"
                    />
                    <button 
                        onClick={handleAdd} 
                        className="bg-gray-800 text-white px-4 py-2 rounded-md hover:bg-gray-700 text-sm font-medium transition-colors"
                    >
                        Add to Core
                    </button>
                </div>
                <p className="text-xs text-gray-400 mt-2">
                    Color family will be auto-detected: <strong>{getColorFamilyDefinition(classifyColorFamily(newItem.color)).name}</strong>
                </p>
            </div>
        </div>
    );
};
