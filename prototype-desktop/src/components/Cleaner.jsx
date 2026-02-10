import { useState, useMemo } from 'react';
import {
  Package,
  Hammer,
  Container,
  Beer,
  Code,
  HardDrive,
  FileText,
  Layers,
  Cylinder,
  RefreshCw,
  ChevronRight,
  ArrowLeft,
  Check,
  Trash2,
  Copy,
} from 'lucide-react';
import { formatBytes } from '../utils/formatters';
import { categories, mockItems, getTotalSize } from '../data/cleanerData';

const iconMap = {
  Package,
  Hammer,
  Container,
  Beer,
  Code,
  HardDrive,
  FileText,
  Layers,
};

function SizeBar({ value, max, color }) {
  const percentage = max > 0 ? Math.min(100, (value / max) * 100) : 0;
  return (
    <div className="h-2 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
      <div
        className="h-full rounded-full transition-all duration-500"
        style={{ width: `${percentage}%`, backgroundColor: color }}
      />
    </div>
  );
}

function CategoryCard({ category, size, maxSize, onClick, isSelected, onToggleSelect, showCheckbox }) {
  const Icon = iconMap[category.icon];
  const percentage = ((size / getTotalSize()) * 100).toFixed(1);

  // Show checkbox when: hovering, selected, or in selection mode (showCheckbox prop)
  const checkboxVisible = isSelected || showCheckbox;

  return (
    <div
      className={`w-full bg-white dark:bg-[#2c2c2e] rounded-xl p-4 border transition-all group text-left ${
        isSelected
          ? 'border-blue-500 dark:border-blue-500 ring-1 ring-blue-500/20'
          : 'border-gray-100 dark:border-gray-700 hover:border-gray-200 dark:hover:border-gray-600 hover:shadow-md'
      }`}
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center">
          {/* Checkbox - pops out on hover or when in selection mode */}
          <div
            className={`overflow-hidden transition-all duration-200 ${
              checkboxVisible ? 'w-8 opacity-100' : 'w-0 opacity-0 group-hover:w-8 group-hover:opacity-100'
            }`}
          >
            <button
              onClick={(e) => {
                e.stopPropagation();
                onToggleSelect(category.id);
              }}
              className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors flex-shrink-0 ${
                isSelected
                  ? 'bg-blue-500 border-blue-500'
                  : 'border-gray-300 dark:border-gray-600 hover:border-gray-400'
              }`}
            >
              {isSelected && <Check className="w-3 h-3 text-white" />}
            </button>
          </div>
          <div
            className="w-10 h-10 rounded-lg flex items-center justify-center cursor-pointer"
            style={{ backgroundColor: `${category.color}15` }}
            onClick={onClick}
          >
            <Icon className="w-5 h-5" style={{ color: category.color }} />
          </div>
          <div className="cursor-pointer ml-3" onClick={onClick}>
            <h3 className="font-medium text-gray-800 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
              {category.name}
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400">{category.description}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 cursor-pointer" onClick={onClick}>
          <div className="text-right">
            <p className="font-semibold text-gray-800 dark:text-white">{formatBytes(size)}</p>
            <p className="text-xs text-gray-400">{percentage}%</p>
          </div>
          <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-blue-500 transition-colors" />
        </div>
      </div>
      <SizeBar value={size} max={maxSize} color={category.color} />
    </div>
  );
}

function ItemRow({ item, isSelected, onToggle, onCopyPath, copiedPath }) {
  return (
    <div
      className={`flex items-center gap-3 px-4 py-3 border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors group ${
        isSelected ? 'bg-blue-50 dark:bg-blue-900/20' : ''
      }`}
    >
      <button
        onClick={() => onToggle(item.id)}
        className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors flex-shrink-0 ${
          isSelected
            ? 'bg-blue-500 border-blue-500'
            : 'border-gray-300 dark:border-gray-600 hover:border-gray-400'
        }`}
      >
        {isSelected && <Check className="w-3 h-3 text-white" />}
      </button>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-medium text-gray-800 dark:text-white truncate">{item.name}</span>
          <span className="text-xs px-2 py-0.5 bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 rounded-full">
            {item.type}
          </span>
        </div>
        <div className="flex items-center gap-1.5 mt-0.5">
          <span className="text-xs text-gray-400 dark:text-gray-500 truncate">{item.path}</span>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onCopyPath(item.path);
            }}
            className="p-0.5 rounded hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors opacity-0 group-hover:opacity-100"
            title="Copy path"
          >
            <Copy className="w-3 h-3 text-gray-400" />
          </button>
          {copiedPath === item.path && (
            <span className="text-xs text-green-600 dark:text-green-400">Copied!</span>
          )}
        </div>
      </div>

      <div className="text-right flex-shrink-0">
        <p className="font-medium text-gray-700 dark:text-gray-300">{formatBytes(item.size)}</p>
        <p className="text-xs text-gray-400">{item.lastUsed}</p>
      </div>
    </div>
  );
}

export default function Cleaner() {
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [selectedItems, setSelectedItems] = useState(new Set());
  const [selectedCategories, setSelectedCategories] = useState(new Set());
  const [isScanning, setIsScanning] = useState(false);
  const [copiedPath, setCopiedPath] = useState(null);

  const totalSize = getTotalSize();
  const categorySizes = useMemo(() => {
    return categories
      .map((cat) => ({
        ...cat,
        size: mockItems[cat.id]?.totalSize || 0,
      }))
      .sort((a, b) => b.size - a.size);
  }, []);

  const maxCategorySize = Math.max(...categorySizes.map((c) => c.size));

  const currentCategory = selectedCategory
    ? categories.find((c) => c.id === selectedCategory)
    : null;
  const currentItems = selectedCategory ? mockItems[selectedCategory]?.items || [] : [];

  const selectedSize = currentItems
    .filter((item) => selectedItems.has(item.id))
    .reduce((acc, item) => acc + item.size, 0);

  // Calculate total size of selected categories
  const selectedCategoriesSize = useMemo(() => {
    return Array.from(selectedCategories).reduce((acc, catId) => {
      return acc + (mockItems[catId]?.totalSize || 0);
    }, 0);
  }, [selectedCategories]);

  // Count total items in selected categories
  const selectedCategoriesItemCount = useMemo(() => {
    return Array.from(selectedCategories).reduce((acc, catId) => {
      return acc + (mockItems[catId]?.items?.length || 0);
    }, 0);
  }, [selectedCategories]);

  const handleScan = () => {
    setIsScanning(true);
    setTimeout(() => setIsScanning(false), 2000);
  };

  const handleToggleItem = (id) => {
    setSelectedItems((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleToggleAll = () => {
    if (selectedItems.size === currentItems.length) {
      setSelectedItems(new Set());
    } else {
      setSelectedItems(new Set(currentItems.map((item) => item.id)));
    }
  };

  const handleToggleCategory = (categoryId) => {
    setSelectedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(categoryId)) {
        next.delete(categoryId);
      } else {
        next.add(categoryId);
      }
      return next;
    });
  };

  const handleToggleAllCategories = () => {
    if (selectedCategories.size === categories.length) {
      setSelectedCategories(new Set());
    } else {
      setSelectedCategories(new Set(categories.map((c) => c.id)));
    }
  };

  const handleCopyPath = async (path) => {
    try {
      await navigator.clipboard.writeText(path);
      setCopiedPath(path);
      setTimeout(() => setCopiedPath(null), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const handleClean = () => {
    // TODO: Implement actual cleaning
    console.log('Cleaning items:', Array.from(selectedItems));
    setSelectedItems(new Set());
  };

  const handleCleanCategories = () => {
    // TODO: Implement actual cleaning for categories
    console.log('Cleaning categories:', Array.from(selectedCategories));
    setSelectedCategories(new Set());
  };

  // Category detail view
  if (selectedCategory && currentCategory) {
    const Icon = iconMap[currentCategory.icon];
    const allSelected = selectedItems.size === currentItems.length && currentItems.length > 0;

    return (
      <div className="flex-1 flex flex-col min-h-screen bg-gray-50 dark:bg-[#1c1c1e] content-with-titlebar">
        {/* Header */}
        <div className="bg-white dark:bg-[#2c2c2e] border-b border-gray-200 dark:border-gray-700 px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => {
                  setSelectedCategory(null);
                  setSelectedItems(new Set());
                }}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                <ArrowLeft className="w-5 h-5 text-gray-600 dark:text-gray-400" />
              </button>
              <div
                className="w-12 h-12 rounded-xl flex items-center justify-center"
                style={{ backgroundColor: `${currentCategory.color}15` }}
              >
                <Icon className="w-6 h-6" style={{ color: currentCategory.color }} />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-gray-800 dark:text-white">
                  {currentCategory.name}
                </h2>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {currentItems.length} items · {formatBytes(mockItems[selectedCategory]?.totalSize || 0)}
                </p>
              </div>
            </div>

            {selectedItems.size > 0 && (
              <button
                onClick={handleClean}
                className="flex items-center gap-2 px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg font-medium transition-colors"
              >
                <Trash2 className="w-4 h-4" />
                Clean {selectedItems.size} items ({formatBytes(selectedSize)})
              </button>
            )}
          </div>
        </div>

        {/* Select all bar */}
        <div className="bg-white dark:bg-[#2c2c2e] border-b border-gray-200 dark:border-gray-700 px-4 py-2 flex items-center gap-3">
          <button
            onClick={handleToggleAll}
            className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
              allSelected
                ? 'bg-blue-500 border-blue-500'
                : 'border-gray-300 dark:border-gray-600 hover:border-gray-400'
            }`}
          >
            {allSelected && <Check className="w-3 h-3 text-white" />}
          </button>
          <span className="text-sm text-gray-500 dark:text-gray-400">
            {allSelected ? 'Deselect all' : 'Select all'}
          </span>
        </div>

        {/* Items list */}
        <div className="flex-1 overflow-auto">
          <div className="bg-white dark:bg-[#2c2c2e]">
            {currentItems.map((item) => (
              <ItemRow
                key={item.id}
                item={item}
                isSelected={selectedItems.has(item.id)}
                onToggle={handleToggleItem}
                onCopyPath={handleCopyPath}
                copiedPath={copiedPath}
              />
            ))}
          </div>
        </div>
      </div>
    );
  }

  const allCategoriesSelected = selectedCategories.size === categories.length;

  // Overview
  return (
    <div className="flex-1 overflow-auto bg-gray-50 dark:bg-[#1c1c1e] content-with-titlebar">
      <div className="max-w-4xl mx-auto p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-semibold text-gray-800 dark:text-white">Cleaner</h2>
            <p className="text-gray-500 dark:text-gray-400 mt-1">
              Free up space by removing unused developer files
            </p>
          </div>
          <div className="flex items-center gap-2">
            {selectedCategories.size > 0 && (
              <button
                onClick={handleCleanCategories}
                className="flex items-center gap-2 px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg font-medium transition-colors"
              >
                <Trash2 className="w-4 h-4" />
                Clean {selectedCategories.size} {selectedCategories.size === 1 ? 'category' : 'categories'} ({formatBytes(selectedCategoriesSize)})
              </button>
            )}
            <button
              onClick={handleScan}
              disabled={isScanning}
              className="flex items-center gap-2 px-4 py-2 bg-blue-500 hover:bg-blue-600 disabled:bg-blue-400 text-white rounded-lg font-medium transition-colors"
            >
              <RefreshCw className={`w-4 h-4 ${isScanning ? 'animate-spin' : ''}`} />
              {isScanning ? 'Scanning...' : 'Scan'}
            </button>
          </div>
        </div>

        {/* Total Card */}
        <div className="bg-gradient-to-br from-purple-500 to-pink-500 rounded-2xl p-6 mb-6 text-white shadow-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-white/80 text-sm font-medium">Total Reclaimable Space</p>
              <p className="text-4xl font-bold mt-1">{formatBytes(totalSize)}</p>
              <p className="text-white/70 mt-2 text-sm">
                Across {categories.length} categories
              </p>
            </div>
            <div className="w-20 h-20 bg-white/20 rounded-full flex items-center justify-center">
              <Cylinder className="w-10 h-10 text-white" />
            </div>
          </div>
        </div>

        {/* Categories Header with Select All */}
        <div className="flex items-center justify-between mb-3 px-1">
          <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
            Categories
          </h3>
          <button
            onClick={handleToggleAllCategories}
            className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
          >
            <div
              className={`w-4 h-4 rounded border-2 flex items-center justify-center transition-colors ${
                allCategoriesSelected
                  ? 'bg-blue-500 border-blue-500'
                  : 'border-gray-300 dark:border-gray-600'
              }`}
            >
              {allCategoriesSelected && <Check className="w-2.5 h-2.5 text-white" />}
            </div>
            {allCategoriesSelected ? 'Deselect all' : 'Select all'}
          </button>
        </div>

        {/* Selected summary */}
        {selectedCategories.size > 0 && (
          <div className="mb-3 px-4 py-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl">
            <p className="text-sm text-blue-700 dark:text-blue-300">
              <span className="font-medium">{selectedCategories.size} {selectedCategories.size === 1 ? 'category' : 'categories'}</span> selected
              {' · '}
              <span className="font-medium">{selectedCategoriesItemCount} items</span>
              {' · '}
              <span className="font-medium">{formatBytes(selectedCategoriesSize)}</span> will be cleaned
            </p>
          </div>
        )}

        {/* Categories Grid */}
        <div className="grid gap-3">
          {categorySizes.map((category) => (
            <CategoryCard
              key={category.id}
              category={category}
              size={category.size}
              maxSize={maxCategorySize}
              onClick={() => setSelectedCategory(category.id)}
              isSelected={selectedCategories.has(category.id)}
              onToggleSelect={handleToggleCategory}
              showCheckbox={selectedCategories.size > 0}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
