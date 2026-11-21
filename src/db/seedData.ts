import { db } from './index';
import type { Product, ProductBatch, StockHistory, SaleTransaction, ShopSettings } from '../types';

export async function initializeDatabase() {
  const settingsCount = await db.settings.count();
  if (settingsCount === 0) {
    // Fresh store default settings - not onboarded yet
    const defaultSettings: ShopSettings = {
      id: 'default_settings',
      shopName: '',
      ownerName: '',
      phone: '',
      address: '',
      currency: '₹',
      urgentExpiryDays: 7,
      warningExpiryDays: 30,
      theme: 'light',
      soundEnabled: true,
      enableLowStockAlerts: true,
      isOnboarded: false,
      storeType: 'grocery',
    };
    await db.settings.put(defaultSettings);
  }
}

/**
 * Optional: Can be called from Settings if a user specifically requests to load sample data for testing
 */
export async function loadSampleDemoData() {
  const daysFromNow = (days: number) => {
    const d = new Date();
    d.setDate(d.getDate() + days);
    return d.toISOString().split('T')[0];
  };

  const daysAgo = (days: number) => {
    const d = new Date();
    d.setDate(d.getDate() - days);
    return d.toISOString();
  };

  const sampleProducts: Product[] = [
    {
      id: 'prod_1',
      name: 'Amul Taaza Toned Milk 1L',
      brand: 'Amul',
      category: 'Dairy',
      barcode: '8901262010052',
      unit: 'pack',
      costPrice: 50,
      sellingPrice: 56,
      minStockThreshold: 10,
      currentStock: 14,
      createdAt: daysAgo(5),
      updatedAt: daysAgo(1),
    },
    {
      id: 'prod_2',
      name: 'Tata Salt Vacuum Evaporated 1kg',
      brand: 'Tata',
      category: 'Grocery',
      barcode: '8901030383701',
      unit: 'pack',
      costPrice: 22,
      sellingPrice: 28,
      minStockThreshold: 15,
      currentStock: 25,
      createdAt: daysAgo(10),
      updatedAt: daysAgo(2),
    },
    {
      id: 'prod_3',
      name: 'Dolo 650mg Paracetamol Strip (15 Tab)',
      brand: 'Micro Labs',
      category: 'Medicines',
      barcode: '8901148212034',
      unit: 'strip',
      costPrice: 24,
      sellingPrice: 34,
      minStockThreshold: 10,
      currentStock: 18,
      createdAt: daysAgo(12),
      updatedAt: daysAgo(3),
    },
    {
      id: 'prod_4',
      name: 'Aashirvaad Shudh Chakki Atta 5kg',
      brand: 'ITC',
      category: 'Grocery',
      barcode: '8901030383702',
      unit: 'bag',
      costPrice: 210,
      sellingPrice: 245,
      minStockThreshold: 5,
      currentStock: 15,
      createdAt: daysAgo(15),
      updatedAt: daysAgo(4),
    },
  ];

  const sampleBatches: ProductBatch[] = [
    {
      id: 'batch_1',
      productId: 'prod_1',
      batchNumber: 'AML-04',
      expiryDate: daysFromNow(2),
      quantity: 14,
      initialQuantity: 14,
      status: 'expiring_soon',
      createdAt: daysAgo(5),
    },
    {
      id: 'batch_2',
      productId: 'prod_2',
      batchNumber: 'TS-881',
      expiryDate: daysFromNow(365),
      quantity: 25,
      initialQuantity: 25,
      status: 'active',
      createdAt: daysAgo(10),
    },
    {
      id: 'batch_3',
      productId: 'prod_3',
      batchNumber: 'DL-2026B',
      expiryDate: daysFromNow(180),
      quantity: 18,
      initialQuantity: 18,
      status: 'active',
      createdAt: daysAgo(12),
    },
    {
      id: 'batch_4',
      productId: 'prod_4',
      batchNumber: 'ATT-301',
      expiryDate: daysFromNow(90),
      quantity: 15,
      initialQuantity: 15,
      status: 'active',
      createdAt: daysAgo(15),
    },
  ];

  await db.transaction('rw', db.products, db.batches, async () => {
    await db.products.bulkPut(sampleProducts);
    await db.batches.bulkPut(sampleBatches);
  });
}
