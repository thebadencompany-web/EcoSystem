import React, { useState } from 'react';
import { clearStemAgent, botanicalAnalysisAgent } from '../services/aiAgents';
import { GEMINI_API_KEY, isGeminiConfigured } from '../services/config';

export const VisionAgentTester: React.FC = () => {
  const [result, setResult] = useState<string>('');
  const [loading, setLoading] = useState(false);
  

  const testImageBase64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==';

  const testClearStemAgent = async () => {
    setLoading(true);
    setResult('Testing clearStemAgent...');
    
    try {
      const response = await clearStemAgent({ base64: testImageBase64, mimeType: 'image/png' });
      setResult(`SUCCESS!\n\n${JSON.stringify(response, null, 2)}`);
    } catch (error) {
      setResult(`ERROR DETAILS:\n\nMessage: ${error instanceof Error ? error.message : 'Unknown error'}\n\nAPI Key configured: ${GEMINI_API_KEY ? 'Yes' : 'No'}\nAPI Key length: ${GEMINI_API_KEY.length}\n\nTest image size: ${testImageBase64.length} bytes`);
    } finally {
      setLoading(false);
    }
  };

  const testBotanicalAnalysisAgent = async () => {
    setLoading(true);
    setResult('Testing botanicalAnalysisAgent...');
    
    try {
      const response = await botanicalAnalysisAgent({ base64: testImageBase64, mimeType: 'image/png' });
      setResult(JSON.stringify(response, null, 2));
    } catch (error) {
      setResult(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  const testConnection = async () => {
    setLoading(true);
    setResult('Testing function connection...');
    
    try {
      const response = await fetch('https://us-central1-wreath-weaver-kdfbb.cloudfunctions.net/clearStemAgent', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      const text = await response.text();
      setResult(`Connection test result:\nStatus: ${response.status}\nResponse: ${text}`);
    } catch (error) {
      setResult(`Connection Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  const testDirectPost = async () => {
    setLoading(true);
    setResult('Testing direct POST to clearStemAgent...');
    
    try {
      const response = await fetch('https://us-central1-wreath-weaver-kdfbb.cloudfunctions.net/clearStemAgent', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          imageBase64: testImageBase64,
          apiKey: GEMINI_API_KEY
        })
      });
      
      const text = await response.text();
      setResult(`Direct POST result:\nStatus: ${response.status}\nResponse: ${text}`);
    } catch (error) {
      setResult(`Direct POST Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  if (!isGeminiConfigured) {
    return (
      <div className="p-4 bg-gray-100 border border-gray-300 rounded">
        <h3 className="text-lg font-medium text-gray-800">Gemini API Key Required</h3>
        <p className="text-gray-600">Please configure your Gemini API key in services/config.ts</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6 bg-white rounded-lg shadow-lg">
      <h2 className="text-2xl font-medium mb-4">Vision Agent Tester</h2>
      
      <div className="space-y-4">
        <div className="flex gap-4 flex-wrap">
          <button
            onClick={testConnection}
            disabled={loading}
          >
            {loading ? 'Testing...' : 'Test Connection'}
          </button>
          
          <button
            onClick={testDirectPost}
            disabled={loading}
          >
            {loading ? 'Testing...' : 'Direct POST Test'}
          </button>
          
          <button
            onClick={testClearStemAgent}
            disabled={loading}
          >
            {loading ? 'Testing...' : 'Test Clear Stem Agent'}
          </button>
          
          <button
            onClick={testBotanicalAnalysisAgent}
            disabled={loading}
          >
            {loading ? 'Testing...' : 'Test Botanical Analysis Agent'}
          </button>
        </div>

        <div className="mt-6">
          <h3 className="text-lg font-medium mb-2">Function URLs:</h3>
          <div className="bg-gray-100 p-3 rounded text-sm">
            <p><strong>clearStemAgent:</strong> https://us-central1-wreath-weaver-kdfbb.cloudfunctions.net/clearStemAgent</p>
            <p><strong>botanicalAnalysisAgent:</strong> https://us-central1-wreath-weaver-kdfbb.cloudfunctions.net/botanicalAnalysisAgent</p>
          </div>
        </div>

        <div className="mt-6">
          <h3 className="text-lg font-medium mb-2">Test Results:</h3>
          <pre className="bg-gray-100 p-4 rounded text-sm overflow-auto max-h-96 whitespace-pre-wrap">
            {result || 'No test results yet...'}
          </pre>
        </div>
      </div>
    </div>
  );
};
