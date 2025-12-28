// components/FlorosBlueprint.tsx
import React, { useRef, useEffect } from 'react';
import { AgentOutput } from '../hooks/useAgentOutput';

interface FlorosBlueprintProps {
  output: AgentOutput | null;
  emotionTone?: string;
  season?: string;
}

export const FlorosBlueprint: React.FC<FlorosBlueprintProps> = ({ 
  output, 
  emotionTone = 'neutral', 
  season = 'spring' 
}) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  if (!output || output.agentType !== 'floros') {
    return null;
  }

  const overlayStyle = getOverlayStyle(emotionTone, season);
  const blueprintData = output.output;

  // Render SVG blueprint preview
  useEffect(() => {
    if (svgRef.current && blueprintData?.layoutInstructions) {
      renderSVGBlueprint(svgRef.current, blueprintData, emotionTone);
    }
  }, [blueprintData, emotionTone]);
  
  return (
    <div className="floros-blueprint" style={overlayStyle}>
      <div className="blueprint-header">
        <h3>🎨 Manufacturing Blueprint</h3>
        <div className="status-indicators">
          {output.isLoading && <div className="loading-indicator">Generating...</div>}
          {output.error && <div className="error-indicator">❌ {output.error}</div>}
          {output.emotionalImpactScore && (
            <div className="impact-score">
              Impact: {Math.round(output.emotionalImpactScore * 100)}%
            </div>
          )}
        </div>
      </div>

      <div className="blueprint-content">
        {output.isLoading ? (
          <div className="loading-container">
            <div className="loading-spinner" />
            <p>Generating manufacturable blueprint...</p>
          </div>
        ) : output.error ? (
          <div className="error-container">
            <p>Failed to generate blueprint</p>
            <small>{output.error}</small>
          </div>
        ) : (
          <div className="blueprint-sections">
            {/* Visual Blueprint */}
            <div className="blueprint-visual">
              <div className="visual-header">
                <h4>📐 Visual Layout</h4>
                {blueprintData?.title && (
                  <div className="blueprint-title">{blueprintData.title}</div>
                )}
              </div>
              
              <div className="svg-container">
                <svg 
                  ref={svgRef}
                  viewBox="0 0 400 400"
                  className="blueprint-svg"
                />
              </div>

              {blueprintData?.emotionalAnnotations && (
                <div className="emotional-annotations">
                  <h5>Emotional Design Notes:</h5>
                  <ul>
                    {blueprintData.emotionalAnnotations.map((annotation: any, index: number) => (
                      <li key={index} className="annotation-item">
                        {typeof annotation === 'string' ? annotation : annotation.text}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            {/* Materials List */}
            {blueprintData?.materialsList && (
              <div className="materials-section">
                <h4>🌸 Materials Required</h4>
                
                {blueprintData.materialsList.flowers && (
                  <div className="flowers-list">
                    <h5>Flowers:</h5>
                    <div className="materials-grid">
                      {blueprintData.materialsList.flowers.map((flower: any, index: number) => (
                        <div key={index} className="material-card flower">
                          <div className="material-header">
                            <span className="material-name">{flower.species}</span>
                            <span className="material-quantity">{flower.count} stems</span>
                          </div>
                          <div className="material-details">
                            {flower.color && (
                              <div className="material-detail">
                                <label>Color:</label>
                                <span>{flower.color}</span>
                              </div>
                            )}
                            {flower.size && (
                              <div className="material-detail">
                                <label>Size:</label>
                                <span>{flower.size}</span>
                              </div>
                            )}
                            {flower.processingNotes && (
                              <div className="processing-notes">
                                <small>{flower.processingNotes}</small>
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {blueprintData.materialsList.supplies && (
                  <div className="supplies-list">
                    <h5>Supplies:</h5>
                    <div className="materials-grid">
                      {blueprintData.materialsList.supplies.map((supply: any, index: number) => (
                        <div key={index} className="material-card supply">
                          <div className="material-header">
                            <span className="material-name">{supply.item}</span>
                            <span className="material-quantity">{supply.quantity}</span>
                          </div>
                          {supply.purpose && (
                            <div className="material-purpose">
                              <small>{supply.purpose}</small>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Assembly Instructions */}
            {blueprintData?.assemblySteps && (
              <div className="assembly-section">
                <h4>🔧 Assembly Instructions</h4>
                <div className="assembly-steps">
                  {blueprintData.assemblySteps.map((step: any, index: number) => (
                    <div key={index} className="assembly-step">
                      <div className="step-number">{index + 1}</div>
                      <div className="step-content">
                        <div className="step-instruction">{step.instruction}</div>
                        
                        <div className="step-metadata">
                          {step.estimatedTime && (
                            <div className="step-time">
                              ⏱️ {step.estimatedTime}
                            </div>
                          )}
                          
                          {step.difficulty && (
                            <div className={`step-difficulty ${step.difficulty}`}>
                              {formatDifficulty(step.difficulty)}
                            </div>
                          )}
                          
                          {step.emotionalFocus && (
                            <div className="step-emotion">
                              💫 Focus: {step.emotionalFocus}
                            </div>
                          )}
                        </div>

                        {step.tips && (
                          <div className="step-tips">
                            <strong>Tips:</strong> {step.tips}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Quality Assurance */}
            {blueprintData?.qualityChecks && (
              <div className="quality-section">
                <h4>✅ Quality Assurance</h4>
                <div className="quality-checklist">
                  {blueprintData.qualityChecks.map((check: any, index: number) => (
                    <div key={index} className="quality-check">
                      <input 
                        type="checkbox" 
                        id={`quality-${index}`}
                        className="quality-checkbox"
                      />
                      <label htmlFor={`quality-${index}`} className="quality-label">
                        <span className="check-criterion">{check.criterion}</span>
                        {check.importance && (
                          <span className={`check-importance ${check.importance}`}>
                            {formatImportance(check.importance)}
                          </span>
                        )}
                      </label>
                      {check.notes && (
                        <div className="check-notes">
                          <small>{check.notes}</small>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Manufacturing Metadata */}
            <div className="manufacturing-metadata">
              <h4>📊 Manufacturing Details</h4>
              <div className="metadata-grid">
                {blueprintData?.estimatedDuration && (
                  <div className="metadata-item">
                    <label>Total Time:</label>
                    <span>{blueprintData.estimatedDuration}</span>
                  </div>
                )}
                
                {blueprintData?.difficultyLevel && (
                  <div className="metadata-item">
                    <label>Difficulty:</label>
                    <span className={`difficulty-badge ${blueprintData.difficultyLevel}`}>
                      {formatDifficulty(blueprintData.difficultyLevel)}
                    </span>
                  </div>
                )}
                
                {blueprintData?.skillsRequired && (
                  <div className="metadata-item">
                    <label>Skills Required:</label>
                    <div className="skills-tags">
                      {blueprintData.skillsRequired.map((skill: string, index: number) => (
                        <span key={index} className="skill-tag">{skill}</span>
                      ))}
                    </div>
                  </div>
                )}

                {output.emotionalImpactScore && (
                  <div className="metadata-item">
                    <label>Emotional Resonance:</label>
                    <div className="resonance-bar">
                      <div 
                        className="resonance-fill"
                        style={{ 
                          width: `${output.emotionalImpactScore * 100}%`,
                          backgroundColor: getResonanceColor(output.emotionalImpactScore)
                        }}
                      />
                      <span>{Math.round(output.emotionalImpactScore * 100)}%</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {output.annotations && output.annotations.length > 0 && (
          <div className="annotations">
            <h4>Blueprint Notes</h4>
            <ul>
              {output.annotations.map((annotation, index) => (
                <li key={index}>{annotation}</li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* Manufacturing confidence overlay */}
      <div className="manufacturing-overlay" style={getManufacturingOverlay(output.emotionalImpactScore)} />
    </div>
  );
};

function renderSVGBlueprint(svg: SVGSVGElement, blueprintData: any, emotionTone: string) {
  // Clear existing content
  svg.innerHTML = '';

  // Add background
  const background = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
  background.setAttribute('width', '100%');
  background.setAttribute('height', '100%');
  background.setAttribute('fill', '#f8fafc');
  background.setAttribute('stroke', '#e2e8f0');
  background.setAttribute('stroke-width', '1');
  svg.appendChild(background);

  // Add manufacturing grid
  addManufacturingGrid(svg);

  // Render layout elements
  if (blueprintData.layoutInstructions?.focalPoints) {
    blueprintData.layoutInstructions.focalPoints.forEach((point: any, index: number) => {
      const element = createSVGFlowerElement(point, index, emotionTone);
      svg.appendChild(element);
    });
  }

  if (blueprintData.layoutInstructions?.supportingElements) {
    blueprintData.layoutInstructions.supportingElements.forEach((element: any, index: number) => {
      const svgElement = createSVGSupportElement(element, index);
      svg.appendChild(svgElement);
    });
  }

  // Add emotional flow lines
  if (blueprintData.emotionalAnnotations) {
    addEmotionalFlowLines(svg, blueprintData.layoutInstructions, emotionTone);
  }
}

function addManufacturingGrid(svg: SVGSVGElement) {
  const gridGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
  gridGroup.setAttribute('opacity', '0.1');

  // Add grid lines
  for (let i = 0; i <= 20; i++) {
    const x = (i / 20) * 400;
    const y = (i / 20) * 400;
    
    // Vertical lines
    const vLine = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    vLine.setAttribute('x1', x.toString());
    vLine.setAttribute('y1', '0');
    vLine.setAttribute('x2', x.toString());
    vLine.setAttribute('y2', '400');
    vLine.setAttribute('stroke', '#6b7280');
    gridGroup.appendChild(vLine);
    
    // Horizontal lines
    const hLine = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    hLine.setAttribute('x1', '0');
    hLine.setAttribute('y1', y.toString());
    hLine.setAttribute('x2', '400');
    hLine.setAttribute('y2', y.toString());
    hLine.setAttribute('stroke', '#6b7280');
    gridGroup.appendChild(hLine);
  }

  svg.appendChild(gridGroup);
}

function createSVGFlowerElement(point: any, index: number, emotionTone: string): SVGElement {
  const group = document.createElementNS('http://www.w3.org/2000/svg', 'g');
  const x = point.x || 100 + index * 80;
  const y = point.y || 100 + index * 60;
  
  group.setAttribute('transform', `translate(${x}, ${y})`);

  // Create flower shape
  const flower = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
  flower.setAttribute('cx', '0');
  flower.setAttribute('cy', '0');
  flower.setAttribute('r', (point.size || 20).toString());
  flower.setAttribute('fill', getEmotionColor(emotionTone));
  flower.setAttribute('stroke', '#374151');
  flower.setAttribute('stroke-width', '2');
  flower.setAttribute('opacity', '0.8');

  // Add petals
  for (let i = 0; i < 6; i++) {
    const angle = (i / 6) * Math.PI * 2;
    const petalX = Math.cos(angle) * (point.size || 20) * 0.8;
    const petalY = Math.sin(angle) * (point.size || 20) * 0.8;
    
    const petal = document.createElementNS('http://www.w3.org/2000/svg', 'ellipse');
    petal.setAttribute('cx', petalX.toString());
    petal.setAttribute('cy', petalY.toString());
    petal.setAttribute('rx', ((point.size || 20) * 0.4).toString());
    petal.setAttribute('ry', ((point.size || 20) * 0.6).toString());
    petal.setAttribute('fill', getEmotionColor(emotionTone));
    petal.setAttribute('opacity', '0.6');
    petal.setAttribute('transform', `rotate(${(angle * 180) / Math.PI})`);
    
    group.appendChild(petal);
  }

  group.appendChild(flower);

  // Add label
  const label = document.createElementNS('http://www.w3.org/2000/svg', 'text');
  label.setAttribute('x', '0');
  label.setAttribute('y', (point.size || 20) + 15);
  label.setAttribute('text-anchor', 'middle');
  label.setAttribute('font-size', '10');
  label.setAttribute('fill', '#374151');
  label.textContent = `F${index + 1}`;
  
  group.appendChild(label);

  return group;
}

function createSVGSupportElement(element: any, index: number): SVGElement {
  const group = document.createElementNS('http://www.w3.org/2000/svg', 'g');
  const x = element.x || 50 + index * 60;
  const y = element.y || 200 + index * 40;
  
  group.setAttribute('transform', `translate(${x}, ${y})`);

  // Create support element (leaf or stem)
  const shape = document.createElementNS('http://www.w3.org/2000/svg', 'ellipse');
  shape.setAttribute('cx', '0');
  shape.setAttribute('cy', '0');
  shape.setAttribute('rx', '8');
  shape.setAttribute('ry', '16');
  shape.setAttribute('fill', '#22c55e');
  shape.setAttribute('opacity', '0.7');
  shape.setAttribute('transform', 'rotate(45)');

  group.appendChild(shape);

  return group;
}

function addEmotionalFlowLines(svg: SVGSVGElement, layout: any, emotionTone: string) {
  if (!layout?.focalPoints) return;

  const flowGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
  flowGroup.setAttribute('opacity', '0.3');

  layout.focalPoints.forEach((point: any, index: number) => {
    if (index < layout.focalPoints.length - 1) {
      const nextPoint = layout.focalPoints[index + 1];
      
      const line = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      const x1 = point.x || 100 + index * 80;
      const y1 = point.y || 100 + index * 60;
      const x2 = nextPoint.x || 100 + (index + 1) * 80;
      const y2 = nextPoint.y || 100 + (index + 1) * 60;
      
      // Create curved connection
      const midX = (x1 + x2) / 2;
      const midY = (y1 + y2) / 2 - 20;
      
      const pathData = `M ${x1} ${y1} Q ${midX} ${midY} ${x2} ${y2}`;
      line.setAttribute('d', pathData);
      line.setAttribute('stroke', getEmotionColor(emotionTone));
      line.setAttribute('stroke-width', '2');
      line.setAttribute('fill', 'none');
      
      flowGroup.appendChild(line);
    }
  });

  svg.appendChild(flowGroup);
}

function getOverlayStyle(tone: string, season: string): React.CSSProperties {
  const baseStyle: React.CSSProperties = {
    position: 'relative',
    borderRadius: '16px',
    padding: '24px',
    margin: '8px 0',
    minHeight: '500px',
    overflow: 'hidden'
  };

  // Manufacturing blueprint styling with emotional influences
  switch (tone.toLowerCase()) {
    case 'wistful':
      return {
        ...baseStyle,
        background: `
          linear-gradient(135deg, rgba(139, 92, 246, 0.1) 0%, rgba(196, 181, 253, 0.05) 100%),
          url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23a855f7' fill-opacity='0.05'%3E%3Ccircle cx='30' cy='30' r='2'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")
        `,
        border: '3px solid rgba(139, 92, 246, 0.2)',
        boxShadow: '0 16px 64px rgba(139, 92, 246, 0.12)'
      };
    
    case 'joyful':
      return {
        ...baseStyle,
        background: `
          linear-gradient(135deg, rgba(34, 197, 94, 0.1) 0%, rgba(187, 247, 208, 0.05) 100%),
          url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%2322c55e' fill-opacity='0.05'%3E%3Ccircle cx='30' cy='30' r='2'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")
        `,
        border: '3px solid rgba(34, 197, 94, 0.2)',
        boxShadow: '0 16px 64px rgba(34, 197, 94, 0.12)'
      };
    
    default:
      return {
        ...baseStyle,
        background: `
          linear-gradient(135deg, rgba(15, 118, 110, 0.1) 0%, rgba(153, 246, 228, 0.05) 100%),
          url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%230f766e' fill-opacity='0.05'%3E%3Ccircle cx='30' cy='30' r='2'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")
        `,
        border: '3px solid rgba(15, 118, 110, 0.2)',
        boxShadow: '0 16px 64px rgba(15, 118, 110, 0.12)'
      };
  }
}

function getEmotionColor(tone: string): string {
  const colorMap: { [key: string]: string } = {
    wistful: '#a855f7',
    joyful: '#22c55e',
    peaceful: '#3b82f6',
    nostalgic: '#f59e0b',
    romantic: '#ec4899',
    neutral: '#6b7280'
  };
  
  return colorMap[tone.toLowerCase()] || '#0f766e';
}

function getResonanceColor(score: number): string {
  if (score >= 0.8) return '#22c55e'; // High resonance - green
  if (score >= 0.6) return '#f59e0b'; // Medium resonance - amber
  if (score >= 0.4) return '#ef4444'; // Low resonance - red
  return '#6b7280'; // Very low resonance - gray
}

function formatDifficulty(difficulty: string): string {
  const difficultyMap: { [key: string]: string } = {
    'beginner': '🌱 Beginner',
    'intermediate': '🌿 Intermediate',
    'advanced': '🌳 Advanced',
    'expert': '🌲 Expert'
  };
  
  return difficultyMap[difficulty.toLowerCase()] || difficulty;
}

function formatImportance(importance: string): string {
  const importanceMap: { [key: string]: string } = {
    'critical': '🔴 Critical',
    'high': '🟠 High',
    'medium': '🟡 Medium',
    'low': '🟢 Low'
  };
  
  return importanceMap[importance.toLowerCase()] || importance;
}

function getManufacturingOverlay(emotionalImpact?: number): React.CSSProperties {
  if (!emotionalImpact) {
    return { display: 'none' };
  }
  
  const intensity = emotionalImpact;
  
  return {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: `
      radial-gradient(circle at 25% 75%, rgba(15, 118, 110, ${intensity * 0.1}) 0%, transparent 50%),
      radial-gradient(circle at 75% 25%, rgba(6, 182, 212, ${intensity * 0.08}) 0%, transparent 40%)
    `,
    pointerEvents: 'none',
    opacity: intensity * 0.7 + 0.3
  };
}