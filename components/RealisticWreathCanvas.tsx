import React, { useRef, useState, useEffect, useCallback, useMemo } from 'react';
import { Stage, Layer, Image as KonvaImage, Circle, Group, Text, Rect, Line } from 'react-konva';
import Konva from 'konva';
import type { WreathBlueprint, WreathElement, InventoryItem } from '../types';

type BackgroundType = 'white' | 'door' | 'hanger' | 'wall' | 'transparent';
type ExportSize = 'web' | 'print' | 'social-square' | 'social-story';
type ViewMode = 'realistic' | 'schematic' | 'heatmap';

interface RealisticWreathCanvasProps {
  blueprint: WreathBlueprint;
  inventory: InventoryItem[];
  onBlueprintChange?: (blueprint: WreathBlueprint) => void;
  onElementSwap?: (elementId: string, newInventoryId: string) => void;
  isInteractive?: boolean;
  showShadows?: boolean;
  showAmbientOcclusion?: boolean;
  showLighting?: boolean;
  background?: BackgroundType;
  enableAnimation?: boolean;
  watermarkText?: string;
}

interface LoadedImage {
  id: string;
  image: HTMLImageElement;
}

const EXPORT_SIZES: Record<ExportSize, { width: number; height: number; label: string }> = {
  'web': { width: 1200, height: 1200, label: 'Web (1200px)' },
  'print': { width: 3000, height: 3000, label: 'Print (3000px)' },
  'social-square': { width: 1080, height: 1080, label: 'Social Square' },
  'social-story': { width: 1080, height: 1920, label: 'Social Story' }
};

const BACKGROUNDS: Record<BackgroundType, { color: string; label: string; pattern?: string }> = {
  'white': { color: '#FFFFFF', label: 'White Seamless' },
  'door': { color: '#5D4037', label: 'Rustic Door' },
  'hanger': { color: '#E8E8E8', label: 'Wreath Hanger' },
  'wall': { color: '#D7CCC8', label: 'Textured Wall' },
  'transparent': { color: 'transparent', label: 'Transparent' }
};

const polarToCartesian = (
  angle: number,
  radius: number,
  center: number,
  innerRadius: number,
  outerRadius: number
): { x: number; y: number } => {
  const r = innerRadius + (outerRadius - innerRadius) * radius;
  const rad = (angle - 90) * (Math.PI / 180);
  return {
    x: center + r * Math.cos(rad),
    y: center + r * Math.sin(rad)
  };
};

const getDepthShadow = (layer: number): { blur: number; offset: number; opacity: number } => {
  const baseBlur = 8 + (layer - 1) * 4;
  const baseOffset = 3 + (layer - 1) * 2;
  const opacity = 0.15 + (layer - 1) * 0.05;
  return { blur: baseBlur, offset: baseOffset, opacity: Math.min(opacity, 0.35) };
};

const getAmbientOcclusionColor = (layer: number): string => {
  const darkness = Math.min(0.1 + (5 - layer) * 0.02, 0.2);
  return `rgba(0, 0, 0, ${darkness})`;
};

const analyzeColorBalance = (inventory: InventoryItem[], elements: WreathElement[]): Map<string, number> => {
  const colorMap = new Map<string, number>();
  
  elements.forEach(el => {
    const item = inventory.find(i => i.id === el.inventoryId);
    if (item?.dominantColors) {
      item.dominantColors.forEach(color => {
        const hsl = hexToHSL(color);
        const category = hsl.h < 60 || hsl.h > 300 ? 'warm' : 'cool';
        colorMap.set(category, (colorMap.get(category) || 0) + 1);
      });
    }
  });
  
  return colorMap;
};

const hexToHSL = (hex: string): { h: number; s: number; l: number } => {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) return { h: 0, s: 0, l: 0 };
  
  let r = parseInt(result[1], 16) / 255;
  let g = parseInt(result[2], 16) / 255;
  let b = parseInt(result[3], 16) / 255;
  
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h = 0, s = 0, l = (max + min) / 2;
  
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
      case g: h = ((b - r) / d + 2) / 6; break;
      case b: h = ((r - g) / d + 4) / 6; break;
    }
  }
  
  return { h: h * 360, s: s * 100, l: l * 100 };
};

const detectGaps = (
  elements: WreathElement[],
  canvasSize: number,
  innerRadius: number,
  outerRadius: number
): Array<{ x: number; y: number; angle: number }> => {
  const gaps: Array<{ x: number; y: number; angle: number }> = [];
  const center = canvasSize / 2;
  const coverageMap = new Array(36).fill(false);
  
  elements.forEach(el => {
    const sectorIndex = Math.floor(el.position.angle / 10) % 36;
    coverageMap[sectorIndex] = true;
    if (sectorIndex > 0) coverageMap[sectorIndex - 1] = true;
    if (sectorIndex < 35) coverageMap[sectorIndex + 1] = true;
  });
  
  coverageMap.forEach((covered, i) => {
    if (!covered) {
      const angle = i * 10 + 5;
      const pos = polarToCartesian(angle, 0.5, center, innerRadius, outerRadius);
      gaps.push({ x: pos.x, y: pos.y, angle });
    }
  });
  
  return gaps;
};

export const RealisticWreathCanvas: React.FC<RealisticWreathCanvasProps> = ({
  blueprint,
  inventory,
  onBlueprintChange,
  onElementSwap,
  isInteractive = true,
  showShadows: initialShowShadows = true,
  showAmbientOcclusion: initialShowAO = true,
  showLighting: initialShowLighting = true,
  background = 'white',
  enableAnimation: initialEnableAnimation = false,
  watermarkText
}) => {
  const stageRef = useRef<Konva.Stage>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  
  const [canvasSize, setCanvasSize] = useState(800);
  const [loadedImages, setLoadedImages] = useState<Map<string, HTMLImageElement>>(new Map());
  const [selectedElementId, setSelectedElementId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('realistic');
  const [currentBackground, setCurrentBackground] = useState<BackgroundType>(background);
  const [shadowsEnabled, setShadowsEnabled] = useState(initialShowShadows);
  const [aoEnabled, setAoEnabled] = useState(initialShowAO);
  const [lightingEnabled, setLightingEnabled] = useState(initialShowLighting);
  const [animationEnabled, setAnimationEnabled] = useState(initialEnableAnimation);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [showGapDetection, setShowGapDetection] = useState(false);
  const [showColorBalance, setShowColorBalance] = useState(false);
  const [rotationAngle, setRotationAngle] = useState(0);
  const [showSwapPanel, setShowSwapPanel] = useState(false);
  const [swapTargetElement, setSwapTargetElement] = useState<string | null>(null);
  
  const center = canvasSize / 2;
  const outerRadius = center * 0.95;
  const innerRadius = center * 0.3;
  
  useEffect(() => {
    const updateSize = () => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        const size = Math.min(rect.width, rect.height, 800);
        setCanvasSize(size);
      }
    };
    
    updateSize();
    window.addEventListener('resize', updateSize);
    return () => window.removeEventListener('resize', updateSize);
  }, []);
  
  useEffect(() => {
    const loadImages = async () => {
      const newImages = new Map<string, HTMLImageElement>();
      
      for (const element of blueprint.elements) {
        const item = inventory.find(i => i.id === element.inventoryId);
        const imageUrl = item?.processedImageUrl || item?.imageUrl;
        
        if (imageUrl && !loadedImages.has(element.inventoryId)) {
          try {
            const img = new window.Image();
            img.crossOrigin = 'anonymous';
            await new Promise<void>((resolve, reject) => {
              img.onload = () => resolve();
              img.onerror = reject;
              img.src = imageUrl;
            });
            newImages.set(element.inventoryId, img);
          } catch (e) {
            console.warn(`Failed to load image for ${element.inventoryId}`);
          }
        }
      }
      
      if (newImages.size > 0) {
        setLoadedImages(prev => new Map([...prev, ...newImages]));
      }
    };
    
    loadImages();
  }, [blueprint.elements, inventory]);
  
  useEffect(() => {
    if (!animationEnabled) return;
    
    const interval = setInterval(() => {
      setRotationAngle(prev => (prev + 0.1) % 360);
    }, 50);
    
    return () => clearInterval(interval);
  }, [animationEnabled]);
  
  const sortedElements = useMemo(() => 
    [...blueprint.elements].sort((a, b) => a.layer - b.layer),
    [blueprint.elements]
  );
  
  const gaps = useMemo(() => 
    showGapDetection ? detectGaps(blueprint.elements, canvasSize, innerRadius, outerRadius) : [],
    [showGapDetection, blueprint.elements, canvasSize, innerRadius, outerRadius]
  );
  
  const colorBalance = useMemo(() =>
    showColorBalance ? analyzeColorBalance(inventory, blueprint.elements) : new Map(),
    [showColorBalance, inventory, blueprint.elements]
  );
  
  const handleElementDragEnd = useCallback((elementId: string, newX: number, newY: number) => {
    if (!isInteractive || !onBlueprintChange) return;
    
    const element = blueprint.elements.find(el => el.id === elementId);
    if (element?.isBase) return;
    
    const dx = newX - center;
    const dy = newY - center;
    let angle = Math.atan2(dy, dx) * (180 / Math.PI) + 90;
    if (angle < 0) angle += 360;
    
    const distance = Math.sqrt(dx * dx + dy * dy);
    const radius = Math.max(0, Math.min(1, (distance - innerRadius) / (outerRadius - innerRadius)));
    
    const updatedElements = blueprint.elements.map(el =>
      el.id === elementId
        ? { ...el, position: { angle, radius } }
        : el
    );
    
    onBlueprintChange({ ...blueprint, elements: updatedElements });
  }, [blueprint, center, innerRadius, outerRadius, isInteractive, onBlueprintChange]);
  
  const handleElementClick = useCallback((elementId: string) => {
    if (!isInteractive) return;
    setSelectedElementId(prev => prev === elementId ? null : elementId);
  }, [isInteractive]);
  
  const handleElementDoubleClick = useCallback((elementId: string) => {
    if (!isInteractive) return;
    setSwapTargetElement(elementId);
    setShowSwapPanel(true);
  }, [isInteractive]);
  
  const handleSwapElement = useCallback((newInventoryId: string) => {
    if (swapTargetElement && onElementSwap) {
      onElementSwap(swapTargetElement, newInventoryId);
    }
    setShowSwapPanel(false);
    setSwapTargetElement(null);
  }, [swapTargetElement, onElementSwap]);
  
  const handleWheel = useCallback((e: Konva.KonvaEventObject<WheelEvent>) => {
    e.evt.preventDefault();
    const stage = stageRef.current;
    if (!stage) return;
    
    const scaleBy = 1.05;
    const oldZoom = zoom;
    const newZoom = e.evt.deltaY < 0 
      ? Math.min(3, oldZoom * scaleBy) 
      : Math.max(0.5, oldZoom / scaleBy);
    
    const pointer = stage.getPointerPosition();
    if (pointer) {
      const mousePointTo = {
        x: (pointer.x - pan.x) / oldZoom,
        y: (pointer.y - pan.y) / oldZoom,
      };
      const newPan = {
        x: pointer.x - mousePointTo.x * newZoom,
        y: pointer.y - mousePointTo.y * newZoom,
      };
      setPan(newPan);
    }
    
    setZoom(newZoom);
  }, [zoom, pan]);
  
  const exportCanvas = useCallback(async (size: ExportSize) => {
    if (!stageRef.current) return;
    
    const { width, height } = EXPORT_SIZES[size];
    const scale = Math.max(width, height) / canvasSize;
    
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    const stageDataUrl = stageRef.current.toDataURL({
      pixelRatio: scale,
      mimeType: 'image/png'
    });
    
    const img = new window.Image();
    img.onload = () => {
      ctx.fillStyle = BACKGROUNDS[currentBackground]?.color || '#FFFFFF';
      ctx.fillRect(0, 0, width, height);
      
      const srcSize = canvasSize * scale;
      const destSize = Math.min(width, height);
      const offsetX = (width - destSize) / 2;
      const offsetY = (height - destSize) / 2;
      
      ctx.drawImage(img, 0, 0, srcSize, srcSize, offsetX, offsetY, destSize, destSize);
      
      if (watermarkText) {
        ctx.font = `${Math.round(Math.min(width, height) * 0.02)}px Inter, sans-serif`;
        ctx.fillStyle = 'rgba(0, 0, 0, 0.25)';
        ctx.textAlign = 'center';
        ctx.fillText(watermarkText, width / 2, height - Math.round(height * 0.03));
      }
      
      const link = document.createElement('a');
      link.download = `wreath-${blueprint.name?.replace(/\s+/g, '-') || 'design'}-${size}.png`;
      link.href = canvas.toDataURL('image/png');
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    };
    img.src = stageDataUrl;
  }, [canvasSize, blueprint.name, watermarkText, currentBackground]);
  
  const renderBackground = () => {
    const bg = BACKGROUNDS[currentBackground];
    if (currentBackground === 'transparent') return null;
    
    if (currentBackground === 'door') {
      return (
        <Group>
          <Rect x={0} y={0} width={canvasSize} height={canvasSize} fill="#5D4037" />
          {Array.from({ length: 8 }).map((_, i) => (
            <Rect
              key={i}
              x={0}
              y={i * (canvasSize / 8)}
              width={canvasSize}
              height={canvasSize / 8}
              fill={i % 2 === 0 ? '#6D4C41' : '#5D4037'}
              opacity={0.3}
            />
          ))}
        </Group>
      );
    }
    
    if (currentBackground === 'wall') {
      const texturePoints: Array<{x: number; y: number; r: number}> = [];
      for (let i = 0; i < 20; i++) {
        texturePoints.push({
          x: ((i * 137) % canvasSize),
          y: ((i * 97 + 50) % canvasSize),
          r: 2 + (i % 3)
        });
      }
      return (
        <Group>
          <Rect x={0} y={0} width={canvasSize} height={canvasSize} fill="#D7CCC8" />
          {texturePoints.map((pt, i) => (
            <Circle
              key={i}
              x={pt.x}
              y={pt.y}
              radius={pt.r}
              fill="#BCAAA4"
              opacity={0.3}
            />
          ))}
        </Group>
      );
    }
    
    if (currentBackground === 'hanger') {
      return (
        <Group>
          <Rect x={0} y={0} width={canvasSize} height={canvasSize} fill="#E8E8E8" />
          <Circle
            x={center}
            y={center * 0.15}
            radius={15}
            fill="#8B7355"
          />
          <Line
            points={[center, center * 0.15, center, center * 0.35]}
            stroke="#8B7355"
            strokeWidth={4}
          />
        </Group>
      );
    }
    
    return <Rect x={0} y={0} width={canvasSize} height={canvasSize} fill={bg.color} />;
  };
  
  const renderElement = (element: WreathElement) => {
    const item = inventory.find(i => i.id === element.inventoryId);
    const image = loadedImages.get(element.inventoryId);
    
    if (!image) return null;
    
    const sizeInInches = item?.dimensions
      ? { width: item.dimensions.widthInches, height: item.dimensions.heightInches }
      : element.realWorldSizeInInches;
    
    const elementWidth = (sizeInInches.width / blueprint.diameterInInches) * canvasSize;
    const elementHeight = (sizeInInches.height / blueprint.diameterInInches) * canvasSize;
    
    let pos: { x: number; y: number };
    if (element.isBase) {
      pos = { x: center, y: center };
    } else {
      pos = polarToCartesian(
        (element.position.angle ?? 0) + (animationEnabled ? rotationAngle : 0),
        element.position.radius ?? 0.5,
        center,
        innerRadius,
        outerRadius
      );
    }
    
    const shadow = shadowsEnabled ? getDepthShadow(element.layer) : null;
    const isSelected = element.id === selectedElementId;
    const isBaseElement = element.isBase ?? false;
    
    return (
      <Group
        key={element.id}
        x={pos.x}
        y={pos.y}
        rotation={element.rotation}
        draggable={isInteractive && !isBaseElement}
        onClick={() => handleElementClick(element.id)}
        onDblClick={() => handleElementDoubleClick(element.id)}
        onDragStart={() => !isBaseElement && setIsDragging(true)}
        onDragEnd={(e) => {
          if (isBaseElement) return;
          setIsDragging(false);
          handleElementDragEnd(element.id, e.target.x(), e.target.y());
        }}
      >
        {aoEnabled && element.layer < 3 && (
          <Circle
            x={0}
            y={elementHeight * 0.1}
            radius={Math.min(elementWidth, elementHeight) * 0.4}
            fill={getAmbientOcclusionColor(element.layer)}
            filters={[Konva.Filters.Blur]}
            blurRadius={15}
          />
        )}
        
        <KonvaImage
          image={image}
          x={-elementWidth * element.tuckPoint.x}
          y={-elementHeight * element.tuckPoint.y}
          width={elementWidth}
          height={elementHeight}
          shadowColor={shadow ? 'rgba(0,0,0,0.3)' : undefined}
          shadowBlur={shadow?.blur}
          shadowOffsetX={shadow?.offset}
          shadowOffsetY={shadow?.offset}
          shadowOpacity={shadow?.opacity}
        />
        
        {lightingEnabled && (
          <Rect
            x={-elementWidth * element.tuckPoint.x}
            y={-elementHeight * element.tuckPoint.y}
            width={elementWidth}
            height={elementHeight * 0.3}
            fillLinearGradientStartPoint={{ x: 0, y: 0 }}
            fillLinearGradientEndPoint={{ x: 0, y: elementHeight * 0.3 }}
            fillLinearGradientColorStops={[0, 'rgba(255,255,255,0.1)', 1, 'rgba(255,255,255,0)']}
            listening={false}
          />
        )}
        
        {isSelected && isInteractive && (
          <Rect
            x={-elementWidth * element.tuckPoint.x - 3}
            y={-elementHeight * element.tuckPoint.y - 3}
            width={elementWidth + 6}
            height={elementHeight + 6}
            stroke="#1E3A5F"
            strokeWidth={2}
            dash={[5, 3]}
            listening={false}
          />
        )}
      </Group>
    );
  };
  
  const renderGapIndicators = () => {
    if (!showGapDetection || gaps.length === 0) return null;
    
    return (
      <Group>
        {gaps.map((gap, i) => (
          <Group key={i} x={gap.x} y={gap.y}>
            <Circle radius={20} fill="rgba(220, 38, 38, 0.2)" />
            <Circle radius={15} stroke="#DC2626" strokeWidth={2} dash={[4, 2]} />
            <Text
              text="+"
              x={-6}
              y={-8}
              fontSize={20}
              fill="#DC2626"
              fontStyle="bold"
            />
          </Group>
        ))}
      </Group>
    );
  };
  
  const renderColorBalanceOverlay = () => {
    if (colorBalance.size === 0 && !showColorBalance && viewMode !== 'heatmap') return null;
    
    const warm = colorBalance.get('warm') || 0;
    const cool = colorBalance.get('cool') || 0;
    const total = warm + cool;
    
    if (total === 0) return null;
    
    const warmPercent = Math.round((warm / total) * 100);
    const coolPercent = 100 - warmPercent;
    
    return (
      <Group x={10} y={canvasSize - 60}>
        <Rect x={0} y={0} width={200} height={50} fill="rgba(255,255,255,0.9)" cornerRadius={8} />
        <Text text="Color Balance" x={10} y={8} fontSize={12} fill="#374151" />
        <Rect x={10} y={28} width={180 * (warmPercent / 100)} height={12} fill="#F59E0B" cornerRadius={2} />
        <Rect x={10 + 180 * (warmPercent / 100)} y={28} width={180 * (coolPercent / 100)} height={12} fill="#3B82F6" cornerRadius={2} />
        <Text text={`Warm: ${warmPercent}%`} x={10} y={42} fontSize={10} fill="#92400E" />
        <Text text={`Cool: ${coolPercent}%`} x={120} y={42} fontSize={10} fill="#1E40AF" />
      </Group>
    );
  };
  
  const renderWatermark = () => {
    if (!watermarkText) return null;
    
    return (
      <Text
        text={watermarkText}
        x={canvasSize / 2}
        y={canvasSize - 30}
        fontSize={14}
        fill="rgba(0,0,0,0.3)"
        align="center"
        offsetX={50}
      />
    );
  };
  
  const renderHeatmapElement = (element: WreathElement) => {
    const item = inventory.find(i => i.id === element.inventoryId);
    
    const sizeInInches = item?.dimensions
      ? { width: item.dimensions.widthInches, height: item.dimensions.heightInches }
      : element.realWorldSizeInInches;
    
    const elementWidth = (sizeInInches.width / blueprint.diameterInInches) * canvasSize;
    const elementHeight = (sizeInInches.height / blueprint.diameterInInches) * canvasSize;
    
    const pos = polarToCartesian(
      element.position.angle,
      element.position.radius,
      center,
      innerRadius,
      outerRadius
    );
    
    const dominantColor = item?.dominantColors?.[0] || '#808080';
    const hsl = hexToHSL(dominantColor);
    const isWarm = hsl.h < 60 || hsl.h > 300;
    const heatColor = isWarm ? '#F59E0B' : '#3B82F6';
    
    return (
      <Group
        key={element.id}
        x={pos.x}
        y={pos.y}
        rotation={element.rotation}
      >
        <Circle
          radius={Math.min(elementWidth, elementHeight) * 0.4}
          fill={heatColor}
          opacity={0.6}
        />
        <Text
          text={isWarm ? 'W' : 'C'}
          x={-8}
          y={-8}
          fontSize={16}
          fill="white"
          fontStyle="bold"
        />
      </Group>
    );
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap gap-2 items-center justify-between bg-gray-50 p-3 rounded-lg">
        <div className="flex gap-2">
          <button
            onClick={() => setViewMode('realistic')}
            className={`px-3 py-1.5 text-sm rounded ${viewMode === 'realistic' ? 'bg-[#1E3A5F] text-white' : 'bg-gray-200 text-black'}`}
          >
            Realistic
          </button>
          <button
            onClick={() => setViewMode('schematic')}
            className={`px-3 py-1.5 text-sm rounded ${viewMode === 'schematic' ? 'bg-[#1E3A5F] text-white' : 'bg-gray-200 text-black'}`}
          >
            Schematic
          </button>
          <button
            onClick={() => setViewMode('heatmap')}
            className={`px-3 py-1.5 text-sm rounded ${viewMode === 'heatmap' ? 'bg-[#1E3A5F] text-white' : 'bg-gray-200 text-black'}`}
          >
            Heat Map
          </button>
        </div>
        
        <div className="flex gap-2">
          <select
            value={currentBackground}
            onChange={(e) => setCurrentBackground(e.target.value as BackgroundType)}
            className="px-3 py-1.5 text-sm border border-gray-300 rounded bg-white"
          >
            {Object.entries(BACKGROUNDS).map(([key, { label }]) => (
              <option key={key} value={key}>{label}</option>
            ))}
          </select>
        </div>
        
        <div className="flex gap-2">
          <button
            onClick={() => setShowGapDetection(!showGapDetection)}
            className={`px-3 py-1.5 text-sm rounded ${showGapDetection ? 'bg-red-100 text-red-700 border border-red-300' : 'bg-gray-200 text-black'}`}
          >
            Gap Detection
          </button>
          <button
            onClick={() => setShowColorBalance(!showColorBalance)}
            className={`px-3 py-1.5 text-sm rounded ${showColorBalance ? 'bg-amber-100 text-amber-700 border border-amber-300' : 'bg-gray-200 text-black'}`}
          >
            Color Balance
          </button>
        </div>
        
        <div className="flex gap-1 items-center">
          <button
            onClick={() => setZoom(z => Math.max(0.5, z - 0.1))}
            className="px-2 py-1 text-sm bg-gray-200 rounded hover:bg-gray-300"
          >
            −
          </button>
          <span className="px-2 text-sm">{Math.round(zoom * 100)}%</span>
          <button
            onClick={() => setZoom(z => Math.min(3, z + 0.1))}
            className="px-2 py-1 text-sm bg-gray-200 rounded hover:bg-gray-300"
          >
            +
          </button>
        </div>
      </div>
      
      <div 
        ref={containerRef} 
        className="relative bg-gray-100 rounded-lg overflow-hidden"
        style={{ width: '100%', height: canvasSize }}
      >
        <Stage
          ref={stageRef}
          width={canvasSize}
          height={canvasSize}
          scaleX={zoom}
          scaleY={zoom}
          x={pan.x}
          y={pan.y}
          onWheel={handleWheel}
          draggable={!isDragging}
          onDragEnd={(e) => setPan({ x: e.target.x(), y: e.target.y() })}
        >
          <Layer>
            {renderBackground()}
            
            {viewMode === 'realistic' && sortedElements.map(renderElement)}
            {viewMode === 'heatmap' && sortedElements.map(renderHeatmapElement)}
            
            {renderGapIndicators()}
            {(showColorBalance || viewMode === 'heatmap') && renderColorBalanceOverlay()}
            {renderWatermark()}
          </Layer>
        </Stage>
        
        {viewMode === 'schematic' && blueprint.schematicSvg && (
          <div 
            className="absolute inset-0 flex items-center justify-center pointer-events-none"
            dangerouslySetInnerHTML={{ __html: blueprint.schematicSvg }}
          />
        )}
      </div>
      
      <div className="flex flex-wrap gap-2 items-center justify-between bg-gray-50 p-3 rounded-lg">
        <div className="flex gap-2">
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <input
              type="checkbox"
              checked={shadowsEnabled}
              onChange={(e) => setShadowsEnabled(e.target.checked)}
              className="rounded"
            />
            Shadows
          </label>
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <input
              type="checkbox"
              checked={aoEnabled}
              onChange={(e) => setAoEnabled(e.target.checked)}
              className="rounded"
            />
            Ambient
          </label>
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <input
              type="checkbox"
              checked={lightingEnabled}
              onChange={(e) => setLightingEnabled(e.target.checked)}
              className="rounded"
            />
            Lighting
          </label>
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <input
              type="checkbox"
              checked={animationEnabled}
              onChange={(e) => setAnimationEnabled(e.target.checked)}
              className="rounded"
            />
            360° Rotate
          </label>
        </div>
        
        <div className="flex gap-2">
          <select
            className="px-3 py-1.5 text-sm border border-gray-300 rounded bg-white"
            onChange={(e) => exportCanvas(e.target.value as ExportSize)}
            defaultValue=""
          >
            <option value="" disabled>Export As...</option>
            {Object.entries(EXPORT_SIZES).map(([key, { label }]) => (
              <option key={key} value={key}>{label}</option>
            ))}
          </select>
        </div>
      </div>
      
      {showSwapPanel && swapTargetElement && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-2xl max-h-[80vh] overflow-auto">
            <h3 className="text-lg font-medium mb-4">Swap Element</h3>
            <p className="text-sm text-gray-600 mb-4">
              Select a replacement from your inventory:
            </p>
            <div className="grid grid-cols-4 gap-3">
              {inventory.slice(0, 16).map(item => (
                <button
                  key={item.id}
                  onClick={() => handleSwapElement(item.id)}
                  className="p-2 border border-gray-200 rounded hover:border-[#1E3A5F] hover:bg-gray-50"
                >
                  <img
                    src={item.processedImageUrl || item.imageUrl}
                    alt={item.name}
                    className="w-full h-20 object-contain"
                  />
                  <p className="text-xs text-center mt-1 truncate">{item.name}</p>
                </button>
              ))}
            </div>
            <button
              onClick={() => setShowSwapPanel(false)}
              className="mt-4 px-4 py-2 bg-gray-200 rounded text-sm"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
      
      {gaps.length > 0 && showGapDetection && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3">
          <p className="text-sm text-red-700">
            <strong>{gaps.length} gap{gaps.length !== 1 ? 's' : ''} detected</strong> - 
            Consider adding filler elements at the highlighted positions.
          </p>
        </div>
      )}
    </div>
  );
};

export default RealisticWreathCanvas;
