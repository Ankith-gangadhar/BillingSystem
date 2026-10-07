import { getDb } from './database';
import { searchEngine } from '../services/searchService';
import crypto from 'crypto';

export function run5kSeed(db = getDb()) {
  console.log('[Seed5K] Generating 5,000 realistic retail products for performance validation...');

  const admin = db.prepare("SELECT id FROM users WHERE role = 'admin' LIMIT 1").get() as any;
  const adminId = admin ? admin.id : crypto.randomUUID();

  const categories = ['Snacks', 'Pickles', 'Spices', 'Oils & Ghee', 'Ready to Cook', 'Sweets', 'Beverages', 'Rice & Grains', 'Organic Staples', 'Dry Fruits'];
  const catMap = new Map<string, string>();

  for (const c of categories) {
    const existing = db.prepare('SELECT id FROM categories WHERE name = ?').get(c) as any;
    if (existing) {
      catMap.set(c, existing.id);
    } else {
      const id = crypto.randomUUID();
      db.prepare('INSERT INTO categories (id, name, is_active) VALUES (?, ?, 1)').run(id, c);
      catMap.set(c, id);
    }
  }

  const coastalPrefixes = ['Mangalore', 'Udupi', 'Kundapura', 'Malenadu', 'Karavali', 'Tulunadu', 'Western Ghats', 'Coorg', 'Sirsi', 'Honnavar'];
  const itemBases = [
    'Jackfruit Crisps', 'Banana Wafers', 'Kori Masala', 'Fish Curry Blend', 'Pickled Bamboo Shoot',
    'Wild Mango Pickle', 'Desi Cow Ghee', 'Wood Churned Sesame Oil', 'Cold Pressed Coconut Oil',
    'Neer Dosa Mix', 'Filter Coffee Roasted Beans', 'Kokum Drink Concentrate', 'Cashew Dry Fruit',
    'Byadagi Whole Chilli', 'Black Pepper Coarse', 'Coriander Seeds', 'Sambar Masala Podi',
    'Rasam Heritage Powder', 'Halbai Sweet Cake', 'Chakli Murukku Spirals', 'Maddur Crispy Vada',
    'Cardamom Pods Malabar', 'Jaggery Block Organic', 'Rice Sevai Noodles', 'Turmeric Rhizome Powder'
  ];
  const sizeSuffixes = ['50g', '100g', '200g', '250g', '500g', '1kg', '2kg', '500ml', '1L', 'Pack of 2', 'Family Saver Pack'];

  const insertProduct = db.prepare(`
    INSERT INTO products (
      id, name, local_name, sku, barcode, category_id, brand, unit,
      allows_decimal_qty, purchase_price, selling_price, mrp, gst_rate,
      current_stock, min_stock, reorder_level, is_active, created_by, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?, ?, 0, ?, 10, 20, 1, ?, datetime('now', 'localtime'), datetime('now', 'localtime'))
  `);

  const runTx = db.transaction(() => {
    let count = 0;
    for (let i = 1; i <= 5000; i++) {
      const prefix = coastalPrefixes[i % coastalPrefixes.length];
      const base = itemBases[i % itemBases.length];
      const size = sizeSuffixes[i % sizeSuffixes.length];
      const name = `${prefix} ${base} ${size} - Batch #${i}`;
      const local = `${prefix} ${base}, Coastal Special Item`;
      const sku = `SKU-PERF-${String(i).padStart(5, '0')}`;
      const barcode = `890999${String(i).padStart(6, '0')}`;
      const cat = categories[i % categories.length];
      const catId = catMap.get(cat)!;

      const pPrice = 2000 + (i % 50) * 100; // ₹20 - ₹70
      const sPrice = pPrice + 1500 + (i % 20) * 50; // ₹35 - ₹80
      const mrp = sPrice + 500;
      const stock = 15 + (i % 85);

      insertProduct.run(
        crypto.randomUUID(),
        name,
        local,
        sku,
        barcode,
        catId,
        prefix,
        size.includes('kg') ? 'kg' : size.includes('L') || size.includes('ml') ? 'bottle' : 'packet',
        pPrice,
        sPrice,
        mrp,
        stock,
        adminId
      );
      count++;
    }
    console.log(`[Seed5K] Successfully created ${count} products.`);
  });

  const startTime = Date.now();
  runTx();
  console.log(`[Seed5K] DB batch insert completed in ${Date.now() - startTime}ms.`);

  const indexStartTime = Date.now();
  searchEngine.initIndex(db);
  console.log(`[Seed5K] MiniSearch in-memory indexing completed in ${Date.now() - indexStartTime}ms.`);
}

if (require.main === module) {
  run5kSeed();
}
