import React, { useState, useMemo } from 'react';
import { 
  TrendingUp, 
  DollarSign, 
  ShoppingBag, 
  Award, 
  Calendar, 
  BarChart3, 
  PieChart, 
  Boxes,
  Download,
  CheckCircle2,
  Receipt
} from 'lucide-react';
import {
  ResponsiveContainer,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  PieChart as RechartsPie,
  Pie,
  Cell,
  CartesianGrid,
  AreaChart,
  Area,
} from 'recharts';
import type { SaleTransaction, Product, ProductBatch } from '../../types';
import { useLanguage } from '../../i18n/LanguageContext';

interface AnalyticsDashboardProps {
  sales: SaleTransaction[];
  products: Product[];
  batches: ProductBatch[];
  currency: string;
}

export const AnalyticsDashboard: React.FC<AnalyticsDashboardProps> = ({
  sales,
  products,
  batches,
  currency,
}) => {
  const { strings } = useLanguage();
  const [timeRange, setTimeRange] = useState<'today' | '7days' | 'month' | 'all'>('today');

  // Filter sales based on selected timeRange
  const filteredSales = useMemo(() => {
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    return sales.filter((s) => {
      const saleDate = new Date(s.timestamp);
      if (timeRange === 'today') {
        return saleDate >= startOfToday;
      }
      if (timeRange === '7days') {
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        sevenDaysAgo.setHours(0, 0, 0, 0);
        return saleDate >= sevenDaysAgo;
      }
      if (timeRange === 'month') {
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        return saleDate >= startOfMonth;
      }
      return true; // 'all'
    });
  }, [sales, timeRange]);

  // Aggregate Metrics for Selected Period
  const totalSalesRevenue = filteredSales.reduce((acc, s) => acc + s.totalAmount, 0);
  const totalCostExpenses = filteredSales.reduce((acc, s) => acc + s.totalCost, 0);
  const totalEstimatedProfit = filteredSales.reduce((acc, s) => acc + s.totalProfit, 0);
  const totalOrders = filteredSales.length;
  const avgOrderValue = totalOrders > 0 ? totalSalesRevenue / totalOrders : 0;
  const profitMarginPercent = totalSalesRevenue > 0 ? Math.round((totalEstimatedProfit / totalSalesRevenue) * 100) : 0;

  // Always compute Today's live numbers for top summary banner
  const todayMetrics = useMemo(() => {
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const todaySales = sales.filter((s) => new Date(s.timestamp) >= startOfToday);
    const revenue = todaySales.reduce((acc, s) => acc + s.totalAmount, 0);
    const profit = todaySales.reduce((acc, s) => acc + s.totalProfit, 0);
    const bills = todaySales.length;
    return { revenue, profit, bills };
  }, [sales]);

  // Total Store Inventory Valuation
  const { totalInventoryValue, totalStockUnits } = useMemo(() => {
    let value = 0;
    let units = 0;
    batches.forEach((b) => {
      if (b.quantity <= 0 || b.status === 'disposed') return;
      const p = products.find((prod) => prod.id === b.productId);
      if (p) {
        value += p.sellingPrice * b.quantity;
      }
      units += b.quantity;
    });
    return { totalInventoryValue: value, totalStockUnits: units };
  }, [batches, products]);

  // Best-Selling Products aggregation
  const bestSellers = useMemo(() => {
    const map: Record<string, { name: string; quantity: number; revenue: number; profit: number }> = {};

    filteredSales.forEach((sale) => {
      sale.items.forEach((item) => {
        if (!map[item.productId]) {
          map[item.productId] = {
            name: item.productName,
            quantity: 0,
            revenue: 0,
            profit: 0,
          };
        }
        map[item.productId].quantity += item.quantity;
        map[item.productId].revenue += item.totalPrice;
        map[item.productId].profit += item.profit;
      });
    });

    return Object.values(map)
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, 5);
  }, [filteredSales]);

  // Trend Data for Chart (grouped by date)
  const trendData = useMemo(() => {
    const dateMap: Record<string, { date: string; displayDate: string; revenue: number; profit: number; cost: number }> = {};

    filteredSales.forEach((sale) => {
      const d = new Date(sale.timestamp);
      const key = d.toISOString().split('T')[0];
      const displayDate = d.toLocaleDateString('en-IN', { month: 'short', day: 'numeric' });

      if (!dateMap[key]) {
        dateMap[key] = { date: key, displayDate, revenue: 0, profit: 0, cost: 0 };
      }
      dateMap[key].revenue += sale.totalAmount;
      dateMap[key].profit += sale.totalProfit;
      dateMap[key].cost += sale.totalCost;
    });

    return Object.values(dateMap).sort((a, b) => a.date.localeCompare(b.date));
  }, [filteredSales]);

  // Category Distribution Data
  const categoryData = useMemo(() => {
    const catMap: Record<string, number> = {};

    filteredSales.forEach((sale) => {
      sale.items.forEach((item) => {
        const prod = products.find((p) => p.id === item.productId);
        const cat = prod?.category || 'General';
        catMap[cat] = (catMap[cat] || 0) + item.totalPrice;
      });
    });

    const colors = ['#059669', '#10B981', '#34D399', '#6EE7B7', '#A7F3D0', '#3B82F6', '#8B5CF6'];
    return Object.entries(catMap).map(([name, value], i) => ({
      name,
      value,
      color: colors[i % colors.length],
    }));
  }, [filteredSales, products]);

  const handleExportSalesCsv = () => {
    if (filteredSales.length === 0) return;
    const headers = ['Sale ID', 'Date & Time', 'Receipt #', 'Customer Name', 'Payment Method', 'Items Count', 'Total Sales Amount', 'Cost of Goods', 'Estimated Profit'];
    const rows = filteredSales.map((s) => [
      `"${s.id}"`,
      `"${new Date(s.timestamp).toLocaleString('en-IN')}"`,
      `"${s.receiptNumber}"`,
      `"${s.customerName || 'Walk-in'}"`,
      `"${s.paymentMethod.toUpperCase()}"`,
      s.items.reduce((acc, i) => acc + i.quantity, 0),
      s.totalAmount.toFixed(2),
      s.totalCost.toFixed(2),
      s.totalProfit.toFixed(2),
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `retails_gm_sales_report_${timeRange}_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getTimeRangeLabel = () => {
    switch (timeRange) {
      case 'today': return strings.analytics.rangeToday;
      case '7days': return strings.analytics.range7days;
      case 'month': return strings.analytics.rangeMonth;
      case 'all': return strings.analytics.rangeAll;
    }
  };

  return (
    <div className="space-y-6">
      {/* 1. Header & Filters */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pb-3 border-b border-slate-200 dark:border-slate-800">
        <div>
          <h1 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">
            {strings.analytics.title}
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {strings.analytics.subtitle}
          </p>
        </div>

        {/* Action Controls & Time Filters */}
        <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
          <button
            onClick={handleExportSalesCsv}
            disabled={filteredSales.length === 0}
            title="Download Sales & Profit Report as CSV"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:text-brand-600 dark:hover:text-brand-400 btn-3d-secondary text-xs disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
          >
            <Download className="w-3.5 h-3.5 text-brand-600 dark:text-brand-400" />
            <span className="font-semibold">{strings.analytics.exportCsv}</span>
          </button>

          {/* Time Filter Tabs */}
          <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-0.5 rounded-md text-xs border border-slate-200 dark:border-slate-700">
            {[
              { id: 'today', label: strings.analytics.rangeToday },
              { id: '7days', label: strings.analytics.range7days },
              { id: 'month', label: strings.analytics.rangeMonth },
              { id: 'all', label: strings.analytics.rangeAll },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setTimeRange(tab.id as typeof timeRange)}
                className={`px-2.5 py-1 rounded text-xs transition-all ${
                  timeRange === tab.id
                    ? 'bg-white dark:bg-slate-700 text-brand-700 dark:text-brand-300 shadow-sm font-semibold'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* 2. Top Plain-Language Verdict Banner */}
      <div className="p-4 sm:p-5 rounded-xl border border-emerald-200 dark:border-emerald-900/60 bg-emerald-50/80 dark:bg-emerald-950/30 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 card-3d">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-lg bg-emerald-600 text-white flex items-center justify-center font-bold shrink-0 mt-0.5 shadow-sm">
            <TrendingUp className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm sm:text-base font-extrabold text-emerald-950 dark:text-emerald-100">
                {strings.analytics.todaySummaryTitle}
              </h2>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-200 dark:bg-emerald-900 text-emerald-800 dark:text-emerald-200">
                {strings.analytics.liveCounter}
              </span>
            </div>
            <p className="text-xs sm:text-sm text-emerald-800 dark:text-emerald-300 mt-1">
              {todayMetrics.revenue > 0 ? (
                <>
                  {strings.analytics.todaySummarySales}
                  <strong className="font-bold underline">{currency}{todayMetrics.revenue.toFixed(2)}</strong>
                  {strings.analytics.todaySummaryProfit}
                  <strong className="font-bold text-emerald-700 dark:text-emerald-200 underline">+{currency}{todayMetrics.profit.toFixed(2)}</strong>
                  {strings.analytics.todaySummaryBills.replace('{bills}', String(todayMetrics.bills))}
                </>
              ) : (
                <>{strings.analytics.todaySummaryEmpty}</>
              )}
            </p>
          </div>
        </div>

        {/* Today's Mini Metrics Pills */}
        <div className="flex items-center gap-2 shrink-0 self-stretch sm:self-auto justify-end">
          <div className="px-3 py-1.5 rounded-lg bg-white dark:bg-slate-900 border border-emerald-200 dark:border-emerald-800 text-center shadow-sm">
            <div className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">{strings.analytics.todaySalesPill}</div>
            <div className="text-xs sm:text-sm font-bold text-slate-900 dark:text-slate-100">
              {currency}{todayMetrics.revenue.toFixed(2)}
            </div>
          </div>
          <div className="px-3 py-1.5 rounded-lg bg-emerald-600 text-white text-center shadow-sm">
            <div className="text-[10px] text-emerald-100 font-medium">{strings.analytics.todayProfitPill}</div>
            <div className="text-xs sm:text-sm font-bold">
              +{currency}{todayMetrics.profit.toFixed(2)}
            </div>
          </div>
        </div>
      </div>

      {/* 3. Four Crystal-Clear Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Total Sales */}
        <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 p-4 sm:p-5 card-3d flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                {strings.analytics.cardTotalSales}
              </span>
              <DollarSign className="w-4 h-4 text-brand-600 dark:text-brand-400" />
            </div>
            <div className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-slate-100 mt-1">
              {currency}{totalSalesRevenue.toFixed(2)}
            </div>
          </div>
          <div className="pt-2.5 mt-2.5 border-t border-slate-100 dark:border-slate-700/80 text-[11px] text-slate-500 dark:text-slate-400 flex items-center justify-between">
            <span>{getTimeRangeLabel()}</span>
            <span className="font-semibold text-slate-700 dark:text-slate-300">
              {strings.analytics.fromBills.replace('{orders}', String(totalOrders))}
            </span>
          </div>
        </div>

        {/* Card 2: Net Profit */}
        <div className="bg-white dark:bg-slate-800 rounded-lg border border-emerald-300 dark:border-emerald-800 p-4 sm:p-5 card-3d flex flex-col justify-between bg-gradient-to-b from-white to-emerald-50/30 dark:from-slate-800 dark:to-emerald-950/20">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">
                {strings.analytics.cardNetProfit}
              </span>
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-100 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                {profitMarginPercent}% {strings.analytics.marginPill}
              </span>
            </div>
            <div className="text-2xl sm:text-3xl font-extrabold text-emerald-600 dark:text-emerald-400 mt-1">
              +{currency}{totalEstimatedProfit.toFixed(2)}
            </div>
          </div>
          <div className="pt-2.5 mt-2.5 border-t border-emerald-100 dark:border-emerald-900/60 text-[11px] text-emerald-700 dark:text-emerald-300 flex items-center justify-between">
            <span>{strings.analytics.cardNetProfitSub}</span>
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
          </div>
        </div>

        {/* Card 3: Total Bills */}
        <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 p-4 sm:p-5 card-3d flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                {strings.analytics.cardTotalBills}
              </span>
              <Receipt className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            </div>
            <div className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-slate-100 mt-1">
              {totalOrders} <span className="text-xs font-normal text-slate-500">{strings.analytics.receiptsUnit}</span>
            </div>
          </div>
          <div className="pt-2.5 mt-2.5 border-t border-slate-100 dark:border-slate-700/80 text-[11px] text-slate-500 dark:text-slate-400 flex items-center justify-between">
            <span>{strings.analytics.avgBillSize}</span>
            <span className="font-bold text-slate-700 dark:text-slate-200">{currency}{avgOrderValue.toFixed(0)}</span>
          </div>
        </div>

        {/* Card 4: Store Shelf Inventory Value */}
        <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 p-4 sm:p-5 card-3d flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                {strings.analytics.cardShelfStock}
              </span>
              <Boxes className="w-4 h-4 text-amber-600 dark:text-amber-400" />
            </div>
            <div className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-slate-100 mt-1">
              {currency}{totalInventoryValue.toFixed(0)}
            </div>
          </div>
          <div className="pt-2.5 mt-2.5 border-t border-slate-100 dark:border-slate-700/80 text-[11px] text-slate-500 dark:text-slate-400 flex items-center justify-between">
            <span>{strings.analytics.itemsOnCounter}:</span>
            <span className="font-bold text-slate-700 dark:text-slate-200">{totalStockUnits} {strings.common.pieces}</span>
          </div>
        </div>
      </div>

      {/* 4. Visual Profit & Wholesale Cost Breakdown (Very easy to understand) */}
      <div className="bg-white dark:bg-slate-800 p-4 sm:p-5 rounded-lg border border-slate-200 dark:border-slate-700 shadow-sm space-y-3 card-3d">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
              <DollarSign className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              {strings.analytics.breakdownTitle}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {strings.analytics.breakdownSub}
            </p>
          </div>
          <div className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-2.5 py-1 rounded-md border border-emerald-200 dark:border-emerald-800 self-start sm:self-auto">
            {strings.analytics.profitMarginLabel} {profitMarginPercent}%
          </div>
        </div>

        {totalSalesRevenue > 0 ? (
          <div className="space-y-3 pt-1">
            {/* Horizontal Visual Split Bar */}
            <div className="w-full bg-slate-100 dark:bg-slate-700 h-7 rounded-md overflow-hidden flex border border-slate-200 dark:border-slate-600 shadow-inner">
              <div 
                className="bg-slate-400 dark:bg-slate-500 text-white flex items-center justify-center text-[11px] font-bold transition-all px-2"
                style={{ width: `${Math.max(15, Math.min(85, 100 - profitMarginPercent))}%` }}
                title={`Wholesale Cost: ${currency}${totalCostExpenses.toFixed(2)}`}
              >
                {strings.analytics.costPortion.replace('{pct}', String(100 - profitMarginPercent))}
              </div>
              <div 
                className="bg-emerald-600 text-white flex items-center justify-center text-[11px] font-bold transition-all px-2 shadow-sm"
                style={{ width: `${Math.max(15, Math.min(85, profitMarginPercent))}%` }}
                title={`Net Profit: ${currency}${totalEstimatedProfit.toFixed(2)}`}
              >
                {strings.analytics.profitPortion.replace('{pct}', String(profitMarginPercent))}
              </div>
            </div>

            {/* Split Comparison Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs pt-1">
              <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-700/60">
                <div className="text-slate-500 dark:text-slate-400 font-medium">{strings.analytics.wholesaleCostCard}</div>
                <div className="text-lg font-bold text-slate-700 dark:text-slate-300 mt-0.5">
                  {currency}{totalCostExpenses.toFixed(2)}
                </div>
                <div className="text-[11px] text-slate-400 mt-1">{strings.analytics.wholesaleCostSub}</div>
              </div>

              <div className="p-3 rounded-lg bg-emerald-50/70 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800">
                <div className="text-emerald-800 dark:text-emerald-300 font-medium">{strings.analytics.netProfitCard}</div>
                <div className="text-lg font-bold text-emerald-600 dark:text-emerald-400 mt-0.5">
                  +{currency}{totalEstimatedProfit.toFixed(2)}
                </div>
                <div className="text-[11px] text-emerald-700/90 dark:text-emerald-400/90 mt-1">{strings.analytics.netProfitSub}</div>
              </div>
            </div>
          </div>
        ) : (
          <div className="py-6 text-center text-xs text-slate-400">
            {strings.analytics.noSalesForRange}
          </div>
        )}
      </div>

      {/* 5. Daily Sales Trend & Category Contribution Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Sales & Profit Trend (2 columns) */}
        <div className="lg:col-span-2 bg-white dark:bg-slate-800 p-4 sm:p-5 rounded-lg border border-slate-200 dark:border-slate-700 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100">
                {strings.analytics.trendTitle}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {strings.analytics.trendSub}
              </p>
            </div>
            <BarChart3 className="w-4 h-4 text-slate-500" />
          </div>

          <div className="h-60 w-full">
            {trendData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={trendData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" opacity={0.5} />
                  <XAxis dataKey="displayDate" fontSize={11} stroke="#64748b" tickLine={false} />
                  <YAxis fontSize={11} stroke="#64748b" tickLine={false} />
                  <Tooltip
                    formatter={(val: any) => [`${currency}${Number(val || 0).toFixed(2)}`]}
                    contentStyle={{
                      backgroundColor: '#0f172a',
                      borderColor: '#334155',
                      borderRadius: '0.375rem',
                      color: '#f8fafc',
                      fontSize: '12px',
                    }}
                  />
                  <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />
                  <Area
                    type="monotone"
                    dataKey="revenue"
                    name={strings.analytics.cardTotalSales}
                    stroke="#059669"
                    fill="#ecfdf5"
                    strokeWidth={2}
                  />
                  <Area
                    type="monotone"
                    dataKey="profit"
                    name={strings.analytics.cardNetProfit}
                    stroke="#10B981"
                    fill="#d1fae5"
                    strokeWidth={2}
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-xs text-slate-400">
                {strings.analytics.noSalesForRange}
              </div>
            )}
          </div>
        </div>

        {/* Category Contribution (1 column) */}
        <div className="bg-white dark:bg-slate-800 p-4 sm:p-5 rounded-lg border border-slate-200 dark:border-slate-700 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100">
                {strings.analytics.categoryTitle}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {strings.analytics.categorySub}
              </p>
            </div>
            <PieChart className="w-4 h-4 text-slate-500" />
          </div>

          <div className="h-60 w-full flex items-center justify-center">
            {categoryData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <RechartsPie>
                  <Pie
                    data={categoryData}
                    cx="50%"
                    cy="50%"
                    innerRadius={45}
                    outerRadius={75}
                    paddingAngle={2}
                    dataKey="value"
                  >
                    {categoryData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(val: any) => [`${currency}${Number(val || 0).toFixed(2)}`, 'Sales']}
                    contentStyle={{
                      backgroundColor: '#0f172a',
                      borderRadius: '0.375rem',
                      color: '#f8fafc',
                      fontSize: '12px',
                    }}
                  />
                  <Legend wrapperStyle={{ fontSize: '10px' }} />
                </RechartsPie>
              </ResponsiveContainer>
            ) : (
              <span className="text-xs text-slate-400">{strings.analytics.noSalesForRange}</span>
            )}
          </div>
        </div>
      </div>

      {/* 6. Best-Selling Products Table */}
      <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden card-3d">
        <div className="p-3.5 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Award className="w-4 h-4 text-brand-600 dark:text-brand-400" />
            <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100">
              {strings.analytics.topProductsTitle}
            </h3>
          </div>
          <span className="text-xs text-slate-500">{strings.analytics.topProductsSub}</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-slate-900/60 text-slate-700 dark:text-slate-300 font-semibold border-b border-slate-200 dark:border-slate-700">
              <tr>
                <th className="px-3.5 py-2.5">{strings.analytics.rankCol}</th>
                <th className="px-3.5 py-2.5">{strings.analytics.nameCol}</th>
                <th className="px-3.5 py-2.5">{strings.analytics.soldCol}</th>
                <th className="px-3.5 py-2.5">{strings.analytics.revCol}</th>
                <th className="px-3.5 py-2.5">{strings.analytics.profCol}</th>
                <th className="px-3.5 py-2.5">{strings.analytics.marginCol}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
              {bestSellers.map((item, index) => {
                const margin = item.revenue > 0 ? Math.round((item.profit / item.revenue) * 100) : 0;
                return (
                  <tr key={index} className="hover:bg-slate-50 dark:hover:bg-slate-750 transition-colors">
                    <td className="px-3.5 py-2.5">
                      <span className="font-mono text-xs font-semibold text-slate-500">
                        #{index + 1}
                      </span>
                    </td>
                    <td className="px-3.5 py-2.5 font-semibold text-slate-900 dark:text-slate-100">
                      {item.name}
                    </td>
                    <td className="px-3.5 py-2.5 font-bold text-slate-800 dark:text-slate-200">
                      {item.quantity} {strings.analytics.piecesUnit}
                    </td>
                    <td className="px-3.5 py-2.5 font-semibold text-brand-600 dark:text-brand-400">
                      {currency}{item.revenue.toFixed(2)}
                    </td>
                    <td className="px-3.5 py-2.5 font-semibold text-emerald-600 dark:text-emerald-400">
                      +{currency}{item.profit.toFixed(2)}
                    </td>
                    <td className="px-3.5 py-2.5 font-bold text-slate-700 dark:text-slate-300">
                      {margin}%
                    </td>
                  </tr>
                );
              })}

              {bestSellers.length === 0 && (
                <tr>
                  <td colSpan={6} className="text-center py-6 text-slate-400">
                    {strings.analytics.noSalesForRange}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
