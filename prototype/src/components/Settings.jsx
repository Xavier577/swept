import { Sun, Moon, Monitor } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

export default function Settings() {
  const { theme, toggleTheme, isDark } = useTheme();

  return (
    <div className="flex-1 p-8 overflow-auto content-with-titlebar bg-white dark:bg-[#1c1c1e]">
      {/* Header */}
      <div className="mb-8">
        <h2 className="text-2xl font-semibold text-gray-800 dark:text-white">Settings</h2>
        <p className="text-gray-500 dark:text-gray-400 mt-1">Customize your preferences</p>
      </div>

      {/* Settings Sections */}
      <div className="space-y-6">
        {/* Appearance Section */}
        <div className="bg-white dark:bg-[#2c2c2e] rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-4">Appearance</h3>

          {/* Theme Toggle Row */}
          <div className="flex items-center justify-between py-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-gray-100 dark:bg-gray-700 flex items-center justify-center">
                {isDark ? (
                  <Moon className="w-5 h-5 text-blue-500" />
                ) : (
                  <Sun className="w-5 h-5 text-yellow-500" />
                )}
              </div>
              <div>
                <p className="font-medium text-gray-800 dark:text-white">Dark Mode</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {isDark ? 'Currently using dark theme' : 'Currently using light theme'}
                </p>
              </div>
            </div>

            {/* macOS-style Toggle Switch */}
            <button
              onClick={toggleTheme}
              className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors duration-200 ease-in-out focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 ${
                isDark ? 'bg-blue-500' : 'bg-gray-300 dark:bg-gray-600'
              }`}
              role="switch"
              aria-checked={isDark}
              aria-label="Toggle dark mode"
            >
              <span
                className={`inline-block h-5 w-5 transform rounded-full bg-white shadow-md transition-transform duration-200 ease-in-out ${
                  isDark ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>

          {/* Divider */}
          <div className="h-px bg-gray-100 dark:bg-gray-700 my-3" />

          {/* Theme Mode Selection */}
          <div className="py-3">
            <p className="font-medium text-gray-800 dark:text-white mb-3">Theme Mode</p>
            <div className="flex gap-3">
              {/* Light Option */}
              <button
                onClick={() => !isDark || toggleTheme()}
                className={`flex-1 flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all ${
                  !isDark
                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30'
                    : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                }`}
              >
                <div className="w-10 h-10 rounded-lg bg-white border border-gray-200 flex items-center justify-center">
                  <Sun className="w-5 h-5 text-yellow-500" />
                </div>
                <span className={`text-sm font-medium ${
                  !isDark ? 'text-blue-600 dark:text-blue-400' : 'text-gray-600 dark:text-gray-400'
                }`}>
                  Light
                </span>
              </button>

              {/* Dark Option */}
              <button
                onClick={() => isDark || toggleTheme()}
                className={`flex-1 flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all ${
                  isDark
                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30'
                    : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                }`}
              >
                <div className="w-10 h-10 rounded-lg bg-gray-900 border border-gray-700 flex items-center justify-center">
                  <Moon className="w-5 h-5 text-blue-400" />
                </div>
                <span className={`text-sm font-medium ${
                  isDark ? 'text-blue-600 dark:text-blue-400' : 'text-gray-600 dark:text-gray-400'
                }`}>
                  Dark
                </span>
              </button>
            </div>
          </div>
        </div>

        {/* About Section */}
        <div className="bg-white dark:bg-[#2c2c2e] rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-4">About</h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between py-2">
              <span className="text-gray-600 dark:text-gray-400">Version</span>
              <span className="text-gray-800 dark:text-white font-medium">1.0.0</span>
            </div>
            <div className="h-px bg-gray-100 dark:bg-gray-700" />
            <div className="flex items-center justify-between py-2">
              <span className="text-gray-600 dark:text-gray-400">Application</span>
              <span className="text-gray-800 dark:text-white font-medium">Swept</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
