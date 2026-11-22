import React, { useState } from 'react';
import { 
  AlertTriangle, 
  Clock, 
  Trash2, 
  Tag, 
  CornerUpLeft, 
  CheckCircle2, 
  Filter, 
  Search, 
  ShieldAlert, 
  Calendar,
  Layers,
  ArrowRight,
  Download
} from 'lucide-react';
import type { Product, ProductBatch } from '../../types';
import { useLanguage } from '../../i18n/LanguageContext';

interface ExpiryDashboardProps {
  products: Product[];
  batches: ProductBatch[];
  currency: string;
  onDisposeBatch: (productId: string, batchId: string, reason: string) => Promise<void>;
  onClearanceBatch: (productId: string, newSellingPrice: number) => Promise<void>;
}

export const ExpiryDashboard: React.FC<ExpiryDashboardProps> = ({
  products,
  batches,
  currency,
  onDisposeBatch,
  onClearanceBatch,
}) => {
  const { strings } = useLanguage();
  const [filterMode, setFilterMode] = useState<'all' | 'expired' | 'urgent' | 'warning' | 'safe'>('expired');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Clearance Modal State
  const [clearanceModalBatch, setClearanceModalBatch] = useState<{ batch: ProductBatch; product: Product } | null>(null);
  const [discountPercent, setDiscountPercent] = useState<number>(30);

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const getDaysRemaining = (expStr: string) => {
    const parts = expStr.split(/[-/]/).map(Number);
    const exp = parts.length === 3 && parts[0] > 1900 ? new Date(parts[0], parts[1] - 1, parts[2]) : new Date(expStr);
    exp.setHours(0, 0, 0, 0);
    return Math.ceil((exp.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  };

  const getProduct = (productId: string) => products.find((p) => p.id === productId);

  // Categorize batches
  const activeBatches = batches.filter((b) => b.quantity > 0 && b.status !== 'disposed');

  const expiredBatches = activeBatches.filter((b) => getDaysRemaining(b.expiryDate) <= 0);
  const urgentBatches = activeBatches.filter((b) => {
    const d = getDaysRemaining(b.expiryDate);
    return d > 0 && d <= 7;
  });
  const warningBatches = activeBatches.filter((b) => {
    const d = getDaysRemaining(b.expiryDate);
    return d > 7 && d <= 30;
  });
  const safeBatches = activeBatches.filter((b) => getDaysRemaining(b.expiryDate) > 30);


  // Financial impact calculation
  const expiredLossValue = expiredBatches.reduce((acc, b) => {
    const p = getProduct(b.productId);
    return acc + (p ? p.costPrice * b.quantity : 0);
  }, 0);

  const atRiskValue = urgentBatches.reduce((acc, b) => {
    const p = getProduct(b.productId);
    return acc + (p ? p.sellingPrice * b.quantity : 0);
  }, 0);

  // Filtered list
  const currentList = (() => {
    let list: ProductBatch[] = [];
    if (filterMode === 'all') list = activeBatches;
    else if (filterMode === 'expired') list = expiredBatches;
    else if (filterMode === 'urgent') list = urgentBatches;
    else if (filterMode === 'warning') list = warningBatches;
    else if (filterMode === 'safe') list = safeBatches;


    return list
      .filter((b) => {
        const p = getProduct(b.productId);
        if (!p) return false;
        return (
          p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          p.brand.toLowerCase().includes(searchQuery.toLowerCase()) ||
          b.batchNumber.toLowerCase().includes(searchQuery.toLowerCase())
        );
      })
      .sort((a, b) => new Date(a.expiryDate).getTime() - new Date(b.expiryDate).getTime());
  })();

  const handleApplyClearance = async () => {
    if (!clearanceModalBatch) return;
    const { product } = clearanceModalBatch;
    const newPrice = Math.max(1, Math.round(product.sellingPrice * (1 - discountPercent / 100)));
    await onClearanceBatch(product.id, newPrice);
    setClearanceModalBatch(null);
  };

  const handleExportCsv = () => {
    const headers = ['Product', 'Brand', 'Category', 'Batch', 'Expiry Date', 'Days Left', 'Quantity', 'Status'];
    const rows = currentList.map((b) => {
      const p = getProduct(b.productId);
      const d = getDaysRemaining(b.expiryDate);
      return [
        `"${p?.name || ''}"`,
        `"${p?.brand || ''}"`,
        `"${p?.category || ''}"`,
        `"${b.batchNumber}"`,
        `"${b.expiryDate}"`,
        d,
        b.quantity,
        d === 0 ? 'Expires Today' : d < 0 ? 'Expired' : d <= 7 ? 'Urgent' : d <= 30 ? 'Upcoming' : 'Fresh',
      ].join(',');
    });
    const csvContent = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `retails-gm-expiry-report-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* Title */}
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">{strings.expiry.title}</h1>
        <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
          {strings.expiry.subtitle}
        </p>
      </div>

      {/* Critical Alert Banner if Expired items exist */}
      {expiredBatches.length > 0 && (
        <div className="p-4 bg-red-50 dark:bg-red-950/40 border-l-4 border-red-500 rounded-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-sm">
          <div className="flex items-start gap-3">
            <ShieldAlert className="w-6 h-6 text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
            <div>
              <h3 className="text-sm font-bold text-red-800 dark:text-red-200">
                Action Required: {expiredBatches.length} Expired Product Batches Detected!
              </h3>
              <p className="text-xs text-red-600 dark:text-red-300 mt-0.5">
                {strings.expiry.criticalAlertDesc}
              </p>
            </div>
          </div>
          <button onClick={() => setFilterMode('expired')} className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-xs font-semibold rounded-lg transition-colors shrink-0 shadow-sm">{strings.expiry.btnReviewExpired}</button>
        </div>
      )}

      {/* Expiry KPI Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Expired Card */}
        <div
          onClick={() => setFilterMode('expired')}
          className={`p-3.5 rounded-lg border transition-all cursor-pointer card-3d-hover ${
            filterMode === 'expired'
              ? 'bg-red-50 dark:bg-red-950/40 border-red-500'
              : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:border-red-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-red-700 dark:text-red-400">{strings.expiry.cardExpired}</span>
            <span className="w-2 h-2 rounded-full bg-red-600 animate-pulse" />
          </div>
          <div className="text-xl sm:text-2xl font-extrabold text-red-700 dark:text-red-300 mt-1.5">
            {expiredBatches.length} <span className="text-xs font-normal text-slate-500">batches</span>
          </div>
          <div className="text-xs text-red-600 dark:text-red-400 mt-1">{strings.expiry.cardExpiredSub.replace('{currency}', currency).replace('{val}', expiredLossValue.toFixed(0))}</div>
        </div>

        {/* Urgent Card (<7 Days) */}
        <div
          onClick={() => setFilterMode('urgent')}
          className={`p-3.5 rounded-lg border transition-all cursor-pointer card-3d-hover ${
            filterMode === 'urgent'
              ? 'bg-orange-50 dark:bg-orange-950/40 border-orange-500'
              : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:border-orange-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-orange-700 dark:text-orange-400">{strings.expiry.cardUrgent}</span>
            <AlertTriangle className="w-4 h-4 text-orange-500" />
          </div>
          <div className="text-xl sm:text-2xl font-extrabold text-orange-600 dark:text-orange-400 mt-1.5">
            {urgentBatches.length} <span className="text-xs font-normal text-slate-500">batches</span>
          </div>
          <div className="text-xs text-orange-600 dark:text-orange-400 mt-1">{strings.expiry.cardUrgentSub.replace('{currency}', currency).replace('{val}', atRiskValue.toFixed(0))}</div>
        </div>

        {/* Warning Card (<30 Days) */}
        <div
          onClick={() => setFilterMode('warning')}
          className={`p-3.5 rounded-lg border transition-all cursor-pointer card-3d-hover ${
            filterMode === 'warning'
              ? 'bg-amber-50 dark:bg-amber-950/40 border-amber-500'
              : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:border-amber-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-amber-700 dark:text-amber-400">{strings.expiry.cardWarning}</span>
            <Clock className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-xl sm:text-2xl font-extrabold text-amber-600 dark:text-amber-400 mt-1.5">
            {warningBatches.length} <span className="text-xs font-normal text-slate-500">batches</span>
          </div>
          <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">{strings.expiry.cardWarningSub}</div>
        </div>

        {/* Safe Stock */}
        <div
          onClick={() => setFilterMode('safe')}
          className={`p-3.5 rounded-lg border transition-all cursor-pointer card-3d-hover ${
            filterMode === 'safe'
              ? 'bg-emerald-50 dark:bg-emerald-950/40 border-brand-600'
              : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:border-brand-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">{strings.expiry.cardSafe}</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-xl sm:text-2xl font-extrabold text-emerald-600 dark:text-emerald-400 mt-1.5">
            {safeBatches.length} <span className="text-xs font-normal text-slate-500">batches</span>
          </div>
          <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">{strings.expiry.cardSafeSub}</div>
        </div>
      </div>

      {/* Filter Tabs & Search */}
      <div className="bg-white dark:bg-slate-800 p-3.5 rounded-lg border border-slate-200 dark:border-slate-700 shadow-sm space-y-2.5 card-3d">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
          
          {/* Status Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto pb-1 scrollbar-none text-xs">
            <button
              onClick={() => setFilterMode('expired')}
              className={`px-3 py-1.5 rounded-xl font-semibold whitespace-nowrap transition-colors flex items-center gap-1.5 ${
                filterMode === 'expired'
                  ? 'bg-red-600 text-white shadow-sm'
                  : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
              }`}
            >
              <span>{strings.expiry.filterExpired} ({expiredBatches.length})</span>
            </button>

            <button
              onClick={() => setFilterMode('urgent')}
              className={`px-3 py-1.5 rounded-xl font-semibold whitespace-nowrap transition-colors flex items-center gap-1.5 ${
                filterMode === 'urgent'
                  ? 'bg-orange-600 text-white shadow-sm'
                  : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
              }`}
            >
              <span>{strings.expiry.filterUrgent} ({urgentBatches.length})</span>
            </button>

            <button
              onClick={() => setFilterMode('warning')}
              className={`px-3 py-1.5 rounded-xl font-semibold whitespace-nowrap transition-colors flex items-center gap-1.5 ${
                filterMode === 'warning'
                  ? 'bg-amber-600 text-white shadow-sm'
                  : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
              }`}
            >
              <span>{strings.expiry.filterWarning} ({warningBatches.length})</span>
            </button>

            <button
              onClick={() => setFilterMode('safe')}
              className={`px-3 py-1.5 rounded-xl font-semibold whitespace-nowrap transition-colors flex items-center gap-1.5 ${
                filterMode === 'safe'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
              }`}
            >
              <span>{strings.expiry.filterSafe} ({safeBatches.length})</span>
            </button>

            <button
              onClick={() => setFilterMode('all')}
              className={`px-3 py-1.5 rounded-xl font-semibold whitespace-nowrap transition-colors ${
                filterMode === 'all'
                  ? 'bg-slate-800 text-white dark:bg-slate-200 dark:text-slate-900'
                  : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
              }`}
            >
              {strings.expiry.filterAll} ({activeBatches.length})
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
                placeholder={strings.expiry.searchPlaceholder}
                className="w-full pl-9 pr-3 py-1.5 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>
            <button
              onClick={handleExportCsv}
              className="px-3 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-200 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 rounded-xl transition-colors flex items-center gap-1 shrink-0"
              title="Export Expiry Report to CSV"
            >
              <Download className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">{strings.expiry.exportCsv}</span>
            </button>
          </div>
        </div>

        
      </div>

      {/* Batch Table */}
      <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-slate-900/60 text-slate-700 dark:text-slate-300 font-semibold border-b border-slate-200 dark:border-slate-700">
              <tr>
                <th className="px-4 py-3">{strings.expiry.tableProduct}</th>
                <th className="px-4 py-3">{strings.expiry.tableBatch}</th>
                <th className="px-4 py-3">{strings.expiry.tableExpiry}</th>
                <th className="px-4 py-3">{strings.expiry.tableDays}</th>
                <th className="px-4 py-3">{strings.expiry.tableStock}</th>
                <th className="px-4 py-3">{strings.expiry.tableStatus}</th>
                <th className="px-4 py-3 text-right">{strings.expiry.tableActions}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
              {currentList.map((batch) => {
                const product = getProduct(batch.productId);
                if (!product) return null;

                const days = getDaysRemaining(batch.expiryDate);
                const isExpired = days <= 0;
                const isUrgent = days > 0 && days <= 7;
                const isUpcoming = days > 7 && days <= 30;

                return (
                  <tr
                    key={batch.id}
                    className={`transition-colors ${
                      isExpired
                        ? 'bg-red-50/40 dark:bg-red-950/20 hover:bg-red-50/60'
                        : isUrgent
                        ? 'bg-orange-50/30 dark:bg-orange-950/10 hover:bg-orange-50/50'
                        : 'hover:bg-slate-50 dark:hover:bg-slate-750'
                    }`}
                  >
                    {/* Product */}
                    <td className="px-4 py-3">
                      <div className="font-semibold text-slate-900 dark:text-slate-100">
                        {product.name}
                      </div>
                      <div className="text-[11px] text-slate-400">
                        {product.brand} • {product.category}
                      </div>
                    </td>

                    {/* Batch */}
                    <td className="px-4 py-3 font-mono font-medium text-slate-700 dark:text-slate-300">
                      {batch.batchNumber}
                    </td>

                    {/* Expiry Date */}
                    <td className="px-4 py-3 font-medium text-slate-800 dark:text-slate-200">
                      {batch.expiryDate}
                    </td>

                    {/* Days Remaining */}
                    <td className="px-4 py-3">
                      {days === 0 ? (
                        <span className="font-extrabold text-red-600 dark:text-red-400 animate-pulse">
                          Expires Today!
                        </span>
                      ) : isExpired ? (
                        <span className="font-bold text-red-600 dark:text-red-400">
                          Expired {Math.abs(days)} days ago
                        </span>
                      ) : isUrgent ? (
                        <span className="font-bold text-orange-600 dark:text-orange-400">
                          {days} days remaining
                        </span>
                      ) : isUpcoming ? (
                        <span className="font-semibold text-amber-600 dark:text-amber-400">
                          {days} days remaining
                        </span>
                      ) : (
                        <span className="text-slate-600 dark:text-slate-400">
                          {days} days remaining
                        </span>
                      )}
                    </td>

                    {/* Stock */}
                    <td className="px-4 py-3 font-bold text-slate-900 dark:text-slate-100">
                      {batch.quantity} {product.unit}
                    </td>

                    {/* Status Badge */}
                    <td className="px-4 py-3">
                      {days === 0 ? (
                        <span className="px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-red-100 text-red-800 dark:bg-red-950/80 dark:text-red-200 animate-pulse badge-3d">
                          EXPIRES TODAY
                        </span>
                      ) : isExpired ? (
                        <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-red-100 text-red-700 dark:bg-red-950/60 dark:text-red-300 badge-3d">
                          QUARANTINED
                        </span>
                      ) : isUrgent ? (
                        <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-orange-100 text-orange-700 dark:bg-orange-950/60 dark:text-orange-300 badge-3d">
                          URGENT
                        </span>
                      ) : isUpcoming ? (
                        <span className="px-2.5 py-1 rounded-full text-[10px] font-semibold bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 badge-3d">
                          UPCOMING
                        </span>
                      ) : (
                        <span className="px-2.5 py-1 rounded-full text-[10px] font-medium bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 badge-3d">
                          FRESH
                        </span>
                      )}
                    </td>

                    {/* Action Buttons */}
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {isExpired ? (
                          <>
                            <button
                              onClick={() => {
                                if (window.confirm(`Mark ${batch.quantity} units of ${product.name} (Batch ${batch.batchNumber}) as disposed?`)) {
                                  onDisposeBatch(product.id, batch.id, 'Disposed due to product expiry');
                                }
                              }}
                              className="px-2.5 py-1 text-[11px] font-semibold text-red-700 dark:text-red-300 bg-red-100 dark:bg-red-950/50 hover:bg-red-200 rounded-lg transition-colors flex items-center gap-1"
                              title="Dispose / Remove from inventory"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                              <span>{strings.expiry.disposeBtn}</span>
                            </button>

                            <button
                              onClick={() => {
                                if (window.confirm(`Return ${batch.quantity} units of ${product.name} to distributor?`)) {
                                  onDisposeBatch(product.id, batch.id, 'Returned to vendor/distributor');
                                }
                              }}
                              className="px-2.5 py-1 text-[11px] font-medium text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 rounded-lg transition-colors flex items-center gap-1"
                              title="Return to vendor"
                            >
                              <CornerUpLeft className="w-3.5 h-3.5" />
                              <span>Return (Wapas)</span>
                            </button>
                          </>
                        ) : isUrgent ? (
                          <>
                            <button
                              onClick={() => setClearanceModalBatch({ batch, product })}
                              className="px-2.5 py-1 text-[11px] font-semibold text-orange-700 dark:text-orange-300 bg-orange-100 dark:bg-orange-950/60 hover:bg-orange-200 rounded-lg transition-colors flex items-center gap-1"
                            >
                              <Tag className="w-3.5 h-3.5" />
                              <span>{strings.expiry.clearanceBtn}</span>
                            </button>
                          </>
                        ) : (
                          <span className="text-[11px] text-slate-400 font-medium">{strings.expiry.safeOnShelf}</span>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}

              {currentList.length === 0 && (
                <tr>
                  <td colSpan={7} className="text-center py-8 text-slate-400">
                    No batches match the selected expiry filter.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Clearance Discount Modal */}
      {clearanceModalBatch && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60">
          <div className="bg-white dark:bg-slate-800 rounded-lg w-full max-w-md p-5 shadow-xl border border-slate-200 dark:border-slate-700 space-y-3">
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
              Apply Clearance Discount (FEFO)
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {strings.expiry.clearanceModalDesc} ({clearanceModalBatch.batch.expiryDate}).
            </p>

            <div className="p-3 bg-slate-50 dark:bg-slate-900/50 rounded-md space-y-1 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-500">Product:</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200">{clearanceModalBatch.product.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Current Selling Price:</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200">{currency}{clearanceModalBatch.product.sellingPrice}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Cost Price:</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200">{currency}{clearanceModalBatch.product.costPrice}</span>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                {strings.expiry.discountLabel}
              </label>
              <div className="grid grid-cols-4 gap-2 mb-3">
                {[15, 25, 35, 50].map((pct) => (
                  <button
                    key={pct}
                    type="button"
                    onClick={() => setDiscountPercent(pct)}
                    className={`py-2 text-xs font-bold rounded-lg border transition-colors ${
                      discountPercent === pct
                        ? 'bg-orange-600 text-white border-orange-600'
                        : 'bg-slate-50 dark:bg-slate-700 border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-200'
                    }`}
                  >
                    {pct}% Off
                  </button>
                ))}
              </div>

              <div className="p-3 bg-orange-50 dark:bg-orange-950/30 rounded-xl border border-orange-200 dark:border-orange-900/50 flex justify-between items-center text-xs">
                <span className="text-orange-800 dark:text-orange-300 font-medium">{strings.expiry.newPriceLabel}</span>
                <span className="text-lg font-bold text-orange-600 dark:text-orange-400">
                  {currency}
                  {Math.max(1, Math.round(clearanceModalBatch.product.sellingPrice * (1 - discountPercent / 100)))}
                </span>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setClearanceModalBatch(null)}
                className="px-4 py-2 text-xs text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleApplyClearance}
                className="px-4 py-2 text-xs font-semibold text-white bg-orange-600 hover:bg-orange-700 rounded-lg transition-colors"
              >
                {strings.expiry.applyClearanceBtn}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
