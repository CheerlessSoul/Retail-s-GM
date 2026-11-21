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
  ShieldAlert,
  AlertTriangle
} from 'lucide-react';
import type { ActiveTab } from '../../types';

interface NavbarProps {
  activeTab: ActiveTab;
  onTabChange: (tab: ActiveTab) => void;
  expiredCount: number;
  urgentExpiryCount: number;
  lowStockCount: number;
  onOpenPos: () => void;
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
  onOpenSettings,
  theme,
  onToggleTheme,
  shopName,
}) => {
  const totalExpiryBadge = expiredCount + urgentExpiryCount;

  return (
    <>
      {/* ======================================================== */}
      {/* DESKTOP & TABLET TOP NAVIGATION BAR (md and above)       */}
      {/* ======================================================== */}
      <header className="sticky top-0 z-30 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 transition-colors">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            
            {/* Logo and Shop Brand */}
            <div className="flex items-center space-x-3 cursor-pointer" onClick={() => onTabChange('products')}>
              <div className="w-9 h-9 rounded-xl bg-brand-600 text-white flex items-center justify-center font-bold text-lg shadow-sm">
                R
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="font-extrabold text-base tracking-tight text-slate-900 dark:text-slate-100">
                    Retail's GM
                  </span>
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-brand-100 dark:bg-brand-950/80 text-brand-700 dark:text-brand-300">
                    AI Retail
                  </span>
                </div>
                <p className="text-[11px] font-medium text-slate-400 dark:text-slate-400 truncate max-w-[180px]">
                  {shopName}
                </p>
              </div>
            </div>

            {/* Main Navigation (The 4 core features buttons) */}
            <nav className="hidden md:flex items-center space-x-1 lg:space-x-2">
              {/* 1. Product Management */}
              <button
                onClick={() => onTabChange('products')}
                className={`px-3.5 py-2 rounded-xl text-xs lg:text-sm font-semibold transition-all flex items-center gap-2 ${
                  activeTab === 'products'
                    ? 'bg-brand-50 text-brand-700 dark:bg-brand-950/60 dark:text-brand-300 ring-1 ring-brand-500/20'
                    : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                <Package className="w-4 h-4" />
                <span>1. Products</span>
              </button>

              {/* 2. Smart Expiry Management */}
              <button
                onClick={() => onTabChange('expiry')}
                className={`relative px-3.5 py-2 rounded-xl text-xs lg:text-sm font-semibold transition-all flex items-center gap-2 ${
                  activeTab === 'expiry'
                    ? 'bg-brand-50 text-brand-700 dark:bg-brand-950/60 dark:text-brand-300 ring-1 ring-brand-500/20'
                    : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                <Hourglass className="w-4 h-4" />
                <span>2. Smart Expiry</span>
                {totalExpiryBadge > 0 && (
                  <span
                    className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                      expiredCount > 0
                        ? 'bg-red-500 text-white animate-pulse'
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
                className={`relative px-3.5 py-2 rounded-xl text-xs lg:text-sm font-semibold transition-all flex items-center gap-2 ${
                  activeTab === 'inventory'
                    ? 'bg-brand-50 text-brand-700 dark:bg-brand-950/60 dark:text-brand-300 ring-1 ring-brand-500/20'
                    : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                <Boxes className="w-4 h-4" />
                <span>3. Inventory</span>
                {lowStockCount > 0 && (
                  <span className="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-amber-500 text-white">
                    {lowStockCount}
                  </span>
                )}
              </button>

              {/* 4. Business Analytics */}
              <button
                onClick={() => onTabChange('analytics')}
                className={`px-3.5 py-2 rounded-xl text-xs lg:text-sm font-semibold transition-all flex items-center gap-2 ${
                  activeTab === 'analytics'
                    ? 'bg-brand-50 text-brand-700 dark:bg-brand-950/60 dark:text-brand-300 ring-1 ring-brand-500/20'
                    : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                <TrendingUp className="w-4 h-4" />
                <span>4. Analytics</span>
              </button>
            </nav>

            {/* Quick Actions (POS, Dark Mode, Settings) */}
            <div className="flex items-center space-x-2">
              {/* Quick Sale Checkout Button */}
              <button
                onClick={onOpenPos}
                className="px-3.5 py-2 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-xs lg:text-sm font-bold transition-all flex items-center gap-1.5 shadow-sm active:scale-95"
              >
                <ShoppingBag className="w-4 h-4" />
                <span className="hidden sm:inline">Quick Sale</span>
              </button>

              {/* Night Mode Toggle */}
              <button
                onClick={onToggleTheme}
                className="p-2 rounded-xl text-slate-500 hover:text-slate-800 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                title="Toggle Dark / Light Mode"
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
                className="p-2 rounded-xl text-slate-500 hover:text-slate-800 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                title="Application Settings"
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
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-30 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-t border-slate-200 dark:border-slate-800 px-2 py-1 shadow-lg transition-colors">
        <div className="grid grid-cols-5 items-center">
          
          {/* 1. Products */}
          <button
            onClick={() => onTabChange('products')}
            className={`flex flex-col items-center justify-center py-1.5 rounded-xl transition-colors ${
              activeTab === 'products'
                ? 'text-brand-600 dark:text-brand-400 font-bold'
                : 'text-slate-500 dark:text-slate-400'
            }`}
          >
            <Package className="w-5 h-5" />
            <span className="text-[10px] mt-0.5">Products</span>
          </button>

          {/* 2. Expiry */}
          <button
            onClick={() => onTabChange('expiry')}
            className={`relative flex flex-col items-center justify-center py-1.5 rounded-xl transition-colors ${
              activeTab === 'expiry'
                ? 'text-brand-600 dark:text-brand-400 font-bold'
                : 'text-slate-500 dark:text-slate-400'
            }`}
          >
            <Hourglass className="w-5 h-5" />
            <span className="text-[10px] mt-0.5">Expiry</span>
            {totalExpiryBadge > 0 && (
              <span className="absolute top-1 right-3 w-4 h-4 rounded-full bg-red-500 text-white text-[9px] flex items-center justify-center font-bold">
                {totalExpiryBadge}
              </span>
            )}
          </button>

          {/* Quick Sale POS Center Button */}
          <button
            onClick={onOpenPos}
            className="flex flex-col items-center justify-center -mt-4 py-1"
          >
            <div className="w-12 h-12 rounded-full bg-brand-600 text-white flex items-center justify-center shadow-lg active:scale-95 transition-transform">
              <ShoppingBag className="w-6 h-6" />
            </div>
            <span className="text-[10px] font-bold text-brand-600 dark:text-brand-400 mt-0.5">
              Sale
            </span>
          </button>

          {/* 3. Inventory */}
          <button
            onClick={() => onTabChange('inventory')}
            className={`relative flex flex-col items-center justify-center py-1.5 rounded-xl transition-colors ${
              activeTab === 'inventory'
                ? 'text-brand-600 dark:text-brand-400 font-bold'
                : 'text-slate-500 dark:text-slate-400'
            }`}
          >
            <Boxes className="w-5 h-5" />
            <span className="text-[10px] mt-0.5">Stock</span>
            {lowStockCount > 0 && (
              <span className="absolute top-1 right-3 w-4 h-4 rounded-full bg-amber-500 text-white text-[9px] flex items-center justify-center font-bold">
                {lowStockCount}
              </span>
            )}
          </button>

          {/* 4. Analytics */}
          <button
            onClick={() => onTabChange('analytics')}
            className={`flex flex-col items-center justify-center py-1.5 rounded-xl transition-colors ${
              activeTab === 'analytics'
                ? 'text-brand-600 dark:text-brand-400 font-bold'
                : 'text-slate-500 dark:text-slate-400'
            }`}
          >
            <TrendingUp className="w-5 h-5" />
            <span className="text-[10px] mt-0.5">Profit</span>
          </button>
        </div>
      </nav>
    </>
  );
};
