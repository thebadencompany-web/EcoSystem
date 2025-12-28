// components/FloralImageProcessor.tsx
import React, { useState, useCallback } from 'react';
import { fileToBase64 } from '../services/visionAgents';
import {
  clearStemAgent,
  botanicalAnalysisAgent,
} from '../services/aiAgents';

interface FloralImageProcessorProps {
  geminiApiKey: string;
}

export const FloralImageProcessor: React.FC<FloralImageProcessorProps> = ({
  geminiApiKey
}) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [processing, setProcessing] = useState(false);
  // Agent return shapes vary between implementations; keep `any` to accept either
  const [clearingResult, setClearingResult] = useState<any | null>(null);
  const [analysisResult, setAnalysisResult] = useState<any | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const handleFileSelect = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setError(null);
      setClearingResult(null);
      setAnalysisResult(null);

      // Create preview URL
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
    }
  }, []);

  const handleClearBackground = async () => {
    if (!selectedFile || !geminiApiKey) return;

    setProcessing(true);
    setError(null);

    try {
      const base64 = await fileToBase64(selectedFile);
      const result = await clearStemAgent({ base64, mimeType: selectedFile.type });
      setClearingResult(result);
    } catch (err) {
      // Check for specific missing key error
      if (err instanceof Error && err.message === 'REMOVE_BG_KEY_MISSING') {
        // Fallback to client-side removal
        try {
          // Dynamically import to avoid load-time dependency if not used
          const { loadImage, removeBackground, blobToBase64 } = await import('../lib/backgroundRemoval');
          const img = await loadImage(selectedFile);
          const blob = await removeBackground(img);
          const fallbackBase64 = await blobToBase64(blob);

          setClearingResult({
            success: true,
            message: "Background cleared (Basic Mode)",
            cleanedImageBase64: fallbackBase64,
            analysis: "Premium removal failed (API key missing). Used basic color-based removal.",
            note: "Add REMOVE_BG_API_KEY to functions/.env for high-quality AI usage."
          });
        } catch (fallbackErr) {
          setError('Both premium and basic background removal failed.');
        }
      } else {
        setError(err instanceof Error ? err.message : 'Background clearing failed');
      }
    } finally {
      setProcessing(false);
    }
  };

  const handleBotanicalAnalysis = async () => {
    if (!selectedFile || !geminiApiKey) return;

    setProcessing(true);
    setError(null);

    try {
      const base64 = await fileToBase64(selectedFile);
      const result = await botanicalAnalysisAgent({ base64, mimeType: selectedFile.type });
      setAnalysisResult(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Botanical analysis failed');
    } finally {
      setProcessing(false);
    }
  };

  const handleFullProcessing = async () => {
    if (!selectedFile || !geminiApiKey) return;

    setProcessing(true);
    setError(null);

    try {
      const base64 = await fileToBase64(selectedFile);
      const clearing = await clearStemAgent({ base64, mimeType: selectedFile.type });
      const analysis = await botanicalAnalysisAgent({ base64, mimeType: selectedFile.type });
      setClearingResult(clearing);
      setAnalysisResult(analysis);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Full processing failed');
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6 bg-white rounded-lg shadow-lg">
      <h2 className="text-2xl font-bold mb-6 text-center">Floral Image Processor</h2>

      {/* File Upload */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Select Floral Image
        </label>
        <input
          type="file"
          accept="image/*"
          onChange={handleFileSelect}
          className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-navy-500 focus:border-transparent"
        />
      </div>

      {/* Image Preview */}
      {previewUrl && (
        <div className="mb-6">
          <h3 className="text-lg font-semibold mb-2">Image Preview</h3>
          <img
            src={previewUrl}
            alt="Preview"
            className="max-w-full h-64 object-contain mx-auto border rounded"
          />
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex flex-wrap gap-4 mb-6">
        <button
          onClick={handleClearBackground}
          disabled={!selectedFile || processing || !geminiApiKey}
          className="px-4 py-2 bg-navy-600 text-white rounded hover:bg-navy-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {processing ? 'Processing...' : 'Clear Background'}
        </button>

        <button
          onClick={handleBotanicalAnalysis}
          disabled={!selectedFile || processing || !geminiApiKey}
          className="px-4 py-2 bg-navy-600 text-white rounded hover:bg-navy-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {processing ? 'Analyzing...' : 'Analyze Botanical Data'}
        </button>

        <button
          onClick={handleFullProcessing}
          disabled={!selectedFile || processing || !geminiApiKey}
          className="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {processing ? 'Processing...' : 'Full Processing'}
        </button>
      </div>

      {/* API Key Warning */}
      {!geminiApiKey && (
        <div className="mb-6 p-4 bg-yellow-100 border border-yellow-400 rounded">
          <p className="text-yellow-800">
            Gemini API key is required. Please configure it in your environment.
          </p>
        </div>
      )}

      {/* Error Display */}
      {error && (
        <div className="mb-6 p-4 bg-red-100 border border-red-400 rounded">
          <p className="text-red-700">Error: {error}</p>
        </div>
      )}

      {/* Results */}
      <div className="space-y-6">
        {/* Background Clearing Results */}
        {clearingResult && (
          <div className="border rounded p-4">
            <h3 className="text-lg font-semibold mb-2">Background Clearing Results</h3>
            <div className="space-y-2">
              <p><strong>Status:</strong> {clearingResult.success ? 'Success' : 'Failed'}</p>
              <p><strong>Message:</strong> {clearingResult.message}</p>
              <div className="bg-gray-50 p-3 rounded">
                <p className="text-sm"><strong>Analysis:</strong></p>
                <p className="text-sm text-gray-700">{clearingResult.analysis}</p>
              </div>
              {clearingResult.note && (
                <div className="bg-blue-50 p-3 rounded">
                  <p className="text-sm text-blue-700">{clearingResult.note}</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Botanical Analysis Results */}
        {analysisResult && (
          <div className="border rounded p-4">
            <h3 className="text-lg font-semibold mb-2">Botanical Analysis Results</h3>
            <div className="space-y-4">
              {analysisResult.botanicalMetadata.map((metadata, index) => (
                <div key={index} className="bg-green-50 p-4 rounded border">
                  <h4 className="font-semibold text-green-800">{metadata.name}</h4>
                  <div className="grid grid-cols-2 gap-2 text-sm mt-2">
                    <p><strong>Color:</strong> {metadata.color}</p>
                    <p><strong>Emotion:</strong> {metadata.emotion}</p>
                    <p><strong>Symbolism:</strong> {metadata.symbolism}</p>
                    <p><strong>Impact Score:</strong> {metadata.emotionalImpactScore}/10</p>
                  </div>
                  {metadata.svgSchematic && (
                    <div className="mt-2">
                      <p className="text-xs text-gray-600"><strong>SVG Schematic:</strong></p>
                      <code className="text-xs bg-gray-100 p-1 rounded block mt-1">
                        {metadata.svgSchematic}
                      </code>
                    </div>
                  )}
                </div>
              ))}

              {/* Raw Analysis */}
              <details className="mt-4">
                <summary className="cursor-pointer font-medium">Raw Analysis Data</summary>
                <pre className="bg-gray-50 p-3 rounded mt-2 text-xs overflow-auto">
                  {analysisResult.rawAnalysis}
                </pre>
              </details>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};