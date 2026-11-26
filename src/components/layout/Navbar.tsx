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
  Sparkles,
  Barcode
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
  onLoadDemoData?: () => void;
  onOpenSettings: () => void;
  onOpenScannerHub?: () => void;
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
  onLoadDemoData,
  onOpenSettings,
  onOpenScannerHub,
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
      {/* Sleek, minimal floating header with generous spacing     */}
      {/* ======================================================== */}
      <header className="sticky top-0 z-30 pt-2.5 sm:pt-3.5 pb-2 px-3 sm:px-6 lg:px-8 bg-slate-50/90 dark:bg-[#0b1320]/90 backdrop-blur-md transition-all">
        <div className="max-w-7xl mx-auto bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-2xl shadow-sm px-3.5 sm:px-5">
          <div className="flex items-center justify-between h-14 sm:h-16 gap-3 flex-nowrap w-full">
            
            {/* Logo and Shop Brand */}
            <div className="flex items-center space-x-2.5 cursor-pointer shrink-0" onClick={() => onTabChange('products')}>
              <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-brand-600 text-white flex items-center justify-center font-black text-sm sm:text-base shadow-sm shrink-0">
                R
              </div>
              <div className="shrink-0">
                <div className="flex items-center gap-1.5">
                  <span className="font-bold text-xs sm:text-sm lg:text-base tracking-tight text-slate-900 dark:text-slate-100 whitespace-nowrap">
                    {strings.nav.brand}
                  </span>
                  <span className="text-[10px] font-semibold px-1.5 py-0.2 rounded border border-emerald-300 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 whitespace-nowrap">
                    {strings.nav.manager}
                  </span>
                </div>
                <p className="text-[10px] sm:text-[11px] text-slate-500 dark:text-slate-400 truncate max-w-[120px] sm:max-w-[180px]">
                  {shopName || strings.nav.myStore}
                </p>
              </div>
            </div>

            {/* Core Feature Tabs (The 4 Pillars) */}
            <nav className="hidden md:flex items-center space-x-1 shrink-0">
              {/* 1. Products */}
              <button
                onClick={() => onTabChange('products')}
                className={`px-3 py-1.5 rounded-xl text-xs lg:text-sm font-semibold transition-all flex items-center gap-1.5 border whitespace-nowrap shrink-0 ${
                  activeTab === 'products'
                    ? 'bg-brand-50 text-brand-700 border-brand-300 dark:bg-brand-950/60 dark:text-brand-300 dark:border-brand-800 shadow-sm'
                    : 'border-transparent text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                <Package className="w-4 h-4 text-brand-600 dark:text-brand-400 shrink-0" />
                <span className="whitespace-nowrap">{strings.nav.productsTab}</span>
              </button>

              {/* 2. Expiry Control */}
              <button
                onClick={() => onTabChange('expiry')}
                className={`relative px-3 py-1.5 rounded-xl text-xs lg:text-sm font-semibold transition-all flex items-center gap-1.5 border whitespace-nowrap shrink-0 ${
                  activeTab === 'expiry'
                    ? 'bg-brand-50 text-brand-700 border-brand-300 dark:bg-brand-950/60 dark:text-brand-300 dark:border-brand-800 shadow-sm'
                    : 'border-transparent text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                <Hourglass className="w-4 h-4 text-orange-600 dark:text-orange-400 shrink-0" />
                <span className="whitespace-nowrap">{strings.nav.expiryTab}</span>
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

              {/* 3. Inventory Stock */}
              <button
                onClick={() => onTabChange('inventory')}
                className={`relative px-3 py-1.5 rounded-xl text-xs lg:text-sm font-semibold transition-all flex items-center gap-1.5 border whitespace-nowrap shrink-0 ${
                  activeTab === 'inventory'
                    ? 'bg-brand-50 text-brand-700 border-brand-300 dark:bg-brand-950/60 dark:text-brand-300 dark:border-brand-800 shadow-sm'
                    : 'border-transparent text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                <Boxes className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
                <span className="whitespace-nowrap">{strings.nav.stockTab}</span>
                {lowStockCount > 0 && (
                  <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-amber-500 text-white">
                    {lowStockCount}
                  </span>
                )}
              </button>

              {/* 4. Sales & Profit Hisab */}
              <button
                onClick={() => onTabChange('analytics')}
                className={`px-3 py-1.5 rounded-xl text-xs lg:text-sm font-semibold transition-all flex items-center gap-1.5 border whitespace-nowrap shrink-0 ${
                  activeTab === 'analytics'
                    ? 'bg-brand-50 text-brand-700 border-brand-300 dark:bg-brand-950/60 dark:text-brand-300 dark:border-brand-800 shadow-sm'
                    : 'border-transparent text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                <TrendingUp className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                <span className="whitespace-nowrap">{strings.nav.analyticsTab}</span>
              </button>
            </nav>

            {/* Quick Actions (POS Counter, Demo Switch, Theme, Settings) */}
            <div className="flex items-center space-x-1.5 sm:space-x-2 shrink-0">
              {onLoadDemoData && (
                <button
                  onClick={onLoadDemoData}
                  className="px-2.5 py-1.5 text-xs font-semibold text-emerald-700 dark:text-emerald-300 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/60 dark:hover:bg-emerald-900 border border-emerald-300 dark:border-emerald-800 rounded-xl transition-all flex items-center gap-1 shadow-sm whitespace-nowrap shrink-0"
                  title="Load 1-Click Kirana Demo with realistic products, expiries and sales"
                >
                  <Sparkles className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                  <span className="hidden sm:inline whitespace-nowrap">Demo Store</span>
                </button>
              )}

              {/* Hardware Barcode Scanner Status / Hub */}
              {onOpenScannerHub && (
                <button
                  onClick={onOpenScannerHub}
                  className="px-2.5 py-1.5 text-xs font-semibold text-emerald-800 dark:text-emerald-200 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/60 dark:hover:bg-emerald-900 border border-emerald-300 dark:border-emerald-800 rounded-xl transition-all flex items-center gap-1.5 shadow-sm whitespace-nowrap shrink-0"
                  title="Connect Barcode Scanner and Sync Sales"
                >
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shrink-0" />
                  <Barcode className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                  <span className="hidden xl:inline whitespace-nowrap">Scanner Ready</span>
                </button>
              )}

              {/* Quick Sale Checkout Register (Galla) */}
              <button
                onClick={onOpenPos}
                className="px-3 sm:px-3.5 py-1.5 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-xs lg:text-sm font-bold transition-all flex items-center gap-1.5 btn-3d-brand whitespace-nowrap shrink-0 shadow-sm"
                title="Open POS Register / Billing Counter (Space or F2)"
              >
                <ShoppingBag className="w-4 h-4 shrink-0" />
                <span className="whitespace-nowrap">{strings.nav.billingBtn}</span>
                <span className="hidden lg:inline text-[10px] opacity-80 bg-brand-700 px-1 py-0.5 rounded whitespace-nowrap">Space</span>
              </button>

              {/* Dark / Light Mode Toggle */}
              <button
                onClick={onToggleTheme}
                className="p-1.5 rounded-xl text-slate-500 hover:text-slate-800 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors border border-transparent hover:border-slate-200 dark:hover:border-slate-700 shrink-0"
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
                className="p-1.5 rounded-xl text-slate-500 hover:text-slate-800 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors border border-transparent hover:border-slate-200 dark:hover:border-slate-700 shrink-0"
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
            <span className="text-[10px] mt-0.5 whitespace-nowrap">{strings.nav.mobProducts}</span>
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
            <span className="text-[10px] mt-0.5 whitespace-nowrap">{strings.nav.mobExpiry}</span>
            {totalExpiryBadge > 0 && (
              <span className="absolute top-1 right-2 px-1 py-0.2 rounded-full text-[9px] font-bold bg-red-600 text-white">
                {totalExpiryBadge}
              </span>
            )}
          </button>

          {/* 3. Quick Sale / Galla (Center action) */}
          <button
            onClick={onOpenPos}
            className="flex flex-col items-center justify-center -mt-3.5 bg-brand-600 text-white p-2.5 rounded-full shadow-lg border-2 border-white dark:border-slate-900 transition-transform active:scale-95"
          >
            <ShoppingBag className="w-5 h-5" />
            <span className="text-[9px] mt-0.5 font-bold whitespace-nowrap">{strings.nav.mobGalla}</span>
          </button>

          {/* 4. Stock / Inventory */}
          <button
            onClick={() => onTabChange('inventory')}
            className={`relative flex flex-col items-center justify-center py-1.5 transition-colors ${
              activeTab === 'inventory'
                ? 'text-brand-600 dark:text-brand-400 font-bold'
                : 'text-slate-500 dark:text-slate-400'
            }`}
          >
            <Boxes className="w-5 h-5" />
            <span className="text-[10px] mt-0.5 whitespace-nowrap">{strings.nav.mobStock}</span>
            {lowStockCount > 0 && (
              <span className="absolute top-1 right-2 px-1 py-0.2 rounded-full text-[9px] font-bold bg-amber-500 text-white">
                {lowStockCount}
              </span>
            )}
          </button>

          {/* 5. Business Analytics (Hisab) */}
          <button
            onClick={() => onTabChange('analytics')}
            className={`flex flex-col items-center justify-center py-1.5 transition-colors ${
              activeTab === 'analytics'
                ? 'text-brand-600 dark:text-brand-400 font-bold'
                : 'text-slate-500 dark:text-slate-400'
            }`}
          >
            <TrendingUp className="w-5 h-5" />
            <span className="text-[10px] mt-0.5 whitespace-nowrap">{strings.nav.mobHisab}</span>
          </button>
        </div>
      </nav>
    </>
  );
};
