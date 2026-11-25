import React, { useState, useEffect } from 'react';
import { 
  Sparkles, 
  RotateCw, 
  TrendingUp, 
  Hourglass, 
  Boxes, 
  ShieldCheck, 
  Lightbulb 
} from 'lucide-react';
import type { Product, ProductBatch, SaleTransaction } from '../../types';
import { useLanguage } from '../../i18n/LanguageContext';
import { generateSmartAnalyticsInsights } from '../../services/aiService';

interface AiBusinessAdvisorProps {
  products: Product[];
  batches: ProductBatch[];
  sales: SaleTransaction[];
  currency: string;
}

export const AiBusinessAdvisor: React.FC<AiBusinessAdvisorProps> = ({
  products,
  batches,
  sales,
  currency,
}) => {
  const { language } = useLanguage();
  const [isLoading, setIsLoading] = useState(false);
  const [insights, setInsights] = useState<Array<{ title: string; desc: string; type: 'profit' | 'expiry' | 'stock' | 'growth' }>>([]);

  const fetchInsights = async () => {
    setIsLoading(true);
    try {
      const result = await generateSmartAnalyticsInsights(products, batches, sales, currency, language);
      setInsights(result);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchInsights();
  }, [products.length, batches.length, sales.length, language]);

  const getCardIcon = (type: string) => {
    switch (type) {
      case 'profit':
        return { icon: TrendingUp, bg: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300', border: 'border-emerald-200 dark:border-emerald-900/60' };
      case 'expiry':
        return { icon: Hourglass, bg: 'bg-orange-100 text-orange-700 dark:bg-orange-950/60 dark:text-orange-300', border: 'border-orange-200 dark:border-orange-900/60' };
      case 'stock':
        return { icon: Boxes, bg: 'bg-blue-100 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300', border: 'border-blue-200 dark:border-blue-900/60' };
      default:
        return { icon: Lightbulb, bg: 'bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300', border: 'border-amber-200 dark:border-amber-900/60' };
    }
  };

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/90 dark:border-slate-800 shadow-sm p-4 sm:p-5 space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-brand-600 to-emerald-500 text-white flex items-center justify-center font-bold shrink-0 shadow-sm">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-sm sm:text-base text-slate-900 dark:text-slate-100 tracking-tight">
                {language === 'hi' ? 'दुकान AI बिज़नेस एडवाइज़र' : 'Retail AI Store Advisor'}
              </h3>
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-300 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300">
                Live Data Insights
              </span>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              {language === 'hi' 
                ? 'लाइव बिक्री, मार्जिन और एक्सपायरी के आधार पर स्वचालित व्यापारिक सुझाव'
                : 'Automated performance recommendations based on your store’s real-time sales, margins, and expiries.'}
            </p>
          </div>
        </div>

        <button
          onClick={fetchInsights}
          disabled={isLoading}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-750 text-slate-700 dark:text-slate-200 text-xs font-semibold transition-all shadow-sm disabled:opacity-50"
        >
          <RotateCw className={`w-3.5 h-3.5 text-brand-600 ${isLoading ? 'animate-spin' : ''}`} />
          <span>{isLoading ? (language === 'hi' ? 'विश्लेषण जारी...' : 'Analyzing...') : (language === 'hi' ? 'ताजा सुझाव लें' : 'Refresh Insights')}</span>
        </button>
      </div>

      {/* 3 Insight Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {insights.map((item, idx) => {
          const style = getCardIcon(item.type);
          const Icon = style.icon;

          return (
            <div
              key={`insight_${idx}`}
              className={`p-3.5 rounded-xl border ${style.border} bg-slate-50/50 dark:bg-slate-800/40 flex flex-col justify-between space-y-2.5 transition-all hover:shadow-sm`}
            >
              <div className="flex items-start gap-2.5">
                <div className={`w-7 h-7 rounded-lg ${style.bg} flex items-center justify-center shrink-0 mt-0.5`}>
                  <Icon className="w-3.5 h-3.5" />
                </div>
                <div>
                  <h4 className="font-bold text-xs text-slate-900 dark:text-slate-100">
                    {item.title}
                  </h4>
                  <p className="text-[11px] text-slate-600 dark:text-slate-300 mt-1 leading-relaxed">
                    {item.desc}
                  </p>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
