// components/EmotionalFlowVisualizer.tsx
import React, { useEffect, useRef } from 'react';
import { EnhancedLogicEngineOutput, EmotionalTone, SeasonalContext } from '../types';

interface EmotionalFlowVisualizerProps {
  logicOutput: EnhancedLogicEngineOutput;
  emotionalTone?: EmotionalTone;
  seasonalContext?: SeasonalContext;
}

export const EmotionalFlowVisualizer: React.FC<EmotionalFlowVisualizerProps> = ({
  logicOutput,
  emotionalTone,
  seasonalContext
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!canvasRef.current || !logicOutput) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size
    canvas.width = 400;
    canvas.height = 300;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw emotional flow visualization
    drawEmotionalFlow(ctx, logicOutput, emotionalTone, seasonalContext);
  }, [logicOutput, emotionalTone, seasonalContext]);

  return (
    <div className="emotional-flow-visualizer">
      <h3>Emotional Flow Analysis</h3>
      
      {/* Emotional metrics */}
      <div className="emotion-metrics">
        <div className="metric-card">
          <h4>Primary Emotion</h4>
          <div className="emotion-display">
            <span className="emotion-label">
              {logicOutput.emotionalAnalysis?.primaryEmotion || 'neutral'}
            </span>
            <div className="intensity-bar">
              <div 
                className="intensity-fill"
                style={{
                  width: `${(logicOutput.emotionalAnalysis?.intensity || 0) * 100}%`,
                  backgroundColor: emotionalTone?.colorPalette[0] || '#6b7280'
                }}
              />
            </div>
            <span className="intensity-label">
              {Math.round((logicOutput.emotionalAnalysis?.intensity || 0) * 100)}%
            </span>
          </div>
        </div>

        <div className="metric-card">
          <h4>Seasonal Context</h4>
          <div className="season-display">
            <span className="season-label">
              {seasonalContext?.season || 'unknown'}
            </span>
            <div className="season-indicator"
              style={{
                background: seasonalContext?.overlayTexture || '#f3f4f6',
                opacity: (seasonalContext?.intensity || 0) * 0.8 + 0.2
              }}
            />
          </div>
        </div>

        {logicOutput.storytellingScores && (
          <div className="metric-card">
            <h4>Storytelling Resonance</h4>
            <div className="story-metrics">
              <div className="story-metric">
                <span>Narrative: {Math.round(logicOutput.storytellingScores.narrativeCoherence * 100)}%</span>
                <div className="mini-bar">
                  <div style={{ width: `${logicOutput.storytellingScores.narrativeCoherence * 100}%` }} />
                </div>
              </div>
              <div className="story-metric">
                <span>Emotional: {Math.round(logicOutput.storytellingScores.emotionalResonance * 100)}%</span>
                <div className="mini-bar">
                  <div style={{ width: `${logicOutput.storytellingScores.emotionalResonance * 100}%` }} />
                </div>
              </div>
              <div className="story-metric">
                <span>Symbolism: {Math.round(logicOutput.storytellingScores.symbolismDepth * 100)}%</span>
                <div className="mini-bar">
                  <div style={{ width: `${logicOutput.storytellingScores.symbolismDepth * 100}%` }} />
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Emotional flow canvas */}
      <div className="flow-canvas-container">
        <canvas 
          ref={canvasRef}
          className="emotional-flow-canvas"
        />
        <div className="canvas-legend">
          <div className="legend-item">
            <div className="legend-color" style={{ backgroundColor: emotionalTone?.colorPalette[0] || '#6366f1' }} />
            <span>Primary Emotion</span>
          </div>
          <div className="legend-item">
            <div className="legend-color" style={{ backgroundColor: emotionalTone?.colorPalette[1] || '#8b5cf6' }} />
            <span>Secondary Emotions</span>
          </div>
          <div className="legend-item">
            <div className="legend-color" style={{ backgroundColor: emotionalTone?.colorPalette[2] || '#a855f7' }} />
            <span>Seasonal Influence</span>
          </div>
        </div>
      </div>

      {/* Texture hints */}
      {emotionalTone?.textureHints && (
        <div className="texture-hints">
          <h4>Botanical Texture Recommendations</h4>
          <div className="texture-tags">
            {emotionalTone.textureHints.map((hint, index) => (
              <span key={index} className="texture-tag">
                {hint}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

function drawEmotionalFlow(
  ctx: CanvasRenderingContext2D,
  logicOutput: EnhancedLogicEngineOutput,
  emotionalTone?: EmotionalTone,
  seasonalContext?: SeasonalContext
) {
  const width = ctx.canvas.width;
  const height = ctx.canvas.height;

  // Create gradient background based on seasonal context
  if (seasonalContext) {
    const gradient = ctx.createLinearGradient(0, 0, width, height);
    const colors = getSeasonalColors(seasonalContext.season);
    gradient.addColorStop(0, colors[0] + '20');
    gradient.addColorStop(1, colors[1] + '10');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);
  }

  // Draw emotional intensity as flowing curves
  if (emotionalTone && logicOutput.emotionalAnalysis) {
    const intensity = logicOutput.emotionalAnalysis.intensity;
    const centerY = height / 2;
    
    // Primary emotion flow
    ctx.strokeStyle = emotionalTone.colorPalette[0];
    ctx.lineWidth = intensity * 8 + 2;
    ctx.beginPath();
    ctx.moveTo(0, centerY);
    
    for (let x = 0; x < width; x += 10) {
      const waveHeight = Math.sin(x * 0.02) * intensity * 30;
      const y = centerY + waveHeight;
      ctx.lineTo(x, y);
    }
    ctx.stroke();

    // Secondary emotion layers
    if (logicOutput.emotionalAnalysis.secondaryEmotions) {
      logicOutput.emotionalAnalysis.secondaryEmotions.forEach((emotion, index) => {
        if (index < 2) {
          ctx.strokeStyle = emotionalTone.colorPalette[index + 1] + '80';
          ctx.lineWidth = (emotion.intensity || 0.3) * 6 + 1;
          ctx.beginPath();
          ctx.moveTo(0, centerY + (index + 1) * 20);
          
          for (let x = 0; x < width; x += 15) {
            const waveHeight = Math.sin(x * 0.03 + index) * (emotion.intensity || 0.3) * 20;
            const y = centerY + (index + 1) * 20 + waveHeight;
            ctx.lineTo(x, y);
          }
          ctx.stroke();
        }
      });
    }
  }

  // Draw storytelling resonance as particles
  if (logicOutput.storytellingScores) {
    const { narrativeCoherence, emotionalResonance, symbolismDepth } = logicOutput.storytellingScores;
    
    // Narrative particles
    drawParticles(ctx, narrativeCoherence, emotionalTone?.colorPalette[0] || '#6366f1', 0);
    
    // Emotional particles
    drawParticles(ctx, emotionalResonance, emotionalTone?.colorPalette[1] || '#8b5cf6', 1);
    
    // Symbolism particles
    drawParticles(ctx, symbolismDepth, emotionalTone?.colorPalette[2] || '#a855f7', 2);
  }

  // Add seasonal botanical elements
  if (seasonalContext) {
    drawBotanicalElements(ctx, seasonalContext, emotionalTone);
  }
}

function drawParticles(
  ctx: CanvasRenderingContext2D,
  intensity: number,
  color: string,
  layer: number
) {
  const particleCount = Math.floor(intensity * 20);
  const width = ctx.canvas.width;
  const height = ctx.canvas.height;
  
  ctx.fillStyle = color + '60';
  
  for (let i = 0; i < particleCount; i++) {
    const x = Math.random() * width;
    const y = (height / 3) * layer + Math.random() * (height / 3);
    const size = Math.random() * 4 + 2;
    
    ctx.beginPath();
    ctx.arc(x, y, size, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawBotanicalElements(
  ctx: CanvasRenderingContext2D,
  seasonalContext: SeasonalContext,
  emotionalTone?: EmotionalTone
) {
  const width = ctx.canvas.width;
  const height = ctx.canvas.height;
  
  // Draw seasonal botanical hints
  switch (seasonalContext.season) {
    case 'spring':
      drawSpringElements(ctx, width, height, emotionalTone);
      break;
    case 'summer':
      drawSummerElements(ctx, width, height, emotionalTone);
      break;
    case 'fall':
      drawFallElements(ctx, width, height, emotionalTone);
      break;
    case 'winter':
      drawWinterElements(ctx, width, height, emotionalTone);
      break;
  }
}

function drawSpringElements(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  emotionalTone?: EmotionalTone
) {
  // Draw delicate buds
  ctx.fillStyle = '#bbf7d0';
  for (let i = 0; i < 8; i++) {
    const x = Math.random() * width;
    const y = Math.random() * height;
    ctx.beginPath();
    ctx.arc(x, y, 2, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawSummerElements(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  emotionalTone?: EmotionalTone
) {
  // Draw full blooms
  ctx.strokeStyle = '#fbbf24';
  ctx.lineWidth = 1;
  for (let i = 0; i < 5; i++) {
    const x = Math.random() * width;
    const y = Math.random() * height;
    drawSimpleFlower(ctx, x, y, 8);
  }
}

function drawFallElements(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  emotionalTone?: EmotionalTone
) {
  // Draw falling leaves
  ctx.fillStyle = '#fb923c';
  for (let i = 0; i < 6; i++) {
    const x = Math.random() * width;
    const y = Math.random() * height;
    drawLeaf(ctx, x, y);
  }
}

function drawWinterElements(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  emotionalTone?: EmotionalTone
) {
  // Draw crystalline structures
  ctx.strokeStyle = '#cbd5e1';
  ctx.lineWidth = 1;
  for (let i = 0; i < 4; i++) {
    const x = Math.random() * width;
    const y = Math.random() * height;
    drawCrystal(ctx, x, y);
  }
}

function drawSimpleFlower(ctx: CanvasRenderingContext2D, x: number, y: number, size: number) {
  ctx.beginPath();
  for (let i = 0; i < 6; i++) {
    const angle = (i / 6) * Math.PI * 2;
    const petalX = x + Math.cos(angle) * size;
    const petalY = y + Math.sin(angle) * size;
    ctx.moveTo(x, y);
    ctx.lineTo(petalX, petalY);
  }
  ctx.stroke();
}

function drawLeaf(ctx: CanvasRenderingContext2D, x: number, y: number) {
  ctx.beginPath();
  ctx.ellipse(x, y, 4, 8, Math.PI / 4, 0, Math.PI * 2);
  ctx.fill();
}

function drawCrystal(ctx: CanvasRenderingContext2D, x: number, y: number) {
  ctx.beginPath();
  ctx.moveTo(x, y - 6);
  ctx.lineTo(x + 3, y);
  ctx.lineTo(x, y + 6);
  ctx.lineTo(x - 3, y);
  ctx.closePath();
  ctx.stroke();
}

function getSeasonalColors(season: string): string[] {
  const colors: { [key: string]: string[] } = {
    spring: ['#bbf7d0', '#dcfce7'],
    summer: ['#fef3c7', '#fde68a'],
    fall: ['#fed7aa', '#fdba74'],
    winter: ['#e0e7ff', '#c7d2fe']
  };
  return colors[season] || colors.spring;
}