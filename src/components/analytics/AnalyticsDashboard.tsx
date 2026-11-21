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
  ArrowUpRight,
  Download 
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

  return (
    <div className="space-y-5">
      {/* Top Header & Range Filters */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pb-2 border-b border-slate-200 dark:border-slate-800">
        <div>
          <h1 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">
            Sales & Profit Ledger (Bikri & Munafa)
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Recorded revenue, cost of goods, gross profit margins, and inventory performance.
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
            <span className="font-semibold">Export CSV</span>
          </button>

          {/* Time Filter Tabs */}
          <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-0.5 rounded-md text-xs border border-slate-200 dark:border-slate-700">
            {[
              { id: 'today', label: 'Today (Aaj)' },
              { id: '7days', label: '7 Days' },
              { id: 'month', label: 'This Month (Mahina)' },
              { id: 'all', label: 'All Records (Sabhi)' },
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

      {/* Merchant Financial Cockpit - Asymmetric, Purposeful Hierarchy */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Primary Financial Ledger Card (2 cols on md+) */}
        <div className="md:col-span-2 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 p-4 sm:p-5 card-3d">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-700/80">
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Total Bikri (Total Sales)
              </span>
              <div className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-slate-100 mt-0.5">
                {currency}{totalSalesRevenue.toFixed(2)}
              </div>
            </div>
            <div className="text-right">
              <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                Munafa Dar (Margin %)
              </span>
              <div className="text-xl sm:text-2xl font-extrabold text-emerald-600 dark:text-emerald-400 mt-0.5">
                {profitMarginPercent}%
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 pt-3 text-xs">
            <div className="p-2.5 rounded bg-slate-50 dark:bg-slate-900/40 border border-slate-100 dark:border-slate-800">
              <div className="text-slate-500 dark:text-slate-400 font-medium">Net Munafa (Gross Profit)</div>
              <div className="text-base sm:text-lg font-bold text-emerald-600 dark:text-emerald-400 mt-0.5">
                +{currency}{totalEstimatedProfit.toFixed(2)}
              </div>
              <div className="text-[10px] text-slate-400 mt-0.5">Sales minus wholesale cost</div>
            </div>
            <div className="p-2.5 rounded bg-slate-50 dark:bg-slate-900/40 border border-slate-100 dark:border-slate-800">
              <div className="text-slate-500 dark:text-slate-400 font-medium">Khareed Laagat (COGS)</div>
              <div className="text-base sm:text-lg font-bold text-slate-700 dark:text-slate-300 mt-0.5">
                {currency}{totalCostExpenses.toFixed(2)}
              </div>
              <div className="text-[10px] text-slate-400 mt-0.5">Wholesale purchase value</div>
            </div>
          </div>
        </div>

        {/* Operational Volume & Ticket Card (1 col) */}
        <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 p-4 sm:p-5 card-3d flex flex-col justify-between">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Total Bills (Galla Count)
            </span>
            <div className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-slate-100 mt-0.5">
              {totalOrders} <span className="text-xs font-normal text-slate-500">receipts</span>
            </div>
          </div>

          <div className="pt-3 border-t border-slate-100 dark:border-slate-700/80 mt-3">
            <div className="text-xs text-slate-500 dark:text-slate-400">Average Bill Size</div>
            <div className="text-lg font-bold text-brand-600 dark:text-brand-400 mt-0.5">
              {currency}{avgOrderValue.toFixed(2)}
            </div>
            <div className="text-[10px] text-slate-400">Average billing per customer</div>
          </div>
        </div>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Sales & Profit Trend (2 columns) */}
        <div className="lg:col-span-2 bg-white dark:bg-slate-800 p-4 sm:p-5 rounded-lg border border-slate-200 dark:border-slate-700 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100">
                Daily Sales & Profit
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Recorded sales revenue compared with net earnings by date
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
                    name="Sales Revenue"
                    stroke="#059669"
                    fill="#ecfdf5"
                    strokeWidth={2}
                  />
                  <Area
                    type="monotone"
                    dataKey="profit"
                    name="Estimated Profit"
                    stroke="#10B981"
                    fill="#d1fae5"
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
        <div className="bg-white dark:bg-slate-800 p-4 sm:p-5 rounded-lg border border-slate-200 dark:border-slate-700 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100">
                Sales by Category
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Product category revenue breakdown
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
              <span className="text-xs text-slate-400">No sales recorded yet</span>
            )}
          </div>
        </div>
      </div>

      {/* Stock Health Breakdown */}
      <div className="bg-white dark:bg-slate-800 p-4 sm:p-5 rounded-lg border border-slate-200 dark:border-slate-700 shadow-sm space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100">
              Inventory Shelf Health Breakdown
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Distribution of fresh stock, low stock thresholds, and quarantined units
            </p>
          </div>
          <span className="text-[10px] font-semibold px-2 py-0.5 rounded border border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-300">
            Current Stock Status
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
          <div className="h-52 w-full flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <RechartsPie>
                <Pie
                  data={inventoryHealth}
                  cx="50%"
                  cy="50%"
                  innerRadius={40}
                  outerRadius={70}
                  paddingAngle={2}
                  dataKey="value"
                >
                  {inventoryHealth.map((entry, index) => (
                    <Cell key={`health-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(val: any) => [`${val} units`, 'Quantity']}
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
          </div>

          <div className="grid grid-cols-2 gap-2.5 text-xs">
            {inventoryHealth.map((item, idx) => (
              <div key={idx} className="p-2.5 rounded border border-slate-200 dark:border-slate-700/80 bg-slate-50/70 dark:bg-slate-900/30">
                <div className="flex items-center gap-1.5 mb-1">
                  <span className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: item.color }} />
                  <span className="font-medium text-slate-600 dark:text-slate-300 text-[11px]">{item.name}</span>
                </div>
                <span className="text-base font-bold text-slate-900 dark:text-slate-100">{item.value} units</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Best-Selling Products Table */}
      <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
        <div className="p-3.5 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Award className="w-4 h-4 text-brand-600 dark:text-brand-400" />
            <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100">
              Top-Selling Products (Sabse Jyada Bikne Wala Saman)
            </h3>
          </div>
          <span className="text-xs text-slate-500">Sorted by volume sold</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-slate-900/60 text-slate-700 dark:text-slate-300 font-semibold border-b border-slate-200 dark:border-slate-700">
              <tr>
                <th className="px-3.5 py-2.5">Rank</th>
                <th className="px-3.5 py-2.5">Product Name (Saman)</th>
                <th className="px-3.5 py-2.5">Units Sold (Bikri)</th>
                <th className="px-3.5 py-2.5">Total Revenue (Kamai)</th>
                <th className="px-3.5 py-2.5">Estimated Profit (Munafa)</th>
                <th className="px-3.5 py-2.5">Margin (%)</th>
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
                      {item.quantity} units
                    </td>
                    <td className="px-3.5 py-2.5 font-semibold text-brand-600 dark:text-brand-400">
                      {currency}{item.revenue.toFixed(2)}
                    </td>
                    <td className="px-3.5 py-2.5 font-semibold text-emerald-600 dark:text-emerald-400">
                      {currency}{item.profit.toFixed(2)}
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
