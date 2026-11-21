import React, { useState } from 'react';
import { X, Plus, Barcode, Camera, Upload, Sparkles, AlertCircle, RefreshCw } from 'lucide-react';
import { extractProductDetailsFromImage } from '../../services/ocrService';
import { BarcodeScannerModal } from '../common/BarcodeScannerModal';
import { OcrVerificationModal } from './OcrVerificationModal';
import type { OcrExtractedData } from '../../types';

interface AddProductModalProps {
  isOpen: boolean;
  onClose: () => void;
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

export const AddProductModal: React.FC<AddProductModalProps> = ({
  isOpen,
  onClose,
  currency,
  onSave,
}) => {
  const [activeMode, setActiveMode] = useState<'manual' | 'ocr'>('manual');
  
  // Manual form state
  const [name, setName] = useState('');
  const [brand, setBrand] = useState('');
  const [category, setCategory] = useState('Grocery');
  const [barcode, setBarcode] = useState('');
  const [unit, setUnit] = useState('pack');
  const [costPrice, setCostPrice] = useState<string>('');
  const [sellingPrice, setSellingPrice] = useState<string>('');
  const [minStockThreshold, setMinStockThreshold] = useState<number>(5);
  const [batchNumber, setBatchNumber] = useState('B-01');
  const [expiryDate, setExpiryDate] = useState('');
  const [mfgDate, setMfgDate] = useState('');
  const [quantity, setQuantity] = useState<number>(10);
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Barcode Scanner Modal State
  const [showBarcodeScanner, setShowBarcodeScanner] = useState(false);

  // OCR state
  const [isProcessingOcr, setIsProcessingOcr] = useState(false);
  const [ocrStatusText, setOcrStatusText] = useState('');
  const [ocrProgress, setOcrProgress] = useState(0);
  const [extractedOcrData, setExtractedOcrData] = useState<OcrExtractedData | null>(null);
  const [ocrImagePreview, setOcrImagePreview] = useState<string | null>(null);
  const [showOcrVerification, setShowOcrVerification] = useState(false);

  if (!isOpen) return null;

  const handleManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Product name is required.');
      return;
    }
    if (!expiryDate) {
      setError('Expiry date is required to protect customers from expired goods.');
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
        costPrice: parseFloat(costPrice) || 0,
        sellingPrice: parseFloat(sellingPrice) || 0,
        minStockThreshold: Number(minStockThreshold) || 5,
        batchNumber: batchNumber.trim() || 'B-01',
        expiryDate,
        mfgDate: mfgDate || undefined,
        quantity: Number(quantity) || 1,
      });
      resetForm();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save product');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsProcessingOcr(true);
      setError(null);
      setOcrProgress(10);
      setOcrStatusText('Loading image...');

      const reader = new FileReader();
      reader.onload = async (event) => {
        const previewUrl = event.target?.result as string;
        setOcrImagePreview(previewUrl);

        try {
          const extracted = await extractProductDetailsFromImage(file, (p, status) => {
            setOcrProgress(p);
            setOcrStatusText(status);
          });

          setExtractedOcrData(extracted);
          setShowOcrVerification(true);
        } catch (ocrErr) {
          setError(
            ocrErr instanceof Error
              ? `OCR failed: ${ocrErr.message}`
              : 'Could not extract text from label. Please enter details manually.'
          );
        } finally {
          setIsProcessingOcr(false);
        }
      };
      reader.readAsDataURL(file);
    } catch (err) {
      setError('Failed to process image');
      setIsProcessingOcr(false);
    }
  };

  const resetForm = () => {
    setName('');
    setBrand('');
    setBarcode('');
    setCostPrice('');
    setSellingPrice('');
    setExpiryDate('');
    setMfgDate('');
    setQuantity(10);
    setError(null);
  };

  return (
    <>
      <div className="fixed inset-0 z-40 flex items-center justify-center p-3 sm:p-5 bg-slate-900/70 backdrop-blur-sm overflow-y-auto">
        <div className="bg-white dark:bg-slate-800 rounded-2xl w-full max-w-2xl shadow-2xl border border-slate-200 dark:border-slate-700 overflow-hidden my-auto max-h-[92vh] flex flex-col animate-in fade-in zoom-in-95 duration-200">
          
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-700 bg-brand-50/60 dark:bg-slate-800">
            <div className="flex items-center space-x-2">
              <span className="p-1.5 bg-brand-600 text-white rounded-lg">
                <Plus className="w-4 h-4" />
              </span>
              <div>
                <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-slate-100">
                  Add New Product
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Add manually, scan a barcode, or upload a product label for AI OCR.
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

          {/* Mode Tabs */}
          <div className="flex border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/40 px-6">
            <button
              onClick={() => setActiveMode('manual')}
              className={`py-3 px-4 text-xs sm:text-sm font-semibold border-b-2 transition-colors flex items-center gap-2 ${
                activeMode === 'manual'
                  ? 'border-brand-600 text-brand-600 dark:text-brand-400 bg-white dark:bg-slate-800'
                  : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              <Plus className="w-4 h-4" />
              Manual & Barcode Entry
            </button>
            <button
              onClick={() => setActiveMode('ocr')}
              className={`py-3 px-4 text-xs sm:text-sm font-semibold border-b-2 transition-colors flex items-center gap-2 ${
                activeMode === 'ocr'
                  ? 'border-brand-600 text-brand-600 dark:text-brand-400 bg-white dark:bg-slate-800'
                  : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              <Sparkles className="w-4 h-4 text-brand-500" />
              AI Label OCR Scan
            </button>
          </div>

          {error && (
            <div className="mx-6 mt-4 p-3 bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-800 rounded-xl flex items-center gap-2 text-sm text-red-700 dark:text-red-300">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Content Body */}
          <div className="p-6 overflow-y-auto flex-1">
            {activeMode === 'ocr' ? (
              /* AI OCR Mode */
              <div className="space-y-6">
                <div className="border-2 border-dashed border-brand-300 dark:border-brand-700 rounded-2xl p-6 sm:p-10 text-center bg-brand-50/20 dark:bg-brand-950/10 hover:bg-brand-50/40 transition-colors">
                  <div className="w-14 h-14 mx-auto mb-3 bg-brand-100 dark:bg-brand-900/50 text-brand-600 dark:text-brand-300 rounded-2xl flex items-center justify-center">
                    <Sparkles className="w-7 h-7" />
                  </div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 mb-1">
                    Upload Product Package Label
                  </h3>
                  <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 max-w-sm mx-auto mb-5">
                    Our AI OCR extracts product name, brand, expiry date, MRP, and batch number automatically from the packaging image.
                  </p>

                  {isProcessingOcr ? (
                    <div className="max-w-xs mx-auto space-y-3">
                      <div className="flex items-center justify-center gap-2 text-brand-600 dark:text-brand-400 font-medium text-sm">
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        <span>{ocrStatusText || 'Reading label with OCR...'}</span>
                      </div>
                      <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2 overflow-hidden">
                        <div
                          className="bg-brand-600 h-2 transition-all duration-300 rounded-full"
                          style={{ width: `${ocrProgress}%` }}
                        />
                      </div>
                      <span className="text-xs text-slate-400">{ocrProgress}% complete</span>
                    </div>
                  ) : (
                    <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                      <label className="cursor-pointer px-5 py-2.5 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-sm font-medium transition-colors flex items-center gap-2 shadow-sm">
                        <Upload className="w-4 h-4" />
                        <span>Select Image File</span>
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={handleImageUpload}
                        />
                      </label>
                      <label className="cursor-pointer px-5 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-800 dark:text-slate-100 rounded-xl text-sm font-medium transition-colors flex items-center gap-2">
                        <Camera className="w-4 h-4" />
                        <span>Take Photo (Camera)</span>
                        <input
                          type="file"
                          accept="image/*"
                          capture="environment"
                          className="hidden"
                          onChange={handleImageUpload}
                        />
                      </label>
                    </div>
                  )}
                </div>

                <div className="bg-slate-50 dark:bg-slate-900/50 p-4 rounded-xl border border-slate-200 dark:border-slate-700">
                  <h4 className="text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">
                    Tips for Best OCR Results
                  </h4>
                  <ul className="text-xs text-slate-500 dark:text-slate-400 space-y-1 list-disc pl-4">
                    <li>Ensure good lighting without heavy reflections on plastic pouches.</li>
                    <li>Align the portion of the package showing EXP, MFD, BATCH, and MRP.</li>
                    <li>You will be able to review and correct every field before anything is saved.</li>
                  </ul>
                </div>
              </div>
            ) : (
              /* Manual & Barcode Mode */
              <form onSubmit={handleManualSubmit} className="space-y-4">
                {/* Barcode scanner quick trigger */}
                <div className="p-3 bg-brand-50/50 dark:bg-brand-950/20 border border-brand-200 dark:border-brand-900/60 rounded-xl flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Barcode className="w-5 h-5 text-brand-600 dark:text-brand-400" />
                    <div>
                      <p className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                        Scan Barcode with Camera
                      </p>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400">
                        Quickly fill barcode using phone camera or webcam
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowBarcodeScanner(true)}
                    className="px-3 py-1.5 bg-brand-600 hover:bg-brand-700 text-white rounded-lg text-xs font-medium transition-colors flex items-center gap-1"
                  >
                    <Camera className="w-3.5 h-3.5" />
                    <span>Open Scanner</span>
                  </button>
                </div>

                {/* Name */}
                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Product Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Tata Salt 1kg, Paracetamol 650mg"
                    className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-brand-500"
                  />
                </div>

                {/* Brand & Category */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                      Brand / Manufacturer
                    </label>
                    <input
                      type="text"
                      value={brand}
                      onChange={(e) => setBrand(e.target.value)}
                      placeholder="e.g. Tata, Amul, Cipla, Nestle"
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
                      <option value="Medicines">Medicines / Pharmacy</option>
                      <option value="Snacks">Snacks & Confectionery</option>
                      <option value="Beverages">Beverages</option>
                      <option value="Personal Care">Personal Care</option>
                      <option value="General Store">General Retail</option>
                    </select>
                  </div>
                </div>

                {/* Barcode & Unit */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                      Barcode (EAN / UPC / Custom)
                    </label>
                    <input
                      type="text"
                      value={barcode}
                      onChange={(e) => setBarcode(e.target.value)}
                      placeholder="e.g. 8901030383701"
                      className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-brand-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                      Unit of Measure
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
                      <option value="jar">jar</option>
                    </select>
                  </div>
                </div>

                {/* Expiry Date & Batch No (Crucial for Smart Expiry) */}
                <div className="p-3 bg-brand-50/40 dark:bg-brand-950/20 border border-brand-200 dark:border-brand-900/60 rounded-xl space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="sm:col-span-1">
                      <label className="block text-xs font-semibold text-brand-900 dark:text-brand-300 mb-1">
                        Expiry Date *
                      </label>
                      <input
                        type="date"
                        required
                        value={expiryDate}
                        onChange={(e) => setExpiryDate(e.target.value)}
                        className="w-full px-3 py-1.5 text-sm rounded-lg border border-brand-300 dark:border-brand-700 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-brand-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                        Batch Number
                      </label>
                      <input
                        type="text"
                        value={batchNumber}
                        onChange={(e) => setBatchNumber(e.target.value)}
                        placeholder="e.g. B-01"
                        className="w-full px-3 py-1.5 text-sm rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-brand-500"
                      />
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
                </div>

                {/* Pricing & Stock */}
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                      Cost Price ({currency})
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="0.5"
                      required
                      value={costPrice}
                      onChange={(e) => setCostPrice(e.target.value)}
                      placeholder="0.00"
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
                      required
                      value={sellingPrice}
                      onChange={(e) => setSellingPrice(e.target.value)}
                      placeholder="0.00"
                      className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-brand-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                      Initial Quantity
                    </label>
                    <input
                      type="number"
                      min="1"
                      required
                      value={quantity}
                      onChange={(e) => setQuantity(parseInt(e.target.value, 10) || 1)}
                      className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-brand-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                      Min Stock Alert
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

                <div className="pt-4 border-t border-slate-200 dark:border-slate-700 flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={onClose}
                    className="px-4 py-2 text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="px-5 py-2 text-sm font-medium text-white bg-brand-600 hover:bg-brand-700 disabled:opacity-50 rounded-lg transition-colors shadow-sm"
                  >
                    {isSubmitting ? 'Saving...' : 'Add Product'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      </div>

      {/* Barcode Scanner Modal */}
      <BarcodeScannerModal
        isOpen={showBarcodeScanner}
        onClose={() => setShowBarcodeScanner(false)}
        onScanSuccess={(code) => {
          setBarcode(code);
          setShowBarcodeScanner(false);
        }}
      />

      {/* OCR Verification & Edit Modal */}
      {showOcrVerification && extractedOcrData && (
        <OcrVerificationModal
          isOpen={showOcrVerification}
          onClose={() => {
            setShowOcrVerification(false);
            setExtractedOcrData(null);
            setOcrImagePreview(null);
          }}
          extractedData={extractedOcrData}
          imagePreviewUrl={ocrImagePreview}
          currency={currency}
          onSave={async (data) => {
            await onSave(data);
            setShowOcrVerification(false);
            setExtractedOcrData(null);
            setOcrImagePreview(null);
            onClose();
          }}
        />
      )}
    </>
  );
};
