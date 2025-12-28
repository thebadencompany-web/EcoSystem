// components/FallbackNotice.tsx
import React from 'react';
import { AgentOutput } from '../hooks/useAgentOutput';

interface FallbackNoticeProps {
  output: AgentOutput | null;
  emotionTone?: string;
  season?: string;
}

export const FallbackNotice: React.FC<FallbackNoticeProps> = ({ 
  output, 
  emotionTone = 'neutral', 
  season = 'spring' 
}) => {
  if (!output || output.agentType !== 'fallback') {
    return null;
  }

  const overlayStyle = getOverlayStyle(emotionTone, season);
  const fallbackData = output.output;
  
  return (
    <div className="fallback-notice" style={overlayStyle}>
      <div className="notice-header">
        <h3>🔧 Fallback Recovery</h3>
        <div className="status-indicators">
          {output.isLoading && <div className="loading-indicator">Processing...</div>}
          {output.error && <div className="error-indicator">❌ {output.error}</div>}
          {output.emotionalImpactScore && (
            <div className="impact-score">
              Recovery: {Math.round(output.emotionalImpactScore * 100)}%
            </div>
          )}
        </div>
      </div>

      <div className="notice-content">
        {output.isLoading ? (
          <div className="loading-container">
            <div className="loading-spinner" />
            <p>Applying fallback recovery...</p>
          </div>
        ) : output.error ? (
          <div className="error-container">
            <p>Fallback recovery failed</p>
            <small>{output.error}</small>
          </div>
        ) : (
          <div className="fallback-sections">
            {/* Recovery Status */}
            <div className="recovery-status">
              <div className="status-indicator">
                <div className={`status-light ${getRecoveryStatus(fallbackData)}`} />
                <span className="status-text">
                  {getRecoveryStatusText(fallbackData)}
                </span>
              </div>
              
              {fallbackData?.recoveryScore !== undefined && (
                <div className="recovery-score">
                  <label>Recovery Confidence:</label>
                  <div className="score-bar">
                    <div 
                      className="score-fill recovery"
                      style={{ 
                        width: `${fallbackData.recoveryScore * 100}%`,
                        backgroundColor: getRecoveryColor(fallbackData.recoveryScore)
                      }}
                    />
                    <span>{Math.round(fallbackData.recoveryScore * 100)}%</span>
                  </div>
                </div>
              )}
            </div>

            {/* Missing Data Analysis */}
            {fallbackData?.missingFields && fallbackData.missingFields.length > 0 && (
              <div className="missing-data-section">
                <h4>❌ Missing Data Elements</h4>
                <div className="missing-fields-list">
                  {fallbackData.missingFields.map((field: any, index: number) => (
                    <div key={index} className="missing-field-item">
                      <div className="field-info">
                        <span className="field-name">
                          {typeof field === 'string' ? field : field.name}
                        </span>
                        <span className={`field-criticality ${getCriticality(field)}`}>
                          {formatCriticality(getCriticality(field))}
                        </span>
                      </div>
                      
                      {(typeof field === 'object' && field.reason) && (
                        <div className="field-reason">
                          <small>{field.reason}</small>
                        </div>
                      )}
                      
                      {(typeof field === 'object' && field.impact) && (
                        <div className="field-impact">
                          <label>Impact on processing:</label>
                          <span className={`impact-level ${field.impact}`}>
                            {formatImpactLevel(field.impact)}
                          </span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Recovered Data */}
            {fallbackData?.recoveredFields && fallbackData.recoveredFields.length > 0 && (
              <div className="recovered-data-section">
                <h4>✅ Successfully Recovered</h4>
                <div className="recovered-fields-list">
                  {fallbackData.recoveredFields.map((field: any, index: number) => (
                    <div key={index} className="recovered-field-item">
                      <div className="field-info">
                        <span className="field-name">
                          {typeof field === 'string' ? field : field.name}
                        </span>
                        <span className="recovery-method">
                          {getRecoveryMethod(field)}
                        </span>
                      </div>
                      
                      {(typeof field === 'object' && field.value) && (
                        <div className="field-value">
                          <label>Recovered value:</label>
                          <span className="recovered-value">
                            {typeof field.value === 'object' 
                              ? JSON.stringify(field.value, null, 2) 
                              : String(field.value)
                            }
                          </span>
                        </div>
                      )}
                      
                      {(typeof field === 'object' && field.confidence) && (
                        <div className="recovery-confidence">
                          <label>Confidence:</label>
                          <div className="confidence-bar">
                            <div 
                              className="confidence-fill"
                              style={{ width: `${field.confidence * 100}%` }}
                            />
                            <span>{Math.round(field.confidence * 100)}%</span>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Fallback Strategies Applied */}
            {fallbackData?.strategiesApplied && fallbackData.strategiesApplied.length > 0 && (
              <div className="strategies-section">
                <h4>🔄 Recovery Strategies Applied</h4>
                <div className="strategies-list">
                  {fallbackData.strategiesApplied.map((strategy: any, index: number) => (
                    <div key={index} className="strategy-item">
                      <div className="strategy-header">
                        <span className="strategy-name">
                          {typeof strategy === 'string' ? strategy : strategy.name}
                        </span>
                        {(typeof strategy === 'object' && strategy.success !== undefined) && (
                          <span className={`strategy-status ${strategy.success ? 'success' : 'failed'}`}>
                            {strategy.success ? '✅ Success' : '❌ Failed'}
                          </span>
                        )}
                      </div>
                      
                      {(typeof strategy === 'object' && strategy.description) && (
                        <div className="strategy-description">
                          <p>{strategy.description}</p>
                        </div>
                      )}
                      
                      {(typeof strategy === 'object' && strategy.fieldsAffected) && (
                        <div className="affected-fields">
                          <label>Fields affected:</label>
                          <div className="field-tags">
                            {strategy.fieldsAffected.map((field: string, fieldIndex: number) => (
                              <span key={fieldIndex} className="field-tag">{field}</span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Recommendations */}
            {fallbackData?.recommendations && fallbackData.recommendations.length > 0 && (
              <div className="recommendations-section">
                <h4>💡 Recommendations</h4>
                <div className="recommendations-list">
                  {fallbackData.recommendations.map((rec: any, index: number) => (
                    <div key={index} className="recommendation-item">
                      <div className={`recommendation-priority ${rec.priority || 'medium'}`}>
                        {formatPriority(rec.priority || 'medium')}
                      </div>
                      <div className="recommendation-content">
                        <div className="recommendation-text">
                          {typeof rec === 'string' ? rec : rec.text}
                        </div>
                        {(typeof rec === 'object' && rec.action) && (
                          <div className="recommendation-action">
                            <strong>Suggested action:</strong> {rec.action}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Processing Notes */}
            {fallbackData?.processingNotes && fallbackData.processingNotes.length > 0 && (
              <div className="processing-notes-section">
                <h4>📝 Processing Notes</h4>
                <div className="notes-list">
                  {fallbackData.processingNotes.map((note: string, index: number) => (
                    <div key={index} className="note-item">
                      <div className="note-icon">ℹ️</div>
                      <div className="note-text">{note}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {output.annotations && output.annotations.length > 0 && (
          <div className="annotations">
            <h4>Recovery Annotations</h4>
            <ul>
              {output.annotations.map((annotation, index) => (
                <li key={index}>{annotation}</li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* Recovery pattern overlay */}
      <div className="recovery-overlay" style={getRecoveryOverlay(fallbackData?.recoveryScore)} />
    </div>
  );
};

function getOverlayStyle(tone: string, season: string): React.CSSProperties {
  const baseStyle: React.CSSProperties = {
    position: 'relative',
    borderRadius: '12px',
    padding: '20px',
    margin: '8px 0',
    minHeight: '250px',
    overflow: 'hidden'
  };

  // Fallback/recovery themed styling
  return {
    ...baseStyle,
    background: `
      linear-gradient(135deg, rgba(251, 146, 60, 0.08) 0%, rgba(254, 215, 170, 0.04) 100%),
      repeating-linear-gradient(
        45deg,
        transparent,
        transparent 10px,
        rgba(251, 146, 60, 0.02) 10px,
        rgba(251, 146, 60, 0.02) 20px
      )
    `,
    border: '2px solid rgba(251, 146, 60, 0.3)',
    boxShadow: '0 8px 32px rgba(251, 146, 60, 0.15)',
    borderLeft: '6px solid #f97316'
  };
}

function getRecoveryStatus(fallbackData: any): 'success' | 'warning' | 'error' {
  if (!fallbackData) return 'error';
  
  const recoveryScore = fallbackData.recoveryScore || 0;
  const missingFields = fallbackData.missingFields?.length || 0;
  const recoveredFields = fallbackData.recoveredFields?.length || 0;
  
  if (recoveryScore >= 0.8 && missingFields === 0) return 'success';
  if (recoveryScore >= 0.5 || recoveredFields > missingFields) return 'warning';
  return 'error';
}

function getRecoveryStatusText(fallbackData: any): string {
  const status = getRecoveryStatus(fallbackData);
  const statusMap = {
    success: 'Recovery Complete',
    warning: 'Partial Recovery',
    error: 'Recovery Issues'
  };
  
  return statusMap[status];
}

function getRecoveryColor(score: number): string {
  if (score >= 0.8) return '#22c55e'; // High recovery - green
  if (score >= 0.6) return '#f59e0b'; // Medium recovery - amber
  if (score >= 0.4) return '#ef4444'; // Low recovery - red
  return '#6b7280'; // Very low recovery - gray
}

function getCriticality(field: any): 'critical' | 'high' | 'medium' | 'low' {
  if (typeof field === 'object' && field.criticality) {
    return field.criticality;
  }
  
  // Infer criticality from field name
  const criticalFields = ['species', 'emotionalAnalysis', 'primaryEmotion'];
  const highFields = ['botanicalMetadata', 'gestureLanguage', 'colorProfile'];
  
  const fieldName = typeof field === 'string' ? field : field.name;
  
  if (criticalFields.some(critical => fieldName.toLowerCase().includes(critical.toLowerCase()))) {
    return 'critical';
  }
  if (highFields.some(high => fieldName.toLowerCase().includes(high.toLowerCase()))) {
    return 'high';
  }
  
  return 'medium';
}

function formatCriticality(criticality: string): string {
  const criticalityMap: { [key: string]: string } = {
    critical: '🔴 Critical',
    high: '🟠 High',
    medium: '🟡 Medium',
    low: '🟢 Low'
  };
  
  return criticalityMap[criticality] || criticality;
}

function formatImpactLevel(impact: string): string {
  const impactMap: { [key: string]: string } = {
    severe: 'Severe - Processing may fail',
    high: 'High - Quality degraded',
    medium: 'Medium - Minor limitations',
    low: 'Low - Minimal impact'
  };
  
  return impactMap[impact.toLowerCase()] || impact;
}

function getRecoveryMethod(field: any): string {
  if (typeof field === 'object' && field.recoveryMethod) {
    return field.recoveryMethod;
  }
  
  return 'Auto-generated';
}

function formatPriority(priority: string): string {
  const priorityMap: { [key: string]: string } = {
    critical: '🔥 Critical',
    high: '🔴 High',
    medium: '🟡 Medium',
    low: '🟢 Low'
  };
  
  return priorityMap[priority.toLowerCase()] || priority;
}

function getRecoveryOverlay(recoveryScore?: number): React.CSSProperties {
  if (!recoveryScore) {
    return { display: 'none' };
  }
  
  const intensity = recoveryScore;
  
  return {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: `
      radial-gradient(circle at 20% 80%, rgba(251, 146, 60, ${intensity * 0.1}) 0%, transparent 60%),
      radial-gradient(circle at 80% 20%, rgba(249, 115, 22, ${intensity * 0.08}) 0%, transparent 40%)
    `,
    pointerEvents: 'none',
    opacity: intensity * 0.6 + 0.2
  };
}