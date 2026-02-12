import { Cylinder, FolderTree } from 'lucide-react';
import appIcon from '../assets/app-icon.svg';

export default function Sidebar({
  currentView = 'explorer',
  onNavigateToView,
}) {
  return (
    <aside className="w-16 min-h-screen bg-[#f5f5f7] dark:bg-[#2c2c2e] border-r border-gray-200 dark:border-gray-700 flex flex-col items-center sidebar-with-titlebar">
      {/* App Logo */}
      <div className="py-3 border-b border-gray-200 dark:border-gray-700 w-full flex justify-center">
        <img src={appIcon} alt="Swept" className="w-9 h-9 rounded-xl" />
      </div>

      {/* Navigation */}
      <nav className="flex-1 flex flex-col items-center gap-3 py-4">
        <button
          onClick={() => onNavigateToView?.('cleaner')}
          className={`w-11 h-11 flex items-center justify-center rounded-xl transition-all duration-200 ${
            currentView === 'cleaner'
              ? 'bg-gradient-to-br from-purple-500 to-pink-500 text-white shadow-lg shadow-purple-500/30'
              : 'text-purple-500 dark:text-purple-400 hover:bg-purple-100 dark:hover:bg-purple-900/30'
          }`}
          title="Cleaner"
        >
          <Cylinder className="w-5 h-5" />
        </button>
        <button
          onClick={() => onNavigateToView?.('explorer')}
          className={`w-11 h-11 flex items-center justify-center rounded-xl transition-all duration-200 ${
            currentView === 'explorer'
              ? 'bg-gradient-to-br from-blue-500 to-cyan-500 text-white shadow-lg shadow-blue-500/30'
              : 'text-blue-500 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/30'
          }`}
          title="File Explorer"
        >
          <FolderTree className="w-5 h-5" />
        </button>
      </nav>
    </aside>
  );
}
