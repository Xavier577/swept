import {
  LayoutDashboard,
  Container,
  Package,
  Beer,
  Hammer,
  Code,
  HardDrive,
  FileText,
  Layers,
} from 'lucide-react';
import { formatBytes } from '../utils/formatters';
import { categories, mockItems } from '../data/mockData';

const iconMap = {
  Container,
  Package,
  Beer,
  Hammer,
  Code,
  HardDrive,
  FileText,
  Layers,
};

export default function Sidebar({ activeCategory, onCategoryChange }) {
  return (
    <aside className="w-64 min-h-screen bg-[#f6f6f6]/80 backdrop-blur-xl border-r border-black/10 flex flex-col">
      {/* App Title */}
      <div className="p-4 pt-6">
        <h1 className="text-xl font-semibold text-gray-800 flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center">
            <HardDrive className="w-5 h-5 text-white" />
          </div>
          DevClean
        </h1>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4">
        {/* Overview */}
        <button
          onClick={() => onCategoryChange('overview')}
          className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg mb-1 transition-all duration-150 ${
            activeCategory === 'overview'
              ? 'bg-blue-500 text-white shadow-sm'
              : 'text-gray-700 hover:bg-black/5'
          }`}
        >
          <LayoutDashboard className="w-5 h-5" />
          <span className="font-medium">Overview</span>
        </button>

        {/* Divider */}
        <div className="h-px bg-black/10 my-3" />

        {/* Category Label */}
        <p className="px-3 text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">
          Categories
        </p>

        {/* Categories */}
        {categories.map((category) => {
          const Icon = iconMap[category.icon];
          const size = mockItems[category.id]?.totalSize || 0;
          const isActive = activeCategory === category.id;

          return (
            <button
              key={category.id}
              onClick={() => onCategoryChange(category.id)}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg mb-1 transition-all duration-150 ${
                isActive
                  ? 'bg-blue-500 text-white shadow-sm'
                  : 'text-gray-700 hover:bg-black/5'
              }`}
            >
              <Icon
                className="w-5 h-5"
                style={{ color: isActive ? 'white' : category.color }}
              />
              <span className="flex-1 text-left font-medium">{category.name}</span>
              <span
                className={`text-xs ${
                  isActive ? 'text-white/80' : 'text-gray-500'
                }`}
              >
                {formatBytes(size)}
              </span>
            </button>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-black/10">
        <p className="text-xs text-gray-500 text-center">
          Last scanned: Just now
        </p>
      </div>
    </aside>
  );
}
