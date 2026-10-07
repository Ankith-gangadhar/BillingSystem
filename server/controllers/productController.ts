import { Request, Response } from 'express';
import { getDb, logAudit } from '../db/database';
import { productRepo } from '../repositories/productRepository';
import { searchEngine } from '../services/searchService';
import { createStockMovement } from '../services/stockService';
import { sanitizeProductForCashier } from '../services/authService';
import { AuthenticatedRequest } from '../middleware/authMiddleware';
import crypto from 'crypto';

export class ProductController {
  static async search(req: AuthenticatedRequest, res: Response): Promise<void> {
    const query = (req.query.q as string) || '';
    const limit = req.query.limit ? parseInt(req.query.limit as string) : 12;
    const results = searchEngine.search(query, limit);

    if (req.user?.role !== 'admin') {
      res.json({ products: results.map((p) => sanitizeProductForCashier(p)) });
      return;
    }

    res.json({ products: results });
  }

  static async getQuickButtons(req: AuthenticatedRequest, res: Response): Promise<void> {
    const products = productRepo.findQuickButtons();
    if (req.user?.role !== 'admin') {
      res.json({ products: products.map((p) => sanitizeProductForCashier(p)) });
      return;
    }
    res.json({ products });
  }

  static async getCategories(_req: Request, res: Response): Promise<void> {
    const categories = productRepo.findCategories();
    res.json({ categories });
  }

  static async getSuppliers(_req: Request, res: Response): Promise<void> {
    const suppliers = productRepo.findSuppliers();
    res.json({ suppliers });
  }

  static async getAll(req: AuthenticatedRequest, res: Response): Promise<void> {
    const db = getDb();
    const { categoryId, supplierId, lowStock, outOfStock, search, limit = 50, offset = 0 } = req.query;

    let query = `
      SELECT p.*, c.name as category_name, s.name as supplier_name
      FROM products p
      LEFT JOIN categories c ON c.id = p.category_id
      LEFT JOIN suppliers s ON s.id = p.supplier_id
      WHERE p.is_active = 1
    `;
    const params: any[] = [];

    if (categoryId) {
      query += ' AND p.category_id = ?';
      params.push(categoryId);
    }
    if (supplierId) {
      query += ' AND p.supplier_id = ?';
      params.push(supplierId);
    }
    if (lowStock === 'true') {
      query += ' AND p.current_stock > 0 AND p.current_stock <= p.min_stock';
    }
    if (outOfStock === 'true') {
      query += ' AND p.current_stock <= 0';
    }
    if (search) {
      query += ' AND (p.name LIKE ? OR p.sku LIKE ? OR p.barcode LIKE ? OR p.local_name LIKE ?)';
      const term = `%${search}%`;
      params.push(term, term, term, term);
    }

    query += ' ORDER BY p.name ASC LIMIT ? OFFSET ?';
    params.push(Number(limit), Number(offset));

    const totalCount = (db.prepare('SELECT count(*) as total FROM products WHERE is_active = 1').get() as any).total;
    const products = db.prepare(query).all(...params) as any[];

    if (req.user?.role !== 'admin') {
      res.json({
        total: totalCount,
        products: products.map((p) => sanitizeProductForCashier(p)),
      });
      return;
    }

    res.json({ total: totalCount, products });
  }

  static async create(req: AuthenticatedRequest, res: Response): Promise<void> {
    const db = getDb();
    const {
      name,
      local_name,
      sku,
      barcode,
      category_id,
      brand,
      unit = 'piece',
      allows_decimal_qty = 0,
      purchase_price = 0,
      selling_price,
      mrp,
      gst_rate = 0,
      opening_stock = 0,
      min_stock = 5,
      reorder_level = 10,
      supplier_id,
      is_quick_button = 0,
      quick_sort_order = 0,
      variant_group,
      parent_product_id,
      description,
    } = req.body;

    if (!name || selling_price === undefined) {
      res.status(400).json({ error: 'Product name and selling price are required.' });
      return;
    }

    if (barcode && productRepo.findByBarcode(barcode)) {
      res.status(400).json({ error: 'Barcode is already assigned to another product.' });
      return;
    }

    if (sku && productRepo.findBySku(sku)) {
      res.status(400).json({ error: 'SKU is already assigned to another product.' });
      return;
    }

    const productId = crypto.randomUUID();
    const now = new Date().toISOString();

    const runTx = db.transaction(() => {
      productRepo.create({
        id: productId,
        name,
        local_name,
        sku,
        barcode,
        category_id,
        brand,
        unit,
        allows_decimal_qty,
        purchase_price,
        selling_price,
        mrp,
        gst_rate,
        current_stock: opening_stock,
        min_stock,
        reorder_level,
        supplier_id,
        description,
        is_quick_button,
        quick_sort_order,
        variant_group,
        parent_product_id,
        created_at: now,
        updated_at: now,
        created_by: req.user!.userId,
      });

      if (opening_stock > 0) {
        createStockMovement(db, {
          productId,
          movementType: 'opening',
          qtyChange: opening_stock,
          reason: 'Initial opening stock',
          referenceType: 'adjustment',
          userId: req.user!.userId,
        });
      }

      logAudit(db, {
        userId: req.user!.userId,
        actingRole: 'admin',
        action: 'PRODUCT_CREATED',
        entityType: 'products',
        entityId: productId,
        newValue: { name, selling_price, sku, barcode, opening_stock },
        severity: 'info',
      });
    });

    runTx();

    const category = category_id ? (db.prepare('SELECT name FROM categories WHERE id = ?').get(category_id) as any) : null;
    searchEngine.upsertProduct({
      id: productId,
      name,
      local_name: local_name || '',
      sku: sku || '',
      barcode: barcode || '',
      barcodes: '',
      brand: brand || '',
      category_name: category ? category.name : 'General',
      selling_price,
      unit,
      allows_decimal_qty: allows_decimal_qty ? 1 : 0,
      current_stock: opening_stock,
      min_stock,
      is_quick_button: is_quick_button ? 1 : 0,
      quick_sort_order,
      is_active: 1,
      sales_frequency: 0,
    });

    const created = productRepo.findById(productId);
    res.status(201).json({ product: created });
  }

  static async update(req: AuthenticatedRequest, res: Response): Promise<void> {
    const db = getDb();
    const productId = req.params.id as string;
    const existing = productRepo.findById(productId);

    if (!existing) {
      res.status(404).json({ error: 'Product not found.' });
      return;
    }

    const {
      name,
      local_name,
      sku,
      barcode,
      category_id,
      brand,
      unit,
      allows_decimal_qty,
      purchase_price,
      selling_price,
      mrp,
      gst_rate,
      min_stock,
      reorder_level,
      supplier_id,
      is_quick_button,
      quick_sort_order,
      description,
    } = req.body;

    productRepo.update(productId, {
      name: name ?? existing.name,
      local_name: local_name ?? existing.local_name,
      sku: sku ?? existing.sku,
      barcode: barcode ?? existing.barcode,
      category_id: category_id !== undefined ? category_id : existing.category_id,
      brand: brand ?? existing.brand,
      unit: unit ?? existing.unit,
      allows_decimal_qty: allows_decimal_qty !== undefined ? (allows_decimal_qty ? 1 : 0) : existing.allows_decimal_qty,
      purchase_price: purchase_price ?? existing.purchase_price,
      selling_price: selling_price ?? existing.selling_price,
      mrp: mrp !== undefined ? mrp : existing.mrp,
      gst_rate: gst_rate ?? existing.gst_rate,
      min_stock: min_stock ?? existing.min_stock,
      reorder_level: reorder_level ?? existing.reorder_level,
      supplier_id: supplier_id !== undefined ? supplier_id : existing.supplier_id,
      is_quick_button: is_quick_button !== undefined ? (is_quick_button ? 1 : 0) : existing.is_quick_button,
      quick_sort_order: quick_sort_order ?? existing.quick_sort_order,
      description: description ?? existing.description,
    });

    logAudit(db, {
      userId: req.user!.userId,
      actingRole: 'admin',
      action: 'PRODUCT_UPDATED',
      entityType: 'products',
      entityId: productId,
      oldValue: existing,
      newValue: req.body,
      severity: 'info',
    });

    const updated = productRepo.findById(productId) as any;
    const category = updated.category_id ? (db.prepare('SELECT name FROM categories WHERE id = ?').get(updated.category_id) as any) : null;

    searchEngine.upsertProduct({
      id: updated.id,
      name: updated.name,
      local_name: updated.local_name || '',
      sku: updated.sku || '',
      barcode: updated.barcode || '',
      barcodes: '',
      brand: updated.brand || '',
      category_name: category ? category.name : 'General',
      selling_price: updated.selling_price,
      unit: updated.unit,
      allows_decimal_qty: updated.allows_decimal_qty,
      current_stock: updated.current_stock,
      min_stock: updated.min_stock,
      is_quick_button: updated.is_quick_button,
      quick_sort_order: updated.quick_sort_order,
      is_active: updated.is_active,
      sales_frequency: 0,
    });

    res.json({ product: updated });
  }

  static async delete(req: AuthenticatedRequest, res: Response): Promise<void> {
    const db = getDb();
    const productId = req.params.id as string;

    productRepo.softDelete(productId);
    searchEngine.removeProduct(productId);

    logAudit(db, {
      userId: req.user!.userId,
      actingRole: 'admin',
      action: 'PRODUCT_DEACTIVATED',
      entityType: 'products',
      entityId: productId,
      severity: 'notice',
    });

    res.json({ success: true, message: 'Product successfully deactivated.' });
  }
}
