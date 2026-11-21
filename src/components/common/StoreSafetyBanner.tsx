import React from 'react';
import { ShieldCheck, ShieldAlert, AlertTriangle, ArrowRight, Play } from 'lucide-react';

interface StoreSafetyBannerProps {
  expiredCount: number;
  urgentCount: number;
  freshCount: number;
  atRiskValue: number;
  currency: string;
  onOpenExpiryTab: () => void;
  onTriggerDemoScenario: (scenario: 'expired_block' | 'barcode_test' | 'clearance') => void;
}

export const StoreSafetyBanner: React.FC<StoreSafetyBannerProps> = ({
  expiredCount,
  urgentCount,
  freshCount,
  atRiskValue,
  currency,
  onOpenExpiryTab,
  onTriggerDemoScenario,
}) => {
  const isAllSafe = expiredCount === 0;

  return (
    <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden mb-5">
      {/* Top Reassuring Safety Bar */}
      <div className={`px-4 py-3 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 ${
        isAllSafe 
          ? 'bg-emerald-50/80 dark:bg-emerald-950/40 border-b border-emerald-100 dark:border-emerald-900/60'
          : 'bg-amber-50/90 dark:bg-amber-950/50 border-b border-amber-200 dark:border-amber-900/60'
      }`}>
        <div className="flex items-center gap-3">
          <div className={`w-9 h-9 rounded-md flex items-center justify-center shrink-0 ${
            isAllSafe 
              ? 'bg-emerald-600 text-white' 
              : 'bg-amber-600 text-white'
          }`}>
            {isAllSafe ? (
              <ShieldCheck className="w-5 h-5" />
            ) : (
              <ShieldAlert className="w-5 h-5" />
            )}
          </div>

          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-xs sm:text-sm text-slate-900 dark:text-slate-100">
                {isAllSafe ? 'Store Safety Status: 100% Safe to Sell' : `Store Alert: ${expiredCount} Expired Batches Blocked`}
              </h3>
              <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                isAllSafe
                  ? 'bg-emerald-200/80 dark:bg-emerald-900 text-emerald-800 dark:text-emerald-200'
                  : 'bg-red-200 dark:bg-red-900 text-red-800 dark:text-red-200 animate-pulse'
              }`}>
                {isAllSafe ? 'Customer Protected' : 'Protected at Counter'}
              </span>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-300 mt-0.5">
              {isAllSafe 
                ? 'Zero expired goods on store shelves. Register is actively guarding customers.'
                : 'Expired items are kept aside in quarantine. The billing register will not allow selling them.'}
            </p>
          </div>
        </div>

        {/* Quick summary stats & Review button */}
        <div className="flex items-center gap-3 self-end sm:self-auto text-xs">
          {urgentCount > 0 && (
            <div className="hidden md:block text-right">
              <span className="text-slate-500 text-[11px] block">Expiring This Week</span>
              <span className="font-bold text-orange-600 dark:text-orange-400">
                {urgentCount} items ({currency}{atRiskValue.toFixed(0)})
              </span>
            </div>
          )}

          <button
            onClick={onOpenExpiryTab}
            className="px-3 py-1.5 rounded-md text-xs font-semibold flex items-center gap-1.5 transition-colors btn-3d-secondary bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-300 dark:border-slate-600"
          >
            <span>Check Expiry List</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Discrete Hackathon Showcase & Quick Demo Bar */}
      <div className="px-4 py-2 bg-slate-50/90 dark:bg-slate-900/40 flex flex-wrap items-center justify-between gap-2 text-xs">
        <div className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400 text-[11px] font-medium">
          <span className="w-2 h-2 rounded-full bg-brand-500" />
          <span className="font-bold text-slate-700 dark:text-slate-300">Hackathon Live Demo:</span>
          <span>Click to demonstrate key safety features instantly:</span>
        </div>

        <div className="flex items-center gap-1.5 flex-wrap">
          <button
            type="button"
            onClick={() => onTriggerDemoScenario('expired_block')}
            className="px-2 py-1 rounded bg-red-100 hover:bg-red-200 dark:bg-red-950/60 dark:hover:bg-red-900 text-red-800 dark:text-red-300 font-medium text-[11px] transition-colors border border-red-200 dark:border-red-800 flex items-center gap-1"
            title="Try adding an expired item to bill and see the safety lock"
          >
            <Play className="w-2.5 h-2.5" />
            <span>1. Test Expired Safety Alarm</span>
          </button>

          <button
            type="button"
            onClick={() => onTriggerDemoScenario('barcode_test')}
            className="px-2 py-1 rounded bg-blue-100 hover:bg-blue-200 dark:bg-blue-950/60 dark:hover:bg-blue-900 text-blue-800 dark:text-blue-300 font-medium text-[11px] transition-colors border border-blue-200 dark:border-blue-800 flex items-center gap-1"
            title="Test 1-second barcode scanner simulation"
          >
            <Play className="w-2.5 h-2.5" />
            <span>2. Test Barcode Ring-Up</span>
          </button>

          <button
            type="button"
            onClick={() => onTriggerDemoScenario('clearance')}
            className="px-2 py-1 rounded bg-emerald-100 hover:bg-emerald-200 dark:bg-emerald-950/60 dark:hover:bg-emerald-900 text-emerald-800 dark:text-emerald-300 font-medium text-[11px] transition-colors border border-emerald-200 dark:border-emerald-800 flex items-center gap-1"
            title="Show how shopkeeper quickly puts item on discount before it expires"
          >
            <Play className="w-2.5 h-2.5" />
            <span>3. Test Quick Sale Discount</span>
          </button>
        </div>
      </div>
    </div>
  );
};
