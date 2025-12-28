import React from 'react';

interface OutputViewerProps {
  output: any;
  error: string | null;
  isLoading: boolean;
}

export const OutputViewer: React.FC<OutputViewerProps> = ({ output, error, isLoading }) => {
  return (
    <div className="p-4 bg-gray-100 rounded-lg border border-gray-200 h-full flex flex-col">
      <h3 className="text-sm font-medium text-gray-700 mb-2 flex-shrink-0">Agent Output</h3>
      <div className="w-full flex-grow bg-white rounded-md p-2 overflow-auto border border-gray-200">
        {isLoading ? (
          <div className="flex items-center justify-center h-full text-gray-500">
            Running agent...
          </div>
        ) : error ? (
          <pre className="text-red-600 text-xs whitespace-pre-wrap">{error}</pre>
        ) : output !== null ? (
          <pre className="text-xs whitespace-pre-wrap text-gray-800">
            {JSON.stringify(output, null, 2)}
          </pre>
        ) : (
          <div className="flex items-center justify-center h-full text-gray-500">
            Output will appear here.
          </div>
        )}
      </div>
    </div>
  );
};
