// components/BlueprintToolbar.tsx
import React, { useState, useMemo } from 'react';
import type { WreathElement, WreathBlueprint, InventoryItem, LayoutStyle, MemoryNamingInput } from '../types';
import { nomenaAgent } from '../services/aiAgents';

interface BlueprintToolbarProps {
  selectedElement: WreathElement | null;
  updateElement: (updatedElement: WreathElement) => void;
  removeElement: (elementId: string) => void;
  addElement: (item: InventoryItem) => void;
  inventory: InventoryItem[];
  blueprint: WreathBlueprint;
  updateBlueprint: (updatedBlueprint: WreathBlueprint) => void;
}

const LAYOUT_STYLES: LayoutStyle[] = [
  'crescent', 'spiral', 'radial', 'cascade', 'vertical-line', 
  'horizontal-line', 'triangular', 'oval', 'fan', 's-shaped', 
  'ikebana', 'freeform'
];

type FilterType = 'all' | 'floral' | 'greenery' | 'accent';

export const BlueprintToolbar: React.FC<BlueprintToolbarProps> = ({
  selectedElement,
  updateElement,
  removeElement,
  addElement,
  inventory,
  blueprint,
  updateBlueprint
}) => {
  const [isNaming, setIsNaming] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<FilterType>('all');

  const handleSuggestName = async () => {
    setIsNaming(true);
    try {
      const namingInput: MemoryNamingInput = {
        memory: blueprint.description,
        tone: 'poetic',
        season: '',
      };
      const suggestedNames = await nomenaAgent(namingInput);
      
      if (suggestedNames && suggestedNames.length > 0) {
        updateBlueprint({ ...blueprint, name: suggestedNames[0].name });
      } else {
         throw new Error("The AI didn't return any name suggestions.");
      }
    } catch (error) {
      console.error("Failed to suggest a name:", error);
      alert("Sorry, I couldn't think of a name right now. Please try again.");
    } finally {
      setIsNaming(false);
    }
  };

  const handleUpdate = (prop: keyof WreathElement, value: any) => {
    if (selectedElement) {
      updateElement({ ...selectedElement, [prop]: value });
    }
  };

  const handlePositionUpdate = (prop: 'angle' | 'radius', value: number) => {
     if (selectedElement) {
      updateElement({ ...selectedElement, position: { ...selectedElement.position, [prop]: value } });
    }
  }

  const handleTuckPointUpdate = (prop: 'x' | 'y', value: number) => {
     if (selectedElement) {
      updateElement({ ...selectedElement, tuckPoint: { ...selectedElement.tuckPoint, [prop]: value } });
    }
  }

  const handleSizeUpdate = (prop: 'width' | 'height', value: number) => {
    if (selectedElement) {
      updateElement({ ...selectedElement, realWorldSizeInInches: { ...selectedElement.realWorldSizeInInches, [prop]: value } });
    }
  }
  
  const availableInventory = inventory.filter(i => i.isAvailable);

  const filteredInventory = useMemo(() => {
    let result = availableInventory;
    
    if (filterType !== 'all') {
      result = result.filter(item => item.type === filterType);
    }
    
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(item => 
        item.name.toLowerCase().includes(query) ||
        item.emotionTags?.some(tag => tag.toLowerCase().includes(query)) ||
        item.seasonTags?.some(tag => tag.toLowerCase().includes(query))
      );
    }
    
    return result;
  }, [availableInventory, filterType, searchQuery]);

  const inventoryByType = useMemo(() => {
    return {
      all: availableInventory.length,
      floral: availableInventory.filter(i => i.type === 'floral').length,
      greenery: availableInventory.filter(i => i.type === 'greenery').length,
      accent: availableInventory.filter(i => i.type === 'accent').length,
    };
  }, [availableInventory]);

  return (
    <div className="h-full flex flex-col">
      <div className="flex-grow overflow-y-auto pr-2">
        {/* Blueprint Info */}
        <div className="mb-4">
          <label htmlFor="blueprintName" className="text-sm font-medium text-gray-700">Blueprint Name</label>
           <div className="flex items-center gap-2 mt-1">
            <input 
                id="blueprintName"
                type="text"
                value={blueprint.name}
                onChange={(e) => updateBlueprint({...blueprint, name: e.target.value})}
                className="w-full p-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-navy-500"
            />
            <button 
              type="button" 
              onClick={handleSuggestName}
              disabled={isNaming}
              className="p-2 border rounded-md bg-gray-50 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-wait"
              title="Suggest a name with AI"
            >
              {isNaming ? (
                <div className="w-5 h-5 border-2 border-dashed rounded-full animate-spin border-gray-500"></div>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-600" viewBox="0 0 20 20" fill="currentColor">
                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                </svg>
              )}
            </button>
          </div>
        </div>

        <div className="mb-4">
          <label htmlFor="layoutStyleSelect" className="text-sm font-medium text-gray-700">Layout Style</label>
          <select 
            id="layoutStyleSelect"
            value={blueprint.layoutStyle}
            onChange={(e) => updateBlueprint({...blueprint, layoutStyle: e.target.value as LayoutStyle})}
            className="w-full p-2 border border-gray-300 rounded-md text-sm mt-1 focus:ring-2 focus:ring-navy-500 bg-white"
          >
            {LAYOUT_STYLES.map(style => (
              <option key={style} value={style}>
                {style.charAt(0).toUpperCase() + style.slice(1).replace(/-/g, ' ')}
              </option>
            ))}
          </select>
        </div>

        {/* Add Element with Search/Filter */}
        <div className="mb-4">
          <label className="text-sm font-medium text-gray-700 mb-2 block">Add Element</label>
          
          {/* Search input */}
          <div className="relative mb-2">
            <input 
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search botanicals..."
              className="w-full p-2 pl-8 border border-gray-300 rounded-md text-sm"
            />
            <svg className="w-4 h-4 absolute left-2.5 top-2.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            {searchQuery && (
              <button 
                onClick={() => setSearchQuery('')}
                className="absolute right-2 top-2 text-gray-400 hover:text-gray-600"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>

          {/* Filter buttons */}
          <div className="flex gap-1 mb-2">
            {(['all', 'floral', 'greenery', 'accent'] as FilterType[]).map(type => (
              <button
                key={type}
                onClick={() => setFilterType(type)}
                className={`flex-1 py-1 text-xs rounded ${
                  filterType === type 
                    ? 'bg-gray-700 text-white' 
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {type.charAt(0).toUpperCase() + type.slice(1)}
                <span className="ml-1 opacity-70">({inventoryByType[type]})</span>
              </button>
            ))}
          </div>

          {/* Inventory grid */}
          {filteredInventory.length === 0 ? (
            <p className="text-xs text-gray-400 text-center py-4">
              {searchQuery ? 'No matching botanicals' : 'No botanicals available'}
            </p>
          ) : (
            <div className="grid grid-cols-3 gap-1 max-h-32 overflow-y-auto p-1 bg-gray-50 rounded-md border">
              {filteredInventory.map(item => (
                <button
                  key={item.id}
                  onClick={() => addElement(item)}
                  className="p-1 rounded border border-transparent hover:border-gray-300 hover:bg-white transition-colors"
                  title={item.name}
                >
                  {item.processedImageUrl || item.imageUrl ? (
                    <img 
                      src={item.processedImageUrl || item.imageUrl} 
                      alt={item.name} 
                      className="w-full h-10 object-contain rounded"
                    />
                  ) : (
                    <div className="w-full h-10 bg-gray-200 rounded flex items-center justify-center">
                      <span className="text-xs text-gray-500">{item.name.slice(0, 2)}</span>
                    </div>
                  )}
                  <p className="text-xs text-gray-600 truncate mt-0.5">{item.name}</p>
                </button>
              ))}
            </div>
          )}
        </div>

        <hr className="my-4" />
        
        {/* Selected Element Controls */}
        {selectedElement ? (
          <div className="space-y-4 animate-fade-in">
            <h4 className="font-medium text-gray-700 text-sm">Editing: {selectedElement.name}</h4>
            
            <ControlSlider label="Angle" value={selectedElement.position.angle} min={0} max={360} onChange={val => handlePositionUpdate('angle', val)} unit="°" />
            <ControlSlider label="Radius" value={selectedElement.position.radius} min={0} max={1} step={0.01} onChange={val => handlePositionUpdate('radius', val)} />
            <ControlSlider label="Rotation" value={selectedElement.rotation} min={0} max={360} onChange={val => handleUpdate('rotation', val)} unit="°" />
            
            <div>
              <label className="text-xs font-medium text-gray-600">Layer</label>
              <div className="flex items-center justify-between mt-1 p-1 bg-gray-100 rounded-md">
                <button
                  onClick={() => handleUpdate('layer', Math.max(1, selectedElement.layer - 1))}
                  disabled={selectedElement.layer <= 1}
                  className="px-4 py-1 text-lg font-medium text-gray-700 bg-white border rounded shadow-sm hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  aria-label="Move layer down"
                >
                  -
                </button>
                <span className="font-medium text-gray-800">{selectedElement.layer}</span>
                <button
                  onClick={() => handleUpdate('layer', Math.min(5, selectedElement.layer + 1))}
                  disabled={selectedElement.layer >= 5}
                  className="px-4 py-1 text-lg font-medium text-gray-700 bg-white border rounded shadow-sm hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  aria-label="Move layer up"
                >
                  +
                </button>
              </div>
            </div>

            <div className="pt-2">
              <p className="text-xs font-medium text-gray-600 mb-1">Real-World Size (Inches)</p>
              <ControlSlider label="Width" value={selectedElement.realWorldSizeInInches.width} min={0.5} max={12} step={0.1} onChange={val => handleSizeUpdate('width', val)} unit='"' />
              <ControlSlider label="Height" value={selectedElement.realWorldSizeInInches.height} min={0.5} max={12} step={0.1} onChange={val => handleSizeUpdate('height', val)} unit='"' />
            </div>

            <div className="pt-2">
              <p className="text-xs font-medium text-gray-600 mb-1">Tuck Point (Anchor)</p>
              <ControlSlider label="Tuck Point X" value={selectedElement.tuckPoint.x} min={0} max={1} step={0.01} onChange={val => handleTuckPointUpdate('x', val)} />
              <ControlSlider label="Tuck Point Y" value={selectedElement.tuckPoint.y} min={0} max={1} step={0.01} onChange={val => handleTuckPointUpdate('y', val)} />
            </div>

            <button onClick={() => removeElement(selectedElement.id)} className="w-full text-sm text-red-600 hover:bg-red-50 p-2 rounded-md transition-colors mt-4">
              Remove Element
            </button>
          </div>
        ) : (
          <div className="text-center text-gray-500 text-sm py-10">
            <p>Select an element on the canvas to edit its properties, or add a new botanical from the list above.</p>
          </div>
        )}
      </div>
    </div>
  );
};

const ControlSlider: React.FC<{label: string, value: number, min: number, max: number, step?: number, unit?: string, onChange: (value: number) => void}> = 
({label, value, min, max, step = 1, unit = '', onChange}) => (
    <div>
        <label className="flex justify-between text-xs font-medium text-gray-600">
            <span>{label}</span>
            <span>{value.toFixed(step === 1 ? 0 : 2)}{unit}</span>
        </label>
        <input 
            type="range" 
            min={min} 
            max={max}
            step={step} 
            value={value} 
            onChange={e => onChange(parseFloat(e.target.value))} 
            className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-gray-600" />
    </div>
);
