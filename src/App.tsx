import React, { useState, useEffect } from 'react';
import { db } from './db';
import { initializeDatabase, loadSampleDemoData } from './db/seedData';
import { sound } from './services/soundService';
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
import { AddProductModal } from './components/products/AddProductModal';
import { ExpiryDashboard } from './components/expiry/ExpiryDashboard';
import { InventoryDashboard } from './components/inventory/InventoryDashboard';
import { AnalyticsDashboard } from './components/analytics/AnalyticsDashboard';
import { QuickSaleModal } from './components/pos/QuickSaleModal';
import { SettingsModal } from './components/settings/SettingsModal';
import { StoreSafetyBanner } from './components/common/StoreSafetyBanner';
import { StoreSetupModal } from './components/onboarding/StoreSetupModal';
import { ImportSheetModal } from './components/common/ImportSheetModal';
import { ToastContainer, ToastMessage } from './components/common/Toast';
import { useLanguage } from './i18n/LanguageContext';
import { RetailAiAssistant } from './components/ai/RetailAiAssistant';

export const App: React.FC = () => {
  const { setLanguage } = useLanguage();
  const [activeTab, setActiveTab] = useState<ActiveTab>('products');
  const [products, setProducts] = useState<Product[]>([]);
  const [batches, setBatches] = useState<ProductBatch[]>([]);
  const [stockHistory, setStockHistory] = useState<StockHistory[]>([]);
  const [sales, setSales] = useState<SaleTransaction[]>([]);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [settings, setSettings] = useState<ShopSettings>({
    shopName: '',
    ownerName: '',
    phone: '',
    address: '',
    currency: '₹',
    urgentExpiryDays: 7,
    warningExpiryDays: 30,
    theme: 'light',
    soundEnabled: true,
    enableLowStockAlerts: true,
    isOnboarded: false,
    storeType: 'grocery',
  });

  const [isLoading, setIsLoading] = useState(true);
  const [isPosOpen, setIsPosOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isSetupModalOpen, setIsSetupModalOpen] = useState(false);
  const [isImportSheetOpen, setIsImportSheetOpen] = useState(false);
  const [isAddProductOpen, setIsAddProductOpen] = useState(false);
  const [autoAttemptExpiredProductId, setAutoAttemptExpiredProductId] = useState<string | null>(null);

  // Keyboard shortcut: Space or F2 opens POS register when not typing in an input
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.tagName === 'SELECT' ||
        target.isContentEditable
      ) {
        return;
      }
      if (e.key === ' ' || e.key === 'F2') {
        e.preventDefault();
        setIsPosOpen(true);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const addToast = (title: string, message?: string, type: 'success' | 'error' | 'info' = 'success') => {
    const newToast: ToastMessage = {
      id: `toast_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      title,
      message,
      type,
    };
    setToasts((prev) => [...prev.slice(-3), newToast]);
  };

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

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

      // Auto-sanitize: remove any accidentally imported spreadsheet header/metadata rows
      const junkProducts = allProducts.filter((p) => {
        const lower = p.name.toLowerCase();
        return (
          lower.includes('master catalog') ||
          lower.includes('automated stock') ||
          lower.includes('margin analysis') ||
          lower === 'total skus' ||
          lower === 'grand total'
        );
      });

      if (junkProducts.length > 0) {
        await db.transaction('rw', db.products, db.batches, async () => {
          for (const jp of junkProducts) {
            await db.products.delete(jp.id);
            const pBatches = await db.batches.where('productId').equals(jp.id).toArray();
            for (const b of pBatches) {
              await db.batches.delete(b.id);
            }
          }
        });
        const [cleanProducts, cleanBatches] = await Promise.all([
          db.products.toArray(),
          db.batches.toArray(),
        ]);
        setProducts(cleanProducts);
        setBatches(cleanBatches);
      } else {
        setProducts(allProducts);
        setBatches(allBatches);
      }
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
        sound.setEnabled(safeSettings.soundEnabled);
        if (safeSettings.language) {
          setLanguage(safeSettings.language);
        }

        // First-time onboarding trigger if shop has not been named or onboarded
        if (!safeSettings.isOnboarded || !safeSettings.shopName) {
          setIsSetupModalOpen(true);
        }
      } else {
        setIsSetupModalOpen(true);
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

  
  const handleLoadDemoData = async () => {
    setIsLoading(true);
    try {
      await loadSampleDemoData();
      await refreshData();
      addToast('Demo Store Loaded!', 'Realistic grocery products, expiries, and hisab metrics are active.', 'success');
    } catch (err) {
      addToast('Failed to load demo', err instanceof Error ? err.message : 'Unknown error', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggleTheme = async () => {
    const newTheme: 'light' | 'dark' = settings.theme === 'dark' ? 'light' : 'dark';
    const updated: ShopSettings = { ...settings, theme: newTheme };
    setSettings(updated);
    applyTheme(newTheme);
    await db.settings.put(updated);
  };

  // Compute live alert counts with date-safe local parsing
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const expiredCount = batches.filter((b) => {
    if (b.quantity <= 0 || b.status === 'disposed') return false;
    const exp = db.parseLocalDate(b.expiryDate);
    return Math.ceil((exp.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)) <= 0;
  }).length;

  const urgentExpiryCount = batches.filter((b) => {
    if (b.quantity <= 0 || b.status === 'disposed') return false;
    const exp = db.parseLocalDate(b.expiryDate);
    const diff = Math.ceil((exp.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    return diff > 0 && diff <= (settings.urgentExpiryDays || 7);
  }).length;

  // Saleable stock only: expired batches do not mask low-stock conditions
  const lowStockCount = products.filter((p) => {
    const prodBatches = batches.filter((b) => b.productId === p.id && b.quantity > 0 && b.status !== 'disposed');
    const freshStock = prodBatches.reduce((sum, b) => {
      const exp = db.parseLocalDate(b.expiryDate);
      return Math.ceil((exp.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)) > 0 ? sum + b.quantity : sum;
    }, 0);
    return freshStock <= p.minStockThreshold;
  }).length;

  const freshCount = batches.filter((b) => {
    if (b.quantity <= 0 || b.status === 'disposed') return false;
    const exp = db.parseLocalDate(b.expiryDate);
    return Math.ceil((exp.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)) > (settings.urgentExpiryDays || 7);
  }).length;

  const atRiskValue = batches.filter((b) => {
    if (b.quantity <= 0 || b.status === 'disposed') return false;
    const exp = db.parseLocalDate(b.expiryDate);
    const diff = Math.ceil((exp.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    return diff > 0 && diff <= (settings.urgentExpiryDays || 7);
  }).reduce((acc, b) => {
    const p = products.find((prod) => prod.id === b.productId);
    return acc + (p ? p.sellingPrice * b.quantity : 0);
  }, 0);

  const handleCompleteSetup = async (
    newSettings: ShopSettings,
    nextAction?: 'import_sheet' | 'add_product' | 'dashboard'
  ) => {
    // If the database has leftover mock data from previous demo, clear it so store starts fresh
    if (!settings.isOnboarded && products.length > 0) {
      await db.clearAllStoreData();
    }

    await db.settings.put(newSettings);
    setSettings(newSettings);
    if (newSettings.language) {
      setLanguage(newSettings.language);
    }
    setIsSetupModalOpen(false);
    await refreshData();

    addToast(`Welcome to ${newSettings.shopName}!`, 'Your store profile is set up successfully.', 'success');

    if (nextAction === 'import_sheet') {
      setIsImportSheetOpen(true);
    } else if (nextAction === 'add_product') {
      setActiveTab('products');
    }
  };

  const handleBulkImport = async (
    items: Array<{
      product: Omit<Product, 'currentStock' | 'createdAt' | 'updatedAt'>;
      batch: {
        batchNumber: string;
        expiryDate: string;
        mfgDate?: string;
        quantity: number;
        notes?: string;
      };
    }>
  ) => {
    await db.bulkAddProductsWithBatches(items);
    await refreshData();
    addToast('Import Complete', `Added ${items.length} products to your store`, 'success');
  };

  // DB Handlers with Interactive Feedback Toasts
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
    addToast('Product Added', `${productData.name} saved with batch ${productData.batchNumber}`, 'success');
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
    addToast('Batch Added', `Batch ${batchData.batchNumber} added with ${batchData.quantity} units`, 'success');
  };

  const handleUpdateProduct = async (updatedProduct: Product) => {
    await db.products.put(updatedProduct);
    await refreshData();
    addToast('Product Updated', `${updatedProduct.name} details saved`, 'success');
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
    addToast('Product Deleted', 'Product and related inventory records removed', 'info');
  };

  const handleDisposeBatch = async (productId: string, batchId: string, reason: string) => {
    const batch = batches.find((b) => b.id === batchId);
    if (!batch) return;
    await db.adjustStock(productId, batchId, -batch.quantity, 'expired_removal', reason);
    await refreshData();
    addToast('Expired Stock Disposed', `Quarantined batch disposed (${reason})`, 'info');
  };

  const handleClearanceBatch = async (productId: string, newSellingPrice: number) => {
    const product = products.find((p) => p.id === productId);
    if (!product) return;
    await db.products.update(productId, {
      sellingPrice: newSellingPrice,
      updatedAt: new Date().toISOString(),
    });
    await refreshData();
    addToast('Clearance Price Set', `Selling price updated to ${settings.currency}${newSellingPrice}`, 'success');
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
    addToast('Stock Adjusted', `Stock delta: ${quantityDelta > 0 ? '+' : ''}${quantityDelta} (${reason})`, 'info');
  };

  const handleProcessSale = async (
    cart: { productId: string; quantity: number }[],
    paymentMethod: 'cash' | 'upi' | 'card' | 'credit',
    customerName?: string
  ) => {
    const sale = await db.processSale(cart, paymentMethod, customerName);
    await refreshData();
    addToast(`Sale Complete (#${sale.receiptNumber})`, `Total: ${settings.currency}${sale.totalAmount.toFixed(2)} via ${paymentMethod.toUpperCase()}`, 'success');
    return sale;
  };

  const handleSaveSettings = async (newSettings: ShopSettings) => {
    await db.settings.put(newSettings);
    setSettings(newSettings);
    applyTheme(newSettings.theme);
    sound.setEnabled(newSettings.soundEnabled);
    addToast('Settings Saved', 'Shop preferences updated successfully', 'success');
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
        onLoadDemoData={products.length === 0 ? handleLoadDemoData : undefined}
        onOpenSettings={() => setIsSettingsOpen(true)}
        theme={settings.theme}
        onToggleTheme={handleToggleTheme}
        shopName={settings.shopName}
      />

      {/* Main Responsive Content Shell */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 pt-4 sm:pt-6 pb-24 md:pb-12 space-y-6">
        {/* Store Customer Safety Banner */}
        {activeTab === 'products' && (
          <ProductList
            products={products}
            batches={batches}
            currency={settings.currency}
            onAddProduct={handleAddProduct}
            onAddBatch={handleAddBatch}
            onUpdateProduct={handleUpdateProduct}
            onDeleteProduct={handleDeleteProduct}
            onOpenImportSheet={() => setIsImportSheetOpen(true)}
            onOpenAddProduct={() => setIsAddProductOpen(true)}
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

      
      {/* Global Add Product Modal */}
      {isAddProductOpen && (
        <AddProductModal
          isOpen={isAddProductOpen}
          onClose={() => setIsAddProductOpen(false)}
          currency={settings.currency}
          onSave={handleAddProduct}
        />
      )}

      {/* Quick Sale / POS Modal */}
      {isPosOpen && (
        <QuickSaleModal
          isOpen={isPosOpen}
          onClose={() => {
            setIsPosOpen(false);
            setAutoAttemptExpiredProductId(null);
          }}
          products={products}
          batches={batches}
          currency={settings.currency}
          onProcessSale={handleProcessSale}
          autoAttemptExpiredProductId={autoAttemptExpiredProductId}
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

      {/* First-Time Store Setup Onboarding Popup */}
      {isSetupModalOpen && (
        <StoreSetupModal
          isOpen={isSetupModalOpen}
          initialSettings={settings}
          onCompleteSetup={handleCompleteSetup}
        />
      )}

      {/* Spreadsheet / Excel Product Import Modal */}
      {isImportSheetOpen && (
        <ImportSheetModal
          isOpen={isImportSheetOpen}
          onClose={() => setIsImportSheetOpen(false)}
          currency={settings.currency}
          onImportComplete={handleBulkImport}
        />
      )}

      
      {/* Retail AI Copilot Floating Assistant */}
      <RetailAiAssistant
        products={products}
        batches={batches}
        sales={sales}
        settings={settings}
        onNavigateTab={setActiveTab}
        onOpenPos={() => setIsPosOpen(true)}
      />

      {/* Interactive Action Notifications */}
      <ToastContainer toasts={toasts} onDismiss={removeToast} />
    </div>
  );
};

export default App;
