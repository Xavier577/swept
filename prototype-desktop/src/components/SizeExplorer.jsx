import { useState, useMemo } from 'react';
import {
  ChevronRight,
  ChevronDown,
  Folder,
  File,
  Trash2,
  RefreshCw,
  ArrowUp,
  Check,
  Loader2,
  Home,
  Copy,
} from 'lucide-react';
import { formatBytes } from '../utils/formatters';

function SizeBar({ size, maxSize, color = '#3b82f6' }) {
  const percentage = maxSize > 0 ? Math.min(100, (size / maxSize) * 100) : 0;
  return (
    <div className="w-24 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
      <div
        className="h-full rounded-full transition-all duration-300"
        style={{ width: `${percentage}%`, backgroundColor: color }}
      />
    </div>
  );
}

function EntryRow({
  entry,
  maxSize,
  isSelected,
  onToggleSelect,
  onExpand,
  isExpanded,
  children,
  level = 0,
  onNavigate,
  copiedPath,
  onCopyPath,
}) {
  const indent = level * 24;

  const handleCopyPath = async (e) => {
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(entry.path);
      onCopyPath(entry.path);
    } catch (err) {
      console.error('Failed to copy path:', err);
    }
  };

  return (
    <>
      <div
        className={`group flex items-center gap-3 px-4 py-2.5 border-b border-gray-100 hover:bg-gray-50 transition-colors ${
          isSelected ? 'bg-blue-50' : ''
        }`}
        style={{ paddingLeft: `${16 + indent}px` }}
      >
        {/* Checkbox */}
        <button
          onClick={() => onToggleSelect(entry.path)}
          className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors flex-shrink-0 ${
            isSelected
              ? 'bg-blue-500 border-blue-500'
              : 'border-gray-300 hover:border-gray-400'
          }`}
        >
          {isSelected && <Check className="w-3 h-3 text-white" />}
        </button>

        {/* Expand button (for directories) */}
        {entry.is_dir ? (
          <button
            onClick={() => onExpand(entry.path)}
            className="p-1 hover:bg-gray-200 rounded transition-colors flex-shrink-0"
          >
            {isExpanded ? (
              <ChevronDown className="w-4 h-4 text-gray-500" />
            ) : (
              <ChevronRight className="w-4 h-4 text-gray-500" />
            )}
          </button>
        ) : (
          <span className="w-6" />
        )}

        {/* Icon */}
        {entry.is_dir ? (
          <Folder className="w-5 h-5 text-blue-500 flex-shrink-0" />
        ) : (
          <File className="w-5 h-5 text-gray-400 flex-shrink-0" />
        )}

        {/* Name and Path */}
        <div className="flex-1 min-w-0">
          {/* Name - clickable for directories */}
          {entry.is_dir ? (
            <button
              onClick={() => onNavigate(entry.path)}
              className="text-left font-medium text-gray-800 hover:text-blue-600 truncate block w-full"
            >
              {entry.name}
            </button>
          ) : (
            <span className="text-gray-700 truncate block">{entry.name}</span>
          )}
          {/* Path with copy button */}
          <div className="flex items-center gap-1.5 mt-0.5">
            <span className="text-xs text-gray-400 truncate">{entry.path}</span>
            <div className="relative flex-shrink-0">
              <button
                onClick={handleCopyPath}
                className="p-0.5 rounded hover:bg-gray-200 transition-colors opacity-0 group-hover:opacity-100"
                title="Copy path"
              >
                <Copy className="w-3 h-3 text-gray-400 hover:text-gray-600" />
              </button>
              {copiedPath === entry.path && (
                <span className="absolute left-full ml-1 top-1/2 -translate-y-1/2 text-xs text-green-600 bg-green-50 px-1.5 py-0.5 rounded whitespace-nowrap">
                  Copied!
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Children count */}
        {entry.is_dir && entry.children_count > 0 && (
          <span className="text-xs text-gray-400 flex-shrink-0">
            {entry.children_count} items
          </span>
        )}

        {/* Size bar */}
        <SizeBar size={entry.size} maxSize={maxSize} />

        {/* Size */}
        <span className="w-20 text-right text-sm font-medium text-gray-700 flex-shrink-0">
          {formatBytes(entry.size)}
        </span>
      </div>

      {/* Expanded children */}
      {isExpanded && children && children.length > 0 && (
        <div>
          {children.map((child) => (
            <EntryRow
              key={child.path}
              entry={child}
              maxSize={maxSize}
              isSelected={false}
              onToggleSelect={onToggleSelect}
              onExpand={onExpand}
              isExpanded={false}
              children={[]}
              level={level + 1}
              onNavigate={onNavigate}
              copiedPath={copiedPath}
              onCopyPath={onCopyPath}
            />
          ))}
        </div>
      )}
    </>
  );
}

export default function SizeExplorer({
  scanResult,
  isScanning,
  onScan,
  onNavigate,
  onGoUp,
  onGoHome,
  selectedPaths,
  onToggleSelect,
  onSelectAll,
  onDelete,
  expandedPaths,
  onToggleExpand,
  childrenCache,
}) {
  const [copiedPath, setCopiedPath] = useState(null);

  const entries = scanResult?.entries || [];
  const maxSize = entries.length > 0 ? entries[0].size : 0;
  const selectedCount = selectedPaths.size;
  const selectedSize = entries
    .filter((e) => selectedPaths.has(e.path))
    .reduce((acc, e) => acc + e.size, 0);

  const allSelected = entries.length > 0 && entries.every((e) => selectedPaths.has(e.path));

  const handleCopyPath = (path) => {
    setCopiedPath(path);
    // Clear the "Copied!" feedback after 2 seconds
    setTimeout(() => {
      setCopiedPath(null);
    }, 2000);
  };

  // Parse path for breadcrumbs
  const pathParts = scanResult?.path?.split('/').filter(Boolean) || [];

  return (
    <div className="flex-1 flex flex-col min-h-screen content-with-titlebar">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between mb-3">
          {/* Breadcrumb path */}
          <div className="flex items-center gap-1 text-sm">
            <button
              onClick={onGoHome}
              className="p-1 hover:bg-gray-100 rounded transition-colors"
            >
              <Home className="w-4 h-4 text-gray-500" />
            </button>
            {pathParts.map((part, index) => {
              const fullPath = '/' + pathParts.slice(0, index + 1).join('/');
              const isLast = index === pathParts.length - 1;
              return (
                <span key={fullPath} className="flex items-center">
                  <ChevronRight className="w-4 h-4 text-gray-400" />
                  {isLast ? (
                    <span className="font-medium text-gray-800 px-1">{part}</span>
                  ) : (
                    <button
                      onClick={() => onNavigate(fullPath)}
                      className="text-gray-600 hover:text-blue-600 px-1"
                    >
                      {part}
                    </button>
                  )}
                </span>
              );
            })}
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2">
            {scanResult?.parent && (
              <button
                onClick={onGoUp}
                className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <ArrowUp className="w-4 h-4" />
                Up
              </button>
            )}
            <button
              onClick={onScan}
              disabled={isScanning}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-blue-500 hover:bg-blue-600 disabled:bg-blue-400 text-white rounded-lg transition-colors"
            >
              <RefreshCw className={`w-4 h-4 ${isScanning ? 'animate-spin' : ''}`} />
              {isScanning ? 'Scanning...' : 'Refresh'}
            </button>
          </div>
        </div>

        {/* Stats bar */}
        <div className="flex items-center justify-between text-sm">
          <div className="text-gray-600">
            <span className="font-medium text-gray-800">{entries.length}</span> items,{' '}
            <span className="font-medium text-gray-800">
              {formatBytes(scanResult?.total_size || 0)}
            </span>{' '}
            total
          </div>
          {selectedCount > 0 && (
            <div className="flex items-center gap-3">
              <span className="text-gray-600">
                <span className="font-medium text-blue-600">{selectedCount}</span> selected (
                {formatBytes(selectedSize)})
              </span>
              <button
                onClick={onDelete}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-red-500 hover:bg-red-600 text-white text-sm rounded-lg transition-colors"
              >
                <Trash2 className="w-4 h-4" />
                Delete
              </button>
            </div>
          )}
        </div>
      </div>

      {/* List header */}
      <div className="flex items-center gap-3 px-4 py-2 bg-gray-50 border-b border-gray-200 text-xs font-medium text-gray-500 uppercase tracking-wider">
        <button
          onClick={onSelectAll}
          className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors flex-shrink-0 ml-0 ${
            allSelected
              ? 'bg-blue-500 border-blue-500'
              : 'border-gray-300 hover:border-gray-400'
          }`}
        >
          {allSelected && <Check className="w-3 h-3 text-white" />}
        </button>
        <span className="w-6" />
        <span className="w-5" />
        <span className="flex-1">Name</span>
        <span className="w-16 text-right">Items</span>
        <span className="w-24 text-center">Size</span>
        <span className="w-20 text-right">Size</span>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto bg-white">
        {isScanning ? (
          <div className="flex flex-col items-center justify-center py-20">
            <Loader2 className="w-10 h-10 text-blue-500 animate-spin mb-4" />
            <p className="text-gray-600">Scanning directory...</p>
            <p className="text-sm text-gray-400 mt-1">This may take a moment for large directories</p>
          </div>
        ) : entries.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20">
            <Folder className="w-16 h-16 text-gray-300 mb-4" />
            <p className="text-gray-600">This directory is empty</p>
          </div>
        ) : (
          entries.map((entry) => (
            <EntryRow
              key={entry.path}
              entry={entry}
              maxSize={maxSize}
              isSelected={selectedPaths.has(entry.path)}
              onToggleSelect={onToggleSelect}
              onExpand={onToggleExpand}
              isExpanded={expandedPaths.has(entry.path)}
              children={childrenCache[entry.path] || []}
              level={0}
              onNavigate={onNavigate}
              copiedPath={copiedPath}
              onCopyPath={handleCopyPath}
            />
          ))
        )}
      </div>
    </div>
  );
}
