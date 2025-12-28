import React, { useState } from 'react';
import { WreathBlueprint, EnhancedLogicEngineOutput, InventoryItem } from '../types';

interface VisualDebugPanelProps {
  blueprint?: WreathBlueprint;
  logicEngineOutput?: EnhancedLogicEngineOutput;
  inventory: InventoryItem[];
  onFallbackPromptClick?: (prompt: string) => void;
}

export const VisualDebugPanel: React.FC<VisualDebugPanelProps> = ({
  blueprint,
  logicEngineOutput,
  inventory,
  onFallbackPromptClick
}) => {
  const [activeTab, setActiveTab] = useState<'svg' | 'emotions' | 'manufacturing' | 'metadata'>('svg');
  const [svgError, setSvgError] = useState<string | null>(null);

  const getScoreColor = (score: number): string => {
    if (score >= 0.8) return 'text-gray-900 bg-gray-100';
    if (score >= 0.6) return 'text-gray-800 bg-gray-100';
    if (score >= 0.4) return 'text-gray-700 bg-gray-100';
    return 'text-gray-600 bg-gray-100';
  };

  const ScoreDisplay: React.FC<{ label: string; score: number; unit?: string }> = ({ label, score, unit = '' }) => (
    <div className={`p-2 rounded-md ${getScoreColor(score)}`}>
      <div className="text-sm font-medium">{label}</div>
      <div className="text-lg font-medium">{(score * 100).toFixed(0)}%{unit}</div>
    </div>
  );

  const validateSVG = (svgContent: string): boolean => {
    try {
      const parser = new DOMParser();
      const doc = parser.parseFromString(svgContent, 'image/svg+xml');
      const parseError = doc.querySelector('parsererror');
      if (parseError) {
        setSvgError(`SVG Parse Error: ${parseError.textContent}`);
        return false;
      }
      setSvgError(null);
      return true;
    } catch (error) {
      setSvgError(`SVG Validation Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return false;
    }
  };

  return (
    <div className="bg-white shadow-lg rounded-lg border border-gray-200">
      <div className="border-b border-gray-200 px-6 py-4">
        <h2 className="text-xl font-medium text-gray-900">Visual Debug Panel</h2>
        <p className="text-sm text-gray-600 mt-1">
          Real-time blueprint analysis, SVG preview, and metadata validation
        </p>
      </div>

      <div className="border-b border-gray-200">
        <nav className="-mb-px flex">
          {[
            { key: 'svg', label: 'SVG Schematic' },
            { key: 'emotions', label: 'Emotional Scores' },
            { key: 'manufacturing', label: 'Manufacturing' },
            { key: 'metadata', label: 'Metadata Status' }
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as any)}
              className={`py-2 px-4 border-b-2 font-medium text-sm ${
                activeTab === tab.key
                  ? 'border-gray-900 text-gray-900'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>


              {logicEngineOutput && (
                <>
                <div className="insight-card">
                  <span className="insight-label">Seasonal Nuance</span>
                  <div className="insight-value">
                    {(logicEngineOutput.seasonalNuance || []).length > 0 ? (
                      (logicEngineOutput.seasonalNuance || []).map((n: string, i: number) => (
                        <span key={i} className="inline-block px-2 py-1 text-xs bg-gray-200 text-gray-800 rounded mr-1">{n}</span>
                      ))
                    ) : (
                      <span className="text-sm text-gray-500">None</span>
                    )}
                  </div>
                </div>

                <div className="insight-card">
                  <span className="insight-label">Symbolic Tags</span>
                  <div className="insight-value">
                    {(logicEngineOutput.symbolicTags || []).length > 0 ? (
                      (logicEngineOutput.symbolicTags || []).map((t: string, i: number) => (
                        <span key={i} className="inline-block px-2 py-1 text-xs bg-gray-200 text-gray-800 rounded mr-1">{t}</span>
                      ))
                    ) : (
                      <span className="text-sm text-gray-500">None</span>
                    )}
                  </div>
                </div>
                </>
              )}

      <div className="p-6">
        {activeTab === 'svg' && (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-medium">SVG Blueprint Preview</h3>
              {blueprint && (
                <span className="text-sm text-gray-500">
                  {(blueprint.elements?.length ?? 0)} elements • {blueprint.layoutStyle}
                </span>
              )}
            </div>

            {blueprint?.schematic?.svgContent ? (
              <div className="space-y-4">
                <div className="flex items-center space-x-2">
                    {validateSVG(blueprint.schematic?.svgContent || '') ? (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-200 text-gray-800">
                      Valid SVG
                    </span>
                  ) : (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-300 text-gray-800">
                      Invalid SVG
                    </span>
                  )}
                </div>

                {!svgError ? (
                  <div className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                    <div 
                      dangerouslySetInnerHTML={{ __html: blueprint.schematic.svgContent }}
                      className="w-full h-64 flex items-center justify-center"
                      style={{ minHeight: '256px' }}
                    />
                  </div>
                ) : (
                  <div className="border border-gray-300 rounded-lg p-4 bg-gray-100">
                    <p className="text-gray-800 text-sm">{svgError}</p>
                    <details className="mt-2">
                      <summary className="text-gray-600 text-xs cursor-pointer">View Raw SVG</summary>
                      <pre className="mt-2 text-xs text-gray-600 bg-white p-2 rounded overflow-auto max-h-32">
                        {blueprint.schematic.svgContent}
                      </pre>
                    </details>
                  </div>
                )}

                <div className="bg-gray-50 rounded-lg p-4">
                  <h4 className="font-medium text-gray-900 mb-2">Blueprint Details</h4>
                      <div className="space-y-1 text-sm">
                    <p><span className="font-medium">Name:</span> {blueprint.name}</p>
                    <p><span className="font-medium">Style:</span> {blueprint.layoutStyle}</p>
                    <p><span className="font-medium">Prompt:</span> {blueprint.schematic?.prompt || ''}</p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-12 text-gray-500">
                <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <p className="mt-2">No SVG schematic available</p>
                <p className="text-sm">Generate a blueprint to see the visual preview</p>
              </div>
            )}
          </div>
        )}

        {activeTab === 'emotions' && (
          <div className="space-y-6">
            {logicEngineOutput ? (
              <>
                <div>
                  <h3 className="text-lg font-medium mb-4">Emotional Analysis</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-gray-100 p-4 rounded-lg">
                      <h4 className="font-medium text-gray-900">Primary Emotion</h4>
                      <p className="text-xl font-medium text-gray-800">{logicEngineOutput.emotionalTone.primary}</p>
                      <p className="text-sm text-gray-600">Intensity: {(logicEngineOutput.emotionalTone.intensity * 100).toFixed(0)}%</p>
                    </div>
                    <div className="bg-gray-100 p-4 rounded-lg">
                      <h4 className="font-medium text-gray-900">Secondary Emotions</h4>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {logicEngineOutput.emotionalTone.secondary.map((emotion: any, idx: number) => (
                          <span key={idx} className="inline-block px-2 py-1 text-xs bg-gray-200 text-gray-800 rounded">
                            {typeof emotion === 'string' ? emotion : emotion?.emotion || JSON.stringify(emotion)}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-medium mb-4">Storytelling Scores</h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <ScoreDisplay label="Narrative Coherence" score={logicEngineOutput.storytellingScore.narrativeCoherence} />
                    <ScoreDisplay label="Emotional Resonance" score={logicEngineOutput.storytellingScore.emotionalResonance} />
                    <ScoreDisplay label="Symbolism Depth" score={logicEngineOutput.storytellingScore.symbolismDepth} />
                    <ScoreDisplay label="Overall Score" score={logicEngineOutput.storytellingScore.overallScore} />
                  </div>
                </div>

                <div className="bg-gray-100 p-4 rounded-lg">
                  <h3 className="text-lg font-medium text-gray-900 mb-2">Seasonal Context</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="font-medium">Season: {logicEngineOutput.seasonalContext.primarySeason}</p>
                      <p className="text-sm">Intensity: {(logicEngineOutput.seasonalContext.seasonalIntensity * 100).toFixed(0)}%</p>
                    </div>
                    <div>
                      <p className="font-medium">Symbolic Meaning</p>
                      <p className="text-sm">{logicEngineOutput.seasonalContext.symbolicMeaning}</p>
                    </div>
                  </div>
                  {logicEngineOutput.seasonalContext.culturalAssociations.length > 0 && (
                    <div className="mt-2">
                      <p className="font-medium text-sm">Cultural Associations:</p>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {logicEngineOutput.seasonalContext.culturalAssociations.map((assoc, idx) => (
                          <span key={idx} className="inline-block px-2 py-1 text-xs bg-gray-200 text-gray-800 rounded">
                            {assoc}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div className="text-center py-12 text-gray-500">
                <p>No emotional analysis available</p>
                <p className="text-sm">Process an image with the logic engine to see scores</p>
              </div>
            )}
          </div>
        )}

        {activeTab === 'manufacturing' && (
          <div className="space-y-6">
            {logicEngineOutput ? (
              <>
                <h3 className="text-lg font-medium">Manufacturing Analysis</h3>
                
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  <ScoreDisplay label="Complexity" score={logicEngineOutput.manufacturingScore.complexity} />
                  <ScoreDisplay label="Durability" score={logicEngineOutput.manufacturingScore.durability} />
                  <ScoreDisplay label="Feasibility" score={logicEngineOutput.manufacturingScore.feasibilityScore} />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-gray-100 p-4 rounded-lg">
                    <h4 className="font-medium text-gray-900">Time Estimate</h4>
                    <p className="text-2xl font-medium text-gray-800">{logicEngineOutput.manufacturingScore.timeEstimate}h</p>
                  </div>
                  <div className="bg-gray-100 p-4 rounded-lg">
                    <h4 className="font-medium text-gray-900">Skill Level</h4>
                    <p className="text-xl font-medium text-gray-800 capitalize">{logicEngineOutput.manufacturingScore.skillLevel}</p>
                  </div>
                </div>

                <div className="bg-gray-50 p-4 rounded-lg">
                  <h3 className="text-lg font-medium text-gray-900 mb-2">Layout Recommendations</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="font-medium">Recommended Layout: <span className="capitalize">{logicEngineOutput.gestureLogic.recommendedLayout}</span></p>
                      <p className="font-medium">Gesture Type: <span className="capitalize">{logicEngineOutput.gestureLogic.gestureType}</span></p>
                    </div>
                    <div>
                      <p className="font-medium">Confidence: {(logicEngineOutput.gestureLogic.confidenceScore * 100).toFixed(0)}%</p>
                      <p className="text-sm text-gray-600">{logicEngineOutput.gestureLogic.spatialDynamics}</p>
                    </div>
                  </div>
                </div>
              </>
            ) : (
              <div className="text-center py-12 text-gray-500">
                <p>No manufacturing analysis available</p>
              </div>
            )}
          </div>
        )}

        {activeTab === 'metadata' && (
          <div className="space-y-6">
            <h3 className="text-lg font-medium">Metadata Validation & Fallbacks</h3>
            
            <div>
              <h4 className="font-medium mb-3">Inventory Completeness</h4>
              <div className="space-y-2">
                {inventory.map((item, idx) => {
                  const isComplete = item.symbolMeaning && item.emotionalDimensions && item.svgRepresentation;
                  const missingFields: string[] = [];
                  if (!item.symbolMeaning) missingFields.push('symbolMeaning');
                  if (!item.emotionalDimensions) missingFields.push('emotionalDimensions');
                  if (!item.svgRepresentation) missingFields.push('svgRepresentation');

                  return (
                    <div key={idx} className={`p-3 rounded border ${isComplete ? 'border-gray-200 bg-gray-50' : 'border-gray-300 bg-gray-100'}`}>
                      <div className="flex justify-between items-center">
                        <span className="font-medium">{item.name}</span>
                        <span className={`text-xs px-2 py-1 rounded ${isComplete ? 'bg-gray-200 text-gray-800' : 'bg-gray-300 text-gray-800'}`}>
                          {isComplete ? 'Complete' : `${missingFields.length} missing`}
                        </span>
                      </div>
                      {!isComplete && (
                        <p className="text-sm text-gray-700 mt-1">
                          Missing: {missingFields.join(', ')}
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {logicEngineOutput && logicEngineOutput.fallbackPrompts.length > 0 && (
              <div>
                <h4 className="font-medium mb-3">Recommended Improvements</h4>
                <div className="space-y-2">
                  {logicEngineOutput.fallbackPrompts.map((prompt, idx) => (
                    <div key={idx} className="flex items-center justify-between p-3 bg-gray-100 border border-gray-200 rounded">
                      <p className="text-sm text-gray-800">{prompt}</p>
                      {onFallbackPromptClick && (
                        <button
                          onClick={() => onFallbackPromptClick(prompt)}
                          className="ml-2 px-3 py-1 text-xs"
                        >
                          Apply
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {logicEngineOutput && (
              <div>
                <h4 className="font-medium mb-3">Processing Log</h4>
                <div className="bg-gray-50 rounded p-4 max-h-32 overflow-y-auto">
                  {logicEngineOutput.logicTrail.map((entry, idx) => (
                    <p key={idx} className="text-xs text-gray-600 mb-1">
                      {idx + 1}. {entry}
                    </p>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
