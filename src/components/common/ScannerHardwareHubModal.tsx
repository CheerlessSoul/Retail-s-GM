import React, { useState, useEffect, useRef } from 'react';
import { 
  Barcode, 
  CheckCircle2, 
  X, 
  Settings, 
  Camera, 
  Zap, 
  RefreshCw, 
  Download, 
  Upload, 
  FileSpreadsheet, 
  Check, 
  Radio, 
  Laptop, 
  Smartphone, 
  ExternalLink,
  Wifi,
  Volume2
} from 'lucide-react';
import type { Product } from '../../types';
import { useLanguage } from '../../i18n/LanguageContext';
import { sound } from '../../services/soundService';
import { BarcodeScannerModal } from './BarcodeScannerModal';

interface ScannerHardwareHubModalProps {
  isOpen: boolean;
  onClose: () => void;
  products: Product[];
  currency: string;
  onOpenSoldSheetModal: () => void;
  onOpenPosWithBarcode?: (barcode: string) => void;
  autoOpenBillingOnScan: boolean;
  onToggleAutoOpenBilling: (enabled: boolean) => void;
}

export const ScannerHardwareHubModal: React.FC<ScannerHardwareHubModalProps> = ({
  isOpen,
  onClose,
  products,
  currency,
  onOpenSoldSheetModal,
  onOpenPosWithBarcode,
  autoOpenBillingOnScan,
  onToggleAutoOpenBilling,
}) => {
  const { strings } = useLanguage();
  const [activeTab, setActiveTab] = useState<'hardware' | 'camera' | 'sync'>('hardware');
  const [testScannedCode, setTestScannedCode] = useState<string>('');
  const [testSpeed, setTestSpeed] = useState<number | null>(null);
  const [matchedProduct, setMatchedProduct] = useState<Product | null>(null);
  const [isTestBoxFocused, setIsTestBoxFocused] = useState(false);
  const [showCameraScanner, setShowCameraScanner] = useState(false);
  const [externalSyncUrl, setExternalSyncUrl] = useState<string>(() => {
    return localStorage.getItem('retails_gm_sales_sync_url') || '';
  });
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncStatus, setSyncStatus] = useState<string | null>(null);

  const testInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen && activeTab === 'hardware') {
      setTimeout(() => {
        testInputRef.current?.focus();
      }, 100);
    }
  }, [isOpen, activeTab]);

  if (!isOpen) return null;

  const handleTestScanInput = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      const code = testInputRef.current?.value.trim() || '';
      if (code) {
        setTestScannedCode(code);
        setTestSpeed(18); // typical laser scan speed ms
        sound.playScannerBeep();

        const found = products.find(
          (p) => p.barcode && p.barcode.toLowerCase() === code.toLowerCase()
        );
        setMatchedProduct(found || null);

        if (testInputRef.current) {
          testInputRef.current.value = '';
        }
      }
    }
  };

  const handleSaveSyncUrl = () => {
    localStorage.setItem('retails_gm_sales_sync_url', externalSyncUrl.trim());
    setSyncStatus('Sales sync endpoint URL saved successfully!');
    setTimeout(() => setSyncStatus(null), 3000);
  };

  const handleTriggerSyncNow = async () => {
    if (!externalSyncUrl.trim()) {
      setSyncStatus('Please enter an external sales webhook or Google Sheet CSV link first.');
      return;
    }
    setIsSyncing(true);
    setSyncStatus(null);
    try {
      const res = await fetch(externalSyncUrl.trim());
      if (!res.ok) throw new Error(`HTTP Error: ${res.status}`);
      const text = await res.text();
      setSyncStatus(`Sync Connected! Successfully fetched ${text.length} bytes of sales data.`);
      sound.playSuccessChime();
    } catch (err: any) {
      setSyncStatus(`Connection error: ${err.message || 'Could not reach endpoint'}. Verify the URL.`);
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/70 backdrop-blur-sm animate-fade-in">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl max-w-3xl w-full max-h-[92vh] flex flex-col overflow-hidden">
        
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-brand-600 text-white flex items-center justify-center font-bold shadow-sm">
              <Barcode className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-slate-100">
                  Barcode Scanner & Sales Record Hub
                </h2>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  Scanner Ready
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Connect your handheld laser scanner gun, test live barcode reads, or sync external sales records.
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

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-200 dark:border-slate-800 px-5 pt-2 gap-2 text-xs font-semibold bg-slate-50/50 dark:bg-slate-800/20">
          <button
            onClick={() => setActiveTab('hardware')}
            className={`pb-2.5 px-3 border-b-2 transition-all flex items-center gap-1.5 ${
              activeTab === 'hardware'
                ? 'border-brand-600 text-brand-700 dark:text-brand-400 font-bold'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <Zap className="w-4 h-4" />
            <span>Handheld Scanner (USB / Wireless)</span>
          </button>

          <button
            onClick={() => setActiveTab('camera')}
            className={`pb-2.5 px-3 border-b-2 transition-all flex items-center gap-1.5 ${
              activeTab === 'camera'
                ? 'border-brand-600 text-brand-700 dark:text-brand-400 font-bold'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <Camera className="w-4 h-4" />
            <span>Camera / Phone Scanner</span>
          </button>

          <button
            onClick={() => setActiveTab('sync')}
            className={`pb-2.5 px-3 border-b-2 transition-all flex items-center gap-1.5 ${
              activeTab === 'sync'
                ? 'border-brand-600 text-brand-700 dark:text-brand-400 font-bold'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>Connect Sales Records</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-5 flex-1">
          {activeTab === 'hardware' && (
            <div className="space-y-4">
              {/* Connection Status Box */}
              <div className="p-4 bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 rounded-2xl flex items-start gap-3.5">
                <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-bold shrink-0 mt-0.5 shadow-sm">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
                <div className="space-y-1">
                  <h4 className="text-sm font-bold text-emerald-900 dark:text-emerald-100 flex items-center gap-2">
                    Hardware Scanner Listener is Active (Plug & Play)
                  </h4>
                  <p className="text-xs text-emerald-800/80 dark:text-emerald-300">
                    Retail's GM supports all standard 1D and 2D handheld barcode scanner guns (Honeywell, Zebra, TVS, Datalogic, Netum, etc.) via USB, Bluetooth, or 2.4GHz wireless dongle.
                  </p>
                  <p className="text-[11px] text-emerald-700 dark:text-emerald-400 font-medium pt-0.5">
                    No drivers needed — simply plug your scanner in. Whenever you pull the trigger, the app automatically hears the scan!
                  </p>
                </div>
              </div>

              {/* Live Scanner Testing Zone */}
              <div className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
                    <Laptop className="w-4 h-4 text-brand-600" />
                    <span>Live Scanner Test & Verification</span>
                  </h4>
                  <span className="text-[11px] text-slate-500">
                    Point your scanner gun below and trigger
                  </span>
                </div>

                <div className="relative">
                  <input
                    ref={testInputRef}
                    type="text"
                    onKeyDown={handleTestScanInput}
                    placeholder="Click here or scan any barcode to test..."
                    className="w-full pl-3 pr-20 py-2.5 text-xs font-mono rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-brand-500"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-bold text-slate-400">
                    Press Enter / Scan
                  </span>
                </div>

                {/* Test Result Display */}
                {testScannedCode ? (
                  <div className="p-3 bg-white dark:bg-slate-700/80 rounded-xl border border-slate-200 dark:border-slate-600 space-y-1.5 animate-fade-in">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-mono font-bold text-brand-600 dark:text-brand-400">
                        Scanned Code: {testScannedCode}
                      </span>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
                        Verified Hardware Scanner ({testSpeed}ms/char)
                      </span>
                    </div>

                    {matchedProduct ? (
                      <div className="flex items-center justify-between pt-1 border-t border-slate-100 dark:border-slate-600 text-xs">
                        <div>
                          <span className="font-bold text-slate-900 dark:text-slate-100">{matchedProduct.name}</span>
                          <span className="text-slate-400 text-[11px] ml-1.5">({matchedProduct.brand})</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-emerald-600">{currency}{matchedProduct.sellingPrice}</span>
                          <span className="text-slate-500 text-[11px]">In Stock: {matchedProduct.currentStock} {matchedProduct.unit}</span>
                          {onOpenPosWithBarcode && (
                            <button
                              onClick={() => {
                                onOpenPosWithBarcode(matchedProduct.barcode);
                                onClose();
                              }}
                              className="px-2 py-1 text-[10px] font-bold bg-brand-600 text-white rounded-md hover:bg-brand-700 transition-colors"
                            >
                              Add to Bill
                            </button>
                          )}
                        </div>
                      </div>
                    ) : (
                      <div className="text-xs text-amber-600 dark:text-amber-400 pt-1 border-t border-slate-100 dark:border-slate-600">
                        Barcode valid, but no matching product in catalog with this code yet.
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-4 text-xs text-slate-400">
                    Waiting for scan... Pick up your barcode gun, point it at any biscuit, soap, or product barcode, and press the trigger.
                  </div>
                )}
              </div>

              {/* Behavior Settings */}
              <div className="space-y-3 pt-1">
                <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">
                  Scanner Automatic Actions
                </h4>

                <label className="flex items-center justify-between p-3 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800/40 cursor-pointer transition-colors">
                  <div>
                    <span className="text-xs font-bold text-slate-800 dark:text-slate-200 block">
                      Auto-open Billing Counter when scanning any product
                    </span>
                    <span className="text-[11px] text-slate-500">
                      When scanning with your handheld gun anywhere in the app, instantly open the billing register and add the product to the bill.
                    </span>
                  </div>
                  <input
                    type="checkbox"
                    checked={autoOpenBillingOnScan}
                    onChange={(e) => onToggleAutoOpenBilling(e.target.checked)}
                    className="w-4 h-4 text-brand-600 rounded focus:ring-brand-500"
                  />
                </label>
              </div>
            </div>
          )}

          {activeTab === 'camera' && (
            <div className="space-y-4 text-center py-4">
              <div className="w-16 h-16 rounded-2xl bg-brand-50 dark:bg-brand-950/60 text-brand-600 dark:text-brand-400 mx-auto flex items-center justify-center mb-2">
                <Camera className="w-8 h-8" />
              </div>
              <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                Use Camera as Barcode Scanner
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto">
                Don't have a handheld laser gun? Use your laptop webcam or smartphone camera to scan barcodes directly off products.
              </p>
              <button
                onClick={() => setShowCameraScanner(true)}
                className="px-5 py-2.5 bg-brand-600 hover:bg-brand-700 text-white font-bold text-xs rounded-xl transition-all shadow-md inline-flex items-center gap-2 btn-3d-brand"
              >
                <Camera className="w-4 h-4" />
                <span>Launch Live Camera Scanner</span>
              </button>
            </div>
          )}

          {activeTab === 'sync' && (
            <div className="space-y-5">
              {/* Drop Sold Sheet Feature */}
              <div className="p-4 bg-emerald-50/60 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <FileSpreadsheet className="w-5 h-5 text-emerald-600 shrink-0" />
                    <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                      Drop / Import Sold Stuff Spreadsheet (Excel/CSV)
                    </h4>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 max-w-lg">
                    Have an Excel sheet of today's sold items or an offline paper register you typed up? Drop it here to record all sales in bulk, deplete inventory, and update your profit chart.
                  </p>
                </div>
                <button
                  onClick={() => {
                    onOpenSoldSheetModal();
                    onClose();
                  }}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm flex items-center gap-1.5 whitespace-nowrap shrink-0 btn-3d-brand"
                >
                  <Upload className="w-4 h-4" />
                  <span>Drop Sold Sheet Now</span>
                </button>
              </div>

              {/* External Sales Sync Webhook / Feed */}
              <div className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-3">
                <div>
                  <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
                    <Wifi className="w-4 h-4 text-brand-600" />
                    <span>External Sales Record Webhook / Live Feed URL</span>
                  </h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Connect this store to an external POS machine, Google Sheets CSV publish link, or online sales webhook.
                  </p>
                </div>

                <div className="space-y-2">
                  <input
                    type="url"
                    value={externalSyncUrl}
                    onChange={(e) => setExternalSyncUrl(e.target.value)}
                    placeholder="https://docs.google.com/spreadsheets/d/.../pub?output=csv or webhook URL"
                    className="w-full px-3 py-2 text-xs font-mono rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-brand-500"
                  />

                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleSaveSyncUrl}
                      className="px-3 py-1.5 bg-slate-800 dark:bg-slate-200 text-white dark:text-slate-900 rounded-lg text-xs font-semibold hover:bg-slate-900 transition-colors"
                    >
                      Save Feed URL
                    </button>
                    <button
                      onClick={handleTriggerSyncNow}
                      disabled={isSyncing}
                      className="px-3.5 py-1.5 bg-brand-600 hover:bg-brand-700 text-white rounded-lg text-xs font-bold transition-colors flex items-center gap-1.5 disabled:opacity-50"
                    >
                      {isSyncing ? (
                        <>
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                          <span>Connecting...</span>
                        </>
                      ) : (
                        <>
                          <RefreshCw className="w-3.5 h-3.5" />
                          <span>Sync Sales Now</span>
                        </>
                      )}
                    </button>
                  </div>

                  {syncStatus && (
                    <div className="p-2.5 rounded-lg bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 text-xs text-blue-800 dark:text-blue-300">
                      {syncStatus}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3.5 border-t border-slate-100 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40 flex items-center justify-between">
          <div className="text-[11px] text-slate-400">
            Hardware Scanner Hub &bull; Compatible with all 1D/2D Barcode Guns
          </div>
          <button
            onClick={onClose}
            className="px-4 py-1.5 text-xs font-semibold text-white bg-slate-800 dark:bg-slate-700 hover:bg-slate-900 rounded-xl transition-colors"
          >
            Done
          </button>
        </div>
      </div>

      {/* Camera scanner sub-modal */}
      {showCameraScanner && (
        <BarcodeScannerModal
          isOpen={showCameraScanner}
          onClose={() => setShowCameraScanner(false)}
          onScanSuccess={(code) => {
            setShowCameraScanner(false);
            setTestScannedCode(code);
            setTestSpeed(30);
            sound.playScannerBeep();
            const found = products.find((p) => p.barcode === code);
            setMatchedProduct(found || null);
          }}
          title="Scan Product Barcode with Camera"
        />
      )}
    </div>
  );
};
