import { Database } from 'better-sqlite3';
import { getDb } from '../db/database';
import { Product } from '../../shared/types';

export class ProductRepository {
  constructor(private db: Database = getDb()) {}

  findById(id: string): Product | undefined {
    return this.db.prepare(`
      SELECT p.*, c.name as category_name, s.name as supplier_name
      FROM products p
      LEFT JOIN categories c ON c.id = p.category_id
      LEFT JOIN suppliers s ON s.id = p.supplier_id
      WHERE p.id = ?
    `).get(id) as Product | undefined;
  }

  findByBarcode(barcode: string): Product | undefined {
    return this.db.prepare('SELECT * FROM products WHERE barcode = ? AND is_active = 1').get(barcode) as Product | undefined;
  }

  findBySku(sku: string): Product | undefined {
    return this.db.prepare('SELECT * FROM products WHERE sku = ? AND is_active = 1').get(sku) as Product | undefined;
  }

  findAllActive(): any[] {
    return this.db.prepare(`
      SELECT 
        p.*,
        COALESCE(c.name, 'General') as category_name,
        COALESCE(sales.sold_count, 0) as sales_frequency
      FROM products p
      LEFT JOIN categories c ON c.id = p.category_id
      LEFT JOIN (
        SELECT product_id, COUNT(*) as sold_count 
        FROM bill_items 
        GROUP BY product_id
      ) sales ON sales.product_id = p.id
      WHERE p.is_active = 1
      ORDER BY p.name ASC
    `).all();
  }

  findQuickButtons(): any[] {
    return this.db.prepare(`
      SELECT p.*, c.name as category_name
      FROM products p
      LEFT JOIN categories c ON c.id = p.category_id
      WHERE p.is_active = 1 AND p.is_quick_button = 1
      ORDER BY p.quick_sort_order ASC, p.name ASC
    `).all();
  }

  findCategories(): any[] {
    return this.db.prepare('SELECT * FROM categories WHERE is_active = 1 ORDER BY sort_order ASC, name ASC').all();
  }

  findSuppliers(): any[] {
    return this.db.prepare('SELECT * FROM suppliers WHERE is_active = 1 ORDER BY name ASC').all();
  }

  create(product: any): void {
    this.db.prepare(`
      INSERT INTO products (
        id, name, local_name, sku, barcode, category_id, brand, unit,
        allows_decimal_qty, purchase_price, selling_price, mrp, gst_rate,
        current_stock, min_stock, reorder_level, supplier_id, image_path,
        description, is_quick_button, quick_sort_order, variant_group,
        parent_product_id, is_active, created_at, updated_at, created_by
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL, ?, ?, ?, ?, ?, 1, ?, ?, ?)
    `).run(
      product.id,
      product.name,
      product.local_name || null,
      product.sku || null,
      product.barcode || null,
      product.category_id || null,
      product.brand || null,
      product.unit || 'piece',
      product.allows_decimal_qty ? 1 : 0,
      product.purchase_price || 0,
      product.selling_price,
      product.mrp || null,
      product.gst_rate || 0,
      product.current_stock || 0,
      product.min_stock || 5,
      product.reorder_level || 10,
      product.supplier_id || null,
      product.description || null,
      product.is_quick_button ? 1 : 0,
      product.quick_sort_order || 0,
      product.variant_group || null,
      product.parent_product_id || null,
      product.created_at,
      product.updated_at,
      product.created_by
    );
  }

  update(id: string, updates: any): void {
    const fields = Object.keys(updates)
      .map((key) => `${key} = ?`)
      .join(', ');
    const values = [...Object.values(updates), id];
    this.db.prepare(`UPDATE products SET ${fields}, updated_at = datetime('now', 'localtime') WHERE id = ?`).run(...values);
  }

  updateStock(id: string, newStock: number): void {
    this.db.prepare("UPDATE products SET current_stock = ?, updated_at = datetime('now', 'localtime') WHERE id = ?").run(newStock, id);
  }

  softDelete(id: string): void {
    this.db.prepare("UPDATE products SET is_active = 0, updated_at = datetime('now', 'localtime') WHERE id = ?").run(id);
  }
}

export const productRepo = new ProductRepository();
