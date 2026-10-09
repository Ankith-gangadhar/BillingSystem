"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.searchEngine = void 0;
const minisearch_1 = require("minisearch");
class ProductSearchEngine {
    miniSearch;
    isIndexed = false;
    productMap = new Map();
    constructor() {
        this.miniSearch = new minisearch_1.default({
            fields: ['name', 'local_name', 'sku', 'barcode', 'barcodes', 'brand', 'category_name'],
            storeFields: [
                'id', 'name', 'local_name', 'sku', 'barcode', 'brand', 'category_name',
                'selling_price', 'unit', 'allows_decimal_qty', 'current_stock',
                'min_stock', 'is_quick_button', 'quick_sort_order', 'is_active', 'sales_frequency'
            ],
            searchOptions: {
                boost: {
                    barcode: 10,
                    sku: 8,
                    name: 5,
                    local_name: 4,
                    brand: 2,
                    category_name: 1.5,
                },
                prefix: true,
                fuzzy: (term) => (term.length > 3 ? 0.25 : false),
            },
        });
    }
    initIndex(db) {
        const products = db.prepare(`
      SELECT 
        p.id,
        p.name,
        COALESCE(p.local_name, '') as local_name,
        COALESCE(p.sku, '') as sku,
        COALESCE(p.barcode, '') as barcode,
        COALESCE(p.brand, '') as brand,
        COALESCE(c.name, 'General') as category_name,
        p.selling_price,
        p.unit,
        p.allows_decimal_qty,
        p.current_stock,
        p.min_stock,
        p.is_quick_button,
        p.quick_sort_order,
        p.is_active,
        COALESCE(sales.sold_count, 0) as sales_frequency
      FROM products p
      LEFT JOIN categories c ON c.id = p.category_id
      LEFT JOIN (
        SELECT product_id, COUNT(*) as sold_count 
        FROM bill_items 
        GROUP BY product_id
      ) sales ON sales.product_id = p.id
      WHERE p.is_active = 1
    `).all();
        // Load additional barcodes
        const extraBarcodes = db.prepare('SELECT product_id, barcode FROM product_barcodes').all();
        const extraBarcodesMap = new Map();
        for (const eb of extraBarcodes) {
            const list = extraBarcodesMap.get(eb.product_id) || [];
            list.push(eb.barcode);
            extraBarcodesMap.set(eb.product_id, list);
        }
        const docs = products.map((p) => {
            const extraList = extraBarcodesMap.get(p.id) || [];
            return {
                ...p,
                barcodes: extraList.join(' '),
            };
        });
        this.miniSearch.removeAll();
        this.productMap.clear();
        for (const doc of docs) {
            this.productMap.set(doc.id, doc);
        }
        this.miniSearch.addAll(docs);
        this.isIndexed = true;
        console.log(`[SearchEngine] Indexed ${docs.length} active products in memory.`);
    }
    upsertProduct(product) {
        if (this.productMap.has(product.id)) {
            this.miniSearch.discard(product.id);
        }
        if (product.is_active === 1) {
            this.productMap.set(product.id, product);
            this.miniSearch.add(product);
        }
        else {
            this.productMap.delete(product.id);
        }
    }
    removeProduct(productId) {
        if (this.productMap.has(productId)) {
            this.miniSearch.discard(productId);
            this.productMap.delete(productId);
        }
    }
    updateStock(productId, newStock) {
        const doc = this.productMap.get(productId);
        if (doc) {
            doc.current_stock = newStock;
            this.miniSearch.discard(productId);
            this.miniSearch.add(doc);
        }
    }
    search(query, limit = 12) {
        const cleanQuery = query.trim().toLowerCase();
        if (!cleanQuery) {
            // Return frequently sold and quick buttons if query is empty
            const all = Array.from(this.productMap.values());
            return all
                .sort((a, b) => b.sales_frequency - a.sales_frequency || a.quick_sort_order - b.quick_sort_order)
                .slice(0, limit);
        }
        // 1. Direct exact barcode match (instant O(1))
        for (const item of this.productMap.values()) {
            if (item.barcode.toLowerCase() === cleanQuery ||
                item.sku.toLowerCase() === cleanQuery ||
                (item.barcodes && item.barcodes.toLowerCase().split(' ').includes(cleanQuery))) {
                return [item];
            }
        }
        // 2. MiniSearch ranked search
        const results = this.miniSearch.search(cleanQuery, {
            prefix: true,
            fuzzy: (term) => (term.length > 3 ? 0.25 : false),
            combineWith: 'OR',
        });
        if (results.length > 0) {
            return results.slice(0, limit).map((r) => this.productMap.get(r.id));
        }
        // 3. Fallback manual substring check for local transliteration
        const fallbackResults = [];
        for (const item of this.productMap.values()) {
            if (item.name.toLowerCase().includes(cleanQuery) ||
                item.local_name.toLowerCase().includes(cleanQuery) ||
                item.category_name.toLowerCase().includes(cleanQuery) ||
                item.brand.toLowerCase().includes(cleanQuery)) {
                fallbackResults.push(item);
                if (fallbackResults.length >= limit)
                    break;
            }
        }
        return fallbackResults;
    }
}
exports.searchEngine = new ProductSearchEngine();
