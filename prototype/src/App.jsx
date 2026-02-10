import { useState, useCallback } from 'react';
import Sidebar from './components/Sidebar';
import Overview from './components/Overview';
import CategoryView from './components/CategoryView';
import ConfirmModal from './components/ConfirmModal';
import { mockItems } from './data/mockData';

function App() {
  const [activeCategory, setActiveCategory] = useState('overview');
  const [selectedItems, setSelectedItems] = useState(new Set());
  const [isScanning, setIsScanning] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  const handleScan = useCallback(() => {
    setIsScanning(true);
    // Simulate scanning
    setTimeout(() => {
      setIsScanning(false);
    }, 2000);
  }, []);

  const handleToggleItem = useCallback((itemId) => {
    setSelectedItems((prev) => {
      const next = new Set(prev);
      if (next.has(itemId)) {
        next.delete(itemId);
      } else {
        next.add(itemId);
      }
      return next;
    });
  }, []);

  const handleToggleAll = useCallback((categoryId) => {
    const categoryItems = mockItems[categoryId]?.items || [];
    const categoryItemIds = categoryItems.map((item) => item.id);
    const allSelected = categoryItemIds.every((id) => selectedItems.has(id));

    setSelectedItems((prev) => {
      const next = new Set(prev);
      if (allSelected) {
        categoryItemIds.forEach((id) => next.delete(id));
      } else {
        categoryItemIds.forEach((id) => next.add(id));
      }
      return next;
    });
  }, [selectedItems]);

  const handleClean = useCallback(() => {
    setShowConfirmModal(true);
  }, []);

  const handleConfirmClean = useCallback(() => {
    // In a real app, this would trigger the actual cleanup
    console.log('Cleaning items:', Array.from(selectedItems));
    setSelectedItems(new Set());
    setShowConfirmModal(false);
  }, [selectedItems]);

  // Get selected items with their data
  const getSelectedItemsData = () => {
    const items = [];
    Object.values(mockItems).forEach((category) => {
      category.items?.forEach((item) => {
        if (selectedItems.has(item.id)) {
          items.push(item);
        }
      });
    });
    return items;
  };

  const selectedItemsData = getSelectedItemsData();
  const selectedTotalSize = selectedItemsData.reduce((acc, item) => acc + item.size, 0);

  return (
    <div className="flex min-h-screen bg-white">
      <Sidebar
        activeCategory={activeCategory}
        onCategoryChange={setActiveCategory}
      />

      <main className="flex-1 flex flex-col">
        {activeCategory === 'overview' ? (
          <Overview
            onCategoryChange={setActiveCategory}
            onScan={handleScan}
            isScanning={isScanning}
          />
        ) : (
          <CategoryView
            categoryId={activeCategory}
            selectedItems={selectedItems}
            onToggleItem={handleToggleItem}
            onToggleAll={handleToggleAll}
            onClean={handleClean}
          />
        )}
      </main>

      <ConfirmModal
        isOpen={showConfirmModal}
        items={selectedItemsData}
        totalSize={selectedTotalSize}
        onConfirm={handleConfirmClean}
        onCancel={() => setShowConfirmModal(false)}
      />
    </div>
  );
}

export default App;
