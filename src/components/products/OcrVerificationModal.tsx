import React, { useState } from 'react';
import { Check, X, FileText, AlertCircle, Calendar, Hash, Tag, IndianRupee, Layers } from 'lucide-react';
import type { OcrExtractedData } from '../../types';

interface OcrVerificationModalProps {
  isOpen: boolean;
  onClose: () => void;
  extractedData: OcrExtractedData;
  imagePreviewUrl: string | null;
  currency: string;
  onSave: (productData: {
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
  }) => Promise<void>;
}

export const OcrVerificationModal: React.FC<OcrVerificationModalProps> = ({
  isOpen,
  onClose,
  extractedData,
  imagePreviewUrl,
  currency,
  onSave,
}) => {
  const [name, setName] = useState(extractedData.productName || '');
  const [brand, setBrand] = useState(extractedData.brand || '');
  const [category, setCategory] = useState('Grocery');
  const [barcode, setBarcode] = useState('');
  const [unit, setUnit] = useState('pack');
  const [costPrice, setCostPrice] = useState<number>(
    extractedData.mrp ? Math.round(extractedData.mrp * 0.8) : 50
  );
  const [sellingPrice, setSellingPrice] = useState<number>(extractedData.mrp || 65);
  const [minStockThreshold, setMinStockThreshold] = useState<number>(5);
  const [batchNumber, setBatchNumber] = useState(extractedData.batchNumber || 'B-01');
  const [expiryDate, setExpiryDate] = useState(extractedData.expiryDate || '');
  const [mfgDate, setMfgDate] = useState(extractedData.mfgDate || '');
  const [quantity, setQuantity] = useState<number>(10);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Please provide a product name.');
      return;
    }
    if (!expiryDate) {
      setError('Please provide or verify the product expiry date.');
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);
      await onSave({
        name: name.trim(),
        brand: brand.trim(),
        category,
        barcode: barcode.trim(),
        unit,
        costPrice: Number(costPrice) || 0,
        sellingPrice: Number(sellingPrice) || 0,
        minStockThreshold: Number(minStockThreshold) || 5,
        batchNumber: batchNumber.trim(),
        expiryDate,
        mfgDate: mfgDate || undefined,
        quantity: Number(quantity) || 1,
      });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save product');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-900/60 overflow-y-auto">
      <div className="bg-white dark:bg-slate-800 rounded-lg w-full max-w-4xl shadow-xl border border-slate-200 dark:border-slate-700 overflow-hidden my-auto max-h-[92vh] flex flex-col">
        
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80">
          <div className="flex items-center space-x-2">
            <span className="p-1.5 bg-brand-600 text-white rounded-md">
              <FileText className="w-4 h-4" />
            </span>
            <div>
              <h2 className="text-sm sm:text-base font-bold text-slate-900 dark:text-slate-100">
                Verify Scanned Label Details
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Review detected fields against the packaging photo and correct any details before saving.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {error && (
          <div className="mx-5 mt-3 p-2.5 bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-800 rounded-md flex items-center gap-2 text-xs text-red-700 dark:text-red-300">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Content Body: Two columns on medium/large screens */}
        <div className="p-5 overflow-y-auto flex-1 grid grid-cols-1 md:grid-cols-12 gap-5">
          
          {/* Left Column: Image Preview & Raw Extracted Text */}
          <div className="md:col-span-5 flex flex-col space-y-3">
            <div className="bg-slate-50 dark:bg-slate-900/60 p-3 rounded-md border border-slate-200 dark:border-slate-700">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 block mb-2">
                Original Label Image
              </span>
              {imagePreviewUrl ? (
                <div className="relative aspect-square max-h-56 sm:max-h-64 rounded-lg overflow-hidden bg-black flex items-center justify-center">
                  <img
                    src={imagePreviewUrl}
                    alt="Product Label"
                    className="w-full h-full object-contain"
                  />
                </div>
              ) : (
                <div className="h-44 rounded-lg bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-xs text-slate-500">
                  No image preview available
                </div>
              )}
            </div>

            {/* OCR Confidence & Raw Text Snippet */}
            <div className="p-3 bg-slate-50 dark:bg-slate-900/40 rounded-xl border border-slate-200 dark:border-slate-700">
              <div className="flex justify-between items-center mb-1">
                <span className="text-xs font-medium text-slate-600 dark:text-slate-400">
                  OCR Text Detection
                </span>
                <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-brand-100 dark:bg-brand-900/50 text-brand-800 dark:text-brand-300">
                  {Math.round(extractedData.confidence)}% Confidence
                </span>
              </div>
              <div className="max-h-24 overflow-y-auto font-mono text-[11px] text-slate-600 dark:text-slate-400 bg-white dark:bg-slate-800 p-2 rounded border border-slate-200 dark:border-slate-700 select-all">
                {extractedData.rawText || 'No raw text available'}
              </div>
            </div>
          </div>

          {/* Right Column: Editable Product Information */}
          <form onSubmit={handleSubmit} className="md:col-span-7 space-y-4 flex flex-col justify-between">
            <div className="space-y-4">
              {/* Product Name */}
              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Product Name *
                </label>
                <div className="relative">
                  <Tag className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Tata Salt 1kg"
                    className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-brand-500"
                  />
                </div>
              </div>

              {/* Brand & Category */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Brand
                  </label>
                  <input
                    type="text"
                    value={brand}
                    onChange={(e) => setBrand(e.target.value)}
                    placeholder="e.g. Tata, Amul, ITC"
                    className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-brand-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Category
                  </label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-brand-500"
                  >
                    <option value="Grocery">Grocery</option>
                    <option value="Dairy">Dairy</option>
                    <option value="Medicines">Medicines</option>
                    <option value="Snacks">Snacks</option>
                    <option value="Beverages">Beverages</option>
                    <option value="Personal Care">Personal Care</option>
                    <option value="General Store">General Store</option>
                  </select>
                </div>
              </div>

              {/* Expiry Date & Manufacturing Date */}
              <div className="grid grid-cols-2 gap-3 p-3 bg-brand-50/50 dark:bg-brand-950/20 rounded-xl border border-brand-200 dark:border-brand-900">
                <div>
                  <label className="block text-xs font-semibold text-brand-900 dark:text-brand-300 mb-1">
                    Expiry Date *
                  </label>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-brand-600 dark:text-brand-400" />
                    <input
                      type="date"
                      required
                      value={expiryDate}
                      onChange={(e) => setExpiryDate(e.target.value)}
                      className="w-full pl-9 pr-2 py-1.5 text-sm rounded-lg border border-brand-300 dark:border-brand-700 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-brand-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                    MFG Date (Optional)
                  </label>
                  <input
                    type="date"
                    value={mfgDate}
                    onChange={(e) => setMfgDate(e.target.value)}
                    className="w-full px-3 py-1.5 text-sm rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-brand-500"
                  />
                </div>
              </div>

              {/* Batch No & Barcode */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Batch Number
                  </label>
                  <div className="relative">
                    <Hash className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                      type="text"
                      value={batchNumber}
                      onChange={(e) => setBatchNumber(e.target.value)}
                      placeholder="e.g. B-012"
                      className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-brand-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Barcode (Optional)
                  </label>
                  <input
                    type="text"
                    value={barcode}
                    onChange={(e) => setBarcode(e.target.value)}
                    placeholder="Scan or type barcode"
                    className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-brand-500"
                  />
                </div>
              </div>

              {/* Cost Price, Selling Price, Initial Qty */}
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Cost Price ({currency})
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.5"
                    value={costPrice}
                    onChange={(e) => setCostPrice(parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-brand-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Selling Price ({currency})
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.5"
                    value={sellingPrice}
                    onChange={(e) => setSellingPrice(parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-brand-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Initial Stock
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={quantity}
                    onChange={(e) => setQuantity(parseInt(e.target.value, 10) || 1)}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-brand-500"
                  />
                </div>
              </div>

              {/* Unit & Low Stock Threshold */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Unit
                  </label>
                  <select
                    value={unit}
                    onChange={(e) => setUnit(e.target.value)}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-brand-500"
                  >
                    <option value="pack">pack</option>
                    <option value="pcs">pcs</option>
                    <option value="bottle">bottle</option>
                    <option value="strip">strip</option>
                    <option value="kg">kg</option>
                    <option value="pouch">pouch</option>
                    <option value="box">box</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Low Stock Threshold
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={minStockThreshold}
                    onChange={(e) => setMinStockThreshold(parseInt(e.target.value, 10) || 5)}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-brand-500"
                  />
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="pt-4 border-t border-slate-200 dark:border-slate-700 flex justify-end gap-3 mt-4">
              <button
                type="button"
                onClick={onClose}
                disabled={isSubmitting}
                className="px-4 py-2 text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-5 py-2 text-sm font-medium text-white bg-brand-600 hover:bg-brand-700 disabled:opacity-50 rounded-lg transition-colors flex items-center gap-1.5 shadow-sm"
              >
                <Check className="w-4 h-4" />
                <span>{isSubmitting ? 'Saving...' : 'Confirm & Save Product'}</span>
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
