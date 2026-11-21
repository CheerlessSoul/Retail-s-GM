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
  autoAttemptExpiredProductId?: string | null;
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
  autoAttemptExpiredProductId,
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
      setError(`CUSTOMER SAFETY LOCK: All stock for "${product.name}" is EXPIRED and quarantined. System will not allow billing expired goods to customers!`);
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
          setError(`Max available fresh stock for "${product.name}" is ${status.saleableStock}`);
          return prev;
        }
        return prev.map((item) =>
          item.product.id === product.id ? { ...item, quantity: item.quantity + 1 } : item
        );
      }
      return [...prev, { product, quantity: 1 }];
    });
  };

  // Auto trigger expired attempt for live hackathon demonstration if requested
  React.useEffect(() => {
    if (autoAttemptExpiredProductId) {
      const expiredProd = products.find((p) => p.id === autoAttemptExpiredProductId);
      if (expiredProd) {
        addToCart(expiredProd);
      }
    }
  }, [autoAttemptExpiredProductId]);

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
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-900/60 overflow-y-auto">
        <div className="bg-white dark:bg-slate-800 rounded-lg w-full max-w-4xl shadow-xl border border-slate-200 dark:border-slate-700 overflow-hidden my-auto max-h-[92vh] flex flex-col">
          
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80">
            <div className="flex items-center space-x-2">
              <span className="p-1.5 bg-brand-600 text-white rounded-md">
                <ShoppingBag className="w-4 h-4" />
              </span>
              <div>
                <h2 className="text-sm sm:text-base font-bold text-slate-900 dark:text-slate-100">
                  Store Register / Checkout
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  FEFO batch deduction, barcode scanning, and customer safety checks.
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {error && (
            <div className="mx-5 mt-3 p-2.5 bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-800 rounded-md flex items-center gap-2 text-xs font-semibold text-red-700 dark:text-red-300">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Main Body */}
          {completedSale ? (
            /* COMPLETED RECEIPT VIEW WITH AUTHENTIC THERMAL PAPER SLIP */
            <div className="p-6 overflow-y-auto flex-1 flex flex-col items-center justify-center text-center space-y-4">
              <div className="w-10 h-10 bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 rounded-full flex items-center justify-center">
                <CheckCircle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                  Payment Received • Bill Ready
                </h3>
                <p className="text-xs text-slate-500">Stock deducted automatically via oldest batch (FEFO).</p>
              </div>

              {/* Authentic Perforated Thermal Receipt Slip */}
              <div id="printable-receipt" className="receipt-paper w-full max-w-[300px] p-4 font-mono text-xs text-left space-y-2.5">
                <div className="text-center border-b border-dashed border-slate-400 pb-2">
                  <h4 className="font-extrabold text-slate-900 text-sm tracking-wider">
                    RETAIL'S GM STORE
                  </h4>
                  <p className="text-slate-600 text-[10px]">Tax & Retail Cash Memo</p>
                  <p className="text-slate-700 text-[10px] mt-1 font-semibold">Bill #{completedSale.receiptNumber}</p>
                  <p className="text-slate-500 text-[10px]">{new Date(completedSale.timestamp).toLocaleDateString()} {new Date(completedSale.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                  {completedSale.customerName && (
                    <p className="text-slate-700 text-[10px] font-medium">Customer: {completedSale.customerName}</p>
                  )}
                </div>

                <div className="space-y-1.5 divide-y divide-dashed divide-slate-300">
                  {completedSale.items.map((item, idx) => (
                    <div key={idx} className="pt-1.5 flex justify-between">
                      <div className="pr-2">
                        <span className="font-bold text-slate-900 block leading-tight">
                          {item.productName}
                        </span>
                        <span className="text-[10px] text-slate-500">
                          {item.quantity} x {currency}{item.unitPrice} <span className="opacity-75">(Batch: {item.batchNumber})</span>
                        </span>
                      </div>
                      <span className="font-extrabold text-slate-900 shrink-0">
                        {currency}{item.totalPrice}
                      </span>
                    </div>
                  ))}
                </div>

                <div className="border-t-2 border-dashed border-slate-800 pt-2 space-y-1">
                  <div className="flex justify-between font-extrabold text-sm text-slate-900">
                    <span>GRAND TOTAL:</span>
                    <span>{currency}{completedSale.totalAmount.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-[10px] text-slate-600">
                    <span>Payment Mode:</span>
                    <span className="font-bold uppercase tracking-wider">{completedSale.paymentMethod === 'credit' ? 'KHATA (CREDIT)' : completedSale.paymentMethod}</span>
                  </div>
                </div>

                {/* Simulated UPI QR Code Stamp */}
                <div className="border-t border-dashed border-slate-300 pt-2 flex items-center justify-between gap-2">
                  <div className="w-10 h-10 bg-slate-100 border border-slate-300 rounded flex items-center justify-center text-[8px] font-bold text-slate-500 text-center leading-none">
                    UPI<br/>QR
                  </div>
                  <div className="text-[9px] text-slate-500 text-right leading-tight">
                    <span>Scan to verify digital receipt</span><br/>
                    <span className="font-bold text-slate-800">Fresh Stock Guaranteed</span>
                  </div>
                </div>

                <div className="text-center text-[10px] text-slate-600 pt-1 border-t border-dashed border-slate-300">
                  Thank You! Visit Again.
                </div>
              </div>

              {/* Receipt Action Buttons */}
              <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
                <button
                  onClick={() => window.print()}
                  className="px-3.5 py-1.5 border border-slate-300 dark:border-slate-600 rounded-md text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center gap-1.5 transition-all btn-3d-secondary"
                >
                  <Printer className="w-4 h-4" />
                  <span>Print Thermal Slip</span>
                </button>
                <button
                  onClick={handleShareWhatsApp}
                  className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-md text-xs font-semibold flex items-center gap-1.5 transition-all btn-3d-brand"
                >
                  <span>WhatsApp Receipt</span>
                </button>
                <button
                  onClick={handleCopyBill}
                  className="px-3 py-1.5 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 text-slate-700 dark:text-slate-200 rounded-md text-xs font-semibold flex items-center gap-1.5 transition-all"
                >
                  <span>Copy SMS Text</span>
                </button>
                <button
                  onClick={handleResetAndNewSale}
                  className="px-4 py-1.5 bg-brand-600 hover:bg-brand-700 text-white rounded-md text-xs font-semibold transition-all btn-3d-brand"
                >
                  Next Customer &rarr;
                </button>
              </div>
            </div>
          ) : (
            /* CHECKOUT SPLIT VIEW */
            <div className="p-5 overflow-y-auto flex-1 grid grid-cols-1 md:grid-cols-12 gap-5">
              
              {/* Left Column: Product Search & Quick Add */}
              <div className="md:col-span-7 space-y-3">
                {/* Search / Barcode row */}
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                      type="text"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      placeholder="Type product name, brand, or scan barcode..."
                      className="w-full pl-9 pr-3 py-2 text-xs rounded-md border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-brand-500"
                    />
                  </div>
                  <button
                    onClick={() => setShowScanner(true)}
                    className="px-3.5 py-2 bg-brand-600 hover:bg-brand-700 text-white rounded-md text-xs font-semibold transition-colors flex items-center gap-1.5 btn-3d-brand shrink-0"
                  >
                    <Camera className="w-3.5 h-3.5" />
                    <span>Barcode Scan</span>
                  </button>
                </div>

                {/* Quick Speed-Dial Staples (One-Tap Add for high volume items) */}
                <div className="space-y-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    Fast Billing Shortcuts (Tap to Add)
                  </span>
                  <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
                    {products.slice(0, 5).map((p) => {
                      const { isCompletelyExpired } = getProductStockStatus(p.id);
                      return (
                        <button
                          key={`staple-${p.id}`}
                          onClick={() => addToCart(p)}
                          className={`px-2.5 py-1.5 rounded border text-[11px] font-semibold whitespace-nowrap transition-all shrink-0 ${
                            isCompletelyExpired 
                              ? 'bg-red-50 text-red-700 border-red-300 dark:bg-red-950/40 dark:border-red-800' 
                              : 'bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 border-slate-300 dark:border-slate-700 hover:border-brand-500'
                          }`}
                        >
                          {p.name.split(' ')[0]} ({currency}{p.sellingPrice})
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Available Products Grid */}
                <div className="border border-slate-200 dark:border-slate-700 rounded-md p-3 bg-slate-50/60 dark:bg-slate-900/40">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                      Store Shelf Products
                    </span>
                    <span className="text-[10px] text-slate-400">Click to ring up</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-72 overflow-y-auto pr-1">
                    {searchResults.map((p) => {
                      const { saleableStock, isCompletelyExpired, hasUrgentBatch } = getProductStockStatus(p.id);

                      return (
                        <div
                          key={p.id}
                          onClick={() => addToCart(p)}
                          className={`p-2.5 rounded-md border transition-all flex flex-col justify-between ${
                            isCompletelyExpired
                              ? 'bg-red-50/70 dark:bg-red-950/30 border-red-300 cursor-not-allowed'
                              : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:border-brand-500 hover:shadow-sm cursor-pointer'
                          }`}
                        >
                          <div>
                            <div className="flex items-start justify-between gap-1">
                              <h4 className="font-semibold text-xs text-slate-900 dark:text-slate-100 line-clamp-1">
                                {p.name}
                              </h4>
                              {isCompletelyExpired ? (
                                <span className="text-[9px] px-1 py-0.2 bg-red-600 text-white rounded font-bold">
                                  EXPIRED
                                </span>
                              ) : hasUrgentBatch ? (
                                <span className="text-[9px] px-1 py-0.2 bg-orange-100 text-orange-800 dark:bg-orange-950/60 dark:text-orange-300 rounded font-bold">
                                  &le;7d Expiry
                                </span>
                              ) : null}
                            </div>
                            <span className="text-[10px] text-slate-400 block">{p.brand}</span>
                          </div>

                          <div className="mt-2 flex items-center justify-between text-xs">
                            <span className="text-[10px] text-slate-500">
                              Safe Stock: {saleableStock} {p.unit}
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

              {/* Right Column: Customer Bill Tape */}
              <div className="md:col-span-5 flex flex-col justify-between bg-slate-50 dark:bg-slate-900/60 p-3.5 rounded-md border border-slate-200 dark:border-slate-700">
                <div className="space-y-3">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-700">
                    <h3 className="font-bold text-xs uppercase tracking-wider text-slate-800 dark:text-slate-200">
                      Current Customer Bill ({cart.reduce((a, b) => a + b.quantity, 0)} items)
                    </h3>
                    {cart.length > 0 && (
                      <button
                        onClick={() => setCart([])}
                        className="text-[11px] text-red-600 hover:text-red-800 font-semibold"
                      >
                        Empty
                      </button>
                    )}
                  </div>

                  {/* Cart items scrollable list */}
                  <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                    {cart.map((item) => (
                      <div
                        key={item.product.id}
                        className="p-2 bg-white dark:bg-slate-800 rounded border border-slate-200 dark:border-slate-700 flex items-center justify-between gap-2"
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

                        <span className="font-bold text-xs text-brand-600 dark:text-brand-400 w-12 text-right">
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
                      <div className="text-center py-8 text-slate-400 text-xs">
                        No items added yet. Click a product on the left or scan barcode.
                      </div>
                    )}
                  </div>
                </div>

                {/* Payment Section */}
                <div className="pt-2.5 border-t border-slate-200 dark:border-slate-700 space-y-2.5 mt-3">
                  <div>
                    <input
                      type="text"
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      placeholder="Customer Name / Mobile (Optional)"
                      className="w-full px-2.5 py-1.5 text-xs rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700"
                    />
                  </div>

                  {/* Payment Method Selector */}
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block mb-1">
                      Payment Mode
                    </span>
                    <div className="grid grid-cols-4 gap-1.5 text-xs font-semibold">
                      {[
                        { id: 'cash', label: 'Cash (Nagad)' },
                        { id: 'upi', label: 'UPI / QR' },
                        { id: 'card', label: 'Card' },
                        { id: 'credit', label: 'Khata (Udhar)' },
                      ].map((p) => (
                        <button
                          key={p.id}
                          type="button"
                          onClick={() => setPaymentMethod(p.id as typeof paymentMethod)}
                          className={`py-1.5 rounded border text-[11px] transition-colors ${
                            paymentMethod === p.id
                              ? 'bg-brand-600 text-white border-brand-600 shadow-sm'
                              : 'bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300'
                          }`}
                        >
                          {p.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Total & Charge button */}
                  <div className="p-2.5 bg-white dark:bg-slate-800 rounded border border-slate-200 dark:border-slate-700 flex justify-between items-center">
                    <span className="text-xs font-semibold text-slate-500">Total Bill:</span>
                    <span className="text-xl font-extrabold text-brand-600 dark:text-brand-400">
                      {currency}{totalAmount.toFixed(2)}
                    </span>
                  </div>

                  <button
                    onClick={handleCheckout}
                    disabled={cart.length === 0 || isSubmitting}
                    className="w-full py-2.5 bg-brand-600 hover:bg-brand-700 disabled:opacity-50 text-white rounded-md text-xs sm:text-sm font-bold transition-all btn-3d-brand"
                  >
                    {isSubmitting ? 'Recording Bill...' : `Confirm & Charge ${currency}${totalAmount.toFixed(2)}`}
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
