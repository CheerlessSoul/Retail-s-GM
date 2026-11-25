import React, { useState, useRef } from 'react';
import * as XLSX from 'xlsx';
import { 
  FileSpreadsheet, 
  Upload, 
  CheckCircle2, 
  AlertCircle, 
  X, 
  Download, 
  ArrowRight,
  RefreshCw,
  Package
} from 'lucide-react';
import type { Product } from '../../types';

interface ImportSheetModalProps {
  isOpen: boolean;
  onClose: () => void;
  currency: string;
  onImportComplete: (
    importedItems: Array<{
      product: Omit<Product, 'currentStock' | 'createdAt' | 'updatedAt'>;
      batch: {
        batchNumber: string;
        expiryDate: string;
        mfgDate?: string;
        quantity: number;
        notes?: string;
      };
    }>
  ) => Promise<void>;
}

interface ParsedRow {
  name: string;
  brand: string;
  category: string;
  barcode: string;
  unit: string;
  costPrice: number;
  sellingPrice: number;
  minStockThreshold: number;
  quantity: number;
  batchNumber: string;
  expiryDate: string;
  mfgDate?: string;
}

export const ImportSheetModal: React.FC<ImportSheetModalProps> = ({
  isOpen,
  onClose,
  currency,
  onImportComplete,
}) => {
  const [file, setFile] = useState<File | null>(null);
  const [parsedRows, setParsedRows] = useState<ParsedRow[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  // Format Date to YYYY-MM-DD
  const formatDateToISO = (val: any): string => {
    if (!val) {
      // Default to 6 months from now if missing
      const d = new Date();
      d.setMonth(d.getMonth() + 6);
      return d.toISOString().split('T')[0];
    }

    // If it's an Excel serial date number (e.g., 45123)
    if (typeof val === 'number') {
      const date = new Date(Math.round((val - 25569) * 86400 * 1000));
      return date.toISOString().split('T')[0];
    }

    const str = String(val).trim();
    // YYYY-MM-DD
    if (/^\d{4}[-/]\d{1,2}[-/]\d{1,2}$/.test(str)) {
      const parts = str.split(/[-/]/).map(Number);
      return `${parts[0]}-${String(parts[1]).padStart(2, '0')}-${String(parts[2]).padStart(2, '0')}`;
    }
    // DD-MM-YYYY or DD/MM/YYYY
    if (/^\d{1,2}[-/]\d{1,2}[-/]\d{4}$/.test(str)) {
      const parts = str.split(/[-/]/).map(Number);
      return `${parts[2]}-${String(parts[1]).padStart(2, '0')}-${String(parts[0]).padStart(2, '0')}`;
    }
    // MM/YYYY
    if (/^\d{1,2}[-/]\d{4}$/.test(str)) {
      const parts = str.split(/[-/]/).map(Number);
      return `${parts[1]}-${String(parts[0]).padStart(2, '0')}-28`;
    }

    const parsed = new Date(str);
    if (!isNaN(parsed.getTime())) {
      return parsed.toISOString().split('T')[0];
    }

    // Fallback: 6 months
    const d = new Date();
    d.setMonth(d.getMonth() + 6);
    return d.toISOString().split('T')[0];
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

      // Fuzzy column name matcher
      const findField = (row: any, patterns: string[]): any => {
        const keys = Object.keys(row);
        for (const p of patterns) {
          const matchedKey = keys.find((k) => k.toLowerCase().replace(/[^a-z0-9]/g, '').includes(p.toLowerCase().replace(/[^a-z0-9]/g, '')));
          if (matchedKey && row[matchedKey] !== '') {
            return row[matchedKey];
          }
        }
        return '';
      };

      const extracted: ParsedRow[] = [];

      jsonData.forEach((row, idx) => {
        const name = String(findField(row, ['productname', 'itemname', 'name', 'item', 'product', 'description', 'saman'])).trim();
        if (!name) return; // skip empty rows without item name

        // Skip metadata, title banner, and summary rows from spreadsheets
        const lowerName = name.toLowerCase();
        const isMetadataRow =
          lowerName.includes('master catalog') ||
          lowerName.includes('automated stock') ||
          lowerName.includes('margin analysis') ||
          lowerName.includes('sheet alerts') ||
          lowerName.startsWith('total ') ||
          lowerName === 'total skus' ||
          lowerName === 'total' ||
          lowerName === 'grand total' ||
          lowerName === 'subtotal' ||
          lowerName === 'sub total' ||
          lowerName === 'summary' ||
          lowerName.startsWith('note:') ||
          lowerName.startsWith('notes:') ||
          lowerName.startsWith('currency:');

        if (isMetadataRow) return;

        const brand = String(findField(row, ['brand', 'company', 'manufacturer', 'make'])).trim() || 'General';
        const category = String(findField(row, ['category', 'dept', 'type', 'group'])).trim() || 'General';
        const barcode = String(findField(row, ['barcode', 'code', 'upc', 'ean', 'sku'])).trim();
        const unit = String(findField(row, ['unit', 'uom', 'pack', 'unitofmeasure'])).trim() || 'pack';

        const rawCost = Number(findField(row, ['costprice', 'purchaseprice', 'buyprice', 'cost', 'cp', 'khareed'])) || 0;
        const rawPrice = Number(findField(row, ['sellingprice', 'saleprice', 'mrp', 'price', 'rate', 'sp', 'bikri'])) || 0;

        const sellingPrice = rawPrice > 0 ? rawPrice : rawCost > 0 ? Math.round(rawCost * 1.2) : 50;
        const costPrice = rawCost > 0 ? rawCost : Math.round(sellingPrice * 0.8);

        const rawQty = Number(findField(row, ['quantity', 'qty', 'stock', 'units', 'currentstock', 'mal'])) || 10;
        const quantity = Math.max(1, rawQty);

        const minStockThreshold = Number(findField(row, ['minstock', 'threshold', 'reorder', 'minlevel'])) || 5;
        const batchNumber = String(findField(row, ['batchnumber', 'batchno', 'batch', 'lot'])).trim() || `B-${String(idx + 1).padStart(2, '0')}`;

        const rawExpiry = findField(row, ['expirydate', 'expiry', 'expdate', 'exp', 'bestbefore', 'useby']);
        const expiryDate = formatDateToISO(rawExpiry);

        const rawMfg = findField(row, ['mfgdate', 'mfg', 'pkddate', 'pkd', 'manufactured']);
        const mfgDate = rawMfg ? formatDateToISO(rawMfg) : undefined;

        extracted.push({
          name,
          brand,
          category,
          barcode,
          unit,
          costPrice,
          sellingPrice,
          minStockThreshold,
          quantity,
          batchNumber,
          expiryDate,
          mfgDate,
        });
      });

      if (extracted.length === 0) {
        setErrorMsg('Could not detect product names in the sheet. Ensure at least one column is named "Product Name" or "Item".');
      } else {
        setParsedRows(extracted);
      }
    } catch (err: any) {
      setErrorMsg(`Failed to parse file: ${err.message || 'Invalid Excel/CSV format'}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDownloadTemplate = () => {
    const templateData = [
      {
        'Product Name': 'Tata Salt Vacuum Evaporated 1kg',
        'Brand': 'Tata',
        'Category': 'Grocery',
        'Barcode': '8901030383701',
        'Unit': 'pack',
        'Cost Price': 22,
        'Selling Price': 28,
        'Stock Quantity': 30,
        'Batch Number': 'TS-2026',
        'Expiry Date (YYYY-MM-DD)': '2026-12-31',
        'Min Stock Alert': 10,
      },
      {
        'Product Name': 'Amul Taaza Toned Milk 1L',
        'Brand': 'Amul',
        'Category': 'Dairy',
        'Barcode': '8901262010052',
        'Unit': 'pack',
        'Cost Price': 50,
        'Selling Price': 56,
        'Stock Quantity': 15,
        'Batch Number': 'AML-08',
        'Expiry Date (YYYY-MM-DD)': '2026-11-28',
        'Min Stock Alert': 5,
      },
      {
        'Product Name': 'Dolo 650mg Paracetamol 15 Tab',
        'Brand': 'Micro Labs',
        'Category': 'Medicines',
        'Barcode': '8901148212034',
        'Unit': 'strip',
        'Cost Price': 24,
        'Selling Price': 34,
        'Stock Quantity': 25,
        'Batch Number': 'DL-552',
        'Expiry Date (YYYY-MM-DD)': '2027-06-30',
        'Min Stock Alert': 10,
      },
      {
        'Product Name': 'Aashirvaad Shudh Chakki Atta 5kg',
        'Brand': 'ITC',
        'Category': 'Grocery',
        'Barcode': '8901030383702',
        'Unit': 'bag',
        'Cost Price': 210,
        'Selling Price': 245,
        'Stock Quantity': 12,
        'Batch Number': 'ATT-102',
        'Expiry Date (YYYY-MM-DD)': '2026-10-15',
        'Min Stock Alert': 4,
      },
    ];

    const worksheet = XLSX.utils.json_to_sheet(templateData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Sample Products');
    XLSX.writeFile(workbook, 'retails_gm_products_sample_template.xlsx');
  };

  const handleSaveToStore = async () => {
    if (parsedRows.length === 0) return;
    setIsSaving(true);
    try {
      const itemsToImport = parsedRows.map((r, index) => {
        const prodId = `prod_imp_${Date.now()}_${index}`;
        return {
          product: {
            id: prodId,
            name: r.name,
            brand: r.brand,
            category: r.category,
            barcode: r.barcode || `${Date.now()}${index}`.slice(-12),
            unit: r.unit,
            costPrice: r.costPrice,
            sellingPrice: r.sellingPrice,
            minStockThreshold: r.minStockThreshold,
          },
          batch: {
            batchNumber: r.batchNumber || `B-${index + 1}`,
            expiryDate: r.expiryDate,
            mfgDate: r.mfgDate,
            quantity: r.quantity,
            notes: 'Imported from Excel/CSV spreadsheet',
          },
        };
      });

      await onImportComplete(itemsToImport);
      onClose();
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
      <div className="bg-white dark:bg-slate-800 w-full max-w-4xl rounded-xl border border-slate-200 dark:border-slate-700 shadow-2xl flex flex-col max-h-[92vh] overflow-hidden">
        
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between bg-slate-50 dark:bg-slate-900/50">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-lg bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 flex items-center justify-center">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
                Import Products from Excel or Google Sheets (CSV)
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Upload your product spreadsheet. Retail's GM automatically reads names, prices, stock & expiry dates.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 flex-1 overflow-y-auto space-y-4 text-xs">
          
          {/* Upload Dropzone */}
          {parsedRows.length === 0 ? (
            <div className="space-y-4">
              <div
                onClick={() => fileInputRef.current?.click()}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault();
                  if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                    handleFileUpload(e.dataTransfer.files[0]);
                  }
                }}
                className="border-2 border-dashed border-brand-300 dark:border-brand-700/80 bg-brand-50/50 dark:bg-brand-950/20 hover:bg-brand-50 dark:hover:bg-brand-950/40 rounded-xl p-8 text-center cursor-pointer transition-colors flex flex-col items-center justify-center gap-3"
              >
                <div className="w-12 h-12 rounded-full bg-brand-100 dark:bg-brand-900/60 text-brand-600 dark:text-brand-300 flex items-center justify-center">
                  <Upload className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100">
                    Click to browse or drag & drop your product file
                  </h3>
                  <p className="text-slate-500 dark:text-slate-400 text-xs mt-1">
                    Supports Microsoft Excel (<span className="font-semibold text-brand-600">.xlsx, .xls</span>) and Google Sheets export (<span className="font-semibold text-brand-600">.csv</span>)
                  </p>
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".xlsx,.xls,.csv"
                  className="hidden"
                  onChange={(e) => {
                    if (e.target.files && e.target.files[0]) {
                      handleFileUpload(e.target.files[0]);
                    }
                  }}
                />
              </div>

              {/* Template Download Help Box */}
              <div className="p-3.5 rounded-lg bg-slate-50 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-700 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div>
                  <div className="font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span>Don't have a format ready?</span>
                  </div>
                  <p className="text-slate-500 text-[11px] mt-0.5">
                    Download our ready-made Excel template with pre-filled sample grocery and medicine products.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleDownloadTemplate}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-200 hover:text-brand-600 transition-colors flex items-center gap-1.5 shrink-0 shadow-sm"
                >
                  <Download className="w-3.5 h-3.5 text-brand-600" />
                  <span>Download Sample Excel</span>
                </button>
              </div>
            </div>
          ) : (
            /* Parsed Products Preview Screen */
            <div className="space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/60 rounded-lg">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                  <div>
                    <h4 className="font-bold text-xs text-emerald-900 dark:text-emerald-200">
                      Successfully read {parsedRows.length} products from {file?.name}
                    </h4>
                    <p className="text-[11px] text-emerald-700 dark:text-emerald-300">
                      Check the preview below and click 'Import Products' to add all items to your store inventory.
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setParsedRows([]);
                    setFile(null);
                  }}
                  className="px-2.5 py-1 text-xs font-medium bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-300 dark:border-slate-600 rounded-md hover:bg-slate-100 flex items-center gap-1 self-start sm:self-auto"
                >
                  <RefreshCw className="w-3 h-3" />
                  <span>Choose Another File</span>
                </button>
              </div>

              {/* Data Preview Table */}
              <div className="border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden max-h-72 overflow-y-auto">
                <table className="w-full text-left text-[11px]">
                  <thead className="bg-slate-100 dark:bg-slate-700/60 text-slate-700 dark:text-slate-300 font-semibold sticky top-0 border-b border-slate-200 dark:border-slate-600">
                    <tr>
                      <th className="px-3 py-2">#</th>
                      <th className="px-3 py-2">Product Name</th>
                      <th className="px-3 py-2">Brand</th>
                      <th className="px-3 py-2">Category</th>
                      <th className="px-3 py-2">Barcode</th>
                      <th className="px-3 py-2">Stock</th>
                      <th className="px-3 py-2">Cost Price</th>
                      <th className="px-3 py-2">Selling Price</th>
                      <th className="px-3 py-2">Expiry Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                    {parsedRows.map((r, i) => (
                      <tr key={i} className="hover:bg-slate-50 dark:hover:bg-slate-750">
                        <td className="px-3 py-2 text-slate-400 font-mono">{i + 1}</td>
                        <td className="px-3 py-2 font-semibold text-slate-900 dark:text-slate-100">{r.name}</td>
                        <td className="px-3 py-2 text-slate-600 dark:text-slate-400">{r.brand}</td>
                        <td className="px-3 py-2 text-slate-600 dark:text-slate-400">{r.category}</td>
                        <td className="px-3 py-2 font-mono text-slate-500">{r.barcode || '-'}</td>
                        <td className="px-3 py-2 font-bold text-slate-800 dark:text-slate-200">{r.quantity} {r.unit}</td>
                        <td className="px-3 py-2 text-slate-600 dark:text-slate-400">{currency}{r.costPrice}</td>
                        <td className="px-3 py-2 font-bold text-brand-600 dark:text-brand-400">{currency}{r.sellingPrice}</td>
                        <td className="px-3 py-2 text-slate-700 dark:text-slate-300 font-medium">{r.expiryDate}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Loading Indicator */}
          {isProcessing && (
            <div className="py-6 flex flex-col items-center justify-center text-slate-600 dark:text-slate-300 gap-2">
              <RefreshCw className="w-6 h-6 animate-spin text-brand-600" />
              <p className="text-xs font-semibold">Reading spreadsheet columns & formatting dates...</p>
            </div>
          )}

          {/* Error Banner */}
          {errorMsg && (
            <div className="p-3 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/60 rounded-lg flex items-center gap-2 text-red-700 dark:text-red-300 text-xs">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-5 py-3 border-t border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 flex items-center justify-between">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-slate-800"
          >
            Cancel
          </button>

          {parsedRows.length > 0 && (
            <button
              type="button"
              disabled={isSaving}
              onClick={handleSaveToStore}
              className="px-5 py-2 rounded-lg text-xs font-bold text-white bg-brand-600 hover:bg-brand-700 disabled:opacity-50 transition-all flex items-center gap-1.5 btn-3d-brand shadow-md"
            >
              {isSaving ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Adding {parsedRows.length} Products...</span>
                </>
              ) : (
                <>
                  <Package className="w-4 h-4" />
                  <span>Import All {parsedRows.length} Products to Store</span>
                </>
              )}
            </button>
          )}
        </div>

      </div>
    </div>
  );
};
