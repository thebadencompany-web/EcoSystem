// components/EnhancedFloralDemo.tsx
import React, { useState, useEffect } from 'react';
import { VisualDebugPanel } from './VisualDebugPanel';
import { logicEngineAgent, florosAgent } from '../services/aiAgents';
import { 
  WreathBlueprint, 
  EnhancedLogicEngineOutput, 
  InventoryItem, 
  VisualFeatures,
  EmotionalDimensions,
  FlorosAgentInput
} from '../types';
import { isOpenAIConfigured, isGeminiConfigured } from '../services/config';

export const EnhancedFloralDemo: React.FC = () => {
  const [memory, setMemory] = useState<string>('');
  const [blueprint, setBlueprint] = useState<WreathBlueprint | undefined>();
  const [logicEngineOutput, setLogicEngineOutput] = useState<EnhancedLogicEngineOutput | undefined>();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [useAdvancedAI, setUseAdvancedAI] = useState(false);
  const [seasonalPreference, setSeasonalPreference] = useState<'spring' | 'summer' | 'fall' | 'winter' | 'auto'>('auto');
  const [botanicalMode, setBotanicalMode] = useState<'traditional' | 'modern' | 'naturalistic' | 'abstract'>('naturalistic');

  // Mock inventory for demo
  const mockInventory: InventoryItem[] = [
    {
      id: 'roses-red',
      name: 'Red Roses',
      type: 'floral',
      imageUrl: '/images/red-roses.jpg',
      svgRepresentation: '<circle cx="50" cy="50" r="40" fill="#DC2626" stroke="#B91C1C" stroke-width="2"/>',
      dimensions: { widthInches: 3, heightInches: 3 },
      dominantColors: ['#DC2626', '#B91C1C'],
      brightness: 0.6,
      shape: 'round',
      texture: 'velvety',
      complexity: 'moderate',
      seasonTags: ['summer', 'spring'],
      culturalTags: ['western', 'romantic'],
      symbolMeaning: 'Deep love and remembrance',
      fragilityScore: 0.7,
      emotionTags: ['love', 'passion', 'remembrance'],
      emotionalDimensions: { valence: 0.3, arousal: 0.8, temporalWeight: 0.2 },
      logicTrail: ['Tagged love due to red roses', 'High arousal from vibrant color'],
      isAvailable: true
    },
    {
      id: 'eucalyptus',
      name: 'Eucalyptus',
      type: 'greenery',
      imageUrl: '/images/eucalyptus.jpg', 
      svgRepresentation: '<ellipse cx="50" cy="50" rx="30" ry="45" fill="#059669" stroke="#047857" stroke-width="1"/>',
      dimensions: { widthInches: 2, heightInches: 8 },
      dominantColors: ['#059669', '#047857'],
      brightness: 0.4,
      shape: 'linear',
      texture: 'smooth',
      complexity: 'simple',
      seasonTags: ['all-season'],
      culturalTags: ['australian', 'healing'],
      symbolMeaning: 'Healing and protection',
      fragilityScore: 0.3,
      emotionTags: ['peace', 'healing'],
      emotionalDimensions: { valence: 0.6, arousal: 0.2, temporalWeight: 0.4 },
      logicTrail: ['Tagged peace due to low arousal', 'Healing association from cultural tags'],
      isAvailable: true
    },
    {
      id: 'white-lilies',
      name: 'White Lilies',
      type: 'floral',
      imageUrl: '/images/white-lilies.jpg',
      svgRepresentation: '<path d="M50,20 Q30,40 50,60 Q70,40 50,20 Z" fill="#FFFFFF" stroke="#E5E7EB" stroke-width="2"/>',
      dimensions: { widthInches: 4, heightInches: 5 },
      dominantColors: ['#FFFFFF', '#F9FAFB'],
      brightness: 0.9,
      shape: 'pointed',
      texture: 'smooth',
      complexity: 'moderate',
      seasonTags: ['spring', 'summer'],
      culturalTags: ['eastern', 'western', 'funeral'],
      symbolMeaning: 'Purity and rebirth',
      fragilityScore: 0.8,
      emotionTags: ['purity', 'hope', 'peace'],
      emotionalDimensions: { valence: 0.7, arousal: 0.1, temporalWeight: 0.8 },
      logicTrail: ['Tagged hope due to future orientation', 'High purity from white color'],
      isAvailable: true
    }
  ];

  const handleProcessMemory = async () => {
    if (!memory.trim()) {
      setError('Please enter a memory to process');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Step 1: Enhanced Logic Engine Analysis
      console.log('🔧 Running enhanced logic engine analysis...');
      
      // Create sample visual features from inventory
      const sampleFeatures: VisualFeatures & { 
        emotionalDimensions?: EmotionalDimensions; 
        memory?: string; 
        inventory?: InventoryItem[];
        useAdvancedAI?: boolean;
      } = {
        dominantColors: ['#DC2626', '#059669', '#FFFFFF'],
        brightness: 0.6,
        shape: 'round',
        texture: 'velvety',
        complexity: 'moderate',
        seasonTags: ['summer'],
        culturalTags: ['western'],
        symbolMeaning: 'Love and remembrance',
        fragilityScore: 0.6,
        emotionalDimensions: { valence: 0.5, arousal: 0.6, temporalWeight: 0.3 },
        memory,
        inventory: mockInventory,
        useAdvancedAI
      };

      const logicResult = await logicEngineAgent(sampleFeatures);
      setLogicEngineOutput(logicResult);
      console.log('✅ Logic engine analysis complete:', logicResult);

      // Step 2: Enhanced Floros Agent Blueprint Generation
      console.log('🌿 Running enhanced floros agent...');
      
      const florosInput: FlorosAgentInput & {
        logicEngineOutput?: EnhancedLogicEngineOutput;
        seasonalPreference?: 'spring' | 'summer' | 'fall' | 'winter' | 'auto';
        enableSeasonalOverlays?: boolean;
        botanicalStylingMode?: 'traditional' | 'modern' | 'naturalistic' | 'abstract';
      } = {
        memory,
        inventory: mockInventory,
        styleProfile: { id: 'singleton', aestheticNotes: 'Memorial wreath with personal meaning' },
        logicEngineOutput: logicResult,
        seasonalPreference,
        enableSeasonalOverlays: true,
        botanicalStylingMode: botanicalMode
      };

      const blueprintResult = await florosAgent(florosInput);
      setBlueprint(blueprintResult);
      console.log('✅ Blueprint generation complete:', blueprintResult);

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      setError(errorMessage);
      console.error('❌ Processing failed:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleFallbackPromptClick = (prompt: string) => {
    setMemory(prev => prev + ' ' + prompt);
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-medium text-gray-900">Enhanced Floral Memory System</h1>
          <p className="mt-2 text-lg text-gray-600">
            Advanced AI integration with GPT-5 Pro logic engine, seasonal intelligence, and visual debugging
          </p>
        </div>

        {/* Configuration Panel */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-xl font-medium mb-4">System Configuration</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            {/* AI Enhancement Toggle */}
            <div>
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={useAdvancedAI}
                  onChange={(e) => setUseAdvancedAI(e.target.checked)}
                  className="rounded border-gray-300 shadow-sm"
                />
                <span className="ml-2 text-sm font-medium text-gray-700">
                  GPT-5 Pro Enhancement
                </span>
                {!isOpenAIConfigured && (
                  <span className="ml-1 text-xs text-red-500">(API key required)</span>
                )}
              </label>
            </div>

            {/* Seasonal Preference */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Seasonal Preference
              </label>
              <select
                value={seasonalPreference}
                onChange={(e) => setSeasonalPreference(e.target.value as any)}
                className="block w-full rounded-md border-gray-300 shadow-sm"
              >
                <option value="auto">Auto-detect</option>
                <option value="spring">Spring</option>
                <option value="summer">Summer</option>
                <option value="fall">Fall</option>
                <option value="winter">Winter</option>
              </select>
            </div>

            {/* Botanical Mode */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Botanical Styling
              </label>
              <select
                value={botanicalMode}
                onChange={(e) => setBotanicalMode(e.target.value as any)}
                className="block w-full rounded-md border-gray-300 shadow-sm"
              >
                <option value="naturalistic">Naturalistic</option>
                <option value="traditional">Traditional</option>
                <option value="modern">Modern</option>
                <option value="abstract">Abstract</option>
              </select>
            </div>
          </div>

          {/* API Status Indicators */}
          <div className="flex space-x-4 text-sm">
            <span className={`flex items-center ${isGeminiConfigured ? 'text-gray-800' : 'text-gray-500'}`}>
              {isGeminiConfigured ? '✓' : '✗'} Gemini API
            </span>
            <span className={`flex items-center ${isOpenAIConfigured ? 'text-gray-800' : 'text-gray-500'}`}>
              {isOpenAIConfigured ? '✓' : '○'} OpenAI API {!isOpenAIConfigured && '(Optional)'}
            </span>
          </div>
        </div>

        {/* Memory Input */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-xl font-medium mb-4">Memory Processing</h2>
          
          <div className="mb-4">
            <label htmlFor="memory" className="block text-sm font-medium text-gray-700 mb-2">
              Share a memory you'd like to honor with a floral arrangement:
            </label>
            <textarea
              id="memory"
              value={memory}
              onChange={(e) => setMemory(e.target.value)}
              placeholder="Tell me about a special memory, person, or moment you'd like to commemorate..."
              className="w-full h-32 p-3 border border-gray-300 rounded-md shadow-sm"
            />
          </div>

          {error && (
            <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-md">
              <p className="text-red-800 text-sm">{error}</p>
            </div>
          )}

          <button
            onClick={handleProcessMemory}
            disabled={loading || !memory.trim()}
            className="inline-flex items-center px-6 py-3"
          >
            {loading ? (
              <>
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-gray-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Processing...
              </>
            ) : (
              'Generate Enhanced Design'
            )}
          </button>
        </div>

        {/* Results Display */}
        {(blueprint || logicEngineOutput) && (
          <div className="space-y-6">
            {/* Visual Debug Panel */}
            <VisualDebugPanel
              blueprint={blueprint}
              logicEngineOutput={logicEngineOutput}
              inventory={mockInventory}
              onFallbackPromptClick={handleFallbackPromptClick}
            />

            {/* Blueprint Summary */}
            {blueprint && (
              <div className="bg-white rounded-lg shadow-md p-6">
                <h2 className="text-xl font-medium mb-4">Generated Blueprint</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h3 className="font-medium text-gray-900 mb-2">Design Details</h3>
                    <dl className="space-y-1 text-sm">
                      <div><dt className="inline font-medium">Name:</dt> <dd className="inline">{blueprint.name}</dd></div>
                      <div><dt className="inline font-medium">Layout:</dt> <dd className="inline capitalize">{blueprint.layoutStyle}</dd></div>
                      <div><dt className="inline font-medium">Elements:</dt> <dd className="inline">{blueprint.elements.length}</dd></div>
                      <div><dt className="inline font-medium">Diameter:</dt> <dd className="inline">{blueprint.diameterInInches}"</dd></div>
                    </dl>
                  </div>
                  <div>
                    <h3 className="font-medium text-gray-900 mb-2">Description</h3>
                    <p className="text-sm text-gray-600">{blueprint.description}</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Getting Started Guide */}
        {!blueprint && !logicEngineOutput && !loading && (
          <div className="bg-gray-100 rounded-lg p-6">
            <h2 className="text-lg font-medium text-gray-900 mb-4">Getting Started</h2>
            <div className="space-y-3 text-gray-700">
              <p>1. <strong>Configure your preferences:</strong> Choose seasonal settings and botanical styling mode.</p>
              <p>2. <strong>Share a memory:</strong> Describe a person, moment, or feeling you'd like to honor.</p>
              <p>3. <strong>Enable advanced AI:</strong> For deeper analysis, configure OpenAI API access in your environment.</p>
              <p>4. <strong>Explore the debug panel:</strong> View SVG schematics, emotional scores, and metadata validation.</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};