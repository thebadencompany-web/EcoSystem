// components/ValidationLayer.tsx
import React, { useState, useEffect, useCallback } from 'react';
import { BotanicalMetadata, EnhancedLogicEngineOutput, EmotionalTone } from '../types';

interface ValidationResult {
  isValid: boolean;
  missingFields: string[];
  emotionalImpactScore: number;
  suggestedReplacements: { [key: string]: any };
  confidence: number;
  fallbackAnnotations?: string[];
}

interface ValidationLayerProps {
  metadata: BotanicalMetadata;
  logicOutput?: EnhancedLogicEngineOutput;
  emotionalTone?: EmotionalTone;
  onValidationComplete: (result: ValidationResult) => void;
  onMetadataUpdated: (updatedMetadata: BotanicalMetadata) => void;
}

export const ValidationLayer: React.FC<ValidationLayerProps> = ({
  metadata,
  logicOutput,
  emotionalTone,
  onValidationComplete,
  onMetadataUpdated
}) => {
  const [validationResult, setValidationResult] = useState<ValidationResult | null>(null);
  const [isValidating, setIsValidating] = useState(false);
  const [autoFix, setAutoFix] = useState(true);
  const [emotionalContext, setEmotionalContext] = useState<string>('neutral');

  // Core validation logic
  const validateMetadata = useCallback(async (data: BotanicalMetadata): Promise<ValidationResult> => {
    const requiredFields = ['species', 'commonName', 'bloomingSeason', 'colorProfile'];
    const criticalFields = ['flowerStructure', 'gestureLanguage'];
    
    const missingFields: string[] = [];
    const suggestedReplacements: { [key: string]: any } = {};
    
    // Check required fields
    requiredFields.forEach(field => {
      if (!data[field as keyof BotanicalMetadata] || 
          (typeof data[field as keyof BotanicalMetadata] === 'string' && 
           (data[field as keyof BotanicalMetadata] as string).trim() === '')) {
        missingFields.push(field);
      }
    });

    // Check critical fields for emotional processing
    criticalFields.forEach(field => {
      if (!data[field as keyof BotanicalMetadata]) {
        missingFields.push(field);
      }
    });

    // Calculate emotional impact score
    const emotionalImpactScore = calculateEmotionalImpact(data, logicOutput);

    // Generate smart replacements
    if (missingFields.length > 0) {
      for (const field of missingFields) {
        suggestedReplacements[field] = await generateSmartReplacement(field, data, emotionalContext);
      }
    }

    // Assess overall confidence
    const confidence = calculateConfidence(data, missingFields, emotionalImpactScore);

    const result: ValidationResult = {
      isValid: missingFields.length === 0,
      missingFields,
      emotionalImpactScore,
      suggestedReplacements,
      confidence,
      fallbackAnnotations: missingFields.length > 0 ? generateFallbackAnnotations(missingFields, data) : undefined
    };

    return result;
  }, [logicOutput, emotionalContext]);

  // Auto-validation effect
  useEffect(() => {
    if (metadata) {
      setIsValidating(true);
      validateMetadata(metadata)
        .then(result => {
          setValidationResult(result);
          onValidationComplete(result);
          
          // Auto-fix if enabled and replacements available
          if (autoFix && !result.isValid && Object.keys(result.suggestedReplacements).length > 0) {
            applyAutoFix(result.suggestedReplacements);
          }
        })
        .catch(error => {
          console.error('Validation failed:', error);
        })
        .finally(() => {
          setIsValidating(false);
        });
    }
  }, [metadata, validateMetadata, onValidationComplete, autoFix]);

  // Auto-fix application
  const applyAutoFix = useCallback((replacements: { [key: string]: any }) => {
    const updatedMetadata = { ...metadata };
    
    Object.entries(replacements).forEach(([field, value]) => {
      (updatedMetadata as any)[field] = value;
    });

    onMetadataUpdated(updatedMetadata);
  }, [metadata, onMetadataUpdated]);

  // Manual fix application
  const applyManualFix = (field: string, value: any) => {
    const updatedMetadata = { ...metadata, [field]: value };
    onMetadataUpdated(updatedMetadata);
  };

  const getEmotionalImpactColor = (score: number): string => {
    if (score >= 0.8) return '#10b981'; // High impact - green
    if (score >= 0.6) return '#f59e0b'; // Medium impact - amber
    if (score >= 0.4) return '#ef4444'; // Low impact - red
    return '#6b7280'; // Very low impact - gray
  };

  const getConfidenceColor = (confidence: number): string => {
    if (confidence >= 0.9) return '#10b981';
    if (confidence >= 0.7) return '#f59e0b';
    return '#ef4444';
  };

  return (
    <div className="validation-layer">
      <div className="validation-header">
        <h3>Botanical Metadata Validation</h3>
        <div className="validation-controls">
          <label className="auto-fix-toggle">
            <input
              type="checkbox"
              checked={autoFix}
              onChange={(e) => setAutoFix(e.target.checked)}
            />
            <span>Auto-fix</span>
          </label>
          <select 
            value={emotionalContext}
            onChange={(e) => setEmotionalContext(e.target.value)}
            className="emotional-context-selector"
          >
            <option value="neutral">Neutral Context</option>
            <option value="romantic">Romantic Context</option>
            <option value="memorial">Memorial Context</option>
            <option value="celebratory">Celebratory Context</option>
            <option value="therapeutic">Therapeutic Context</option>
          </select>
        </div>
      </div>

      {isValidating && (
        <div className="validation-loading">
          <div className="loading-spinner" />
          <span>Validating botanical metadata...</span>
        </div>
      )}

      {validationResult && (
        <div className="validation-results">
          {/* Overall Status */}
          <div className="validation-status">
            <div className="status-indicator">
              <div 
                className={`status-light ${validationResult.isValid ? 'valid' : 'invalid'}`}
                title={validationResult.isValid ? 'All required fields present' : 'Missing required fields'}
              />
              <span className="status-text">
                {validationResult.isValid ? 'Metadata Complete' : 'Validation Issues'}
              </span>
            </div>

            <div className="impact-metrics">
              <div className="metric">
                <span className="metric-label">Emotional Impact</span>
                <div className="metric-bar">
                  <div 
                    className="metric-fill"
                    style={{ 
                      width: `${validationResult.emotionalImpactScore * 100}%`,
                      backgroundColor: getEmotionalImpactColor(validationResult.emotionalImpactScore)
                    }}
                  />
                </div>
                <span className="metric-value">
                  {Math.round(validationResult.emotionalImpactScore * 100)}%
                </span>
              </div>

              <div className="metric">
                <span className="metric-label">Confidence</span>
                <div className="metric-bar">
                  <div 
                    className="metric-fill"
                    style={{ 
                      width: `${validationResult.confidence * 100}%`,
                      backgroundColor: getConfidenceColor(validationResult.confidence)
                    }}
                  />
                </div>
                <span className="metric-value">
                  {Math.round(validationResult.confidence * 100)}%
                </span>
              </div>
            </div>
          </div>

          {/* Missing Fields & Replacements */}
          {validationResult.missingFields.length > 0 && (
            <div className="missing-fields-section">
              <h4>Missing Required Fields</h4>
              <div className="missing-fields-list">
                {validationResult.missingFields.map(field => (
                  <div key={field} className="missing-field-item">
                    <div className="field-info">
                      <span className="field-name">{formatFieldName(field)}</span>
                      <span className="field-importance">
                        {getCriticalFieldLabel(field)}
                      </span>
                    </div>

                    {validationResult.suggestedReplacements[field] && (
                      <div className="replacement-suggestion">
                        <span className="suggestion-label">Suggested:</span>
                        <div className="suggestion-value">
                          {typeof validationResult.suggestedReplacements[field] === 'object' 
                            ? JSON.stringify(validationResult.suggestedReplacements[field], null, 2)
                            : validationResult.suggestedReplacements[field]
                          }
                        </div>
                        <button
                          className="apply-suggestion-btn"
                          onClick={() => applyManualFix(field, validationResult.suggestedReplacements[field])}
                        >
                          Apply
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Fallback Annotations */}
          {validationResult.fallbackAnnotations && (
            <div className="fallback-annotations">
              <h4>Fallback Recovery Notes</h4>
              <div className="annotation-list">
                {validationResult.fallbackAnnotations.map((annotation, index) => (
                  <div key={index} className="annotation-item">
                    <div className="annotation-icon">⚠️</div>
                    <span className="annotation-text">{annotation}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Emotional Context Insights */}
          {logicOutput && (
            <div className="emotional-insights">
              <h4>Emotional Processing Readiness</h4>
              <div className="insight-cards">
                <div className="insight-card">
                  <span className="insight-label">Primary Emotion</span>
                  <span className="insight-value">
                    {logicOutput.emotionalAnalysis?.primaryEmotion || 'Undefined'}
                  </span>
                  <div className="emotion-confidence">
                    {logicOutput.emotionalAnalysis?.confidence 
                      ? `${Math.round(logicOutput.emotionalAnalysis.confidence * 100)}% confident`
                      : 'Low confidence'
                    }
                  </div>
                </div>

                {logicOutput.storytellingScores && (
                  <div className="insight-card">
                    <span className="insight-label">Narrative Strength</span>
                    <span className="insight-value">
                      {Math.round(logicOutput.storytellingScores.narrativeCoherence * 100)}%
                    </span>
                  </div>
                )}

                <div className="insight-card">
                  <span className="insight-label">Manufacturing Ready</span>
                  <span className="insight-value">
                    {validationResult.isValid && validationResult.confidence > 0.8 ? 'Yes' : 'Needs Review'}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// Helper functions
function calculateEmotionalImpact(metadata: BotanicalMetadata, logicOutput?: EnhancedLogicEngineOutput): number {
  let score = 0;

  // Base emotional fields
  if (metadata.emotionalTags && metadata.emotionalTags.length > 0) score += 0.3;
  if (metadata.colorProfile && metadata.colorProfile.length > 0) score += 0.2;
  if (metadata.gestureLanguage && Object.keys(metadata.gestureLanguage).length > 0) score += 0.2;

  // Logic engine enhancement
  if (logicOutput?.emotionalAnalysis) {
    score += logicOutput.emotionalAnalysis.intensity * 0.3;
  }

  return Math.min(score, 1.0);
}

function calculateConfidence(
  metadata: BotanicalMetadata, 
  missingFields: string[], 
  emotionalImpact: number
): number {
  const totalFields = 8; // Approximate total important fields
  const presentFields = totalFields - missingFields.length;
  const completeness = presentFields / totalFields;
  
  return (completeness * 0.7) + (emotionalImpact * 0.3);
}

async function generateSmartReplacement(
  field: string, 
  metadata: BotanicalMetadata, 
  emotionalContext: string
): Promise<any> {
  // Smart replacement logic based on field type and available context
  const replacements: { [key: string]: any } = {
    species: `Unknown ${metadata.commonName || 'botanical'} species`,
    commonName: metadata.species ? extractCommonName(metadata.species) : 'Unknown flower',
    bloomingSeason: inferSeasonFromMetadata(metadata),
    colorProfile: inferColorsFromMetadata(metadata),
    flowerStructure: {
      petalCount: 5,
      arrangement: 'radial',
      size: 'medium',
      texture: 'smooth'
    },
    gestureLanguage: generateEmotionalGesture(emotionalContext)
  };

  return replacements[field] || `Auto-generated ${field}`;
}

function generateFallbackAnnotations(missingFields: string[], metadata: BotanicalMetadata): string[] {
  const annotations: string[] = [];
  
  if (missingFields.includes('species') || missingFields.includes('commonName')) {
    annotations.push('Botanical identification may be incomplete - using visual analysis fallbacks');
  }
  
  if (missingFields.includes('emotionalTags') || missingFields.includes('gestureLanguage')) {
    annotations.push('Emotional context derived from color and structural analysis');
  }
  
  if (missingFields.includes('bloomingSeason')) {
    annotations.push('Seasonal context inferred from available metadata');
  }
  
  return annotations;
}

function formatFieldName(field: string): string {
  return field
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, str => str.toUpperCase());
}

function getCriticalFieldLabel(field: string): string {
  const criticalFields = ['species', 'commonName', 'flowerStructure', 'gestureLanguage'];
  const emotionalFields = ['emotionalTags', 'gestureLanguage', 'colorProfile'];
  
  if (criticalFields.includes(field)) return 'Critical';
  if (emotionalFields.includes(field)) return 'Emotional';
  return 'Standard';
}

function extractCommonName(species: string): string {
  // Simple extraction logic - could be enhanced with botanical databases
  const words = species.split(' ');
  return words[words.length - 1].toLowerCase();
}

function inferSeasonFromMetadata(metadata: BotanicalMetadata): string {
  if (metadata.colorProfile) {
    const colors = metadata.colorProfile.join(' ').toLowerCase();
    if (colors.includes('pink') || colors.includes('light green')) return 'spring';
    if (colors.includes('bright') || colors.includes('yellow')) return 'summer';
    if (colors.includes('orange') || colors.includes('red')) return 'fall';
    if (colors.includes('white') || colors.includes('silver')) return 'winter';
  }
  return 'unknown';
}

function inferColorsFromMetadata(metadata: BotanicalMetadata): string[] {
  if (metadata.species) {
    const species = metadata.species.toLowerCase();
    if (species.includes('rose')) return ['red', 'pink'];
    if (species.includes('daisy')) return ['white', 'yellow'];
    if (species.includes('violet')) return ['purple', 'blue'];
  }
  return ['unknown'];
}

function generateEmotionalGesture(context: string): any {
  const gestures: { [key: string]: any } = {
    romantic: { primary: 'embrace', secondary: 'caress', intensity: 'gentle' },
    memorial: { primary: 'reverence', secondary: 'comfort', intensity: 'solemn' },
    celebratory: { primary: 'flourish', secondary: 'dance', intensity: 'joyful' },
    therapeutic: { primary: 'soothe', secondary: 'heal', intensity: 'calm' },
    neutral: { primary: 'present', secondary: 'observe', intensity: 'balanced' }
  };
  
  return gestures[context] || gestures.neutral;
}