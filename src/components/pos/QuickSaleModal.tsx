import React, { useState } from 'react';
import { 
  X, 
  Search, 
  Barcode, 
  Trash2, 
  Plus, 
  Minus, 
  CheckCircle, 
  Printer, 
  ShoppingBag, 
  Camera, 
  AlertTriangle,
  ShieldAlert 
} from 'lucide-react';
import type { Product, ProductBatch, SaleTransaction } from '../../types';
import { BarcodeScannerModal } from '../common/BarcodeScannerModal';
import { sound } from '../../services/soundService';

interface QuickSaleModalProps {
  isOpen: boolean;
  onClose: () => void;
  products: Product[];
  batches: ProductBatch[];
  currency: string;
  onProcessSale: (
    cart: { productId: string; quantity: number }[],
    paymentMethod: 'cash' | 'upi' | 'card' | 'credit',
    customerName?: string
  ) => Promise<SaleTransaction>;
}

export const QuickSaleModal: React.FC<QuickSaleModalProps> = ({
  isOpen,
  onClose,
  products,
  batches,
  currency,
  onProcessSale,
}) => {
  const [cart, setCart] = useState<{ product: Product; quantity: number }[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'upi' | 'card' | 'credit'>('cash');
  const [customerName, setCustomerName] = useState('');
  
  // Barcode scanner
  const [showScanner, setShowScanner] = useState(false);

  // Completed sale receipt view
  const [completedSale, setCompletedSale] = useState<SaleTransaction | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  /**
   * Helper to inspect expiry safety & saleable non-expired stock
   */
  const getProductStockStatus = (productId: string) => {
    const prodBatches = batches.filter((b) => b.productId === productId && b.quantity > 0 && b.status !== 'disposed');

    let saleableStock = 0;
    let expiredStock = 0;
    let urgentStock = 0;

    prodBatches.forEach((b) => {
      const parts = b.expiryDate.split(/[-/]/).map(Number);
      const exp = parts.length === 3 && parts[0] > 1900 ? new Date(parts[0], parts[1] - 1, parts[2]) : new Date(b.expiryDate);
      exp.setHours(0, 0, 0, 0);

      const diffDays = Math.ceil((exp.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      if (diffDays <= 0 || b.status === 'expired') {
        expiredStock += b.quantity;
      } else {
        saleableStock += b.quantity;
        if (diffDays <= 7) {
          urgentStock += b.quantity;
        }
      }
    });

    return {
      saleableStock,
      expiredStock,
      urgentStock,
      isCompletelyExpired: saleableStock === 0 && expiredStock > 0,
      hasUrgentBatch: urgentStock > 0,
    };
  };

  const addToCart = (product: Product) => {
    const status = getProductStockStatus(product.id);

    if (status.isCompletelyExpired) {
      sound.playAlertBuzz();
      setError(`Cannot add "${product.name}": All available stock is expired and quarantined.`);
      return;
    }

    if (status.saleableStock <= 0) {
      sound.playAlertBuzz();
      setError(`Cannot add "${product.name}": Out of stock.`);
      return;
    }

    setError(null);
    sound.playScannerBeep();

    setCart((prev) => {
      const existing = prev.find((item) => item.product.id === product.id);
      if (existing) {
        if (existing.quantity >= status.saleableStock) {
          setError(`Cannot add more: Max available fresh stock for "${product.name}" is ${status.saleableStock}`);
          return prev;
        }
        return prev.map((item) =>
          item.product.id === product.id ? { ...item, quantity: item.quantity + 1 } : item
        );
      }
      return [...prev, { product, quantity: 1 }];
    });
  };

  const updateQuantity = (productId: string, delta: number) => {
    const status = getProductStockStatus(productId);

    setCart((prev) => {
      return prev
        .map((item) => {
          if (item.product.id === productId) {
            const newQty = item.quantity + delta;
            if (newQty <= 0) return null;
            if (newQty > status.saleableStock) {
              setError(`Max fresh stock for "${item.product.name}" is ${status.saleableStock}`);
              return item;
            }
            return { ...item, quantity: newQty };
          }
          return item;
        })
        .filter(Boolean) as { product: Product; quantity: number }[];
    });
  };

  const removeFromCart = (productId: string) => {
    setCart((prev) => prev.filter((item) => item.product.id !== productId));
  };

  const totalAmount = cart.reduce((acc, item) => acc + item.product.sellingPrice * item.quantity, 0);

  const handleCheckout = async () => {
    if (cart.length === 0) return;

    try {
      setIsSubmitting(true);
      setError(null);

      const items = cart.map((c) => ({
        productId: c.product.id,
        quantity: c.quantity,
      }));

      const transaction = await onProcessSale(items, paymentMethod, customerName);
      sound.playSuccessChime();
      setCompletedSale(transaction);
      setCart([]);
    } catch (err) {
      sound.playAlertBuzz();
      setError(err instanceof Error ? err.message : 'Sale transaction failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResetAndNewSale = () => {
    setCompletedSale(null);
    setCart([]);
    setCustomerName('');
    setError(null);
  };

  const generateBillText = () => {
    if (!completedSale) return '';
    const lines = [
      `*RETAIL'S GM STORE RECEIPT*`,
      `Receipt No: #${completedSale.receiptNumber}`,
      `Date: ${new Date(completedSale.timestamp).toLocaleString()}`,
      completedSale.customerName ? `Customer: ${completedSale.customerName}` : '',
      `--------------------------------`,
      ...completedSale.items.map(
        (i) => `${i.productName} (${i.quantity} pcs) - ${currency}${i.totalPrice}`
      ),
      `--------------------------------`,
      `*TOTAL AMOUNT: ${currency}${completedSale.totalAmount}*`,
      `Payment: ${completedSale.paymentMethod.toUpperCase()}`,
      `Thank you for your visit!`,
    ].filter(Boolean);
    return lines.join('\n');
  };

  const handleShareWhatsApp = () => {
    const text = encodeURIComponent(generateBillText());
    window.open(`https://wa.me/?text=${text}`, '_blank');
  };

  const handleCopyBill = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(generateBillText());
      alert('Receipt details copied to clipboard!');
    }
  };

  // Search filtered products
  const searchResults = products
    .filter(
      (p) =>
        p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.brand.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.barcode.includes(searchTerm)
    )
    .slice(0, 8);

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-900/70 backdrop-blur-sm overflow-y-auto">
        <div className="bg-white dark:bg-slate-800 rounded-2xl w-full max-w-4xl shadow-2xl border border-slate-200 dark:border-slate-700 overflow-hidden my-auto max-h-[92vh] flex flex-col animate-in fade-in zoom-in-95 duration-200">
          
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-700 bg-brand-50/60 dark:bg-slate-800">
            <div className="flex items-center space-x-2">
              <span className="p-1.5 bg-brand-600 text-white rounded-lg">
                <ShoppingBag className="w-4 h-4" />
              </span>
              <div>
                <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-slate-100">
                  Quick Retail Checkout / POS
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  First-Expire-First-Out automatic batch deduction, barcode scanning, and safety checks.
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {error && (
            <div className="mx-6 mt-4 p-3 bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-800 rounded-xl flex items-center gap-2 text-xs font-semibold text-red-700 dark:text-red-300">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Main Body */}
          {completedSale ? (
            /* COMPLETED RECEIPT VIEW */
            <div className="p-6 overflow-y-auto flex-1 flex flex-col items-center justify-center text-center space-y-4">
              <div className="w-16 h-16 bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 rounded-full flex items-center justify-center">
                <CheckCircle className="w-8 h-8" />
              </div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">
                Sale Completed Successfully!
              </h3>

              {/* Printable Receipt Card */}
              <div id="printable-receipt" className="w-full max-w-sm bg-slate-50 dark:bg-slate-900/90 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 font-mono text-xs text-left space-y-3 card-3d">
                <div className="text-center border-b border-dashed border-slate-300 dark:border-slate-600 pb-2">
                  <h4 className="font-bold text-slate-900 dark:text-slate-100 text-sm">
                    RETAIL'S GM RECEIPT
                  </h4>
                  <p className="text-slate-500 text-[10px]">Receipt #{completedSale.receiptNumber}</p>
                  <p className="text-slate-500 text-[10px]">{new Date(completedSale.timestamp).toLocaleString()}</p>
                  {completedSale.customerName && (
                    <p className="text-slate-500 text-[10px]">Customer: {completedSale.customerName}</p>
                  )}
                </div>

                <div className="space-y-1.5 divide-y divide-slate-200 dark:divide-slate-700">
                  {completedSale.items.map((item, idx) => (
                    <div key={idx} className="pt-1.5 flex justify-between">
                      <div>
                        <span className="font-semibold text-slate-800 dark:text-slate-200 block">
                          {item.productName}
                        </span>
                        <span className="text-[10px] text-slate-400">
                          {item.quantity} x {currency}{item.unitPrice} (Batch: {item.batchNumber})
                        </span>
                      </div>
                      <span className="font-bold text-slate-800 dark:text-slate-200">
                        {currency}{item.totalPrice}
                      </span>
                    </div>
                  ))}
                </div>

                <div className="border-t border-dashed border-slate-300 dark:border-slate-600 pt-2 space-y-1">
                  <div className="flex justify-between font-bold text-sm text-slate-900 dark:text-slate-100">
                    <span>Total Paid:</span>
                    <span>{currency}{completedSale.totalAmount}</span>
                  </div>
                  <div className="flex justify-between text-[11px] text-slate-500">
                    <span>Payment Method:</span>
                    <span className="uppercase">{completedSale.paymentMethod}</span>
                  </div>
                </div>

                <div className="text-center text-[10px] text-slate-400 pt-2 border-t border-slate-200 dark:border-slate-700">
                  Thank you for shopping with us!
                </div>
              </div>

              {/* Receipt Action Buttons */}
              <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
                <button
                  onClick={() => window.print()}
                  className="px-3.5 py-2 border border-slate-300 dark:border-slate-600 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center gap-1.5 transition-all active:scale-95"
                >
                  <Printer className="w-4 h-4" />
                  <span>Print Slip</span>
                </button>
                <button
                  onClick={handleShareWhatsApp}
                  className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all btn-3d-brand"
                >
                  <span>WhatsApp Bill</span>
                </button>
                <button
                  onClick={handleCopyBill}
                  className="px-3.5 py-2 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all"
                >
                  <span>Copy Text</span>
                </button>
                <button
                  onClick={handleResetAndNewSale}
                  className="px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-xs font-semibold transition-all btn-3d-brand"
                >
                  Next Sale &rarr;
                </button>
              </div>
            </div>
          ) : (
            /* CHECKOUT SPLIT VIEW */
            <div className="p-6 overflow-y-auto flex-1 grid grid-cols-1 md:grid-cols-12 gap-6">
              
              {/* Left Column: Product Search & Quick Add */}
              <div className="md:col-span-7 space-y-4">
                {/* Search / Barcode row */}
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                      type="text"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      placeholder="Type name, brand, or scan barcode..."
                      className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-brand-500"
                    />
                  </div>
                  <button
                    onClick={() => setShowScanner(true)}
                    className="px-3.5 py-2 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-xs font-semibold transition-colors flex items-center gap-1 shadow-sm shrink-0"
                  >
                    <Camera className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Camera Scanner</span>
                  </button>
                </div>

                {/* Available Products Grid for one-click add */}
                <div className="border border-slate-200 dark:border-slate-700 rounded-2xl p-3 bg-slate-50/60 dark:bg-slate-900/40">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-2">
                    Quick Add to Cart (Click to Add)
                  </span>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-80 overflow-y-auto pr-1">
                    {searchResults.map((p) => {
                      const { saleableStock, isCompletelyExpired, hasUrgentBatch } = getProductStockStatus(p.id);

                      return (
                        <div
                          key={p.id}
                          onClick={() => addToCart(p)}
                          className={`p-2.5 rounded-xl border transition-all flex flex-col justify-between ${
                            isCompletelyExpired
                              ? 'bg-red-50/40 dark:bg-red-950/20 border-red-300 opacity-60 cursor-not-allowed'
                              : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:border-brand-500 hover:shadow-sm cursor-pointer'
                          }`}
                        >
                          <div>
                            <div className="flex items-start justify-between gap-1">
                              <h4 className="font-semibold text-xs text-slate-900 dark:text-slate-100 line-clamp-1">
                                {p.name}
                              </h4>
                              {isCompletelyExpired ? (
                                <span className="text-[9px] px-1 py-0.2 bg-red-100 text-red-700 rounded font-bold">
                                  EXPIRED
                                </span>
                              ) : hasUrgentBatch ? (
                                <span className="text-[9px] px-1 py-0.2 bg-orange-100 text-orange-700 rounded font-bold">
                                  &le;7d
                                </span>
                              ) : null}
                            </div>
                            <span className="text-[10px] text-slate-400 block">{p.brand}</span>
                          </div>

                          <div className="mt-2 flex items-center justify-between text-xs">
                            <span className="text-[10px] text-slate-500">
                              Fresh: {saleableStock} {p.unit}
                            </span>
                            <span className="font-bold text-brand-600 dark:text-brand-400">
                              {currency}{p.sellingPrice}
                            </span>
                          </div>
                        </div>
                      );
                    })}

                    {searchResults.length === 0 && (
                      <div className="col-span-2 text-center py-6 text-xs text-slate-400">
                        No products matching "{searchTerm}".
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Right Column: Active Cart & Ring Up */}
              <div className="md:col-span-5 flex flex-col justify-between bg-slate-50 dark:bg-slate-900/60 p-4 rounded-2xl border border-slate-200 dark:border-slate-700">
                <div className="space-y-3">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-700">
                    <h3 className="font-bold text-xs uppercase tracking-wider text-slate-700 dark:text-slate-300">
                      Customer Cart ({cart.reduce((a, b) => a + b.quantity, 0)} items)
                    </h3>
                    {cart.length > 0 && (
                      <button
                        onClick={() => setCart([])}
                        className="text-[11px] text-red-500 hover:text-red-700"
                      >
                        Clear Cart
                      </button>
                    )}
                  </div>

                  {/* Cart items scrollable list */}
                  <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
                    {cart.map((item) => (
                      <div
                        key={item.product.id}
                        className="p-2.5 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 flex items-center justify-between gap-2"
                      >
                        <div className="flex-1 min-w-0">
                          <h4 className="font-semibold text-xs text-slate-900 dark:text-slate-100 truncate">
                            {item.product.name}
                          </h4>
                          <span className="text-[10px] text-slate-400">
                            {currency}{item.product.sellingPrice} each
                          </span>
                        </div>

                        {/* Quantity controls */}
                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => updateQuantity(item.product.id, -1)}
                            className="p-1 rounded bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200"
                          >
                            <Minus className="w-3 h-3" />
                          </button>
                          <span className="text-xs font-bold w-5 text-center text-slate-900 dark:text-slate-100">
                            {item.quantity}
                          </span>
                          <button
                            onClick={() => updateQuantity(item.product.id, 1)}
                            className="p-1 rounded bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200"
                          >
                            <Plus className="w-3 h-3" />
                          </button>
                        </div>

                        <span className="font-bold text-xs text-brand-600 dark:text-brand-400 w-14 text-right">
                          {currency}{(item.product.sellingPrice * item.quantity).toFixed(0)}
                        </span>

                        <button
                          onClick={() => removeFromCart(item.product.id)}
                          className="p-1 text-slate-400 hover:text-red-500"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}

                    {cart.length === 0 && (
                      <div className="text-center py-10 text-slate-400 text-xs">
                        Cart is empty. Select products on the left or scan barcodes.
                      </div>
                    )}
                  </div>
                </div>

                {/* Checkout Section */}
                <div className="pt-3 border-t border-slate-200 dark:border-slate-700 space-y-3 mt-4">
                  <div>
                    <input
                      type="text"
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      placeholder="Customer Name / Mobile (Optional)"
                      className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700"
                    />
                  </div>

                  {/* Payment Methods */}
                  <div className="grid grid-cols-4 gap-1.5 text-[11px]">
                    {[
                      { id: 'cash', label: 'Cash' },
                      { id: 'upi', label: 'UPI/QR' },
                      { id: 'card', label: 'Card' },
                      { id: 'credit', label: 'Khata' },
                    ].map((p) => (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => setPaymentMethod(p.id as typeof paymentMethod)}
                        className={`py-1.5 rounded-lg font-semibold border transition-colors ${
                          paymentMethod === p.id
                            ? 'bg-brand-600 text-white border-brand-600'
                            : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300'
                        }`}
                      >
                        {p.label}
                      </button>
                    ))}
                  </div>

                  {/* Total & Ring up button */}
                  <div className="p-3 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 flex justify-between items-center">
                    <span className="text-xs font-semibold text-slate-500">Total Payable:</span>
                    <span className="text-xl font-extrabold text-brand-600 dark:text-brand-400">
                      {currency}{totalAmount.toFixed(2)}
                    </span>
                  </div>

                  <button
                    onClick={handleCheckout}
                    disabled={cart.length === 0 || isSubmitting}
                    className="w-full py-3 bg-brand-600 hover:bg-brand-700 disabled:opacity-50 text-white rounded-xl text-sm font-bold transition-all btn-3d-brand"
                  >
                    {isSubmitting ? 'Recording Sale...' : `Charge ${currency}${totalAmount.toFixed(2)}`}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Barcode scanner */}
      <BarcodeScannerModal
        isOpen={showScanner}
        onClose={() => setShowScanner(false)}
        onScanSuccess={(code) => {
          setShowScanner(false);
          const found = products.find((p) => p.barcode === code);
          if (found) {
            addToCart(found);
          } else {
            setError(`No product registered with barcode: ${code}`);
          }
        }}
        title="Scan Barcode to Add to Cart"
      />
    </>
  );
};
