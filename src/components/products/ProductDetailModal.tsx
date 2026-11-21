import React, { useState } from 'react';
import { X, Calendar, Plus, Trash2, Edit2, Check, AlertTriangle, Layers, Barcode, Tag } from 'lucide-react';
import type { Product, ProductBatch } from '../../types';

interface ProductDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  product: Product | null;
  batches: ProductBatch[];
  currency: string;
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

export const ProductDetailModal: React.FC<ProductDetailModalProps> = ({
  isOpen,
  onClose,
  product,
  batches,
  currency,
  onAddBatch,
  onUpdateProduct,
  onDeleteProduct,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [showAddBatch, setShowAddBatch] = useState(false);

  // Edit fields
  const [name, setName] = useState('');
  const [brand, setBrand] = useState('');
  const [category, setCategory] = useState('');
  const [barcode, setBarcode] = useState('');
  const [costPrice, setCostPrice] = useState(0);
  const [sellingPrice, setSellingPrice] = useState(0);
  const [minStockThreshold, setMinStockThreshold] = useState(5);

  // New batch fields
  const [newBatchNo, setNewBatchNo] = useState('');
  const [newExpiryDate, setNewExpiryDate] = useState('');
  const [newMfgDate, setNewMfgDate] = useState('');
  const [newQuantity, setNewQuantity] = useState(10);
  const [batchNotes, setBatchNotes] = useState('');

  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen || !product) return null;

  const startEdit = () => {
    setName(product.name);
    setBrand(product.brand);
    setCategory(product.category);
    setBarcode(product.barcode);
    setCostPrice(product.costPrice);
    setSellingPrice(product.sellingPrice);
    setMinStockThreshold(product.minStockThreshold);
    setIsEditing(true);
  };

  const saveEdit = async () => {
    if (!name.trim()) {
      alert('Product name cannot be empty.');
      return;
    }
    const cPrice = Number(costPrice) || 0;
    const sPrice = Number(sellingPrice) || 0;
    if (cPrice < 0 || sPrice < 0) {
      alert('Cost price and selling price cannot be negative.');
      return;
    }

    try {
      setIsSubmitting(true);
      await onUpdateProduct({
        ...product,
        name: name.trim(),
        brand: brand.trim(),
        category,
        barcode: barcode.trim(),
        costPrice: cPrice,
        sellingPrice: sPrice,
        minStockThreshold: Math.max(1, Number(minStockThreshold) || 5),
        updatedAt: new Date().toISOString(),
      });
      setIsEditing(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAddNewBatch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newExpiryDate) return;
    try {
      setIsSubmitting(true);
      await onAddBatch(product.id, {
        batchNumber: newBatchNo.trim() || `B-${Date.now().toString().slice(-4)}`,
        expiryDate: newExpiryDate,
        mfgDate: newMfgDate || undefined,
        quantity: Number(newQuantity) || 1,
        notes: batchNotes.trim() || undefined,
      });
      setShowAddBatch(false);
      setNewBatchNo('');
      setNewExpiryDate('');
      setNewMfgDate('');
      setNewQuantity(10);
      setBatchNotes('');
    } finally {
      setIsSubmitting(false);
    }
  };

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const getDaysRemaining = (expStr: string) => {
    const parts = expStr.split(/[-/]/).map(Number);
    const exp = parts.length === 3 && parts[0] > 1900 ? new Date(parts[0], parts[1] - 1, parts[2]) : new Date(expStr);
    exp.setHours(0, 0, 0, 0);
    return Math.ceil((exp.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-900/70 backdrop-blur-sm overflow-y-auto">
      <div className="bg-white dark:bg-slate-800 rounded-2xl w-full max-w-3xl shadow-2xl border border-slate-200 dark:border-slate-700 overflow-hidden my-auto max-h-[92vh] flex flex-col animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80">
          <div className="flex items-center space-x-2">
            <Tag className="w-5 h-5 text-brand-600 dark:text-brand-400" />
            <div>
              <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-slate-100">
                {product.name}
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {product.brand} • {product.category}
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            {!isEditing && (
              <button
                onClick={startEdit}
                className="p-1.5 rounded-lg text-slate-500 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                title="Edit Product"
              >
                <Edit2 className="w-4 h-4" />
              </button>
            )}
            <button
              onClick={() => {
                if (window.confirm(`Are you sure you want to delete ${product.name}?`)) {
                  onDeleteProduct(product.id);
                  onClose();
                }
              }}
              className="p-1.5 rounded-lg text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/50 transition-colors"
              title="Delete Product"
            >
              <Trash2 className="w-4 h-4" />
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          
          {/* Product Overview / Edit Mode */}
          {isEditing ? (
            <div className="p-4 bg-slate-50 dark:bg-slate-900/40 rounded-xl border border-slate-200 dark:border-slate-700 space-y-3">
              <h3 className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">
                Edit Product Info
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-slate-500 dark:text-slate-400 mb-1">Name</label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full px-3 py-1.5 text-sm rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-500 dark:text-slate-400 mb-1">Brand</label>
                  <input
                    type="text"
                    value={brand}
                    onChange={(e) => setBrand(e.target.value)}
                    className="w-full px-3 py-1.5 text-sm rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-500 dark:text-slate-400 mb-1">Barcode</label>
                  <input
                    type="text"
                    value={barcode}
                    onChange={(e) => setBarcode(e.target.value)}
                    className="w-full px-3 py-1.5 text-sm rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-500 dark:text-slate-400 mb-1">Category</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full px-3 py-1.5 text-sm rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700"
                  >
                    <option value="Grocery">Grocery</option>
                    <option value="Dairy">Dairy</option>
                    <option value="Medicines">Medicines</option>
                    <option value="Snacks">Snacks</option>
                    <option value="Beverages">Beverages</option>
                    <option value="Personal Care">Personal Care</option>
                    <option value="General Store">General Store</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-slate-500 dark:text-slate-400 mb-1">Cost Price ({currency})</label>
                  <input
                    type="number"
                    step="0.5"
                    value={costPrice}
                    onChange={(e) => setCostPrice(parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-1.5 text-sm rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-500 dark:text-slate-400 mb-1">Selling Price ({currency})</label>
                  <input
                    type="number"
                    step="0.5"
                    value={sellingPrice}
                    onChange={(e) => setSellingPrice(parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-1.5 text-sm rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  onClick={() => setIsEditing(false)}
                  className="px-3 py-1.5 text-xs text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  onClick={saveEdit}
                  disabled={isSubmitting}
                  className="px-4 py-1.5 text-xs bg-brand-600 text-white rounded-lg hover:bg-brand-700 flex items-center gap-1"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>Save Changes</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-3 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-200 dark:border-slate-700">
                <span className="text-xs text-slate-500 dark:text-slate-400 block">Total Stock</span>
                <span className="text-xl font-bold text-slate-900 dark:text-slate-100">
                  {product.currentStock} {product.unit}
                </span>
              </div>
              <div className="p-3 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-200 dark:border-slate-700">
                <span className="text-xs text-slate-500 dark:text-slate-400 block">Cost Price</span>
                <span className="text-xl font-bold text-slate-900 dark:text-slate-100">
                  {currency}{product.costPrice.toFixed(2)}
                </span>
              </div>
              <div className="p-3 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-200 dark:border-slate-700">
                <span className="text-xs text-slate-500 dark:text-slate-400 block">Selling Price</span>
                <span className="text-xl font-bold text-brand-600 dark:text-brand-400">
                  {currency}{product.sellingPrice.toFixed(2)}
                </span>
              </div>
              <div className="p-3 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-200 dark:border-slate-700">
                <span className="text-xs text-slate-500 dark:text-slate-400 block">Profit Margin</span>
                <span className="text-xl font-bold text-emerald-600 dark:text-emerald-400">
                  {!isNaN(product.sellingPrice) && product.sellingPrice > 0
                    ? `${Math.round(((product.sellingPrice - (product.costPrice || 0)) / product.sellingPrice) * 100)}%`
                    : '0%'}
                </span>
              </div>
            </div>
          )}

          {/* Batches Section */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Layers className="w-4 h-4 text-brand-600 dark:text-brand-400" />
                <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100">
                  Active Batches & Expiry Dates ({batches.length})
                </h3>
              </div>
              <button
                onClick={() => setShowAddBatch(!showAddBatch)}
                className="px-3 py-1.5 text-xs font-medium text-white bg-brand-600 hover:bg-brand-700 rounded-lg transition-colors flex items-center gap-1 shadow-sm"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add New Batch</span>
              </button>
            </div>

            {/* Add New Batch Sub-form */}
            {showAddBatch && (
              <form onSubmit={handleAddNewBatch} className="p-4 mb-4 bg-brand-50/50 dark:bg-brand-950/20 border border-brand-200 dark:border-brand-900/60 rounded-xl space-y-3">
                <h4 className="text-xs font-bold text-brand-900 dark:text-brand-300">
                  Restock New Batch
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                  <div>
                    <label className="block text-xs text-slate-600 dark:text-slate-300 mb-1">Batch No</label>
                    <input
                      type="text"
                      required
                      value={newBatchNo}
                      onChange={(e) => setNewBatchNo(e.target.value)}
                      placeholder="e.g. B-092"
                      className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-600 dark:text-slate-300 mb-1">Expiry Date *</label>
                    <input
                      type="date"
                      required
                      value={newExpiryDate}
                      onChange={(e) => setNewExpiryDate(e.target.value)}
                      className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-600 dark:text-slate-300 mb-1">Quantity</label>
                    <input
                      type="number"
                      min="1"
                      required
                      value={newQuantity}
                      onChange={(e) => setNewQuantity(parseInt(e.target.value, 10) || 1)}
                      className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-600 dark:text-slate-300 mb-1">MFG Date</label>
                    <input
                      type="date"
                      value={newMfgDate}
                      onChange={(e) => setNewMfgDate(e.target.value)}
                      className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700"
                    />
                  </div>
                </div>
                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setShowAddBatch(false)}
                    className="px-3 py-1 text-xs text-slate-500 hover:text-slate-700"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="px-4 py-1 text-xs bg-brand-600 text-white rounded-lg hover:bg-brand-700 font-medium"
                  >
                    Save Batch
                  </button>
                </div>
              </form>
            )}

            {/* Batches Table */}
            <div className="border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-100 dark:bg-slate-700/60 text-slate-700 dark:text-slate-300 font-semibold border-b border-slate-200 dark:border-slate-700">
                  <tr>
                    <th className="px-3 py-2.5">Batch</th>
                    <th className="px-3 py-2.5">Expiry Date</th>
                    <th className="px-3 py-2.5">Days Left</th>
                    <th className="px-3 py-2.5">Quantity</th>
                    <th className="px-3 py-2.5">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                  {batches.map((batch) => {
                    const days = getDaysRemaining(batch.expiryDate);
                    const isExpired = days <= 0;
                    const isUrgent = days > 0 && days <= 7;
                    const isUpcoming = days > 7 && days <= 30;

                    return (
                      <tr key={batch.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/30">
                        <td className="px-3 py-2.5 font-medium text-slate-800 dark:text-slate-200">
                          {batch.batchNumber}
                        </td>
                        <td className="px-3 py-2.5 text-slate-600 dark:text-slate-400">
                          {batch.expiryDate}
                        </td>
                        <td className="px-3 py-2.5">
                          {isExpired ? (
                            <span className="font-semibold text-red-600 dark:text-red-400">
                              Expired ({Math.abs(days)}d ago)
                            </span>
                          ) : isUrgent ? (
                            <span className="font-semibold text-orange-600 dark:text-orange-400">
                              {days} days left
                            </span>
                          ) : isUpcoming ? (
                            <span className="font-medium text-amber-600 dark:text-amber-400">
                              {days} days left
                            </span>
                          ) : (
                            <span className="text-slate-600 dark:text-slate-400">
                              {days} days left
                            </span>
                          )}
                        </td>
                        <td className="px-3 py-2.5 font-semibold text-slate-900 dark:text-slate-100">
                          {batch.quantity}
                        </td>
                        <td className="px-3 py-2.5">
                          {isExpired ? (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-red-100 dark:bg-red-950/60 text-red-700 dark:text-red-300">
                              Expired
                            </span>
                          ) : isUrgent ? (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-orange-100 dark:bg-orange-950/60 text-orange-700 dark:text-orange-300">
                              Urgent
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300">
                              Safe
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                  {batches.length === 0 && (
                    <tr>
                      <td colSpan={5} className="text-center py-6 text-slate-400">
                        No batch data available
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
