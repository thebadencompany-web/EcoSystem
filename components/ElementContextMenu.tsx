// components/ElementContextMenu.tsx
import React, { useEffect, useRef } from 'react';

interface ElementContextMenuProps {
  x: number;
  y: number;
  onDuplicate: () => void;
  onDelete: () => void;
  onBringToFront: () => void;
  onSendToBack: () => void;
  onFlipHorizontal: () => void;
  onFlipVertical: () => void;
  onClose: () => void;
  isBaseElement?: boolean;
  onSwapBase?: () => void;
}

export const ElementContextMenu: React.FC<ElementContextMenuProps> = ({
  x,
  y,
  onDuplicate,
  onDelete,
  onBringToFront,
  onSendToBack,
  onFlipHorizontal,
  onFlipVertical,
  onClose,
  isBaseElement = false,
  onSwapBase
}) => {
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);
    
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [onClose]);

  const baseMenuItems = [
    ...(onSwapBase ? [{ label: 'Swap Base', icon: 'swap', action: onSwapBase }] : []),
    { type: 'divider' },
    { label: 'Flip Horizontal', icon: 'flipH', action: onFlipHorizontal },
    { label: 'Flip Vertical', icon: 'flipV', action: onFlipVertical },
  ];

  const regularMenuItems = [
    { label: 'Duplicate', icon: 'copy', action: onDuplicate, shortcut: 'Ctrl+D' },
    { label: 'Delete', icon: 'trash', action: onDelete, shortcut: 'Del', danger: true },
    { type: 'divider' },
    { label: 'Bring to Front', icon: 'up', action: onBringToFront },
    { label: 'Send to Back', icon: 'down', action: onSendToBack },
    { type: 'divider' },
    { label: 'Flip Horizontal', icon: 'flipH', action: onFlipHorizontal },
    { label: 'Flip Vertical', icon: 'flipV', action: onFlipVertical },
  ];

  const menuItems = isBaseElement ? baseMenuItems : regularMenuItems;

  const getIcon = (iconName: string) => {
    switch (iconName) {
      case 'copy':
        return (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
          </svg>
        );
      case 'trash':
        return (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
        );
      case 'up':
        return (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 11l7-7 7 7M5 19l7-7 7 7" />
          </svg>
        );
      case 'down':
        return (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 13l-7 7-7-7m14-8l-7 7-7-7" />
          </svg>
        );
      case 'flipH':
        return (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
          </svg>
        );
      case 'flipV':
        return (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m-8 6H4m0 0l4 4m-4-4l4-4" />
          </svg>
        );
      case 'swap':
        return (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12M8 7l4-4M8 7l4 4m4 10H4m12 0l-4 4m4-4l-4-4" />
          </svg>
        );
      default:
        return null;
    }
  };

  return (
    <div
      ref={menuRef}
      className="fixed bg-white rounded-lg shadow-lg border py-1 z-50 min-w-[180px] animate-fade-in"
      style={{ left: x, top: y }}
    >
      {menuItems.map((item, index) => {
        if (item.type === 'divider') {
          return <div key={index} className="border-t my-1" />;
        }
        
        return (
          <button
            key={item.label}
            onClick={() => {
              item.action?.();
              onClose();
            }}
            className={`w-full px-3 py-2 text-left text-sm flex items-center gap-2 hover:bg-gray-100 ${
              item.danger ? 'text-red-600 hover:bg-red-50' : 'text-gray-700'
            }`}
          >
            <span className="text-gray-400">{getIcon(item.icon!)}</span>
            <span className="flex-1">{item.label}</span>
            {item.shortcut && (
              <span className="text-xs text-gray-400">{item.shortcut}</span>
            )}
          </button>
        );
      })}
    </div>
  );
};
