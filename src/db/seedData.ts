import { db } from './index';
import type { Product, ProductBatch, StockHistory, SaleTransaction, ShopSettings } from '../types';

export async function initializeDatabase() {
  const settingsCount = await db.settings.count();
  if (settingsCount === 0) {
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
 * Rich, realistic kirana store demo dataset for hackathon judges & instant testing.
 * Includes:
 * - 1 Expired item (triggers FEFO quarantine shield)
 * - 2 Items expiring in <= 7 days (triggers urgent clearance action)
 * - 2 Items expiring in <= 30 days (triggers upcoming warning)
 * - 2 Low stock items (triggers supplier reorder alert)
 * - 4 Recent sale transactions (populates Hisab/Profit dashboard with live metrics)
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
      id: 'demo_prod_1',
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
      id: 'demo_prod_2',
      name: 'Tata Salt Vacuum Evaporated 1kg',
      brand: 'Tata',
      category: 'Grocery',
      barcode: '8901030383701',
      unit: 'pack',
      costPrice: 22,
      sellingPrice: 28,
      minStockThreshold: 20,
      currentStock: 6, // Low stock!
      createdAt: daysAgo(10),
      updatedAt: daysAgo(2),
    },
    {
      id: 'demo_prod_3',
      name: 'Aashirvaad Shudh Chakki Atta 5kg',
      brand: 'ITC',
      category: 'Grocery',
      barcode: '8901030383702',
      unit: 'bag',
      costPrice: 210,
      sellingPrice: 245,
      minStockThreshold: 10,
      currentStock: 4, // Low stock!
      createdAt: daysAgo(15),
      updatedAt: daysAgo(4),
    },
    {
      id: 'demo_prod_4',
      name: 'Wonder White Bread 400g',
      brand: 'Wonder',
      category: 'Bakery',
      barcode: '8901234567011',
      unit: 'pack',
      costPrice: 32,
      sellingPrice: 40,
      minStockThreshold: 5,
      currentStock: 8,
      createdAt: daysAgo(7),
      updatedAt: daysAgo(2),
    },
    {
      id: 'demo_prod_5',
      name: 'Mother Dairy Fresh Paneer 200g',
      brand: 'Mother Dairy',
      category: 'Dairy',
      barcode: '8901262020088',
      unit: 'pack',
      costPrice: 78,
      sellingPrice: 92,
      minStockThreshold: 6,
      currentStock: 12,
      createdAt: daysAgo(3),
      updatedAt: daysAgo(1),
    },
    {
      id: 'demo_prod_6',
      name: 'Fortune Sunlite Sunflower Oil 1L',
      brand: 'Fortune',
      category: 'Grocery',
      barcode: '8906007280123',
      unit: 'pouch',
      costPrice: 125,
      sellingPrice: 145,
      minStockThreshold: 15,
      currentStock: 22,
      createdAt: daysAgo(20),
      updatedAt: daysAgo(5),
    },
    {
      id: 'demo_prod_7',
      name: 'Parle-G Gold Biscuits 1kg',
      brand: 'Parle',
      category: 'Snacks',
      barcode: '8901719101015',
      unit: 'pack',
      costPrice: 85,
      sellingPrice: 100,
      minStockThreshold: 10,
      currentStock: 30,
      createdAt: daysAgo(25),
      updatedAt: daysAgo(10),
    },
    {
      id: 'demo_prod_8',
      name: 'Dettol Original Soap 125g (Pack of 3)',
      brand: 'Reckitt',
      category: 'Personal Care',
      barcode: '8901396112001',
      unit: 'pack',
      costPrice: 130,
      sellingPrice: 155,
      minStockThreshold: 8,
      currentStock: 16,
      createdAt: daysAgo(30),
      updatedAt: daysAgo(12),
    },
    {
      id: 'demo_prod_9',
      name: 'Maggi 2-Minute Masala Noodles 280g',
      brand: 'Nestle',
      category: 'Snacks',
      barcode: '8901058852331',
      unit: 'pack',
      costPrice: 42,
      sellingPrice: 50,
      minStockThreshold: 12,
      currentStock: 28,
      createdAt: daysAgo(14),
      updatedAt: daysAgo(3),
    },
    {
      id: 'demo_prod_10',
      name: 'Catch Super Garam Masala 100g',
      brand: 'Catch',
      category: 'Spices',
      barcode: '8901192100452',
      unit: 'box',
      costPrice: 62,
      sellingPrice: 78,
      minStockThreshold: 5,
      currentStock: 15,
      createdAt: daysAgo(40),
      updatedAt: daysAgo(15),
    },
  ];

  const sampleBatches: ProductBatch[] = [
    // 1. Expired 2 days ago (Wonder Bread) -> Quarantined
    {
      id: 'demo_batch_bread_exp',
      productId: 'demo_prod_4',
      batchNumber: 'WND-88',
      expiryDate: daysFromNow(-2),
      quantity: 8,
      initialQuantity: 15,
      status: 'expired',
      createdAt: daysAgo(7),
    },
    // 2. Urgent Expiry in 3 days (Amul Milk)
    {
      id: 'demo_batch_milk_urg',
      productId: 'demo_prod_1',
      batchNumber: 'AML-04',
      expiryDate: daysFromNow(3),
      quantity: 14,
      initialQuantity: 20,
      status: 'expiring_soon',
      createdAt: daysAgo(5),
    },
    // 3. Urgent Expiry in 5 days (Fresh Paneer)
    {
      id: 'demo_batch_paneer_urg',
      productId: 'demo_prod_5',
      batchNumber: 'MD-PAN-12',
      expiryDate: daysFromNow(5),
      quantity: 12,
      initialQuantity: 15,
      status: 'expiring_soon',
      createdAt: daysAgo(3),
    },
    // 4. Upcoming Expiry in 22 days (Parle-G)
    {
      id: 'demo_batch_parle_up',
      productId: 'demo_prod_7',
      batchNumber: 'PRL-902',
      expiryDate: daysFromNow(22),
      quantity: 30,
      initialQuantity: 30,
      status: 'active',
      createdAt: daysAgo(25),
    },
    // 5. Safe Batches
    {
      id: 'demo_batch_salt',
      productId: 'demo_prod_2',
      batchNumber: 'TS-881',
      expiryDate: daysFromNow(300),
      quantity: 6,
      initialQuantity: 25,
      status: 'active',
      createdAt: daysAgo(10),
    },
    {
      id: 'demo_batch_atta',
      productId: 'demo_prod_3',
      batchNumber: 'ATT-301',
      expiryDate: daysFromNow(75),
      quantity: 4,
      initialQuantity: 15,
      status: 'active',
      createdAt: daysAgo(15),
    },
    {
      id: 'demo_batch_oil',
      productId: 'demo_prod_6',
      batchNumber: 'FT-55',
      expiryDate: daysFromNow(180),
      quantity: 22,
      initialQuantity: 25,
      status: 'active',
      createdAt: daysAgo(20),
    },
    {
      id: 'demo_batch_soap',
      productId: 'demo_prod_8',
      batchNumber: 'DTL-01',
      expiryDate: daysFromNow(400),
      quantity: 16,
      initialQuantity: 20,
      status: 'active',
      createdAt: daysAgo(30),
    },
    {
      id: 'demo_batch_maggi',
      productId: 'demo_prod_9',
      batchNumber: 'MGG-77',
      expiryDate: daysFromNow(120),
      quantity: 28,
      initialQuantity: 30,
      status: 'active',
      createdAt: daysAgo(14),
    },
    {
      id: 'demo_batch_masala',
      productId: 'demo_prod_10',
      batchNumber: 'CTC-09',
      expiryDate: daysFromNow(250),
      quantity: 15,
      initialQuantity: 20,
      status: 'active',
      createdAt: daysAgo(40),
    },
  ];

    const sampleSales: SaleTransaction[] = [
    {
      id: 'demo_sale_1',
      receiptNumber: '1001',
      timestamp: daysAgo(0),
      items: [
        {
          productId: 'demo_prod_1',
          productName: 'Amul Taaza Toned Milk 1L',
          batchId: 'demo_batch_milk_urg',
          batchNumber: 'AML-04',
          expiryDate: daysFromNow(3),
          quantity: 2,
          unitPrice: 56,
          totalPrice: 112,
          costPrice: 50,
          profit: 12,
        },
        {
          productId: 'demo_prod_9',
          productName: 'Maggi 2-Minute Masala Noodles 280g',
          batchId: 'demo_batch_maggi',
          batchNumber: 'MGG-77',
          expiryDate: daysFromNow(120),
          quantity: 2,
          unitPrice: 50,
          totalPrice: 100,
          costPrice: 42,
          profit: 16,
        },
      ],
      totalAmount: 212, totalCost: 184, totalProfit: 28,
      paymentMethod: 'upi',
      customerName: 'Aman Sharma',
    },
    {
      id: 'demo_sale_2',
      receiptNumber: '1002',
      timestamp: daysAgo(0),
      items: [
        {
          productId: 'demo_prod_6',
          productName: 'Fortune Sunlite Sunflower Oil 1L',
          batchId: 'demo_batch_oil',
          batchNumber: 'FT-55',
          expiryDate: daysFromNow(180),
          quantity: 1,
          unitPrice: 145,
          totalPrice: 145,
          costPrice: 125,
          profit: 20,
        },
        {
          productId: 'demo_prod_2',
          productName: 'Tata Salt Vacuum Evaporated 1kg',
          batchId: 'demo_batch_salt',
          batchNumber: 'TS-881',
          expiryDate: daysFromNow(300),
          quantity: 1,
          unitPrice: 28,
          totalPrice: 28,
          costPrice: 22,
          profit: 6,
        },
      ],
      totalAmount: 173, totalCost: 147, totalProfit: 26,
      paymentMethod: 'cash',
    },
    {
      id: 'demo_sale_3',
      receiptNumber: '1003',
      timestamp: daysAgo(1),
      items: [
        {
          productId: 'demo_prod_3',
          productName: 'Aashirvaad Shudh Chakki Atta 5kg',
          batchId: 'demo_batch_atta',
          batchNumber: 'ATT-301',
          expiryDate: daysFromNow(75),
          quantity: 1,
          unitPrice: 245,
          totalPrice: 245,
          costPrice: 210,
          profit: 35,
        },
        {
          productId: 'demo_prod_8',
          productName: 'Dettol Original Soap 125g (Pack of 3)',
          batchId: 'demo_batch_soap',
          batchNumber: 'DTL-01',
          expiryDate: daysFromNow(400),
          quantity: 1,
          unitPrice: 155,
          totalPrice: 155,
          costPrice: 130,
          profit: 25,
        },
      ],
      totalAmount: 400, totalCost: 340, totalProfit: 60,
      paymentMethod: 'card',
      customerName: 'Pooja Verma',
    },
  ];

  const demoSettings: ShopSettings = {
    id: 'default_settings',
    shopName: 'A-One Kirana & Daily Mart',
    ownerName: 'Ramesh Gupta',
    phone: '+91 98765 43210',
    address: 'Shop #4, Market Road, Sector 12',
    currency: '₹',
    urgentExpiryDays: 7,
    warningExpiryDays: 30,
    theme: 'light',
    soundEnabled: true,
    enableLowStockAlerts: true,
    isOnboarded: true,
    storeType: 'grocery',
  };

  await db.transaction('rw', db.products, db.batches, db.sales, db.settings, async () => {
    await db.products.clear();
    await db.batches.clear();
    await db.sales.clear();
    await db.products.bulkPut(sampleProducts);
    await db.batches.bulkPut(sampleBatches);
    await db.sales.bulkPut(sampleSales);
    await db.settings.put(demoSettings);
  });
}

/**
 * Resets the store back to a completely blank, clean slate
 */
export async function resetStoreDatabase() {
  await db.transaction('rw', db.products, db.batches, db.sales, db.stockHistory, db.settings, async () => {
    await db.products.clear();
    await db.batches.clear();
    await db.sales.clear();
    await db.stockHistory.clear();
    await db.settings.clear();
    await initializeDatabase();
  });
}
