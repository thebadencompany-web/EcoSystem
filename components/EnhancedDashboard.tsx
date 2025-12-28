// components/EnhancedDashboard.tsx
import React, { useState, useEffect } from 'react';
import { VisualDebugPanel } from './VisualDebugPanel';
import { BlueprintPreview } from './BlueprintPreview';
import { EmotionalFlowVisualizer } from './EmotionalFlowVisualizer';
import { InventoryArchive } from './InventoryArchive';
import { ValidationLayer } from './ValidationLayer';
import { logicEngineAgent, florosAgent } from '../services/aiAgents';
import { cloudSyncService } from '../services/cloudSyncService';
import { 
  WreathBlueprint, 
  EnhancedLogicEngineOutput, 
  EmotionalTone,
  SeasonalContext,
  ValidationReport,
  InventoryItem
} from '../types';
import '../styles/dashboard.css';

const CONFIG_STORAGE_KEY = 'wreathWeaver_enhancedDashboardConfig';

interface EnhancedDashboardState {
  memory: string;
  blueprint?: WreathBlueprint;
  logicEngineOutput?: EnhancedLogicEngineOutput;
  emotionalTone?: EmotionalTone;
  seasonalContext?: SeasonalContext;
  validationResults?: ValidationReport | null;
  archivedOutputs: any[];
  inventory: InventoryItem[];
  loading: boolean;
  error: string | null;
}

interface SystemConfig {
  useAdvancedAI: boolean;
  seasonalPreference: 'spring' | 'summer' | 'fall' | 'winter' | 'auto';
  botanicalMode: 'traditional' | 'modern' | 'naturalistic' | 'abstract';
  enableEmotionalOverlays: boolean;
  enableBotanicalTextures: boolean;
}

const defaultConfig: SystemConfig = {
  useAdvancedAI: true,
  seasonalPreference: 'auto',
  botanicalMode: 'naturalistic',
  enableEmotionalOverlays: true,
  enableBotanicalTextures: true
};

export const EnhancedDashboard: React.FC = () => {
  const [state, setState] = useState<EnhancedDashboardState>({
    memory: '',
    archivedOutputs: [],
    inventory: [],
    loading: false,
    error: null
  });

  const [systemConfig, setSystemConfig] = useState<SystemConfig>(() => {
    try {
      const saved = localStorage.getItem(CONFIG_STORAGE_KEY);
      return saved ? { ...defaultConfig, ...JSON.parse(saved) } : defaultConfig;
    } catch {
      return defaultConfig;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(CONFIG_STORAGE_KEY, JSON.stringify(systemConfig));
    } catch (err) {
      console.warn('Failed to save config:', err);
    }
  }, [systemConfig]);

  useEffect(() => {
    const loadInventory = async () => {
      try {
        const projectData = await cloudSyncService.loadProject();
        if (projectData?.inventory) {
          setState(prev => ({ ...prev, inventory: projectData.inventory }));
          console.log('[EnhancedDashboard] Loaded', projectData.inventory.length, 'inventory items from cloud');
        }
      } catch (err) {
        console.warn('[EnhancedDashboard] Failed to load inventory:', err);
      }
    };
    loadInventory();
  }, []);

  // Process memory through complete pipeline
  const processMemory = async () => {
    if (!state.memory.trim()) return;

    setState(prev => ({ ...prev, loading: true, error: null }));

    try {
      // Step 1: Enhanced Logic Engine
      console.log('🧠 Processing through Enhanced Logic Engine...');
      // logicEngineAgent expects a features object; cast to any for now to satisfy typing
      const logicOutput = await logicEngineAgent({ memory: state.memory, useAdvancedAI: systemConfig.useAdvancedAI } as any);

      // Extract emotional tone and seasonal context
      const emotionalTone: EmotionalTone = {
        primary: logicOutput.emotionalAnalysis?.primaryEmotion || 'contemplative',
        intensity: logicOutput.emotionalAnalysis?.intensity || 0.5,
        // map secondaryEmotions to simple string tags for UI palettes
        secondary: logicOutput.emotionalAnalysis?.secondaryEmotions?.map(e => e.emotion) || [],
        colorPalette: deriveColorPalette(logicOutput.emotionalAnalysis?.primaryEmotion || 'contemplative'),
        textureHints: deriveTextureHints(logicOutput.seasonalContext?.season || 'summer')
      };

      const seasonalContext: SeasonalContext = {
        season: logicOutput.seasonalContext?.season || 'summer',
        intensity: logicOutput.seasonalContext?.intensity || 0.7,
        botanicalFeatures: deriveBotanicalFeatures(logicOutput.seasonalContext?.season || 'summer'),
        overlayTexture: getSeasonalTexture(logicOutput.seasonalContext?.season || 'summer')
      };

      setState(prev => ({ 
        ...prev, 
        logicEngineOutput: logicOutput,
        emotionalTone,
        seasonalContext
      }));

      // Step 2: Enhanced Floros Agent
      console.log('🌸 Processing through Enhanced Floros Agent...');
      const florosInput = {
        // Fill required FlorosAgentInput fields for typing compatibility
        memory: state.memory,
        styleProfile: null as any,
        logicEngineOutput: logicOutput,
        seasonalPreference: systemConfig.seasonalPreference,
        botanicalStyling: systemConfig.botanicalMode,
        inventory: state.inventory, // Use real inventory from cloud
        emotionalPriority: 0.8
      };

      const blueprint = await florosAgent(florosInput);

      setState(prev => ({ 
        ...prev, 
        blueprint,
        loading: false
      }));

      // Archive outputs for inventory
      archiveOutputs(logicOutput, blueprint, emotionalTone, seasonalContext);

    } catch (error) {
      console.error('Pipeline processing failed:', error);
      setState(prev => ({ 
        ...prev, 
        loading: false, 
        error: error instanceof Error ? error.message : 'Unknown error'
      }));
    }
  };

  // Archive system for living inventory
  const archiveOutputs = (
    logicOutput: EnhancedLogicEngineOutput,
    blueprint: WreathBlueprint,
    emotionalTone: EmotionalTone,
    seasonalContext: SeasonalContext
  ) => {
    const archivedItem = {
      id: `archive_${Date.now()}`,
      timestamp: new Date().toISOString(),
      originalMemory: state.memory,
      logicOutput,
      blueprint,
      emotionalTone,
      seasonalContext,
      emotionalTaxonomy: {
        primaryEmotion: emotionalTone.primary,
        intensity: emotionalTone.intensity,
        seasonality: seasonalContext.season,
        gestureLogic: logicOutput.gestureLogic?.gestureType || 'unknown',
        seasonalNuance: logicOutput.seasonalNuance || [],
        symbolicTags: logicOutput.symbolicTags || [],
        gestureLanguage: logicOutput.gestureLanguage || undefined,
      }
    };

    setState(prev => ({
      ...prev,
      archivedOutputs: [archivedItem, ...prev.archivedOutputs.slice(0, 9)] // Keep last 10
    }));

    // Save to localStorage for persistence
    try {
      const toSave = [archivedItem, ...state.archivedOutputs.slice(0, 9)];
      localStorage.setItem('floralArchive', JSON.stringify(toSave));
    } catch (err) {
      console.warn('Failed to save to localStorage:', err);
    }
  };

  // Load archived outputs on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem('floralArchive');
      if (saved) {
        const archivedOutputs = JSON.parse(saved);
        setState(prev => ({ ...prev, archivedOutputs }));
      }
    } catch (err) {
      console.warn('Failed to load archived outputs:', err);
    }
  }, []);

  return (
    <div className="enhanced-dashboard">
      {/* Header with emotional tone overlay */}
      <div 
        className="dashboard-header"
        style={{
          background: state.emotionalTone ? 
            `linear-gradient(135deg, ${state.emotionalTone.colorPalette[0]}20, ${state.emotionalTone.colorPalette[1]}10)` : 
            'linear-gradient(135deg, #f8fafc, #e2e8f0)'
        }}
      >
        <h2>Enhanced Floral Intelligence Dashboard</h2>
        <div className="tone-indicator">
          {state.emotionalTone && (
            <span className="tone-badge">
              {state.emotionalTone.primary} ({Math.round(state.emotionalTone.intensity * 100)}%)
            </span>
          )}
          {state.seasonalContext && (
            <span className="season-badge">
              {state.seasonalContext.season} season
            </span>
          )}
        </div>
      </div>

      {/* System Configuration */}
      <div className="config-panel">
        <h3>System Configuration</h3>
        <div className="config-grid">
          <label>
            <input
              type="checkbox"
              checked={systemConfig.useAdvancedAI}
              onChange={(e) => setSystemConfig(prev => ({ ...prev, useAdvancedAI: e.target.checked }))}
            />
            Enhanced AI Processing
          </label>
          
          <select
            value={systemConfig.seasonalPreference}
            onChange={(e) => setSystemConfig(prev => ({ ...prev, seasonalPreference: e.target.value as any }))}
          >
            <option value="auto">Auto-detect Season</option>
            <option value="spring">Spring</option>
            <option value="summer">Summer</option>
            <option value="fall">Fall</option>
            <option value="winter">Winter</option>
          </select>

          <select
            value={systemConfig.botanicalMode}
            onChange={(e) => setSystemConfig(prev => ({ ...prev, botanicalMode: e.target.value as any }))}
          >
            <option value="naturalistic">Naturalistic</option>
            <option value="traditional">Traditional</option>
            <option value="modern">Modern</option>
            <option value="abstract">Abstract</option>
          </select>

          <label>
            <input
              type="checkbox"
              checked={systemConfig.enableEmotionalOverlays}
              onChange={(e) => setSystemConfig(prev => ({ ...prev, enableEmotionalOverlays: e.target.checked }))}
            />
            Emotional Overlays
          </label>

          <label>
            <input
              type="checkbox"
              checked={systemConfig.enableBotanicalTextures}
              onChange={(e) => setSystemConfig(prev => ({ ...prev, enableBotanicalTextures: e.target.checked }))}
            />
            Botanical Textures
          </label>
        </div>
      </div>

      {/* Memory Input */}
      <div className="memory-input-section">
        <h3>Memory Processing</h3>
        <textarea
          placeholder="Enter your memory to transform into a floral design..."
          value={state.memory}
          onChange={(e) => setState(prev => ({ ...prev, memory: e.target.value }))}
          rows={4}
          className="memory-textarea"
        />
        <button 
          onClick={processMemory}
          disabled={state.loading || !state.memory.trim()}
          className="process-button"
        >
          {state.loading ? 'Processing Pipeline...' : 'Transform Memory'}
        </button>
      </div>

      {state.error && (
        <div className="error-panel">
          <h3>Processing Error</h3>
          <p>{state.error}</p>
        </div>
      )}

      {/* Main Content Grid */}
      <div className="dashboard-grid">
        {/* Emotional Flow Visualizer */}
        {state.logicEngineOutput && (
          <EmotionalFlowVisualizer
            logicOutput={state.logicEngineOutput}
            emotionalTone={state.emotionalTone}
            seasonalContext={state.seasonalContext}
          />
        )}

        {/* Blueprint Preview (use floros/logic output for preview) */}
        {state.logicEngineOutput && (
          <BlueprintPreview
            florosOutput={state.logicEngineOutput as any}
            emotionalTone={state.emotionalTone}
            seasonalContext={state.seasonalContext}
          />
        )}

        {/* Validation Layer */}
        {(state.logicEngineOutput || state.blueprint) && (
          <ValidationLayer
            metadata={state.blueprint ? ({
              name: state.blueprint.name,
              svgRepresentation: (state.blueprint.schematic && (state.blueprint.schematic as any).svgContent) || '',
              visualFeatures: { dominantColors: [], brightness: 0.5, shape: 'other', texture: 'other', complexity: 'moderate', seasonTags: [], culturalTags: [], symbolMeaning: '', fragilityScore: 0.5 },
              durabilityScore: 0.5,
              emotionalDimensions: { valence: 0.5, arousal: 0.5, temporalWeight: 0.5 }
            } as any) : ({} as any)}
            logicOutput={state.logicEngineOutput}
            emotionalTone={state.emotionalTone}
            onValidationComplete={(results: ValidationReport) => setState(prev => ({ ...prev, validationResults: results }))}
            onMetadataUpdated={() => {}}
          />
        )}

        {/* Visual Debug Panel */}
        {state.logicEngineOutput && (
          <VisualDebugPanel
            logicEngineOutput={state.logicEngineOutput}
            blueprint={state.blueprint}
            inventory={state.inventory}
          />
        )}
      </div>

      {/* Inventory Archive */}
      <InventoryArchive
        currentFlorosOutput={state.logicEngineOutput as any}
        currentLogicOutput={state.logicEngineOutput}
        onLoadItem={() => {}}
      />
    </div>
  );
};

// Helper functions for tone-based styling
function deriveColorPalette(emotion: string): string[] {
  const palettes: { [key: string]: string[] } = {
    contemplative: ['#6366f1', '#8b5cf6', '#a855f7'],
    joyful: ['#f59e0b', '#f97316', '#ef4444'],
    melancholic: ['#6b7280', '#4f46e5', '#06b6d4'],
    nostalgic: ['#d97706', '#92400e', '#7c2d12'],
    peaceful: ['#10b981', '#059669', '#047857'],
    passionate: ['#dc2626', '#b91c1c', '#991b1b'],
    hopeful: ['#3b82f6', '#2563eb', '#1d4ed8'],
    default: ['#6b7280', '#4b5563', '#374151']
  };
  return palettes[emotion] || palettes.default;
}

function deriveTextureHints(emotion: string): string[] {
  const textures: { [key: string]: string[] } = {
    contemplative: ['soft', 'layered', 'flowing'],
    joyful: ['vibrant', 'textured', 'dynamic'],
    melancholic: ['muted', 'delicate', 'wispy'],
    nostalgic: ['weathered', 'vintage', 'warm'],
    peaceful: ['smooth', 'organic', 'gentle'],
    passionate: ['bold', 'dramatic', 'intense'],
    hopeful: ['luminous', 'ascending', 'fresh'],
    default: ['natural', 'balanced', 'harmonious']
  };
  return textures[emotion] || textures.default;
}

function deriveBotanicalFeatures(season: string): string[] {
  const features: { [key: string]: string[] } = {
    spring: ['fresh buds', 'light greens', 'delicate petals'],
    summer: ['full blooms', 'vibrant colors', 'lush foliage'],
    fall: ['warm tones', 'seed pods', 'golden leaves'],
    winter: ['bare branches', 'evergreens', 'subtle textures'],
    default: ['balanced elements', 'natural forms', 'organic shapes']
  };
  return features[season] || features.default;
}

function getSeasonalTexture(season: string): string {
  const textures: { [key: string]: string } = {
    spring: 'linear-gradient(45deg, #bbf7d0 0%, #dcfce7 100%)',
    summer: 'linear-gradient(45deg, #fef3c7 0%, #fde68a 100%)',
    fall: 'linear-gradient(45deg, #fed7aa 0%, #fdba74 100%)',
    winter: 'linear-gradient(45deg, #e0e7ff 0%, #c7d2fe 100%)',
    default: 'linear-gradient(45deg, #f3f4f6 0%, #e5e7eb 100%)'
  };
  return textures[season] || textures.default;
}