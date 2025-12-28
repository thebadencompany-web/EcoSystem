import React, { useState, useCallback } from 'react';
import type { WreathBlueprint, InventoryItem, LayoutStyle, NarrativeContent, MemoryName } from '../types';
import { florosAgent, mythoscribeAgent, nomenaAgent } from '../services/aiAgents';

interface AIStudioProps {
  inventory: InventoryItem[];
  currentBlueprint: WreathBlueprint | null;
  onApplyBlueprint: (blueprint: WreathBlueprint) => void;
}

type StylePreset = 'traditional' | 'modern' | 'naturalistic' | 'clustered' | 'sparse' | 'asymmetrical';
type LayoutPreset = 'radial' | 'cascade' | 'spiral' | 'crescent' | 'freeform';

const STYLE_PRESETS: { id: StylePreset; label: string; description: string }[] = [
  { id: 'traditional', label: 'Traditional', description: 'Classic memorial arrangement with formal symmetry' },
  { id: 'modern', label: 'Modern', description: 'Contemporary design with clean lines and asymmetry' },
  { id: 'naturalistic', label: 'Naturalistic', description: 'Organic garden-style that mimics natural growth' },
  { id: 'clustered', label: 'Clustered', description: 'Dense groupings of elements for rich texture' },
  { id: 'sparse', label: 'Sparse', description: 'Minimal elements with breathing space' },
  { id: 'asymmetrical', label: 'Asymmetrical', description: 'Dynamic balance with visual interest' },
];

const LAYOUT_PRESETS: { id: LayoutPreset; label: string }[] = [
  { id: 'radial', label: 'Radial' },
  { id: 'cascade', label: 'Cascade' },
  { id: 'spiral', label: 'Spiral' },
  { id: 'crescent', label: 'Crescent' },
  { id: 'freeform', label: 'Freeform' },
];

export const AIStudio: React.FC<AIStudioProps> = ({
  inventory,
  currentBlueprint,
  onApplyBlueprint,
}) => {
  const [selectedStyle, setSelectedStyle] = useState<StylePreset>('naturalistic');
  const [selectedLayout, setSelectedLayout] = useState<LayoutPreset>('radial');
  const [useFullInventory, setUseFullInventory] = useState(true);
  const [memoryPrompt, setMemoryPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedBlueprint, setGeneratedBlueprint] = useState<WreathBlueprint | null>(null);
  const [generatedStory, setGeneratedStory] = useState<NarrativeContent | null>(null);
  const [suggestedNames, setSuggestedNames] = useState<MemoryName[]>([]);
  const [selectedName, setSelectedName] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [selectedBaseId, setSelectedBaseId] = useState<string>('');

  const availableBases = inventory.filter(item => item.structureRole === 'base');
  const botanicalInventory = inventory.filter(item => (item.structureRole || 'botanical') === 'botanical');

  const handleGenerate = useCallback(async () => {
    if (botanicalInventory.length === 0) {
      setError('Please add botanical items to your inventory first.');
      return;
    }

    if (availableBases.length > 0 && !selectedBaseId) {
      setError('Please select a wreath base before generating.');
      return;
    }

    setIsGenerating(true);
    setError(null);
    setGeneratedBlueprint(null);
    setGeneratedStory(null);
    setSuggestedNames([]);
    setSelectedName('');

    try {
      const selectedInventory = useFullInventory 
        ? botanicalInventory 
        : botanicalInventory.slice(0, Math.min(8, botanicalInventory.length));

      const selectedBase = availableBases.find(b => b.id === selectedBaseId);

      const blueprint = await florosAgent({
        memory: memoryPrompt || 'A meaningful memorial wreath celebrating cherished memories.',
        inventory: selectedInventory,
        styleProfile: { id: 'studio', aestheticNotes: `Style: ${selectedStyle}, Layout: ${selectedLayout}` },
        baseImage: null,
        logicEngineOutput: null,
        enableSeasonalOverlays: true,
        botanicalStylingMode: selectedStyle === 'traditional' ? 'traditional' : 
                             selectedStyle === 'modern' ? 'modern' : 'naturalistic',
        selectedBase: selectedBase || null,
      });

      if (blueprint.layoutStyle !== selectedLayout) {
        blueprint.layoutStyle = selectedLayout as LayoutStyle;
      }

      setGeneratedBlueprint(blueprint);

      const narrativeComponents = blueprint.elements.slice(0, 5).map(el => {
        const item = inventory.find(i => i.id === el.inventoryId);
        return {
          botanicalName: item?.name || el.name,
          emotionalMeaning: item?.symbolMeaning || 'beauty and grace',
          memoryConnection: memoryPrompt || 'cherished memories',
        };
      });

      const [story, names] = await Promise.all([
        mythoscribeAgent(narrativeComponents, 'poetic', 'Acceptance'),
        nomenaAgent({
          memory: memoryPrompt || 'A memorial wreath design',
          tone: 'poetic',
          season: 'spring',
        }),
      ]);

      setGeneratedStory(story);
      setSuggestedNames(names);
      if (names.length > 0) {
        setSelectedName(names[0].name);
      }

    } catch (err) {
      console.error('Generation failed:', err);
      setError('Failed to generate design. Please check your API configuration and try again.');
    } finally {
      setIsGenerating(false);
    }
  }, [botanicalInventory, availableBases, selectedBaseId, useFullInventory, memoryPrompt, selectedStyle, selectedLayout]);

  const handleApply = useCallback(() => {
    if (!generatedBlueprint) return;
    
    const finalBlueprint: WreathBlueprint = {
      ...generatedBlueprint,
      name: selectedName || generatedBlueprint.name,
      therapeuticNarrative: generatedStory?.narrative,
    };
    
    onApplyBlueprint(finalBlueprint);
  }, [generatedBlueprint, selectedName, generatedStory, onApplyBlueprint]);

  return (
    <div className="h-full flex flex-col p-4 overflow-auto">
      <div className="mb-4">
        <h3 className="text-lg font-light text-gray-800 mb-2">AI Design Studio</h3>
        <p className="text-sm text-gray-500">Generate a complete wreath design with story and name suggestions.</p>
      </div>

      <div className="space-y-4 flex-grow">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Memory / Theme</label>
          <textarea
            value={memoryPrompt}
            onChange={(e) => setMemoryPrompt(e.target.value)}
            placeholder="Describe the memory or theme for this wreath..."
            className="w-full p-2 border border-gray-200 rounded-md text-sm resize-none"
            rows={3}
          />
        </div>

        {availableBases.length > 0 ? (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Select Wreath Base *</label>
            <select
              value={selectedBaseId}
              onChange={(e) => setSelectedBaseId(e.target.value)}
              className="w-full p-2 border border-gray-200 rounded-md text-sm bg-white"
            >
              <option value="">Choose a base...</option>
              {availableBases.map(base => (
                <option key={base.id} value={base.id}>
                  {base.name} ({base.baseProperties?.baseStyle || 'unknown'} - {base.dimensions.widthInches}" x {base.dimensions.heightInches}")
                </option>
              ))}
            </select>
          </div>
        ) : (
          <div className="p-3 bg-amber-50 border border-amber-200 rounded-md">
            <p className="text-sm text-amber-800">No wreath bases in inventory. Add a wreath base to your inventory first, or generate a design without a base.</p>
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Design Style</label>
          <div className="grid grid-cols-2 gap-2">
            {STYLE_PRESETS.map(style => (
              <button
                key={style.id}
                onClick={() => setSelectedStyle(style.id)}
                className={`p-2 text-left rounded-md border text-sm transition-colors ${
                  selectedStyle === style.id 
                    ? 'border-gray-800 bg-gray-50' 
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="font-medium text-gray-800">{style.label}</div>
                <div className="text-xs text-gray-500">{style.description}</div>
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Layout Pattern</label>
          <div className="flex flex-wrap gap-2">
            {LAYOUT_PRESETS.map(layout => (
              <button
                key={layout.id}
                onClick={() => setSelectedLayout(layout.id)}
                className={`px-3 py-1.5 rounded-md text-sm transition-colors ${
                  selectedLayout === layout.id
                    ? 'bg-gray-800 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {layout.label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <input
              type="checkbox"
              checked={useFullInventory}
              onChange={(e) => setUseFullInventory(e.target.checked)}
              className="rounded"
            />
            <span className="text-gray-700">Use all botanicals ({botanicalInventory.length})</span>
          </label>
          {!useFullInventory && (
            <p className="text-xs text-gray-500 mt-1">Will use up to 8 items for a simpler design</p>
          )}
        </div>

        <button
          onClick={handleGenerate}
          disabled={isGenerating || botanicalInventory.length === 0 || (availableBases.length > 0 && !selectedBaseId)}
          className="w-full py-2.5 rounded-md text-white font-medium transition-colors disabled:opacity-50"
          style={{ backgroundColor: isGenerating ? '#6B7280' : '#1E3A5F' }}
        >
          {isGenerating ? (
            <span className="flex items-center justify-center gap-2">
              <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              Generating...
            </span>
          ) : 'Generate Design'}
        </button>

        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-md text-sm text-red-700">
            {error}
          </div>
        )}

        {generatedBlueprint && (
          <div className="border-t pt-4 space-y-4">
            <div>
              <h4 className="text-sm font-medium text-gray-700 mb-2">Generated Blueprint</h4>
              <div className="p-3 bg-gray-50 rounded-md">
                <div className="text-sm text-gray-800 font-medium">{generatedBlueprint.name}</div>
                <div className="text-xs text-gray-500 mt-1">
                  {generatedBlueprint.elements.length} elements · {generatedBlueprint.layoutStyle} layout
                </div>
              </div>
            </div>

            {suggestedNames.length > 0 && (
              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-2">Suggested Names</h4>
                <div className="space-y-2">
                  {suggestedNames.map((nameObj, idx) => (
                    <button
                      key={idx}
                      onClick={() => setSelectedName(nameObj.name)}
                      className={`w-full p-2 text-left rounded-md border text-sm transition-colors ${
                        selectedName === nameObj.name
                          ? 'border-gray-800 bg-gray-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <div className="font-medium text-gray-800">{nameObj.name}</div>
                      <div className="text-xs text-gray-500">{nameObj.rationale}</div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {generatedStory && (
              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-2">Therapeutic Narrative</h4>
                <div className="p-3 bg-gray-50 rounded-md text-sm text-gray-700 leading-relaxed max-h-32 overflow-auto">
                  {generatedStory.narrative}
                </div>
              </div>
            )}

            <button
              onClick={handleApply}
              className="w-full py-2.5 rounded-md text-white font-medium transition-colors"
              style={{ backgroundColor: '#1E3A5F' }}
            >
              Apply to Canvas
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default AIStudio;
