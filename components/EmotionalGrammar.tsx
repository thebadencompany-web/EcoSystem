// components/EmotionalGrammar.tsx
import React from 'react';
import { AgentOutput } from '../hooks/useAgentOutput';

interface EmotionalGrammarProps {
  output: AgentOutput | null;
  emotionTone?: string;
  season?: string;
}

export const EmotionalGrammar: React.FC<EmotionalGrammarProps> = ({ 
  output, 
  emotionTone = 'neutral', 
  season = 'spring' 
}) => {
  if (!output || output.agentType !== 'logicEngine') {
    return null;
  }

  const overlayStyle = getOverlayStyle(emotionTone, season);
  const grammarData = output.output;
  
  return (
    <div className="emotional-grammar" style={overlayStyle}>
      <div className="grammar-header">
        <h3>🧠 Emotional Grammar</h3>
        <div className="status-indicators">
          {output.isLoading && <div className="loading-indicator">Processing...</div>}
          {output.error && <div className="error-indicator">❌ {output.error}</div>}
          {output.emotionalImpactScore && (
            <div className="impact-score">
              Impact: {Math.round(output.emotionalImpactScore * 100)}%
            </div>
          )}
        </div>
      </div>

      <div className="grammar-content">
        {output.isLoading ? (
          <div className="loading-container">
            <div className="loading-spinner" />
            <p>Parsing emotional grammar...</p>
          </div>
        ) : output.error ? (
          <div className="error-container">
            <p>Failed to parse emotional grammar</p>
            <small>{output.error}</small>
          </div>
        ) : (
          <div className="grammar-sections">
            {/* Primary Emotional Analysis */}
            {grammarData?.emotionalAnalysis && (
              <div className="grammar-section">
                <h4>💖 Primary Emotional Analysis</h4>
                <div className="emotion-display">
                  <div className="primary-emotion">
                    <label>Primary Emotion:</label>
                    <span className={`emotion-label ${grammarData.emotionalAnalysis.primaryEmotion}`}>
                      {grammarData.emotionalAnalysis.primaryEmotion}
                    </span>
                  </div>
                  
                  <div className="emotion-intensity">
                    <label>Intensity:</label>
                    <div className="intensity-bar">
                      <div 
                        className="intensity-fill"
                        style={{ 
                          width: `${(grammarData.emotionalAnalysis.intensity || 0) * 100}%`,
                          backgroundColor: getEmotionColor(grammarData.emotionalAnalysis.primaryEmotion)
                        }}
                      />
                      <span>{Math.round((grammarData.emotionalAnalysis.intensity || 0) * 100)}%</span>
                    </div>
                  </div>

                  {grammarData.emotionalAnalysis.confidence && (
                    <div className="emotion-confidence">
                      <label>Confidence:</label>
                      <div className="confidence-bar">
                        <div 
                          className="confidence-fill"
                          style={{ width: `${grammarData.emotionalAnalysis.confidence * 100}%` }}
                        />
                        <span>{Math.round(grammarData.emotionalAnalysis.confidence * 100)}%</span>
                      </div>
                    </div>
                  )}
                </div>

                {grammarData.emotionalAnalysis.secondaryEmotions && (
                  <div className="secondary-emotions">
                    <label>Secondary Emotions:</label>
                    <div className="emotion-tags">
                      {grammarData.emotionalAnalysis.secondaryEmotions.map((emotion: any, index: number) => (
                        <div key={index} className="emotion-tag secondary">
                          <span className="emotion-name">{emotion.emotion || emotion}</span>
                          {emotion.intensity && (
                            <span className="emotion-intensity">
                              {Math.round(emotion.intensity * 100)}%
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Memory Type Classification */}
            {grammarData?.memoryType && (
              <div className="grammar-section">
                <h4>📝 Memory Type</h4>
                <div className="memory-classification">
                  <div className={`memory-type-badge ${grammarData.memoryType}`}>
                    {formatMemoryType(grammarData.memoryType)}
                  </div>
                  {grammarData.memoryContext && (
                    <div className="memory-context">
                      <p>{grammarData.memoryContext}</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Tone Analysis */}
            {grammarData?.toneAnalysis && (
              <div className="grammar-section">
                <h4>🎵 Tone Analysis</h4>
                <div className="tone-breakdown">
                  {Object.entries(grammarData.toneAnalysis).map(([key, value]) => (
                    <div key={key} className="tone-item">
                      <label>{formatToneLabel(key)}:</label>
                      <div className="tone-value">
                        {typeof value === 'number' ? (
                          <div className="score-bar">
                            <div 
                              className="score-fill tone"
                              style={{ width: `${value * 100}%` }}
                            />
                            <span>{Math.round(value * 100)}%</span>
                          </div>
                        ) : (
                          <span>{String(value)}</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Symbolism Analysis */}
            {grammarData?.symbolismAnalysis && (
              <div className="grammar-section">
                <h4>🔮 Symbolism Analysis</h4>
                <div className="symbolism-grid">
                  {grammarData.symbolismAnalysis.themes && (
                    <div className="symbolism-themes">
                      <label>Themes:</label>
                      <div className="theme-tags">
                        {grammarData.symbolismAnalysis.themes.map((theme: string, index: number) => (
                          <span key={index} className="theme-tag">{theme}</span>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {grammarData.symbolismAnalysis.depth && (
                    <div className="symbolism-depth">
                      <label>Depth Score:</label>
                      <div className="score-bar">
                        <div 
                          className="score-fill symbolism"
                          style={{ width: `${grammarData.symbolismAnalysis.depth * 100}%` }}
                        />
                        <span>{Math.round(grammarData.symbolismAnalysis.depth * 100)}%</span>
                      </div>
                    </div>
                  )}
                  
                  {grammarData.symbolismAnalysis.culturalReferences && (
                    <div className="cultural-references">
                      <label>Cultural References:</label>
                      <ul>
                        {grammarData.symbolismAnalysis.culturalReferences.map((ref: string, index: number) => (
                          <li key={index}>{ref}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Storytelling Scores */}
            {grammarData?.storytellingScores && (
              <div className="grammar-section">
                <h4>📚 Storytelling Analysis</h4>
                <div className="storytelling-metrics">
                  {Object.entries(grammarData.storytellingScores).map(([key, value]) => (
                    <div key={key} className="storytelling-metric">
                      <label>{formatStorytellingStat(key)}:</label>
                      <div className="metric-display">
                        <div className="score-bar">
                          <div 
                            className="score-fill storytelling"
                            style={{ width: `${(value as number) * 100}%` }}
                          />
                          <span>{Math.round((value as number) * 100)}%</span>
                        </div>
                        <div className="metric-description">
                          {getStorytellingStat(key, value as number)}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Gesture Logic */}
            {grammarData?.gestureLogic && (
              <div className="grammar-section">
                <h4>🤲 Gesture Logic</h4>
                <div className="gesture-analysis">
                  {Object.entries(grammarData.gestureLogic).map(([key, value]) => (
                    <div key={key} className="gesture-item">
                      <label>{formatGestureLabel(key)}:</label>
                      <span className="gesture-value">{String(value)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {output.annotations && output.annotations.length > 0 && (
          <div className="annotations">
            <h4>Processing Notes</h4>
            <ul>
              {output.annotations.map((annotation, index) => (
                <li key={index}>{annotation}</li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* Emotional flow visualization */}
      <div className="emotional-flow-overlay" style={getEmotionalFlow(grammarData?.emotionalAnalysis)} />
    </div>
  );
};

function getOverlayStyle(tone: string, season: string): React.CSSProperties {
  const baseStyle: React.CSSProperties = {
    position: 'relative',
    borderRadius: '16px',
    padding: '24px',
    margin: '8px 0',
    minHeight: '400px',
    overflow: 'hidden'
  };

  // Emotional grammar specific styling with memory type influences
  switch (tone.toLowerCase()) {
    case 'wistful':
      return {
        ...baseStyle,
        background: `
          linear-gradient(135deg, rgba(139, 92, 246, 0.12) 0%, rgba(196, 181, 253, 0.06) 100%),
          radial-gradient(circle at 80% 20%, rgba(168, 85, 247, 0.08) 0%, transparent 50%)
        `,
        border: '2px solid rgba(139, 92, 246, 0.25)',
        boxShadow: '0 12px 48px rgba(139, 92, 246, 0.15)'
      };
    
    case 'joyful':
      return {
        ...baseStyle,
        background: `
          linear-gradient(135deg, rgba(34, 197, 94, 0.12) 0%, rgba(187, 247, 208, 0.06) 100%),
          radial-gradient(circle at 20% 80%, rgba(22, 163, 74, 0.08) 0%, transparent 50%)
        `,
        border: '2px solid rgba(34, 197, 94, 0.25)',
        boxShadow: '0 12px 48px rgba(34, 197, 94, 0.15)'
      };
    
    case 'peaceful':
      return {
        ...baseStyle,
        background: `
          linear-gradient(135deg, rgba(14, 165, 233, 0.12) 0%, rgba(186, 230, 253, 0.06) 100%),
          radial-gradient(circle at 60% 40%, rgba(2, 132, 199, 0.08) 0%, transparent 50%)
        `,
        border: '2px solid rgba(14, 165, 233, 0.25)',
        boxShadow: '0 12px 48px rgba(14, 165, 233, 0.15)'
      };
    
    default:
      return {
        ...baseStyle,
        background: `
          linear-gradient(135deg, rgba(15, 118, 110, 0.12) 0%, rgba(153, 246, 228, 0.06) 100%),
          radial-gradient(circle at 40% 60%, rgba(13, 148, 136, 0.08) 0%, transparent 50%)
        `,
        border: '2px solid rgba(15, 118, 110, 0.25)',
        boxShadow: '0 12px 48px rgba(15, 118, 110, 0.15)'
      };
  }
}

function getEmotionColor(emotion: string): string {
  const colorMap: { [key: string]: string } = {
    joy: '#22c55e',
    love: '#ef4444',
    peace: '#3b82f6',
    sadness: '#6366f1',
    anger: '#dc2626',
    fear: '#7c3aed',
    surprise: '#f59e0b',
    disgust: '#059669',
    anticipation: '#ec4899',
    trust: '#06b6d4'
  };
  
  return colorMap[emotion.toLowerCase()] || '#6b7280';
}

function formatMemoryType(type: string): string {
  const typeMap: { [key: string]: string } = {
    'tribute': 'Memorial Tribute',
    'seasonal_echo': 'Seasonal Echo',
    'celebration': 'Celebration',
    'healing': 'Healing Memory',
    'remembrance': 'Remembrance',
    'general': 'General Memory'
  };
  
  return typeMap[type] || type;
}

function formatToneLabel(key: string): string {
  return key
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, str => str.toUpperCase());
}

function formatStorytellingStat(key: string): string {
  const labelMap: { [key: string]: string } = {
    narrativeCoherence: 'Narrative Coherence',
    emotionalResonance: 'Emotional Resonance',
    symbolismDepth: 'Symbolism Depth',
    culturalRelevance: 'Cultural Relevance',
    memorabilityScore: 'Memorability Score'
  };
  
  return labelMap[key] || formatToneLabel(key);
}

function getStorytellingStat(key: string, value: number): string {
  const descriptions: { [key: string]: { [range: string]: string } } = {
    narrativeCoherence: {
      high: 'Strong narrative flow and structure',
      medium: 'Moderate narrative connection',
      low: 'Fragmented narrative elements'
    },
    emotionalResonance: {
      high: 'Deeply emotionally engaging',
      medium: 'Moderately emotionally engaging',
      low: 'Limited emotional engagement'
    },
    symbolismDepth: {
      high: 'Rich symbolic meaning',
      medium: 'Some symbolic elements',
      low: 'Minimal symbolic content'
    }
  };
  
  const range = value >= 0.7 ? 'high' : value >= 0.4 ? 'medium' : 'low';
  return descriptions[key]?.[range] || '';
}

function formatGestureLabel(key: string): string {
  const labelMap: { [key: string]: string } = {
    primaryGesture: 'Primary Gesture',
    gestureIntensity: 'Gesture Intensity',
    spatialFlow: 'Spatial Flow',
    emotionalDirection: 'Emotional Direction'
  };
  
  return labelMap[key] || formatToneLabel(key);
}

function getEmotionalFlow(emotionalAnalysis: any): React.CSSProperties {
  if (!emotionalAnalysis) {
    return { display: 'none' };
  }
  
  const intensity = emotionalAnalysis.intensity || 0.5;
  const primaryColor = getEmotionColor(emotionalAnalysis.primaryEmotion);
  
  return {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: `
      radial-gradient(ellipse at 30% 70%, ${primaryColor}${Math.round(intensity * 20).toString(16)} 0%, transparent 60%),
      radial-gradient(ellipse at 70% 30%, ${primaryColor}${Math.round(intensity * 15).toString(16)} 0%, transparent 40%)
    `,
    pointerEvents: 'none',
    opacity: intensity * 0.6 + 0.2
  };
}