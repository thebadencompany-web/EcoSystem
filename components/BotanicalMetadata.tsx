// components/BotanicalMetadata.tsx
import React from 'react';
import { AgentOutput } from '../hooks/useAgentOutput';

interface BotanicalMetadataProps {
  output: AgentOutput | null;
  emotionTone?: string;
  season?: string;
}

export const BotanicalMetadata: React.FC<BotanicalMetadataProps> = ({ 
  output, 
  emotionTone = 'neutral', 
  season = 'spring' 
}) => {
  if (!output || output.agentType !== 'botanicalAnalysis') {
    return null;
  }

  const overlayStyle = getOverlayStyle(emotionTone, season);
  const botanicalData = output.output;
  
  return (
    <div className="botanical-metadata" style={overlayStyle}>
      <div className="metadata-header">
        <h3>🌿 Botanical Analysis</h3>
        <div className="status-indicators">
          {output.isLoading && <div className="loading-indicator">Analyzing...</div>}
          {output.error && <div className="error-indicator">❌ {output.error}</div>}
          {output.emotionalImpactScore && (
            <div className="impact-score">
              Impact: {Math.round(output.emotionalImpactScore * 100)}%
            </div>
          )}
        </div>
      </div>

      <div className="metadata-content">
        {output.isLoading ? (
          <div className="loading-container">
            <div className="loading-spinner" />
            <p>Analyzing botanical features...</p>
          </div>
        ) : output.error ? (
          <div className="error-container">
            <p>Failed to analyze botanical features</p>
            <small>{output.error}</small>
          </div>
        ) : (
          <div className="metadata-grid">
            {/* Species & Identification */}
            <div className="metadata-section">
              <h4>🔬 Identification</h4>
              <div className="metadata-items">
                {botanicalData?.species && (
                  <div className="metadata-item">
                    <label>Species:</label>
                    <span className="species-name">{botanicalData.species}</span>
                  </div>
                )}
                {botanicalData?.commonName && (
                  <div className="metadata-item">
                    <label>Common Name:</label>
                    <span>{botanicalData.commonName}</span>
                  </div>
                )}
                {botanicalData?.botanicalFamily && (
                  <div className="metadata-item">
                    <label>Family:</label>
                    <span>{botanicalData.botanicalFamily}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Visual Features */}
            <div className="metadata-section">
              <h4>👁️ Visual Features</h4>
              <div className="metadata-items">
                {botanicalData?.colorProfile && (
                  <div className="metadata-item">
                    <label>Colors:</label>
                    <div className="color-palette">
                      {botanicalData.colorProfile.map((color: string, index: number) => (
                        <div 
                          key={index} 
                          className="color-swatch" 
                          style={{ backgroundColor: color }}
                          title={color}
                        />
                      ))}
                    </div>
                  </div>
                )}
                {botanicalData?.flowerStructure && (
                  <div className="metadata-item">
                    <label>Structure:</label>
                    <div className="structure-details">
                      {botanicalData.flowerStructure.petalCount && (
                        <span>Petals: {botanicalData.flowerStructure.petalCount}</span>
                      )}
                      {botanicalData.flowerStructure.arrangement && (
                        <span>Arrangement: {botanicalData.flowerStructure.arrangement}</span>
                      )}
                    </div>
                  </div>
                )}
                {botanicalData?.textureProfile && (
                  <div className="metadata-item">
                    <label>Texture:</label>
                    <span>{botanicalData.textureProfile}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Seasonal Information */}
            <div className="metadata-section">
              <h4>📅 Seasonality</h4>
              <div className="metadata-items">
                {botanicalData?.bloomingSeason && (
                  <div className="metadata-item">
                    <label>Blooming Season:</label>
                    <span className={`season-badge ${botanicalData.bloomingSeason}`}>
                      {botanicalData.bloomingSeason}
                    </span>
                  </div>
                )}
                {botanicalData?.seasonalContext && (
                  <div className="metadata-item">
                    <label>Seasonal Context:</label>
                    <span>{botanicalData.seasonalContext}</span>
                  </div>
                )}
                {botanicalData?.availability && (
                  <div className="metadata-item">
                    <label>Availability:</label>
                    <span className={`availability ${botanicalData.availability}`}>
                      {botanicalData.availability}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Emotional & Cultural Dimensions */}
            <div className="metadata-section">
              <h4>💫 Emotional Dimensions</h4>
              <div className="metadata-items">
                {botanicalData?.emotionalTags && (
                  <div className="metadata-item">
                    <label>Emotional Tags:</label>
                    <div className="emotion-tags">
                      {botanicalData.emotionalTags.map((tag: string, index: number) => (
                        <span key={index} className="emotion-tag">{tag}</span>
                      ))}
                    </div>
                  </div>
                )}
                {botanicalData?.culturalSymbolism && (
                  <div className="metadata-item">
                    <label>Cultural Symbolism:</label>
                    <span>{botanicalData.culturalSymbolism}</span>
                  </div>
                )}
                {botanicalData?.gestureLanguage && (
                  <div className="metadata-item">
                    <label>Gesture Language:</label>
                    <div className="gesture-details">
                      {Object.entries(botanicalData.gestureLanguage).map(([key, value]) => (
                        <div key={key} className="gesture-item">
                          <strong>{key}:</strong> {String(value)}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Technical Properties */}
            <div className="metadata-section">
              <h4>🔧 Technical Properties</h4>
              <div className="metadata-items">
                {botanicalData?.durabilityScore !== undefined && (
                  <div className="metadata-item">
                    <label>Durability:</label>
                    <div className="score-bar">
                      <div 
                        className="score-fill durability"
                        style={{ width: `${botanicalData.durabilityScore * 100}%` }}
                      />
                      <span>{Math.round(botanicalData.durabilityScore * 100)}%</span>
                    </div>
                  </div>
                )}
                {botanicalData?.fragilityScore !== undefined && (
                  <div className="metadata-item">
                    <label>Fragility:</label>
                    <div className="score-bar">
                      <div 
                        className="score-fill fragility"
                        style={{ width: `${botanicalData.fragilityScore * 100}%` }}
                      />
                      <span>{Math.round(botanicalData.fragilityScore * 100)}%</span>
                    </div>
                  </div>
                )}
                {botanicalData?.maintenanceRequirements && (
                  <div className="metadata-item">
                    <label>Maintenance:</label>
                    <span className={`maintenance ${botanicalData.maintenanceRequirements}`}>
                      {botanicalData.maintenanceRequirements}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {output.annotations && output.annotations.length > 0 && (
          <div className="annotations">
            <h4>Analysis Notes</h4>
            <ul>
              {output.annotations.map((annotation, index) => (
                <li key={index}>{annotation}</li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* Seasonal texture overlay */}
      <div className="seasonal-texture-overlay" style={getSeasonalTexture(season)} />
    </div>
  );
};

function getOverlayStyle(tone: string, season: string): React.CSSProperties {
  const baseStyle: React.CSSProperties = {
    position: 'relative',
    borderRadius: '12px',
    padding: '20px',
    margin: '8px 0',
    minHeight: '300px',
    overflow: 'hidden'
  };

  // Botanical-themed overlays with emotional tints
  switch (tone.toLowerCase()) {
    case 'wistful':
      return {
        ...baseStyle,
        background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.08) 0%, rgba(196, 181, 253, 0.04) 100%)',
        border: '2px solid rgba(139, 92, 246, 0.2)',
        boxShadow: '0 8px 32px rgba(139, 92, 246, 0.12)'
      };
    
    case 'joyful':
      return {
        ...baseStyle,
        background: 'linear-gradient(135deg, rgba(34, 197, 94, 0.08) 0%, rgba(187, 247, 208, 0.04) 100%)',
        border: '2px solid rgba(34, 197, 94, 0.2)',
        boxShadow: '0 8px 32px rgba(34, 197, 94, 0.12)'
      };
    
    case 'peaceful':
      return {
        ...baseStyle,
        background: 'linear-gradient(135deg, rgba(14, 165, 233, 0.08) 0%, rgba(186, 230, 253, 0.04) 100%)',
        border: '2px solid rgba(14, 165, 233, 0.2)',
        boxShadow: '0 8px 32px rgba(14, 165, 233, 0.12)'
      };
    
    case 'nostalgic':
      return {
        ...baseStyle,
        background: 'linear-gradient(135deg, rgba(217, 119, 6, 0.08) 0%, rgba(254, 215, 170, 0.04) 100%)',
        border: '2px solid rgba(217, 119, 6, 0.2)',
        boxShadow: '0 8px 32px rgba(217, 119, 6, 0.12)'
      };
    
    case 'romantic':
      return {
        ...baseStyle,
        background: 'linear-gradient(135deg, rgba(236, 72, 153, 0.08) 0%, rgba(252, 165, 165, 0.04) 100%)',
        border: '2px solid rgba(236, 72, 153, 0.2)',
        boxShadow: '0 8px 32px rgba(236, 72, 153, 0.12)'
      };
    
    default:
      return {
        ...baseStyle,
        background: 'linear-gradient(135deg, rgba(15, 118, 110, 0.08) 0%, rgba(153, 246, 228, 0.04) 100%)',
        border: '2px solid rgba(15, 118, 110, 0.2)',
        boxShadow: '0 8px 32px rgba(15, 118, 110, 0.12)'
      };
  }
}

function getSeasonalTexture(season: string): React.CSSProperties {
  const textureStyles: { [key: string]: React.CSSProperties } = {
    spring: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: `
        radial-gradient(circle at 20% 80%, rgba(187, 247, 208, 0.3) 0%, transparent 50%),
        radial-gradient(circle at 80% 20%, rgba(134, 239, 172, 0.2) 0%, transparent 50%),
        radial-gradient(circle at 40% 40%, rgba(74, 222, 128, 0.1) 0%, transparent 50%)
      `,
      pointerEvents: 'none'
    },
    
    summer: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: `
        radial-gradient(circle at 30% 70%, rgba(254, 240, 138, 0.3) 0%, transparent 50%),
        radial-gradient(circle at 70% 30%, rgba(252, 211, 77, 0.2) 0%, transparent 50%)
      `,
      pointerEvents: 'none'
    },
    
    fall: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: `
        radial-gradient(circle at 25% 75%, rgba(254, 215, 170, 0.3) 0%, transparent 50%),
        radial-gradient(circle at 75% 25%, rgba(251, 146, 60, 0.2) 0%, transparent 50%)
      `,
      pointerEvents: 'none'
    },
    
    winter: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: `
        radial-gradient(circle at 50% 50%, rgba(241, 245, 249, 0.4) 0%, transparent 50%),
        radial-gradient(circle at 80% 20%, rgba(226, 232, 240, 0.3) 0%, transparent 50%)
      `,
      pointerEvents: 'none'
    }
  };
  
  return textureStyles[season] || textureStyles.spring;
}