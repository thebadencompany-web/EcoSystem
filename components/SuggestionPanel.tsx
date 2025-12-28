import React, { useState } from 'react';
import type { WreathBlueprint, InventoryItem, ComplementarySuggestion } from '../types';
import { echoStemAgent } from '../services/aiAgents';
import { Loader } from './Loader';

interface SuggestionPanelProps {
    blueprint: WreathBlueprint;
    inventory: InventoryItem[];
    addElement: (item: InventoryItem) => void;
}

export const SuggestionPanel: React.FC<SuggestionPanelProps> = ({ blueprint, inventory, addElement }) => {
    const [suggestions, setSuggestions] = useState<ComplementarySuggestion[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleGetSuggestions = async () => {
        setIsLoading(true);
        setError(null);
        setSuggestions([]);
        try {
            const result = await echoStemAgent({ blueprint, inventory });
            setSuggestions(result);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to get suggestions.');
        } finally {
            setIsLoading(false);
        }
    };
    
    const handleAddElement = (inventoryId: string) => {
        if (blueprint.elements.some(el => el.inventoryId === inventoryId)) {
            return;
        }
        const itemToAdd = inventory.find(i => i.id === inventoryId);
        if (itemToAdd) {
            addElement(itemToAdd);
        }
    };

    return (
        <div className="p-4 h-full flex flex-col items-center justify-center text-center">
            {isLoading ? (
                <Loader />
            ) : error ? (
                <p className="text-red-500">{error}</p>
            ) : suggestions.length > 0 ? (
                <div className="w-full space-y-4 animate-fade-in text-left">
                     <h3 className="text-lg font-medium text-gray-800 text-center mb-2">Harmonious Pairings</h3>
                    {suggestions.map(suggestion => {
                        const inventoryItem = inventory.find(i => i.id === suggestion.inventoryId);
                        return (
                            <div key={suggestion.inventoryId} className="bg-gray-50 p-3 rounded-lg border">
                                <div className="flex items-start gap-3">
                                    {inventoryItem && (
                                        <div className="w-12 h-12 rounded-md checkered-bg p-1 flex-shrink-0">
                                            <img src={inventoryItem.thumbUrl || inventoryItem.imageUrl} alt={inventoryItem.name} className="w-full h-full object-contain rounded" />
                                        </div>
                                    )}
                                    <div className="flex-grow">
                                        <p className="font-medium text-gray-800">{suggestion.name}</p>
                                        <p className="text-sm text-gray-600 italic">"{suggestion.rationale}"</p>
                                    </div>
                                    <button 
                                        onClick={() => handleAddElement(suggestion.inventoryId)}
                                        aria-label={`Add ${suggestion.name} to wreath`}
                                    >
                                        Add
                                    </button>
                                </div>
                            </div>
                        );
                    })}
                     <button onClick={handleGetSuggestions} className="w-full mt-4 text-sm text-gray-700 hover:text-gray-900 font-medium">
                        Get New Suggestions
                    </button>
                </div>
            ) : (
                <>
                    <p className="text-gray-600 mb-4">
                        Let our AI floral designer suggest botanicals that will harmonize beautifully with your current creation.
                    </p>
                    <button onClick={handleGetSuggestions}>
                        Find Complements
                    </button>
                </>
            )}
        </div>
    );
};
