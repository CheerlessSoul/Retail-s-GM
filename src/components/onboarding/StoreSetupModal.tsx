import React, { useState } from 'react';
import { 
  Store, 
  User, 
  FileSpreadsheet, 
  PlusCircle, 
  ArrowRight, 
  Check, 
  ShoppingBag,
  Pill,
  Sparkles,
  Layers,
  ChevronRight,
  ShieldCheck
} from 'lucide-react';
import type { ShopSettings } from '../../types';

interface StoreSetupModalProps {
  isOpen: boolean;
  initialSettings: ShopSettings;
  onCompleteSetup: (newSettings: ShopSettings, nextAction?: 'import_sheet' | 'add_product' | 'dashboard') => Promise<void>;
}

export const StoreSetupModal: React.FC<StoreSetupModalProps> = ({
  isOpen,
  initialSettings,
  onCompleteSetup,
}) => {
  const [step, setStep] = useState<'profile' | 'choice'>('profile');
  const [shopName, setShopName] = useState(initialSettings.shopName || '');
  const [ownerName, setOwnerName] = useState(initialSettings.ownerName || '');
  const [storeType, setStoreType] = useState<'grocery' | 'pharmacy' | 'general' | 'dairy' | 'other'>(
    initialSettings.storeType || 'grocery'
  );
  const [currency, setCurrency] = useState(initialSettings.currency || '₹');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const storeTypeOptions = [
    {
      id: 'grocery' as const,
      label: 'Grocery & Kirana Store',
      sublabel: 'दुकान / किराना (Rice, Oil, Spices, Pulses)',
      icon: '🛒',
    },
    {
      id: 'pharmacy' as const,
      label: 'Pharmacy & Medical Store',
      sublabel: 'दवा दुकान (Medicines, Strips, Syrups)',
      icon: '💊',
    },
    {
      id: 'general' as const,
      label: 'General Store & Mini-Mart',
      sublabel: 'डेली नीड्स (Soaps, Snacks, Stationeries)',
      icon: '🏬',
    },
    {
      id: 'dairy' as const,
      label: 'Dairy, Bakery & Sweets',
      sublabel: 'डेयरी / बेकरी (Milk, Bread, Paneer)',
      icon: '🥛',
    },
    {
      id: 'other' as const,
      label: 'Other Retail Business',
      sublabel: 'अन्य खुदरा दुकान',
      icon: '📦',
    },
  ];

  const handleNextToChoice = (e: React.FormEvent) => {
    e.preventDefault();
    if (!shopName.trim()) {
      setError('Please enter your shop or store name to continue.');
      return;
    }
    setError(null);
    setStep('choice');
  };

  const handleFinish = async (action: 'import_sheet' | 'add_product' | 'dashboard') => {
    setIsSubmitting(true);
    try {
      const updated: ShopSettings = {
        ...initialSettings,
        shopName: shopName.trim(),
        ownerName: ownerName.trim() || 'Store Owner',
        storeType,
        currency,
        isOnboarded: true,
      };
      await onCompleteSetup(updated, action);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/70 backdrop-blur-sm animate-in fade-in">
      <div className="bg-white dark:bg-slate-800 w-full max-w-xl rounded-2xl border border-slate-200 dark:border-slate-700 shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        
        {/* Modal Top Header */}
        <div className="bg-gradient-to-r from-brand-600 to-emerald-700 p-5 text-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-xl bg-white/15 backdrop-blur-md flex items-center justify-center font-bold text-lg text-white">
                R
              </div>
              <div>
                <h1 className="text-base sm:text-lg font-bold tracking-tight">
                  Welcome to Retail's GM
                </h1>
                <p className="text-xs text-white/80">
                  Smart store management, shelf-life monitoring & fast billing
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1.5 text-xs font-semibold bg-black/20 px-2.5 py-1 rounded-full">
              <span className={`w-2 h-2 rounded-full ${step === 'profile' ? 'bg-amber-300' : 'bg-emerald-300'}`} />
              <span>Step {step === 'profile' ? '1 of 2' : '2 of 2'}</span>
            </div>
          </div>
        </div>

        {/* Modal Content */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-5 text-xs flex-1">
          {step === 'profile' ? (
            /* STEP 1: STORE DETAILS & IDENTITY */
            <form onSubmit={handleNextToChoice} className="space-y-4">
              <div>
                <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                  Set Up Your Store / अपनी दुकान की जानकारी भरें
                </h2>
                <p className="text-slate-500 text-xs mt-0.5">
                  Takes less than a minute. This name will appear on your customer receipts and dashboard.
                </p>
              </div>

              {error && (
                <div className="p-2.5 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 rounded-lg text-xs">
                  {error}
                </div>
              )}

              {/* Store Name Input */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-200 mb-1">
                  Shop / Store Name (दुकान का नाम) <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <Store className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    required
                    value={shopName}
                    onChange={(e) => {
                      setShopName(e.target.value);
                      if (error) setError(null);
                    }}
                    placeholder="e.g. Gupta Kirana Store, City Medical, Laxmi Supermarket"
                    className="w-full pl-9 pr-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-brand-500 font-medium"
                    autoFocus
                  />
                </div>
              </div>

              {/* Owner Name Input */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-200 mb-1">
                    Owner / Manager Name (मालिक का नाम)
                  </label>
                  <div className="relative">
                    <User className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={ownerName}
                      onChange={(e) => setOwnerName(e.target.value)}
                      placeholder="e.g. Rajesh Kumar"
                      className="w-full pl-9 pr-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-brand-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-200 mb-1">
                    Currency Symbol
                  </label>
                  <select
                    value={currency}
                    onChange={(e) => setCurrency(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-brand-500"
                  >
                    <option value="₹">₹ (Indian Rupee - INR)</option>
                    <option value="$">$ (US Dollar - USD)</option>
                    <option value="AED">AED (UAE Dirham)</option>
                    <option value="£">£ (British Pound)</option>
                    <option value="€">€ (Euro)</option>
                  </select>
                </div>
              </div>

              {/* Select Who Is He / Store Category */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-200 mb-1.5">
                  Select Your Business Type (आपकी दुकान किस प्रकार की है?)
                </label>
                <div className="grid grid-cols-1 gap-2">
                  {storeTypeOptions.map((opt) => (
                    <div
                      key={opt.id}
                      onClick={() => setStoreType(opt.id)}
                      className={`p-2.5 rounded-lg border transition-all cursor-pointer flex items-center justify-between ${
                        storeType === opt.id
                          ? 'border-brand-600 bg-brand-50 dark:bg-brand-950/40 text-brand-900 dark:text-brand-100 shadow-sm'
                          : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 bg-white dark:bg-slate-900/40'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <span className="text-xl shrink-0">{opt.icon}</span>
                        <div>
                          <div className="font-bold text-slate-900 dark:text-slate-100">
                            {opt.label}
                          </div>
                          <div className="text-[11px] text-slate-500 dark:text-slate-400">
                            {opt.sublabel}
                          </div>
                        </div>
                      </div>

                      <div className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 ${
                        storeType === opt.id
                          ? 'border-brand-600 bg-brand-600 text-white'
                          : 'border-slate-300 dark:border-slate-600'
                      }`}>
                        {storeType === opt.id && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  className="w-full py-2.5 rounded-xl font-bold text-xs text-white bg-brand-600 hover:bg-brand-700 transition-all flex items-center justify-center gap-2 btn-3d-brand shadow-md"
                >
                  <span>Continue to Product Setup / आगे बढ़ें</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </form>
          ) : (
            /* STEP 2: CHOICE - IMPORT SHEET OR ADD PRODUCT OR SKIP */
            <div className="space-y-4">
              <div>
                <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                  How would you like to start adding products?
                </h2>
                <p className="text-slate-500 text-xs mt-0.5">
                  You can import an existing spreadsheet, add items manually, or start with an empty store and add products in the future.
                </p>
              </div>

              {/* Option Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                {/* Option 1: Import Sheet */}
                <div
                  onClick={() => handleFinish('import_sheet')}
                  className="p-4 rounded-xl border border-brand-300 dark:border-brand-700/80 bg-brand-50/50 dark:bg-brand-950/20 hover:bg-brand-50 dark:hover:bg-brand-950/40 hover:border-brand-500 transition-all cursor-pointer flex flex-col justify-between group shadow-sm"
                >
                  <div>
                    <div className="w-10 h-10 rounded-lg bg-brand-100 dark:bg-brand-900/60 text-brand-700 dark:text-brand-300 flex items-center justify-center mb-2.5 group-hover:scale-105 transition-transform">
                      <FileSpreadsheet className="w-5 h-5" />
                    </div>
                    <h3 className="font-bold text-xs sm:text-sm text-slate-900 dark:text-slate-100">
                      Import Sheet (Excel / CSV)
                    </h3>
                    <p className="text-slate-500 dark:text-slate-400 text-[11px] mt-1 leading-relaxed">
                      Upload an Excel (<span className="font-semibold text-brand-600">.xlsx/.xls</span>) or Google Sheets file. All products, prices, stock and expiry dates will be added automatically.
                    </p>
                  </div>

                  <button
                    type="button"
                    disabled={isSubmitting}
                    className="mt-4 w-full py-1.5 px-3 rounded-lg bg-brand-600 hover:bg-brand-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-sm"
                  >
                    <span>Import Sheet Now</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Option 2: Add Manually / Barcode */}
                <div
                  onClick={() => handleFinish('add_product')}
                  className="p-4 rounded-xl border border-slate-200 dark:border-slate-700 hover:border-slate-400 dark:hover:border-slate-500 bg-white dark:bg-slate-900/40 hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-all cursor-pointer flex flex-col justify-between group shadow-sm"
                >
                  <div>
                    <div className="w-10 h-10 rounded-lg bg-blue-100 dark:bg-blue-900/60 text-blue-700 dark:text-blue-300 flex items-center justify-center mb-2.5 group-hover:scale-105 transition-transform">
                      <PlusCircle className="w-5 h-5" />
                    </div>
                    <h3 className="font-bold text-xs sm:text-sm text-slate-900 dark:text-slate-100">
                      Add Product Manually
                    </h3>
                    <p className="text-slate-500 dark:text-slate-400 text-[11px] mt-1 leading-relaxed">
                      Type product details or use camera to scan product barcode & read expiry date from package label.
                    </p>
                  </div>

                  <button
                    type="button"
                    disabled={isSubmitting}
                    className="mt-4 w-full py-1.5 px-3 rounded-lg bg-slate-800 hover:bg-slate-900 dark:bg-slate-700 dark:hover:bg-slate-600 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-sm"
                  >
                    <span>Add First Product</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Option 3: Skip & Start with Empty Dashboard */}
              <div className="pt-2 border-t border-slate-100 dark:border-slate-700 flex flex-col sm:flex-row items-center justify-between gap-2.5">
                <div className="text-slate-500 dark:text-slate-400 text-[11px] text-center sm:text-left">
                  <span>Want to explore first? You can add or import products anytime later.</span>
                </div>

                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={() => handleFinish('dashboard')}
                  className="px-4 py-2 rounded-lg text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 transition-colors whitespace-nowrap"
                >
                  Skip & Go to Dashboard &rarr;
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Reassurance Footer */}
        <div className="px-5 py-2.5 bg-slate-50 dark:bg-slate-900/50 border-t border-slate-100 dark:border-slate-700 flex items-center justify-between text-[11px] text-slate-500">
          <span className="flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-brand-600" />
            <span>Offline-Ready: All data stays 100% private in your browser.</span>
          </span>
          {step === 'choice' && (
            <button
              onClick={() => setStep('profile')}
              className="text-brand-600 hover:underline font-semibold"
            >
              &larr; Back to Shop Info
            </button>
          )}
        </div>

      </div>
    </div>
  );
};
