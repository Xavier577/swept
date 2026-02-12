import { Check, ChevronRight, Clock, Folder } from 'lucide-react';
import { formatBytes, formatDate } from '../utils/formatters';

export default function ItemList({ items, selectedItems, onToggleItem, onToggleAll }) {
  const allSelected = items.length > 0 && items.every((item) => selectedItems.has(item.id));
  const someSelected = items.some((item) => selectedItems.has(item.id)) && !allSelected;

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
      {/* Header */}
      <div className="flex items-center px-4 py-3 bg-gray-50 border-b border-gray-100">
        <button
          onClick={onToggleAll}
          className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors mr-4 ${
            allSelected
              ? 'bg-blue-500 border-blue-500'
              : someSelected
              ? 'bg-blue-200 border-blue-500'
              : 'border-gray-300 hover:border-gray-400'
          }`}
        >
          {(allSelected || someSelected) && <Check className="w-3 h-3 text-white" />}
        </button>
        <span className="flex-1 text-sm font-medium text-gray-600">Name</span>
        <span className="w-24 text-sm font-medium text-gray-600 text-right">Size</span>
        <span className="w-28 text-sm font-medium text-gray-600 text-right">Last Used</span>
        <span className="w-8" />
      </div>

      {/* Items */}
      <div className="divide-y divide-gray-100">
        {items.map((item) => {
          const isSelected = selectedItems.has(item.id);

          return (
            <div
              key={item.id}
              className={`flex items-center px-4 py-3 hover:bg-gray-50 transition-colors cursor-pointer ${
                isSelected ? 'bg-blue-50' : ''
              }`}
              onClick={() => onToggleItem(item.id)}
            >
              <button
                className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors mr-4 ${
                  isSelected
                    ? 'bg-blue-500 border-blue-500'
                    : 'border-gray-300 hover:border-gray-400'
                }`}
                onClick={(e) => {
                  e.stopPropagation();
                  onToggleItem(item.id);
                }}
              >
                {isSelected && <Check className="w-3 h-3 text-white" />}
              </button>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <Folder className="w-4 h-4 text-gray-400 flex-shrink-0" />
                  <span className="font-medium text-gray-800 truncate">{item.name}</span>
                  <span className="px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded-full flex-shrink-0">
                    {item.type}
                  </span>
                </div>
                <p className="text-xs text-gray-500 mt-0.5 truncate ml-6">{item.path}</p>
              </div>

              <span className="w-24 text-sm font-medium text-gray-800 text-right">
                {formatBytes(item.size)}
              </span>

              <span className="w-28 text-sm text-gray-500 text-right flex items-center justify-end gap-1">
                <Clock className="w-3 h-3" />
                {formatDate(item.last_used || item.lastUsed)}
              </span>

              <ChevronRight className="w-4 h-4 text-gray-400 ml-2" />
            </div>
          );
        })}
      </div>

      {items.length === 0 && (
        <div className="py-12 text-center text-gray-500">
          <p>No items found in this category</p>
        </div>
      )}
    </div>
  );
}
