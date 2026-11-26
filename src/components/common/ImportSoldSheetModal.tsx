import React, { useState, useRef } from 'react';
import * as XLSX from 'xlsx';
import { 
  FileSpreadsheet, 
  Upload, 
  CheckCircle2, 
  AlertTriangle, 
  X, 
  Download, 
  ArrowRight,
  RefreshCw,
  ShoppingBag,
  TrendingUp,
  AlertCircle,
  Trash2
} from 'lucide-react';
import type { Product } from '../../types';
import { useLanguage } from '../../i18n/LanguageContext';
import { sound } from '../../services/soundService';

interface ImportSoldSheetModalProps {
  isOpen: boolean;
  onClose: () => void;
  products: Product[];
  currency: string;
  onImportComplete: (
    salesToRecord: Array<{
      productId: string;
      quantity: number;
      sellingPrice?: number;
      paymentMethod?: 'cash' | 'upi' | 'card' | 'credit';
      customerName?: string;
      timestamp?: string;
    }>
  ) => Promise<void>;
}

interface ParsedSoldRow {
  id: string;
  rawName: string;
  rawBarcode: string;
  rawQuantity: number;
  rawPrice?: number;
  rawDate?: string;
  rawPayment?: 'cash' | 'upi' | 'card' | 'credit';
  rawCustomer?: string;
  matchedProduct?: Product;
  matchStatus: 'matched' | 'unmatched';
  stockWarning?: string;
  lineRevenue: number;
  lineProfit: number;
}

export const ImportSoldSheetModal: React.FC<ImportSoldSheetModalProps> = ({
  isOpen,
  onClose,
  products,
  currency,
  onImportComplete,
}) => {
  const { strings } = useLanguage();
  const [file, setFile] = useState<File | null>(null);
  const [parsedRows, setParsedRows] = useState<ParsedSoldRow[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [filterMode, setFilterMode] = useState<'all' | 'ready' | 'warnings'>('all');
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  // Fuzzy column matcher
  const findField = (row: any, patterns: string[]): any => {
    const keys = Object.keys(row);
    for (const p of patterns) {
      const matchedKey = keys.find((k) =>
        k.toLowerCase().replace(/[^a-z0-9]/g, '').includes(p.toLowerCase().replace(/[^a-z0-9]/g, ''))
      );
      if (matchedKey && row[matchedKey] !== '') {
        return row[matchedKey];
      }
    }
    return '';
  };

  const handleFileUpload = async (uploadedFile: File) => {
    setFile(uploadedFile);
    setErrorMsg(null);
    setIsProcessing(true);

    try {
      const buffer = await uploadedFile.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: 'array' });
      const firstSheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[firstSheetName];
      const jsonData: any[] = XLSX.utils.sheet_to_json(worksheet, { defval: '' });

      if (!jsonData || jsonData.length === 0) {
        setErrorMsg('The selected spreadsheet has no data rows. Please check the file.');
        setIsProcessing(false);
        return;
      }

      const extracted: ParsedSoldRow[] = [];

      jsonData.forEach((row, idx) => {
        const rawName = String(
          findField(row, ['productname', 'itemname', 'name', 'item', 'product', 'description', 'saman'])
        ).trim();
        const rawBarcode = String(findField(row, ['barcode', 'code', 'upc', 'ean', 'sku'])).trim();

        if (!rawName && !rawBarcode) return; // skip blank rows

        // Skip obvious title/summary rows
        const lower = rawName.toLowerCase();
        if (
          lower.includes('master catalog') ||
          lower.includes('automated stock') ||
          lower.includes('margin analysis') ||
          lower.startsWith('total ') ||
          lower === 'total skus' ||
          lower === 'total' ||
          lower === 'grand total' ||
          lower === 'subtotal' ||
          lower.startsWith('note:')
        ) {
          return;
        }

        const rawQtyNum = Number(findField(row, ['quantity', 'qty', 'sold', 'units', 'count', 'bikamal', 'quantitysold']));
        const rawQuantity = !isNaN(rawQtyNum) && rawQtyNum > 0 ? rawQtyNum : 1;

        const rawPriceNum = Number(findField(row, ['sellingprice', 'saleprice', 'mrp', 'price', 'rate', 'sp', 'bikrirate']));
        const rawPrice = !isNaN(rawPriceNum) && rawPriceNum > 0 ? rawPriceNum : undefined;

        const rawCustomer = String(findField(row, ['customer', 'customername', 'phone', 'mobile', 'client', 'billno'])).trim();

        // Payment method detection
        const rawPayStr = String(findField(row, ['payment', 'mode', 'type', 'paymentmethod'])).toLowerCase();
        let rawPayment: 'cash' | 'upi' | 'card' | 'credit' = 'cash';
        if (rawPayStr.includes('upi') || rawPayStr.includes('gpay') || rawPayStr.includes('phonepe') || rawPayStr.includes('paytm') || rawPayStr.includes('online')) {
          rawPayment = 'upi';
        } else if (rawPayStr.includes('card') || rawPayStr.includes('debit') || rawPayStr.includes('credit card')) {
          rawPayment = 'card';
        } else if (rawPayStr.includes('credit') || rawPayStr.includes('udhar') || rawPayStr.includes('khata')) {
          rawPayment = 'credit';
        }

        // Match against existing store catalog
        let matched: Product | undefined;
        if (rawBarcode) {
          matched = products.find((p) => p.barcode && p.barcode.toLowerCase() === rawBarcode.toLowerCase());
        }
        if (!matched && rawName) {
          const cleanRaw = rawName.toLowerCase().replace(/[^a-z0-9]/g, '');
          matched = products.find((p) => {
            const cleanProd = p.name.toLowerCase().replace(/[^a-z0-9]/g, '');
            return cleanProd === cleanRaw || cleanProd.includes(cleanRaw) || cleanRaw.includes(cleanProd);
          });
        }

        let stockWarning: string | undefined;
        let lineRevenue = 0;
        let lineProfit = 0;

        if (matched) {
          const effectivePrice = rawPrice && rawPrice > 0 ? rawPrice : matched.sellingPrice;
          lineRevenue = rawQuantity * effectivePrice;
          lineProfit = (effectivePrice - matched.costPrice) * rawQuantity;

          if (matched.currentStock === 0) {
            stockWarning = 'Currently 0 units in stock (will create inventory deficit)';
          } else if (matched.currentStock < rawQuantity) {
            stockWarning = `Only ${matched.currentStock} in stock (selling ${rawQuantity})`;
          }
        }

        extracted.push({
          id: `sold_row_${idx}_${Date.now()}`,
          rawName: rawName || (matched ? matched.name : 'Unknown Product'),
          rawBarcode,
          rawQuantity,
          rawPrice,
          rawCustomer: rawCustomer || undefined,
          rawPayment,
          matchedProduct: matched,
          matchStatus: matched ? 'matched' : 'unmatched',
          stockWarning,
          lineRevenue,
          lineProfit,
        });
      });

      if (extracted.length === 0) {
        setErrorMsg('Could not detect any product sold rows. Ensure columns are named "Product Name" or "Barcode" and "Quantity".');
      } else {
        setParsedRows(extracted);
      }
    } catch (err: any) {
      setErrorMsg(`Failed to parse file: ${err.message || 'Invalid Excel or CSV format'}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDownloadTemplate = () => {
    const sampleRows = products.length > 0
      ? products.slice(0, 5).map((p, i) => ({
          'Barcode': p.barcode || `890100${i + 1}`,
          'Product Name': p.name,
          'Quantity Sold': 5 + i * 2,
          'Selling Price (Optional)': p.sellingPrice,
          'Payment Mode (Cash/UPI/Card/Credit)': i % 2 === 0 ? 'Cash' : 'UPI',
          'Customer Name (Optional)': i === 0 ? 'Ramesh Kumar' : 'Walk-in',
        }))
      : [
          {
            'Barcode': '8901030384729',
            'Product Name': 'Parle-G Gold 1kg',
            'Quantity Sold': 10,
            'Selling Price (Optional)': 80,
            'Payment Mode (Cash/UPI/Card/Credit)': 'Cash',
            'Customer Name (Optional)': 'Walk-in Customer',
          },
          {
            'Barcode': '8901499008855',
            'Product Name': 'Tata Salt 1kg',
            'Quantity Sold': 8,
            'Selling Price (Optional)': 28,
            'Payment Mode (Cash/UPI/Card/Credit)': 'UPI',
            'Customer Name (Optional)': 'Sita Devi',
          },
          {
            'Barcode': '8901725181222',
            'Product Name': 'Amul Butter 100g',
            'Quantity Sold': 15,
            'Selling Price (Optional)': 56,
            'Payment Mode (Cash/UPI/Card/Credit)': 'Cash',
            'Customer Name (Optional)': 'Rajesh Gupta',
          },
        ];

    const ws = XLSX.utils.json_to_sheet(sampleRows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Daily Sales Record');
    XLSX.writeFile(wb, `retails-gm-sold-products-template-${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const handleRemoveRow = (id: string) => {
    setParsedRows((prev) => prev.filter((r) => r.id !== id));
  };

  const handleQuantityChange = (id: string, newQty: number) => {
    if (newQty <= 0) return;
    setParsedRows((prev) =>
      prev.map((r) => {
        if (r.id !== id) return r;
        const matched = r.matchedProduct;
        const effectivePrice = r.rawPrice && r.rawPrice > 0 ? r.rawPrice : matched ? matched.sellingPrice : 0;
        const lineRevenue = newQty * effectivePrice;
        const lineProfit = matched ? (effectivePrice - matched.costPrice) * newQty : 0;
        let stockWarning = r.stockWarning;
        if (matched) {
          if (matched.currentStock === 0) {
            stockWarning = 'Currently 0 units in stock (will create inventory deficit)';
          } else if (matched.currentStock < newQty) {
            stockWarning = `Only ${matched.currentStock} in stock (selling ${newQty})`;
          } else {
            stockWarning = undefined;
          }
        }
        return {
          ...r,
          rawQuantity: newQty,
          lineRevenue,
          lineProfit,
          stockWarning,
        };
      })
    );
  };

  // Aggregated totals
  const totalRows = parsedRows.length;
  const matchedRows = parsedRows.filter((r) => r.matchStatus === 'matched');
  const totalUnitsSold = matchedRows.reduce((acc, r) => acc + r.rawQuantity, 0);
  const totalRevenue = matchedRows.reduce((acc, r) => acc + r.lineRevenue, 0);
  const totalProfit = matchedRows.reduce((acc, r) => acc + r.lineProfit, 0);
  const warningCount = parsedRows.filter((r) => r.matchStatus === 'unmatched' || r.stockWarning).length;

  const filteredDisplayRows = parsedRows.filter((r) => {
    if (filterMode === 'ready') return r.matchStatus === 'matched' && !r.stockWarning;
    if (filterMode === 'warnings') return r.matchStatus === 'unmatched' || Boolean(r.stockWarning);
    return true;
  });

  const handleConfirmRecord = async () => {
    if (matchedRows.length === 0) return;
    setIsSubmitting(true);
    try {
      const salesPayload = matchedRows.map((r) => ({
        productId: r.matchedProduct!.id,
        quantity: r.rawQuantity,
        sellingPrice: r.rawPrice && r.rawPrice > 0 ? r.rawPrice : r.matchedProduct!.sellingPrice,
        paymentMethod: r.rawPayment || 'cash',
        customerName: r.rawCustomer,
        timestamp: r.rawDate,
      }));

      await onImportComplete(salesPayload);
      sound.playSuccessChime();
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/70 backdrop-blur-sm animate-fade-in">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl max-w-4xl w-full max-h-[92vh] flex flex-col overflow-hidden">
        
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-bold shadow-sm">
              <ShoppingBag className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-slate-100">
                Drop / Import Sold Products Sheet
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Upload your daily Excel or CSV sales sheet to automatically record sold items, deplete stock, and calculate profits.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-5 flex-1">
          {/* File Upload Dropzone */}
          {parsedRows.length === 0 ? (
            <div className="space-y-4">
              <div
                onClick={() => fileInputRef.current?.click()}
                onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
                onDrop={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                    handleFileUpload(e.dataTransfer.files[0]);
                  }
                }}
                className="border-2 border-dashed border-emerald-300 dark:border-emerald-800 hover:border-emerald-500 bg-emerald-50/40 dark:bg-emerald-950/20 rounded-2xl p-8 sm:p-12 text-center cursor-pointer transition-all group"
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".xlsx, .xls, .csv"
                  className="hidden"
                  onChange={(e) => {
                    if (e.target.files && e.target.files[0]) {
                      handleFileUpload(e.target.files[0]);
                    }
                  }}
                />
                <div className="w-14 h-14 rounded-2xl bg-emerald-100 dark:bg-emerald-900/60 text-emerald-600 dark:text-emerald-300 mx-auto flex items-center justify-center mb-3 group-hover:scale-105 transition-transform">
                  <Upload className="w-7 h-7" />
                </div>
                <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-slate-100 mb-1">
                  Click or Drop your Sold Products Excel / CSV Sheet
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto">
                  Supports Excel (.xlsx, .xls) and CSV. Columns can be: Barcode, Product Name, Quantity Sold, Price, Payment Mode.
                </p>
                {isProcessing && (
                  <div className="mt-4 flex items-center justify-center gap-2 text-xs font-semibold text-emerald-600">
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Analyzing sales records & matching store products...</span>
                  </div>
                )}
              </div>

              {/* Download Template Bar */}
              <div className="flex flex-col sm:flex-row items-center justify-between p-3.5 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700 gap-3">
                <div className="flex items-center gap-2.5">
                  <FileSpreadsheet className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                  <div>
                    <span className="text-xs font-bold text-slate-800 dark:text-slate-200 block">
                      Don't have a format? Download our Ready-to-Use Excel Template
                    </span>
                    <span className="text-[11px] text-slate-500 dark:text-slate-400">
                      Pre-filled with your current store products for quick offline filling.
                    </span>
                  </div>
                </div>
                <button
                  onClick={handleDownloadTemplate}
                  className="px-3.5 py-1.5 text-xs font-semibold text-emerald-700 dark:text-emerald-300 bg-emerald-100/70 hover:bg-emerald-100 dark:bg-emerald-950/80 rounded-lg transition-colors flex items-center gap-1.5 whitespace-nowrap shrink-0 shadow-sm"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download Sample (.xlsx)</span>
                </button>
              </div>

              {errorMsg && (
                <div className="p-3 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 rounded-xl flex items-center gap-2 text-xs text-red-700 dark:text-red-300">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{errorMsg}</span>
                </div>
              )}
            </div>
          ) : (
            /* PREVIEW AND VALIDATION SCREEN */
            <div className="space-y-4">
              {/* Summary KPIs */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3 bg-slate-50 dark:bg-slate-800/80 rounded-xl border border-slate-200 dark:border-slate-700">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Total Items Sold</span>
                  <div className="text-lg font-black text-slate-900 dark:text-slate-100 mt-0.5">
                    {totalUnitsSold} <span className="text-xs font-normal text-slate-500">units</span>
                  </div>
                  <span className="text-[11px] text-emerald-600 font-semibold">{matchedRows.length} catalog items matched</span>
                </div>

                <div className="p-3 bg-slate-50 dark:bg-slate-800/80 rounded-xl border border-slate-200 dark:border-slate-700">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Total Sales Revenue</span>
                  <div className="text-lg font-black text-emerald-600 dark:text-emerald-400 mt-0.5">
                    {currency}{totalRevenue.toFixed(0)}
                  </div>
                  <span className="text-[11px] text-slate-500">Gross sales money</span>
                </div>

                <div className="p-3 bg-slate-50 dark:bg-slate-800/80 rounded-xl border border-slate-200 dark:border-slate-700">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Estimated Profit</span>
                  <div className="text-lg font-black text-brand-600 dark:text-brand-400 mt-0.5">
                    +{currency}{totalProfit.toFixed(0)}
                  </div>
                  <span className="text-[11px] text-slate-500">
                    {totalRevenue > 0 ? `${Math.round((totalProfit / totalRevenue) * 100)}% net margin` : '0% margin'}
                  </span>
                </div>

                <div className="p-3 bg-slate-50 dark:bg-slate-800/80 rounded-xl border border-slate-200 dark:border-slate-700">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Status & Warnings</span>
                  <div className="text-lg font-black mt-0.5 flex items-center gap-1">
                    {warningCount === 0 ? (
                      <span className="text-emerald-600 flex items-center gap-1 text-sm font-bold">
                        <CheckCircle2 className="w-4 h-4" /> 100% Ready
                      </span>
                    ) : (
                      <span className="text-amber-600 flex items-center gap-1 text-sm font-bold">
                        <AlertTriangle className="w-4 h-4" /> {warningCount} Notices
                      </span>
                    )}
                  </div>
                  <span className="text-[11px] text-slate-500">
                    {parsedRows.length - matchedRows.length} unmapped products
                  </span>
                </div>
              </div>

              {/* Filter Tabs and File Info */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800 pb-2">
                <div className="flex items-center gap-1.5 text-xs">
                  <button
                    onClick={() => setFilterMode('all')}
                    className={`px-3 py-1.5 rounded-lg font-semibold transition-colors ${
                      filterMode === 'all'
                        ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    All Items ({totalRows})
                  </button>
                  <button
                    onClick={() => setFilterMode('ready')}
                    className={`px-3 py-1.5 rounded-lg font-semibold transition-colors ${
                      filterMode === 'ready'
                        ? 'bg-emerald-600 text-white'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    Ready ({matchedRows.length - (warningCount > 0 ? parsedRows.filter(r => r.matchedProduct && r.stockWarning).length : 0)})
                  </button>
                  {warningCount > 0 && (
                    <button
                      onClick={() => setFilterMode('warnings')}
                      className={`px-3 py-1.5 rounded-lg font-semibold transition-colors ${
                        filterMode === 'warnings'
                          ? 'bg-amber-600 text-white'
                          : 'bg-slate-100 dark:bg-slate-800 text-amber-600 dark:text-amber-400'
                      }`}
                    >
                      Warnings ({warningCount})
                    </button>
                  )}
                </div>

                <button
                  onClick={() => { setParsedRows([]); setFile(null); }}
                  className="text-xs text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 underline self-end sm:self-auto"
                >
                  Upload different sheet
                </button>
              </div>

              {/* Items Table */}
              <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden max-h-80 overflow-y-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 dark:bg-slate-800/90 text-slate-700 dark:text-slate-300 font-bold sticky top-0 border-b border-slate-200 dark:border-slate-800 z-10">
                    <tr>
                      <th className="px-3 py-2.5">Status</th>
                      <th className="px-3 py-2.5">Product Name</th>
                      <th className="px-3 py-2.5">Barcode</th>
                      <th className="px-3 py-2.5 text-center">Qty Sold</th>
                      <th className="px-3 py-2.5 text-right">Selling Price</th>
                      <th className="px-3 py-2.5 text-right">Total Revenue</th>
                      <th className="px-3 py-2.5 text-right">Profit</th>
                      <th className="px-3 py-2.5 text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {filteredDisplayRows.map((row) => (
                      <tr
                        key={row.id}
                        className={`hover:bg-slate-50/70 dark:hover:bg-slate-800/50 transition-colors ${
                          row.matchStatus === 'unmatched'
                            ? 'bg-red-50/30 dark:bg-red-950/20'
                            : row.stockWarning
                            ? 'bg-amber-50/30 dark:bg-amber-950/20'
                            : ''
                        }`}
                      >
                        <td className="px-3 py-2.5 whitespace-nowrap">
                          {row.matchStatus === 'matched' ? (
                            row.stockWarning ? (
                              <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300">
                                <AlertTriangle className="w-3 h-3" /> Low Stock
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
                                <CheckCircle2 className="w-3 h-3" /> Matched
                              </span>
                            )
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-100 text-red-800 dark:bg-red-950/60 dark:text-red-300">
                              <AlertCircle className="w-3 h-3" /> Not Found
                            </span>
                          )}
                        </td>

                        <td className="px-3 py-2.5">
                          <div className="font-semibold text-slate-900 dark:text-slate-100">
                            {row.matchedProduct ? row.matchedProduct.name : row.rawName}
                          </div>
                          {row.stockWarning && (
                            <div className="text-[10px] text-amber-600 dark:text-amber-400 font-medium">
                              {row.stockWarning}
                            </div>
                          )}
                        </td>

                        <td className="px-3 py-2.5 font-mono text-[11px] text-slate-500">
                          {row.matchedProduct?.barcode || row.rawBarcode || '—'}
                        </td>

                        <td className="px-3 py-2.5 text-center">
                          <input
                            type="number"
                            min="1"
                            value={row.rawQuantity}
                            onChange={(e) => handleQuantityChange(row.id, Number(e.target.value))}
                            className="w-16 px-1.5 py-0.5 text-center font-bold text-xs rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700"
                          />
                        </td>

                        <td className="px-3 py-2.5 text-right font-medium text-slate-800 dark:text-slate-200">
                          {currency}{row.rawPrice || (row.matchedProduct ? row.matchedProduct.sellingPrice : 0)}
                        </td>

                        <td className="px-3 py-2.5 text-right font-bold text-emerald-600 dark:text-emerald-400">
                          {currency}{row.lineRevenue.toFixed(0)}
                        </td>

                        <td className="px-3 py-2.5 text-right font-bold text-brand-600 dark:text-brand-400">
                          +{currency}{row.lineProfit.toFixed(0)}
                        </td>

                        <td className="px-3 py-2.5 text-center">
                          <button
                            onClick={() => handleRemoveRow(row.id)}
                            className="p-1 text-slate-400 hover:text-red-600 rounded transition-colors"
                            title="Remove from import"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3.5 border-t border-slate-100 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40 flex items-center justify-between gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl transition-colors"
          >
            Cancel
          </button>

          {parsedRows.length > 0 && (
            <button
              onClick={handleConfirmRecord}
              disabled={isSubmitting || matchedRows.length === 0}
              className="px-5 py-2.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl transition-all shadow-md flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed btn-3d-brand"
            >
              {isSubmitting ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Recording Sales & Updating Stock...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Confirm & Record Sales ({matchedRows.length} Products, {currency}{totalRevenue.toFixed(0)})</span>
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
