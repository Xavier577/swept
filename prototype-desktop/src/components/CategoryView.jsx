import { useState, useMemo, useEffect } from 'react';
import { ArrowUpDown, Trash2, Loader2 } from 'lucide-react';
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
import { categories } from '../data/categories';
import ItemList from './ItemList';
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

export default function CategoryView({
  categoryId,
  items,
  totalSize,
  isLoading,
  selectedItems,
  onToggleItem,
  onToggleAll,
  onClean
}) {
  const [sortBy, setSortBy] = useState('size');
  const [sortOrder, setSortOrder] = useState('desc');

  const category = categories.find((c) => c.id === categoryId);

  const sortedItems = useMemo(() => {
    if (!items) return [];
    return [...items].sort((a, b) => {
      let comparison = 0;
      if (sortBy === 'size') {
        comparison = a.size - b.size;
      } else if (sortBy === 'name') {
        comparison = a.name.localeCompare(b.name);
      } else if (sortBy === 'date') {
        comparison = new Date(a.last_used || 0) - new Date(b.last_used || 0);
      }
      return sortOrder === 'desc' ? -comparison : comparison;
    });
  }, [items, sortBy, sortOrder]);

  const selectedCount = sortedItems.filter((item) => selectedItems.has(item.id)).length;
  const selectedSize = sortedItems
    .filter((item) => selectedItems.has(item.id))
    .reduce((acc, item) => acc + item.size, 0);

  if (!category) {
    return (
      <div className="flex-1 p-8 flex items-center justify-center content-with-titlebar">
        <p className="text-gray-500">Category not found</p>
      </div>
    );
  }

  const Icon = iconMap[category.icon];

  const handleSort = (field) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'desc' ? 'asc' : 'desc');
    } else {
      setSortBy(field);
      setSortOrder('desc');
    }
  };

  return (
    <div className="flex-1 p-8 overflow-auto content-with-titlebar">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <div
            className="w-12 h-12 rounded-xl flex items-center justify-center"
            style={{ backgroundColor: `${category.color}20` }}
          >
            <Icon className="w-6 h-6" style={{ color: category.color }} />
          </div>
          <div>
            <h2 className="text-2xl font-semibold text-gray-800">{category.name}</h2>
            <p className="text-gray-500 mt-0.5">{category.description}</p>
          </div>
        </div>
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
          <span className="ml-3 text-gray-500">Scanning category...</span>
        </div>
      )}

      {!isLoading && (
        <>
          {/* Stats Card */}
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 mb-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Total Size</p>
                <p className="text-3xl font-bold text-gray-800 mt-1">
                  {formatBytes(totalSize)}
                </p>
              </div>
              <div className="text-right">
                <p className="text-sm text-gray-500">{sortedItems.length} items</p>
                <SpaceBar
                  value={totalSize}
                  max={totalSize * 1.5}
                  color={category.color}
                  showLabel={false}
                  className="w-32 mt-2"
                />
              </div>
            </div>
          </div>

          {/* Sort Controls */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-500">Sort by:</span>
              {['size', 'name', 'date'].map((field) => (
                <button
                  key={field}
                  onClick={() => handleSort(field)}
                  className={`px-3 py-1.5 text-sm rounded-lg transition-colors flex items-center gap-1 ${
                    sortBy === field
                      ? 'bg-blue-100 text-blue-700 font-medium'
                      : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  {field.charAt(0).toUpperCase() + field.slice(1)}
                  {sortBy === field && (
                    <ArrowUpDown className="w-3 h-3" />
                  )}
                </button>
              ))}
            </div>

            {selectedCount > 0 && (
              <button
                onClick={onClean}
                className="flex items-center gap-2 px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg font-medium transition-colors shadow-sm"
              >
                <Trash2 className="w-4 h-4" />
                Clean {selectedCount} items ({formatBytes(selectedSize)})
              </button>
            )}
          </div>

          {/* Item List */}
          <ItemList
            items={sortedItems}
            selectedItems={selectedItems}
            onToggleItem={onToggleItem}
            onToggleAll={() => onToggleAll(categoryId)}
          />

          {sortedItems.length === 0 && (
            <div className="bg-gray-50 rounded-2xl p-12 text-center">
              <Icon className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">No items found in this category</p>
            </div>
          )}
        </>
      )}
    </div>
  );
}
