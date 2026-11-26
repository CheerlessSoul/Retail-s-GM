export interface Product {
  id: string;
  name: string;
  brand: string;
  category: string;
  barcode: string;
  unit: string;
  costPrice: number;
  sellingPrice: number;
  minStockThreshold: number;
  currentStock: number;
  imageUrl?: string;
  createdAt: string;
  updatedAt: string;
}

export type BatchStatus = 'active' | 'expiring_soon' | 'expired' | 'disposed' | 'cleared';

export interface ProductBatch {
  id: string;
  productId: string;
  batchNumber: string;
  expiryDate: string; // ISO date YYYY-MM-DD
  mfgDate?: string;    // ISO date YYYY-MM-DD
  quantity: number;
  initialQuantity: number;
  status: BatchStatus;
  notes?: string;
  createdAt: string;
}

export type StockChangeType = 
  | 'restock' 
  | 'sale' 
  | 'damaged' 
  | 'expired_removal' 
  | 'adjustment' 
  | 'clearance';

export interface StockHistory {
  id: string;
  productId: string;
  productName: string;
  batchNumber?: string;
  type: StockChangeType;
  quantityDelta: number; // positive or negative
  stockBefore: number;
  stockAfter: number;
  reason: string;
  timestamp: string; // ISO string
}

export interface SaleItem {
  productId: string;
  productName: string;
  batchId: string;
  batchNumber: string;
  expiryDate: string;
  quantity: number;
  unitPrice: number;
  costPrice: number;
  totalPrice: number;
  profit: number;
}

export interface SaleTransaction {
  id: string;
  receiptNumber: string;
  items: SaleItem[];
  totalAmount: number;
  totalCost: number;
  totalProfit: number;
  paymentMethod: 'cash' | 'upi' | 'card' | 'credit';
  customerName?: string;
  timestamp: string; // ISO string
}

export type SupportedLanguage = 'en' | 'hi' | 'ta' | 'mr' | 'pa' | 'my';

export interface ShopSettings {
  id?: string;
  shopName: string;
  ownerName: string;
  phone: string;
  address: string;
  currency: string;
  urgentExpiryDays: number;
  warningExpiryDays: number;
  theme: 'light' | 'dark';
  soundEnabled: boolean;
  enableLowStockAlerts: boolean;
  isOnboarded?: boolean;
  storeType?: 'grocery' | 'pharmacy' | 'general' | 'dairy' | 'other';
  language?: SupportedLanguage;
}

export interface OcrExtractedData {
  productName?: string;
  brand?: string;
  expiryDate?: string;
  mfgDate?: string;
  batchNumber?: string;
  mrp?: number;
  netQty?: string;
  rawText: string;
  confidence: number;
}

export type ActiveTab = 'products' | 'expiry' | 'inventory' | 'analytics' | 'pos' | 'settings' | 'guide';
