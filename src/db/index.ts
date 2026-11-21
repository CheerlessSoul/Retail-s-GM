import Dexie, { type Table } from 'dexie';
import type { 
  Product, 
  ProductBatch, 
  StockHistory, 
  SaleTransaction, 
  ShopSettings, 
  SaleItem, 
  StockChangeType 
} from '../types';

export class RetailDatabase extends Dexie {
  products!: Table<Product, string>;
  batches!: Table<ProductBatch, string>;
  stockHistory!: Table<StockHistory, string>;
  sales!: Table<SaleTransaction, string>;
  settings!: Table<ShopSettings, string>;

  constructor() {
    super('RetailsGM_DB');
    this.version(1).stores({
      products: 'id, barcode, category, name, currentStock, updatedAt',
      batches: 'id, productId, expiryDate, status, batchNumber',
      stockHistory: 'id, productId, type, timestamp',
      sales: 'id, receiptNumber, timestamp',
      settings: 'id'
    });
  }

  /**
   * Helper to parse date string into local midnight Date avoiding UTC midnight drift
   */
  parseLocalDate(dateStr: string): Date {
    const parts = dateStr.split(/[-/]/).map(Number);
    if (parts.length === 3 && parts[0] > 1900) {
      return new Date(parts[0], parts[1] - 1, parts[2], 0, 0, 0, 0);
    }
    const d = new Date(dateStr);
    d.setHours(0, 0, 0, 0);
    return d;
  }

  /**
   * Compute status based on expiry date string
   */
  computeBatchStatus(expiryDateStr: string): 'active' | 'expiring_soon' | 'expired' {
    if (!expiryDateStr) return 'active';
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const expiry = this.parseLocalDate(expiryDateStr);
    const diffDays = Math.ceil((expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays <= 0) return 'expired';
    if (diffDays <= 30) return 'expiring_soon';
    return 'active';
  }

  /**
   * Helper to add a new product along with its initial batch
   */
  async addProductWithBatch(
    productData: Omit<Product, 'currentStock' | 'createdAt' | 'updatedAt'>,
    batchData: {
      batchNumber: string;
      expiryDate: string;
      mfgDate?: string;
      quantity: number;
      notes?: string;
    }
  ) {
    const now = new Date().toISOString();
    const productId = productData.id || `prod_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const batchId = `batch_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

    const newProduct: Product = {
      ...productData,
      id: productId,
      currentStock: Number(batchData.quantity) || 0,
      createdAt: now,
      updatedAt: now,
    };

    const newBatch: ProductBatch = {
      id: batchId,
      productId: productId,
      batchNumber: batchData.batchNumber || 'B-01',
      expiryDate: batchData.expiryDate,
      mfgDate: batchData.mfgDate,
      quantity: Number(batchData.quantity) || 0,
      initialQuantity: Number(batchData.quantity) || 0,
      status: this.computeBatchStatus(batchData.expiryDate),
      notes: batchData.notes,
      createdAt: now,
    };

    const historyEntry: StockHistory = {
      id: `hist_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      productId: productId,
      productName: newProduct.name,
      batchNumber: newBatch.batchNumber,
      type: 'restock',
      quantityDelta: newBatch.quantity,
      stockBefore: 0,
      stockAfter: newBatch.quantity,
      reason: 'Initial stock intake',
      timestamp: now,
    };

    await this.transaction('rw', this.products, this.batches, this.stockHistory, async () => {
      await this.products.put(newProduct);
      await this.batches.put(newBatch);
      await this.stockHistory.put(historyEntry);
    });

    return { product: newProduct, batch: newBatch };
  }

  /**
   * Bulk import products with their initial batches from sheet or CSV
   */
  async bulkAddProductsWithBatches(
    items: Array<{
      product: Omit<Product, 'currentStock' | 'createdAt' | 'updatedAt'>;
      batch: {
        batchNumber: string;
        expiryDate: string;
        mfgDate?: string;
        quantity: number;
        notes?: string;
      };
    }>
  ) {
    const now = new Date().toISOString();
    const productsToAdd: Product[] = [];
    const batchesToAdd: ProductBatch[] = [];
    const historyToAdd: StockHistory[] = [];

    for (const item of items) {
      const pId = item.product.id || `prod_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      const bId = `batch_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

      const newProduct: Product = {
        ...item.product,
        id: pId,
        currentStock: Number(item.batch.quantity) || 0,
        createdAt: now,
        updatedAt: now,
      };

      const newBatch: ProductBatch = {
        id: bId,
        productId: pId,
        batchNumber: item.batch.batchNumber || 'B-01',
        expiryDate: item.batch.expiryDate,
        mfgDate: item.batch.mfgDate,
        quantity: Number(item.batch.quantity) || 0,
        initialQuantity: Number(item.batch.quantity) || 0,
        status: this.computeBatchStatus(item.batch.expiryDate),
        notes: item.batch.notes,
        createdAt: now,
      };

      const historyEntry: StockHistory = {
        id: `hist_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        productId: pId,
        productName: newProduct.name,
        batchNumber: newBatch.batchNumber,
        type: 'restock',
        quantityDelta: newBatch.quantity,
        stockBefore: 0,
        stockAfter: newBatch.quantity,
        reason: 'Sheet import stock intake',
        timestamp: now,
      };

      productsToAdd.push(newProduct);
      batchesToAdd.push(newBatch);
      historyToAdd.push(historyEntry);
    }

    await this.transaction('rw', this.products, this.batches, this.stockHistory, async () => {
      await this.products.bulkPut(productsToAdd);
      await this.batches.bulkPut(batchesToAdd);
      await this.stockHistory.bulkPut(historyToAdd);
    });

    return { products: productsToAdd, batches: batchesToAdd };
  }

  /**
   * Reset and clear all store inventory and transaction data (demo wipe)
   */
  async clearAllStoreData() {
    await this.transaction('rw', this.products, this.batches, this.stockHistory, this.sales, async () => {
      await this.products.clear();
      await this.batches.clear();
      await this.stockHistory.clear();
      await this.sales.clear();
    });
  }

  /**
   * Add a new batch to an existing product
   */
  async addBatchToProduct(
    productId: string,
    batchData: {
      batchNumber: string;
      expiryDate: string;
      mfgDate?: string;
      quantity: number;
      notes?: string;
    }
  ) {
    const now = new Date().toISOString();
    const product = await this.products.get(productId);
    if (!product) throw new Error('Product not found');

    const batchId = `batch_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const qty = Number(batchData.quantity) || 0;

    const newBatch: ProductBatch = {
      id: batchId,
      productId,
      batchNumber: batchData.batchNumber || `B-${Date.now().toString().slice(-4)}`,
      expiryDate: batchData.expiryDate,
      mfgDate: batchData.mfgDate,
      quantity: qty,
      initialQuantity: qty,
      status: this.computeBatchStatus(batchData.expiryDate),
      notes: batchData.notes,
      createdAt: now,
    };

    const stockBefore = product.currentStock;
    const stockAfter = stockBefore + qty;

    const historyEntry: StockHistory = {
      id: `hist_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      productId,
      productName: product.name,
      batchNumber: newBatch.batchNumber,
      type: 'restock',
      quantityDelta: qty,
      stockBefore,
      stockAfter,
      reason: 'New batch restock',
      timestamp: now,
    };

    await this.transaction('rw', this.products, this.batches, this.stockHistory, async () => {
      await this.batches.put(newBatch);
      await this.products.update(productId, {
        currentStock: stockAfter,
        updatedAt: now,
      });
      await this.stockHistory.put(historyEntry);
    });

    return newBatch;
  }

  /**
   * Adjust stock for damage, count correction, or write-off
   */
  async adjustStock(
    productId: string,
    batchId: string,
    quantityDelta: number,
    type: StockChangeType,
    reason: string
  ) {
    const now = new Date().toISOString();
    const product = await this.products.get(productId);
    const batch = await this.batches.get(batchId);

    if (!product || !batch) throw new Error('Product or batch not found');

    const newBatchQty = Math.max(0, batch.quantity + quantityDelta);
    const actualDelta = newBatchQty - batch.quantity;
    const stockBefore = product.currentStock;
    const stockAfter = Math.max(0, stockBefore + actualDelta);

    const historyEntry: StockHistory = {
      id: `hist_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      productId,
      productName: product.name,
      batchNumber: batch.batchNumber,
      type,
      quantityDelta: actualDelta,
      stockBefore,
      stockAfter,
      reason: reason || 'Manual stock adjustment',
      timestamp: now,
    };

    await this.transaction('rw', this.products, this.batches, this.stockHistory, async () => {
      await this.batches.update(batchId, {
        quantity: newBatchQty,
        status: newBatchQty === 0 && batch.status === 'expired' ? 'disposed' : batch.status,
      });
      await this.products.update(productId, {
        currentStock: stockAfter,
        updatedAt: now,
      });
      await this.stockHistory.put(historyEntry);
    });
  }

  /**
   * Process a sale transaction with strict FEFO allocation and non-expired stock guarantees
   */
  async processSale(
    cartItems: { productId: string; quantity: number }[],
    paymentMethod: 'cash' | 'upi' | 'card' | 'credit',
    customerName?: string
  ): Promise<SaleTransaction> {
    const now = new Date().toISOString();
    const receiptNumber = `RGM-${Date.now().toString().slice(-6)}`;
    const saleItems: SaleItem[] = [];

    let totalAmount = 0;
    let totalCost = 0;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    await this.transaction('rw', this.products, this.batches, this.stockHistory, this.sales, async () => {
      for (const item of cartItems) {
        const product = await this.products.get(item.productId);
        if (!product) throw new Error(`Product ${item.productId} not found`);

        // Fetch batches sorted by expiryDate ascending (FEFO - First Expire First Out)
        const batches = await this.batches
          .where('productId')
          .equals(item.productId)
          .toArray();

        // Strictly filter to valid, non-expired, active batches
        const validBatches = batches
          .filter((b) => {
            if (b.quantity <= 0 || b.status === 'disposed' || b.status === 'expired') return false;
            const exp = this.parseLocalDate(b.expiryDate);
            return Math.ceil((exp.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)) > 0;
          })
          .sort((a, b) => new Date(a.expiryDate).getTime() - new Date(b.expiryDate).getTime());

        // PRE-VALIDATION: Ensure sufficient saleable, non-expired stock exists
        const totalSaleableAvailable = validBatches.reduce((acc, b) => acc + b.quantity, 0);
        if (totalSaleableAvailable < item.quantity) {
          if (totalSaleableAvailable === 0 && batches.some((b) => b.quantity > 0)) {
            throw new Error(`Cannot sell "${product.name}": All available units are expired and quarantined for customer safety.`);
          }
          throw new Error(`Insufficient stock for "${product.name}". Requested: ${item.quantity}, Available: ${totalSaleableAvailable}`);
        }

        let remainingToDeduct = item.quantity;

        for (const batch of validBatches) {
          if (remainingToDeduct <= 0) break;

          const deductFromThisBatch = Math.min(batch.quantity, remainingToDeduct);
          const newBatchQty = batch.quantity - deductFromThisBatch;
          remainingToDeduct -= deductFromThisBatch;

          const itemTotal = deductFromThisBatch * product.sellingPrice;
          const itemCost = deductFromThisBatch * product.costPrice;
          const itemProfit = itemTotal - itemCost;

          totalAmount += itemTotal;
          totalCost += itemCost;

          saleItems.push({
            productId: product.id,
            productName: product.name,
            batchId: batch.id,
            batchNumber: batch.batchNumber,
            expiryDate: batch.expiryDate,
            quantity: deductFromThisBatch,
            unitPrice: product.sellingPrice,
            costPrice: product.costPrice,
            totalPrice: itemTotal,
            profit: itemProfit,
          });

          await this.batches.update(batch.id, { quantity: newBatchQty });
        }

        // Deduct from aggregate product stock atomically
        const newProductStock = Math.max(0, product.currentStock - item.quantity);
        await this.products.update(product.id, {
          currentStock: newProductStock,
          updatedAt: now,
        });

        await this.stockHistory.put({
          id: `hist_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
          productId: product.id,
          productName: product.name,
          type: 'sale',
          quantityDelta: -item.quantity,
          stockBefore: product.currentStock,
          stockAfter: newProductStock,
          reason: `Sale receipt #${receiptNumber}`,
          timestamp: now,
        });
      }

      const totalProfit = totalAmount - totalCost;
      const transaction: SaleTransaction = {
        id: `sale_${Date.now()}`,
        receiptNumber,
        items: saleItems,
        totalAmount,
        totalCost,
        totalProfit,
        paymentMethod,
        customerName: customerName?.trim() || undefined,
        timestamp: now,
      };

      await this.sales.put(transaction);
    });

    const savedSale = await this.sales.where('receiptNumber').equals(receiptNumber).first();
    return savedSale!;
  }
}

export const db = new RetailDatabase();
