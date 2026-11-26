import React, { useState } from 'react';
import { 
  BookOpen, 
  ArrowLeft, 
  Package, 
  Hourglass, 
  Boxes, 
  TrendingUp, 
  ShoppingBag, 
  Barcode, 
  FileSpreadsheet, 
  Sparkles, 
  Zap, 
  CheckCircle2, 
  AlertTriangle, 
  ShieldCheck, 
  ExternalLink, 
  Keyboard, 
  Printer, 
  Camera, 
  HelpCircle,
  Lightbulb,
  Search,
  MessageSquare
} from 'lucide-react';
import { useLanguage } from '../../i18n/LanguageContext';

interface UserGuidePageProps {
  onBack: () => void;
  onOpenPos: () => void;
  onOpenScannerHub: () => void;
  onOpenImportSoldSheet: () => void;
  onOpenAddProduct?: () => void;
  onOpenImportCatalogSheet?: () => void;
  currency: string;
}

export const UserGuidePage: React.FC<UserGuidePageProps> = ({
  onBack,
  onOpenPos,
  onOpenScannerHub,
  onOpenImportSoldSheet,
  onOpenAddProduct,
  onOpenImportCatalogSheet,
  currency,
}) => {
  const { language } = useLanguage();
  const [activeCategory, setActiveCategory] = useState<'all' | 'quickstart' | 'products' | 'expiry' | 'stock' | 'pos' | 'sold' | 'scanner' | 'ai'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const guideSections = [
    {
      id: 'quickstart',
      category: 'quickstart',
      title: 'Quick 3-Step Store Setup',
      badge: 'Getting Started',
      badgeColor: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300',
      icon: Zap,
      summary: 'Get your shop up and running with Retail\'s GM in less than 5 minutes.',
      steps: [
        {
          num: '1',
          heading: 'Add your Store Products',
          detail: 'Add products manually, scan their barcodes with your camera/gun, or drop your supplier Excel/CSV catalog sheet.',
          actionText: 'Add Product',
          onAction: onOpenAddProduct,
        },
        {
          num: '2',
          heading: 'Start Fast Counter Billing',
          detail: 'Press the Spacebar or F2 to open the billing counter. Point your handheld scanner gun at items to add them instantly with automatic FEFO expiry checks.',
          actionText: 'Open Billing Counter',
          onAction: onOpenPos,
        },
        {
          num: '3',
          heading: 'Track Live Profit & Near-Expiry Items',
          detail: 'Check the Expiry tab daily to discount items before they spoil, and view your daily net profit in the Sales & Profit (Hisab) tab.',
        },
      ],
      tip: 'You can test the app with realistic kirana data by clicking "Demo Store" anytime in the top header.',
    },
    {
      id: 'products',
      category: 'products',
      title: '1. Product Catalog & Adding Items',
      badge: 'Inventory Setup',
      badgeColor: 'bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300',
      icon: Package,
      summary: 'Keep a clean catalog of every SKU, barcode, unit, cost price, and customer selling price.',
      steps: [
        {
          num: 'A',
          heading: 'Manual Product Entry',
          detail: 'Click "+ Add Product" in the Products tab. Enter the item name (e.g. "Parle-G Gold"), brand, barcode, purchase cost price, selling price, and initial batch expiry date.',
        },
        {
          num: 'B',
          heading: 'AI Camera OCR Label Reader',
          detail: 'Click "AI Scan Label" to snap a photo of product packaging. The built-in AI OCR extracts the product name, brand, and printed expiry date automatically so you don\'t have to type.',
        },
        {
          num: 'C',
          heading: 'Bulk Catalog Sheet Import (Excel / CSV)',
          detail: 'Got a price list from your wholesale distributor? Click "Import Sheet" and drop the Excel file. It automatically matches columns and adds hundreds of products in one click.',
          actionText: 'Import Supplier Catalog',
          onAction: onOpenImportCatalogSheet,
        },
      ],
      tip: 'Always enter your actual wholesale Purchase Cost. Retail\'s GM subtracts this from your selling price to calculate your exact net cash profit on every bill.',
    },
    {
      id: 'expiry',
      category: 'expiry',
      title: '2. Smart Expiry Management & Customer Safety',
      badge: 'Zero-Waste & Safety',
      badgeColor: 'bg-orange-100 text-orange-800 dark:bg-orange-950/60 dark:text-orange-300',
      icon: Hourglass,
      summary: 'Protect your customers from spoiled goods and prevent financial loss from expired stock.',
      steps: [
        {
          num: '1',
          heading: 'FEFO (First-Expire, First-Out) Protection',
          detail: 'When making a sale, Retail\'s GM automatically selects the batch that is closest to expiry first. This ensures older stock is sold before newer stock.',
        },
        {
          num: '2',
          heading: 'Automatic Quarantine at Billing',
          detail: 'If an item in your store has expired, the billing counter strictly blocks it from being billed. An alert sounds to prevent accidental sale to customers.',
        },
        {
          num: '3',
          heading: '1-Click Clearance Sale Discounts',
          detail: 'In the Expiry tab, batches expiring in ≤7 days or ≤30 days have a "Clearance Sale" button. Click it to set a discount price (e.g., 20% off) so you recover your cash before the item expires.',
        },
        {
          num: '4',
          heading: 'Vendor Return & Write-off Disposal',
          detail: 'If an item has already expired, click "Dispose". Choose whether it was returned to the distributor for a credit note or discarded. The quantity is removed from your active stock.',
        },
      ],
      tip: 'Check the Expiry tab every morning. Discounting items 7 days before expiry saves up to 90% of money that would otherwise be lost.',
    },
    {
      id: 'stock',
      category: 'stock',
      title: '3. Shelf Stock & Wholesaler Orders',
      badge: 'Inventory Control',
      badgeColor: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300',
      icon: Boxes,
      summary: 'Know exactly what is on your shelves and reorder before you run out of fast-selling goods.',
      steps: [
        {
          num: '1',
          heading: 'Live Stock Tracking',
          detail: 'Every bill, manual restock, or bulk import immediately updates your current stock count. No manual ledger math needed.',
        },
        {
          num: '2',
          heading: 'Low Stock Alerts',
          detail: 'When an item falls below its minimum limit (e.g., less than 5 packets left), it turns amber and appears on your "Low Stock Alerts" list.',
        },
        {
          num: '3',
          heading: '1-Click WhatsApp Wholesaler Purchase Order',
          detail: 'Click "Wholesale PO (WhatsApp)" to generate a formatted list of all out-of-stock items and send it directly to your wholesale distributor via WhatsApp in 1 tap.',
        },
        {
          num: '4',
          heading: 'Complete Audit Trail History',
          detail: 'Click "Stock History" to inspect a tamper-proof log of every restock, customer sale, damage write-off, and inventory adjustment.',
        },
      ],
      tip: 'Set realistic minimum thresholds (e.g., 5-10 units for milk/bread, 2-3 units for expensive items) so you get alerts in time.',
    },
    {
      id: 'pos',
      category: 'pos',
      title: '4. Billing Register & Thermal Receipts (Galla)',
      badge: 'Fast Checkout',
      badgeColor: 'bg-brand-100 text-brand-800 dark:bg-brand-950/60 dark:text-brand-300',
      icon: ShoppingBag,
      summary: 'Serve waiting customers in seconds with keyboard hotkeys and barcode gun support.',
      steps: [
        {
          num: '1',
          heading: 'Instant Register Shortcut',
          detail: 'Press Spacebar or F2 anywhere on the screen to open the checkout register. Press Esc to close it.',
          actionText: 'Open Register Now',
          onAction: onOpenPos,
        },
        {
          num: '2',
          heading: 'Barcode Scanner Gun or Instant Search',
          detail: 'Scan a physical product barcode with your handheld laser gun, or type 2-3 letters of the item name. The item is instantly added with sound feedback.',
        },
        {
          num: '3',
          heading: 'Multiple Payment Modes',
          detail: 'Select Cash, UPI (GPay/PhonePe/Paytm), Card, or Credit (Udhar Khata). Enter customer phone number if you want to remember customer purchases.',
        },
        {
          num: '4',
          heading: 'Print Thermal Paper Receipts',
          detail: 'Completed sales display an authentic perforated thermal paper slip. Click "Print Thermal Slip" to print on any 58mm or 80mm POS receipt printer.',
        },
      ],
      tip: 'Keep your cashier speaker or laptop volume unmuted. The cash register sound confirms each item has been added without you having to look at the screen.',
    },
    {
      id: 'sold',
      category: 'sold',
      title: '5. Bulk Sold Sheet Importer (Drop Sold Stuff)',
      badge: 'Bulk Sales',
      badgeColor: 'bg-purple-100 text-purple-800 dark:bg-purple-950/60 dark:text-purple-300',
      icon: FileSpreadsheet,
      summary: 'Record hundreds of daily sales at once from an Excel sheet or offline ledger without manual entry.',
      steps: [
        {
          num: '1',
          heading: 'When to use this feature',
          detail: 'If you prefer writing daily sales in a paper notebook, keeping an Excel sheet, or using an external counter, you can record all sold items in bulk at the end of the day.',
          actionText: 'Drop Sold Sheet',
          onAction: onOpenImportSoldSheet,
        },
        {
          num: '2',
          heading: 'Download Pre-Formatted Template',
          detail: 'Click "Drop Sold Sheet" in the Sales tab or POS register and click "Download Sample (.xlsx)". It comes pre-filled with your current store products.',
        },
        {
          num: '3',
          heading: 'Drop your Sheet & Review',
          detail: 'Drag and drop your filled Excel or CSV sheet. Retail\'s GM matches items by barcode or name, checks available stock, and calculates total sales revenue and profit.',
        },
        {
          num: '4',
          heading: '1-Click Confirm & Record',
          detail: 'Click "Confirm & Record Sales". It automatically deducts batch quantities via FEFO, creates sales records, and updates your profit charts.',
        },
      ],
      tip: 'The sheet only needs 2 columns: Product Name (or Barcode) and Quantity Sold. Price and Payment mode are optional.',
    },
    {
      id: 'scanner',
      category: 'scanner',
      title: '6. Hardware Barcode Scanner Hub (USB / Bluetooth)',
      badge: 'Hardware Support',
      badgeColor: 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300',
      icon: Barcode,
      summary: 'Use any standard handheld retail barcode gun with plug-and-play auto-billing.',
      steps: [
        {
          num: '1',
          heading: 'Plug & Play (Zero Drivers Needed)',
          detail: 'Plug your USB barcode scanner gun into your PC/laptop, or pair your Bluetooth scanner. It works automatically without installing any software or drivers.',
          actionText: 'Test Scanner Hub',
          onAction: onOpenScannerHub,
        },
        {
          num: '2',
          heading: 'Automatic Background Listening',
          detail: 'Retail\'s GM always listens for hardware scanner bursts. Whenever you pick up the gun and scan any product on your counter, it beeps and opens the billing counter automatically.',
        },
        {
          num: '3',
          heading: 'Live Scanner Speed Tester',
          detail: 'Open the Scanner Hub to test your gun. Pull the trigger on any barcode to verify your scanner is detected and see the exact millisecond read speed.',
        },
        {
          num: '4',
          heading: 'Camera Scanner for Phones/Tablets',
          detail: 'If you are using a mobile phone or tablet without a handheld laser gun, use the "Camera Scanner" tab to scan product barcodes with your device camera.',
        },
      ],
      tip: 'The green "Scanner Ready" badge in your top header shows that the background scanner listener is actively waiting for scans.',
    },
    {
      id: 'ai',
      category: 'ai',
      title: '7. Retail AI Copilot & Business Advisor',
      badge: 'AI Assistant',
      badgeColor: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300',
      icon: Sparkles,
      summary: 'An intelligent AI assistant tuned specifically for grocery and kirana shop owners.',
      steps: [
        {
          num: '1',
          heading: 'Floating AI Copilot Button',
          detail: 'Click the small green AI button floating at the bottom-right of your screen anytime to chat with your store assistant.',
        },
        {
          num: '2',
          heading: 'Ask Store Questions in Your Language',
          detail: 'Ask questions in English, Hindi, Tamil, Marathi, Punjabi, or Burmese. For example: "How much profit did I make today?", "Which items expire this week?", or "What stock is running low?".',
        },
        {
          num: '3',
          heading: 'Clickable Action Pills in Chat',
          detail: 'When the AI suggests checking expiring items or low stock, clickable shortcut pills appear in the chat (e.g. [View Expiry List], [Open Billing Register]). Click them to jump directly there.',
        },
        {
          num: '4',
          heading: 'AI Business Advisor in Analytics',
          detail: 'Visit the Sales & Profit tab to view 3 real-time strategic recommendations: Margin Optimization, Expiry Clearance, and Wholesale Restock.',
        },
      ],
      tip: 'The AI uses the 100% free OpenRouter tier and includes an offline local fallback engine, so it never fails even if your internet disconnects.',
    },
  ];

  const filteredSections = guideSections.filter((section) => {
    if (activeCategory !== 'all' && section.category !== activeCategory) {
      return false;
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchTitle = section.title.toLowerCase().includes(q);
      const matchSummary = section.summary.toLowerCase().includes(q);
      const matchSteps = section.steps.some(
        (s) => s.heading.toLowerCase().includes(q) || s.detail.toLowerCase().includes(q)
      );
      return matchTitle || matchSummary || matchSteps;
    }
    return true;
  });

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-16 animate-fade-in">
      {/* Top Header & Back Button */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 sm:p-7 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button
              onClick={onBack}
              className="p-2 rounded-xl text-slate-500 hover:text-slate-800 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors border border-slate-200 dark:border-slate-700 flex items-center gap-1.5 text-xs font-bold shrink-0"
              title="Return to Store Dashboard"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back to Store</span>
            </button>
            <div>
              <div className="flex items-center gap-2">
                <span className="p-1.5 bg-emerald-600 text-white rounded-lg shadow-sm">
                  <BookOpen className="w-4 h-4" />
                </span>
                <h1 className="text-lg sm:text-2xl font-black text-slate-900 dark:text-slate-100 tracking-tight">
                  How to Use Retail's GM — Complete Store Guide
                </h1>
              </div>
              <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
                Practical, step-by-step instructions for shop owners to manage inventory, eliminate expiry losses, bill customers quickly, and maximize profit.
              </p>
            </div>
          </div>

          {/* Quick Direct Actions */}
          <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
            <button
              onClick={onOpenPos}
              className="px-3 py-1.5 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm flex items-center gap-1.5 btn-3d-brand"
            >
              <ShoppingBag className="w-3.5 h-3.5" />
              <span>Open Billing</span>
            </button>
            <button
              onClick={onOpenScannerHub}
              className="px-3 py-1.5 bg-emerald-50 dark:bg-emerald-950/60 hover:bg-emerald-100 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800 rounded-xl text-xs font-bold transition-all shadow-sm flex items-center gap-1.5"
            >
              <Barcode className="w-3.5 h-3.5 text-emerald-600" />
              <span>Connect Scanner</span>
            </button>
            <button
              onClick={onOpenImportSoldSheet}
              className="px-3 py-1.5 bg-white dark:bg-slate-800 hover:bg-slate-50 text-slate-700 dark:text-slate-200 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-semibold transition-all shadow-sm flex items-center gap-1.5"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
              <span>Drop Sold Sheet</span>
            </button>
          </div>
        </div>

        {/* Search Bar & Category Navigation */}
        <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          {/* Search Box */}
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search features, billing, scanner, expiry, or sheets..."
              className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          {/* Category Filter Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none text-xs">
            {[
              { id: 'all', label: 'All Topics' },
              { id: 'quickstart', label: '🚀 Quick Start' },
              { id: 'products', label: '📦 Products' },
              { id: 'expiry', label: '⏳ Expiry' },
              { id: 'stock', label: '📋 Stock' },
              { id: 'pos', label: '🛒 Billing' },
              { id: 'sold', label: '📥 Sold Sheet' },
              { id: 'scanner', label: '🔌 Scanner' },
              { id: 'ai', label: '🤖 AI Copilot' },
            ].map((cat) => (
              <button
                key={cat.id}
                onClick={() => setActiveCategory(cat.id as any)}
                className={`px-3 py-1.5 rounded-xl font-bold whitespace-nowrap transition-colors ${
                  activeCategory === cat.id
                    ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 shadow-sm'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Feature Guide Sections List */}
      <div className="space-y-6">
        {filteredSections.map((section) => {
          const IconComp = section.icon;
          return (
            <div
              key={section.id}
              className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-2xl p-5 sm:p-7 shadow-sm space-y-5 transition-all hover:border-slate-300 dark:hover:border-slate-700"
            >
              {/* Section Header */}
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-3.5">
                  <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold shrink-0 mt-0.5 border border-slate-200 dark:border-slate-700">
                    <IconComp className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h2 className="text-base sm:text-lg font-black text-slate-900 dark:text-slate-100">
                        {section.title}
                      </h2>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${section.badgeColor}`}>
                        {section.badge}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                      {section.summary}
                    </p>
                  </div>
                </div>
              </div>

              {/* Step Cards Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 pt-1">
                {section.steps.map((step, idx) => (
                  <div
                    key={idx}
                    className="p-4 bg-slate-50/70 dark:bg-slate-800/40 rounded-xl border border-slate-200/70 dark:border-slate-700/60 flex flex-col justify-between space-y-3"
                  >
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-2">
                        <span className="w-6 h-6 rounded-lg bg-emerald-600 text-white font-black text-xs flex items-center justify-center shrink-0 shadow-xs">
                          {step.num}
                        </span>
                        <h3 className="text-xs font-bold text-slate-900 dark:text-slate-100">
                          {step.heading}
                        </h3>
                      </div>
                      <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed pl-8">
                        {step.detail}
                      </p>
                    </div>

                    {step.actionText && step.onAction && (
                      <div className="pl-8 pt-1">
                        <button
                          onClick={step.onAction}
                          className="px-3 py-1 bg-white dark:bg-slate-700 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-50 dark:hover:bg-slate-600 border border-emerald-300 dark:border-emerald-800 rounded-lg text-xs font-bold transition-all shadow-xs inline-flex items-center gap-1.5"
                        >
                          <span>{step.actionText}</span>
                          <ExternalLink className="w-3 h-3" />
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* Pro Tip Box */}
              {section.tip && (
                <div className="p-3 bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/70 rounded-xl flex items-start gap-2.5 text-xs text-amber-900 dark:text-amber-300">
                  <Lightbulb className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold">Shopkeeper Pro Tip: </span>
                    <span>{section.tip}</span>
                  </div>
                </div>
              )}
            </div>
          );
        })}

        {filteredSections.length === 0 && (
          <div className="text-center py-12 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-8 space-y-3">
            <HelpCircle className="w-10 h-10 text-slate-400 mx-auto" />
            <h3 className="text-base font-bold text-slate-800 dark:text-slate-200">
              No matching guide topics found
            </h3>
            <p className="text-xs text-slate-500">
              Try searching for "billing", "scanner", "expiry", or "excel".
            </p>
            <button
              onClick={() => { setActiveCategory('all'); setSearchQuery(''); }}
              className="px-4 py-1.5 bg-emerald-600 text-white rounded-xl text-xs font-bold"
            >
              Show All Topics
            </button>
          </div>
        )}
      </div>

      {/* Keyboard Shortcuts Quick Reference */}
      <div className="bg-slate-900 text-white rounded-2xl p-6 sm:p-8 space-y-4 shadow-md">
        <div className="flex items-center gap-2.5">
          <Keyboard className="w-5 h-5 text-emerald-400" />
          <h3 className="text-sm sm:text-base font-bold tracking-tight">
            Keyboard Shortcuts for Fast Shop Counter Operation
          </h3>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
          <div className="p-3 bg-slate-800 rounded-xl border border-slate-700 flex items-center justify-between">
            <span className="text-slate-300">Open Billing Counter / Galla</span>
            <kbd className="px-2 py-1 bg-slate-700 text-emerald-300 font-mono font-bold rounded border border-slate-600">
              Space / F2
            </kbd>
          </div>
          <div className="p-3 bg-slate-800 rounded-xl border border-slate-700 flex items-center justify-between">
            <span className="text-slate-300">Close Window / Exit Popup</span>
            <kbd className="px-2 py-1 bg-slate-700 text-emerald-300 font-mono font-bold rounded border border-slate-600">
              Esc
            </kbd>
          </div>
          <div className="p-3 bg-slate-800 rounded-xl border border-slate-700 flex items-center justify-between">
            <span className="text-slate-300">Scan Barcode Anywhere</span>
            <kbd className="px-2 py-1 bg-slate-700 text-emerald-300 font-mono font-bold rounded border border-slate-600">
              Pull Trigger
            </kbd>
          </div>
        </div>
      </div>
    </div>
  );
};
