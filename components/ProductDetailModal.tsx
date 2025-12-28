// components/ProductDetailModal.tsx
import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import type { InventoryItem } from '../types';

interface ProductDetailModalProps {
  item: InventoryItem;
  onClose: () => void;
  onEdit: () => void;
}

type TabId = 'overview' | 'color' | 'emotional' | 'design' | 'pairings' | 'melrose';

const floralTabs: { id: TabId; label: string }[] = [
  { id: 'overview', label: 'Overview' },
  { id: 'color', label: 'Color & Composition' },
  { id: 'emotional', label: 'Emotional Profile' },
  { id: 'design', label: 'Design Properties' },
  { id: 'pairings', label: 'Pairings' },
];

const homeDecorTabs: { id: TabId; label: string }[] = [
  { id: 'overview', label: 'Overview' },
  { id: 'melrose', label: 'Product Details' },
  { id: 'color', label: 'Colors' },
];

const PropertyRow: React.FC<{ label: string; value: string | number | undefined | null }> = ({ label, value }) => {
  if (value === undefined || value === null || value === '') return null;
  return (
    <div className="flex justify-between py-1.5 border-b border-gray-100">
      <span className="text-gray-500 text-sm">{label}</span>
      <span className="text-gray-800 text-sm font-medium">{value}</span>
    </div>
  );
};

const ScoreBar: React.FC<{ label: string; value: number }> = ({ label, value }) => (
  <div className="mb-2">
    <div className="flex justify-between text-xs mb-1">
      <span className="text-gray-600">{label}</span>
      <span className="text-gray-800 font-medium">{Math.round(value * 100)}%</span>
    </div>
    <div className="w-full bg-gray-200 rounded-full h-2">
      <div
        className="h-2 rounded-full bg-gray-600"
        style={{ width: `${value * 100}%` }}
      />
    </div>
  </div>
);

const ColorSwatch: React.FC<{ colors: string[] }> = ({ colors }) => (
  <div className="flex gap-1 flex-wrap">
    {colors.map((color, i) => (
      <div
        key={i}
        className="w-6 h-6 rounded border border-gray-300"
        style={{ backgroundColor: color }}
        title={color}
      />
    ))}
  </div>
);

const Badge: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <span className="inline-block px-2 py-0.5 text-xs rounded-full bg-gray-100 text-gray-700 mr-1 mb-1">
    {children}
  </span>
);

export const ProductDetailModal: React.FC<ProductDetailModalProps> = ({ item, onClose, onEdit }) => {
  const isHomeDecor = item.inventoryCategory === 'home';
  const tabs = isHomeDecor ? homeDecorTabs : floralTabs;
  const [activeTab, setActiveTab] = useState<TabId>('overview');

  const enhanced = item.enhancedProperties;
  const taxonomy = enhanced?.emotionalTaxonomy;
  const gesture = taxonomy?.gestureLanguage;
  const melrose = item.melroseInfo;

  // Use portal to render at document.body, avoiding CSS transform issues from parent containers
  // Check if document.body exists (for SSR safety)
  if (typeof document === 'undefined' || !document.body) {
    return null;
  }

  return createPortal(
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-start justify-between p-4 border-b">
          <div className="flex items-center gap-4">
            <div className="w-20 h-20 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0">
              {item.processedImageUrl || item.imageUrl ? (
                <img
                  src={item.processedImageUrl || item.imageUrl}
                  alt={item.name}
                  className="w-full h-full object-contain"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-gray-400">
                  No image
                </div>
              )}
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-800">{item.name}</h2>
              <div className="flex items-center gap-2 mt-1">
                <span className="px-2 py-0.5 text-xs rounded-full bg-gray-200 text-gray-700">
                  {item.type}
                </span>
                <span className={`px-2 py-0.5 text-xs rounded-full ${item.isAvailable ? 'bg-gray-100 text-gray-700' : 'bg-red-100 text-red-700'}`}>
                  {item.isAvailable ? 'Available' : 'Unavailable'}
                </span>
                <span className="text-sm text-gray-500">
                  {item.dimensions.widthInches}" × {item.dimensions.heightInches}"
                </span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={onEdit}
              className="p-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-md"
              title="Edit"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
              </svg>
            </button>
            <button
              onClick={onClose}
              className="p-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-md"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b px-4 overflow-x-auto">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2 text-sm font-medium whitespace-nowrap transition-colors ${activeTab === tab.id
                ? 'text-gray-800 border-b-2 border-gray-800'
                : 'text-gray-500 hover:text-gray-700'
                }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {/* Overview Tab */}
          {activeTab === 'overview' && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-gray-50 rounded-lg p-4">
                  <h4 className="font-medium text-gray-700 mb-2">Basic Properties</h4>
                  <PropertyRow label="Composition Role" value={
                    item.compositionRole === 'focal' ? 'Focal (Main)' :
                      item.compositionRole === 'secondary' ? 'Secondary' :
                        item.compositionRole === 'filler' ? 'Filler' :
                          item.compositionRole === 'accent' ? 'Accent' :
                            item.compositionRole || 'Not set'
                  } />
                  <PropertyRow label="Shape" value={item.shape} />
                  <PropertyRow label="Texture" value={item.texture} />
                  <PropertyRow label="Complexity" value={item.complexity} />
                </div>
                <div className="bg-gray-50 rounded-lg p-4">
                  <h4 className="font-medium text-gray-700 mb-2">Emotional Dimensions</h4>
                  {item.emotionalDimensions && (
                    <>
                      <ScoreBar label="Valence (Sorrow → Joy)" value={item.emotionalDimensions.valence} />
                      <ScoreBar label="Arousal (Calm → Intense)" value={item.emotionalDimensions.arousal} />
                      <ScoreBar label="Temporal (Memory → Hope)" value={item.emotionalDimensions.temporalWeight} />
                    </>
                  )}
                </div>
              </div>

              {item.symbolMeaning && (
                <div className="bg-gray-50 rounded-lg p-4">
                  <h4 className="font-medium text-gray-700 mb-2">Symbolic Meaning</h4>
                  <p className="text-gray-600 text-sm">{item.symbolMeaning}</p>
                </div>
              )}

              {item.emotionTags && item.emotionTags.length > 0 && (
                <div className="bg-gray-50 rounded-lg p-4">
                  <h4 className="font-medium text-gray-700 mb-2">Emotion Tags</h4>
                  <div className="flex flex-wrap gap-1">
                    {item.emotionTags.map((tag, i) => (
                      <Badge key={i}>{tag}</Badge>
                    ))}
                  </div>
                </div>
              )}

              {item.seasonTags && item.seasonTags.length > 0 && (
                <div className="bg-gray-50 rounded-lg p-4">
                  <h4 className="font-medium text-gray-700 mb-2">Season Tags</h4>
                  <div className="flex flex-wrap gap-1">
                    {item.seasonTags.map((tag, i) => (
                      <Badge key={i}>{tag}</Badge>
                    ))}
                  </div>
                </div>
              )}

              {item.culturalTags && item.culturalTags.length > 0 && (
                <div className="bg-gray-50 rounded-lg p-4">
                  <h4 className="font-medium text-gray-700 mb-2">Cultural Tags</h4>
                  <div className="flex flex-wrap gap-1">
                    {item.culturalTags.map((tag, i) => (
                      <Badge key={i}>{tag}</Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* Melrose Info for Home Decor in Overview */}
              {isHomeDecor && melrose && (
                <div className="bg-gray-50 rounded-lg p-4">
                  <h4 className="font-medium text-gray-700 mb-2">Product Info</h4>
                  <PropertyRow label="SKU" value={melrose.vendorSku} />
                  <PropertyRow label="Category" value={melrose.productCategory} />
                  <PropertyRow label="Materials" value={melrose.materials.join(', ')} />
                  <PropertyRow label="Color" value={melrose.color} />
                </div>
              )}

              {isHomeDecor && melrose && (
                <div className="bg-gray-50 rounded-lg p-4">
                  <h4 className="font-medium text-gray-700 mb-2">Pricing</h4>
                  <PropertyRow label="Dropship Cost" value={`$${melrose.dropshipFreightIncludedPrice.toFixed(2)}`} />
                  <PropertyRow label="MSRP" value={`$${melrose.msrp.toFixed(2)}`} />
                  <PropertyRow label="Potential Profit" value={`$${(melrose.msrp - melrose.dropshipFreightIncludedPrice).toFixed(2)}`} />
                  <PropertyRow label="In Stock" value={melrose.availability > 0 ? `${melrose.availability} units` : 'Out of stock'} />
                </div>
              )}
            </div>
          )}

          {/* Melrose Product Details Tab */}
          {activeTab === 'melrose' && melrose && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-gray-50 rounded-lg p-4">
                  <h4 className="font-medium text-gray-700 mb-2">Product Information</h4>
                  <PropertyRow label="Vendor SKU" value={melrose.vendorSku} />
                  <PropertyRow label="UPC Code" value={melrose.upcCode} />
                  <PropertyRow label="Category" value={melrose.productCategory} />
                  <PropertyRow label="Country of Origin" value={melrose.country} />
                  <PropertyRow label="Set Quantity" value={melrose.setQuantity > 1 ? `Set of ${melrose.setQuantity}` : 'Single'} />
                </div>
                <div className="bg-gray-50 rounded-lg p-4">
                  <h4 className="font-medium text-gray-700 mb-2">Pricing & Availability</h4>
                  <PropertyRow label="Dropship Price" value={`$${melrose.dropshipPrice.toFixed(2)}`} />
                  <PropertyRow label="Freight Included" value={`$${melrose.dropshipFreightIncludedPrice.toFixed(2)}`} />
                  <PropertyRow label="MSRP" value={`$${melrose.msrp.toFixed(2)}`} />
                  <PropertyRow label="Profit Margin" value={melrose.msrp > 0 ? `${(((melrose.msrp - melrose.dropshipFreightIncludedPrice) / melrose.msrp) * 100).toFixed(0)}%` : 'N/A'} />
                  <PropertyRow label="Availability" value={melrose.availability > 0 ? `${melrose.availability} in stock` : 'Out of stock'} />
                  {melrose.eta && <PropertyRow label="ETA" value={melrose.eta} />}
                </div>
              </div>

              <div className="bg-gray-50 rounded-lg p-4">
                <h4 className="font-medium text-gray-700 mb-2">Materials & Colors</h4>
                <div className="flex flex-wrap gap-1 mb-2">
                  {melrose.materials.map((m, i) => (
                    <Badge key={i}>{m}</Badge>
                  ))}
                </div>
                <PropertyRow label="Color" value={melrose.color} />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="bg-gray-50 rounded-lg p-4">
                  <h4 className="font-medium text-gray-700 mb-2">Dimensions</h4>
                  <PropertyRow label="Length" value={`${melrose.dimensions.length} ${melrose.dimensions.uom}`} />
                  <PropertyRow label="Width" value={`${melrose.dimensions.width} ${melrose.dimensions.uom}`} />
                  <PropertyRow label="Height" value={`${melrose.dimensions.height} ${melrose.dimensions.uom}`} />
                  <PropertyRow label="Weight" value={`${melrose.weight} ${melrose.weightUom}`} />
                </div>
                <div className="bg-gray-50 rounded-lg p-4">
                  <h4 className="font-medium text-gray-700 mb-2">Shipping</h4>
                  <PropertyRow label="Ship Via" value={melrose.shipVia} />
                  <PropertyRow label="Package Size" value={`${melrose.shippingDimensions.length} × ${melrose.shippingDimensions.width} × ${melrose.shippingDimensions.height} ${melrose.shippingDimensions.uom}`} />
                  <PropertyRow label="Ship Weight" value={`${melrose.shippingDimensions.weight} ${melrose.shippingDimensions.weightUom}`} />
                </div>
              </div>

              {melrose.marketingCopy && (
                <div className="bg-gray-50 rounded-lg p-4">
                  <h4 className="font-medium text-gray-700 mb-2">Description</h4>
                  <p className="text-gray-600 text-sm">{melrose.marketingCopy}</p>
                </div>
              )}
            </div>
          )}

          {/* Color & Composition Tab */}
          {activeTab === 'color' && (
            <div className="space-y-4">
              {item.dominantColors && item.dominantColors.length > 0 && (
                <div className="bg-gray-50 rounded-lg p-4">
                  <h4 className="font-medium text-gray-700 mb-3">Dominant Colors</h4>
                  <ColorSwatch colors={item.dominantColors} />
                </div>
              )}

              {enhanced?.colorTheory && (
                <div className="bg-gray-50 rounded-lg p-4">
                  <h4 className="font-medium text-gray-700 mb-2">Color Theory</h4>
                  <PropertyRow label="Temperature" value={enhanced.colorTheory.colorTemperature} />
                  {enhanced.colorTheory.colorHarmony && enhanced.colorTheory.colorHarmony.length > 0 && (
                    <div className="py-2">
                      <span className="text-gray-500 text-sm">Harmony Roles</span>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {enhanced.colorTheory.colorHarmony.map((h, i) => (
                          <Badge key={i}>{h}</Badge>
                        ))}
                      </div>
                    </div>
                  )}
                  {enhanced.colorTheory.undertones && enhanced.colorTheory.undertones.length > 0 && (
                    <div className="py-2">
                      <span className="text-gray-500 text-sm">Undertones</span>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {enhanced.colorTheory.undertones.map((u, i) => (
                          <Badge key={i}>{u}</Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {enhanced?.compositionalBehavior && (
                <div className="bg-gray-50 rounded-lg p-4">
                  <h4 className="font-medium text-gray-700 mb-2">Compositional Behavior</h4>
                  <ScoreBar label="Visual Weight" value={enhanced.compositionalBehavior.visualWeight} />
                  <PropertyRow label="Directional Energy" value={enhanced.compositionalBehavior.directionalEnergy} />
                  {enhanced.compositionalBehavior.scaleRange && (
                    <PropertyRow
                      label="Scale Range"
                      value={`${enhanced.compositionalBehavior.scaleRange.min}× – ${enhanced.compositionalBehavior.scaleRange.max}×`}
                    />
                  )}
                </div>
              )}
            </div>
          )}

          {/* Emotional Profile Tab */}
          {activeTab === 'emotional' && (
            <div className="space-y-4">
              {taxonomy && (
                <div className="bg-gray-50 rounded-lg p-4">
                  <h4 className="font-medium text-gray-700 mb-2">Emotional Taxonomy</h4>
                  <PropertyRow label="Primary Emotion" value={taxonomy.primaryEmotion} />
                  <PropertyRow label="Emotional Family" value={taxonomy.emotionalFamily} />
                  <div className="mt-3">
                    <ScoreBar label="Intensity" value={taxonomy.intensity || 0} />
                    <ScoreBar label="Complexity" value={taxonomy.complexity || 0} />
                    <ScoreBar label="Resonance (Universal Appeal)" value={taxonomy.resonanceScore || 0} />
                    <ScoreBar label="Seasonal Alignment" value={taxonomy.seasonalAlignment || 0} />
                  </div>
                  {taxonomy.symbolicTags && taxonomy.symbolicTags.length > 0 && (
                    <div className="mt-3">
                      <span className="text-gray-500 text-sm">Symbolic Tags</span>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {taxonomy.symbolicTags.map((t, i) => (
                          <Badge key={i}>{t}</Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {gesture && (
                <div className="bg-gray-50 rounded-lg p-4">
                  <h4 className="font-medium text-gray-700 mb-2">Gesture Language</h4>
                  <PropertyRow label="Primary Gesture" value={gesture.primaryGesture} />
                  <PropertyRow label="Family" value={gesture.family} />
                  <PropertyRow label="Spatial Flow" value={gesture.spatialFlow} />
                  <div className="mt-2">
                    <ScoreBar label="Gesture Intensity" value={gesture.intensity || 0} />
                  </div>
                </div>
              )}

              {enhanced?.narrativeMeaning && (
                <div className="bg-gray-50 rounded-lg p-4">
                  <h4 className="font-medium text-gray-700 mb-2">Narrative Suitability</h4>
                  <ScoreBar label="Grief" value={enhanced.narrativeMeaning.griefSuitability || 0} />
                  <ScoreBar label="Celebration" value={enhanced.narrativeMeaning.celebrationSuitability || 0} />
                  <ScoreBar label="Romantic" value={enhanced.narrativeMeaning.romanticSuitability || 0} />
                  {enhanced.narrativeMeaning.healingStageAlignment && enhanced.narrativeMeaning.healingStageAlignment.length > 0 && (
                    <div className="mt-3">
                      <span className="text-gray-500 text-sm">Healing Stage Alignment</span>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {enhanced.narrativeMeaning.healingStageAlignment.map((s, i) => (
                          <Badge key={i}>{s}</Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Design Properties Tab */}
          {activeTab === 'design' && (
            <div className="space-y-4">
              {enhanced?.layering && (
                <div className="bg-gray-50 rounded-lg p-4">
                  <h4 className="font-medium text-gray-700 mb-2">Layering Properties</h4>
                  <PropertyRow label="Depth Layer" value={enhanced.layering.depthLayer} />
                  <PropertyRow label="Stacking Behavior" value={enhanced.layering.stackingBehavior} />
                  <PropertyRow label="Coverage Radius" value={enhanced.layering.coverageRadiusInches ? `${enhanced.layering.coverageRadiusInches}"` : undefined} />
                  <div className="mt-2">
                    <ScoreBar label="Overlap Tolerance" value={enhanced.layering.overlapTolerance || 0} />
                    <ScoreBar label="Silhouette Priority" value={enhanced.layering.silhouettePriority || 0} />
                  </div>
                </div>
              )}

              {enhanced?.tuckPoint && (
                <div className="bg-gray-50 rounded-lg p-4">
                  <h4 className="font-medium text-gray-700 mb-2">Tuck Point Properties</h4>
                  <PropertyRow label="Stem Style" value={enhanced.tuckPoint.stemStyle} />
                  <PropertyRow label="Tuck Depth" value={enhanced.tuckPoint.tuckDepth} />
                  <PropertyRow label="Insertion Angle" value={enhanced.tuckPoint.insertionAngle} />
                  <div className="mt-2">
                    <ScoreBar label="Anchor Strength" value={enhanced.tuckPoint.anchorStrength || 0} />
                    <ScoreBar label="Gap Filler Score" value={enhanced.tuckPoint.gapFillerScore || 0} />
                  </div>
                </div>
              )}

              {enhanced?.neighborInteraction && (
                <div className="bg-gray-50 rounded-lg p-4">
                  <h4 className="font-medium text-gray-700 mb-2">Neighbor Interaction</h4>
                  <PropertyRow label="Spacing Preference" value={enhanced.neighborInteraction.spacingPreference} />
                  <PropertyRow label="Transition Role" value={enhanced.neighborInteraction.transitionRole} />
                  <div className="mt-2">
                    <ScoreBar label="Clustering Compatibility" value={enhanced.neighborInteraction.clusteringCompatibility || 0} />
                  </div>
                </div>
              )}

              {item.sprayProfile && item.sprayProfile.isSpray && (
                <div className="bg-amber-50 rounded-lg p-4 border border-amber-200">
                  <h4 className="font-medium text-amber-800 mb-2 flex items-center gap-2">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
                    </svg>
                    Spray Profile (Multi-Element)
                  </h4>
                  <PropertyRow label="Total Elements" value={item.sprayProfile.totalElements} />
                  <PropertyRow label="Overall Size" value={`${item.sprayProfile.overallWidthInches}" × ${item.sprayProfile.overallHeightInches}"`} />
                  <PropertyRow label="Primary Stem Length" value={item.sprayProfile.primaryStemLengthInches ? `${item.sprayProfile.primaryStemLengthInches}"` : undefined} />
                  {item.sprayProfile.usageNotes && (
                    <p className="text-amber-700 text-sm mt-2 italic">{item.sprayProfile.usageNotes}</p>
                  )}
                  {item.sprayProfile.segments && item.sprayProfile.segments.length > 0 && (
                    <div className="mt-3">
                      <span className="text-amber-700 text-sm font-medium">Segments:</span>
                      <div className="mt-1 space-y-1">
                        {item.sprayProfile.segments.map((seg, i) => (
                          <div key={i} className="text-xs text-amber-600 flex justify-between">
                            <span>{seg.name} ({seg.role})</span>
                            <span>{seg.estimatedWidthInches}" × {seg.estimatedHeightInches}"</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Pairings Tab */}
          {activeTab === 'pairings' && (
            <div className="space-y-4">
              {enhanced?.designHarmony && (
                <>
                  <div className="bg-gray-50 rounded-lg p-4">
                    <h4 className="font-medium text-gray-700 mb-2">Layer Role</h4>
                    <span className="inline-block px-3 py-1 text-sm rounded-full bg-gray-200 text-gray-800 font-medium">
                      {enhanced.designHarmony.layerRole}
                    </span>
                  </div>

                  {enhanced.designHarmony.harmonicPairings && enhanced.designHarmony.harmonicPairings.length > 0 && (
                    <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                      <h4 className="font-medium text-gray-700 mb-2 flex items-center gap-2">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                        </svg>
                        Pairs Well With
                      </h4>
                      <div className="flex flex-wrap gap-2">
                        {enhanced.designHarmony.harmonicPairings.map((p, i) => (
                          <span key={i} className="px-2 py-1 text-sm rounded bg-gray-100 text-gray-800">{p}</span>
                        ))}
                      </div>
                    </div>
                  )}

                  {enhanced.designHarmony.contrastSuggestions && enhanced.designHarmony.contrastSuggestions.length > 0 && (
                    <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                      <h4 className="font-medium text-gray-700 mb-2 flex items-center gap-2">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                        </svg>
                        Contrast Ideas
                      </h4>
                      <div className="flex flex-wrap gap-2">
                        {enhanced.designHarmony.contrastSuggestions.map((c, i) => (
                          <span key={i} className="px-2 py-1 text-sm rounded bg-gray-100 text-gray-800">{c}</span>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}

              {(!enhanced?.designHarmony ||
                (!enhanced.designHarmony.harmonicPairings?.length && !enhanced.designHarmony.contrastSuggestions?.length)) && (
                  <div className="text-center py-8 text-gray-500">
                    <svg className="w-12 h-12 mx-auto mb-2 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <p>No pairing suggestions available yet.</p>
                    <p className="text-sm">Run the tagger to generate design harmony data.</p>
                  </div>
                )}
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
};
