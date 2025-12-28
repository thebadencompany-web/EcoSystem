// components/InventoryDashboard.tsx
import React, { useState, useMemo } from 'react';
import type { InventoryItem, BotanicalShape, BotanicalTexture, BotanicalComplexity, EmotionalDimensions, StructureRole, InventoryCategory, RotationProperties } from '../types';
import { ProductDetailModal } from './ProductDetailModal';
import { MelroseCsvImport } from './MelroseCsvImport';
import { RotationPropertiesEditor } from './RotationPropertiesEditor';
import { enhanceProductTagsWithAI } from '../services/designDropsAgent';
import { parseMelroseCsvForLookup } from '../services/melroseCsvParser';
import { StemIsolationModal } from './StemIsolationModal';
import { BlueprintGenerator } from './BlueprintGenerator';

const SHAPES: BotanicalShape[] = ['round', 'cascading', 'spiral', 'linear', 'pointed', 'other'];
const TEXTURES: BotanicalTexture[] = ['smooth', 'ruffled', 'spiky', 'velvety', 'clustered', 'other'];
const COMPLEXITIES: BotanicalComplexity[] = ['simple', 'moderate', 'complex'];
const defaultEmotionalDimensions: EmotionalDimensions = { valence: 0.5, arousal: 0.5, temporalWeight: 0.5 };

type FilterType = 'all' | 'floral' | 'greenery' | 'accent';
type AvailabilityFilter = 'all' | 'available' | 'unavailable';
type StructureFilter = 'all' | 'base' | 'botanical';
type CategoryFilter = 'all' | 'floral' | 'home';

interface InventoryDashboardProps {
  inventory: InventoryItem[];
  removeInventoryItem: (itemId: string) => void;
  toggleAvailability: (itemId: string) => void;
  updateInventoryItem: (item: InventoryItem) => void;
  addInventoryItems?: (items: InventoryItem[]) => void;
  onLoadCsvLookup?: (lookup: Map<string, InventoryItem>) => void;
  csvLookupCount?: number;
  // Import staging area
  importStaging?: InventoryItem[];
  onApproveStaging?: (items: InventoryItem[]) => void;
  onRemoveFromStaging?: (itemId: string) => void;
  onUpdateStagingItem?: (item: InventoryItem) => void;
  onSendToTagger?: (item: InventoryItem) => void;
}

// Helper to handle image replacement
const handleImageUpload = (file: File, item: InventoryItem, onUpdate: (item: InventoryItem) => void) => {
  const reader = new FileReader();
  reader.onload = (e) => {
    const result = e.target?.result as string;
    onUpdate({
      ...item,
      imageUrl: result,
      processedImageUrl: result, // Update both
    });
  };
  reader.readAsDataURL(file);
};

const DimensionSlider: React.FC<{
  label: string, value: number, onChange: (v: number) => void,
  minLabel: string, maxLabel: string
}> = ({ label, value, onChange, minLabel, maxLabel }) => (
  <div>
    <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
    <div className="flex items-center gap-2">
      <span className="text-xs text-gray-500 w-12 text-center">{minLabel}</span>
      <input
        type="range" min="0" max="1" step="0.01" value={value}
        onChange={e => onChange(parseFloat(e.target.value))}
        className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-gray-600"
      />
      <span className="text-xs text-gray-500 w-12 text-center">{maxLabel}</span>
    </div>
  </div>
);

const DimensionGraph: React.FC<{ dimensions: EmotionalDimensions }> = ({ dimensions }) => (
  <div className="w-full space-y-1">
    <div className="flex items-center" title={`Valence: ${dimensions.valence.toFixed(2)}`}>
      <div className="w-2 h-2 rounded-full bg-gray-800 mr-2 flex-shrink-0"></div>
      <div className="w-full bg-gray-200 rounded-full h-1.5"><div className="bg-gray-800 h-1.5 rounded-full" style={{ width: `${dimensions.valence * 100}%` }}></div></div>
    </div>
    <div className="flex items-center" title={`Arousal: ${dimensions.arousal.toFixed(2)}`}>
      <div className="w-2 h-2 rounded-full bg-gray-600 mr-2 flex-shrink-0"></div>
      <div className="w-full bg-gray-200 rounded-full h-1.5"><div className="bg-gray-600 h-1.5 rounded-full" style={{ width: `${dimensions.arousal * 100}%` }}></div></div>
    </div>
    <div className="flex items-center" title={`Temporal Weight: ${dimensions.temporalWeight.toFixed(2)}`}>
      <div className="w-2 h-2 rounded-full bg-gray-400 mr-2 flex-shrink-0"></div>
      <div className="w-full bg-gray-200 rounded-full h-1.5"><div className="bg-gray-400 h-1.5 rounded-full" style={{ width: `${dimensions.temporalWeight * 100}%` }}></div></div>
    </div>
  </div>
);


// Simple Error Boundary for the Modal
class SimpleErrorBoundary extends React.Component<{ children: React.ReactNode, onClose: () => void }, { hasError: boolean, error: string | null }> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: any) {
    return { hasError: true, error: error.message };
  }

  componentDidCatch(error: any, errorInfo: any) {
    console.error("StemIsolationModal Crash:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl p-6 max-w-md w-full border-l-4 border-red-500">
            <h3 className="text-lg font-bold text-red-700 mb-2">Something went wrong 💥</h3>
            <p className="text-gray-600 mb-4 text-sm">The Stem Isolator encountered a critical error.</p>
            <div className="bg-gray-100 p-3 rounded text-xs font-mono text-gray-800 mb-4 overflow-auto max-h-32">
              {this.state.error || 'Unknown Error'}
            </div>
            <div className="flex justify-end">
              <button onClick={this.props.onClose} className="px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded text-sm text-gray-800">
                Close
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export const InventoryDashboard: React.FC<InventoryDashboardProps> = ({
  inventory,
  removeInventoryItem,
  toggleAvailability,
  updateInventoryItem,
  addInventoryItems,
  onLoadCsvLookup,
  csvLookupCount,
  importStaging,
  onApproveStaging,
  onRemoveFromStaging,
  onUpdateStagingItem,
  onSendToTagger
}) => {
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);
  const [viewingItem, setViewingItem] = useState<InventoryItem | null>(null);
  /* New states for Tagger */
  const [activeTab, setActiveTab] = useState<'inventory' | 'import' | 'staging' | 'blueprint'>('inventory');

  // Tagger Modal State
  const [taggerModalItem, setTaggerModalItem] = useState<InventoryItem | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<FilterType>('all');
  const [availabilityFilter, setAvailabilityFilter] = useState<AvailabilityFilter>('all');
  const [seasonFilter, setSeasonFilter] = useState<string>('all');
  const [structureFilter, setStructureFilter] = useState<StructureFilter>('all');
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>('all');
  const [showImportModal, setShowImportModal] = useState(false);
  const [enhancingItemId, setEnhancingItemId] = useState<string | null>(null);
  const [selectedItemIds, setSelectedItemIds] = useState<Set<string>>(new Set());
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<'selected' | 'all' | null>(null);
  const [showStaging, setShowStaging] = useState(false);
  const [isolatingItem, setIsolatingItem] = useState<InventoryItem | null>(null);



  const allSeasons = useMemo(() => {
    const seasons = new Set<string>();
    inventory.forEach(item => {
      item.seasonTags?.forEach(s => seasons.add(s));
    });
    return Array.from(seasons).sort();
  }, [inventory]);

  const filteredInventory = useMemo(() => {
    let result = inventory;

    if (categoryFilter !== 'all') {
      result = result.filter(item => (item.inventoryCategory || 'floral') === categoryFilter);
    }

    if (typeFilter !== 'all') {
      result = result.filter(item => item.type === typeFilter);
    }

    if (availabilityFilter !== 'all') {
      result = result.filter(item =>
        availabilityFilter === 'available' ? item.isAvailable : !item.isAvailable
      );
    }

    if (seasonFilter !== 'all') {
      result = result.filter(item => item.seasonTags?.includes(seasonFilter));
    }

    if (structureFilter !== 'all') {
      result = result.filter(item => {
        const role = item.structureRole || 'botanical';
        return role === structureFilter;
      });
    }

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(item =>
        item.name.toLowerCase().includes(query) ||
        item.emotionTags?.some(tag => tag.toLowerCase().includes(query)) ||
        item.symbolMeaning?.toLowerCase().includes(query) ||
        item.category?.toLowerCase().includes(query) ||
        item.melroseInfo?.vendorSku?.toLowerCase().includes(query) ||
        item.melroseInfo?.productCategory?.toLowerCase().includes(query)
      );
    }

    return result;
  }, [inventory, categoryFilter, typeFilter, availabilityFilter, seasonFilter, structureFilter, searchQuery]);

  const counts = useMemo(() => ({
    all: inventory.length,
    floral: inventory.filter(i => i.type === 'floral').length,
    greenery: inventory.filter(i => i.type === 'greenery').length,
    accent: inventory.filter(i => i.type === 'accent').length,
  }), [inventory]);

  const structureCounts = useMemo(() => ({
    all: inventory.length,
    base: inventory.filter(i => i.structureRole === 'base').length,
    botanical: inventory.filter(i => (i.structureRole || 'botanical') === 'botanical').length,
  }), [inventory]);

  const categoryCounts = useMemo(() => ({
    all: inventory.length,
    floral: inventory.filter(i => (i.inventoryCategory || 'floral') === 'floral').length,
    home: inventory.filter(i => i.inventoryCategory === 'home').length,
  }), [inventory]);

  const existingSkus = useMemo(() =>
    inventory.map(i => i.id),
    [inventory]);

  const handleCsvImport = (items: InventoryItem[]) => {
    if (addInventoryItems) {
      addInventoryItems(items);
      setShowImportModal(false);
    }
  };

  const handleSave = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (editingItem) {
      updateInventoryItem(editingItem);
      setEditingItem(null);
    }
  };

  const handleItemChange = (field: keyof InventoryItem, value: any) => {
    if (editingItem) {
      setEditingItem({ ...editingItem, [field]: value });
    }
  };

  const handleEmotionalDimensionChange = (field: keyof EmotionalDimensions, value: number) => {
    if (editingItem) {
      setEditingItem(prev => prev ? {
        ...prev,
        emotionalDimensions: {
          ...(prev.emotionalDimensions || defaultEmotionalDimensions),
          [field]: value
        }
      } : null);
    }
  };

  const handleRotationPropertiesChange = (rotationProperties: RotationProperties) => {
    if (editingItem) {
      setEditingItem(prev => prev ? {
        ...prev,
        rotationProperties
      } : null);
    }
  };

  // AI Enhancement handler for home decor items
  const handleEnhanceWithAI = async (item: InventoryItem) => {
    if (!item.melroseInfo || enhancingItemId) return;

    setEnhancingItemId(item.id);
    try {
      const enhancedTags = await enhanceProductTagsWithAI(item);

      // Update the item with enhanced tags
      const updatedItem: InventoryItem = {
        ...item,
        emotionTags: enhancedTags.simpleTags,
        emotionalDimensions: {
          valence: enhancedTags.emotionScores.joy / 100,
          arousal: enhancedTags.emotionScores.playfulness / 100,
          temporalWeight: enhancedTags.emotionScores.nostalgia / 100,
        },
        logicTrail: [
          ...(item.logicTrail || []),
          `AI Enhanced: ${enhancedTags.primaryEmotion}, ${enhancedTags.aestheticStyle}`,
        ],
      };

      updateInventoryItem(updatedItem);
    } catch (error) {
      console.error('AI enhancement failed:', error);
      alert('AI enhancement failed. Please try again.');
    } finally {
      setEnhancingItemId(null);
    }
  };

  // Selection handlers for bulk operations
  const toggleItemSelection = (itemId: string) => {
    setSelectedItemIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(itemId)) {
        newSet.delete(itemId);
      } else {
        newSet.add(itemId);
      }
      return newSet;
    });
  };

  const selectAllFiltered = () => {
    const allFilteredIds = new Set(filteredInventory.map(item => item.id));
    setSelectedItemIds(allFilteredIds);
  };

  const clearSelection = () => {
    setSelectedItemIds(new Set());
  };

  const handleDeleteSelected = () => {
    if (showDeleteConfirm === 'selected') {
      selectedItemIds.forEach(id => removeInventoryItem(id));
      setSelectedItemIds(new Set());
      setShowDeleteConfirm(null);
    }
  };

  const handleDeleteAll = () => {
    if (showDeleteConfirm === 'all') {
      inventory.forEach(item => removeInventoryItem(item.id));
      setSelectedItemIds(new Set());
      setShowDeleteConfirm(null);
    }
  };

  // Load CSV as lookup database (not import to inventory)
  const handleLoadCsvForLookup = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !onLoadCsvLookup) return;

    try {
      const text = await file.text();
      const { lookup, count, errors } = parseMelroseCsvForLookup(text);

      if (errors.length > 0) {
        console.warn('CSV parse warnings:', errors);
      }

      onLoadCsvLookup(lookup);
      alert(`✅ Loaded ${count.toLocaleString()} products for lookup\n\nNow when you use the Chrome extension, products will be matched against this CSV data.`);
    } catch (error) {
      alert('Failed to load CSV file. Please check the file format.');
      console.error('CSV load error:', error);
    }

    // Reset input
    event.target.value = '';
  };


  const EditModal: React.FC = () => {
    if (!editingItem) return null;
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-lg shadow-xl max-w-lg w-full">
          <form onSubmit={handleSave}>
            <div className="p-6 max-h-[80vh] overflow-y-auto">
              <h3 className="text-xl font-semibold mb-4">Edit: {editingItem.name}</h3>
              <div className="space-y-4">
                <div>
                  <label htmlFor="edit-name" className="text-sm font-medium">Name</label>
                  <input
                    id="edit-name" type="text" value={editingItem.name}
                    onChange={e => handleItemChange('name', e.target.value)}
                    className="w-full p-2 border rounded-md mt-1"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Size (inches)</label>
                  <div className="flex items-center gap-2 mt-1">
                    <input type="number" step="0.1" value={editingItem.dimensions.widthInches}
                      onChange={e => setEditingItem({ ...editingItem, dimensions: { ...editingItem.dimensions, widthInches: parseFloat(e.target.value) } })}
                      className="w-full p-2 border rounded-md" />
                    <span>x</span>
                    <input type="number" step="0.1" value={editingItem.dimensions.heightInches}
                      onChange={e => setEditingItem({ ...editingItem, dimensions: { ...editingItem.dimensions, heightInches: parseFloat(e.target.value) } })}
                      className="w-full p-2 border rounded-md" />
                  </div>
                </div>
                <div className="p-3 rounded-lg border bg-amber-50">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={editingItem.structureRole === 'base'}
                      onChange={e => handleItemChange('structureRole', e.target.checked ? 'base' : 'botanical')}
                      className="w-5 h-5 rounded border-gray-300 text-amber-700 focus:ring-amber-500"
                    />
                    <div>
                      <span className="text-sm font-medium text-gray-800">This is a Wreath Base</span>
                      <p className="text-xs text-gray-500">Check if this is a grapevine, pine, fern, or other wreath form</p>
                    </div>
                  </label>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium">Shape</label>
                    <select value={editingItem.shape} onChange={e => handleItemChange('shape', e.target.value as BotanicalShape)} className="w-full mt-1 p-2 border bg-white rounded-md text-sm">
                      {SHAPES.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-sm font-medium">Texture</label>
                    <select value={editingItem.texture} onChange={e => handleItemChange('texture', e.target.value as BotanicalTexture)} className="w-full mt-1 p-2 border bg-white rounded-md text-sm">
                      {TEXTURES.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-sm font-medium">Complexity</label>
                    <select value={editingItem.complexity} onChange={e => handleItemChange('complexity', e.target.value as BotanicalComplexity)} className="w-full mt-1 p-2 border bg-white rounded-md text-sm">
                      {COMPLEXITIES.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                </div>
                <div className="bg-gray-50 p-4 rounded-lg border">
                  <h3 className="font-semibold text-gray-800 mb-3 text-sm">Emotional Dimensions</h3>
                  <div className="space-y-3">
                    <DimensionSlider
                      label="Valence"
                      value={editingItem.emotionalDimensions?.valence ?? 0.5}
                      onChange={v => handleEmotionalDimensionChange('valence', v)}
                      minLabel="Sorrow"
                      maxLabel="Joy"
                    />
                    <DimensionSlider
                      label="Arousal"
                      value={editingItem.emotionalDimensions?.arousal ?? 0.5}
                      onChange={v => handleEmotionalDimensionChange('arousal', v)}
                      minLabel="Calm"
                      maxLabel="Intense"
                    />
                    <DimensionSlider
                      label="Temporal Weight"
                      value={editingItem.emotionalDimensions?.temporalWeight ?? 0.5}
                      onChange={v => handleEmotionalDimensionChange('temporalWeight', v)}
                      minLabel="Memory"
                      maxLabel="Hope"
                    />
                  </div>
                </div>
                {/* Rotation Properties Editor - only for botanicals, not bases */}
                {editingItem.structureRole !== 'base' && (
                  <div className="bg-gray-50 p-4 rounded-lg border">
                    <RotationPropertiesEditor
                      rotationProperties={editingItem.rotationProperties}
                      compositionRole={editingItem.compositionRole}
                      onChange={handleRotationPropertiesChange}
                      showAdvanced={true}
                    />
                  </div>
                )}
                <div>
                  <label className="text-sm font-medium">Symbolic Meaning</label>
                  <textarea value={editingItem.symbolMeaning} onChange={e => handleItemChange('symbolMeaning', e.target.value)} className="w-full mt-1 p-2 border rounded-md text-sm h-20 resize-none" />
                </div>
              </div>
            </div>
            <div className="bg-gray-50 px-6 py-3 flex justify-end gap-2">
              <button type="button" onClick={() => setEditingItem(null)} className="px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-md">Cancel</button>
              <button type="submit" className="px-4 py-2 text-sm bg-gray-800 text-white rounded-md hover:bg-gray-700">Save Changes</button>
            </div>
          </form>
        </div>
      </div>
    );
  };

  return (
    <div className="bg-white rounded-lg shadow-md animate-fade-in min-h-[80vh]">

      {/* MASTER TABS */}
      <div className="flex border-b border-gray-200 px-6 pt-4">
        <button
          onClick={() => setActiveTab('inventory')}
          className={`pb-3 px-6 text-sm font-medium transition-colors border-b-2 ${activeTab === 'inventory' ? 'border-gray-800 text-gray-900' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
        >
          Inventory Dashboard
        </button>
        <button
          onClick={() => setActiveTab('blueprint')}
          className={`pb-3 px-6 text-sm font-medium transition-colors border-b-2 ${activeTab === 'blueprint' ? 'border-indigo-600 text-indigo-900' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
        >
          Blueprint Lab 🧪
        </button>
      </div>

      {/* TAB CONTENT: BLUEPRINT LAB */}
      {activeTab === 'blueprint' && (
        <div className="p-6">
          <BlueprintGenerator inventoryCount={inventory.length} />
        </div>
      )}

      {/* TAB CONTENT: INVENTORY */}
      <div className={activeTab === 'inventory' ? 'p-6' : 'hidden'}>

        {/* Category Filters (Sub-tabs) */}
        <div className="flex items-center justify-between border-b border-gray-200 mb-6" >
          <div className="flex">
            {([
              { key: 'all', label: 'All Items', count: categoryCounts.all },
              { key: 'floral', label: 'Floral', count: categoryCounts.floral },
              { key: 'home', label: 'Home Decor', count: categoryCounts.home },
            ] as const).map(tab => (
              <button
                key={tab.key}
                onClick={() => setCategoryFilter(tab.key)}
                className={`px-4 py-3 text-sm font-light border-b-2 transition-colors ${categoryFilter === tab.key
                  ? 'border-[#1E3A5F] text-gray-900'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
                  }`}
              >
                {tab.label}
                <span className="ml-1.5 text-xs text-gray-400">({tab.count})</span>
              </button>
            ))}
          </div>
          {addInventoryItems && (
            <button
              onClick={() => setShowImportModal(true)}
              className="px-4 py-2 bg-[#E8E8E8] text-black text-sm font-light rounded hover:bg-gray-300 transition-colors flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
              Import Melrose CSV
            </button>
          )}
          {
            onLoadCsvLookup && (
              <label className="px-4 py-2 bg-blue-50 text-blue-700 text-sm font-medium rounded hover:bg-blue-100 transition-colors flex items-center gap-2 cursor-pointer border border-blue-200">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2 1 3 3 3h10c2 0 3-1 3-3V7M8 4h8l1 3H7L8 4z" />
                </svg>
                {csvLookupCount && csvLookupCount > 0
                  ? `📋 ${csvLookupCount.toLocaleString()} in Lookup`
                  : 'Load CSV for Lookup'
                }
                <input
                  type="file"
                  accept=".csv"
                  onChange={handleLoadCsvForLookup}
                  className="hidden"
                />
              </label>
            )
          }
          {
            importStaging && importStaging.length > 0 && (
              <button
                onClick={() => setShowStaging(!showStaging)}
                className={`px-4 py-2 text-sm font-medium rounded transition-colors flex items-center gap-2 ${showStaging
                  ? 'bg-orange-500 text-white'
                  : 'bg-orange-100 text-orange-700 border border-orange-300 hover:bg-orange-200'
                  }`}
              >
                📥 Staging ({importStaging.length})
              </button>
            )
          }
        </div >

        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div>
            <h2 className="text-2xl font-serif text-gray-800">
              {categoryFilter === 'home' ? 'Home Decor Inventory' : categoryFilter === 'floral' ? 'Floral Inventory' : 'Inventory Dashboard'}
            </h2>
            <p className="text-gray-500 text-sm mt-1">
              {filteredInventory.length} of {inventory.length} items
            </p>
          </div>
        </div>

        {/* Import Modal */}
        {
          showImportModal && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
              <div className="bg-white rounded-lg shadow-xl max-w-lg w-full">
                <div className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-xl font-light text-gray-900">Import Melrose Inventory</h3>
                    <button
                      onClick={() => setShowImportModal(false)}
                      className="text-gray-400 hover:text-gray-600"
                    >
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                  <MelroseCsvImport
                    onImport={handleCsvImport}
                    existingSkus={existingSkus}
                  />
                </div>
              </div>
            </div>
          )
        }

        {/* Search and Filters */}
        <div className="mb-6 space-y-3">
          {/* Search bar */}
          <div className="relative">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by name, emotion, or meaning..."
              className="w-full p-3 pl-10 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-gray-400 focus:outline-none"
            />
            <svg className="w-5 h-5 absolute left-3 top-3.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-3.5 text-gray-400 hover:text-gray-600"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>

          {/* Filter buttons */}
          <div className="flex flex-wrap gap-2">
            {/* Type filters */}
            <div className="flex rounded-lg overflow-hidden border">
              {(['all', 'floral', 'greenery', 'accent'] as FilterType[]).map(type => (
                <button
                  key={type}
                  onClick={() => setTypeFilter(type)}
                  className={`px-3 py-1.5 text-sm transition-colors ${typeFilter === type
                    ? 'bg-gray-800 text-white'
                    : 'bg-white text-gray-600 hover:bg-gray-100'
                    }`}
                >
                  {type === 'all' ? 'All' : type.charAt(0).toUpperCase() + type.slice(1)}
                  <span className="ml-1 text-xs opacity-70">({counts[type]})</span>
                </button>
              ))}
            </div>

            {/* Availability filter */}
            <select
              value={availabilityFilter}
              onChange={(e) => setAvailabilityFilter(e.target.value as AvailabilityFilter)}
              className="px-3 py-1.5 text-sm border rounded-lg bg-white text-gray-600"
            >
              <option value="all">All Status</option>
              <option value="available">Available</option>
              <option value="unavailable">Unavailable</option>
            </select>

            {/* Season filter */}
            {allSeasons.length > 0 && (
              <select
                value={seasonFilter}
                onChange={(e) => setSeasonFilter(e.target.value)}
                className="px-3 py-1.5 text-sm border rounded-lg bg-white text-gray-600"
              >
                <option value="all">All Seasons</option>
                {allSeasons.map(season => (
                  <option key={season} value={season}>{season}</option>
                ))}
              </select>
            )}

            {/* Structure filter (bases vs botanicals) */}
            <select
              value={structureFilter}
              onChange={(e) => setStructureFilter(e.target.value as StructureFilter)}
              className="px-3 py-1.5 text-sm border rounded-lg bg-white text-gray-600"
            >
              <option value="all">All Items ({structureCounts.all})</option>
              <option value="base">Wreath Bases ({structureCounts.base})</option>
              <option value="botanical">Botanicals ({structureCounts.botanical})</option>
            </select>
          </div>
        </div>

        {/* Bulk Actions Bar */}
        {
          (filteredInventory.length > 0 || selectedItemIds.size > 0) && (
            <div className="mb-4 p-3 bg-gray-50 rounded-lg border flex items-center justify-between">
              <div className="flex items-center gap-3">
                <button
                  onClick={selectedItemIds.size === filteredInventory.length && filteredInventory.length > 0 ? clearSelection : selectAllFiltered}
                  className="flex items-center gap-2 px-3 py-1.5 text-sm border rounded-lg bg-white text-gray-700 hover:bg-gray-100"
                >
                  <input
                    type="checkbox"
                    checked={selectedItemIds.size > 0 && selectedItemIds.size === filteredInventory.length}
                    readOnly
                    className="w-4 h-4 rounded border-gray-300"
                  />
                  {selectedItemIds.size === filteredInventory.length && filteredInventory.length > 0 ? 'Deselect All' : 'Select All'}
                </button>
                {selectedItemIds.size > 0 && (
                  <span className="text-sm text-gray-600">
                    {selectedItemIds.size} item{selectedItemIds.size !== 1 ? 's' : ''} selected
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                {selectedItemIds.size > 0 && (
                  <button
                    onClick={() => setShowDeleteConfirm('selected')}
                    className="px-3 py-1.5 text-sm bg-red-500 text-white rounded-lg hover:bg-red-600 flex items-center gap-1"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                    Delete Selected
                  </button>
                )}
                <button
                  onClick={() => setShowDeleteConfirm('all')}
                  className="px-3 py-1.5 text-sm border border-red-300 text-red-600 rounded-lg hover:bg-red-50 flex items-center gap-1"
                >
                  Delete All ({inventory.length})
                </button>
              </div>
            </div>
          )
        }

        {/* STAGING AREA - Products waiting for tagging */}
        {
          showStaging && importStaging && importStaging.length > 0 && (
            <div className="mb-8 p-4 bg-orange-50 border border-orange-200 rounded-lg">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-orange-800">
                  📥 Import Staging ({importStaging.length} items)
                </h3>
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      if (onApproveStaging && importStaging.length > 0) {
                        onApproveStaging(importStaging);
                      }
                    }}
                    className="px-4 py-2 bg-green-600 text-white text-sm font-medium rounded hover:bg-green-700 transition-colors"
                  >
                    ✅ Approve All to Inventory
                  </button>
                  <button
                    onClick={() => setShowStaging(false)}
                    className="px-3 py-2 text-gray-600 hover:text-gray-800"
                  >
                    ✕
                  </button>
                </div>
              </div>
              <p className="text-sm text-orange-700 mb-4">
                💡 These products need image tagging before they can be used in designs.
                Click an item to tag it, or approve all to add to inventory.
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
                {importStaging.map(item => (
                  <div
                    key={item.id}
                    className="bg-white rounded-lg shadow-sm border border-orange-200 overflow-hidden hover:shadow-md transition-shadow"
                  >
                    <div className="aspect-square bg-gray-100 relative">
                      {item.imageUrl ? (
                        <img
                          src={item.imageUrl}
                          alt={item.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-400">
                          No Image
                        </div>
                      )}
                      <span className="absolute top-1 right-1 bg-orange-500 text-white text-xs px-1.5 py-0.5 rounded">
                        ⏳
                      </span>
                    </div>
                    <div className="p-2">
                      <p className="text-xs font-medium text-gray-800 truncate" title={item.name}>
                        {item.name}
                      </p>
                      <p className="text-xs text-gray-500 truncate">
                        {item.melroseInfo?.vendorSku || 'No SKU'}
                      </p>
                      <div className="flex gap-1 mt-2">
                        <button
                          onClick={() => {
                            if (onApproveStaging) {
                              onApproveStaging([item]);
                            }
                          }}
                          className="flex-1 text-xs py-1 bg-green-100 text-green-700 rounded hover:bg-green-200"
                        >
                          ✓
                        </button>
                        <button
                          onClick={() => {
                            if (onRemoveFromStaging) {
                              onRemoveFromStaging(item.id);
                            }
                          }}
                          className="flex-1 text-xs py-1 bg-red-100 text-red-700 rounded hover:bg-red-200"
                        >
                          ✕
                        </button>
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setIsolatingItem(item);
                        }}
                        className="w-full mt-2 text-xs py-1 bg-purple-100 text-purple-700 rounded hover:bg-purple-200 flex items-center justify-center gap-1"
                      >
                        ✂️ Isolate Stem
                      </button>
                      {/* Image Replacement */}
                      <label className="w-full mt-1 text-xs py-1 bg-blue-50 text-blue-600 rounded hover:bg-blue-100 flex items-center justify-center gap-1 cursor-pointer border border-blue-200 transition-colors">
                        <span>🖼️ Replace Image</span>
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onClick={(e) => e.stopPropagation()}
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file && onUpdateStagingItem) {
                              handleImageUpload(file, item, onUpdateStagingItem);
                            }
                          }}
                        />
                      </label>
                      {/* Full Tagger Button */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          if (onSendToTagger) onSendToTagger(item);
                        }}
                        className="w-full mt-2 text-xs py-1 bg-indigo-100 text-indigo-700 rounded hover:bg-indigo-200 flex items-center justify-center gap-1"
                      >
                        🎨 Full Tag & Edit
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )
        }
        {
          inventory.length === 0 ? (
            <p className="text-center text-gray-500 py-10">Your inventory is empty. Go to the "Tagger" to add your first botanical.</p>
          ) : filteredInventory.length === 0 ? (
            <p className="text-center text-gray-500 py-10">No botanicals match your filters.</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {filteredInventory.map(item => (
                <div
                  key={item.id}
                  className={`rounded-lg shadow-sm border flex flex-col cursor-pointer hover:shadow-md transition-shadow ${!item.isAvailable ? 'opacity-60' : ''}`}
                  onClick={() => setViewingItem(item)}
                >
                  <div className="aspect-square w-full checkered-bg rounded-t-lg p-2 relative">
                    {item.imageUrl ? (
                      <img src={item.processedImageUrl || item.thumbUrl || item.imageUrl} alt={item.name} className="w-full h-full object-contain" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-400">
                        <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                      </div>
                    )}
                    {/* Selection checkbox */}
                    <input
                      type="checkbox"
                      checked={selectedItemIds.has(item.id)}
                      onChange={(e) => {
                        e.stopPropagation();
                        toggleItemSelection(item.id);
                      }}
                      onClick={(e) => e.stopPropagation()}
                      className="absolute top-2 left-2 w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer z-10"
                    />
                    {/* Category badge */}
                    <span className={`absolute top-2 left-9 px-2 py-0.5 text-[10px] uppercase tracking-wide rounded-full ${item.inventoryCategory === 'home' ? 'bg-[#1E3A5F] text-white' : 'bg-gray-200 text-gray-700'
                      }`}>
                      {item.inventoryCategory === 'home' ? item.melroseInfo?.productCategory || 'Home' : item.type}
                    </span>
                    {/* Base indicator */}
                    {item.structureRole === 'base' && (
                      <span className="absolute top-2 right-2 px-2 py-0.5 text-[10px] bg-amber-700 text-white rounded-full font-medium">
                        BASE
                      </span>
                    )}
                    {/* Spray indicator */}
                    {item.sprayProfile?.isSpray && item.structureRole !== 'base' && (
                      <span className="absolute top-2 right-2 px-2 py-0.5 text-[10px] bg-gray-800 text-white rounded-full">
                        Spray ({item.sprayProfile.totalElements})
                      </span>
                    )}
                    {/* Stock indicator for Melrose items */}
                    {item.melroseInfo && (
                      <span className={`absolute bottom-2 right-2 px-2 py-0.5 text-[10px] rounded-full ${item.melroseInfo.availability > 10 ? 'bg-gray-800 text-white' :
                        item.melroseInfo.availability > 0 ? 'bg-amber-500 text-white' : 'bg-red-500 text-white'
                        }`}>
                        {item.melroseInfo.availability > 0 ? `${item.melroseInfo.availability} in stock` : 'Out of stock'}
                      </span>
                    )}
                  </div>
                  <div className="p-3 flex-grow flex flex-col justify-between">
                    <div>
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <div className="flex flex-col flex-grow">
                          <p className="font-semibold text-gray-800 text-sm line-clamp-2">{item.name}</p>
                          {item.melroseInfo ? (
                            <div className="flex items-center gap-2 text-xs text-gray-500">
                              <span>SKU: {item.melroseInfo.vendorSku}</span>
                              {item.melroseInfo.setQuantity > 1 && (
                                <span className="text-gray-400">Set of {item.melroseInfo.setQuantity}</span>
                              )}
                            </div>
                          ) : (
                            <p className="text-xs text-gray-500">{item.dimensions.widthInches}" × {item.dimensions.heightInches}"</p>
                          )}
                        </div>
                        {/* Dominant colors */}
                        {item.dominantColors && item.dominantColors.length > 0 && (
                          <div className="flex gap-0.5 flex-shrink-0">
                            {item.dominantColors.slice(0, 3).map((color, i) => (
                              <div
                                key={i}
                                className="w-4 h-4 rounded border border-gray-200"
                                style={{ backgroundColor: color }}
                              />
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Pricing for Melrose items */}
                      {item.melroseInfo && (
                        <div className="my-2 py-2 border-t border-b flex items-center justify-between">
                          <div>
                            <span className="text-lg font-light text-gray-900">${item.melroseInfo.dropshipFreightIncludedPrice.toFixed(2)}</span>
                            <span className="text-xs text-gray-400 ml-2 line-through">${item.melroseInfo.msrp.toFixed(2)}</span>
                          </div>
                          <div className="text-xs text-gray-500">
                            {Math.round((1 - item.melroseInfo.dropshipFreightIncludedPrice / item.melroseInfo.msrp) * 100)}% margin
                          </div>
                        </div>
                      )}

                      {/* Emotional dimensions for floral items */}
                      {!item.melroseInfo && (
                        <div className="my-2 py-2 border-t border-b">
                          <DimensionGraph dimensions={item.emotionalDimensions || defaultEmotionalDimensions} />
                        </div>
                      )}

                      <div className="flex flex-wrap gap-1">
                        {(item.emotionTags || []).slice(0, 3).map(tag => (
                          <span key={tag} className="text-[10px] bg-gray-200 text-gray-700 px-1.5 py-0.5 rounded-full">{tag}</span>
                        ))}
                        {(item.emotionTags?.length || 0) > 3 && (
                          <span className="text-[10px] text-gray-500">+{(item.emotionTags?.length || 0) - 3}</span>
                        )}
                      </div>
                    </div>
                    <div className="mt-3 pt-2 border-t flex justify-between items-center text-xs" onClick={e => e.stopPropagation()}>
                      <button
                        onClick={() => toggleAvailability(item.id)}
                        className={`px-2 py-1 rounded text-xs ${item.isAvailable ? 'bg-gray-100 text-gray-700' : 'bg-red-50 text-red-600'}`}
                      >
                        {item.isAvailable ? 'Available' : 'Unavailable'}
                      </button>
                      <div className="flex gap-1">
                        {/* AI Enhance button - only for home decor items */}
                        {item.melroseInfo && (
                          <button
                            onClick={() => handleEnhanceWithAI(item)}
                            disabled={enhancingItemId === item.id}
                            className={`p-1.5 rounded transition-colors ${enhancingItemId === item.id
                              ? 'bg-amber-100 cursor-wait'
                              : 'hover:bg-amber-50'
                              }`}
                            title="Enhance with AI Vision"
                          >
                            {enhancingItemId === item.id ? (
                              <svg className="w-4 h-4 text-amber-600 animate-spin" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                              </svg>
                            ) : (
                              <svg className="w-4 h-4 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                              </svg>
                            )}
                          </button>
                        )}
                        <button
                          onClick={() => { setEditingItem(item); }}
                          className="p-1.5 hover:bg-gray-100 rounded"
                          title="Edit"
                        >
                          <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                          </svg>
                        </button>
                        <button
                          onClick={() => removeInventoryItem(item.id)}
                          className="p-1.5 hover:bg-red-50 rounded"
                          title="Delete"
                        >
                          <svg className="w-4 h-4 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )
        }

        <EditModal />

        {
          viewingItem && (
            <ProductDetailModal
              item={viewingItem}
              onClose={() => setViewingItem(null)}
              onEdit={() => {
                setEditingItem(viewingItem);
                setViewingItem(null);
              }}
            />
          )
        }

        {/* Delete Confirmation Modal */}
        {
          showDeleteConfirm && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
              <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                    <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">
                      {showDeleteConfirm === 'all' ? 'Delete All Items?' : 'Delete Selected Items?'}
                    </h3>
                    <p className="text-sm text-gray-500">
                      {showDeleteConfirm === 'all'
                        ? `This will permanently delete all ${inventory.length} items from your inventory.`
                        : `This will permanently delete ${selectedItemIds.size} selected item${selectedItemIds.size !== 1 ? 's' : ''}.`}
                    </p>
                  </div>
                </div>
                <p className="text-sm text-red-600 mb-4">This action cannot be undone.</p>
                <div className="flex justify-end gap-3">
                  <button
                    onClick={() => setShowDeleteConfirm(null)}
                    className="px-4 py-2 text-sm text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={showDeleteConfirm === 'all' ? handleDeleteAll : handleDeleteSelected}
                    className="px-4 py-2 text-sm text-white bg-red-600 rounded-lg hover:bg-red-700"
                  >
                    {showDeleteConfirm === 'all' ? 'Delete All' : 'Delete Selected'}
                  </button>
                </div>
              </div>
            </div>
          )
        }
        {/* Stem Isolation Modal with Error Boundary */}
        {
          isolatingItem && (
            <SimpleErrorBoundary onClose={() => setIsolatingItem(null)}>
              <StemIsolationModal
                item={isolatingItem}
                onClose={() => setIsolatingItem(null)}
              />
            </SimpleErrorBoundary>
          )
        }

      </div>

      {/* MODALS (Global) */}
      <EditModal />

      {
        viewingItem && (
          <ProductDetailModal
            item={viewingItem}
            onClose={() => setViewingItem(null)}
            onEdit={() => {
              setEditingItem(viewingItem);
              setViewingItem(null);
            }}
          />
        )
      }
    </div >
  );
};
