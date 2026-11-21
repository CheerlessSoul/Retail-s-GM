import React, { useState, useEffect } from 'react';
import { db } from './db';
import { initializeDatabase } from './db/seedData';
import type { 
  Product, 
  ProductBatch, 
  StockHistory, 
  SaleTransaction, 
  ShopSettings, 
  ActiveTab,
  StockChangeType 
} from './types';
import { Navbar } from './components/layout/Navbar';
import { ProductList } from './components/products/ProductList';
import { ExpiryDashboard } from './components/expiry/ExpiryDashboard';
import { InventoryDashboard } from './components/inventory/InventoryDashboard';
import { AnalyticsDashboard } from './components/analytics/AnalyticsDashboard';
import { QuickSaleModal } from './components/pos/QuickSaleModal';
import { SettingsModal } from './components/settings/SettingsModal';

export const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<ActiveTab>('products');
  const [products, setProducts] = useState<Product[]>([]);
  const [batches, setBatches] = useState<ProductBatch[]>([]);
  const [stockHistory, setStockHistory] = useState<StockHistory[]>([]);
  const [sales, setSales] = useState<SaleTransaction[]>([]);
  const [settings, setSettings] = useState<ShopSettings>({
    shopName: "Retail's GM Store",
    ownerName: 'Store Owner',
    phone: '',
    address: '',
    currency: '₹',
    urgentExpiryDays: 7,
    warningExpiryDays: 30,
    theme: 'light',
    soundEnabled: true,
    enableLowStockAlerts: true,
  });

  const [isLoading, setIsLoading] = useState(true);
  const [isPosOpen, setIsPosOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  // Initialize and load data from Dexie IndexedDB
  const refreshData = async () => {
    try {
      await initializeDatabase();
      const [allProducts, allBatches, allHistory, allSales, allSettings] = await Promise.all([
        db.products.toArray(),
        db.batches.toArray(),
        db.stockHistory.toArray(),
        db.sales.toArray(),
        db.settings.toArray(),
      ]);

      setProducts(allProducts);
      setBatches(allBatches);
      setStockHistory(allHistory);
      setSales(allSales);

      if (allSettings.length > 0) {
        const s = allSettings[0];
        const safeSettings: ShopSettings = {
          ...s,
          theme: s.theme === 'dark' ? 'dark' : 'light',
        };
        setSettings(safeSettings);
        applyTheme(safeSettings.theme);
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    refreshData();
  }, []);

  const applyTheme = (theme: 'light' | 'dark') => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  };

  const handleToggleTheme = async () => {
    const newTheme: 'light' | 'dark' = settings.theme === 'dark' ? 'light' : 'dark';
    const updated: ShopSettings = { ...settings, theme: newTheme };
    setSettings(updated);
    applyTheme(newTheme);
    await db.settings.put(updated);
  };

  // Compute live alert counts
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const expiredCount = batches.filter((b) => {
    if (b.quantity <= 0 || b.status === 'disposed') return false;
    const exp = new Date(b.expiryDate);
    exp.setHours(0, 0, 0, 0);
    return Math.ceil((exp.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)) <= 0;
  }).length;

  const urgentExpiryCount = batches.filter((b) => {
    if (b.quantity <= 0 || b.status === 'disposed') return false;
    const exp = new Date(b.expiryDate);
    exp.setHours(0, 0, 0, 0);
    const diff = Math.ceil((exp.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    return diff > 0 && diff <= (settings.urgentExpiryDays || 7);
  }).length;

  const lowStockCount = products.filter((p) => p.currentStock <= p.minStockThreshold).length;

  // DB Handlers
  const handleAddProduct = async (productData: {
    name: string;
    brand: string;
    category: string;
    barcode: string;
    unit: string;
    costPrice: number;
    sellingPrice: number;
    minStockThreshold: number;
    batchNumber: string;
    expiryDate: string;
    mfgDate?: string;
    quantity: number;
  }) => {
    await db.addProductWithBatch(
      {
        id: `prod_${Date.now()}`,
        name: productData.name,
        brand: productData.brand,
        category: productData.category,
        barcode: productData.barcode,
        unit: productData.unit,
        costPrice: productData.costPrice,
        sellingPrice: productData.sellingPrice,
        minStockThreshold: productData.minStockThreshold,
      },
      {
        batchNumber: productData.batchNumber,
        expiryDate: productData.expiryDate,
        mfgDate: productData.mfgDate,
        quantity: productData.quantity,
      }
    );
    await refreshData();
  };

  const handleAddBatch = async (
    productId: string,
    batchData: {
      batchNumber: string;
      expiryDate: string;
      mfgDate?: string;
      quantity: number;
      notes?: string;
    }
  ) => {
    await db.addBatchToProduct(productId, batchData);
    await refreshData();
  };

  const handleUpdateProduct = async (updatedProduct: Product) => {
    await db.products.put(updatedProduct);
    await refreshData();
  };

  const handleDeleteProduct = async (productId: string) => {
    await db.transaction('rw', db.products, db.batches, db.stockHistory, async () => {
      await db.products.delete(productId);
      const prodBatches = await db.batches.where('productId').equals(productId).toArray();
      for (const b of prodBatches) {
        await db.batches.delete(b.id);
      }
    });
    await refreshData();
  };

  const handleDisposeBatch = async (productId: string, batchId: string, reason: string) => {
    const batch = batches.find((b) => b.id === batchId);
    if (!batch) return;
    await db.adjustStock(productId, batchId, -batch.quantity, 'expired_removal', reason);
    await refreshData();
  };

  const handleClearanceBatch = async (productId: string, newSellingPrice: number) => {
    const product = products.find((p) => p.id === productId);
    if (!product) return;
    await db.products.update(productId, {
      sellingPrice: newSellingPrice,
      updatedAt: new Date().toISOString(),
    });
    await refreshData();
  };

  const handleAdjustStock = async (
    productId: string,
    batchId: string,
    quantityDelta: number,
    type: StockChangeType,
    reason: string
  ) => {
    await db.adjustStock(productId, batchId, quantityDelta, type, reason);
    await refreshData();
  };

  const handleProcessSale = async (
    cart: { productId: string; quantity: number }[],
    paymentMethod: 'cash' | 'upi' | 'card' | 'credit',
    customerName?: string
  ) => {
    const sale = await db.processSale(cart, paymentMethod, customerName);
    await refreshData();
    return sale;
  };

  const handleSaveSettings = async (newSettings: ShopSettings) => {
    await db.settings.put(newSettings);
    setSettings(newSettings);
    applyTheme(newSettings.theme);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-[#0b1320] flex flex-col items-center justify-center text-slate-800 dark:text-slate-100">
        <div className="w-10 h-10 border-4 border-brand-600 border-t-transparent rounded-full animate-spin mb-3" />
        <p className="text-sm font-semibold tracking-wide">Loading Retail's GM...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-[#0b1320] text-slate-900 dark:text-slate-100">
      {/* Universal Navigation Header */}
      <Navbar
        activeTab={activeTab}
        onTabChange={setActiveTab}
        expiredCount={expiredCount}
        urgentExpiryCount={urgentExpiryCount}
        lowStockCount={lowStockCount}
        onOpenPos={() => setIsPosOpen(true)}
        onOpenSettings={() => setIsSettingsOpen(true)}
        theme={settings.theme}
        onToggleTheme={handleToggleTheme}
        shopName={settings.shopName}
      />

      {/* Main Responsive Content Shell */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 pb-24 md:pb-8">
        {activeTab === 'products' && (
          <ProductList
            products={products}
            batches={batches}
            currency={settings.currency}
            onAddProduct={handleAddProduct}
            onAddBatch={handleAddBatch}
            onUpdateProduct={handleUpdateProduct}
            onDeleteProduct={handleDeleteProduct}
          />
        )}

        {activeTab === 'expiry' && (
          <ExpiryDashboard
            products={products}
            batches={batches}
            currency={settings.currency}
            onDisposeBatch={handleDisposeBatch}
            onClearanceBatch={handleClearanceBatch}
          />
        )}

        {activeTab === 'inventory' && (
          <InventoryDashboard
            products={products}
            batches={batches}
            stockHistory={stockHistory}
            currency={settings.currency}
            onAdjustStock={handleAdjustStock}
            onAddBatch={handleAddBatch}
          />
        )}

        {activeTab === 'analytics' && (
          <AnalyticsDashboard
            sales={sales}
            products={products}
            batches={batches}
            currency={settings.currency}
          />
        )}
      </main>

      {/* Quick Sale / POS Modal */}
      {isPosOpen && (
        <QuickSaleModal
          isOpen={isPosOpen}
          onClose={() => setIsPosOpen(false)}
          products={products}
          batches={batches}
          currency={settings.currency}
          onProcessSale={handleProcessSale}
        />
      )}

      {/* Settings Modal */}
      {isSettingsOpen && (
        <SettingsModal
          isOpen={isSettingsOpen}
          onClose={() => setIsSettingsOpen(false)}
          settings={settings}
          onSaveSettings={handleSaveSettings}
          onThemeToggle={applyTheme}
        />
      )}
    </div>
  );
};

export default App;
