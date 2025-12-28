// components/InventoryArchive.tsx
import React, { useState, useEffect, useMemo } from 'react';
import { EnhancedLogicEngineOutput, EnhancedFlorosOutput, EmotionalTone, SeasonalContext } from '../types';
import { collection, addDoc, getDocs, deleteDoc, doc, serverTimestamp } from 'firebase/firestore';
import { db, isFirebaseConfigured } from '../services/firebaseConfig';

interface ArchivedItem {
  id: string;
  timestamp: Date;
  type: 'memory' | 'blueprint' | 'arrangement';
  title: string;
  logicOutput?: EnhancedLogicEngineOutput;
  florosOutput?: EnhancedFlorosOutput;
  emotionalTone?: EmotionalTone;
  seasonalContext?: SeasonalContext;
  emotionalTaxonomy: EmotionalTaxonomy;
  gestureLogic: GestureLogic;
  tags: string[];
  manufacturingStatus?: 'concept' | 'validated' | 'ready' | 'produced';
  notes?: string;
  imagePreview?: string;
}

interface EmotionalTaxonomy {
  primaryEmotion: string;
  emotionalFamily: string;
  intensity: number;
  complexity: number;
  resonanceScore: number;
  seasonalAlignment: number;
  seasonalNuance?: string[];
  symbolicTags?: string[];
  gestureLanguage?: { primaryGesture?: string; intensity?: number; family?: string; spatialFlow?: string } | null;
}

interface GestureLogic {
  primaryGesture: string;
  gestureFamily: string;
  spatialFlow: 'radial' | 'linear' | 'cascade' | 'spiral';
  emotionalDirection: 'inward' | 'outward' | 'balanced';
  manufacturingComplexity: 'simple' | 'moderate' | 'complex';
}

interface InventoryArchiveProps {
  currentLogicOutput?: EnhancedLogicEngineOutput;
  currentFlorosOutput?: EnhancedFlorosOutput;
  currentEmotionalTone?: EmotionalTone;
  currentSeasonalContext?: SeasonalContext;
  onSaveItem?: (item: ArchivedItem) => void;
  onLoadItem?: (item: ArchivedItem) => void;
}

export const InventoryArchive: React.FC<InventoryArchiveProps> = ({
  currentLogicOutput,
  currentFlorosOutput,
  currentEmotionalTone,
  currentSeasonalContext,
  onSaveItem,
  onLoadItem
}) => {
  const [archivedItems, setArchivedItems] = useState<ArchivedItem[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [selectedItem, setSelectedItem] = useState<ArchivedItem | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [filterOptions, setFilterOptions] = useState({
    emotionalFamily: 'all',
    gestureFamily: 'all',
    season: 'all',
    manufacturingStatus: 'all',
    sortBy: 'timestamp',
    sortOrder: 'desc' as 'asc' | 'desc'
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list' | 'taxonomy'>('grid');

  // Load archived items from Firestore on mount (extracted so we can retry)
  const loadItems = async () => {
    setLoadError(null);
    console.debug('InventoryArchive.loadItems: isFirebaseConfigured=', isFirebaseConfigured, 'db=', db);
    try {
      const snapshot = await getDocs(collection(db, 'inventory'));
      const items = snapshot.docs.map(docSnap => {
        const data = docSnap.data();
        // Handle Firestore Timestamp, ISO string, or missing values
        let ts: Date;
        if (data.timestamp && typeof (data.timestamp as any).toDate === 'function') {
          ts = (data.timestamp as any).toDate();
        } else if (data.timestamp && typeof data.timestamp === 'string') {
          ts = new Date(data.timestamp);
        } else {
          ts = new Date();
        }

        return {
          id: docSnap.id,
          ...data,
          timestamp: ts
        } as ArchivedItem;
      });

      setArchivedItems(items);

      // Reconcile any locally-saved items (offline fallback) by uploading those not present in Firestore
      try {
        const localRaw = localStorage.getItem('fauxever-inventory-archive');
        if (localRaw) {
          const localItems: any[] = JSON.parse(localRaw).map((it: any) => ({ ...it, timestamp: it.timestamp ? new Date(it.timestamp) : new Date() }));
          // For each local item, upload it if there's no FS item with matching title+timestamp
          for (const lit of localItems) {
            const match = items.find(fi => fi.title === lit.title && fi.timestamp.toISOString() === lit.timestamp.toISOString());
            if (!match) {
              try {
                const ref = await addDoc(collection(db, 'inventory'), { ...lit, timestamp: serverTimestamp() });
                // Update local state with new Firestore id
                setArchivedItems(prev => [{ ...lit, id: ref.id, timestamp: lit.timestamp }, ...prev]);
              } catch (err) {
                console.warn('Failed to reconcile local item to Firestore:', err);
              }
            }
          }
          // Clear local fallback once reconciled
          localStorage.removeItem('fauxever-inventory-archive');
        }
      } catch (err) {
        console.warn('Failed to reconcile local archive:', err);
      }

    } catch (err: any) {
      console.error('Error loading inventory from Firestore, falling back to localStorage:', err);
      setLoadError(String(err?.message || err));
      // Fallback to localStorage
      try {
        const stored = localStorage.getItem('fauxever-inventory-archive');
        if (stored) {
          const items = JSON.parse(stored).map((item: any) => ({ ...item, timestamp: new Date(item.timestamp) }));
          setArchivedItems(items);
        }
      } catch (e) {
        console.error('Failed to load archived items from localStorage as fallback:', e);
      }
    }
  };

  useEffect(() => {
    loadItems();
  }, []);

  // Persisting is handled by Firestore; local state keeps UI in sync.

  // Filter and sort items
  const filteredAndSortedItems = useMemo(() => {
    let filtered = archivedItems.filter(item => {
      const matchesSearch = searchQuery === '' || 
        item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase())) ||
        item.emotionalTaxonomy.primaryEmotion.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesEmotionalFamily = filterOptions.emotionalFamily === 'all' || 
        item.emotionalTaxonomy.emotionalFamily === filterOptions.emotionalFamily;

      const matchesGestureFamily = filterOptions.gestureFamily === 'all' || 
        item.gestureLogic.gestureFamily === filterOptions.gestureFamily;

      const matchesSeason = filterOptions.season === 'all' || 
        item.seasonalContext?.season === filterOptions.season;

      const matchesManufacturingStatus = filterOptions.manufacturingStatus === 'all' || 
        item.manufacturingStatus === filterOptions.manufacturingStatus;

      return matchesSearch && matchesEmotionalFamily && matchesGestureFamily && 
             matchesSeason && matchesManufacturingStatus;
    });

    // Sort items
    filtered.sort((a, b) => {
      let comparison = 0;
      
      switch (filterOptions.sortBy) {
        case 'timestamp':
          comparison = a.timestamp.getTime() - b.timestamp.getTime();
          break;
        case 'emotionalIntensity':
          comparison = a.emotionalTaxonomy.intensity - b.emotionalTaxonomy.intensity;
          break;
        case 'resonanceScore':
          comparison = a.emotionalTaxonomy.resonanceScore - b.emotionalTaxonomy.resonanceScore;
          break;
        case 'complexity':
          comparison = a.emotionalTaxonomy.complexity - b.emotionalTaxonomy.complexity;
          break;
        case 'title':
          comparison = a.title.localeCompare(b.title);
          break;
        default:
          comparison = a.timestamp.getTime() - b.timestamp.getTime();
      }

      return filterOptions.sortOrder === 'desc' ? -comparison : comparison;
    });

    return filtered;
  }, [archivedItems, filterOptions, searchQuery]);

  // Save current state to archive
  const saveCurrentItem = async () => {
    if (!currentLogicOutput && !currentFlorosOutput) {
      alert('No current output to save');
      return;
    }

    const emotionalTaxonomy = generateEmotionalTaxonomy(currentLogicOutput, currentEmotionalTone);
    const gestureLogic = generateGestureLogic(currentLogicOutput, currentFlorosOutput);

    const newItem: ArchivedItem = {
      id: generateItemId(),
      timestamp: new Date(),
      type: currentFlorosOutput ? 'blueprint' : 'memory',
      title: generateItemTitle(currentLogicOutput, currentFlorosOutput),
      logicOutput: currentLogicOutput,
      florosOutput: currentFlorosOutput,
      emotionalTone: currentEmotionalTone,
      seasonalContext: currentSeasonalContext,
      emotionalTaxonomy,
      gestureLogic,
      tags: generateTags(currentLogicOutput, currentFlorosOutput, emotionalTaxonomy),
      manufacturingStatus: currentFlorosOutput ? 'concept' : undefined,
      imagePreview: generateImagePreview(currentFlorosOutput)
    };

    // Optimistically update local UI state
    setArchivedItems(prev => [newItem, ...prev]);

    if (onSaveItem) {
      onSaveItem(newItem);
    }

    // Also write to localStorage as an offline fallback
    try {
      const cur = localStorage.getItem('fauxever-inventory-archive');
      const arr = cur ? JSON.parse(cur) : [];
      localStorage.setItem('fauxever-inventory-archive', JSON.stringify([ { ...newItem, timestamp: newItem.timestamp.toISOString() }, ...arr ]));
    } catch (err) {
      console.warn('Failed to write local fallback archive:', err);
    }

    // Persist to Firestore (use serverTimestamp for consistent server time)
    setIsSaving(true);
    try {
      const ref = await addDoc(collection(db, 'inventory'), {
        ...newItem,
        timestamp: serverTimestamp()
      });

      // Reconcile the locally-generated id with the Firestore document id so future operations (delete) use the right id
      setArchivedItems(prev => prev.map(i => i.id === newItem.id ? { ...i, id: ref.id } : i));

      // Remove the reconciled item from localStorage fallback (if present)
      try {
        const cur = localStorage.getItem('fauxever-inventory-archive');
        if (cur) {
          const arr = JSON.parse(cur) as any[];
          const filtered = arr.filter(a => (a.id !== newItem.id) && (a.title !== newItem.title || a.timestamp !== newItem.timestamp.toISOString()));
          localStorage.setItem('fauxever-inventory-archive', JSON.stringify(filtered));
        }
      } catch (err) {
        console.warn('Failed to clean up local fallback after save:', err);
      }
    } catch (err) {
      console.error('Error saving item to Firestore:', err);
    } finally {
      setIsSaving(false);
    }
  };

  // Load item from archive
  const loadItem = (item: ArchivedItem) => {
    setSelectedItem(item);
    if (onLoadItem) {
      onLoadItem(item);
    }
  };

  // Delete item from archive
  const deleteItem = async (itemId: string) => {
  if (!window.confirm('Are you sure you want to delete this item?')) return;

    try {
      await deleteDoc(doc(db, 'inventory', itemId));
    } catch (err) {
      console.error('Error deleting item:', err);
    }

    setArchivedItems(prev => prev.filter(item => item.id !== itemId));
    if (selectedItem?.id === itemId) {
      setSelectedItem(null);
    }
  };

  // Export archive
  const exportArchive = (format: 'json' | 'csv') => {
    if (format === 'json') {
      const dataStr = JSON.stringify(archivedItems, null, 2);
      downloadFile(dataStr, 'fauxever-archive.json', 'application/json');
    } else {
      const csvData = convertToCSV(archivedItems);
      downloadFile(csvData, 'fauxever-archive.csv', 'text/csv');
    }
  };

  return (
    <div className="inventory-archive">
      <div className="archive-header">
        <h3>Living Inventory Archive</h3>
        <div className="archive-actions">
          <button 
            className="save-current-btn"
            onClick={saveCurrentItem}
            disabled={isSaving || (!currentLogicOutput && !currentFlorosOutput)}
          >
            {isSaving ? 'Saving…' : 'Save Current'}
          </button>
          <div className="export-controls">
            <button onClick={() => exportArchive('json')}>Export JSON</button>
            <button onClick={() => exportArchive('csv')}>Export CSV</button>
          </div>
        </div>
      </div>

      {loadError && (
        <div className="archive-error" style={{ border: '1px solid #f44', padding: 12, margin: '8px 0', background: '#fff6f6' }}>
          <strong>Failed to load inventory from Firestore:</strong>
          <div style={{ marginTop: 6 }}>{loadError}</div>
          <div style={{ marginTop: 8 }}>
            <button onClick={() => { setLoadError(null); loadItems(); }}>Retry</button>
            <span style={{ marginLeft: 12, color: '#666' }}>If this persists check Firestore rules and network connectivity.</span>
          </div>
        </div>
      )}

      <div className="archive-controls">
        <div className="search-and-view">
          <input
            type="text"
            placeholder="Search by title, tags, or emotion..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="search-input"
          />
          <div className="view-mode-selector">
            <button 
              className={viewMode === 'grid' ? 'active' : ''} 
              onClick={() => setViewMode('grid')}
            >
              Grid
            </button>
            <button 
              className={viewMode === 'list' ? 'active' : ''} 
              onClick={() => setViewMode('list')}
            >
              List
            </button>
            <button 
              className={viewMode === 'taxonomy' ? 'active' : ''} 
              onClick={() => setViewMode('taxonomy')}
            >
              Taxonomy
            </button>
          </div>
        </div>

        <div className="filter-controls">
          <select
            value={filterOptions.emotionalFamily}
            onChange={(e) => setFilterOptions(prev => ({ ...prev, emotionalFamily: e.target.value }))}
          >
            <option value="all">All Emotions</option>
            <option value="joy">Joy Family</option>
            <option value="love">Love Family</option>
            <option value="peace">Peace Family</option>
            <option value="melancholy">Melancholy Family</option>
            <option value="hope">Hope Family</option>
          </select>

          <select
            value={filterOptions.gestureFamily}
            onChange={(e) => setFilterOptions(prev => ({ ...prev, gestureFamily: e.target.value }))}
          >
            <option value="all">All Gestures</option>
            <option value="embrace">Embrace Family</option>
            <option value="celebration">Celebration Family</option>
            <option value="comfort">Comfort Family</option>
            <option value="reverence">Reverence Family</option>
          </select>

          <select
            value={filterOptions.season}
            onChange={(e) => setFilterOptions(prev => ({ ...prev, season: e.target.value }))}
          >
            <option value="all">All Seasons</option>
            <option value="spring">Spring</option>
            <option value="summer">Summer</option>
            <option value="fall">Fall</option>
            <option value="winter">Winter</option>
          </select>

          <select
            value={filterOptions.manufacturingStatus}
            onChange={(e) => setFilterOptions(prev => ({ ...prev, manufacturingStatus: e.target.value }))}
          >
            <option value="all">All Status</option>
            <option value="concept">Concept</option>
            <option value="validated">Validated</option>
            <option value="ready">Ready</option>
            <option value="produced">Produced</option>
          </select>

          <select
            value={filterOptions.sortBy}
            onChange={(e) => setFilterOptions(prev => ({ ...prev, sortBy: e.target.value }))}
          >
            <option value="timestamp">Date</option>
            <option value="emotionalIntensity">Emotional Intensity</option>
            <option value="resonanceScore">Resonance Score</option>
            <option value="complexity">Complexity</option>
            <option value="title">Title</option>
          </select>

          <button
            onClick={() => setFilterOptions(prev => ({ 
              ...prev, 
              sortOrder: prev.sortOrder === 'asc' ? 'desc' : 'asc' 
            }))}
          >
            {filterOptions.sortOrder === 'asc' ? '↑' : '↓'}
          </button>
        </div>
      </div>

      <div className="archive-stats">
        <div className="stat-item">
          <span className="stat-label">Total Items:</span>
          <span className="stat-value">{archivedItems.length}</span>
        </div>
        <div className="stat-item">
          <span className="stat-label">Filtered:</span>
          <span className="stat-value">{filteredAndSortedItems.length}</span>
        </div>
        <div className="stat-item">
          <span className="stat-label">Blueprints Ready:</span>
          <span className="stat-value">
            {archivedItems.filter(item => item.manufacturingStatus === 'ready').length}
          </span>
        </div>
      </div>

      <div className={`archive-content ${viewMode}`}>
        {viewMode === 'taxonomy' ? (
          <TaxonomyView items={filteredAndSortedItems} onSelectItem={loadItem} />
        ) : (
          <div className={`items-container ${viewMode}`}>
            {filteredAndSortedItems.map(item => (
              <ArchiveItemCard
                key={item.id}
                item={item}
                viewMode={viewMode}
                isSelected={selectedItem?.id === item.id}
                onSelect={() => loadItem(item)}
                onDelete={() => deleteItem(item.id)}
              />
            ))}
          </div>
        )}
      </div>

      {selectedItem && (
        <ItemDetailPanel 
          item={selectedItem} 
          onClose={() => setSelectedItem(null)}
          onUpdateStatus={(status) => {
            setArchivedItems(prev => prev.map(item => 
              item.id === selectedItem.id 
                ? { ...item, manufacturingStatus: status }
                : item
            ));
          }}
        />
      )}
    </div>
  );
};

// Archive Item Card Component
const ArchiveItemCard: React.FC<{
  item: ArchivedItem;
  viewMode: 'grid' | 'list';
  isSelected: boolean;
  onSelect: () => void;
  onDelete: () => void;
}> = ({ item, viewMode, isSelected, onSelect, onDelete }) => {
  return (
    <div 
      className={`archive-item-card ${viewMode} ${isSelected ? 'selected' : ''}`}
      onClick={onSelect}
    >
      {item.imagePreview && (
        <div className="item-preview">
          <img src={item.imagePreview} alt={item.title} />
        </div>
      )}
      
      <div className="item-content">
        <div className="item-header">
          <h4 className="item-title">{item.title}</h4>
          <div className="item-type">{item.type}</div>
        </div>

        <div className="item-metadata">
          <div className="emotional-info">
            <span className="emotion-primary">{item.emotionalTaxonomy.primaryEmotion}</span>
            <div className="intensity-bar">
              <div 
                className="intensity-fill"
                style={{ width: `${item.emotionalTaxonomy.intensity * 100}%` }}
              />
            </div>
          </div>

          <div className="gesture-info">
            <span className="gesture-primary">{item.gestureLogic.primaryGesture}</span>
            <span className="spatial-flow">{item.gestureLogic.spatialFlow}</span>
          </div>

          {/* Expanded taxonomy badges (optional) */}
          <div className="taxonomy-badges">
            {(item.emotionalTaxonomy.seasonalNuance || []).slice(0,3).map(n => (
              <span key={n} className="badge-season">{n}</span>
            ))}

            {(item.emotionalTaxonomy.symbolicTags || []).slice(0,3).map(t => (
              <span key={t} className="badge-symbol">{t}</span>
            ))}

            {item.emotionalTaxonomy.gestureLanguage?.family && (
              <span className="badge-gesture">{item.emotionalTaxonomy.gestureLanguage.family}</span>
            )}
          </div>

          {item.manufacturingStatus && (
            <div className={`manufacturing-status ${item.manufacturingStatus}`}>
              {item.manufacturingStatus}
            </div>
          )}
        </div>

        <div className="item-tags">
          {item.tags.slice(0, 3).map(tag => (
            <span key={tag} className="item-tag">{tag}</span>
          ))}
          {item.tags.length > 3 && (
            <span className="tag-more">+{item.tags.length - 3}</span>
          )}
        </div>

        <div className="item-footer">
          <span className="item-date">
            {item.timestamp.toLocaleDateString()}
          </span>
          <button 
            className="delete-btn"
            onClick={(e) => { e.stopPropagation(); onDelete(); }}
          >
            🗑️
          </button>
        </div>
      </div>
    </div>
  );
};

// Taxonomy View Component
const TaxonomyView: React.FC<{
  items: ArchivedItem[];
  onSelectItem: (item: ArchivedItem) => void;
}> = ({ items, onSelectItem }) => {
  const taxonomyGroups = useMemo(() => {
    const groups: { [key: string]: ArchivedItem[] } = {};
    
    items.forEach(item => {
      const key = `${item.emotionalTaxonomy.emotionalFamily}-${item.gestureLogic.gestureFamily}`;
      if (!groups[key]) {
        groups[key] = [];
      }
      groups[key].push(item);
    });

    return groups;
  }, [items]);

  return (
    <div className="taxonomy-view">
      {Object.entries(taxonomyGroups).map(([groupKey, groupItems]) => {
        const [emotionalFamily, gestureFamily] = groupKey.split('-');
        return (
          <div key={groupKey} className="taxonomy-group">
            <div className="group-header">
              <h4>{emotionalFamily} × {gestureFamily}</h4>
              <span className="group-count">{groupItems.length} items</span>
            </div>
            <div className="group-items">
              {groupItems.map(item => (
                <div 
                  key={item.id} 
                  className="taxonomy-item"
                  onClick={() => onSelectItem(item)}
                >
                  <div className="item-title">{item.title}</div>
                  <div className="item-metrics">
                    <span>I: {Math.round(item.emotionalTaxonomy.intensity * 100)}%</span>
                    <span>R: {Math.round(item.emotionalTaxonomy.resonanceScore * 100)}%</span>
                    <span>C: {Math.round(item.emotionalTaxonomy.complexity * 100)}%</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
};

// Item Detail Panel Component
const ItemDetailPanel: React.FC<{
  item: ArchivedItem;
  onClose: () => void;
  onUpdateStatus: (status: ArchivedItem['manufacturingStatus']) => void;
}> = ({ item, onClose, onUpdateStatus }) => {
  return (
    <div className="item-detail-panel">
      <div className="panel-header">
        <h3>{item.title}</h3>
        <button className="close-btn" onClick={onClose}>×</button>
      </div>

      <div className="panel-content">
        <div className="detail-section">
          <h4>Emotional Taxonomy</h4>
          <div className="taxonomy-details">
            <div className="detail-row">
              <span>Primary Emotion:</span>
              <span>{item.emotionalTaxonomy.primaryEmotion}</span>
            </div>
            <div className="detail-row">
              <span>Emotional Family:</span>
              <span>{item.emotionalTaxonomy.emotionalFamily}</span>
            </div>
            <div className="detail-row">
              <span>Intensity:</span>
              <span>{Math.round(item.emotionalTaxonomy.intensity * 100)}%</span>
            </div>
            <div className="detail-row">
              <span>Complexity:</span>
              <span>{Math.round(item.emotionalTaxonomy.complexity * 100)}%</span>
            </div>
            <div className="detail-row">
              <span>Resonance Score:</span>
              <span>{Math.round(item.emotionalTaxonomy.resonanceScore * 100)}%</span>
            </div>
            <div className="detail-row">
              <span>Seasonal Nuance:</span>
              <span>{(item.emotionalTaxonomy.seasonalNuance || []).join(', ') || 'None'}</span>
            </div>
            <div className="detail-row">
              <span>Symbolic Tags:</span>
              <span>{(item.emotionalTaxonomy.symbolicTags || []).join(', ') || 'None'}</span>
            </div>
          </div>
        </div>

        <div className="detail-section">
          <h4>Gesture Logic</h4>
          <div className="gesture-details">
            <div className="detail-row">
              <span>Primary Gesture:</span>
              <span>{item.gestureLogic.primaryGesture}</span>
            </div>
            <div className="detail-row">
              <span>Gesture Family:</span>
              <span>{item.gestureLogic.gestureFamily}</span>
            </div>
            <div className="detail-row">
              <span>Spatial Flow:</span>
              <span>{item.gestureLogic.spatialFlow}</span>
            </div>
            <div className="detail-row">
              <span>Emotional Direction:</span>
              <span>{item.gestureLogic.emotionalDirection}</span>
            </div>
            <div className="detail-row">
              <span>Manufacturing Complexity:</span>
              <span>{item.gestureLogic.manufacturingComplexity}</span>
            </div>
            {item.emotionalTaxonomy.gestureLanguage && (
              <>
                <div className="detail-row">
                  <span>Gesture Language (primary):</span>
                  <span>{item.emotionalTaxonomy.gestureLanguage.primaryGesture || 'N/A'}</span>
                </div>
                <div className="detail-row">
                  <span>Gesture Intensity:</span>
                  <span>{typeof item.emotionalTaxonomy.gestureLanguage.intensity === 'number' ? Math.round(item.emotionalTaxonomy.gestureLanguage.intensity * 100) + '%' : 'N/A'}</span>
                </div>
                <div className="detail-row">
                  <span>Gesture Family:</span>
                  <span>{item.emotionalTaxonomy.gestureLanguage.family || 'N/A'}</span>
                </div>
              </>
            )}
          </div>
        </div>

        {item.manufacturingStatus && (
          <div className="detail-section">
            <h4>Manufacturing Status</h4>
            <select 
              value={item.manufacturingStatus}
              onChange={(e) => onUpdateStatus(e.target.value as ArchivedItem['manufacturingStatus'])}
            >
              <option value="concept">Concept</option>
              <option value="validated">Validated</option>
              <option value="ready">Ready</option>
              <option value="produced">Produced</option>
            </select>
          </div>
        )}

        <div className="detail-section">
          <h4>Tags</h4>
          <div className="tags-display">
            {item.tags.map(tag => (
              <span key={tag} className="tag-badge">{tag}</span>
            ))}
          </div>
        </div>

        {item.notes && (
          <div className="detail-section">
            <h4>Notes</h4>
            <p>{item.notes}</p>
          </div>
        )}
      </div>
    </div>
  );
};

// Helper functions
function generateItemId(): string {
  return `item_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

function generateItemTitle(logicOutput?: EnhancedLogicEngineOutput, florosOutput?: EnhancedFlorosOutput): string {
  if (florosOutput) {
    return `Blueprint: ${florosOutput.title || 'Untitled Arrangement'}`;
  }
  if (logicOutput?.emotionalAnalysis) {
    return `Memory: ${logicOutput.emotionalAnalysis.primaryEmotion} Expression`;
  }
  return `Archive Item ${new Date().toLocaleDateString()}`;
}

function generateEmotionalTaxonomy(
  logicOutput?: EnhancedLogicEngineOutput,
  emotionalTone?: EmotionalTone
): EmotionalTaxonomy {
  const primaryEmotion = logicOutput?.emotionalAnalysis?.primaryEmotion || 'neutral';
  const intensity = logicOutput?.emotionalAnalysis?.intensity || 0.5;
  const complexity = logicOutput?.emotionalAnalysis?.secondaryEmotions?.length || 1;
  const resonanceScore = logicOutput?.storytellingScores?.emotionalResonance || 0.5;

  return {
    primaryEmotion,
    emotionalFamily: getEmotionalFamily(primaryEmotion),
    intensity,
    complexity: Math.min(complexity / 5, 1),
    resonanceScore,
    seasonalAlignment: calculateSeasonalAlignment(logicOutput, emotionalTone)
  };
}

function generateGestureLogic(
  logicOutput?: EnhancedLogicEngineOutput,
  florosOutput?: EnhancedFlorosOutput
): GestureLogic {
  const primaryGesture = extractPrimaryGesture(logicOutput, florosOutput);
  const spatialFlow = inferSpatialFlow(florosOutput);
  const emotionalDirection = inferEmotionalDirection(logicOutput);
  const manufacturingComplexity = assessManufacturingComplexity(florosOutput);

  return {
    primaryGesture,
    gestureFamily: getGestureFamily(primaryGesture),
    spatialFlow,
    emotionalDirection,
    manufacturingComplexity
  };
}

function generateTags(
  logicOutput?: EnhancedLogicEngineOutput,
  florosOutput?: EnhancedFlorosOutput,
  emotionalTaxonomy?: EmotionalTaxonomy
): string[] {
  const tags: string[] = [];

  if (emotionalTaxonomy) {
    tags.push(emotionalTaxonomy.primaryEmotion);
    tags.push(emotionalTaxonomy.emotionalFamily);
    
    if (emotionalTaxonomy.intensity > 0.7) tags.push('high-intensity');
    if (emotionalTaxonomy.complexity > 0.7) tags.push('complex');
  }

  if (florosOutput) {
    tags.push('blueprint');
    if (florosOutput.materialsList) tags.push('materials-ready');
  } else {
    tags.push('memory');
  }

  if (logicOutput?.storytellingScores) {
    if (logicOutput.storytellingScores.narrativeCoherence > 0.7) tags.push('strong-narrative');
    if (logicOutput.storytellingScores.symbolismDepth > 0.7) tags.push('symbolic');
  }

  return tags;
}

function generateImagePreview(florosOutput?: EnhancedFlorosOutput): string | undefined {
  // In a real implementation, this would generate a thumbnail
  // For now, return undefined
  return undefined;
}

function getEmotionalFamily(emotion: string): string {
  const families: { [key: string]: string } = {
    joy: 'joy',
    happiness: 'joy',
    celebration: 'joy',
    love: 'love',
    affection: 'love',
    romance: 'love',
    peace: 'peace',
    calm: 'peace',
    serenity: 'peace',
    sadness: 'melancholy',
    grief: 'melancholy',
    melancholy: 'melancholy',
    hope: 'hope',
    optimism: 'hope',
    faith: 'hope'
  };
  return families[emotion.toLowerCase()] || 'neutral';
}

function getGestureFamily(gesture: string): string {
  const families: { [key: string]: string } = {
    embrace: 'embrace',
    hug: 'embrace',
    envelop: 'embrace',
    celebration: 'celebration',
    dance: 'celebration',
    flourish: 'celebration',
    comfort: 'comfort',
    soothe: 'comfort',
    heal: 'comfort',
    reverence: 'reverence',
    honor: 'reverence',
    respect: 'reverence'
  };
  return families[gesture.toLowerCase()] || 'neutral';
}

function extractPrimaryGesture(
  logicOutput?: EnhancedLogicEngineOutput,
  florosOutput?: EnhancedFlorosOutput
): string {
  // Extract from gesture language or infer from emotional content
  return 'embrace'; // Simplified for now
}

function inferSpatialFlow(florosOutput?: EnhancedFlorosOutput): GestureLogic['spatialFlow'] {
  // Analyze layout instructions to determine spatial flow
  return 'radial'; // Simplified for now
}

function inferEmotionalDirection(logicOutput?: EnhancedLogicEngineOutput): GestureLogic['emotionalDirection'] {
  const intensity = logicOutput?.emotionalAnalysis?.intensity || 0.5;
  if (intensity > 0.7) return 'outward';
  if (intensity < 0.3) return 'inward';
  return 'balanced';
}

function assessManufacturingComplexity(florosOutput?: EnhancedFlorosOutput): GestureLogic['manufacturingComplexity'] {
  if (!florosOutput) return 'simple';
  
  const materialsCount = florosOutput.materialsList?.flowers?.length || 0;
  const stepsCount = florosOutput.assemblySteps?.length || 0;
  
  if (materialsCount > 5 || stepsCount > 8) return 'complex';
  if (materialsCount > 3 || stepsCount > 5) return 'moderate';
  return 'simple';
}

function calculateSeasonalAlignment(
  logicOutput?: EnhancedLogicEngineOutput,
  emotionalTone?: EmotionalTone
): number {
  // Calculate how well the emotion aligns with seasonal context
  return 0.7; // Simplified for now
}

function convertToCSV(items: ArchivedItem[]): string {
  const headers = [
    'ID', 'Timestamp', 'Type', 'Title', 'Primary Emotion', 'Emotional Family',
    'Intensity', 'Primary Gesture', 'Spatial Flow', 'Manufacturing Status', 'Tags'
  ];
  
  const rows = items.map(item => [
    item.id,
    item.timestamp.toISOString(),
    item.type,
    item.title,
    item.emotionalTaxonomy.primaryEmotion,
    item.emotionalTaxonomy.emotionalFamily,
    item.emotionalTaxonomy.intensity,
    item.gestureLogic.primaryGesture,
    item.gestureLogic.spatialFlow,
    item.manufacturingStatus || '',
    item.tags.join(';')
  ]);

  return [headers, ...rows].map(row => row.map(field => `"${field}"`).join(',')).join('\n');
}

function downloadFile(content: string, filename: string, contentType: string) {
  const blob = new Blob([content], { type: contentType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}