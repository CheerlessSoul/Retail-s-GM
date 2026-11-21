import React, { useState, useMemo } from 'react';
import { 
  TrendingUp, 
  DollarSign, 
  ShoppingBag, 
  Percent, 
  Award, 
  Calendar, 
  BarChart3, 
  PieChart, 
  ArrowUpRight 
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
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
  const [timeRange, setTimeRange] = useState<'today' | '7days' | 'month' | 'all'>('7days');

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

  // Aggregate Metrics
  const totalSalesRevenue = filteredSales.reduce((acc, s) => acc + s.totalAmount, 0);
  const totalCostExpenses = filteredSales.reduce((acc, s) => acc + s.totalCost, 0);
  const totalEstimatedProfit = filteredSales.reduce((acc, s) => acc + s.totalProfit, 0);
  const totalOrders = filteredSales.length;
  const avgOrderValue = totalOrders > 0 ? totalSalesRevenue / totalOrders : 0;
  const profitMarginPercent = totalSalesRevenue > 0 ? Math.round((totalEstimatedProfit / totalSalesRevenue) * 100) : 0;

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

  // Inventory Health Distribution
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const inventoryHealth = useMemo(() => {
    let expired = 0;
    let urgent = 0;
    let low = 0;
    let healthy = 0;

    batches.forEach((b) => {
      if (b.quantity <= 0) return;
      const exp = new Date(b.expiryDate);
      exp.setHours(0, 0, 0, 0);
      const diff = Math.ceil((exp.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

      if (diff <= 0) expired += b.quantity;
      else if (diff <= 7) urgent += b.quantity;
      else healthy += b.quantity;
    });

    products.forEach((p) => {
      if (p.currentStock <= p.minStockThreshold && p.currentStock > 0) {
        low += p.currentStock;
      }
    });

    return [
      { name: 'Healthy Stock', value: Math.max(0, healthy - low), color: '#10B981' },
      { name: 'Low Stock Level', value: low, color: '#F59E0B' },
      { name: 'Expiring in < 7d', value: urgent, color: '#F97316' },
      { name: 'Expired Stock', value: expired, color: '#EF4444' },
    ].filter((item) => item.value > 0);
  }, [batches, products]);

  return (
    <div className="space-y-6">
      {/* Top Header & Range Filters */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">
            Business Analytics & Profit
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
            Real-time sales, estimated gross profit, expenses (COGS), and business performance charts.
          </p>
        </div>

        {/* Time Filter Pills */}
        <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl self-start sm:self-auto text-xs">
          {[
            { id: 'today', label: 'Today' },
            { id: '7days', label: 'Last 7 Days' },
            { id: 'month', label: 'This Month' },
            { id: 'all', label: 'All Time' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setTimeRange(tab.id as typeof timeRange)}
              className={`px-3 py-1.5 rounded-lg font-medium transition-colors ${
                timeRange === tab.id
                  ? 'bg-white dark:bg-slate-700 text-brand-600 dark:text-brand-400 shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Main Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Total Sales Revenue */}
        <div className="p-4 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Total Sales
            </span>
            <span className="p-1.5 rounded-lg bg-brand-50 dark:bg-brand-950/60 text-brand-600 dark:text-brand-400">
              <ShoppingBag className="w-4 h-4" />
            </span>
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-brand-600 dark:text-brand-400 mt-2">
            {currency}{totalSalesRevenue.toFixed(0)}
          </div>
          <div className="text-xs text-slate-500 mt-1">
            Across {totalOrders} customer transactions
          </div>
        </div>

        {/* Estimated Gross Profit */}
        <div className="p-4 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">
              Estimated Profit
            </span>
            <span className="p-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400">
              <TrendingUp className="w-4 h-4" />
            </span>
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-emerald-600 dark:text-emerald-400 mt-2">
            {currency}{totalEstimatedProfit.toFixed(0)}
          </div>
          <div className="text-xs text-emerald-600 dark:text-emerald-400 mt-1">
            {profitMarginPercent}% profit margin on sales
          </div>
        </div>

        {/* Estimated Expenses / COGS */}
        <div className="p-4 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Product Expenses (COGS)
            </span>
            <span className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300">
              <DollarSign className="w-4 h-4" />
            </span>
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-slate-100 mt-2">
            {currency}{totalCostExpenses.toFixed(0)}
          </div>
          <div className="text-xs text-slate-500 mt-1">
            Purchase cost of goods sold
          </div>
        </div>

        {/* Average Order Value */}
        <div className="p-4 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Avg Receipt Value
            </span>
            <span className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300">
              <Percent className="w-4 h-4" />
            </span>
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-slate-100 mt-2">
            {currency}{avgOrderValue.toFixed(0)}
          </div>
          <div className="text-xs text-slate-500 mt-1">
            Average customer basket size
          </div>
        </div>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Sales & Profit Trend (2 columns) */}
        <div className="lg:col-span-2 bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100">
                Sales & Estimated Profit Trend
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Daily comparison of gross sales revenue vs net earnings
              </p>
            </div>
            <BarChart3 className="w-5 h-5 text-brand-600 dark:text-brand-400" />
          </div>

          <div className="h-64 w-full">
            {trendData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={trendData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#059669" stopOpacity={0.8}/>
                      <stop offset="95%" stopColor="#059669" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="colorProfit" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10B981" stopOpacity={0.8}/>
                      <stop offset="95%" stopColor="#10B981" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                  <XAxis dataKey="displayDate" fontSize={11} stroke="#94a3b8" />
                  <YAxis fontSize={11} stroke="#94a3b8" />
                  <Tooltip
                    formatter={(val: any) => [`${currency}${Number(val || 0).toFixed(2)}`]}
                    contentStyle={{
                      backgroundColor: '#1e293b',
                      borderColor: '#334155',
                      borderRadius: '0.75rem',
                      color: '#f8fafc',
                      fontSize: '12px',
                    }}
                  />
                  <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                  <Area
                    type="monotone"
                    dataKey="revenue"
                    name="Sales Revenue"
                    stroke="#059669"
                    fillOpacity={1}
                    fill="url(#colorRevenue)"
                    strokeWidth={2}
                  />
                  <Area
                    type="monotone"
                    dataKey="profit"
                    name="Estimated Profit"
                    stroke="#10B981"
                    fillOpacity={1}
                    fill="url(#colorProfit)"
                    strokeWidth={2}
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-xs text-slate-400">
                No transaction data available for the selected range.
              </div>
            )}
          </div>
        </div>

        {/* Category Contribution (1 column) */}
        <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100">
                Revenue by Category
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Top sales drivers by product type
              </p>
            </div>
            <PieChart className="w-5 h-5 text-brand-600 dark:text-brand-400" />
          </div>

          <div className="h-64 w-full flex items-center justify-center">
            {categoryData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <RechartsPie>
                  <Pie
                    data={categoryData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {categoryData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(val: any) => [`${currency}${Number(val || 0).toFixed(2)}`, 'Sales']}
                    contentStyle={{
                      backgroundColor: '#1e293b',
                      borderRadius: '0.75rem',
                      color: '#f8fafc',
                      fontSize: '12px',
                    }}
                  />
                  <Legend wrapperStyle={{ fontSize: '10px' }} />
                </RechartsPie>
              </ResponsiveContainer>
            ) : (
              <span className="text-xs text-slate-400">No sales recorded yet</span>
            )}
          </div>
        </div>
      </div>

      {/* Stock Health Breakdown Chart */}
      <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100">
              Inventory & Shelf Health Breakdown
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Distribution of fresh stock, low stock thresholds, and quarantined expired units
            </p>
          </div>
          <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300">
            Real-Time
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
          <div className="h-56 w-full flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <RechartsPie>
                <Pie
                  data={inventoryHealth}
                  cx="50%"
                  cy="50%"
                  innerRadius={45}
                  outerRadius={75}
                  paddingAngle={3}
                  dataKey="value"
                >
                  {inventoryHealth.map((entry, index) => (
                    <Cell key={`health-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(val: any) => [`${val} units`, 'Quantity']}
                  contentStyle={{
                    backgroundColor: '#1e293b',
                    borderRadius: '0.75rem',
                    color: '#f8fafc',
                    fontSize: '12px',
                  }}
                />
                <Legend wrapperStyle={{ fontSize: '10px' }} />
              </RechartsPie>
            </ResponsiveContainer>
          </div>

          <div className="grid grid-cols-2 gap-3 text-xs">
            {inventoryHealth.map((item, idx) => (
              <div key={idx} className="p-3 rounded-xl border border-slate-100 dark:border-slate-700/60 bg-slate-50/50 dark:bg-slate-900/30">
                <div className="flex items-center gap-1.5 mb-1">
                  <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                  <span className="font-medium text-slate-600 dark:text-slate-300">{item.name}</span>
                </div>
                <span className="text-lg font-bold text-slate-900 dark:text-slate-100">{item.value} units</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Best-Selling Products Table */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Award className="w-5 h-5 text-brand-600 dark:text-brand-400" />
            <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100">
              Best-Selling Products
            </h3>
          </div>
          <span className="text-xs text-slate-500">Ranked by volume sold</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-slate-900/60 text-slate-700 dark:text-slate-300 font-semibold border-b border-slate-200 dark:border-slate-700">
              <tr>
                <th className="px-4 py-3">Rank</th>
                <th className="px-4 py-3">Product Name</th>
                <th className="px-4 py-3">Units Sold</th>
                <th className="px-4 py-3">Total Revenue</th>
                <th className="px-4 py-3">Estimated Profit</th>
                <th className="px-4 py-3">Margin</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
              {bestSellers.map((item, index) => {
                const margin = item.revenue > 0 ? Math.round((item.profit / item.revenue) * 100) : 0;
                return (
                  <tr key={index} className="hover:bg-slate-50 dark:hover:bg-slate-750 transition-colors">
                    <td className="px-4 py-3">
                      <span className={`w-5 h-5 rounded-full inline-flex items-center justify-center font-bold text-[10px] ${
                        index === 0
                          ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300'
                          : index === 1
                          ? 'bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-200'
                          : 'bg-orange-100 text-orange-800 dark:bg-orange-950/60 dark:text-orange-300'
                      }`}>
                        #{index + 1}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-semibold text-slate-900 dark:text-slate-100">
                      {item.name}
                    </td>
                    <td className="px-4 py-3 font-bold text-slate-800 dark:text-slate-200">
                      {item.quantity} units
                    </td>
                    <td className="px-4 py-3 font-semibold text-brand-600 dark:text-brand-400">
                      {currency}{item.revenue.toFixed(2)}
                    </td>
                    <td className="px-4 py-3 font-semibold text-emerald-600 dark:text-emerald-400">
                      {currency}{item.profit.toFixed(2)}
                    </td>
                    <td className="px-4 py-3 font-bold text-slate-700 dark:text-slate-300">
                      {margin}%
                    </td>
                  </tr>
                );
              })}

              {bestSellers.length === 0 && (
                <tr>
                  <td colSpan={6} className="text-center py-6 text-slate-400">
                    No sales recorded for this timeframe.
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
