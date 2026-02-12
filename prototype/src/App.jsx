import { useState, useCallback, useEffect, useRef } from 'react';
import { invoke } from '@tauri-apps/api/core';
import Sidebar from './components/Sidebar';
import SizeExplorer from './components/SizeExplorer';
import ConfirmModal from './components/ConfirmModal';
import Cleaner from './components/Cleaner';
import Onboarding from './components/Onboarding';

const ONBOARDING_COMPLETE_KEY = 'swept-onboarding-complete';

function App() {
  const [showOnboarding, setShowOnboarding] = useState(() => {
    // Check if onboarding was completed before
    return localStorage.getItem(ONBOARDING_COMPLETE_KEY) !== 'true';
  });
  const [homePath, setHomePath] = useState('');
  const [currentPath, setCurrentPath] = useState('');
  const [scanResult, setScanResult] = useState(null);
  const [isScanning, setIsScanning] = useState(false);
  const [selectedPaths, setSelectedPaths] = useState(new Set());
  const [expandedPaths, setExpandedPaths] = useState(new Set());
  const [childrenCache, setChildrenCache] = useState({});
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [error, setError] = useState(null);
  const [sizesLoading, setSizesLoading] = useState(new Set());
  const [currentView, setCurrentView] = useState('cleaner');

  // Track which scan is current to avoid race conditions
  const scanIdRef = useRef(0);

  const handleOnboardingComplete = useCallback(() => {
    localStorage.setItem(ONBOARDING_COMPLETE_KEY, 'true');
    setShowOnboarding(false);
  }, []);

  // Initialize - get home path and do initial scan (only after onboarding)
  useEffect(() => {
    if (showOnboarding) return;

    const init = async () => {
      try {
        const home = await invoke('get_home_path');
        setHomePath(home);
        setCurrentPath(home);
        await scanDirectory(home);
      } catch (err) {
        console.error('Init failed:', err);
        setError(err.toString());
      }
    };
    init();
  }, [showOnboarding]);

  // Calculate sizes for directory entries progressively
  const calculateSizesProgressively = useCallback(async (entries, scanId) => {
    const dirEntries = entries.filter(e => e.is_dir);

    // Calculate sizes in parallel batches
    const batchSize = 3; // Calculate 3 at a time
    for (let i = 0; i < dirEntries.length; i += batchSize) {
      // Check if this scan is still current
      if (scanIdRef.current !== scanId) {
        return; // Abort if a new scan started
      }

      const batch = dirEntries.slice(i, i + batchSize);

      // Mark these as loading
      setSizesLoading(prev => {
        const next = new Set(prev);
        batch.forEach(e => next.add(e.path));
        return next;
      });

      // Calculate sizes in parallel
      const results = await Promise.all(
        batch.map(entry =>
          invoke('calculate_item_size', { path: entry.path })
            .catch(() => ({ path: entry.path, size: 0 }))
        )
      );

      // Check again if scan is still current
      if (scanIdRef.current !== scanId) {
        return;
      }

      // Update sizes in scan result
      setScanResult(prev => {
        if (!prev) return prev;

        const updatedEntries = prev.entries.map(entry => {
          const result = results.find(r => r.path === entry.path);
          if (result) {
            return { ...entry, size: result.size };
          }
          return entry;
        });

        // Sort by size descending
        updatedEntries.sort((a, b) => b.size - a.size);

        const totalSize = updatedEntries.reduce((acc, e) => acc + e.size, 0);

        return {
          ...prev,
          entries: updatedEntries,
          total_size: totalSize,
        };
      });

      // Also update children cache
      setChildrenCache(prev => {
        const currentPathData = prev[currentPath];
        if (!currentPathData) return prev;

        const updatedEntries = currentPathData.map(entry => {
          const result = results.find(r => r.path === entry.path);
          if (result) {
            return { ...entry, size: result.size };
          }
          return entry;
        });

        updatedEntries.sort((a, b) => b.size - a.size);

        return {
          ...prev,
          [currentPath]: updatedEntries,
        };
      });

      // Remove from loading set
      setSizesLoading(prev => {
        const next = new Set(prev);
        batch.forEach(e => next.delete(e.path));
        return next;
      });
    }
  }, [currentPath]);

  // Scan a directory (fast, then progressive size calculation)
  const scanDirectory = useCallback(async (path) => {
    setIsScanning(true);
    setError(null);
    setSizesLoading(new Set());

    // Increment scan ID to invalidate any ongoing size calculations
    const currentScanId = ++scanIdRef.current;

    try {
      // Fast scan - returns immediately with size=0 for directories
      const result = await invoke('scan_directory_fast', { path });
      setScanResult(result);

      // Cache children for the tree
      setChildrenCache(prev => ({
        ...prev,
        [result.path]: result.entries,
      }));

      setIsScanning(false);

      // Now calculate sizes progressively in the background
      calculateSizesProgressively(result.entries, currentScanId);

    } catch (err) {
      console.error('Scan failed:', err);
      setError(err.toString());
      setIsScanning(false);
    }
  }, [calculateSizesProgressively]);

  // Navigate to a directory
  const handleNavigate = useCallback(
    async (path) => {
      setCurrentPath(path);
      setSelectedPaths(new Set());
      setExpandedPaths(new Set());
      await scanDirectory(path);
    },
    [scanDirectory]
  );

  // Go up one level
  const handleGoUp = useCallback(() => {
    if (scanResult?.parent) {
      handleNavigate(scanResult.parent);
    }
  }, [scanResult, handleNavigate]);

  // Go to home
  const handleGoHome = useCallback(() => {
    if (homePath) {
      handleNavigate(homePath);
    }
  }, [homePath, handleNavigate]);

  // Refresh current directory
  const handleRefresh = useCallback(() => {
    if (currentPath) {
      scanDirectory(currentPath);
    }
  }, [currentPath, scanDirectory]);

  // Toggle selection
  const handleToggleSelect = useCallback((path) => {
    setSelectedPaths(prev => {
      const next = new Set(prev);
      if (next.has(path)) {
        next.delete(path);
      } else {
        next.add(path);
      }
      return next;
    });
  }, []);

  // Select all
  const handleSelectAll = useCallback(() => {
    const entries = scanResult?.entries || [];
    const allPaths = entries.map(e => e.path);
    const allSelected = allPaths.every(p => selectedPaths.has(p));

    if (allSelected) {
      setSelectedPaths(new Set());
    } else {
      setSelectedPaths(new Set(allPaths));
    }
  }, [scanResult, selectedPaths]);

  // Toggle expand in list
  const handleToggleExpand = useCallback(
    async (path) => {
      setExpandedPaths(prev => {
        const next = new Set(prev);
        if (next.has(path)) {
          next.delete(path);
        } else {
          next.add(path);
        }
        return next;
      });

      // Load children if not cached
      if (!childrenCache[path]) {
        try {
          const result = await invoke('scan_directory_fast', { path });
          setChildrenCache(prev => ({
            ...prev,
            [path]: result.entries,
          }));
        } catch (err) {
          console.error('Failed to load children:', err);
        }
      }
    },
    [childrenCache]
  );

  // Show delete confirmation
  const handleDelete = useCallback(() => {
    if (selectedPaths.size > 0) {
      setShowConfirmModal(true);
    }
  }, [selectedPaths]);

  // Confirm deletion
  const handleConfirmDelete = useCallback(async () => {
    const items = Array.from(selectedPaths).map(path => ({ path }));
    try {
      const deletedSize = await invoke('delete_items', { items });
      console.log('Deleted', deletedSize, 'bytes');
      setSelectedPaths(new Set());
      setShowConfirmModal(false);
      // Refresh current directory
      await scanDirectory(currentPath);
    } catch (err) {
      console.error('Delete failed:', err);
      setError(err.toString());
    }
  }, [selectedPaths, currentPath, scanDirectory]);

  // Get selected items data for modal
  const selectedItemsData = (scanResult?.entries || [])
    .filter(e => selectedPaths.has(e.path))
    .map(e => ({
      id: e.id,
      name: e.name,
      path: e.path,
      size: e.size,
    }));

  const selectedTotalSize = selectedItemsData.reduce((acc, item) => acc + item.size, 0);

  // Handle view navigation
  const handleNavigateToView = useCallback((view) => {
    setCurrentView(view);
  }, []);

  // Render main content based on current view
  const renderMainContent = () => {
    switch (currentView) {
      case 'cleaner':
        return <Cleaner />;
      case 'explorer':
      default:
        return (
          <SizeExplorer
            scanResult={scanResult}
            isScanning={isScanning}
            sizesLoading={sizesLoading}
            onScan={handleRefresh}
            onNavigate={handleNavigate}
            onGoUp={handleGoUp}
            onGoHome={handleGoHome}
            selectedPaths={selectedPaths}
            onToggleSelect={handleToggleSelect}
            onSelectAll={handleSelectAll}
            onDelete={handleDelete}
            expandedPaths={expandedPaths}
            onToggleExpand={handleToggleExpand}
            childrenCache={childrenCache}
          />
        );
    }
  };

  // Show onboarding if not completed
  if (showOnboarding) {
    return <Onboarding onComplete={handleOnboardingComplete} />;
  }

  return (
    <div className="flex min-h-screen bg-white dark:bg-[#1c1c1e]">
      {/* Title bar drag region */}
      <div className="titlebar-drag-region" />

      {/* Sidebar */}
      <Sidebar
        currentView={currentView}
        onNavigateToView={handleNavigateToView}
      />

      {/* Main content */}
      {renderMainContent()}

      {/* Error toast */}
      {error && (
        <div className="fixed bottom-4 right-4 bg-red-500 text-white px-4 py-3 rounded-lg shadow-lg max-w-md">
          <p className="font-medium">Error</p>
          <p className="text-sm opacity-90">{error}</p>
          <button
            onClick={() => setError(null)}
            className="absolute top-2 right-2 text-white/70 hover:text-white"
          >
            ×
          </button>
        </div>
      )}

      {/* Delete confirmation */}
      <ConfirmModal
        isOpen={showConfirmModal}
        items={selectedItemsData}
        totalSize={selectedTotalSize}
        onConfirm={handleConfirmDelete}
        onCancel={() => setShowConfirmModal(false)}
      />
    </div>
  );
}

export default App;
