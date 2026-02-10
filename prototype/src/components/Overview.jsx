import { Trash2, RefreshCw, AlertTriangle } from 'lucide-react';
import {
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
import { categories, mockItems, getTotalSize } from '../data/mockData';
import SpaceBar from './SpaceBar';

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

export default function Overview({ onCategoryChange, onScan, isScanning }) {
  const totalSize = getTotalSize();
  const categorySizes = categories
    .map((cat) => ({
      ...cat,
      size: mockItems[cat.id]?.totalSize || 0,
    }))
    .sort((a, b) => b.size - a.size);

  const maxCategorySize = Math.max(...categorySizes.map((c) => c.size));

  return (
    <div className="flex-1 p-8 overflow-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="text-2xl font-semibold text-gray-800">Overview</h2>
          <p className="text-gray-500 mt-1">Manage your development environment</p>
        </div>
        <button
          onClick={onScan}
          disabled={isScanning}
          className="flex items-center gap-2 px-4 py-2 bg-blue-500 hover:bg-blue-600 disabled:bg-blue-400 text-white rounded-lg font-medium transition-colors shadow-sm"
        >
          <RefreshCw className={`w-4 h-4 ${isScanning ? 'animate-spin' : ''}`} />
          {isScanning ? 'Scanning...' : 'Scan Now'}
        </button>
      </div>

      {/* Total Reclaimable */}
      <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl p-6 mb-8 text-white shadow-lg">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-blue-100 text-sm font-medium">Total Reclaimable Space</p>
            <p className="text-5xl font-bold mt-2">{formatBytes(totalSize)}</p>
            <p className="text-blue-100 mt-2 text-sm">
              Across {categories.length} categories
            </p>
          </div>
          <div className="w-24 h-24 bg-white/20 rounded-full flex items-center justify-center">
            <Trash2 className="w-12 h-12 text-white" />
          </div>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-red-100 flex items-center justify-center">
              <AlertTriangle className="w-5 h-5 text-red-500" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Largest Category</p>
              <p className="font-semibold text-gray-800">{categorySizes[0]?.name}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-orange-100 flex items-center justify-center">
              <Container className="w-5 h-5 text-orange-500" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Docker Usage</p>
              <p className="font-semibold text-gray-800">
                {formatBytes(mockItems.docker?.totalSize || 0)}
              </p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
              <Hammer className="w-5 h-5 text-blue-500" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Xcode Data</p>
              <p className="font-semibold text-gray-800">
                {formatBytes(mockItems.xcode?.totalSize || 0)}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Category Breakdown */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
        <h3 className="text-lg font-semibold text-gray-800 mb-6">Space by Category</h3>
        <div className="space-y-5">
          {categorySizes.map((category) => {
            const Icon = iconMap[category.icon];
            const percentage = ((category.size / totalSize) * 100).toFixed(1);

            return (
              <button
                key={category.id}
                onClick={() => onCategoryChange(category.id)}
                className="w-full group"
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-3">
                    <Icon className="w-5 h-5" style={{ color: category.color }} />
                    <span className="font-medium text-gray-700 group-hover:text-blue-600 transition-colors">
                      {category.name}
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm text-gray-500">{percentage}%</span>
                    <span className="font-medium text-gray-800">
                      {formatBytes(category.size)}
                    </span>
                  </div>
                </div>
                <SpaceBar
                  value={category.size}
                  max={maxCategorySize}
                  color={category.color}
                  showLabel={false}
                />
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
