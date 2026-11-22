import React from 'react';
import { 
  Package, 
  Hourglass, 
  Boxes, 
  TrendingUp, 
  ShoppingBag, 
  Settings, 
  Moon, 
  Sun, 
  Plus, 
  FileSpreadsheet 
} from 'lucide-react';
import type { ActiveTab } from '../../types';
import { useLanguage } from '../../i18n/LanguageContext';

interface NavbarProps {
  activeTab: ActiveTab;
  onTabChange: (tab: ActiveTab) => void;
  expiredCount: number;
  urgentExpiryCount: number;
  lowStockCount: number;
  onOpenPos: () => void;
  onOpenAddProduct?: () => void;
  onOpenImportSheet?: () => void;
  onOpenSettings: () => void;
  theme: 'light' | 'dark';
  onToggleTheme: () => void;
  shopName: string;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  onTabChange,
  expiredCount,
  urgentExpiryCount,
  lowStockCount,
  onOpenPos,
  onOpenAddProduct,
  onOpenImportSheet,
  onOpenSettings,
  theme,
  onToggleTheme,
  shopName,
}) => {
  const { strings } = useLanguage();
  const totalExpiryBadge = expiredCount + urgentExpiryCount;

  return (
    <>
      {/* ======================================================== */}
      {/* DESKTOP & TABLET TOP NAVIGATION BAR (md and above)       */}
      {/* ======================================================== */}
      <header className="sticky top-0 z-30 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 transition-colors shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            
            {/* Logo and Shop Brand */}
            <div className="flex items-center space-x-3 cursor-pointer shrink-0" onClick={() => onTabChange('products')}>
              <div className="w-9 h-9 rounded-lg bg-brand-600 text-white flex items-center justify-center font-extrabold text-base shadow-sm">
                R
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="font-bold text-sm sm:text-base tracking-tight text-slate-900 dark:text-slate-100">
                    {strings.nav.brand}
                  </span>
                  <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded border border-emerald-300 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300">
                    {strings.nav.manager}
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate max-w-[180px]">
                  {shopName || strings.nav.myStore}
                </p>
              </div>
            </div>

            {/* Main Navigation (The 4 core features buttons) */}
            <nav className="hidden md:flex items-center space-x-1">
              {/* 1. Product Management */}
              <button
                onClick={() => onTabChange('products')}
                className={`px-3 py-1.5 rounded-md text-xs lg:text-sm font-semibold transition-all flex items-center gap-1.5 border ${
                  activeTab === 'products'
                    ? 'bg-brand-50 text-brand-700 border-brand-300 dark:bg-brand-950/60 dark:text-brand-300 dark:border-brand-800'
                    : 'border-transparent text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                <Package className="w-4 h-4 text-brand-600 dark:text-brand-400" />
                <span>{strings.nav.productsTab}</span>
              </button>

              {/* 2. Expiry Management */}
              <button
                onClick={() => onTabChange('expiry')}
                className={`relative px-3 py-1.5 rounded-md text-xs lg:text-sm font-semibold transition-all flex items-center gap-1.5 border ${
                  activeTab === 'expiry'
                    ? 'bg-brand-50 text-brand-700 border-brand-300 dark:bg-brand-950/60 dark:text-brand-300 dark:border-brand-800'
                    : 'border-transparent text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                <Hourglass className="w-4 h-4 text-orange-600 dark:text-orange-400" />
                <span>{strings.nav.expiryTab}</span>
                {totalExpiryBadge > 0 && (
                  <span
                    className={`px-1.5 py-0.2 rounded text-[10px] font-bold ${
                      expiredCount > 0
                        ? 'bg-red-600 text-white'
                        : 'bg-orange-500 text-white'
                    }`}
                  >
                    {totalExpiryBadge}
                  </span>
                )}
              </button>

              {/* 3. Inventory Management */}
              <button
                onClick={() => onTabChange('inventory')}
                className={`relative px-3 py-1.5 rounded-md text-xs lg:text-sm font-semibold transition-all flex items-center gap-1.5 border ${
                  activeTab === 'inventory'
                    ? 'bg-brand-50 text-brand-700 border-brand-300 dark:bg-brand-950/60 dark:text-brand-300 dark:border-brand-800'
                    : 'border-transparent text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                <Boxes className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                <span>{strings.nav.stockTab}</span>
                {lowStockCount > 0 && (
                  <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-amber-500 text-white">
                    {lowStockCount}
                  </span>
                )}
              </button>

              {/* 4. Business Analytics */}
              <button
                onClick={() => onTabChange('analytics')}
                className={`px-3 py-1.5 rounded-md text-xs lg:text-sm font-semibold transition-all flex items-center gap-1.5 border ${
                  activeTab === 'analytics'
                    ? 'bg-brand-50 text-brand-700 border-brand-300 dark:bg-brand-950/60 dark:text-brand-300 dark:border-brand-800'
                    : 'border-transparent text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                <TrendingUp className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                <span>{strings.nav.analyticsTab}</span>
              </button>
            </nav>

            {/* Quick Actions (Add Product, Import Sheet, POS, Dark Mode, Settings) */}
            <div className="flex items-center space-x-1.5 sm:space-x-2">
              {onOpenAddProduct && (
                <button
                  onClick={onOpenAddProduct}
                  className="px-2.5 py-1.5 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/60 dark:hover:bg-emerald-900 text-emerald-800 dark:text-emerald-200 border border-emerald-300 dark:border-emerald-800 rounded-md text-xs font-semibold flex items-center gap-1 transition-colors shadow-sm"
                  title={strings.nav.addProduct}
                >
                  <Plus className="w-3.5 h-3.5 text-brand-600 dark:text-brand-400" />
                  <span className="hidden sm:inline">{strings.nav.addProduct}</span>
                </button>
              )}

              {onOpenImportSheet && (
                <button
                  onClick={onOpenImportSheet}
                  className="hidden md:flex px-2.5 py-1.5 bg-white hover:bg-slate-50 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-300 dark:border-slate-700 rounded-md text-xs font-semibold items-center gap-1 transition-colors shadow-sm"
                  title="Import Excel or Google Sheets (CSV)"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                  <span>{strings.nav.importSheet}</span>
                </button>
              )}

              {/* Quick Sale Checkout Button */}
              <button
                onClick={onOpenPos}
                className="px-3 py-1.5 bg-brand-600 hover:bg-brand-700 text-white rounded-md text-xs lg:text-sm font-bold transition-all flex items-center gap-1.5 btn-3d-brand"
                title="Open POS Register / Billing Counter (Space or F2)"
              >
                <ShoppingBag className="w-4 h-4" />
                <span className="hidden sm:inline">{strings.nav.billingBtn}</span>
                <span className="hidden lg:inline text-[10px] opacity-80 bg-brand-700 px-1 py-0.5 rounded">{strings.nav.spaceHint}</span>
              </button>

              {/* Night Mode Toggle */}
              <button
                onClick={onToggleTheme}
                className="p-1.5 rounded-md text-slate-500 hover:text-slate-800 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors border border-transparent hover:border-slate-200 dark:hover:border-slate-700"
                title={strings.nav.toggleTheme}
              >
                {theme === 'dark' ? (
                  <Sun className="w-4 h-4 text-amber-400" />
                ) : (
                  <Moon className="w-4 h-4" />
                )}
              </button>

              {/* Settings */}
              <button
                onClick={onOpenSettings}
                className="p-1.5 rounded-md text-slate-500 hover:text-slate-800 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors border border-transparent hover:border-slate-200 dark:hover:border-slate-700"
                title={strings.nav.settingsBtn}
              >
                <Settings className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* ======================================================== */}
      {/* MOBILE BOTTOM NAVIGATION BAR (for phones/small screens)  */}
      {/* ======================================================== */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-30 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 px-2 py-1 shadow-md transition-colors">
        <div className="grid grid-cols-5 items-center">
          
          {/* 1. Products */}
          <button
            onClick={() => onTabChange('products')}
            className={`flex flex-col items-center justify-center py-1.5 transition-colors ${
              activeTab === 'products'
                ? 'text-brand-600 dark:text-brand-400 font-bold'
                : 'text-slate-500 dark:text-slate-400'
            }`}
          >
            <Package className="w-5 h-5" />
            <span className="text-[10px] mt-0.5">{strings.nav.mobProducts}</span>
          </button>

          {/* 2. Expiry */}
          <button
            onClick={() => onTabChange('expiry')}
            className={`relative flex flex-col items-center justify-center py-1.5 transition-colors ${
              activeTab === 'expiry'
                ? 'text-brand-600 dark:text-brand-400 font-bold'
                : 'text-slate-500 dark:text-slate-400'
            }`}
          >
            <Hourglass className="w-5 h-5" />
            <span className="text-[10px] mt-0.5">{strings.nav.mobExpiry}</span>
            {totalExpiryBadge > 0 && (
              <span className="absolute top-1 right-3 w-4 h-4 rounded-full bg-red-600 text-white text-[9px] flex items-center justify-center font-bold">
                {totalExpiryBadge}
              </span>
            )}
          </button>

          {/* Quick Sale POS Center Button */}
          <button
            onClick={onOpenPos}
            className="flex flex-col items-center justify-center -mt-3 py-1"
          >
            <div className="w-10 h-10 rounded-lg bg-brand-600 text-white flex items-center justify-center btn-3d-brand shadow-md">
              <ShoppingBag className="w-5 h-5" />
            </div>
            <span className="text-[10px] font-bold text-brand-600 dark:text-brand-400 mt-0.5">
              {strings.nav.mobGalla}
            </span>
          </button>

          {/* 3. Inventory */}
          <button
            onClick={() => onTabChange('inventory')}
            className={`relative flex flex-col items-center justify-center py-1.5 transition-colors ${
              activeTab === 'inventory'
                ? 'text-brand-600 dark:text-brand-400 font-bold'
                : 'text-slate-500 dark:text-slate-400'
            }`}
          >
            <Boxes className="w-5 h-5" />
            <span className="text-[10px] mt-0.5">{strings.nav.mobStock}</span>
            {lowStockCount > 0 && (
              <span className="absolute top-1 right-3 w-4 h-4 rounded-full bg-amber-500 text-white text-[9px] flex items-center justify-center font-bold">
                {lowStockCount}
              </span>
            )}
          </button>

          {/* 4. Analytics */}
          <button
            onClick={() => onTabChange('analytics')}
            className={`flex flex-col items-center justify-center py-1.5 transition-colors ${
              activeTab === 'analytics'
                ? 'text-brand-600 dark:text-brand-400 font-bold'
                : 'text-slate-500 dark:text-slate-400'
            }`}
          >
            <TrendingUp className="w-5 h-5" />
            <span className="text-[10px] mt-0.5">{strings.nav.mobHisab}</span>
          </button>
        </div>
      </nav>
    </>
  );
};
