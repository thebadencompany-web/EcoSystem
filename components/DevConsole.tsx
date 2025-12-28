import React, { useState, useRef, lazy, Suspense, useEffect } from 'react';
import { clearStemAgent, botanicalAnalysisAgent } from '../services/visionAgents';
import { GEMINI_API_KEY, isGeminiConfigured, isOpenAIConfigured } from '../services/config';
import { getCachedAnalysis, setCachedAnalysis, getCacheStats, clearAnalysisCache } from '../services/analysisCache';

const VisualDebugPanel = lazy(() => import('./VisualDebugPanel').then(m => ({ default: m.VisualDebugPanel })));

type TabType = 'connection' | 'vision' | 'pipeline' | 'settings';

interface DevConsoleProps {
  onClose?: () => void;
}

const DEV_PREFS_KEY = 'wreathWeaver_devPreferences';

interface DevPreferences {
  useAdvancedAI: boolean;
  seasonalPreference: 'spring' | 'summer' | 'fall' | 'winter' | 'auto';
  botanicalMode: 'traditional' | 'modern' | 'naturalistic' | 'abstract';
  enableEmotionalOverlays: boolean;
  enableBotanicalTextures: boolean;
}

const defaultPreferences: DevPreferences = {
  useAdvancedAI: false,
  seasonalPreference: 'auto',
  botanicalMode: 'naturalistic',
  enableEmotionalOverlays: true,
  enableBotanicalTextures: true
};

export const DevConsole: React.FC<DevConsoleProps> = ({ onClose }) => {
  const [activeTab, setActiveTab] = useState<TabType>('connection');
  const [result, setResult] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [preferences, setPreferences] = useState<DevPreferences>(() => {
    try {
      const saved = localStorage.getItem(DEV_PREFS_KEY);
      return saved ? { ...defaultPreferences, ...JSON.parse(saved) } : defaultPreferences;
    } catch {
      return defaultPreferences;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(DEV_PREFS_KEY, JSON.stringify(preferences));
    } catch (err) {
      console.warn('Failed to save dev preferences:', err);
    }
  }, [preferences]);

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedImage(file);
      const reader = new FileReader();
      reader.onload = () => setImagePreview(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const testConnection = async () => {
    setLoading(true);
    setResult('Testing function connection...');
    try {
      const response = await fetch('https://us-central1-wreath-weaver-kdfbb.cloudfunctions.net/clearStemAgent', {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });
      const text = await response.text();
      setResult(`Connection Test Result:\nStatus: ${response.status} ${response.ok ? '✓' : '✗'}\nResponse: ${text}`);
    } catch (error) {
      setResult(`Connection Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  const testClearStemWithImage = async () => {
    if (!selectedImage && !imagePreview) {
      setResult('Please select an image first');
      return;
    }
    setLoading(true);
    setResult('Testing background removal with selected image...');
    try {
      const response = await clearStemAgent(imagePreview);
      setResult(`Background Removal Result:\n\n${JSON.stringify(response, null, 2)}`);
    } catch (error) {
      setResult(`Background Removal Error:\n${error instanceof Error ? error.message : 'Unknown error'}\n\nAPI Key configured: ${GEMINI_API_KEY ? 'Yes' : 'No'}`);
    } finally {
      setLoading(false);
    }
  };

  const testBotanicalAnalysis = async () => {
    if (!selectedImage && !imagePreview) {
      setResult('Please select an image first');
      return;
    }
    setLoading(true);
    setResult('Analyzing botanical features...');
    try {
      const base64 = imagePreview.split(',')[1] || imagePreview;
      
      const cached = await getCachedAnalysis(base64);
      if (cached) {
        setResult(`Botanical Analysis Result (CACHED):\n\n${JSON.stringify(cached, null, 2)}`);
        setLoading(false);
        return;
      }
      
      const response = await botanicalAnalysisAgent(imagePreview);
      
      if (response.botanicalMetadata) {
        await setCachedAnalysis(base64, response.botanicalMetadata);
      }
      
      setResult(`Botanical Analysis Result:\n\n${JSON.stringify(response, null, 2)}`);
    } catch (error) {
      setResult(`Botanical Analysis Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  const updatePreference = <K extends keyof DevPreferences>(key: K, value: DevPreferences[K]) => {
    setPreferences(prev => ({ ...prev, [key]: value }));
  };

  if (!isGeminiConfigured) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-6 max-w-md">
          <h3 className="text-lg font-medium text-gray-800 mb-2">Gemini API Key Required</h3>
          <p className="text-gray-600 mb-4">Please configure your Gemini API key in services/config.ts to use dev tools.</p>
          {onClose && (
            <button onClick={onClose} className="px-4 py-2 bg-gray-200 rounded text-black font-light">
              Close
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-2xl w-[90vw] max-w-5xl h-[85vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <h2 className="text-xl font-light text-gray-900">Developer Console</h2>
          <div className="flex items-center gap-4">
            <div className="flex gap-2 text-xs">
              <span className={`px-2 py-1 rounded ${isGeminiConfigured ? 'bg-gray-100 text-gray-700' : 'bg-red-100 text-red-700'}`}>
                Gemini {isGeminiConfigured ? '✓' : '✗'}
              </span>
              <span className={`px-2 py-1 rounded ${isOpenAIConfigured ? 'bg-gray-100 text-gray-700' : 'bg-gray-50 text-gray-400'}`}>
                OpenAI {isOpenAIConfigured ? '✓' : '○'}
              </span>
            </div>
            {onClose && (
              <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl leading-none">
                ×
              </button>
            )}
          </div>
        </div>

        <div className="flex border-b border-gray-200">
          {(['connection', 'vision', 'pipeline', 'settings'] as TabType[]).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-6 py-3 text-sm font-light capitalize transition-colors ${
                activeTab === tab
                  ? 'border-b-2 border-gray-800 text-gray-900'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {tab === 'connection' ? 'Connection Test' : tab === 'vision' ? 'Vision Agents' : tab === 'pipeline' ? 'Pipeline Debug' : 'Settings'}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-auto p-6">
          {activeTab === 'connection' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-light mb-4">Firebase Functions Status</h3>
                <div className="bg-gray-50 p-4 rounded text-sm font-mono mb-4">
                  <p><strong>clearStemAgent:</strong> https://us-central1-wreath-weaver-kdfbb.cloudfunctions.net/clearStemAgent</p>
                  <p><strong>botanicalAnalysisAgent:</strong> https://us-central1-wreath-weaver-kdfbb.cloudfunctions.net/botanicalAnalysisAgent</p>
                </div>
                <button
                  onClick={testConnection}
                  disabled={loading}
                  className="px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded text-black font-light disabled:opacity-50"
                >
                  {loading ? 'Testing...' : 'Test Connection'}
                </button>
              </div>

              {result && (
                <div className="bg-gray-50 p-4 rounded">
                  <h4 className="text-sm font-medium mb-2">Result:</h4>
                  <pre className="text-sm whitespace-pre-wrap overflow-auto max-h-64">{result}</pre>
                </div>
              )}
            </div>
          )}

          {activeTab === 'vision' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-light mb-4">Test Vision Agents</h3>
                
                <div className="mb-4">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleImageSelect}
                    className="hidden"
                  />
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded text-black font-light"
                  >
                    Select Image
                  </button>
                  {selectedImage && (
                    <span className="ml-3 text-sm text-gray-600">{selectedImage.name}</span>
                  )}
                </div>

                {imagePreview && (
                  <div className="mb-4">
                    <img src={imagePreview} alt="Preview" className="max-h-48 rounded border border-gray-200" />
                  </div>
                )}

                <div className="flex gap-3">
                  <button
                    onClick={testClearStemWithImage}
                    disabled={loading || !imagePreview}
                    className="px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded text-black font-light disabled:opacity-50"
                  >
                    {loading ? 'Processing...' : 'Test Background Removal'}
                  </button>
                  <button
                    onClick={testBotanicalAnalysis}
                    disabled={loading || !imagePreview}
                    className="px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded text-black font-light disabled:opacity-50"
                  >
                    {loading ? 'Analyzing...' : 'Test Botanical Analysis'}
                  </button>
                </div>
              </div>

              {result && (
                <div className="bg-gray-50 p-4 rounded">
                  <h4 className="text-sm font-medium mb-2">Result:</h4>
                  <pre className="text-sm whitespace-pre-wrap overflow-auto max-h-96">{result}</pre>
                </div>
              )}
            </div>
          )}

          {activeTab === 'pipeline' && (
            <Suspense fallback={<div className="text-center py-8 text-gray-500">Loading debug panel...</div>}>
              <VisualDebugPanel
                blueprint={undefined}
                logicEngineOutput={undefined}
                inventory={[]}
              />
            </Suspense>
          )}

          {activeTab === 'settings' && (
            <div className="space-y-6 max-w-lg">
              <h3 className="text-lg font-light mb-4">Development Preferences</h3>
              
              <div className="space-y-4">
                <label className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={preferences.useAdvancedAI}
                    onChange={(e) => updatePreference('useAdvancedAI', e.target.checked)}
                    className="rounded border-gray-300"
                  />
                  <span className="text-sm">Enable Advanced AI Processing (GPT-5 Pro)</span>
                </label>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Seasonal Preference</label>
                  <select
                    value={preferences.seasonalPreference}
                    onChange={(e) => updatePreference('seasonalPreference', e.target.value as any)}
                    className="w-full px-3 py-2 border border-gray-300 rounded text-sm"
                  >
                    <option value="auto">Auto-detect</option>
                    <option value="spring">Spring</option>
                    <option value="summer">Summer</option>
                    <option value="fall">Fall</option>
                    <option value="winter">Winter</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Botanical Styling</label>
                  <select
                    value={preferences.botanicalMode}
                    onChange={(e) => updatePreference('botanicalMode', e.target.value as any)}
                    className="w-full px-3 py-2 border border-gray-300 rounded text-sm"
                  >
                    <option value="naturalistic">Naturalistic</option>
                    <option value="traditional">Traditional</option>
                    <option value="modern">Modern</option>
                    <option value="abstract">Abstract</option>
                  </select>
                </div>

                <label className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={preferences.enableEmotionalOverlays}
                    onChange={(e) => updatePreference('enableEmotionalOverlays', e.target.checked)}
                    className="rounded border-gray-300"
                  />
                  <span className="text-sm">Enable Emotional Overlays</span>
                </label>

                <label className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={preferences.enableBotanicalTextures}
                    onChange={(e) => updatePreference('enableBotanicalTextures', e.target.checked)}
                    className="rounded border-gray-300"
                  />
                  <span className="text-sm">Enable Botanical Textures</span>
                </label>
              </div>

              <div className="pt-4 border-t border-gray-200 space-y-3">
                <button
                  onClick={() => setPreferences(defaultPreferences)}
                  className="px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded text-black font-light text-sm"
                >
                  Reset to Defaults
                </button>
                
                <div className="mt-4">
                  <h4 className="text-sm font-medium text-gray-700 mb-2">Analysis Cache</h4>
                  <p className="text-xs text-gray-500 mb-2">
                    {(() => {
                      const stats = getCacheStats();
                      return `${stats.entries} cached entries | Oldest: ${stats.oldestAge} | Newest: ${stats.newestAge}`;
                    })()}
                  </p>
                  <button
                    onClick={() => { clearAnalysisCache(); setResult('Cache cleared'); }}
                    className="px-3 py-1 bg-gray-200 hover:bg-gray-300 rounded text-black font-light text-xs"
                  >
                    Clear Cache
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default DevConsole;
