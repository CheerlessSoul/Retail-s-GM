# Retail's GM - AI-Powered Retail Management System

An easy-to-use, AI-powered retail management web application built specifically for small retail shop owners (grocery stores, general stores, mini-marts, and pharmacy/medical retail stores).

---

## 🌟 Key Features

### 1. Product Management
- **Manual Product Entry**: Easily add products with cost price, selling price, category, brand, and barcode.
- **Barcode Camera Scanner**: Integrated camera scanner supporting EAN-13, UPC, Code-128, and QR codes via phone or webcam.
- **AI-Powered OCR Label Reader**: Upload product package photos to automatically extract product name, brand, expiry date, manufacturing date (MFD), batch number, and MRP.
- **Verification & Edit Screen**: Side-by-side view showing the original packaging photo with OCR confidence metrics and editable fields before saving.

### 2. Smart Expiry Management
- **Batch-Level Tracking**: Track expiry dates and quantities per batch.
- **Automatic Expiry Quarantine**: Past-expiry items are automatically separated and flagged to prevent accidental sales.
- **Expiry Urgency Categorization**:
  - 🔴 **Expired**: Past expiry date with calculated financial loss.
  - 🟠 **Urgent (&le; 7 Days)**: Clearances or vendor returns required immediately.
  - 🟡 **Upcoming (&le; 30 Days)**: Reorder and promotion warning.
  - 🟢 **Fresh & Safe**: Shelf life &gt; 30 days.
- **Action Buttons**: One-click **Dispose / Write-Off**, **Return to Vendor**, and **Clearance Sale** discounts (15%, 25%, 35%, 50% off).

### 3. Inventory Management
- **Live Inventory Overview**: Real-time stock counts across all SKUs.
- **Inventory Valuation**: Capital invested (at cost) vs retail potential (at selling price).
- **Stock Audit & Adjustments**: Restock, record damaged/spilled goods, and perform physical audit corrections with shortage/surplus toggles.
- **Full History Log**: Complete chronological audit trail capturing all stock changes, deltas, and reasons.

### 4. Business Analytics & Profit
- **Financial Performance**: Gross Revenue, Estimated Net Profit, Cost of Goods Sold (COGS), and Profit Margin %.
- **Interactive Visual Charts**:
  - Daily Revenue vs Estimated Profit Trend (Area Chart).
  - Revenue Contribution by Category (Donut Chart).
  - Real-time Shelf & Expiry Health Distribution.
- **Best-Selling Products**: Ranked table of top products by volume sold and revenue generated.

### 5. Quick Sale / POS Checkout
- Fast barcode/search checkout interface.
- **FEFO (First-Expire-First-Out)** automatic batch allocation.
- **Customer Protection Guard**: Strictly blocks ringing up expired quarantined items.
- Cash, UPI/QR, Card, and Khata (Credit) payment options.
- Printable digital receipts.

### 6. Design & Accessibility
- Clean **Green + White** professional theme.
- Built-in **Night / Dark Mode** toggle in Settings and navigation bar.
- Responsive across all viewports (PC, Laptop, Tablet, Mobile).
- Offline-First local persistence with **IndexedDB (Dexie.js)**.
- Data export & restore via JSON backup files.

---

## 🚀 Getting Started

### Prerequisites
- Node.js (v18 or higher)
- npm or yarn

### Installation

```bash
# Clone the repository
git clone https://github.com/CheerlessSoul/Retail-s-GM.git
cd Retail-s-GM

# Install dependencies
npm install

# Start development server
npm run dev
```


### Production Build

```bash
npm run build
npm run preview
```

---

## 🛠️ Tech Stack
- **Frontend**: React 18, TypeScript, Vite
- **Styling**: Tailwind CSS
- **Local Database**: Dexie.js (IndexedDB)
- **AI OCR**: Tesseract.js & Heuristic Packaging Parser
- **Barcode Scanner**: html5-qrcode & Web Audio Synthesizer
- **Charts**: Recharts
- **Icons**: Lucide React
