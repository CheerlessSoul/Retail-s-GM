import React, { useState } from 'react';
import { 
  Package, 
  AlertTriangle, 
  History, 
  Plus, 
  Minus, 
  Search, 
  ArrowUpRight, 
  ArrowDownRight, 
  RefreshCw, 
  CheckCircle, 
  SlidersHorizontal,
  Download 
} from 'lucide-react';
import type { Product, ProductBatch, StockHistory, StockChangeType } from '../../types';

interface InventoryDashboardProps {
  products: Product[];
  batches: ProductBatch[];
  stockHistory: StockHistory[];
  currency: string;
  onAdjustStock: (
    productId: string,
    batchId: string,
    quantityDelta: number,
    type: StockChangeType,
    reason: string
  ) => Promise<void>;
  onAddBatch: (
    productId: string,
    batchData: {
      batchNumber: string;
      expiryDate: string;
      mfgDate?: string;
      quantity: number;
      notes?: string;
    }
  ) => Promise<void>;
}

export const InventoryDashboard: React.FC<InventoryDashboardProps> = ({
  products,
  batches,
  stockHistory,
  currency,
  onAdjustStock,
  onAddBatch,
}) => {
  const [activeTab, setActiveTab] = useState<'inventory' | 'low_stock' | 'history'>('inventory');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Stock adjustment dialog state
  const [adjustModalProduct, setAdjustModalProduct] = useState<Product | null>(null);
  const [selectedBatchId, setSelectedBatchId] = useState<string>('');
  const [actionType, setActionType] = useState<StockChangeType>('restock');
  const [adjustmentDirection, setAdjustmentDirection] = useState<'add' | 'subtract'>('subtract');
  const [deltaQuantity, setDeltaQuantity] = useState<number>(5);
  const [reason, setReason] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Quick Restock New Batch dialog
  const [quickRestockProduct, setQuickRestockProduct] = useState<Product | null>(null);
  const [newBatchNo, setNewBatchNo] = useState('');
  const [newExpiryDate, setNewExpiryDate] = useState('');
  const [newQuantity, setNewQuantity] = useState(10);

  // Metrics
  const totalSkus = products.length;
  const totalUnits = products.reduce((acc, p) => acc + p.currentStock, 0);
  const lowStockProducts = products.filter((p) => p.currentStock <= p.minStockThreshold);
  const outOfStockProducts = products.filter((p) => p.currentStock === 0);
  const totalCostValuation = products.reduce((acc, p) => acc + p.costPrice * p.currentStock, 0);
  const totalRetailValuation = products.reduce((acc, p) => acc + p.sellingPrice * p.currentStock, 0);

  // Filtered inventory list
  const filteredProducts = (activeTab === 'low_stock' ? lowStockProducts : products).filter((p) =>
    p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.brand.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.barcode.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Filtered history
  const filteredHistory = stockHistory
    .filter((h) =>
      h.productName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      h.reason.toLowerCase().includes(searchQuery.toLowerCase()) ||
      h.type.toLowerCase().includes(searchQuery.toLowerCase())
    )
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  const getProductBatches = (productId: string) => {
    return batches.filter((b) => b.productId === productId && b.quantity > 0);
  };

  const handleOpenAdjust = (product: Product) => {
    const bList = getProductBatches(product.id);
    setAdjustModalProduct(product);
    setSelectedBatchId(bList.length > 0 ? bList[0].id : '');
    setActionType('restock');
    setDeltaQuantity(5);
    setReason('');
  };

  const handleAdjustSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adjustModalProduct || !selectedBatchId) return;

    try {
      setIsSubmitting(true);
      let delta = Math.abs(deltaQuantity);
      if (actionType === 'damaged' || actionType === 'expired_removal') {
        delta = -delta;
      } else if (actionType === 'adjustment') {
        delta = adjustmentDirection === 'subtract' ? -delta : delta;
      }

      await onAdjustStock(
        adjustModalProduct.id,
        selectedBatchId,
        delta,
        actionType,
        reason.trim() || `${actionType} adjustment`
      );
      setAdjustModalProduct(null);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleQuickRestockSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickRestockProduct || !newExpiryDate) return;

    try {
      setIsSubmitting(true);
      await onAddBatch(quickRestockProduct.id, {
        batchNumber: newBatchNo.trim() || `B-${Date.now().toString().slice(-4)}`,
        expiryDate: newExpiryDate,
        quantity: Number(newQuantity) || 1,
        notes: 'Restocked from Inventory screen',
      });
      setQuickRestockProduct(null);
      setNewBatchNo('');
      setNewExpiryDate('');
      setNewQuantity(10);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleExportCsv = () => {
    if (activeTab === 'history') {
      const headers = ['Timestamp', 'Product Name', 'Change Type', 'Quantity Delta', 'Stock Before', 'Stock After', 'Reason'];
      const rows = filteredHistory.map((h) => [
        `"${new Date(h.timestamp).toLocaleString()}"`,
        `"${h.productName}"`,
        h.type,
        h.quantityDelta,
        h.stockBefore,
        h.stockAfter,
        `"${h.reason}"`,
      ].join(','));
      const csv = [headers.join(','), ...rows].join('\n');
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `retails-gm-stock-audit-${new Date().toISOString().split('T')[0]}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } else {
      const headers = ['Product Name', 'Brand', 'Category', 'Barcode', 'Current Stock', 'Min Threshold', 'Cost Price', 'Selling Price', 'Status'];
      const rows = filteredProducts.map((p) => [
        `"${p.name}"`,
        `"${p.brand}"`,
        `"${p.category}"`,
        `"${p.barcode}"`,
        p.currentStock,
        p.minStockThreshold,
        p.costPrice,
        p.sellingPrice,
        p.currentStock <= 0 ? 'Out of Stock' : p.currentStock <= p.minStockThreshold ? 'Low Stock' : 'In Stock',
      ].join(','));
      const csv = [headers.join(','), ...rows].join('\n');
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `retails-gm-inventory-report-${new Date().toISOString().split('T')[0]}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    }
  };

  return (
    <div className="space-y-6">
      {/* Title */}
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">
          Inventory Management
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
          Track real-time stock levels, receive low stock alerts, and inspect full stock change audit logs.
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Total Stock */}
        <div className="p-3.5 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 shadow-sm card-3d-hover">
          <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
            Total Stock (Bacha Mal)
          </span>
          <div className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-slate-100 mt-1.5">
            {totalUnits} <span className="text-xs font-normal text-slate-500">units</span>
          </div>
          <div className="text-xs text-slate-500 mt-1">
            Across {totalSkus} unique products
          </div>
        </div>

        {/* Low Stock Alert */}
        <div
          onClick={() => setActiveTab('low_stock')}
          className={`p-3.5 rounded-lg border transition-all cursor-pointer card-3d-hover ${
            activeTab === 'low_stock'
              ? 'bg-amber-50 dark:bg-amber-950/40 border-amber-500'
              : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:border-amber-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-amber-700 dark:text-amber-400 uppercase tracking-wider">
              Kam Stock (Order Now)
            </span>
            <AlertTriangle className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-xl sm:text-2xl font-extrabold text-amber-600 dark:text-amber-400 mt-1.5">
            {lowStockProducts.length} <span className="text-xs font-normal text-slate-500">items</span>
          </div>
          <div className="text-xs text-amber-600 dark:text-amber-400 mt-1">
            {outOfStockProducts.length} items completely out of stock
          </div>
        </div>

        {/* Total Cost Valuation */}
        <div className="p-3.5 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 shadow-sm card-3d-hover">
          <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
            Khareed Laagat (Cost Value)
          </span>
          <div className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-slate-100 mt-1.5">
            {currency}{totalCostValuation.toFixed(0)}
          </div>
          <div className="text-xs text-slate-500 mt-1">
            Total money invested in stock
          </div>
        </div>

        {/* Retail Valuation */}
        <div className="p-3.5 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 shadow-sm card-3d-hover">
          <span className="text-[11px] font-bold text-brand-700 dark:text-brand-400 uppercase tracking-wider block">
            Bikri Muly (Selling Value)
          </span>
          <div className="text-xl sm:text-2xl font-extrabold text-brand-600 dark:text-brand-400 mt-1.5">
            {currency}{totalRetailValuation.toFixed(0)}
          </div>
          <div className="text-xs text-emerald-600 dark:text-emerald-400 mt-1">
            Expected Munafa: +{currency}{(totalRetailValuation - totalCostValuation).toFixed(0)}
          </div>
        </div>
      </div>

      {/* Tabs & Search */}
      <div className="bg-white dark:bg-slate-800 p-3.5 rounded-lg border border-slate-200 dark:border-slate-700 shadow-sm space-y-2.5 card-3d">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
          
          {/* Tab buttons */}
          <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto pb-1 scrollbar-none text-xs">
            <button
              onClick={() => setActiveTab('inventory')}
              className={`px-3.5 py-2 rounded-xl font-semibold whitespace-nowrap transition-colors flex items-center gap-1.5 ${
                activeTab === 'inventory'
                  ? 'bg-brand-600 text-white shadow-sm'
                  : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
              }`}
            >
              <Package className="w-4 h-4" />
              <span>All Stock (Dukan Ka Mal)</span>
            </button>

            <button
              onClick={() => setActiveTab('low_stock')}
              className={`px-3.5 py-2 rounded-xl font-semibold whitespace-nowrap transition-colors flex items-center gap-1.5 ${
                activeTab === 'low_stock'
                  ? 'bg-amber-600 text-white shadow-sm'
                  : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
              }`}
            >
              <AlertTriangle className="w-4 h-4" />
              <span>Low Stock Alerts ({lowStockProducts.length})</span>
            </button>

            <button
              onClick={() => setActiveTab('history')}
              className={`px-3.5 py-2 rounded-xl font-semibold whitespace-nowrap transition-colors flex items-center gap-1.5 ${
                activeTab === 'history'
                  ? 'bg-slate-800 text-white dark:bg-slate-200 dark:text-slate-900 shadow-sm'
                  : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
              }`}
            >
              <History className="w-4 h-4" />
              <span>Stock History (Aana/Jana)</span>
            </button>
          </div>

          {/* Search Box & Export */}
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <div className="relative flex-1 sm:w-60">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search product or history..."
                className="w-full pl-9 pr-3 py-1.5 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>
            <button
              onClick={handleExportCsv}
              className="px-3 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-200 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 rounded-xl transition-colors flex items-center gap-1 shrink-0"
              title="Export report to CSV"
            >
              <Download className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Export CSV</span>
            </button>
          </div>
        </div>
      </div>

      {/* Content based on Active Tab */}
      {activeTab === 'history' ? (
        /* STOCK HISTORY AUDIT TRAIL TABLE */
        <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 overflow-hidden shadow-sm">
          <div className="p-4 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between">
            <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100">
              Audit History Log ({filteredHistory.length} events)
            </h3>
            <span className="text-xs text-slate-500">Every restock, sale, and adjustment is recorded</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-900/60 text-slate-700 dark:text-slate-300 font-semibold border-b border-slate-200 dark:border-slate-700">
                <tr>
                  <th className="px-4 py-3">Timestamp</th>
                  <th className="px-4 py-3">Product Name</th>
                  <th className="px-4 py-3">Type</th>
                  <th className="px-4 py-3">Quantity Delta</th>
                  <th className="px-4 py-3">Stock Before &rarr; After</th>
                  <th className="px-4 py-3">Reason / Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                {filteredHistory.map((item) => {
                  const isPositive = item.quantityDelta > 0;
                  return (
                    <tr key={item.id} className="hover:bg-slate-50 dark:hover:bg-slate-750 transition-colors">
                      <td className="px-4 py-3 text-slate-500 dark:text-slate-400 whitespace-nowrap">
                        {new Date(item.timestamp).toLocaleString('en-IN', {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </td>
                      <td className="px-4 py-3 font-semibold text-slate-900 dark:text-slate-100">
                        {item.productName}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase ${
                            item.type === 'restock'
                              ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                              : item.type === 'sale'
                              ? 'bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300'
                              : item.type === 'damaged'
                              ? 'bg-red-100 text-red-800 dark:bg-red-950/60 dark:text-red-300'
                              : 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300'
                          }`}
                        >
                          {item.type}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-bold">
                        <span
                          className={`inline-flex items-center gap-0.5 ${
                            isPositive
                              ? 'text-emerald-600 dark:text-emerald-400'
                              : 'text-red-600 dark:text-red-400'
                          }`}
                        >
                          {isPositive ? (
                            <ArrowUpRight className="w-3.5 h-3.5" />
                          ) : (
                            <ArrowDownRight className="w-3.5 h-3.5" />
                          )}
                          {isPositive ? `+${item.quantityDelta}` : item.quantityDelta}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-mono text-slate-600 dark:text-slate-400">
                        {item.stockBefore} &rarr;{' '}
                        <span className="font-bold text-slate-900 dark:text-slate-100">
                          {item.stockAfter}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-600 dark:text-slate-400">
                        {item.reason}
                      </td>
                    </tr>
                  );
                })}

                {filteredHistory.length === 0 && (
                  <tr>
                    <td colSpan={6} className="text-center py-8 text-slate-400">
                      No stock history log entries recorded yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* LIVE INVENTORY & LOW STOCK TABLE */
        <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-900/60 text-slate-700 dark:text-slate-300 font-semibold border-b border-slate-200 dark:border-slate-700">
                <tr>
                  <th className="px-4 py-3">Product Name</th>
                  <th className="px-4 py-3">Category</th>
                  <th className="px-4 py-3">Current Stock</th>
                  <th className="px-4 py-3">Min Threshold</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Quick Stock Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                {filteredProducts.map((product) => {
                  const isLow = product.currentStock <= product.minStockThreshold;
                  const isOut = product.currentStock === 0;

                  return (
                    <tr
                      key={product.id}
                      className={`transition-colors ${
                        isOut
                          ? 'bg-red-50/30 dark:bg-red-950/20'
                          : isLow
                          ? 'bg-amber-50/30 dark:bg-amber-950/10'
                          : 'hover:bg-slate-50 dark:hover:bg-slate-750'
                      }`}
                    >
                      <td className="px-4 py-3">
                        <div className="font-semibold text-slate-900 dark:text-slate-100">
                          {product.name}
                        </div>
                        <div className="text-[11px] text-slate-400">{product.brand}</div>
                      </td>
                      <td className="px-4 py-3 text-slate-600 dark:text-slate-400">
                        {product.category}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`font-bold text-sm ${
                            isOut
                              ? 'text-red-600 dark:text-red-400'
                              : isLow
                              ? 'text-amber-600 dark:text-amber-400'
                              : 'text-slate-800 dark:text-slate-200'
                          }`}
                        >
                          {product.currentStock} {product.unit}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-medium text-slate-600 dark:text-slate-400">
                        {product.minStockThreshold} {product.unit}
                      </td>
                      <td className="px-4 py-3">
                        {isOut ? (
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-red-100 text-red-700 dark:bg-red-950/60 dark:text-red-300">
                            Out of Stock
                          </span>
                        ) : isLow ? (
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300">
                            Low Stock Alert
                          </span>
                        ) : (
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-medium bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300">
                            In Stock
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => setQuickRestockProduct(product)}
                            className="px-2.5 py-1 text-[11px] font-medium text-brand-700 dark:text-brand-300 bg-brand-50 dark:bg-brand-950/50 hover:bg-brand-100 rounded-lg transition-colors flex items-center gap-1"
                          >
                            <Plus className="w-3.5 h-3.5" />
                            <span>Restock</span>
                          </button>

                          <button
                            onClick={() => handleOpenAdjust(product)}
                            className="px-2.5 py-1 text-[11px] font-medium text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 rounded-lg transition-colors flex items-center gap-1"
                          >
                            <SlidersHorizontal className="w-3.5 h-3.5" />
                            <span>Adjust</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}

                {filteredProducts.length === 0 && (
                  <tr>
                    <td colSpan={6} className="text-center py-8 text-slate-400">
                      No products found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Adjust Stock Modal */}
      {adjustModalProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60">
          <div className="bg-white dark:bg-slate-800 rounded-lg w-full max-w-md p-5 shadow-xl border border-slate-200 dark:border-slate-700 space-y-3">
            <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
              Adjust Stock Level
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Update inventory for {adjustModalProduct.name}.
            </p>

            <form onSubmit={handleAdjustSubmit} className="space-y-3">
              {/* Batch Selector */}
              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Select Batch
                </label>
                <select
                  value={selectedBatchId}
                  onChange={(e) => setSelectedBatchId(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700"
                >
                  {getProductBatches(adjustModalProduct.id).map((b) => (
                    <option key={b.id} value={b.id}>
                      Batch: {b.batchNumber} (Qty: {b.quantity}, Exp: {b.expiryDate})
                    </option>
                  ))}
                </select>
              </div>

              {/* Adjustment Type */}
              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Adjustment Reason Type
                </label>
                <select
                  value={actionType}
                  onChange={(e) => setActionType(e.target.value as StockChangeType)}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700"
                >
                  <option value="restock">Add Stock (Restock / Found Inventory)</option>
                  <option value="damaged">Damaged / Broken / Spilled Goods</option>
                  <option value="expired_removal">Expired Stock Write-Off</option>
                  <option value="adjustment">Inventory Count Audit Correction</option>
                </select>
              </div>

              {actionType === 'adjustment' && (
                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Audit Result Direction
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setAdjustmentDirection('subtract')}
                      className={`py-1.5 px-3 text-xs font-semibold rounded-lg border transition-colors ${
                        adjustmentDirection === 'subtract'
                          ? 'bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300 border-red-300 dark:border-red-800'
                          : 'bg-white dark:bg-slate-700 text-slate-600 dark:text-slate-300 border-slate-250 dark:border-slate-600'
                      }`}
                    >
                      - Shortage (Reduce Stock)
                    </button>
                    <button
                      type="button"
                      onClick={() => setAdjustmentDirection('add')}
                      className={`py-1.5 px-3 text-xs font-semibold rounded-lg border transition-colors ${
                        adjustmentDirection === 'add'
                          ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800'
                          : 'bg-white dark:bg-slate-700 text-slate-600 dark:text-slate-300 border-slate-250 dark:border-slate-600'
                      }`}
                    >
                      + Surplus (Found Stock)
                    </button>
                  </div>
                </div>
              )}

              {/* Quantity */}
              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Quantity ({adjustModalProduct.unit})
                </label>
                <input
                  type="number"
                  min="1"
                  required
                  value={deltaQuantity}
                  onChange={(e) => setDeltaQuantity(parseInt(e.target.value, 10) || 1)}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700"
                />
              </div>

              {/* Notes */}
              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Note / Reason
                </label>
                <input
                  type="text"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="e.g. Broken packet during display, count mismatch"
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setAdjustModalProduct(null)}
                  className="px-3 py-1.5 text-xs text-slate-600 dark:text-slate-300 hover:bg-slate-100 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-1.5 text-xs font-semibold text-white bg-brand-600 hover:bg-brand-700 rounded-lg"
                >
                  {isSubmitting ? 'Updating...' : 'Confirm Update'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Quick Restock New Batch Modal */}
      {quickRestockProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60">
          <div className="bg-white dark:bg-slate-800 rounded-lg w-full max-w-md p-5 shadow-xl border border-slate-200 dark:border-slate-700 space-y-3">
            <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
              Restock New Batch
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Add a new fresh batch for {quickRestockProduct.name}.
            </p>

            <form onSubmit={handleQuickRestockSubmit} className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Batch Number
                </label>
                <input
                  type="text"
                  required
                  value={newBatchNo}
                  onChange={(e) => setNewBatchNo(e.target.value)}
                  placeholder="e.g. B-105"
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Expiry Date *
                </label>
                <input
                  type="date"
                  required
                  value={newExpiryDate}
                  onChange={(e) => setNewExpiryDate(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Quantity ({quickRestockProduct.unit})
                </label>
                <input
                  type="number"
                  min="1"
                  required
                  value={newQuantity}
                  onChange={(e) => setNewQuantity(parseInt(e.target.value, 10) || 1)}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setQuickRestockProduct(null)}
                  className="px-3 py-1.5 text-xs text-slate-600 dark:text-slate-300 hover:bg-slate-100 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-1.5 text-xs font-semibold text-white bg-brand-600 hover:bg-brand-700 rounded-lg"
                >
                  {isSubmitting ? 'Saving...' : 'Add Stock'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
