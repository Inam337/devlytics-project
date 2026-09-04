import type { Product } from '@/models';

export function getProductStockTotal(product: Product): number {
  if (!product.stockEntries?.length) {
    return 0;
  }

  return product.stockEntries.reduce((sum, entry) => sum + entry.quantity, 0);
}

export function isLowStock(product: Product): boolean {
  const stock = getProductStockTotal(product);

  return stock > 0 && stock <= product.reorderLevel;
}
