import React, { useState } from 'react';
import { 
  Plus, 
  Search, 
  Barcode, 
  Sparkles, 
  Filter, 
  AlertTriangle, 
  CheckCircle, 
  LayoutGrid, 
  List, 
  Tag, 
  Layers, 
  ChevronRight 
} from 'lucide-react';
import type { Product, ProductBatch } from '../../types';
import { AddProductModal } from './AddProductModal';
import { ProductDetailModal } from './ProductDetailModal';
import { BarcodeScannerModal } from '../common/BarcodeScannerModal';

interface ProductListProps {
  products: Product[];
  batches: ProductBatch[];
  currency: string;
  onAddProduct: (data: {
    name: string;
    brand: string;
    category: string;
    barcode: string;
    unit: string;
    costPrice: number;
    sellingPrice: number;
    minStockThreshold: number;
    batchNumber: string;
    expiryDate: string;
    mfgDate?: string;
    quantity: number;
  }) => Promise<void>;
  onAddBatch: (productId: string, batchData: {
    batchNumber: string;
    expiryDate: string;
    mfgDate?: string;
    quantity: number;
    notes?: string;
  }) => Promise<void>;
  onUpdateProduct: (product: Product) => Promise<void>;
  onDeleteProduct: (productId: string) => Promise<void>;
}

export const ProductList: React.FC<ProductListProps> = ({
  products,
  batches,
  currency,
  onAddProduct,
  onAddBatch,
  onUpdateProduct,
  onDeleteProduct,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');
  
  // Modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [showBarcodeScanner, setShowBarcodeScanner] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);

  const categories = ['All', 'Grocery', 'Dairy', 'Medicines', 'Snacks', 'Beverages', 'Personal Care', 'General Store'];

  const filteredProducts = products.filter((p) => {
    const matchesSearch =
      p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.brand.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.barcode.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'All' || p.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const getProductBatches = (productId: string) => {
    return batches.filter((b) => b.productId === productId);
  };

  const getEarliestExpiry = (productId: string) => {
    const prodBatches = getProductBatches(productId).filter((b) => b.quantity > 0);
    if (prodBatches.length === 0) return null;
    return prodBatches.sort((a, b) => new Date(a.expiryDate).getTime() - new Date(b.expiryDate).getTime())[0];
  };

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const getExpiryBadge = (expStr?: string) => {
    if (!expStr) return null;
    const parts = expStr.split(/[-/]/).map(Number);
    const exp = parts.length === 3 && parts[0] > 1900 ? new Date(parts[0], parts[1] - 1, parts[2]) : new Date(expStr);
    exp.setHours(0, 0, 0, 0);
    const diffDays = Math.ceil((exp.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays <= 0) {
      return (
        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-100 text-red-700 dark:bg-red-950/60 dark:text-red-300">
          Expired
        </span>
      );
    }
    if (diffDays <= 7) {
      return (
        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-orange-100 text-orange-700 dark:bg-orange-950/60 dark:text-orange-300">
          {diffDays}d left
        </span>
      );
    }
    if (diffDays <= 30) {
      return (
        <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300">
          {diffDays}d left
        </span>
      );
    }
    return (
      <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300">
        Safe
      </span>
    );
  };

  return (
    <div className="space-y-5">
      {/* Top Action Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">
            Product Management
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
            Add products manually, scan barcodes, or upload label photos with AI OCR.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowBarcodeScanner(true)}
            className="px-3.5 py-2 text-xs sm:text-sm font-medium text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-750 transition-colors flex items-center gap-1.5 shadow-sm"
          >
            <Barcode className="w-4 h-4 text-brand-600 dark:text-brand-400" />
            <span className="hidden xs:inline">Scan Code</span>
          </button>

          <button
            onClick={() => setShowAddModal(true)}
            className="px-4 py-2 text-xs sm:text-sm font-medium text-white bg-brand-600 hover:bg-brand-700 rounded-xl transition-colors flex items-center gap-1.5 shadow-sm"
          >
            <Plus className="w-4 h-4" />
            <span>Add Product</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white dark:bg-slate-800 p-3 sm:p-4 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm space-y-3">
        <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
          
          {/* Search Box */}
          <div className="relative w-full sm:w-80">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by name, brand, or barcode..."
              className="w-full pl-9 pr-3 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>

          {/* View Mode Toggle */}
          <div className="flex items-center space-x-1 self-end sm:self-auto bg-slate-100 dark:bg-slate-900/50 p-1 rounded-xl">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-1.5 rounded-lg text-xs transition-colors ${
                viewMode === 'grid'
                  ? 'bg-white dark:bg-slate-800 text-brand-600 dark:text-brand-400 shadow-sm'
                  : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
              }`}
              title="Grid View"
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('table')}
              className={`p-1.5 rounded-lg text-xs transition-colors ${
                viewMode === 'table'
                  ? 'bg-white dark:bg-slate-800 text-brand-600 dark:text-brand-400 shadow-sm'
                  : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
              }`}
              title="Table View"
            >
              <List className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Category Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none text-xs">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1.5 rounded-full font-medium whitespace-nowrap transition-colors ${
                selectedCategory === cat
                  ? 'bg-brand-600 text-white shadow-sm'
                  : 'bg-slate-100 dark:bg-slate-750 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Product Display List */}
      {filteredProducts.length === 0 ? (
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-8 text-center">
          <Tag className="w-10 h-10 text-slate-400 mx-auto mb-2" />
          <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200">No products found</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-sm mx-auto">
            Try adjusting your search query or add a new product using the button above.
          </p>
        </div>
      ) : viewMode === 'grid' ? (
        /* GRID VIEW */
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredProducts.map((product) => {
            const earliest = getEarliestExpiry(product.id);
            const isLowStock = product.currentStock <= product.minStockThreshold;

            return (
              <div
                key={product.id}
                onClick={() => setSelectedProduct(product)}
                className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-4 hover:shadow-md hover:border-brand-500/50 transition-all cursor-pointer flex flex-col justify-between group"
              >
                <div>
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-700/60 px-2 py-0.5 rounded-md">
                      {product.category}
                    </span>
                    {getExpiryBadge(earliest?.expiryDate)}
                  </div>

                  <h3 className="font-semibold text-sm text-slate-900 dark:text-slate-100 line-clamp-2 group-hover:text-brand-600 dark:group-hover:text-brand-400 transition-colors">
                    {product.name}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    {product.brand} {product.barcode ? `• #${product.barcode.slice(-5)}` : ''}
                  </p>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-700/60 flex items-center justify-between text-xs">
                  <div>
                    <span className="text-[11px] text-slate-400 block">Stock</span>
                    <span className={`font-bold ${isLowStock ? 'text-amber-600 dark:text-amber-400' : 'text-slate-800 dark:text-slate-200'}`}>
                      {product.currentStock} {product.unit}
                    </span>
                  </div>

                  <div className="text-right">
                    <span className="text-[11px] text-slate-400 block">Price</span>
                    <span className="font-bold text-sm text-brand-600 dark:text-brand-400">
                      {currency}{product.sellingPrice.toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* TABLE VIEW */
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-900/60 text-slate-700 dark:text-slate-300 font-semibold border-b border-slate-200 dark:border-slate-700">
                <tr>
                  <th className="px-4 py-3">Product Name</th>
                  <th className="px-4 py-3">Category</th>
                  <th className="px-4 py-3">Barcode</th>
                  <th className="px-4 py-3">Stock</th>
                  <th className="px-4 py-3">Cost</th>
                  <th className="px-4 py-3">Selling Price</th>
                  <th className="px-4 py-3">Next Expiry</th>
                  <th className="px-4 py-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                {filteredProducts.map((product) => {
                  const earliest = getEarliestExpiry(product.id);
                  const isLowStock = product.currentStock <= product.minStockThreshold;

                  return (
                    <tr
                      key={product.id}
                      onClick={() => setSelectedProduct(product)}
                      className="hover:bg-slate-50 dark:hover:bg-slate-750 transition-colors cursor-pointer"
                    >
                      <td className="px-4 py-3">
                        <div className="font-semibold text-slate-900 dark:text-slate-100">
                          {product.name}
                        </div>
                        <div className="text-[11px] text-slate-400">{product.brand}</div>
                      </td>
                      <td className="px-4 py-3 text-slate-600 dark:text-slate-400">
                        {product.category}
                      </td>
                      <td className="px-4 py-3 font-mono text-slate-600 dark:text-slate-400">
                        {product.barcode || '—'}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`font-bold ${isLowStock ? 'text-amber-600' : 'text-slate-800 dark:text-slate-200'}`}>
                          {product.currentStock} {product.unit}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-600 dark:text-slate-400">
                        {currency}{product.costPrice.toFixed(2)}
                      </td>
                      <td className="px-4 py-3 font-bold text-brand-600 dark:text-brand-400">
                        {currency}{product.sellingPrice.toFixed(2)}
                      </td>
                      <td className="px-4 py-3">
                        {earliest ? getExpiryBadge(earliest.expiryDate) : '—'}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span className="text-brand-600 dark:text-brand-400 font-medium inline-flex items-center gap-0.5">
                          Details <ChevronRight className="w-3.5 h-3.5" />
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Add Product Modal */}
      <AddProductModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        currency={currency}
        onSave={onAddProduct}
      />

      {/* Barcode Scanner Modal (for quick product lookup or scan) */}
      <BarcodeScannerModal
        isOpen={showBarcodeScanner}
        onClose={() => setShowBarcodeScanner(false)}
        onScanSuccess={(scannedCode) => {
          setSearchTerm(scannedCode);
          setShowBarcodeScanner(false);
          const found = products.find((p) => p.barcode === scannedCode);
          if (found) {
            setSelectedProduct(found);
          }
        }}
        title="Scan Barcode to Find or Add Product"
      />

      {/* Product Detail Modal */}
      <ProductDetailModal
        isOpen={!!selectedProduct}
        onClose={() => setSelectedProduct(null)}
        product={selectedProduct}
        batches={selectedProduct ? getProductBatches(selectedProduct.id) : []}
        currency={currency}
        onAddBatch={onAddBatch}
        onUpdateProduct={onUpdateProduct}
        onDeleteProduct={onDeleteProduct}
      />
    </div>
  );
};
