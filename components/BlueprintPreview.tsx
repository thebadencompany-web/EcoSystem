// components/BlueprintPreview.tsx
import React, { useRef, useEffect, useState, useCallback } from 'react';
import { EnhancedFlorosOutput, EmotionalTone, SeasonalContext } from '../types';

interface BlueprintPreviewProps {
  florosOutput?: EnhancedFlorosOutput | null;
  emotionalTone?: EmotionalTone;
  seasonalContext?: SeasonalContext;
  viewMode?: 'svg' | 'canvas';
  showAnnotations?: boolean;
  onExportBlueprint?: (format: 'svg' | 'png' | 'pdf') => void;
}

interface LayoutElement {
  id: string;
  type: 'flower' | 'stem' | 'leaf' | 'accent';
  position: { x: number; y: number };
  size: { width: number; height: number };
  rotation: number;
  color: string;
  emotionalWeight: number;
  manufacturingNotes?: string[];
}

export const BlueprintPreview: React.FC<BlueprintPreviewProps> = ({
  florosOutput,
  emotionalTone,
  seasonalContext,
  onExportBlueprint
}) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [layoutElements, setLayoutElements] = useState<LayoutElement[]>([]);
  const [selectedElement, setSelectedElement] = useState<string | null>(null);
  const [viewportScale, setViewportScale] = useState(1);
  const [viewMode, setViewMode] = useState<'svg' | 'canvas'>('svg');
  const [showAnnotations, setShowAnnotations] = useState(false);

  // Parse floros output into layout elements
  useEffect(() => {
    if (florosOutput?.layoutInstructions) {
      const elements = parseLayoutInstructions(florosOutput.layoutInstructions, emotionalTone);
      setLayoutElements(elements);
    }
  }, [florosOutput, emotionalTone]);

  // Render SVG blueprint
  const renderSVGBlueprint = useCallback(() => {
    if (!svgRef.current || layoutElements.length === 0) return;

    const svg = svgRef.current;
    const viewBox = `0 0 400 600`;
    svg.setAttribute('viewBox', viewBox);

    // Clear existing content
    svg.innerHTML = '';

    // Add definitions for patterns and gradients
    const defs = createSVGDefinitions(emotionalTone, seasonalContext);
    svg.appendChild(defs);

    // Render layout elements
    layoutElements.forEach(element => {
      const svgElement = createSVGElement(element, emotionalTone);
      if (svgElement) {
        svg.appendChild(svgElement);
      }
    });

    // Add emotional annotations if enabled
    if (showAnnotations && florosOutput.emotionalAnnotations) {
      addEmotionalAnnotations(svg, florosOutput.emotionalAnnotations);
    }

    // Add manufacturing grid
    addManufacturingGrid(svg);
  }, [layoutElements, emotionalTone, florosOutput.emotionalAnnotations, showAnnotations, seasonalContext]);

  // Render canvas blueprint
  const renderCanvasBlueprint = useCallback(() => {
    if (!canvasRef.current || layoutElements.length === 0) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = 400;
    canvas.height = 600;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Apply seasonal background
    if (seasonalContext) {
      drawSeasonalBackground(ctx, seasonalContext);
    }

    // Draw manufacturing grid
    drawManufacturingGrid(ctx);

    // Draw layout elements
    layoutElements.forEach(element => {
      drawCanvasElement(ctx, element, emotionalTone);
    });

    // Add emotional flow lines
    if (emotionalTone) {
      drawEmotionalFlowLines(ctx, layoutElements, emotionalTone);
    }

    // Add annotations
    if (showAnnotations && florosOutput.emotionalAnnotations) {
      drawCanvasAnnotations(ctx, florosOutput.emotionalAnnotations);
    }
  }, [layoutElements, emotionalTone, florosOutput.emotionalAnnotations, showAnnotations, seasonalContext]);

  // Effect to trigger rendering based on view mode
  useEffect(() => {
    renderCanvasBlueprint();
    renderSVGBlueprint();
  }, [layoutElements, viewMode, showAnnotations, emotionalTone, seasonalContext, renderCanvasBlueprint, renderSVGBlueprint]);

  const handleExport = (format: 'svg' | 'png' | 'pdf') => {
    if (onExportBlueprint) {
      onExportBlueprint(format);
    }
  };

  return (
    <div className="blueprint-preview">
      <div className="blueprint-header">
        <h3>Manufacturable Floral Blueprint</h3>
        <div className="blueprint-controls">
          <div className="view-mode-selector">
            <button 
              className={viewMode === 'svg' ? 'active' : ''} 
              onClick={() => setViewMode && setViewMode('svg')}
            >
              SVG
            </button>
            <button 
              className={viewMode === 'canvas' ? 'active' : ''} 
              onClick={() => setViewMode && setViewMode('canvas')}
            >
              Canvas
            </button>
          </div>
          
          <label className="annotations-toggle">
            <input
              type="checkbox"
              checked={showAnnotations}
              onChange={(e) => setShowAnnotations && setShowAnnotations(e.target.checked)}
            />
            <span>Show Annotations</span>
          </label>

          <div className="export-controls">
            <button onClick={() => handleExport('svg')}>Export SVG</button>
            <button onClick={() => handleExport('png')}>Export PNG</button>
            <button onClick={() => handleExport('pdf')}>Export PDF</button>
          </div>
        </div>
      </div>

      <div className="blueprint-viewport">
        <div className="viewport-controls">
          <button onClick={() => setViewportScale(viewportScale * 0.8)}>Zoom Out</button>
          <span className="scale-indicator">{Math.round(viewportScale * 100)}%</span>
          <button onClick={() => setViewportScale(viewportScale * 1.2)}>Zoom In</button>
        </div>

        <div 
          className="blueprint-container"
          style={{ transform: `scale(${viewportScale})` }}
        >
          {viewMode === 'svg' ? (
            <svg 
              ref={svgRef}
              className="blueprint-svg"
              onClick={(e) => handleElementClick(e)}
            />
          ) : (
            <canvas 
              ref={canvasRef}
              className="blueprint-canvas"
              onClick={(e) => handleElementClick(e)}
            />
          )}
        </div>
      </div>

      {/* Manufacturing Details Panel */}
      <div className="manufacturing-details">
        <h4>Manufacturing Specifications</h4>
        
        {florosOutput?.materialsList && ((florosOutput.materialsList.flowers?.length || 0) > 0 || (florosOutput.materialsList.supplies?.length || 0) > 0 || (florosOutput.materialsList.others?.length || 0) > 0) && (
          <div className="materials-section">
            <h5>Required Materials</h5>
            <div className="materials-list">
              {(florosOutput.materialsList.flowers || []).map((flower: any, index: number) => (
                <div key={index} className="material-item">
                  <span className="material-name">{flower.species || flower.name || 'Unknown'}</span>
                  <span className="material-quantity">{flower.count ?? 0} stems</span>
                  {flower.processingNotes ? <span className="material-notes">{flower.processingNotes}</span> : null}
                </div>
              ))}

              {(florosOutput.materialsList.supplies || []).map((supply: any, index: number) => (
                <div key={index} className="material-item">
                  <span className="material-name">{supply.item || supply.name || 'Supply'}</span>
                  <span className="material-quantity">{supply.quantity ?? ''}</span>
                  {supply.purpose ? <span className="material-purpose">{supply.purpose}</span> : null}
                </div>
              ))}

              {(florosOutput.materialsList.others || []).map((o: any, index: number) => (
                <div key={index} className="material-item">{typeof o === 'string' ? o : JSON.stringify(o)}</div>
              ))}
            </div>
          </div>
        )}

        {(florosOutput.assemblySteps && florosOutput.assemblySteps.length > 0) && (
          <div className="assembly-section">
            <h5>Assembly Instructions</h5>
            <div className="assembly-steps">
              {(florosOutput.assemblySteps || []).map((step: any, index: number) => (
                <div key={index} className="assembly-step">
                  <div className="step-number">{index + 1}</div>
                  <div className="step-content">
                    <div className="step-instruction">{step.instruction || step.description || String(step)}</div>
                    {step.estimatedTime ? <div className="step-timing">⏱️ {step.estimatedTime}</div> : null}
                    {step.emotionalFocus ? <div className="step-emotion">🌸 Focus: {step.emotionalFocus}</div> : null}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {florosOutput.qualityChecks && (
          <div className="quality-section">
            <h5>Quality Assurance</h5>
            <div className="quality-checks">
              {florosOutput.qualityChecks.map((check, index) => (
                <div key={index} className="quality-check">
                  <input type="checkbox" id={`check-${index}`} />
                  <label htmlFor={`check-${index}`}>{check.criterion}</label>
                  <span className="check-importance">{check.importance}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Expanded Taxonomy */}
        <div className="taxonomy-section">
          <h5>Design Taxonomy</h5>
          <div className="taxonomy-content">
            <div className="taxonomy-row">
              <span className="taxonomy-label">Seasonal Nuance:</span>
              <span className="taxonomy-value">
                {((florosOutput && (florosOutput as any).seasonalNuance) || []).length > 0 ? (
                  ((florosOutput && (florosOutput as any).seasonalNuance) || []).map((n: string, i: number) => (
                    <span key={i} className="taxonomy-badge">{n}</span>
                  ))
                ) : (
                  <span className="text-sm text-gray-500">None</span>
                )}
              </span>
            </div>

            <div className="taxonomy-row">
              <span className="taxonomy-label">Symbolic Tags:</span>
              <span className="taxonomy-value">
                {((florosOutput && (florosOutput as any).symbolicTags) || []).length > 0 ? (
                  ((florosOutput && (florosOutput as any).symbolicTags) || []).map((t: string, i: number) => (
                    <span key={i} className="taxonomy-badge symbolic">{t}</span>
                  ))
                ) : (
                  <span className="text-sm text-gray-500">None</span>
                )}
              </span>
            </div>

            <div className="taxonomy-row">
              <span className="taxonomy-label">Gesture Language:</span>
              <span className="taxonomy-value">
                {(florosOutput && (florosOutput as any).gestureLanguage) ? (
                  <div className="gesture-compact">
                    <span className="gesture-family">{((florosOutput && (florosOutput as any).gestureLanguage)?.family) || ((florosOutput && (florosOutput as any).gestureLanguage)?.primaryGesture) || 'N/A'}</span>
                    <span className="gesture-intensity">{typeof ((florosOutput && (florosOutput as any).gestureLanguage)?.intensity) === 'number' ? Math.round(((florosOutput && (florosOutput as any).gestureLanguage).intensity || 0) * 100) + '%' : 'N/A'}</span>
                  </div>
                ) : (
                  <span className="text-sm text-gray-500">None</span>
                )}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Element Inspector */}
      {selectedElement && (
        <div className="element-inspector">
          <h4>Element Details</h4>
          {renderElementDetails(layoutElements.find(el => el.id === selectedElement))}
        </div>
      )}
    </div>
  );

  function handleElementClick(e: React.MouseEvent) {
    // Implement element selection logic
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    const clickedElement = findElementAtPosition(x, y);
    setSelectedElement(clickedElement?.id || null);
  }

  function findElementAtPosition(x: number, y: number): LayoutElement | null {
    return layoutElements.find(element => {
      return (
        x >= element.position.x &&
        x <= element.position.x + element.size.width &&
        y >= element.position.y &&
        y <= element.position.y + element.size.height
      );
    }) || null;
  }

  function renderElementDetails(element: LayoutElement | undefined) {
    if (!element) return null;

    return (
      <div className="element-details">
        <div className="detail-row">
          <span className="detail-label">Type:</span>
          <span className="detail-value">{element.type}</span>
        </div>
        <div className="detail-row">
          <span className="detail-label">Position:</span>
          <span className="detail-value">
            {element.position.x}, {element.position.y}
          </span>
        </div>
        <div className="detail-row">
          <span className="detail-label">Size:</span>
          <span className="detail-value">
            {element.size.width} × {element.size.height}
          </span>
        </div>
        <div className="detail-row">
          <span className="detail-label">Emotional Weight:</span>
          <span className="detail-value">{element.emotionalWeight}</span>
        </div>
        {element.manufacturingNotes && (
          <div className="manufacturing-notes">
            <span className="detail-label">Notes:</span>
            <ul>
              {element.manufacturingNotes.map((note, index) => (
                <li key={index}>{note}</li>
              ))}
            </ul>
          </div>
        )}
      </div>
    );
  }
};

// Helper functions
function parseLayoutInstructions(instructions: any, emotionalTone?: EmotionalTone): LayoutElement[] {
  const elements: LayoutElement[] = [];
  
  // Parse primary focal points
  if (instructions.focalPoints) {
    instructions.focalPoints.forEach((point: any, index: number) => {
      elements.push({
        id: `focal-${index}`,
        type: 'flower',
        position: { x: point.x || 50 + index * 100, y: point.y || 100 + index * 50 },
        size: { width: point.size || 60, height: point.size || 60 },
        rotation: point.rotation || 0,
        color: emotionalTone?.colorPalette[0] || '#e11d48',
        emotionalWeight: point.emotionalWeight || 0.8,
        manufacturingNotes: point.processingNotes
      });
    });
  }
  
  // Parse supporting elements
  if (instructions.supportingElements) {
    instructions.supportingElements.forEach((element: any, index: number) => {
      elements.push({
        id: `support-${index}`,
        type: element.type || 'leaf',
        position: { x: element.x || 100 + index * 80, y: element.y || 200 + index * 40 },
        size: { width: element.width || 30, height: element.height || 40 },
        rotation: element.rotation || 0,
        color: emotionalTone?.colorPalette[1] || '#059669',
        emotionalWeight: element.emotionalWeight || 0.4,
        manufacturingNotes: element.notes
      });
    });
  }
  
  return elements;
}

function createSVGDefinitions(emotionalTone?: EmotionalTone, seasonalContext?: SeasonalContext): SVGDefsElement {
  const defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
  
  // Emotional gradient
  if (emotionalTone) {
    const gradient = document.createElementNS('http://www.w3.org/2000/svg', 'linearGradient');
    gradient.id = 'emotionalGradient';
    gradient.setAttribute('x1', '0%');
    gradient.setAttribute('y1', '0%');
    gradient.setAttribute('x2', '100%');
    gradient.setAttribute('y2', '100%');
    
    emotionalTone.colorPalette.forEach((color, index) => {
      const stop = document.createElementNS('http://www.w3.org/2000/svg', 'stop');
      stop.setAttribute('offset', `${(index / (emotionalTone.colorPalette.length - 1)) * 100}%`);
      stop.setAttribute('stop-color', color);
      gradient.appendChild(stop);
    });
    
    defs.appendChild(gradient);
  }
  
  // Seasonal pattern
  if (seasonalContext) {
    const pattern = document.createElementNS('http://www.w3.org/2000/svg', 'pattern');
    pattern.id = 'seasonalPattern';
    pattern.setAttribute('x', '0');
    pattern.setAttribute('y', '0');
    pattern.setAttribute('width', '20');
    pattern.setAttribute('height', '20');
    pattern.setAttribute('patternUnits', 'userSpaceOnUse');
    
    // Add seasonal texture elements based on season
    // This would be expanded with specific seasonal patterns
    
    defs.appendChild(pattern);
  }
  
  return defs;
}

function createSVGElement(element: LayoutElement, emotionalTone?: EmotionalTone): SVGElement | null {
  let svgElement: SVGElement;
  
  switch (element.type) {
    case 'flower':
      svgElement = createSVGFlower(element);
      break;
    case 'stem':
      svgElement = createSVGStem(element);
      break;
    case 'leaf':
      svgElement = createSVGLeaf(element);
      break;
    default:
      return null;
  }
  
  // Apply common attributes
  svgElement.setAttribute('transform', `translate(${element.position.x}, ${element.position.y}) rotate(${element.rotation})`);
  svgElement.setAttribute('fill', element.color);
  svgElement.setAttribute('data-element-id', element.id);
  
  return svgElement;
}

function createSVGFlower(element: LayoutElement): SVGElement {
  const group = document.createElementNS('http://www.w3.org/2000/svg', 'g');
  
  // Create flower petals
  for (let i = 0; i < 6; i++) {
    const petal = document.createElementNS('http://www.w3.org/2000/svg', 'ellipse');
    const angle = (i / 6) * Math.PI * 2;
    const x = Math.cos(angle) * (element.size.width / 3);
    const y = Math.sin(angle) * (element.size.height / 3);
    
    petal.setAttribute('cx', x.toString());
    petal.setAttribute('cy', y.toString());
    petal.setAttribute('rx', (element.size.width / 6).toString());
    petal.setAttribute('ry', (element.size.height / 4).toString());
    petal.setAttribute('transform', `rotate(${(angle * 180) / Math.PI})`);
    
    group.appendChild(petal);
  }
  
  // Add center
  const center = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
  center.setAttribute('cx', '0');
  center.setAttribute('cy', '0');
  center.setAttribute('r', (element.size.width / 8).toString());
  center.setAttribute('fill', '#fbbf24');
  
  group.appendChild(center);
  
  return group;
}

function createSVGStem(element: LayoutElement): SVGElement {
  const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
  line.setAttribute('x1', '0');
  line.setAttribute('y1', '0');
  line.setAttribute('x2', '0');
  line.setAttribute('y2', element.size.height.toString());
  line.setAttribute('stroke', element.color);
  line.setAttribute('stroke-width', (element.size.width / 10).toString());
  
  return line;
}

function createSVGLeaf(element: LayoutElement): SVGElement {
  const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
  const w = element.size.width;
  const h = element.size.height;
  const pathData = `M0,${h/2} Q${w/4},0 ${w/2},${h/4} Q${3*w/4},0 ${w},${h/2} Q${3*w/4},${h} ${w/2},${3*h/4} Q${w/4},${h} 0,${h/2}`;
  
  path.setAttribute('d', pathData);
  
  return path;
}

function addEmotionalAnnotations(svg: SVGSVGElement, annotations: any[]) {
  annotations.forEach((annotation, index) => {
    const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    text.setAttribute('x', '10');
    text.setAttribute('y', (20 + index * 15).toString());
    text.setAttribute('font-size', '12');
    text.setAttribute('fill', '#374151');
    text.textContent = annotation.text || annotation;
    
    svg.appendChild(text);
  });
}

function addManufacturingGrid(svg: SVGSVGElement) {
  // Add a subtle grid for manufacturing reference
  const gridGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
  gridGroup.setAttribute('opacity', '0.1');
  
  // Vertical lines
  for (let x = 0; x < 400; x += 20) {
    const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    line.setAttribute('x1', x.toString());
    line.setAttribute('y1', '0');
    line.setAttribute('x2', x.toString());
    line.setAttribute('y2', '600');
    line.setAttribute('stroke', '#6b7280');
    gridGroup.appendChild(line);
  }
  
  // Horizontal lines
  for (let y = 0; y < 600; y += 20) {
    const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    line.setAttribute('x1', '0');
    line.setAttribute('y1', y.toString());
    line.setAttribute('x2', '400');
    line.setAttribute('y2', y.toString());
    line.setAttribute('stroke', '#6b7280');
    gridGroup.appendChild(line);
  }
  
  svg.appendChild(gridGroup);
}

// Canvas rendering functions
function drawSeasonalBackground(ctx: CanvasRenderingContext2D, seasonalContext: SeasonalContext) {
  const gradient = ctx.createLinearGradient(0, 0, ctx.canvas.width, ctx.canvas.height);
  
  switch (seasonalContext.primarySeason) {
    case 'spring':
      gradient.addColorStop(0, '#f0fdf4');
      gradient.addColorStop(1, '#dcfce7');
      break;
    case 'summer':
      gradient.addColorStop(0, '#fffbeb');
      gradient.addColorStop(1, '#fef3c7');
      break;
    case 'fall':
      gradient.addColorStop(0, '#fff7ed');
      gradient.addColorStop(1, '#fed7aa');
      break;
    case 'winter':
      gradient.addColorStop(0, '#f8fafc');
      gradient.addColorStop(1, '#e2e8f0');
      break;
  }
  
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
}

function drawManufacturingGrid(ctx: CanvasRenderingContext2D) {
  ctx.strokeStyle = '#e5e7eb';
  ctx.lineWidth = 1;
  ctx.globalAlpha = 0.3;
  
  for (let x = 0; x < ctx.canvas.width; x += 20) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, ctx.canvas.height);
    ctx.stroke();
  }
  
  for (let y = 0; y < ctx.canvas.height; y += 20) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(ctx.canvas.width, y);
    ctx.stroke();
  }
  
  ctx.globalAlpha = 1;
}

function drawCanvasElement(ctx: CanvasRenderingContext2D, element: LayoutElement, emotionalTone?: EmotionalTone) {
  ctx.save();
  ctx.translate(element.position.x, element.position.y);
  ctx.rotate(element.rotation * Math.PI / 180);
  
  ctx.fillStyle = element.color;
  ctx.strokeStyle = element.color;
  
  switch (element.type) {
    case 'flower':
      drawCanvasFlower(ctx, element.size.width, element.size.height);
      break;
    case 'stem':
      drawCanvasStem(ctx, element.size.width, element.size.height);
      break;
    case 'leaf':
      drawCanvasLeaf(ctx, element.size.width, element.size.height);
      break;
  }
  
  ctx.restore();
}

function drawCanvasFlower(ctx: CanvasRenderingContext2D, width: number, height: number) {
  // Draw petals
  for (let i = 0; i < 6; i++) {
    const angle = (i / 6) * Math.PI * 2;
    const x = Math.cos(angle) * (width / 3);
    const y = Math.sin(angle) * (height / 3);
    
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(angle);
    ctx.beginPath();
    ctx.ellipse(0, 0, width / 6, height / 4, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
  
  // Draw center
  ctx.fillStyle = '#fbbf24';
  ctx.beginPath();
  ctx.arc(0, 0, width / 8, 0, Math.PI * 2);
  ctx.fill();
}

function drawCanvasStem(ctx: CanvasRenderingContext2D, width: number, height: number) {
  ctx.lineWidth = width / 10;
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(0, height);
  ctx.stroke();
}

function drawCanvasLeaf(ctx: CanvasRenderingContext2D, width: number, height: number) {
  ctx.beginPath();
  ctx.moveTo(0, height/2);
  ctx.quadraticCurveTo(width/4, 0, width/2, height/4);
  ctx.quadraticCurveTo(3*width/4, 0, width, height/2);
  ctx.quadraticCurveTo(3*width/4, height, width/2, 3*height/4);
  ctx.quadraticCurveTo(width/4, height, 0, height/2);
  ctx.fill();
}

function drawEmotionalFlowLines(ctx: CanvasRenderingContext2D, elements: LayoutElement[], emotionalTone: EmotionalTone) {
  ctx.strokeStyle = emotionalTone.colorPalette[0] + '40';
  ctx.lineWidth = 2;
  
  elements.forEach(element => {
    if (element.emotionalWeight > 0.5) {
      const intensity = element.emotionalWeight;
      ctx.globalAlpha = intensity * 0.6;
      
      ctx.beginPath();
      ctx.arc(
        element.position.x + element.size.width/2, 
        element.position.y + element.size.height/2, 
        intensity * 50, 
        0, 
        Math.PI * 2
      );
      ctx.stroke();
    }
  });
  
  ctx.globalAlpha = 1;
}

function drawCanvasAnnotations(ctx: CanvasRenderingContext2D, annotations: any[]) {
  ctx.fillStyle = '#374151';
  ctx.font = '12px sans-serif';
  
  annotations.forEach((annotation, index) => {
    ctx.fillText(annotation.text || annotation, 10, 20 + index * 15);
  });
}

// Sync layout element colors to the current emotional tone palette when it changes.
// This avoids global-scope mutations and prevents runtime errors when rendering.
function useSyncElementColors(emotionalTone: EmotionalTone | undefined, elements: LayoutElement[], setElements: (els: LayoutElement[]) => void) {
  // No-op shim retained for compatibility with earlier imports.
  // Intentionally empty: color-sync is handled inside the component with useEffect.
  return;
}

// NOTE: the actual color-sync is implemented inside the component via a useEffect
// so it runs when `emotionalTone` or the elements list changes. This keeps the
// logic local and avoids referencing undefined globals at module scope.