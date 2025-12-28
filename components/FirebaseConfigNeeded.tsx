// components/FirebaseConfigNeeded.tsx
import React from 'react';

const codeSnippet = `
// services/firebaseConfig.ts

const firebaseConfig = {
  apiKey: "AIzaSyB65uQ3o4BIEe9MvVpwcWwcJ56qy8yreEI",
  authDomain: "wreath-weaver-kdfbb.firebaseapp.com",
  projectId: "wreath-weaver-kdfbb",
  storageBucket: "wreath-weaver-kdfbb.firebasestorage.app",
  messagingSenderId: "608433033691",
  appId: "1:608433033691:web:524dee3f6a726e337ad7fe"
};
`;

export const FirebaseConfigNeeded: React.FC = () => {
  return (
    <div className="fixed inset-0 bg-gray-800 bg-opacity-95 z-50 flex items-center justify-center p-8 text-white font-sans">
      <div className="max-w-2xl w-full bg-gray-900 rounded-lg shadow-2xl p-8 border border-red-500">
        <h1 className="text-3xl font-bold text-red-400 mb-4">Action Required: Configure Firebase</h1>
        <p className="text-lg text-gray-300 mb-6">
          This application requires a connection to a Firebase project to store your data, but it looks like the configuration is missing.
        </p>
        <div className="space-y-4">
          <div>
            <h2 className="text-xl font-semibold text-navy-500 mb-2">Step 1: Locate the Configuration File</h2>
            <p className="text-gray-400">
              In your project's file explorer, open the following file:
            </p>
            <code className="block bg-gray-800 text-yellow-300 p-3 rounded-md mt-2">
              services/firebaseConfig.ts
            </code>
          </div>
          <div>
            <h2 className="text-xl font-semibold text-navy-500 mb-2">Step 2: Add Your Credentials</h2>
            <p className="text-gray-400">
              Replace the placeholder values in the <code className="text-sm bg-gray-700 px-1 rounded">firebaseConfig</code> object with the actual credentials from your Firebase project console.
            </p>
            <pre className="bg-gray-800 p-4 rounded-md mt-2 overflow-x-auto">
              <code className="text-sm font-mono whitespace-pre">
                {codeSnippet.trim()}
              </code>
            </pre>
            <a
              href="https://console.firebase.google.com/"
              target="_blank"
              rel="noopener noreferrer"
              className="mt-4 inline-block text-navy-500 hover:text-navy-500 transition-colors"
            >
              Go to Firebase Console &rarr;
            </a>
          </div>
        </div>
        <p className="mt-8 text-sm text-gray-500">
          Once you save your changes, the application should reload automatically.
        </p>
      </div>
    </div>
  );
};