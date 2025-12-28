// components/BlueprintStudio.tsx
import React, { useState, useEffect, useCallback, useRef, lazy, Suspense } from 'react';
import type { WreathBlueprint, InventoryItem, WreathElement, UserStyleProfile } from '../types';
import { InteractiveWreathCanvas } from './InteractiveWreathCanvas';
import { BlueprintToolbar } from './BlueprintToolbar';
import { AIChatAgent } from './AIChatAgent';
import { learnFromChanges } from '../services/learningService';
import { ManufacturingSpecModal } from './ManufacturingSpecModal';
import { sanitizeBlueprintForSerialization } from '../lib/blueprintUtils';
import { SuggestionPanel } from './SuggestionPanel';
import { LayerPanel } from './LayerPanel';
import { CanvasControls } from './CanvasControls';
import { ElementContextMenu } from './ElementContextMenu';
import { useUndoRedo } from '../hooks/useUndoRedo';
import { exportSvgToPng, exportToPdf } from '../lib/exportUtils';

const RealisticWreathCanvas = lazy(() => import('./RealisticWreathCanvas'));
const AIStudio = lazy(() => import('./AIStudio'));
const BlueprintImport = lazy(() => import('./BlueprintImport'));

interface BlueprintStudioProps {
  inventory: InventoryItem[];
  blueprints: WreathBlueprint[];
  addBlueprint: (bp: Omit<WreathBlueprint, 'id'>) => WreathBlueprint;
  updateBlueprint: (bp: WreathBlueprint) => WreathBlueprint;
  activeBlueprint: WreathBlueprint | null;
  setActiveBlueprint: (bp: WreathBlueprint | null) => void;
  styleProfile: UserStyleProfile | null;
  setStyleProfile: (profile: UserStyleProfile) => void;
  setSyncStatus: (status: 'learning' | 'syncing') => void;
}

type StudioTab = 'editor' | 'layers' | 'suggestions' | 'ai_assistant' | 'realistic' | 'ai_studio' | 'import';

const createNewBlueprint = (name = "New Wreath Design"): WreathBlueprint => ({
  id: `bp-${Date.now()}`,
  name,
  description: "A new design from the studio.",
  diameterInInches: 24,
  elements: [],
  layoutStyle: 'freeform',
});

export const BlueprintStudio: React.FC<BlueprintStudioProps> = ({
  inventory,
  blueprints,
  addBlueprint,
  updateBlueprint: updateBlueprintProp,
  activeBlueprint,
  setActiveBlueprint,
  styleProfile,
  setStyleProfile,
  setSyncStatus,
}) => {
  const [selectedElementId, setSelectedElementId] = useState<string | null>(null);
  const [selectedElementIds, setSelectedElementIds] = useState<Set<string>>(new Set());
  const [activeTab, setActiveTab] = useState<StudioTab>('editor');
  const [isSpecModalOpen, setIsSpecModalOpen] = useState(false);
  const originalBlueprintRef = React.useRef<WreathBlueprint | null>(null);
  const canvasRef = useRef<SVGSVGElement>(null);

  // Canvas state
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [showGrid, setShowGrid] = useState(false);
  const [snapToGrid, setSnapToGrid] = useState(false);
  const [previewMode, setPreviewMode] = useState(false);
  const [hiddenLayers, setHiddenLayers] = useState<Set<string>>(new Set());
  const [lockedLayers, setLockedLayers] = useState<Set<string>>(new Set());

  // Context menu state
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; elementId: string } | null>(null);

  // Undo/redo for elements
  const {
    state: elements,
    setState: setElements,
    undo,
    redo,
    canUndo,
    canRedo,
    reset: resetHistory
  } = useUndoRedo<WreathElement[]>(activeBlueprint?.elements || []);

  // Sync elements with activeBlueprint when blueprint changes
  useEffect(() => {
    if (activeBlueprint) {
      resetHistory(activeBlueprint.elements);
    }
  }, [activeBlueprint?.id]);

  useEffect(() => {
    setSelectedElementId(null);
    setSelectedElementIds(new Set());
    const cleanBlueprint = sanitizeBlueprintForSerialization(activeBlueprint);
    originalBlueprintRef.current = cleanBlueprint;
    if (activeBlueprint) {
      setActiveTab('editor');
    }
  }, [activeBlueprint?.id]);

  const handleCreateNew = () => {
    const newBp = createNewBlueprint();
    setActiveBlueprint(newBp);
  };

  const handleSaveAndLearn = async () => {
    if (!activeBlueprint || !originalBlueprintRef.current) return;

    const isNew = !blueprints.some(bp => bp.id === activeBlueprint.id);
    let savedBlueprint: WreathBlueprint;

    if (isNew) {
      savedBlueprint = addBlueprint(activeBlueprint);
    } else {
      savedBlueprint = updateBlueprintProp(activeBlueprint);
    }

    setSyncStatus('learning');
    try {
      const learningSummary = await learnFromChanges(originalBlueprintRef.current, savedBlueprint, styleProfile);
      if (learningSummary) {
        const updatedProfile: UserStyleProfile = {
          id: 'singleton',
          aestheticNotes: styleProfile ? `${styleProfile.aestheticNotes}\n- ${learningSummary}` : `- ${learningSummary}`,
        };
        setStyleProfile(updatedProfile);
      }
    } catch (e) {
      console.error("Failed to learn from changes:", e);
    } finally {
      setSyncStatus('syncing');
      originalBlueprintRef.current = sanitizeBlueprintForSerialization(savedBlueprint);
      alert("Blueprint saved and AI has learned from your changes!");
    }
  };

  const updateBlueprint = useCallback((updatedBlueprint: WreathBlueprint) => {
    setActiveBlueprint(updatedBlueprint);
    if (JSON.stringify(updatedBlueprint.elements) !== JSON.stringify(elements)) {
      setElements(updatedBlueprint.elements);
    }
  }, [setActiveBlueprint, elements, setElements]);

  const updateElement = useCallback((updatedElement: WreathElement) => {
    const newElements = elements.map(el => el.id === updatedElement.id ? updatedElement : el);
    setElements(newElements);
  }, [elements, setElements]);

  const removeElement = useCallback((elementId: string) => {
    const elementToRemove = elements.find(el => el.id === elementId);
    if (elementToRemove?.isBase) {
      return;
    }
    const newElements = elements.filter(el => el.id !== elementId);
    setElements(newElements);
    setSelectedElementId(null);
    setSelectedElementIds(prev => {
      const newSet = new Set(prev);
      newSet.delete(elementId);
      return newSet;
    });
  }, [elements, setElements]);

  const addElement = useCallback((item: InventoryItem) => {
    const uid = (typeof crypto !== 'undefined' && 'randomUUID' in crypto) ? (crypto as any).randomUUID() : `el-${Date.now()}`;
    const newElement: WreathElement = {
      id: `el-${uid}`,
      inventoryId: item.id,
      name: item.name,
      position: { angle: 0, radius: 0.5 },
      rotation: 0,
      layer: 3,
      realWorldSizeInInches: { width: item.dimensions.widthInches, height: item.dimensions.heightInches },
      tuckPoint: { x: 0.5, y: 0.5 },
      emotionTags: item.emotionTags || [],
      symbolMeaning: item.symbolMeaning,
      culturalTags: item.culturalTags || [],
      emotionalWeight: item.emotionalDimensions?.valence ?? 0.5,
    };
    setElements([...elements, newElement]);
  }, [elements, setElements]);

  const duplicateElement = useCallback((elementId: string) => {
    const element = elements.find(el => el.id === elementId);
    if (!element) return;

    const uid = (typeof crypto !== 'undefined' && 'randomUUID' in crypto) ? (crypto as any).randomUUID() : `el-${Date.now()}`;
    const newElement: WreathElement = {
      ...element,
      id: `el-${uid}`,
      position: {
        ...element.position,
        angle: element.position.angle + 15
      }
    };
    setElements([...elements, newElement]);
    setSelectedElementId(newElement.id);
  }, [elements, setElements]);

  const bringToFront = useCallback((elementId: string) => {
    const maxLayer = Math.max(...elements.map(e => e.layer));
    const newElements = elements.map(el =>
      el.id === elementId ? { ...el, layer: maxLayer + 1 } : el
    );
    setElements(newElements);
  }, [elements, setElements]);

  const sendToBack = useCallback((elementId: string) => {
    const newElements = elements.map(el =>
      el.id === elementId ? { ...el, layer: 0 } : { ...el, layer: el.layer + 1 }
    );
    setElements(newElements);
  }, [elements, setElements]);

  const flipElement = useCallback((elementId: string, axis: 'horizontal' | 'vertical') => {
    const element = elements.find(el => el.id === elementId);
    if (!element) return;

    const newRotation = axis === 'horizontal'
      ? (360 - element.rotation) % 360
      : (element.rotation + 180) % 360;

    const newElements = elements.map(el =>
      el.id === elementId ? { ...el, rotation: newRotation } : el
    );
    setElements(newElements);
  }, [elements, setElements]);

  const handleReorderElement = useCallback((elementId: string, newLayer: number) => {
    const newElements = elements.map(el =>
      el.id === elementId ? { ...el, layer: newLayer } : el
    );
    setElements(newElements);
  }, [elements, setElements]);

  const toggleVisibility = useCallback((elementId: string) => {
    setHiddenLayers(prev => {
      const newSet = new Set(prev);
      if (newSet.has(elementId)) {
        newSet.delete(elementId);
      } else {
        newSet.add(elementId);
      }
      return newSet;
    });
  }, []);

  const toggleLock = useCallback((elementId: string) => {
    setLockedLayers(prev => {
      const newSet = new Set(prev);
      if (newSet.has(elementId)) {
        newSet.delete(elementId);
      } else {
        newSet.add(elementId);
      }
      return newSet;
    });
  }, []);

  const handleContextMenu = useCallback((e: React.MouseEvent, elementId: string) => {
    e.preventDefault();
    setContextMenu({ x: e.clientX, y: e.clientY, elementId });
    setSelectedElementId(elementId);
  }, []);

  // Keyboard shortcuts - must be defined after removeElement and duplicateElement
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
        e.preventDefault();
        if (e.shiftKey) {
          redo();
        } else {
          undo();
        }
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'y') {
        e.preventDefault();
        redo();
      }
      if (e.key === 'Delete') {
        e.preventDefault();
        if (selectedElementIds.size > 0) {
          selectedElementIds.forEach(id => {
            if (!lockedLayers.has(id)) {
              removeElement(id);
            }
          });
        } else if (selectedElementId && !lockedLayers.has(selectedElementId)) {
          removeElement(selectedElementId);
        }
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'd') {
        e.preventDefault();
        if (selectedElementIds.size > 0) {
          selectedElementIds.forEach(id => {
            if (!lockedLayers.has(id)) {
              duplicateElement(id);
            }
          });
        } else if (selectedElementId && !lockedLayers.has(selectedElementId)) {
          duplicateElement(selectedElementId);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [undo, redo, selectedElementId, selectedElementIds, lockedLayers, removeElement, duplicateElement]);

  const handleExport = useCallback(async () => {
    if (!canvasRef.current || !activeBlueprint) return;

    try {
      await exportSvgToPng(canvasRef.current, activeBlueprint.name.replace(/\s+/g, '-').toLowerCase());
    } catch (error) {
      console.error('Export failed:', error);
      alert('Export failed. Please try again.');
    }
  }, [activeBlueprint]);

  // Zoom controls
  const handleZoomIn = () => setZoom(z => Math.min(3, z + 0.25));
  const handleZoomOut = () => setZoom(z => Math.max(0.25, z - 0.25));
  const handleResetZoom = () => { setZoom(1); setPan({ x: 0, y: 0 }); };

  const selectedElement = activeBlueprint ? elements.find(el => el.id === selectedElementId) || null : null;

  const EmptyStateMessage = ({ title, description }: { title: string; description: string }) => (
    <div className="flex flex-col items-center justify-center h-full text-center p-6">
      <h3 className="text-lg font-light text-gray-700 mb-2">{title}</h3>
      <p className="text-sm text-gray-500 mb-4">{description}</p>
      <button onClick={handleCreateNew} className="text-white px-4 py-2 rounded-md text-sm" style={{ backgroundColor: '#1E3A5F' }}>
        Create New Blueprint
      </button>
    </div>
  );

  return (
    <>
      <div className="h-[calc(100vh-150px)] grid grid-cols-12 gap-4">
        {/* Main Canvas */}
        <div className="col-span-8 bg-white rounded-lg shadow-md p-2 flex flex-col">
          {/* Canvas Controls Bar */}
          <div className="mb-2">
            <CanvasControls
              zoom={zoom}
              onZoomIn={handleZoomIn}
              onZoomOut={handleZoomOut}
              onResetZoom={handleResetZoom}
              showGrid={showGrid}
              onToggleGrid={() => setShowGrid(g => !g)}
              snapToGrid={snapToGrid}
              onToggleSnap={() => setSnapToGrid(s => !s)}
              previewMode={previewMode}
              onTogglePreview={() => setPreviewMode(p => !p)}
              canUndo={canUndo}
              canRedo={canRedo}
              onUndo={undo}
              onRedo={redo}
              onExport={handleExport}
            />
          </div>

          <div
            className="flex-grow relative bg-gray-50 rounded-lg overflow-hidden"
            onContextMenu={(e) => {
              if (selectedElementId) {
                handleContextMenu(e, selectedElementId);
              }
            }}
          >
            {activeBlueprint ? (
              <InteractiveWreathCanvas
                blueprint={{ ...activeBlueprint, elements }}
                setBlueprint={updateBlueprint}
                inventory={inventory}
                selectedElementId={selectedElementId}
                selectedElementIds={selectedElementIds}
                setSelectedElementId={setSelectedElementId}
                setSelectedElementIds={setSelectedElementIds}
                hiddenLayers={hiddenLayers}
                lockedLayers={lockedLayers}
                zoom={zoom}
                pan={pan}
                showGrid={showGrid}
                snapToGrid={snapToGrid}
                previewMode={previewMode}
                onPanChange={setPan}
                canvasRef={canvasRef}
              />
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-center p-8">
                <div className="w-24 h-24 mb-4 rounded-full bg-gray-200 flex items-center justify-center">
                  <svg className="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                </div>
                <h3 className="text-lg font-light text-gray-700 mb-2">No Design Selected</h3>
                <p className="text-sm text-gray-500 mb-4 max-w-xs">Use the Studio tab to generate a new design, or create an empty blueprint to start from scratch.</p>
                <div className="flex gap-2">
                  <button onClick={() => setActiveTab('ai_studio')} className="px-4 py-2 rounded-md text-sm border border-gray-300 hover:bg-gray-50">
                    Open Studio
                  </button>
                  <button onClick={handleCreateNew} className="text-white px-4 py-2 rounded-md text-sm" style={{ backgroundColor: '#1E3A5F' }}>
                    Create Blank
                  </button>
                </div>
              </div>
            )}
          </div>

          <div className="flex justify-between items-center p-2 border-t mt-2">
            <button onClick={() => setIsSpecModalOpen(true)} disabled={!activeBlueprint} className="text-sm text-gray-600 hover:text-gray-900 bg-gray-100 hover:bg-gray-200 px-4 py-2 rounded-md disabled:opacity-50 disabled:cursor-not-allowed">
              View Specification...
            </button>
            <button onClick={handleSaveAndLearn} disabled={!activeBlueprint} className="text-white px-6 py-2 rounded-md text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed" style={{ backgroundColor: '#1E3A5F' }}>
              Save & Update AI Style
            </button>
          </div>
        </div>

        {/* Toolbar / AI */}
        <div className="col-span-4 bg-white rounded-lg shadow-md flex flex-col">
          <div className="p-2 border-b">
            <div className="flex justify-center bg-gray-100 rounded-md p-1">
              <button onClick={() => setActiveTab('editor')} className={`flex-1 py-1 text-sm rounded-md ${activeTab === 'editor' ? 'bg-white shadow' : ''}`}>Editor</button>
              <button onClick={() => setActiveTab('layers')} className={`flex-1 py-1 text-sm rounded-md ${activeTab === 'layers' ? 'bg-white shadow' : ''}`}>Layers</button>
              <button onClick={() => setActiveTab('suggestions')} className={`flex-1 py-1 text-sm rounded-md ${activeTab === 'suggestions' ? 'bg-white shadow' : ''}`}>Ideas</button>
              <button onClick={() => setActiveTab('ai_assistant')} className={`flex-1 py-1 text-sm rounded-md ${activeTab === 'ai_assistant' ? 'bg-white shadow' : ''}`}>Chat</button>
              <button onClick={() => setActiveTab('ai_studio')} className={`flex-1 py-1 text-sm rounded-md ${activeTab === 'ai_studio' ? 'bg-white shadow' : ''}`}>Studio</button>
              <button onClick={() => setActiveTab('import')} className={`flex-1 py-1 text-sm rounded-md ${activeTab === 'import' ? 'bg-white shadow' : ''}`}>Import</button>
              <button onClick={() => setActiveTab('realistic')} className={`flex-1 py-1 text-sm rounded-md ${activeTab === 'realistic' ? 'bg-white shadow' : ''}`}>Preview</button>
            </div>
          </div>
          <div className="flex-grow overflow-hidden">
            {activeTab === 'editor' && (
              <div className="p-4 h-full">
                {activeBlueprint ? (
                  <BlueprintToolbar
                    selectedElement={selectedElement}
                    updateElement={updateElement}
                    removeElement={removeElement}
                    addElement={addElement}
                    inventory={inventory}
                    blueprint={{ ...activeBlueprint, elements }}
                    updateBlueprint={updateBlueprint}
                  />
                ) : (
                  <EmptyStateMessage title="No Design Active" description="Create or generate a design to use the editor tools." />
                )}
              </div>
            )}
            {activeTab === 'layers' && (
              activeBlueprint ? (
                <LayerPanel
                  elements={elements}
                  selectedElementId={selectedElementId}
                  hiddenLayers={hiddenLayers}
                  lockedLayers={lockedLayers}
                  onSelectElement={setSelectedElementId}
                  onReorderElement={handleReorderElement}
                  onToggleVisibility={toggleVisibility}
                  onToggleLock={toggleLock}
                  inventory={inventory}
                />
              ) : (
                <EmptyStateMessage title="No Layers" description="Generate a design first to manage layers." />
              )
            )}
            {activeTab === 'suggestions' && (
              activeBlueprint ? (
                <SuggestionPanel
                  blueprint={{ ...activeBlueprint, elements }}
                  inventory={inventory}
                  addElement={addElement}
                />
              ) : (
                <EmptyStateMessage title="No Design" description="Create a design to see AI suggestions." />
              )
            )}
            {activeTab === 'ai_assistant' && (
              activeBlueprint ? (
                <AIChatAgent
                  blueprint={{ ...activeBlueprint, elements }}
                  updateBlueprint={updateBlueprint}
                  inventory={inventory}
                />
              ) : (
                <EmptyStateMessage title="No Design" description="Create a design to chat with the AI assistant." />
              )
            )}
            {activeTab === 'realistic' && (
              <div className="p-2 h-full overflow-auto">
                {activeBlueprint ? (
                  <Suspense fallback={<div className="flex items-center justify-center h-full text-gray-500">Loading preview...</div>}>
                    <RealisticWreathCanvas
                      blueprint={{ ...activeBlueprint, elements }}
                      inventory={inventory}
                      onBlueprintChange={updateBlueprint}
                      onElementSwap={(elementId, newInventoryId) => {
                        const newElements = elements.map(el =>
                          el.id === elementId
                            ? { ...el, inventoryId: newInventoryId, name: inventory.find(i => i.id === newInventoryId)?.name || el.name }
                            : el
                        );
                        setElements(newElements);
                      }}
                      isInteractive={true}
                    />
                  </Suspense>
                ) : (
                  <EmptyStateMessage title="No Preview" description="Generate a design to see the realistic preview." />
                )}
              </div>
            )}
            {activeTab === 'ai_studio' && (
              <Suspense fallback={<div className="flex items-center justify-center h-full text-gray-500">Loading AI Studio...</div>}>
                <AIStudio
                  inventory={inventory}
                  currentBlueprint={activeBlueprint ? { ...activeBlueprint, elements } : null}
                  onApplyBlueprint={(newBp) => {
                    if (activeBlueprint) {
                      setElements(newBp.elements);
                      updateBlueprint({ ...activeBlueprint, ...newBp, elements: newBp.elements });
                    } else {
                      const blueprintToSave: Omit<WreathBlueprint, 'id'> = {
                        ...newBp,
                        diameterInInches: newBp.diameterInInches || 24,
                        layoutStyle: newBp.layoutStyle || 'freeform',
                      };
                      const savedBlueprint = addBlueprint(blueprintToSave);
                      setElements(savedBlueprint.elements);
                      resetHistory(savedBlueprint.elements);
                      setActiveBlueprint(savedBlueprint);
                    }
                    setActiveTab('editor');
                  }}
                />
              </Suspense>
            )}
            {activeTab === 'import' && (
              <Suspense fallback={<div className="flex items-center justify-center h-full text-gray-500">Loading Import...</div>}>
                <BlueprintImport
                  inventory={inventory}
                  onImportBlueprint={(newBp) => {
                    const blueprintToSave: Omit<WreathBlueprint, 'id'> = {
                      ...newBp,
                      diameterInInches: newBp.diameterInInches || 24,
                      layoutStyle: newBp.layoutStyle || 'freeform',
                    };
                    const savedBlueprint = addBlueprint(blueprintToSave);
                    setElements(savedBlueprint.elements);
                    resetHistory(savedBlueprint.elements);
                    setActiveBlueprint(savedBlueprint);
                    setActiveTab('editor');
                  }}
                />
              </Suspense>
            )}
          </div>
        </div>
      </div>

      {/* Context Menu */}
      {contextMenu && (
        <ElementContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          onDuplicate={() => duplicateElement(contextMenu.elementId)}
          onDelete={() => removeElement(contextMenu.elementId)}
          onBringToFront={() => bringToFront(contextMenu.elementId)}
          onSendToBack={() => sendToBack(contextMenu.elementId)}
          onFlipHorizontal={() => flipElement(contextMenu.elementId, 'horizontal')}
          onFlipVertical={() => flipElement(contextMenu.elementId, 'vertical')}
          onClose={() => setContextMenu(null)}
          isBaseElement={elements.find(el => el.id === contextMenu.elementId)?.isBase}
        />
      )}

      {isSpecModalOpen && activeBlueprint && (
        <ManufacturingSpecModal
          wreath={{ ...activeBlueprint, elements }}
          inventory={inventory}
          onClose={() => setIsSpecModalOpen(false)}
          updateBlueprint={updateBlueprintProp}
        />
      )}
    </>
  );
};
