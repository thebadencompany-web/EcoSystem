import React, { useState, lazy, Suspense } from 'react';

const DevConsole = lazy(() => import('./DevConsole'));

const IS_PRODUCTION = import.meta.env.PROD;

interface DevToolsButtonProps {
  className?: string;
}

export const DevToolsButton: React.FC<DevToolsButtonProps> = ({ className }) => {
  const [isOpen, setIsOpen] = useState(false);

  if (IS_PRODUCTION) {
    return null;
  }

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className={`fixed bottom-4 right-4 z-40 px-3 py-2 bg-gray-800 text-white text-xs font-light rounded shadow-lg hover:bg-gray-700 transition-colors ${className || ''}`}
        title="Open Developer Console"
      >
        Dev Console
      </button>
      
      {isOpen && (
        <Suspense fallback={
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6">
              <p className="text-gray-600">Loading developer tools...</p>
            </div>
          </div>
        }>
          <DevConsole onClose={() => setIsOpen(false)} />
        </Suspense>
      )}
    </>
  );
};

export const withDevGuard = <P extends object>(
  Component: React.ComponentType<P>,
  options?: { showInProd?: boolean }
): React.FC<P> => {
  return (props: P) => {
    if (IS_PRODUCTION && !options?.showInProd) {
      return null;
    }
    return <Component {...props} />;
  };
};

export default DevToolsButton;
