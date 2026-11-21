import React, { useState } from 'react';
import { 
  X, 
  Moon, 
  Sun, 
  Volume2, 
  VolumeX, 
  Download, 
  Upload, 
  RefreshCcw, 
  Store, 
  Check, 
  ShieldCheck 
} from 'lucide-react';
import type { ShopSettings } from '../../types';
import { db } from '../../db';
import { initializeDatabase } from '../../db/seedData';

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
  const [shopName, setShopName] = useState(settings.shopName);
  const [ownerName, setOwnerName] = useState(settings.ownerName);
  const [phone, setPhone] = useState(settings.phone);
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
      shopName: shopName.trim(),
      ownerName: ownerName.trim(),
      phone: phone.trim(),
      currency,
      urgentExpiryDays: Number(urgentExpiryDays) || 7,
      warningExpiryDays: Number(warningExpiryDays) || 30,
      theme,
      soundEnabled,
    };
    await onSaveSettings(updated);
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

  const handleResetData = async () => {
    if (window.confirm('Reset database to default demonstration inventory? This will restore sample retail products, batches, and sales.')) {
      await db.products.clear();
      await db.batches.clear();
      await db.stockHistory.clear();
      await db.sales.clear();
      await initializeDatabase();
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
                Application Settings
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Configure shop profile, dark mode, alert rules, and data backups.
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
          
          {/* Theme & Display Mode */}
          <div className="p-3.5 bg-slate-50 dark:bg-slate-900/50 rounded-md border border-slate-200 dark:border-slate-700 space-y-2.5">
            <h3 className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">
              Display & Night Mode
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
                <span>Green + White (Day)</span>
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
                <span>Night / Dark Mode</span>
              </button>
            </div>

            {/* Sound toggle */}
            <div className="flex items-center justify-between pt-2 border-t border-slate-200 dark:border-slate-700 text-xs">
              <span className="text-slate-700 dark:text-slate-300 font-medium">
                Audio Beeps (Scanner & Sales feedback)
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
                <span>{soundEnabled ? 'Enabled' : 'Muted'}</span>
              </button>
            </div>
          </div>

          {/* Shop Profile */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">
              Store Profile
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-slate-600 dark:text-slate-400 mb-1">
                  Shop Name
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
                  Owner / Manager Name
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
                  Phone / Mobile
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
                  Currency Symbol
                </label>
                <select
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100"
                >
                  <option value="₹">₹ (Indian Rupee - INR)</option>
                  <option value="$">$ (US Dollar - USD)</option>
                  <option value="€">€ (Euro - EUR)</option>
                  <option value="£">£ (British Pound - GBP)</option>
                  <option value="AED">AED (UAE Dirham)</option>
                </select>
              </div>
            </div>
          </div>

          {/* Expiry Alert Thresholds */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">
              Expiry Notification Thresholds
            </h3>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-slate-600 dark:text-slate-400 mb-1">
                  Urgent Warning (Days)
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
                  Upcoming Warning (Days)
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

          {/* Backup, Export & Reset */}
          <div className="pt-3 border-t border-slate-200 dark:border-slate-700 space-y-3">
            <h3 className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">
              Data Management & Backup
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <button
                type="button"
                onClick={handleExportBackup}
                className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-800 dark:text-slate-100 rounded-md text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors border border-slate-300 dark:border-slate-600"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Export JSON</span>
              </button>

              <label className="cursor-pointer px-3 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-800 dark:text-slate-100 rounded-md text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors border border-slate-300 dark:border-slate-600">
                <Upload className="w-3.5 h-3.5" />
                <span>Restore Backup</span>
                <input
                  type="file"
                  accept=".json"
                  className="hidden"
                  onChange={handleImportBackup}
                />
              </label>

              <button
                type="button"
                onClick={handleResetData}
                className="px-3 py-1.5 bg-red-50 hover:bg-red-100 dark:bg-red-950/40 text-red-700 dark:text-red-300 rounded-md text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors border border-red-200 dark:border-red-800"
              >
                <RefreshCcw className="w-3.5 h-3.5" />
                <span>Reset Demo</span>
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
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 text-xs font-semibold text-white bg-brand-600 hover:bg-brand-700 rounded-lg transition-colors flex items-center gap-1 shadow-sm"
            >
              {isSaved ? <Check className="w-4 h-4" /> : null}
              <span>{isSaved ? 'Saved!' : 'Save Settings'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
