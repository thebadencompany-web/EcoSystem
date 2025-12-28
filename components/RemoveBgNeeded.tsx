// components/RemoveBgNeeded.tsx
import React from 'react';

const codeSnippet = `
# functions/.env

# ❗❗❗ ACTION REQUIRED ❗❗❗
#
# To enable the premium background removal feature, set your remove.bg API key here.
# You can get a free key from https://www.remove.bg/dashboard#api-key
# This file is used by Firebase Functions at runtime (server-side).

REMOVE_BG_API_KEY=YOUR_REMOVE_BG_API_KEY
`;

export const RemoveBgNeeded: React.FC = () => {
  return (
    <div className="max-w-2xl w-full bg-yellow-50 rounded-lg shadow-lg p-8 border border-yellow-400 text-yellow-900">
      <h1 className="text-2xl font-bold mb-4">Feature Requires Configuration</h1>
      <p className="text-lg mb-6">
        To use the advanced background removal feature, provide an API key from <a href="https://www.remove.bg/" target="_blank" rel="noopener noreferrer" className="underline font-semibold hover:text-yellow-800">remove.bg</a> on the server.
      </p>
      <div className="space-y-4">
        <div>
          <h2 className="text-xl font-semibold mb-2">Step 1: Create the Functions Environment File</h2>
          <p>
            In your project's file explorer, create or open: <code className="text-sm bg-yellow-100 px-1 rounded">functions/.env</code>
          </p>
        </div>
        <div>
          <h2 className="text-xl font-semibold mb-2">Step 2: Add Your API Key</h2>
          <p>
            In the <code className="text-sm bg-yellow-100 px-1 rounded">functions/.env</code> file, set <code className="text-sm bg-yellow-100 px-1 rounded">REMOVE_BG_API_KEY</code> to your actual API key.
          </p>
          <pre className="bg-yellow-100 p-4 rounded-md mt-2 overflow-x-auto">
            <code className="text-sm font-mono whitespace-pre">
              {codeSnippet.trim()}
            </code>
          </pre>
          <a
            href="https://www.remove.bg/dashboard#api-key"
            target="_blank"
            rel="noopener noreferrer"
            className="mt-4 inline-block text-yellow-800 font-semibold hover:text-yellow-900 transition-colors"
          >
            Get your remove.bg API key &rarr;
          </a>
        </div>
        <div>
          <h2 className="text-xl font-semibold mb-2">Step 3: Redeploy Functions</h2>
          <p>
            Deploy your Cloud Functions so the server picks up the new environment variable. In the terminal:
          </p>
          <pre className="bg-yellow-100 p-4 rounded-md mt-2 overflow-x-auto">
            <code className="text-sm font-mono whitespace-pre">cd functions
npm run deploy</code>
          </pre>
        </div>
      </div>
      <p className="mt-8 text-sm">Once deployed, try the background removal again.</p>
    </div>
  );
};