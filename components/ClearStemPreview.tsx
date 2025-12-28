// components/ClearStemPreview.tsx
import React from 'react';
import { AgentOutput } from '../hooks/useAgentOutput';

interface ClearStemPreviewProps {
  output: AgentOutput | null;
  emotionTone?: string;
  season?: string;
}

export const ClearStemPreview: React.FC<ClearStemPreviewProps> = ({ 
  output, 
  emotionTone = 'neutral', 
  season = 'spring' 
}) => {
  if (!output || output.agentType !== 'clearStem') {
    return null;
  }

  const overlayStyle = getOverlayStyle(emotionTone, season);
  
  return (
    <div className="clear-stem-preview" style={overlayStyle}>
      <div className="preview-header">
        <h3>📸 Background Removal</h3>
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

      <div className="preview-content">
        {output.isLoading ? (
          <div className="loading-container">
            <div className="loading-spinner" />
            <p>Removing background...</p>
          </div>
        ) : output.error ? (
          <div className="error-container">
            <p>Failed to remove background</p>
            <small>{output.error}</small>
          </div>
        ) : (
          <div className="before-after-container">
            {output.input?.originalImage && (
              <div className="before-image">
                <label>Original</label>
                <img 
                  src={typeof output.input.originalImage === 'string' 
                    ? output.input.originalImage 
                    : `data:${output.input.mimeType};base64,${output.input.base64}`} 
                  alt="Original" 
                  className="preview-image"
                />
              </div>
            )}
            
            {output.output && (
              <div className="after-image">
                <label>Background Removed</label>
                <img 
                  src={`data:image/png;base64,${output.output}`} 
                  alt="Background removed" 
                  className="preview-image"
                  style={{ 
                    backgroundColor: getSeasonalBackground(season),
                    borderRadius: '8px',
                    padding: '8px'
                  }}
                />
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
    </div>
  );
};

function getOverlayStyle(tone: string, season: string): React.CSSProperties {
  const baseStyle: React.CSSProperties = {
    position: 'relative',
    borderRadius: '12px',
    padding: '16px',
    margin: '8px 0',
    minHeight: '200px'
  };

  // Emotional tone overlays
  switch (tone.toLowerCase()) {
    case 'wistful':
      return {
        ...baseStyle,
        background: 'linear-gradient(135deg, rgba(196, 181, 253, 0.1) 0%, rgba(221, 214, 254, 0.05) 100%)',
        borderLeft: '4px solid #a855f7',
        boxShadow: '0 4px 12px rgba(168, 85, 247, 0.1)'
      };
    
    case 'joyful':
      return {
        ...baseStyle,
        background: 'linear-gradient(135deg, rgba(254, 240, 138, 0.15) 0%, rgba(253, 224, 71, 0.08) 100%)',
        borderLeft: '4px solid #eab308',
        boxShadow: '0 4px 12px rgba(234, 179, 8, 0.15)'
      };
    
    case 'peaceful':
      return {
        ...baseStyle,
        background: 'linear-gradient(135deg, rgba(187, 247, 208, 0.12) 0%, rgba(134, 239, 172, 0.06) 100%)',
        borderLeft: '4px solid #22c55e',
        boxShadow: '0 4px 12px rgba(34, 197, 94, 0.1)'
      };
    
    case 'nostalgic':
      return {
        ...baseStyle,
        background: 'linear-gradient(135deg, rgba(252, 211, 77, 0.12) 0%, rgba(245, 158, 11, 0.06) 100%)',
        borderLeft: '4px solid #f59e0b',
        boxShadow: '0 4px 12px rgba(245, 158, 11, 0.1)'
      };
    
    case 'romantic':
      return {
        ...baseStyle,
        background: 'linear-gradient(135deg, rgba(252, 165, 165, 0.12) 0%, rgba(248, 113, 113, 0.06) 100%)',
        borderLeft: '4px solid #ef4444',
        boxShadow: '0 4px 12px rgba(239, 68, 68, 0.1)'
      };
    
    default:
      return {
        ...baseStyle,
        background: 'linear-gradient(135deg, rgba(241, 245, 249, 0.5) 0%, rgba(226, 232, 240, 0.3) 100%)',
        borderLeft: '4px solid #64748b',
        boxShadow: '0 4px 12px rgba(100, 116, 139, 0.1)'
      };
  }
}

function getSeasonalBackground(season: string): string {
  const backgrounds: { [key: string]: string } = {
    spring: 'linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)',
    summer: 'linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%)',
    fall: 'linear-gradient(135deg, #fff7ed 0%, #fed7aa 100%)',
    winter: 'linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)'
  };
  
  return backgrounds[season] || backgrounds.spring;
}