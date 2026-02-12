import { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { Shield, CheckCircle, ArrowRight, RefreshCw } from 'lucide-react';
import appIcon from '../assets/app-icon.svg';

export default function Onboarding({ onComplete }) {
  const [checking, setChecking] = useState(false);
  const [hasAccess, setHasAccess] = useState(null);

  const checkAccess = async () => {
    setChecking(true);
    try {
      const result = await invoke('check_full_disk_access');
      setHasAccess(result);
      if (result) {
        // Small delay to show the success state before proceeding
        setTimeout(() => {
          onComplete();
        }, 1000);
      }
    } catch (err) {
      console.error('Failed to check access:', err);
      setHasAccess(false);
    }
    setChecking(false);
  };

  const openSettings = async () => {
    try {
      await invoke('open_full_disk_access_settings');
    } catch (err) {
      console.error('Failed to open settings:', err);
    }
  };

  // Check access on mount
  useEffect(() => {
    checkAccess();
  }, []);

  // Poll for access changes when user returns to app
  useEffect(() => {
    const handleFocus = () => {
      if (!hasAccess) {
        checkAccess();
      }
    };

    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [hasAccess]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-[#1c1c1e] dark:to-[#2c2c2e] flex items-center justify-center p-8">
      <div className="max-w-lg w-full">
        {/* Header */}
        <div className="text-center mb-8">
          <img src={appIcon} alt="Swept" className="w-24 h-24 mx-auto mb-6 rounded-2xl shadow-lg" />
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Welcome to Swept</h1>
          <p className="text-gray-500 dark:text-gray-400">Clean sweep for developers</p>
        </div>

        {/* Permission Card */}
        <div className="bg-white dark:bg-[#2c2c2e] rounded-2xl shadow-xl p-6 mb-6">
          <div className="flex items-start gap-4 mb-6">
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${
              hasAccess
                ? 'bg-green-100 dark:bg-green-900/30'
                : 'bg-blue-100 dark:bg-blue-900/30'
            }`}>
              {hasAccess ? (
                <CheckCircle className="w-6 h-6 text-green-600 dark:text-green-400" />
              ) : (
                <Shield className="w-6 h-6 text-blue-600 dark:text-blue-400" />
              )}
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">
                {hasAccess ? 'Full Disk Access Granted' : 'Full Disk Access Required'}
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {hasAccess
                  ? 'Swept can now scan and clean your developer files.'
                  : 'Swept needs permission to scan protected folders like ~/Library to find caches and build artifacts.'}
              </p>
            </div>
          </div>

          {!hasAccess && (
            <>
              {/* Instructions */}
              <div className="bg-gray-50 dark:bg-[#1c1c1e] rounded-xl p-4 mb-6">
                <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">How to enable:</h3>
                <ol className="text-sm text-gray-600 dark:text-gray-400 space-y-2">
                  <li className="flex items-start gap-2">
                    <span className="w-5 h-5 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 flex items-center justify-center text-xs font-medium flex-shrink-0">1</span>
                    <span>Click "Open System Settings" below</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="w-5 h-5 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 flex items-center justify-center text-xs font-medium flex-shrink-0">2</span>
                    <span>Find "Swept" in the list and enable the toggle</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="w-5 h-5 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 flex items-center justify-center text-xs font-medium flex-shrink-0">3</span>
                    <span>Return to Swept — we'll detect the change automatically</span>
                  </li>
                </ol>
              </div>

              {/* Actions */}
              <div className="flex gap-3">
                <button
                  onClick={openSettings}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-blue-500 hover:bg-blue-600 text-white font-medium rounded-xl transition-colors"
                >
                  Open System Settings
                  <ArrowRight className="w-4 h-4" />
                </button>
                <button
                  onClick={checkAccess}
                  disabled={checking}
                  className="px-4 py-3 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 font-medium rounded-xl transition-colors"
                  title="Check again"
                >
                  <RefreshCw className={`w-5 h-5 ${checking ? 'animate-spin' : ''}`} />
                </button>
              </div>
            </>
          )}

          {hasAccess && (
            <div className="flex justify-center">
              <div className="flex items-center gap-2 text-green-600 dark:text-green-400">
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span className="text-sm font-medium">Starting Swept...</span>
              </div>
            </div>
          )}
        </div>

        {/* Skip option */}
        {!hasAccess && (
          <div className="text-center">
            <button
              onClick={onComplete}
              className="text-sm text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
            >
              Skip for now (limited functionality)
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
