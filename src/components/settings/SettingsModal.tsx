import React, { useState } from 'react';
import { 
  X, 
  Moon, 
  Sun, 
  Volume2, 
  VolumeX, 
  Download, 
  Upload, 
  Trash2, 
  Store, 
  Check, 
  ShieldCheck,
  Globe
} from 'lucide-react';
import type { ShopSettings, SupportedLanguage } from '../../types';
import { db } from '../../db';
import { loadSampleDemoData } from '../../db/seedData';
import { useLanguage } from '../../i18n/LanguageContext';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: ShopSettings;
  onSaveSettings: (settings: ShopSettings) => Promise<void>;
  onThemeToggle: (theme: 'light' | 'dark') => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  settings,
  onSaveSettings,
  onThemeToggle,
}) => {
  const { language, setLanguage, strings, supportedLanguages } = useLanguage();
  const [selectedLanguage, setSelectedLanguage] = useState<SupportedLanguage>(
    settings.language || language || 'en'
  );
  const [shopName, setShopName] = useState(settings.shopName);
  const [ownerName, setOwnerName] = useState(settings.ownerName);
  const [phone, setPhone] = useState(settings.phone);
  const [storeType, setStoreType] = useState(settings.storeType || 'grocery');
  const [currency, setCurrency] = useState(settings.currency);
  const [urgentExpiryDays, setUrgentExpiryDays] = useState(settings.urgentExpiryDays);
  const [warningExpiryDays, setWarningExpiryDays] = useState(settings.warningExpiryDays);
  const [theme, setTheme] = useState(settings.theme);
  const [soundEnabled, setSoundEnabled] = useState(settings.soundEnabled);
  const [isSaved, setIsSaved] = useState(false);

  if (!isOpen) return null;

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const updated: ShopSettings = {
      ...settings,
      language: selectedLanguage,
      shopName: shopName.trim(),
      ownerName: ownerName.trim(),
      phone: phone.trim(),
      storeType,
      currency,
      urgentExpiryDays: Number(urgentExpiryDays) || 7,
      warningExpiryDays: Number(warningExpiryDays) || 30,
      theme,
      soundEnabled,
      isOnboarded: true,
    };
    await onSaveSettings(updated);
    setLanguage(selectedLanguage);
    onThemeToggle(theme);
    setIsSaved(true);
    setTimeout(() => {
      setIsSaved(false);
      onClose();
    }, 800);
  };

  const handleExportBackup = async () => {
    const products = await db.products.toArray();
    const batches = await db.batches.toArray();
    const history = await db.stockHistory.toArray();
    const sales = await db.sales.toArray();
    const currentSettings = await db.settings.toArray();

    const backupData = {
      version: '1.0',
      exportedAt: new Date().toISOString(),
      shopName,
      products,
      batches,
      history,
      sales,
      settings: currentSettings,
    };

    const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `retails-gm-backup-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImportBackup = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onerror = () => {
      alert('Error reading backup file.');
    };
    reader.onload = async (event) => {
      try {
        const json = JSON.parse(event.target?.result as string);
        if (
          Array.isArray(json.products) &&
          Array.isArray(json.batches) &&
          json.products.every((p: any) => p && typeof p.name === 'string' && typeof p.id === 'string') &&
          json.batches.every((b: any) => b && typeof b.expiryDate === 'string' && typeof b.productId === 'string')
        ) {
          await db.transaction('rw', db.products, db.batches, db.stockHistory, db.sales, db.settings, async () => {
            await db.products.clear();
            await db.batches.clear();
            await db.stockHistory.clear();
            await db.sales.clear();

            await db.products.bulkPut(json.products);
            await db.batches.bulkPut(json.batches);
            if (Array.isArray(json.history)) await db.stockHistory.bulkPut(json.history);
            if (Array.isArray(json.sales)) await db.sales.bulkPut(json.sales);
            if (Array.isArray(json.settings) && json.settings.length > 0) {
              await db.settings.bulkPut(json.settings);
            }
          });
          alert('Backup restored successfully! The application will now reload.');
          window.location.reload();
        } else {
          alert('Invalid or corrupted backup file format. Expected valid products and batches array.');
        }
      } catch (err) {
        alert('Failed to parse backup JSON file: Invalid JSON syntax.');
      }
    };
    reader.readAsText(file);
  };

  const handleClearAllData = async () => {
    if (window.confirm('Wipe all products, batches, and sales from your store? Your inventory will be completely clean and empty.')) {
      await db.clearAllStoreData();
      alert('All products and sales data have been cleared.');
      window.location.reload();
    }
  };

  const handleLoadSampleData = async () => {
    if (window.confirm('Load 4 sample items (Milk, Salt, Dolo, Atta) into your store for testing?')) {
      await loadSampleDemoData();
      alert('Sample products loaded.');
      window.location.reload();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-900/60 overflow-y-auto">
      <div className="bg-white dark:bg-slate-800 rounded-lg w-full max-w-xl shadow-xl border border-slate-200 dark:border-slate-700 overflow-hidden my-auto max-h-[92vh] flex flex-col">
        
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80">
          <div className="flex items-center space-x-2">
            <Store className="w-5 h-5 text-brand-600 dark:text-brand-400" />
            <div>
              <h2 className="text-sm sm:text-base font-bold text-slate-900 dark:text-slate-100">
                {strings.settings.title}
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {strings.settings.subtitle}
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

        {/* Form Body */}
        <form onSubmit={handleSave} className="p-5 overflow-y-auto flex-1 space-y-4">
          
          {/* 1. Language Selector (Primary setting as requested) */}
          <div className="p-3.5 bg-brand-50/50 dark:bg-brand-950/20 rounded-md border border-brand-200 dark:border-brand-900/60 space-y-2.5">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
                <Globe className="w-4 h-4 text-brand-600 dark:text-brand-400" />
                <span>{strings.settings.languageSection}</span>
              </h3>
              <span className="text-[10px] font-semibold text-brand-700 dark:text-brand-300 bg-brand-100 dark:bg-brand-900/60 px-2 py-0.5 rounded border border-brand-300 dark:border-brand-800">
                Default: English
              </span>
            </div>
            <p className="text-[11px] text-slate-600 dark:text-slate-400">
              {strings.settings.selectLanguagePrompt}
            </p>
            
            {/* 6 Language Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-1">
              {supportedLanguages.map((lang) => {
                const isSelected = selectedLanguage === lang.code;
                return (
                  <button
                    key={lang.code}
                    type="button"
                    onClick={() => {
                      setSelectedLanguage(lang.code);
                      setLanguage(lang.code);
                    }}
                    className={`p-2.5 rounded-lg border text-left transition-all flex items-center gap-2.5 cursor-pointer ${
                      isSelected
                        ? 'bg-white dark:bg-slate-800 border-brand-600 dark:border-brand-500 shadow-sm ring-2 ring-brand-500'
                        : 'bg-white/70 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 hover:border-brand-300 dark:hover:border-slate-600'
                    }`}
                  >
                    <span className="text-xl shrink-0">{lang.flag}</span>
                    <div className="min-w-0">
                      <div className={`text-xs font-bold leading-tight truncate ${
                        isSelected ? 'text-brand-700 dark:text-brand-300' : 'text-slate-800 dark:text-slate-200'
                      }`}>
                        {lang.nativeName}
                      </div>
                      <div className="text-[10px] text-slate-500 dark:text-slate-400 truncate">
                        {lang.name}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 2. Theme & Display Mode */}
          <div className="p-3.5 bg-slate-50 dark:bg-slate-900/50 rounded-md border border-slate-200 dark:border-slate-700 space-y-2.5">
            <h3 className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">
              {strings.settings.displaySection}
            </h3>
            <div className="grid grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={() => {
                  setTheme('light');
                  onThemeToggle('light');
                }}
                className={`p-2.5 rounded-md border flex items-center justify-center gap-2 text-xs font-bold transition-all ${
                  theme === 'light'
                    ? 'bg-white border-brand-600 text-brand-600 shadow-sm'
                    : 'bg-white/50 border-slate-200 text-slate-600'
                }`}
              >
                <Sun className="w-4 h-4 text-amber-500" />
                <span>{strings.settings.lightMode}</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setTheme('dark');
                  onThemeToggle('dark');
                }}
                className={`p-2.5 rounded-md border flex items-center justify-center gap-2 text-xs font-bold transition-all ${
                  theme === 'dark'
                    ? 'bg-slate-800 border-brand-500 text-brand-400 shadow-sm'
                    : 'bg-slate-800/40 border-slate-700 text-slate-300'
                }`}
              >
                <Moon className="w-4 h-4 text-brand-400" />
                <span>{strings.settings.darkMode}</span>
              </button>
            </div>

            {/* Sound toggle */}
            <div className="flex items-center justify-between pt-2 border-t border-slate-200 dark:border-slate-700 text-xs">
              <span className="text-slate-700 dark:text-slate-300 font-medium">
                {strings.settings.soundBeeps}
              </span>
              <button
                type="button"
                onClick={() => setSoundEnabled(!soundEnabled)}
                className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 text-xs font-semibold ${
                  soundEnabled
                    ? 'bg-brand-100 text-brand-700 dark:bg-brand-950/60 dark:text-brand-300'
                    : 'bg-slate-200 text-slate-600 dark:bg-slate-700 dark:text-slate-300'
                }`}
              >
                {soundEnabled ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />}
                <span>{soundEnabled ? strings.settings.soundEnabled : strings.settings.soundMuted}</span>
              </button>
            </div>
          </div>

          {/* 3. Shop Profile */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">
              {strings.settings.profileSection}
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-slate-600 dark:text-slate-400 mb-1">
                  {strings.settings.shopName}
                </label>
                <input
                  type="text"
                  required
                  value={shopName}
                  onChange={(e) => setShopName(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100"
                />
              </div>

              <div>
                <label className="block text-xs text-slate-600 dark:text-slate-400 mb-1">
                  {strings.settings.ownerName}
                </label>
                <input
                  type="text"
                  value={ownerName}
                  onChange={(e) => setOwnerName(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-slate-600 dark:text-slate-400 mb-1">
                  {strings.settings.phone}
                </label>
                <input
                  type="text"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100"
                />
              </div>

              <div>
                <label className="block text-xs text-slate-600 dark:text-slate-400 mb-1">
                  {strings.settings.currency}
                </label>
                <select
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100"
                >
                  <option value="₹">₹ (Indian Rupee - INR)</option>
                  <option value="$">$ (US Dollar - USD)</option>
                  <option value="Ks">Ks (Myanmar Kyat - MMK)</option>
                  <option value="€">€ (Euro - EUR)</option>
                  <option value="£">£ (British Pound - GBP)</option>
                  <option value="AED">AED (UAE Dirham)</option>
                </select>
              </div>
            </div>
          </div>

          {/* 4. Expiry Alert Thresholds */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">
              {strings.settings.expirySection}
            </h3>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-slate-600 dark:text-slate-400 mb-1">
                  {strings.settings.urgentDays}
                </label>
                <input
                  type="number"
                  min="1"
                  max="30"
                  value={urgentExpiryDays}
                  onChange={(e) => setUrgentExpiryDays(parseInt(e.target.value, 10) || 7)}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-600 dark:text-slate-400 mb-1">
                  {strings.settings.warningDays}
                </label>
                <input
                  type="number"
                  min="7"
                  max="90"
                  value={warningExpiryDays}
                  onChange={(e) => setWarningExpiryDays(parseInt(e.target.value, 10) || 30)}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100"
                />
              </div>
            </div>
          </div>

          {/* 5. Backup, Export & Reset */}
          <div className="pt-3 border-t border-slate-200 dark:border-slate-700 space-y-3">
            <h3 className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">
              {strings.settings.backupSection}
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <button
                type="button"
                onClick={handleExportBackup}
                className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 rounded-md text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors border border-slate-200 dark:border-slate-600"
              >
                <Download className="w-3.5 h-3.5" />
                <span>{strings.settings.exportBackup}</span>
              </button>

              <label className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 rounded-md text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors border border-slate-200 dark:border-slate-600 cursor-pointer">
                <Upload className="w-3.5 h-3.5" />
                <span>{strings.settings.importBackup}</span>
                <input
                  type="file"
                  accept=".json"
                  onChange={handleImportBackup}
                  className="hidden"
                />
              </label>

              <button
                type="button"
                onClick={handleClearAllData}
                className="px-3 py-1.5 bg-red-50 hover:bg-red-100 dark:bg-red-950/40 text-red-700 dark:text-red-300 rounded-md text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors border border-red-200 dark:border-red-800"
                title="Wipe store inventory completely clean"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>{strings.settings.clearAllData}</span>
              </button>
            </div>

            <div className="pt-2">
              <button
                type="button"
                onClick={handleLoadSampleData}
                className="w-full py-1.5 px-3 bg-slate-50 hover:bg-slate-100 dark:bg-slate-900/40 text-slate-600 dark:text-slate-300 text-[11px] rounded-md border border-slate-200 dark:border-slate-700 transition-colors text-center"
              >
                {strings.settings.loadDemoData}
              </button>
            </div>
          </div>

          {/* Footer Save */}
          <div className="pt-4 border-t border-slate-200 dark:border-slate-700 flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
            >
              {strings.settings.cancel}
            </button>
            <button
              type="submit"
              className="px-5 py-2 text-xs font-semibold text-white bg-brand-600 hover:bg-brand-700 rounded-lg transition-colors flex items-center gap-1 shadow-sm btn-3d-brand"
            >
              {isSaved ? <Check className="w-4 h-4" /> : null}
              <span>{isSaved ? strings.settings.savedSuccess : strings.settings.saveSettings}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
