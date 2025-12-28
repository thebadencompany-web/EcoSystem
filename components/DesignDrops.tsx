import React, { useState, useMemo, useCallback } from 'react';
import type { InventoryItem, DesignDrop, DesignDropItem, DropStatus } from '../types';
import type { DropTheme, PrimaryEmotion } from '../lib/emotionEngine/emotionTypes';
import { PRESET_DROP_THEMES, AESTHETIC_STYLE_LABELS, PRIMARY_EMOTIONS } from '../lib/emotionEngine/emotionTypes';
import { curateDropFromTheme, type CurationResult } from '../lib/dropCurator';

interface DesignDropsProps {
  inventory: InventoryItem[];
  drops: DesignDrop[];
  addDrop: (drop: Omit<DesignDrop, 'id' | 'createdAt' | 'updatedAt'>) => void;
  updateDrop: (drop: DesignDrop) => void;
  removeDrop: (id: string) => void;
  generateDropStory?: (items: InventoryItem[], emotionTags: string[]) => Promise<{ story: string; names: string[] }>;
}

const STATUS_COLORS: Record<DropStatus, string> = {
  draft: 'bg-gray-200 text-gray-700',
  scheduled: 'bg-amber-100 text-amber-700',
  published: 'bg-gray-800 text-white',
  sold: 'bg-gray-600 text-white',
  archived: 'bg-gray-100 text-gray-500',
};

export const DesignDrops: React.FC<DesignDropsProps> = ({
  inventory,
  drops,
  addDrop,
  updateDrop,
  removeDrop,
  generateDropStory,
}) => {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingDrop, setEditingDrop] = useState<DesignDrop | null>(null);
  const [selectedItems, setSelectedItems] = useState<DesignDropItem[]>([]);
  const [dropName, setDropName] = useState('');
  const [dropDescription, setDropDescription] = useState('');
  const [dropStory, setDropStory] = useState('');
  const [dropPlatform, setDropPlatform] = useState<'whatnot' | 'facebook' | 'both'>('both');
  const [isGenerating, setIsGenerating] = useState(false);
  const [suggestedNames, setSuggestedNames] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<DropStatus | 'all'>('all');

  // Theme-based auto-curation state
  const [selectedTheme, setSelectedTheme] = useState<(typeof PRESET_DROP_THEMES)[0] | null>(null);
  const [isCurating, setIsCurating] = useState(false);
  const [curationResult, setCurationResult] = useState<CurationResult | null>(null);
  const [targetPieceCount, setTargetPieceCount] = useState(12);

  const homeDecorItems = useMemo(() =>
    inventory.filter(item => item.inventoryCategory === 'home' && item.melroseInfo),
    [inventory]);

  const filteredDrops = useMemo(() => {
    let result = drops;
    if (statusFilter !== 'all') {
      result = result.filter(d => d.status === statusFilter);
    }
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(d =>
        d.name.toLowerCase().includes(query) ||
        d.emotionTags.some(t => t.toLowerCase().includes(query))
      );
    }
    return result;
  }, [drops, statusFilter, searchQuery]);

  const calculateTotals = useCallback((items: DesignDropItem[]) => {
    let totalPrice = 0;
    let totalMsrp = 0;
    items.forEach(item => {
      const invItem = inventory.find(i => i.id === item.inventoryId);
      if (invItem?.melroseInfo) {
        const price = item.priceOverride ?? invItem.melroseInfo.dropshipFreightIncludedPrice;
        totalPrice += price * item.quantity;
        totalMsrp += invItem.melroseInfo.msrp * item.quantity;
      }
    });
    return { totalPrice, totalMsrp, profit: totalMsrp - totalPrice };
  }, [inventory]);

  const collectEmotionTags = useCallback((items: DesignDropItem[]) => {
    const tags = new Set<string>();
    items.forEach(item => {
      const invItem = inventory.find(i => i.id === item.inventoryId);
      invItem?.emotionTags?.forEach(t => tags.add(t));
    });
    return Array.from(tags);
  }, [inventory]);

  const handleAddItem = (item: InventoryItem) => {
    const existing = selectedItems.find(i => i.inventoryId === item.id);
    if (existing) {
      setSelectedItems(prev =>
        prev.map(i => i.inventoryId === item.id ? { ...i, quantity: i.quantity + 1 } : i)
      );
    } else {
      setSelectedItems(prev => [...prev, { inventoryId: item.id, quantity: 1 }]);
    }
  };

  const handleRemoveItem = (inventoryId: string) => {
    setSelectedItems(prev => prev.filter(i => i.inventoryId !== inventoryId));
  };

  const handleQuantityChange = (inventoryId: string, quantity: number) => {
    if (quantity < 1) {
      handleRemoveItem(inventoryId);
    } else {
      setSelectedItems(prev =>
        prev.map(i => i.inventoryId === inventoryId ? { ...i, quantity } : i)
      );
    }
  };

  const handleGenerateStory = async () => {
    if (!generateDropStory || selectedItems.length === 0) return;
    setIsGenerating(true);
    try {
      const items = selectedItems.map(si => inventory.find(i => i.id === si.inventoryId)!).filter(Boolean);
      const emotionTags = collectEmotionTags(selectedItems);
      const { story, names } = await generateDropStory(items, emotionTags);
      setDropStory(story);
      setSuggestedNames(names);
    } catch (err) {
      console.error('Failed to generate story:', err);
    } finally {
      setIsGenerating(false);
    }
  };

  // Auto-curate products based on selected theme
  const handleAutoCurate = () => {
    if (!selectedTheme) return;
    setIsCurating(true);

    try {
      // Create a full theme object with id
      const themeWithId: DropTheme = {
        ...selectedTheme,
        id: `theme-${Date.now()}`,
      };

      // Run the curation algorithm
      const result = curateDropFromTheme(themeWithId, homeDecorItems, targetPieceCount);
      setCurationResult(result);

      // Convert scored products to drop items
      const newItems: DesignDropItem[] = result.selectedProducts.map(scored => ({
        inventoryId: scored.inventoryId,
        quantity: 1,
      }));

      setSelectedItems(newItems);
      setDropName(selectedTheme.name);
      setDropDescription(selectedTheme.story);
      setDropStory(selectedTheme.story);
      setSuggestedNames([
        selectedTheme.name,
        `${selectedTheme.primaryEmotion.charAt(0).toUpperCase() + selectedTheme.primaryEmotion.slice(1)} Moments`,
        `The ${AESTHETIC_STYLE_LABELS[selectedTheme.aestheticStyle]} Collection`,
      ]);
    } catch (err) {
      console.error('Auto-curation failed:', err);
    } finally {
      setIsCurating(false);
    }
  };

  const handleSaveDrop = () => {
    if (!dropName.trim() || selectedItems.length === 0) return;
    const totals = calculateTotals(selectedItems);
    const emotionTags = collectEmotionTags(selectedItems);

    if (editingDrop) {
      updateDrop({
        ...editingDrop,
        name: dropName,
        description: dropDescription,
        story: dropStory,
        emotionTags,
        items: selectedItems,
        ...totals,
        platform: dropPlatform,
        suggestedNames,
        updatedAt: new Date().toISOString(),
      });
    } else {
      addDrop({
        name: dropName,
        description: dropDescription,
        story: dropStory,
        emotionTags,
        items: selectedItems,
        ...totals,
        status: 'draft',
        platform: dropPlatform,
        suggestedNames,
      });
    }
    resetForm();
  };

  const resetForm = () => {
    setShowCreateModal(false);
    setEditingDrop(null);
    setSelectedItems([]);
    setDropName('');
    setDropDescription('');
    setDropStory('');
    setSuggestedNames([]);
    setDropPlatform('both');
    // Reset theme state
    setSelectedTheme(null);
    setCurationResult(null);
    setTargetPieceCount(12);
  };

  const handleEditDrop = (drop: DesignDrop) => {
    setEditingDrop(drop);
    setSelectedItems(drop.items);
    setDropName(drop.name);
    setDropDescription(drop.description);
    setDropStory(drop.story);
    setSuggestedNames(drop.suggestedNames || []);
    setDropPlatform(drop.platform);
    setShowCreateModal(true);
  };

  const getItemDetails = (inventoryId: string) => inventory.find(i => i.id === inventoryId);

  return (
    <div className="bg-white p-6 rounded-lg shadow-md animate-fade-in">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-serif text-gray-800">Design Drops</h2>
          <p className="text-gray-500 text-sm mt-1">
            Create curated collections for Whatnot and Facebook
          </p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="px-4 py-2 bg-[#E8E8E8] text-black text-sm font-light rounded hover:bg-gray-300 transition-colors flex items-center gap-2"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Create Drop
        </button>
      </div>

      <div className="mb-6 flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search drops..."
            className="w-full p-2 pl-9 border border-gray-300 rounded-lg text-sm"
          />
          <svg className="w-4 h-4 absolute left-3 top-2.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>
        <select
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value as DropStatus | 'all')}
          className="px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white"
        >
          <option value="all">All Status</option>
          <option value="draft">Draft</option>
          <option value="scheduled">Scheduled</option>
          <option value="published">Published</option>
          <option value="sold">Sold</option>
          <option value="archived">Archived</option>
        </select>
      </div>

      {filteredDrops.length === 0 ? (
        <div className="text-center py-16">
          <svg className="w-16 h-16 mx-auto text-gray-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
          </svg>
          <p className="text-gray-500 mb-2">No design drops yet</p>
          <p className="text-gray-400 text-sm">Create your first curated collection to sell on Whatnot or Facebook</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredDrops.map(drop => (
            <div
              key={drop.id}
              className="border rounded-lg overflow-hidden hover:shadow-md transition-shadow cursor-pointer"
              onClick={() => handleEditDrop(drop)}
            >
              <div className="aspect-video bg-gray-100 relative flex items-center justify-center overflow-hidden">
                {drop.items.slice(0, 4).map((item, idx) => {
                  const invItem = getItemDetails(item.inventoryId);
                  return invItem?.imageUrl ? (
                    <img
                      key={item.inventoryId}
                      src={invItem.imageUrl}
                      alt=""
                      className="absolute w-1/2 h-1/2 object-contain"
                      style={{
                        top: idx < 2 ? '0' : '50%',
                        left: idx % 2 === 0 ? '0' : '50%',
                      }}
                    />
                  ) : null;
                })}
                <span className={`absolute top-2 right-2 px-2 py-0.5 text-[10px] rounded-full ${STATUS_COLORS[drop.status]}`}>
                  {drop.status}
                </span>
              </div>
              <div className="p-4">
                <h3 className="font-medium text-gray-900 mb-1">{drop.name}</h3>
                <p className="text-xs text-gray-500 mb-2 line-clamp-2">{drop.description || 'No description'}</p>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">{drop.items.length} items</span>
                  <span className="font-medium text-gray-900">${drop.totalMsrp.toFixed(2)}</span>
                </div>
                <div className="flex flex-wrap gap-1 mt-2">
                  {drop.emotionTags.slice(0, 3).map(tag => (
                    <span key={tag} className="text-[10px] bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded-full">
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
            <div className="p-4 border-b flex items-center justify-between">
              <h3 className="text-xl font-light text-gray-900">
                {editingDrop ? 'Edit Drop' : 'Create Design Drop'}
              </h3>
              <button onClick={resetForm} className="text-gray-400 hover:text-gray-600">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Theme-based Auto-Curate Section */}
            {!editingDrop && (
              <div className="p-4 bg-gradient-to-r from-amber-50 to-orange-50 border-b">
                <div className="flex items-center gap-2 mb-3">
                  <svg className="w-5 h-5 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                  </svg>
                  <h4 className="text-sm font-medium text-amber-800">AI-Powered Curation</h4>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  {/* Theme Selector */}
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">Select Theme</label>
                    <select
                      value={selectedTheme?.name || ''}
                      onChange={(e) => {
                        const theme = PRESET_DROP_THEMES.find(t => t.name === e.target.value);
                        setSelectedTheme(theme || null);
                      }}
                      className="w-full p-2 text-sm border border-amber-200 rounded-lg bg-white focus:ring-2 focus:ring-amber-300 focus:border-amber-300"
                    >
                      <option value="">Choose a mood theme...</option>
                      {PRESET_DROP_THEMES.map(theme => (
                        <option key={theme.name} value={theme.name}>
                          {theme.name} ({theme.primaryEmotion})
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Target Piece Count */}
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">
                      Target Pieces: <span className="font-medium">{targetPieceCount}</span>
                    </label>
                    <input
                      type="range"
                      min="6"
                      max="20"
                      value={targetPieceCount}
                      onChange={(e) => setTargetPieceCount(parseInt(e.target.value))}
                      className="w-full h-2 bg-amber-200 rounded-lg appearance-none cursor-pointer"
                    />
                  </div>
                </div>

                {/* Theme Details & Auto-Curate Button */}
                {selectedTheme && (
                  <div className="mt-3 flex items-start gap-4">
                    <div className="flex-1">
                      <p className="text-xs text-gray-600 italic line-clamp-2">"{selectedTheme.memoryTrigger}"</p>
                      <div className="flex gap-1 mt-1">
                        <span className="text-[10px] px-1.5 py-0.5 bg-amber-100 text-amber-700 rounded-full">
                          {selectedTheme.primaryEmotion}
                        </span>
                        <span className="text-[10px] px-1.5 py-0.5 bg-gray-100 text-gray-600 rounded-full">
                          {AESTHETIC_STYLE_LABELS[selectedTheme.aestheticStyle]}
                        </span>
                      </div>
                    </div>
                    <button
                      onClick={handleAutoCurate}
                      disabled={isCurating}
                      className="px-4 py-2 bg-amber-500 text-white text-sm font-medium rounded-lg hover:bg-amber-600 disabled:opacity-50 flex items-center gap-2 transition-colors"
                    >
                      {isCurating ? (
                        <>
                          <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                          </svg>
                          Curating...
                        </>
                      ) : (
                        <>
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                          </svg>
                          Auto-Curate
                        </>
                      )}
                    </button>
                  </div>
                )}

                {/* Curation Results Summary */}
                {curationResult && (
                  <div className="mt-3 p-2 bg-white rounded-lg border border-amber-200">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-gray-600">
                        Selected {curationResult.selectedProducts.length} products
                      </span>
                      <span className="text-amber-600 font-medium">
                        Match Score: {Math.round(curationResult.confidenceScore * 100)}%
                      </span>
                    </div>
                    <div className="flex gap-2 mt-1 text-[10px] text-gray-500">
                      <span>Range: ${curationResult.priceRange.min.toFixed(0)} - ${curationResult.priceRange.max.toFixed(0)}</span>
                      <span>•</span>
                      <span>Total: ${curationResult.totalValue.toFixed(2)}</span>
                    </div>
                  </div>
                )}
              </div>
            )}

            <div className="flex-1 overflow-hidden flex">
              <div className="w-1/2 border-r p-4 overflow-y-auto">
                <h4 className="text-sm font-medium text-gray-700 mb-3">Available Items ({homeDecorItems.length})</h4>
                <div className="space-y-2">
                  {homeDecorItems.map(item => {
                    const isSelected = selectedItems.some(si => si.inventoryId === item.id);
                    return (
                      <div
                        key={item.id}
                        onClick={() => !isSelected && handleAddItem(item)}
                        className={`flex items-center gap-3 p-2 rounded-lg border transition-colors ${isSelected ? 'bg-gray-100 border-gray-300 opacity-50' : 'hover:bg-gray-50 border-gray-200 cursor-pointer'
                          }`}
                      >
                        <div className="w-12 h-12 bg-gray-100 rounded flex-shrink-0 flex items-center justify-center">
                          {item.imageUrl ? (
                            <img src={item.imageUrl} alt="" className="w-full h-full object-contain" />
                          ) : (
                            <svg className="w-6 h-6 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">{item.name}</p>
                          <p className="text-xs text-gray-500">${item.melroseInfo?.dropshipFreightIncludedPrice.toFixed(2)}</p>
                        </div>
                        {!isSelected && (
                          <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                          </svg>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="w-1/2 p-4 overflow-y-auto">
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Drop Name</label>
                    <input
                      type="text"
                      value={dropName}
                      onChange={e => setDropName(e.target.value)}
                      placeholder="e.g., Cozy Autumn Collection"
                      className="w-full p-2 border border-gray-300 rounded-lg text-sm"
                    />
                    {suggestedNames.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {suggestedNames.map(name => (
                          <button
                            key={name}
                            onClick={() => setDropName(name)}
                            className="text-xs px-2 py-1 bg-gray-100 text-gray-600 rounded hover:bg-gray-200"
                          >
                            {name}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                    <textarea
                      value={dropDescription}
                      onChange={e => setDropDescription(e.target.value)}
                      placeholder="Brief description for listings..."
                      className="w-full p-2 border border-gray-300 rounded-lg text-sm h-20 resize-none"
                    />
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-sm font-medium text-gray-700">Story</label>
                      {generateDropStory && (
                        <button
                          onClick={handleGenerateStory}
                          disabled={isGenerating || selectedItems.length === 0}
                          className="text-xs px-2 py-1 bg-[#E8E8E8] text-black rounded hover:bg-gray-300 disabled:opacity-50"
                        >
                          {isGenerating ? 'Generating...' : 'Generate with AI'}
                        </button>
                      )}
                    </div>
                    <textarea
                      value={dropStory}
                      onChange={e => setDropStory(e.target.value)}
                      placeholder="The story behind this collection..."
                      className="w-full p-2 border border-gray-300 rounded-lg text-sm h-32 resize-none"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Platform</label>
                    <div className="flex gap-2">
                      {(['whatnot', 'facebook', 'both'] as const).map(p => (
                        <button
                          key={p}
                          onClick={() => setDropPlatform(p)}
                          className={`px-3 py-1.5 text-sm rounded-lg border transition-colors ${dropPlatform === p ? 'bg-gray-800 text-white border-gray-800' : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'
                            }`}
                        >
                          {p === 'both' ? 'Both' : p.charAt(0).toUpperCase() + p.slice(1)}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Selected Items ({selectedItems.length})
                    </label>
                    {selectedItems.length === 0 ? (
                      <p className="text-sm text-gray-400 text-center py-4 border border-dashed rounded-lg">
                        Click items on the left to add them
                      </p>
                    ) : (
                      <div className="space-y-2">
                        {selectedItems.map(si => {
                          const item = getItemDetails(si.inventoryId);
                          if (!item) return null;
                          return (
                            <div key={si.inventoryId} className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg">
                              <div className="w-10 h-10 bg-white rounded flex-shrink-0">
                                {item.imageUrl ? (
                                  <img src={item.imageUrl} alt="" className="w-full h-full object-contain" />
                                ) : null}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm text-gray-900 truncate">{item.name}</p>
                                <p className="text-xs text-gray-500">${item.melroseInfo?.dropshipFreightIncludedPrice.toFixed(2)}</p>
                              </div>
                              <div className="flex items-center gap-1">
                                <button
                                  onClick={() => handleQuantityChange(si.inventoryId, si.quantity - 1)}
                                  className="w-6 h-6 flex items-center justify-center bg-gray-200 rounded text-gray-600 hover:bg-gray-300"
                                >
                                  -
                                </button>
                                <span className="w-6 text-center text-sm">{si.quantity}</span>
                                <button
                                  onClick={() => handleQuantityChange(si.inventoryId, si.quantity + 1)}
                                  className="w-6 h-6 flex items-center justify-center bg-gray-200 rounded text-gray-600 hover:bg-gray-300"
                                >
                                  +
                                </button>
                              </div>
                              <button
                                onClick={() => handleRemoveItem(si.inventoryId)}
                                className="text-gray-400 hover:text-red-500"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {selectedItems.length > 0 && (
                    <div className="bg-gray-50 rounded-lg p-3">
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-gray-600">Your Cost</span>
                        <span className="text-gray-900">${calculateTotals(selectedItems).totalPrice.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-gray-600">Suggested Retail (MSRP)</span>
                        <span className="text-gray-900">${calculateTotals(selectedItems).totalMsrp.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between text-sm font-medium pt-2 border-t">
                        <span className="text-gray-700">Potential Profit</span>
                        <span className="text-gray-900">${calculateTotals(selectedItems).profit.toFixed(2)}</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="p-4 border-t flex justify-between">
              {editingDrop && (
                <button
                  onClick={() => {
                    removeDrop(editingDrop.id);
                    resetForm();
                  }}
                  className="px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg text-sm"
                >
                  Delete Drop
                </button>
              )}
              <div className="flex gap-2 ml-auto">
                <button
                  onClick={resetForm}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg text-sm hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveDrop}
                  disabled={!dropName.trim() || selectedItems.length === 0}
                  className="px-4 py-2 bg-[#E8E8E8] text-black rounded-lg text-sm font-light hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {editingDrop ? 'Update Drop' : 'Create Drop'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
