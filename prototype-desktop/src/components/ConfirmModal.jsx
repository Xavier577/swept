import { AlertTriangle, X } from 'lucide-react';
import { formatBytes } from '../utils/formatters';

export default function ConfirmModal({ isOpen, items, totalSize, onConfirm, onCancel }) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onCancel}
      />

      {/* Modal */}
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
              <AlertTriangle className="w-5 h-5 text-red-500" />
            </div>
            <h3 className="text-lg font-semibold text-gray-800">Confirm Cleanup</h3>
          </div>
          <button
            onClick={onCancel}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5">
          <p className="text-gray-600 mb-4">
            You are about to permanently delete the following items:
          </p>

          {/* Item Preview */}
          <div className="bg-gray-50 rounded-xl p-4 max-h-48 overflow-auto mb-4">
            <ul className="space-y-2">
              {items.slice(0, 5).map((item) => (
                <li key={item.id} className="flex items-center justify-between text-sm">
                  <span className="text-gray-700 truncate flex-1">{item.name}</span>
                  <span className="text-gray-500 ml-2">{formatBytes(item.size)}</span>
                </li>
              ))}
              {items.length > 5 && (
                <li className="text-sm text-gray-500 italic">
                  ...and {items.length - 5} more items
                </li>
              )}
            </ul>
          </div>

          {/* Total */}
          <div className="flex items-center justify-between py-3 border-t border-gray-100">
            <span className="font-medium text-gray-800">Total space to reclaim:</span>
            <span className="text-xl font-bold text-green-600">{formatBytes(totalSize)}</span>
          </div>

          <p className="text-sm text-gray-500 mt-2">
            This action cannot be undone. Make sure you don't need these files before proceeding.
          </p>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-5 bg-gray-50 border-t border-gray-100">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-gray-700 hover:bg-gray-200 rounded-lg font-medium transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg font-medium transition-colors"
          >
            Delete {items.length} items
          </button>
        </div>
      </div>
    </div>
  );
}
