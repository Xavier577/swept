import { useState, useCallback } from 'react';
import { invoke } from '@tauri-apps/api/core';

export function useScan() {
  const [isScanning, setIsScanning] = useState(false);
  const [scanResults, setScanResults] = useState(null);
  const [error, setError] = useState(null);

  const scan = useCallback(async () => {
    setIsScanning(true);
    setError(null);
    try {
      const results = await invoke('scan_system');
      setScanResults(results);
    } catch (err) {
      setError(err.toString());
      console.error('Scan failed:', err);
    } finally {
      setIsScanning(false);
    }
  }, []);

  return { scan, isScanning, scanResults, error };
}

export function useCleanup() {
  const [isCleaning, setIsCleaning] = useState(false);
  const [cleanupResult, setCleanupResult] = useState(null);
  const [error, setError] = useState(null);

  const cleanup = useCallback(async (items) => {
    setIsCleaning(true);
    setError(null);
    try {
      const result = await invoke('cleanup_items', { items });
      setCleanupResult(result);
      return result;
    } catch (err) {
      setError(err.toString());
      console.error('Cleanup failed:', err);
      throw err;
    } finally {
      setIsCleaning(false);
    }
  }, []);

  return { cleanup, isCleaning, cleanupResult, error };
}

export function useCategoryItems(categoryId) {
  const [items, setItems] = useState([]);
  const [totalSize, setTotalSize] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchItems = useCallback(async () => {
    if (!categoryId) return;

    setIsLoading(true);
    setError(null);
    try {
      const result = await invoke('get_category_items', { categoryId });
      setItems(result.items || []);
      setTotalSize(result.total_size || 0);
    } catch (err) {
      setError(err.toString());
      console.error('Failed to fetch category items:', err);
    } finally {
      setIsLoading(false);
    }
  }, [categoryId]);

  return { items, totalSize, isLoading, error, fetchItems };
}
