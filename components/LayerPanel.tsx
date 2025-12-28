// components/LayerPanel.tsx
import React, { useState } from 'react';
import type { WreathElement, InventoryItem } from '../types';

interface LayerPanelProps {
  elements: WreathElement[];
  selectedElementId: string | null;
  hiddenLayers: Set<string>;
  lockedLayers: Set<string>;
  onSelectElement: (id: string | null) => void;
  onReorderElement: (elementId: string, newLayer: number) => void;
  onToggleVisibility: (elementId: string) => void;
  onToggleLock: (elementId: string) => void;
  inventory: InventoryItem[];
}

export const LayerPanel: React.FC<LayerPanelProps> = ({
  elements,
  selectedElementId,
  hiddenLayers,
  lockedLayers,
  onSelectElement,
  onReorderElement,
  onToggleVisibility,
  onToggleLock,
  inventory
}) => {
  const [draggedId, setDraggedId] = useState<string | null>(null);

  const sortedElements = [...elements].sort((a, b) => b.layer - a.layer);

  const getElementThumb = (inventoryId: string) => {
    const item = inventory.find(i => i.id === inventoryId);
    return item?.processedImageUrl || item?.imageUrl;
  };

  const handleDragStart = (e: React.DragEvent, elementId: string) => {
    if (lockedLayers.has(elementId)) {
      e.preventDefault();
      return;
    }
    setDraggedId(elementId);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e: React.DragEvent, targetElementId: string) => {
    e.preventDefault();
    if (!draggedId || draggedId === targetElementId) {
      setDraggedId(null);
      return;
    }

    const targetElement = elements.find(el => el.id === targetElementId);
    if (targetElement) {
      onReorderElement(draggedId, targetElement.layer);
    }
    setDraggedId(null);
  };

  const handleMoveUp = (element: WreathElement) => {
    const maxLayer = Math.max(...elements.map(e => e.layer));
    if (element.layer < maxLayer) {
      onReorderElement(element.id, element.layer + 1);
    }
  };

  const handleMoveDown = (element: WreathElement) => {
    if (element.layer > 1) {
      onReorderElement(element.id, element.layer - 1);
    }
  };

  return (
    <div className="h-full flex flex-col">
      <div className="p-3 border-b bg-gray-50">
        <h3 className="text-sm font-medium text-gray-700">Layers</h3>
        <p className="text-xs text-gray-500 mt-1">{elements.length} elements</p>
      </div>
      
      <div className="flex-1 overflow-y-auto">
        {sortedElements.length === 0 ? (
          <div className="p-4 text-center text-gray-400 text-sm">
            No elements yet
          </div>
        ) : (
          <div className="divide-y">
            {sortedElements.map((element) => {
              const isSelected = element.id === selectedElementId;
              const isHidden = hiddenLayers.has(element.id);
              const isLocked = lockedLayers.has(element.id);
              const thumbUrl = getElementThumb(element.inventoryId);

              return (
                <div
                  key={element.id}
                  draggable={!isLocked}
                  onDragStart={(e) => handleDragStart(e, element.id)}
                  onDragOver={handleDragOver}
                  onDrop={(e) => handleDrop(e, element.id)}
                  onClick={() => !isLocked && onSelectElement(isSelected ? null : element.id)}
                  className={`
                    flex items-center gap-2 p-2 cursor-pointer transition-colors
                    ${isSelected ? 'bg-gray-100' : 'hover:bg-gray-50'}
                    ${draggedId === element.id ? 'opacity-50' : ''}
                    ${isLocked ? 'cursor-not-allowed' : ''}
                  `}
                >
                  {/* Thumbnail */}
                  <div className={`w-8 h-8 rounded border bg-gray-100 flex-shrink-0 overflow-hidden ${isHidden ? 'opacity-30' : ''}`}>
                    {thumbUrl ? (
                      <img src={thumbUrl} alt="" className="w-full h-full object-contain" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-xs text-gray-400">?</div>
                    )}
                  </div>

                  {/* Name and layer */}
                  <div className={`flex-1 min-w-0 ${isHidden ? 'opacity-50' : ''}`}>
                    <p className="text-sm font-medium text-gray-700 truncate">{element.name}</p>
                    <p className="text-xs text-gray-400">Layer {element.layer}</p>
                  </div>

                  {/* Controls */}
                  <div className="flex items-center gap-1 flex-shrink-0">
                    {/* Move up/down */}
                    <button
                      onClick={(e) => { e.stopPropagation(); handleMoveUp(element); }}
                      disabled={element.layer >= Math.max(...elements.map(e => e.layer))}
                      className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-30"
                      title="Move up"
                    >
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                      </svg>
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); handleMoveDown(element); }}
                      disabled={element.layer <= 1}
                      className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-30"
                      title="Move down"
                    >
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>

                    {/* Visibility toggle */}
                    <button
                      onClick={(e) => { e.stopPropagation(); onToggleVisibility(element.id); }}
                      className={`p-1 ${isHidden ? 'text-gray-300' : 'text-gray-500 hover:text-gray-700'}`}
                      title={isHidden ? 'Show' : 'Hide'}
                    >
                      {isHidden ? (
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                        </svg>
                      ) : (
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                      )}
                    </button>

                    {/* Lock toggle */}
                    <button
                      onClick={(e) => { e.stopPropagation(); onToggleLock(element.id); }}
                      className={`p-1 ${isLocked ? 'text-gray-700' : 'text-gray-300 hover:text-gray-500'}`}
                      title={isLocked ? 'Unlock' : 'Lock'}
                    >
                      {isLocked ? (
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                        </svg>
                      ) : (
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 11V7a4 4 0 118 0m-4 8v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2z" />
                        </svg>
                      )}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
