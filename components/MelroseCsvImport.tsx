import React, { useState, useCallback } from 'react';
import type { InventoryItem } from '../types';
import { parseMelroseCsv, generateEmotionTagsForDecor } from '../services/melroseCsvParser';

interface MelroseCsvImportProps {
  onImport: (items: InventoryItem[]) => void;
  existingSkus: string[];
}

export const MelroseCsvImport: React.FC<MelroseCsvImportProps> = ({ onImport, existingSkus }) => {
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [parseResult, setParseResult] = useState<{
    items: InventoryItem[];
    errors: string[];
    duplicates: string[];
  } | null>(null);
  const [showPreview, setShowPreview] = useState(false);

  const handleFile = useCallback(async (file: File) => {
    if (!file.name.endsWith('.csv')) {
      alert('Please upload a CSV file');
      return;
    }

    setIsProcessing(true);
    try {
      const text = await file.text();
      const { items, errors } = parseMelroseCsv(text);
      
      const itemsWithEmotions = items.map(item => ({
        ...item,
        emotionTags: generateEmotionTagsForDecor(item),
      }));

      const duplicates = itemsWithEmotions
        .filter(item => existingSkus.includes(item.id))
        .map(item => item.melroseInfo?.vendorSku || item.id);

      const newItems = itemsWithEmotions.filter(item => !existingSkus.includes(item.id));

      setParseResult({ items: newItems, errors, duplicates });
      setShowPreview(true);
    } catch (err) {
      alert(`Error reading file: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setIsProcessing(false);
    }
  }, [existingSkus]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }, [handleFile]);

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  }, [handleFile]);

  const handleImport = useCallback(() => {
    if (parseResult?.items.length) {
      onImport(parseResult.items);
      setParseResult(null);
      setShowPreview(false);
    }
  }, [parseResult, onImport]);

  const categoryCounts = parseResult?.items.reduce((acc, item) => {
    const cat = item.melroseInfo?.productCategory || 'Other';
    acc[cat] = (acc[cat] || 0) + 1;
    return acc;
  }, {} as Record<string, number>) || {};

  return (
    <div className="space-y-4">
      {!showPreview ? (
        <div
          onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
          className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
            isDragging ? 'border-gray-600 bg-gray-50' : 'border-gray-300'
          }`}
        >
          {isProcessing ? (
            <div className="flex flex-col items-center gap-3">
              <div className="w-8 h-8 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
              <p className="text-gray-600">Processing CSV...</p>
            </div>
          ) : (
            <>
              <svg className="w-12 h-12 mx-auto mb-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
              <p className="text-gray-600 mb-2">Drag and drop your Melrose CSV file here</p>
              <p className="text-gray-400 text-sm mb-4">or</p>
              <label className="px-4 py-2 bg-[#E8E8E8] text-black text-sm font-light rounded cursor-pointer hover:bg-gray-300 transition-colors">
                Browse Files
                <input type="file" accept=".csv" onChange={handleFileInput} className="hidden" />
              </label>
            </>
          )}
        </div>
      ) : parseResult && (
        <div className="border border-gray-200 rounded-lg overflow-hidden">
          <div className="bg-gray-50 px-4 py-3 border-b border-gray-200">
            <h3 className="font-medium text-gray-900">Import Preview</h3>
          </div>
          
          <div className="p-4 space-y-4">
            <div className="grid grid-cols-3 gap-4">
              <div className="bg-gray-50 rounded-lg p-3 text-center">
                <div className="text-2xl font-light text-gray-900">{parseResult.items.length}</div>
                <div className="text-xs text-gray-500">New Items</div>
              </div>
              <div className="bg-gray-50 rounded-lg p-3 text-center">
                <div className="text-2xl font-light text-gray-900">{parseResult.duplicates.length}</div>
                <div className="text-xs text-gray-500">Duplicates (skipped)</div>
              </div>
              <div className="bg-gray-50 rounded-lg p-3 text-center">
                <div className="text-2xl font-light text-amber-600">{parseResult.errors.length}</div>
                <div className="text-xs text-gray-500">Errors</div>
              </div>
            </div>

            {Object.keys(categoryCounts).length > 0 && (
              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-2">Categories</h4>
                <div className="flex flex-wrap gap-2">
                  {Object.entries(categoryCounts).map(([cat, count]) => (
                    <span key={cat} className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded">
                      {cat}: {count}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {parseResult.items.length > 0 && (
              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-2">Sample Items</h4>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {parseResult.items.slice(0, 5).map(item => (
                    <div key={item.id} className="flex items-center justify-between p-2 bg-gray-50 rounded text-sm">
                      <div>
                        <div className="font-medium text-gray-900 truncate max-w-xs">{item.name}</div>
                        <div className="text-xs text-gray-500">
                          SKU: {item.melroseInfo?.vendorSku} | ${item.melroseInfo?.dropshipFreightIncludedPrice.toFixed(2)}
                        </div>
                      </div>
                      <div className="flex gap-1">
                        {item.emotionTags.slice(0, 3).map(tag => (
                          <span key={tag} className="px-1.5 py-0.5 bg-gray-200 text-gray-600 text-xs rounded">
                            {tag}
                          </span>
                        ))}
                      </div>
                    </div>
                  ))}
                  {parseResult.items.length > 5 && (
                    <div className="text-center text-xs text-gray-400 py-2">
                      + {parseResult.items.length - 5} more items
                    </div>
                  )}
                </div>
              </div>
            )}

            {parseResult.errors.length > 0 && (
              <div>
                <h4 className="text-sm font-medium text-amber-600 mb-2">Errors</h4>
                <div className="max-h-24 overflow-y-auto text-xs text-gray-600 bg-amber-50 p-2 rounded">
                  {parseResult.errors.slice(0, 10).map((err, i) => (
                    <div key={i}>{err}</div>
                  ))}
                  {parseResult.errors.length > 10 && (
                    <div className="text-amber-600">+ {parseResult.errors.length - 10} more errors</div>
                  )}
                </div>
              </div>
            )}

            <div className="flex gap-3 pt-2">
              <button
                onClick={() => { setShowPreview(false); setParseResult(null); }}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 text-sm font-light rounded hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleImport}
                disabled={parseResult.items.length === 0}
                className="flex-1 px-4 py-2 bg-[#E8E8E8] text-black text-sm font-light rounded hover:bg-gray-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Import {parseResult.items.length} Items
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
