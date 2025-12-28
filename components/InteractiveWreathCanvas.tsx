// components/InteractiveWreathCanvas.tsx
import React, { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import type { WreathBlueprint, WreathElement, InventoryItem } from '../types';
import { getEffectiveRotation, calculateAutoRotation, getEffectiveRotationProperties } from '../lib/rotationUtils';

interface InteractiveWreathCanvasProps {
  blueprint: WreathBlueprint;
  setBlueprint: (blueprint: WreathBlueprint) => void;
  inventory: InventoryItem[];
  isReadOnly?: boolean;
  selectedElementId?: string | null;
  selectedElementIds?: Set<string>;
  setSelectedElementId?: (id: string | null) => void;
  setSelectedElementIds?: (ids: Set<string>) => void;
  hiddenLayers?: Set<string>;
  lockedLayers?: Set<string>;
  zoom?: number;
  pan?: { x: number; y: number };
  showGrid?: boolean;
  snapToGrid?: boolean;
  previewMode?: boolean;
  onPanChange?: (pan: { x: number; y: number }) => void;
  canvasRef?: React.RefObject<SVGSVGElement | null>;
}

export const InteractiveWreathCanvas: React.FC<InteractiveWreathCanvasProps> = ({
  blueprint,
  setBlueprint,
  inventory,
  isReadOnly = false,
  selectedElementId,
  selectedElementIds = new Set(),
  setSelectedElementId,
  setSelectedElementIds,
  hiddenLayers = new Set(),
  lockedLayers = new Set(),
  zoom = 1,
  pan = { x: 0, y: 0 },
  showGrid = false,
  snapToGrid = false,
  previewMode = false,
  onPanChange,
  canvasRef: externalCanvasRef
}) => {
  const viewBoxSize = 1000;
  const center = viewBoxSize / 2;
  const outerRadius = center;
  const innerRadius = center * 0.3;

  const internalCanvasRef = useRef<SVGSVGElement>(null);
  const canvasRef = externalCanvasRef || internalCanvasRef;
  const containerRef = useRef<HTMLDivElement>(null);

  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragElementId, setDragElementId] = useState<string | null>(null);

  const getElementImageUrl = (inventoryId: string) => {
    const item = inventory.find(item => item.id === inventoryId);
    return item?.processedImageUrl || item?.imageUrl;
  };

  const snapAngle = (angle: number): number => {
    if (!snapToGrid) return angle;
    const snapInterval = 15;
    return Math.round(angle / snapInterval) * snapInterval;
  };

  const snapRadius = (radius: number): number => {
    if (!snapToGrid) return radius;
    const snapInterval = 0.1;
    return Math.round(radius / snapInterval) * snapInterval;
  };

  const handleElementClick = (e: React.MouseEvent, elementId: string) => {
    e.stopPropagation();
    if (isReadOnly || previewMode) return;
    if (lockedLayers.has(elementId)) return;

    if (e.shiftKey && setSelectedElementIds) {
      const newSelection = new Set(selectedElementIds);
      if (newSelection.has(elementId)) {
        newSelection.delete(elementId);
      } else {
        newSelection.add(elementId);
      }
      setSelectedElementIds(newSelection);
      if (setSelectedElementId) {
        setSelectedElementId(newSelection.size === 1 ? Array.from(newSelection)[0] : null);
      }
    } else if (setSelectedElementId) {
      setSelectedElementId(elementId === selectedElementId ? null : elementId);
      if (setSelectedElementIds) {
        setSelectedElementIds(elementId === selectedElementId ? new Set() : new Set([elementId]));
      }
    }
  };

  const handleCanvasClick = (e: React.MouseEvent) => {
    if (isReadOnly || previewMode) return;
    if (setSelectedElementId) {
      setSelectedElementId(null);
    }
    if (setSelectedElementIds) {
      setSelectedElementIds(new Set());
    }
  };

  const handleMouseDown = (e: React.MouseEvent, elementId?: string) => {
    if (isReadOnly || previewMode) return;

    if (elementId && !lockedLayers.has(elementId)) {
      const element = blueprint.elements.find(el => el.id === elementId);
      if (element?.isBase) return;
      setIsDragging(true);
      setDragElementId(elementId);
    } else if (e.button === 1 || (e.button === 0 && e.altKey)) {
      setIsPanning(true);
      setPanStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
    }
  };

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (isPanning && onPanChange) {
      onPanChange({
        x: e.clientX - panStart.x,
        y: e.clientY - panStart.y
      });
    } else if (isDragging && dragElementId && containerRef.current && canvasRef.current) {
      const draggedElement = blueprint.elements.find(el => el.id === dragElementId);
      if (draggedElement?.isBase) return;

      const rect = containerRef.current.getBoundingClientRect();
      const svgRect = canvasRef.current.getBoundingClientRect();

      const scaleX = viewBoxSize / svgRect.width;
      const scaleY = viewBoxSize / svgRect.height;

      const mouseX = (e.clientX - svgRect.left) * scaleX;
      const mouseY = (e.clientY - svgRect.top) * scaleY;

      const dx = mouseX - center;
      const dy = mouseY - center;

      let angle = Math.atan2(dy, dx) * (180 / Math.PI) + 90;
      if (angle < 0) angle += 360;

      const distance = Math.sqrt(dx * dx + dy * dy);
      let radius = Math.max(0, Math.min(1, (distance - innerRadius) / (outerRadius - innerRadius)));

      angle = snapAngle(angle);
      radius = snapRadius(radius);

      const newElements = blueprint.elements.map(el =>
        el.id === dragElementId
          ? { ...el, position: { angle, radius } }
          : el
      );
      setBlueprint({ ...blueprint, elements: newElements });
    }
  }, [isPanning, isDragging, dragElementId, panStart, pan, onPanChange, blueprint, setBlueprint, snapToGrid]);

  const handleMouseUp = useCallback(() => {
    // When drag ends, recalculate auto-rotation for the new position
    if (isDragging && dragElementId) {
      const element = blueprint.elements.find(el => el.id === dragElementId);
      if (element && !element.isBase) {
        const inventoryItem = inventory.find(i => i.id === element.inventoryId);
        const rotationProps = getEffectiveRotationProperties(inventoryItem);

        // Calculate new auto-rotation based on the element's new position
        const newAutoRotation = calculateAutoRotation(
          element.position.angle || 0,
          rotationProps.naturalDroop,
          rotationProps
        );

        // Update element with new auto-rotation (only if in auto mode)
        if (element.rotationMode !== 'manual') {
          const newElements = blueprint.elements.map(el =>
            el.id === dragElementId
              ? { ...el, autoRotation: newAutoRotation, rotation: newAutoRotation }
              : el
          );
          setBlueprint({ ...blueprint, elements: newElements });
        }
      }
    }

    setIsPanning(false);
    setIsDragging(false);
    setDragElementId(null);
  }, [isDragging, dragElementId, blueprint, inventory, setBlueprint]);

  useEffect(() => {
    window.addEventListener('mouseup', handleMouseUp);
    return () => window.removeEventListener('mouseup', handleMouseUp);
  }, [handleMouseUp]);

  const renderGrid = () => {
    if (!showGrid || previewMode) return null;

    const gridLines = [];

    for (let i = 0; i < 12; i++) {
      const angle = i * 30;
      const rad = (angle - 90) * (Math.PI / 180);
      const x2 = center + outerRadius * Math.cos(rad);
      const y2 = center + outerRadius * Math.sin(rad);
      gridLines.push(
        <line
          key={`angle-${i}`}
          x1={center}
          y1={center}
          x2={x2}
          y2={y2}
          stroke="rgba(156, 163, 175, 0.3)"
          strokeWidth="1"
          strokeDasharray="5,5"
        />
      );
    }

    for (let i = 1; i <= 10; i++) {
      const r = innerRadius + (outerRadius - innerRadius) * (i / 10);
      gridLines.push(
        <circle
          key={`radius-${i}`}
          cx={center}
          cy={center}
          r={r}
          fill="none"
          stroke="rgba(156, 163, 175, 0.2)"
          strokeWidth="1"
          strokeDasharray={i === 5 ? "none" : "3,3"}
        />
      );
    }

    return <g className="pointer-events-none">{gridLines}</g>;
  };

  const renderSizeIndicator = () => {
    if (previewMode) return null;

    const indicatorWidth = (6 / blueprint.diameterInInches) * viewBoxSize;

    return (
      <g transform={`translate(${viewBoxSize - 120}, ${viewBoxSize - 40})`}>
        <line x1="0" y1="0" x2={indicatorWidth} y2="0" stroke="#374151" strokeWidth="2" />
        <line x1="0" y1="-5" x2="0" y2="5" stroke="#374151" strokeWidth="2" />
        <line x1={indicatorWidth} y1="-5" x2={indicatorWidth} y2="5" stroke="#374151" strokeWidth="2" />
        <text x={indicatorWidth / 2} y="20" textAnchor="middle" fontSize="14" fill="#374151">6"</text>
      </g>
    );
  };

  const visibleElements = blueprint.elements.filter(el => !hiddenLayers.has(el.id));

  return (
    <div
      ref={containerRef}
      className="w-full h-full bg-transparent overflow-hidden"
      onClick={handleCanvasClick}
      onMouseMove={handleMouseMove}
      style={{ cursor: isPanning ? 'grabbing' : (isDragging ? 'move' : 'default') }}
    >
      <svg
        ref={canvasRef as React.RefObject<SVGSVGElement>}
        viewBox={`0 0 ${viewBoxSize} ${viewBoxSize}`}
        width="100%"
        height="100%"
        style={{
          transform: `scale(${zoom}) translate(${pan.x / zoom}px, ${pan.y / zoom}px)`,
          transformOrigin: 'center center'
        }}
      >
        {blueprint.wreathBaseImageUrl && (
          <image href={blueprint.wreathBaseImageUrl} x="0" y="0" width={viewBoxSize} height={viewBoxSize} />
        )}

        {renderGrid()}

        {[...visibleElements]
          .sort((a, b) => a.layer - b.layer)
          .map((element) => {
            const inventoryItem = inventory.find(i => i.id === element.inventoryId);
            const sizeInInches = inventoryItem?.dimensions
              ? { width: inventoryItem.dimensions.widthInches, height: inventoryItem.dimensions.heightInches }
              : element.realWorldSizeInInches;

            const elementWidth = (sizeInInches.width / blueprint.diameterInInches) * viewBoxSize;
            const elementHeight = (sizeInInches.height / blueprint.diameterInInches) * viewBoxSize;

            let x: number, y: number;

            if (element.isBase) {
              x = center;
              y = center;
            } else {
              const { angle = 0, radius: rPercent = 0.5 } = element.position;
              const r = innerRadius + (outerRadius - innerRadius) * rPercent;
              const rad = (angle - 90) * (Math.PI / 180);
              x = center + r * Math.cos(rad);
              y = center + r * Math.sin(rad);
            }

            const imageX = -elementWidth * element.tuckPoint.x;
            const imageY = -elementHeight * element.tuckPoint.y;

            const imageUrl = getElementImageUrl(element.inventoryId);
            const isSelected = element.id === selectedElementId || selectedElementIds.has(element.id);
            const isLocked = lockedLayers.has(element.id) || element.isBase;

            // Calculate effective rotation based on position, mode, and constraints
            const effectiveRotation = element.isBase ? 0 : getEffectiveRotation(element, inventoryItem);

            return (
              <g
                key={element.id}
                transform={`translate(${x}, ${y}) rotate(${effectiveRotation})`}
                onClick={(e) => handleElementClick(e, element.id)}
                onMouseDown={(e) => !element.isBase && handleMouseDown(e, element.id)}
                style={{
                  cursor: isReadOnly || previewMode || isLocked || element.isBase ? 'default' : 'move',
                  transition: isDragging && dragElementId === element.id ? 'none' : 'transform 0.1s',
                  opacity: isLocked && !element.isBase ? 0.7 : 1
                }}
              >
                {imageUrl ? (
                  <image
                    href={imageUrl}
                    x={imageX}
                    y={imageY}
                    width={elementWidth}
                    height={elementHeight}
                  />
                ) : (
                  <rect
                    x={imageX}
                    y={imageY}
                    width={elementWidth}
                    height={elementHeight}
                    fill="rgba(110, 231, 183, 0.5)"
                  />
                )}
                {isSelected && !isReadOnly && !previewMode && (
                  <rect
                    x={imageX}
                    y={imageY}
                    width={elementWidth}
                    height={elementHeight}
                    fill="none"
                    stroke="rgb(59 130 246 / 0.8)"
                    strokeWidth="15"
                  />
                )}
                {isSelected && !isReadOnly && !previewMode && (
                  <g stroke="rgb(239 68 68 / 0.9)" strokeWidth="10" fill="none" pointerEvents="none">
                    <circle cx="0" cy="0" r="15" />
                    <line x1="-25" y1="0" x2="25" y2="0" />
                    <line x1="0" y1="-25" x2="0" y2="25" />
                  </g>
                )}
              </g>
            );
          })}

        {renderSizeIndicator()}
      </svg>
    </div>
  );
};
