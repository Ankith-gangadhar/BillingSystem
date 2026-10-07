import { describe, it, expect } from 'vitest';
import { searchEngine } from '../server/services/searchService';
import { initTestDb } from '../server/db/database';
import crypto from 'crypto';

describe('MiniSearch In-Memory Search Engine (<50ms performance)', () => {
  it('should search 5,000 products in under 50ms and rank exact matches first', () => {
    const db = initTestDb();
    const userId = crypto.randomUUID();
    db.prepare("INSERT INTO users (id, name, role, pin_hash) VALUES (?, 'Admin', 'admin', 'hash')").run(userId);

    // Insert 5,000 products
    const insert = db.prepare(`
      INSERT INTO products (id, name, local_name, sku, barcode, selling_price, current_stock, is_active, created_by)
      VALUES (?, ?, ?, ?, ?, 5000, 20, 1, ?)
    `);

    const runTx = db.transaction(() => {
      for (let i = 1; i <= 5000; i++) {
        insert.run(
          `prod-${i}`,
          `Coastal Spice Blend #${i}`,
          `Kori Sukka Masala #${i}`,
          `SKU-ITEM-${i}`,
          `890999${String(i).padStart(6, '0')}`,
          userId
        );
      }
      // Add target product
      insert.run(
        'target-kori-rotti',
        'Kori Rotti Mangalore Special Pack',
        'Kori Rotti, Mangalore Crispy Roti',
        'SKU-KR-001',
        '890123456789',
        userId
      );
    });

    runTx();

    // Index all products into in-memory MiniSearch
    const indexStart = performance.now();
    searchEngine.initIndex(db);
    const indexDuration = performance.now() - indexStart;
    console.log(`[Test] Indexed 5,001 items in ${indexDuration.toFixed(2)}ms`);

    // Measure query performance
    const queryStart = performance.now();
    const results = searchEngine.search('kori rotti', 10);
    const queryDuration = performance.now() - queryStart;

    console.log(`[Test] Search query executed in ${queryDuration.toFixed(2)}ms`);

    expect(queryDuration).toBeLessThan(50); // Acceptance criteria: < 50ms
    expect(results.length).toBeGreaterThan(0);
    expect(results[0].name).toContain('Kori Rotti');

    // Barcode exact search test
    const barcodeStart = performance.now();
    const barcodeResults = searchEngine.search('890123456789', 1);
    const barcodeDuration = performance.now() - barcodeStart;

    expect(barcodeDuration).toBeLessThan(10);
    expect(barcodeResults.length).toBe(1);
    expect(barcodeResults[0].id).toBe('target-kori-rotti');

    db.close();
  });
});
