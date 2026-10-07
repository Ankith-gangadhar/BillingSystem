import { getDb, logAudit } from './database';
import { hashPin } from '../services/authService';
import { createStockMovement } from '../services/stockService';
import { searchEngine } from '../services/searchService';
import crypto from 'crypto';

export function runSeed(db = getDb()) {
  console.log('[Seed] Starting Mangalore Store POS realistic database seeding...');

  // 1. Clear existing non-schema data for clean demo
  db.exec(`
    DELETE FROM return_items;
    DELETE FROM returns;
    DELETE FROM purchase_items;
    DELETE FROM purchases;
    DELETE FROM payments;
    DELETE FROM bill_items;
    DELETE FROM bills;
    DELETE FROM cash_events;
    DELETE FROM shifts;
    DELETE FROM stock_movements;
    DELETE FROM product_barcodes;
    DELETE FROM products;
    DELETE FROM categories;
    DELETE FROM suppliers;
    DELETE FROM customers;
    DELETE FROM audit_log;
    DELETE FROM day_closings;
    DELETE FROM users;
  `);

  // 2. Users (Admin, Worker, Mom)
  const adminId = crypto.randomUUID();
  const workerId = crypto.randomUUID();
  const momId = crypto.randomUUID();

  const insertUser = db.prepare(`
    INSERT INTO users (id, name, role, pin_hash, is_active, created_at)
    VALUES (?, ?, ?, ?, 1, datetime('now', 'localtime'))
  `);

  insertUser.run(adminId, 'Ankith (Owner / Admin)', 'admin', hashPin('1234'));
  insertUser.run(workerId, 'Raju (Store Cashier)', 'cashier', hashPin('0000'));
  insertUser.run(momId, 'Mother (Cashier Mode)', 'cashier', hashPin('1111'));

  console.log('[Seed] Created users: Admin (PIN: 1234), Worker (PIN: 0000), Mom (PIN: 1111)');

  // 3. Categories
  const categories = [
    { id: 'cat-snacks', name: 'Snacks & Wafers', sort_order: 1 },
    { id: 'cat-pickles', name: 'Pickles & Chutneys', sort_order: 2 },
    { id: 'cat-spices', name: 'Coastal Masalas & Spices', sort_order: 3 },
    { id: 'cat-oils', name: 'Oils, Ghee & Butter', sort_order: 4 },
    { id: 'cat-ready', name: 'Ready to Cook & Mixes', sort_order: 5 },
    { id: 'cat-sweets', name: 'Traditional Sweets', sort_order: 6 },
    { id: 'cat-beverages', name: 'Beverages & Syrups', sort_order: 7 },
  ];

  const insertCat = db.prepare('INSERT INTO categories (id, name, sort_order, is_active) VALUES (?, ?, ?, 1)');
  for (const c of categories) {
    insertCat.run(c.id, c.name, c.sort_order);
  }

  // 4. Suppliers
  const sup1Id = 'sup-coastal';
  const sup2Id = 'sup-malenadu';
  const insertSup = db.prepare('INSERT INTO suppliers (id, name, phone, address, gstin, is_active) VALUES (?, ?, ?, ?, ?, 1)');
  insertSup.run(sup1Id, 'Coastal Wholesale Traders, Mangaluru', '+91 824 2445566', 'Bunder, Mangaluru - 575001', '29AABCC1234D1Z1');
  insertSup.run(sup2Id, 'Malenadu Organic & Spices Hub', '+91 826 2233445', 'Koppa Road, Chikkamagaluru - 577101', '29XYZAB5678E1Z9');

  // 5. Products (~60 authentic Coastal Karnataka Items)
  const productDefinitions = [
    // Snacks
    { name: 'Kori Rotti (Large Family Pack)', local: 'Kori Rotti, Mangalore Rotti', sku: 'SNK-KR-001', barcode: '8901001001', cat: 'cat-snacks', brand: 'Coastal Kitchen', unit: 'packet', pPrice: 4500, sPrice: 6500, mrp: 7000, stock: 80, quick: 1, qSort: 1 },
    { name: 'Kori Rotti (Medium Pack)', local: 'Kori Rotti 250g', sku: 'SNK-KR-002', barcode: '8901001002', cat: 'cat-snacks', brand: 'Coastal Kitchen', unit: 'packet', pPrice: 2800, sPrice: 4000, mrp: 4500, stock: 60, quick: 1, qSort: 2 },
    { name: 'Nendran Banana Chips (Salted)', local: 'Bale Hannina Chips, Yellow Banana Chips', sku: 'SNK-BC-001', barcode: '8901001003', cat: 'cat-snacks', brand: 'Malenadu Fresh', unit: 'packet', pPrice: 5500, sPrice: 8000, mrp: 8500, stock: 75, quick: 1, qSort: 3 },
    { name: 'Nendran Pepper Banana Chips', local: 'Menasina Banana Chips, Black Pepper Chips', sku: 'SNK-BC-002', barcode: '8901001004', cat: 'cat-snacks', brand: 'Malenadu Fresh', unit: 'packet', pPrice: 6000, sPrice: 8500, mrp: 9000, stock: 50, quick: 1, qSort: 4 },
    { name: 'Jackfruit Chips (Halasina Hannu)', local: 'Halasina Chips, Jackfruit Wafers', sku: 'SNK-JF-001', barcode: '8901001005', cat: 'cat-snacks', brand: 'Tulunadu Crunch', unit: 'packet', pPrice: 8000, sPrice: 11000, mrp: 12000, stock: 35, quick: 1, qSort: 5 },
    { name: 'Spicy Tapioca Chips (Maravalli)', local: 'Maravalli Chips, Kappa Chips', sku: 'SNK-TP-001', barcode: '8901001006', cat: 'cat-snacks', brand: 'Tulunadu Crunch', unit: 'packet', pPrice: 4000, sPrice: 6000, mrp: 6500, stock: 40, quick: 0, qSort: 0 },
    { name: 'Mangalore Mixture (Spicy)', local: 'Coastal Mixture, Chivda', sku: 'SNK-MX-001', barcode: '8901001007', cat: 'cat-snacks', brand: 'Ananda Sweets', unit: 'packet', pPrice: 5000, sPrice: 7500, mrp: 8000, stock: 45, quick: 1, qSort: 6 },
    { name: 'Sweet Banana Chips (Sarkara Varatti)', local: 'Jaggery Banana Chips, Bella Banana Chips', sku: 'SNK-SB-001', barcode: '8901001008', cat: 'cat-snacks', brand: 'Malenadu Fresh', unit: 'packet', pPrice: 6500, sPrice: 9500, mrp: 10000, stock: 30, quick: 0, qSort: 0 },
    { name: 'Maddur Vada Pack (4 pcs)', local: 'Maddur Vade', sku: 'SNK-MV-001', barcode: '8901001009', cat: 'cat-snacks', brand: 'Halli Ruchigalu', unit: 'packet', pPrice: 3500, sPrice: 5000, mrp: 5500, stock: 25, quick: 0, qSort: 0 },
    { name: 'Loose Rice Murukku (Chakli)', local: 'Kai Murukku, Benne Murukku', sku: 'SNK-MK-001', barcode: null, cat: 'cat-snacks', brand: 'Store Fresh', unit: 'kg', allowsDec: 1, pPrice: 16000, sPrice: 24000, mrp: null, stock: 15.5, quick: 0, qSort: 0 },

    // Pickles & Chutneys
    { name: 'Appemidi Tender Mango Pickle 300g', local: 'Appe Midi Uppinakayi, Wild Tender Mango', sku: 'PCK-AM-300', barcode: '8901002001', cat: 'cat-pickles', brand: 'Malenadu Heritage', unit: 'bottle', pPrice: 18000, sPrice: 24000, mrp: 26000, stock: 40, quick: 1, qSort: 7 },
    { name: 'Spicy Mango Cut Pickle 500g', local: 'Mavinakayi Uppinakayi', sku: 'PCK-MC-500', barcode: '8901002002', cat: 'cat-pickles', brand: 'Mother Special', unit: 'bottle', pPrice: 9000, sPrice: 13000, mrp: 14000, stock: 50, quick: 1, qSort: 8 },
    { name: 'Traditional Lemon Pickle 500g', local: 'Nimbe Uppinakayi', sku: 'PCK-LM-500', barcode: '8901002003', cat: 'cat-pickles', brand: 'Mother Special', unit: 'bottle', pPrice: 8500, sPrice: 12000, mrp: 13000, stock: 35, quick: 0, qSort: 0 },
    { name: 'Bamboo Shoot Pickle (Kanile)', local: 'Kanile Uppinakayi, Bamboo Pickle', sku: 'PCK-BS-300', barcode: '8901002004', cat: 'cat-pickles', brand: 'Western Ghats', unit: 'bottle', pPrice: 14000, sPrice: 19000, mrp: 21000, stock: 20, quick: 0, qSort: 0 },
    { name: 'Bitter Gourd Pickle (Hagalakayi)', local: 'Hagalakayi Uppinakayi', sku: 'PCK-BG-300', barcode: '8901002005', cat: 'cat-pickles', brand: 'Malenadu Heritage', unit: 'bottle', pPrice: 9500, sPrice: 14000, mrp: 15000, stock: 18, quick: 0, qSort: 0 },
    { name: 'Shenga (Peanut) Chutney Pudi 200g', local: 'Kadlekayi Chutney Powder', sku: 'PCK-CP-001', barcode: '8901002006', cat: 'cat-pickles', brand: 'Halli Ruchigalu', unit: 'packet', pPrice: 4500, sPrice: 7000, mrp: 7500, stock: 65, quick: 1, qSort: 9 },
    { name: 'Dry Fish Chutney Pudi (Nethili)', local: 'Meenu Chutney Pudi', sku: 'PCK-FC-001', barcode: '8901002007', cat: 'cat-pickles', brand: 'Coastal Flavors', unit: 'packet', pPrice: 8000, sPrice: 12000, mrp: 13000, stock: 22, quick: 0, qSort: 0 },

    // Spices & Masalas
    { name: 'Kori Sukka Masala Powder 100g', local: 'Chicken Sukka Masala, Mangalore Sukka Podi', sku: 'SPC-KS-100', barcode: '8901003001', cat: 'cat-spices', brand: 'Mangalore Masalas', unit: 'packet', pPrice: 4000, sPrice: 6000, mrp: 6500, stock: 90, quick: 1, qSort: 10 },
    { name: 'Mangalore Fish Curry Masala 100g', local: 'Meen Gassi Pudi, Coastal Fish Curry Mix', sku: 'SPC-FC-100', barcode: '8901003002', cat: 'cat-spices', brand: 'Mangalore Masalas', unit: 'packet', pPrice: 4200, sPrice: 6500, mrp: 7000, stock: 85, quick: 1, qSort: 11 },
    { name: 'Kundapura Chicken Ghee Roast Masala', local: 'Ghee Roast Paste, Kundapura Masala', sku: 'SPC-GR-150', barcode: '8901003003', cat: 'cat-spices', brand: 'Ananda Spice', unit: 'packet', pPrice: 7000, sPrice: 10500, mrp: 11500, stock: 70, quick: 1, qSort: 12 },
    { name: 'Bydagi Stemless Chilli Powder 500g', local: 'Byadagi Menasina Pudi, Red Color Chilli', sku: 'SPC-BC-500', barcode: '8901003004', cat: 'cat-spices', brand: 'Malenadu Spices', unit: 'packet', pPrice: 18000, sPrice: 24500, mrp: 26000, stock: 45, quick: 0, qSort: 0 },
    { name: 'Malenadu Black Pepper Whole 250g', local: 'Kari Menasu, Whole Black Peppercorns', sku: 'SPC-BP-250', barcode: '8901003005', cat: 'cat-spices', brand: 'Malenadu Spices', unit: 'packet', pPrice: 16000, sPrice: 22000, mrp: 24000, stock: 38, quick: 0, qSort: 0 },
    { name: 'Bisi Bele Bath Masala 100g', local: 'BBB Masala Pudi', sku: 'SPC-BBB-100', barcode: '8901003006', cat: 'cat-spices', brand: 'Halli Ruchigalu', unit: 'packet', pPrice: 3800, sPrice: 5500, mrp: 6000, stock: 50, quick: 0, qSort: 0 },
    { name: 'Puliyogare Mix Powder 200g', local: 'Hunasenahannu Chitranna Mix', sku: 'SPC-PG-200', barcode: '8901003007', cat: 'cat-spices', brand: 'Halli Ruchigalu', unit: 'packet', pPrice: 5000, sPrice: 7500, mrp: 8000, stock: 60, quick: 0, qSort: 0 },
    { name: 'Rasam Powder (Udupi Style) 200g', local: 'Saarina Pudi, Chaaru Powder', sku: 'SPC-RS-200', barcode: '8901003008', cat: 'cat-spices', brand: 'Udupi Shri Krishna', unit: 'packet', pPrice: 6000, sPrice: 9000, mrp: 9500, stock: 55, quick: 0, qSort: 0 },

    // Oils & Ghee
    { name: 'Pure Coastal Cow Ghee 500ml', local: 'Desi Tuppa, Pure Cow Neyyi', sku: 'OIL-GH-500', barcode: '8901004001', cat: 'cat-oils', brand: 'Coastal Dairy', unit: 'bottle', pPrice: 38000, sPrice: 47000, mrp: 50000, stock: 40, quick: 1, qSort: 13 },
    { name: 'Pure Coastal Cow Ghee 200ml', local: 'Desi Tuppa 200ml', sku: 'OIL-GH-200', barcode: '8901004002', cat: 'cat-oils', brand: 'Coastal Dairy', unit: 'bottle', pPrice: 16500, sPrice: 21000, mrp: 22500, stock: 50, quick: 1, qSort: 14 },
    { name: 'Cold Pressed Wood Churned Coconut Oil 1L', local: 'Tengina Enne, Marachekku Coconut Oil', sku: 'OIL-CO-1000', barcode: '8901004003', cat: 'cat-oils', brand: 'Tulunadu Pure', unit: 'bottle', pPrice: 28000, sPrice: 36000, mrp: 39000, stock: 35, quick: 1, qSort: 15 },
    { name: 'Cold Pressed Sesame / Gingelly Oil 500ml', local: 'Ellina Enne, Til Oil', sku: 'OIL-SE-500', barcode: '8901004004', cat: 'cat-oils', brand: 'Tulunadu Pure', unit: 'bottle', pPrice: 19000, sPrice: 25000, mrp: 27000, stock: 25, quick: 0, qSort: 0 },
    { name: 'Fresh White Butter (Benne) 250g', local: 'Bili Benne, Fresh Desi Butter', sku: 'OIL-WB-250', barcode: null, cat: 'cat-oils', brand: 'Dairy Fresh', unit: 'packet', pPrice: 9000, sPrice: 13000, mrp: null, stock: 12, quick: 0, qSort: 0 },

    // Ready to Cook & Mixes
    { name: 'Neer Dosa Ready Instant Mix 500g', local: 'Neer Dose Hittu, Rice Crepe Mix', sku: 'RDY-ND-500', barcode: '8901005001', cat: 'cat-ready', brand: 'Coastal Kitchen', unit: 'packet', pPrice: 5500, sPrice: 8000, mrp: 8500, stock: 60, quick: 1, qSort: 16 },
    { name: 'Mangalore Buns Ready Flour Mix 500g', local: 'Banana Buns Mix, Puri Buns', sku: 'RDY-MB-500', barcode: '8901005002', cat: 'cat-ready', brand: 'Coastal Kitchen', unit: 'packet', pPrice: 6000, sPrice: 9000, mrp: 9500, stock: 45, quick: 1, qSort: 17 },
    { name: 'Ragi Idli / Dosa Batter Ready 1kg', local: 'Ragi Hittu Fresh Pack', sku: 'RDY-RG-1000', barcode: '8901005003', cat: 'cat-ready', brand: 'Halli Ruchigalu', unit: 'packet', pPrice: 4500, sPrice: 6500, mrp: 7000, stock: 20, quick: 0, qSort: 0 },
    { name: 'Akki Rotti Flour Mix 500g', local: 'Rice Rotti Pudi', sku: 'RDY-AR-500', barcode: '8901005004', cat: 'cat-ready', brand: 'Malenadu Fresh', unit: 'packet', pPrice: 4000, sPrice: 6000, mrp: 6500, stock: 35, quick: 0, qSort: 0 },
    { name: 'Patrode Leaves Fresh Roll (Pack of 2)', local: 'Kesuvina Ele Patrode, Colocasia Rolls', sku: 'RDY-PT-002', barcode: null, cat: 'cat-ready', brand: 'Store Fresh', unit: 'packet', pPrice: 7000, sPrice: 11000, mrp: null, stock: 15, quick: 0, qSort: 0 },

    // Traditional Sweets
    { name: 'Halbai (Rice & Coconut Jaggery Cake) 250g', local: 'Halbayi, Bella Halbai', sku: 'SWT-HB-250', barcode: '8901006001', cat: 'cat-sweets', brand: 'Tulunadu Sweets', unit: 'box', pPrice: 9500, sPrice: 14000, mrp: 15000, stock: 20, quick: 0, qSort: 0 },
    { name: 'Mangalore Cashew Halwa 250g', local: 'Geru Beeja Halwa, Kaju Halwa', sku: 'SWT-CH-250', barcode: '8901006002', cat: 'cat-sweets', brand: 'Ananda Sweets', unit: 'box', pPrice: 16000, sPrice: 22000, mrp: 24000, stock: 25, quick: 0, qSort: 0 },
    { name: 'Dharwad Pedha (Original) 250g', local: 'Dharwad Peda, Brown Peda', sku: 'SWT-DP-250', barcode: '8901006003', cat: 'cat-sweets', brand: 'Line Bazaar Spec', unit: 'box', pPrice: 11000, sPrice: 16000, mrp: 17500, stock: 30, quick: 0, qSort: 0 },
    { name: 'Holige / Obbattu (Pack of 5 Bella)', local: 'Kayiholige, Coconut Jaggery Puran Poli', sku: 'SWT-HL-005', barcode: null, cat: 'cat-sweets', brand: 'Mane Holige', unit: 'packet', pPrice: 10000, sPrice: 15000, mrp: null, stock: 18, quick: 0, qSort: 0 },

    // Beverages & Syrups
    { name: 'Kokum Squash / Syrup 750ml', local: 'Punarpuli Saru, Kokum Drink Concentrate', sku: 'BEV-KK-750', barcode: '8901007001', cat: 'cat-beverages', brand: 'Western Ghats', unit: 'bottle', pPrice: 11000, sPrice: 16500, mrp: 18000, stock: 40, quick: 1, qSort: 18 },
    { name: 'Nannari (Sarsaparilla) Sharbat 750ml', local: 'Sogade Beru Syrup, Cooling Herbal Drink', sku: 'BEV-NN-750', barcode: '8901007002', cat: 'cat-beverages', brand: 'Western Ghats', unit: 'bottle', pPrice: 10500, sPrice: 15500, mrp: 17000, stock: 35, quick: 0, qSort: 0 },
    { name: 'Chikkamagaluru Filter Coffee Powder (80:20) 500g', local: 'Filter Kaapi Pudi, Roasted Chicory Blend', sku: 'BEV-CF-500', barcode: '8901007003', cat: 'cat-beverages', brand: 'Malenadu Estate', unit: 'packet', pPrice: 22000, sPrice: 29500, mrp: 32000, stock: 50, quick: 1, qSort: 19 },
    { name: 'Brahmi Herbal Memory Syrup 500ml', local: 'Ondelaga Tonic, Centella Asiatica Juice', sku: 'BEV-BR-500', barcode: '8901007004', cat: 'cat-beverages', brand: 'Vaidya Shala', unit: 'bottle', pPrice: 14000, sPrice: 20000, mrp: 22000, stock: 20, quick: 0, qSort: 0 },
  ];

  const insertProduct = db.prepare(`
    INSERT INTO products (
      id, name, local_name, sku, barcode, category_id, brand, unit,
      allows_decimal_qty, purchase_price, selling_price, mrp, gst_rate,
      current_stock, min_stock, reorder_level, supplier_id, is_quick_button,
      quick_sort_order, is_active, created_at, updated_at, created_by
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, 5, 10, ?, ?, ?, 1, datetime('now', 'localtime'), datetime('now', 'localtime'), ?)
  `);

  const productIds: string[] = [];

  for (const p of productDefinitions) {
    const id = crypto.randomUUID();
    productIds.push(id);
    insertProduct.run(
      id,
      p.name,
      p.local,
      p.sku,
      p.barcode,
      p.cat,
      p.brand,
      p.unit,
      p.allowsDec || 0,
      p.pPrice,
      p.sPrice,
      p.mrp,
      p.stock,
      p.cat.includes('spices') ? sup2Id : sup1Id,
      p.quick || 0,
      p.qSort || 0,
      adminId
    );

    // Initial stock movement
    createStockMovement(db, {
      productId: id,
      movementType: 'opening',
      qtyChange: p.stock,
      reason: 'Initial demo store seed stock',
      referenceType: 'adjustment',
      userId: adminId,
    });
  }

  console.log(`[Seed] Created ${productDefinitions.length} realistic coastal products with stock movements.`);

  // 6. Seed Demo Shifts & ~200 Realistic Historical Bills across the past 5 days
  const shifts: string[] = [];
  const shiftInsert = db.prepare(`
    INSERT INTO shifts (id, user_id, started_at, ended_at, opening_cash, expected_cash, counted_cash, cash_difference, status, notes)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'closed', ?)
  `);

  // Create 5 closed shifts (Raju morning shift, Admin afternoon shift)
  for (let d = 4; d >= 0; d--) {
    const dateObj = new Date();
    dateObj.setDate(dateObj.getDate() - d);
    const dateStr = dateObj.toISOString().slice(0, 10);

    // Morning shift (Raju 7:00 AM - 12:00 PM)
    const sId1 = crypto.randomUUID();
    shifts.push(sId1);
    shiftInsert.run(
      sId1,
      workerId,
      `${dateStr} 07:00:00`,
      `${dateStr} 12:00:00`,
      100000, // ₹1,000 opening cash
      155000,
      154000,
      -1000, // ₹10 shortage
      'Morning store shift'
    );

    // Evening shift (Admin / Mom 12:00 PM - 9:00 PM)
    const sId2 = crypto.randomUUID();
    shifts.push(sId2);
    shiftInsert.run(
      sId2,
      d % 2 === 0 ? adminId : momId,
      `${dateStr} 12:00:00`,
      `${dateStr} 21:00:00`,
      154000,
      280000,
      280000,
      0,
      'Evening store shift'
    );
  }

  // Active open shift for today
  const activeShiftId = crypto.randomUUID();
  db.prepare(`
    INSERT INTO shifts (id, user_id, started_at, opening_cash, status, notes)
    VALUES (?, ?, datetime('now', '-2 hours', 'localtime'), 150000, 'open', 'Current active counter shift')
  `).run(activeShiftId, workerId);

  // Insert Bills across shifts
  const insertBill = db.prepare(`
    INSERT INTO bills (
      id, bill_number, status, shift_id, cashier_id, customer_id,
      subtotal, discount_total, tax_total, round_off, grand_total,
      payment_status, notes, created_at, completed_at, approved_by
    ) VALUES (?, ?, ?, ?, ?, NULL, ?, ?, 0, ?, ?, 'paid', ?, ?, ?, ?)
  `);

  const insertBillItem = db.prepare(`
    INSERT INTO bill_items (
      id, bill_id, product_id, is_custom, name_snapshot, sku_snapshot,
      qty, unit, list_price_snapshot, sold_price, line_discount, gst_rate,
      tax_amount, line_total, purchase_price_snapshot, price_override_reason, override_approved_by
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 0, ?, ?, ?, ?)
  `);

  const insertPayment = db.prepare(`
    INSERT INTO payments (id, bill_id, method, amount, reference, tendered_amount, change_amount, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);

  let billCounter = 1;
  const allShiftsForBills = [...shifts, activeShiftId];

  for (let sIdx = 0; sIdx < allShiftsForBills.length; sIdx++) {
    const shiftId = allShiftsForBills[sIdx];
    const billsInShift = 15 + Math.floor(Math.random() * 8); // 15-22 bills per shift

    for (let b = 0; b < billsInShift; b++) {
      const billId = crypto.randomUUID();
      const dateStr = new Date(Date.now() - (allShiftsForBills.length - sIdx) * 12 * 3600 * 1000).toISOString();
      const billNo = `MS-${dateStr.slice(0, 10).replace(/-/g, '')}-${String(billCounter++).padStart(4, '0')}`;

      // Pick 1-4 random products
      const itemCount = 1 + Math.floor(Math.random() * 3);
      let subtotal = 0;
      let discountTotal = 0;
      const itemsToAdd: any[] = [];

      // Occasionally add a custom item
      const includeCustom = b === 3 && sIdx === 0;

      for (let i = 0; i < itemCount; i++) {
        const prodIndex = Math.floor(Math.random() * productDefinitions.length);
        const prodDef = productDefinitions[prodIndex];
        const prodId = productIds[prodIndex];
        const qty = 1 + (Math.random() > 0.8 ? 1 : 0);
        const listPrice = prodDef.sPrice;
        let soldPrice = listPrice;
        let lineDiscount = 0;
        let reason = null;

        // Occasional discount
        if (Math.random() > 0.85) {
          lineDiscount = 500; // ₹5 off
          soldPrice = listPrice - lineDiscount;
          reason = 'Regular customer discount';
        }

        const lineTotal = soldPrice * qty;
        subtotal += listPrice * qty;
        discountTotal += lineDiscount * qty;

        itemsToAdd.push({
          productId: prodId,
          isCustom: 0,
          name: prodDef.name,
          sku: prodDef.sku,
          qty,
          unit: prodDef.unit,
          listPrice,
          soldPrice,
          lineDiscount,
          lineTotal,
          purchasePrice: prodDef.pPrice,
          reason,
        });
      }

      if (includeCustom) {
        itemsToAdd.push({
          productId: null,
          isCustom: 1,
          name: 'Loose Coconut Jaggery Block',
          sku: null,
          qty: 1,
          unit: 'piece',
          listPrice: 4000,
          soldPrice: 4000,
          lineDiscount: 0,
          lineTotal: 4000,
          purchasePrice: 2500,
          reason: null,
        });
        subtotal += 4000;
      }

      const grandTotal = subtotal - discountTotal;
      const isVoided = b === 2 && sIdx === 1;
      const status = isVoided ? 'voided' : 'completed';

      insertBill.run(
        billId,
        billNo,
        status,
        shiftId,
        sIdx % 2 === 0 ? workerId : adminId,
        subtotal,
        discountTotal,
        0,
        grandTotal,
        null,
        dateStr,
        dateStr,
        discountTotal > 0 ? adminId : null
      );

      for (const it of itemsToAdd) {
        insertBillItem.run(
          crypto.randomUUID(),
          billId,
          it.productId,
          it.isCustom,
          it.name,
          it.sku,
          it.qty,
          it.unit,
          it.listPrice,
          it.soldPrice,
          it.lineDiscount,
          it.lineTotal,
          it.purchasePrice,
          it.reason,
          it.reason ? adminId : null
        );

        if (!it.isCustom && it.productId && !isVoided) {
          createStockMovement(db, {
            productId: it.productId,
            movementType: 'sale',
            qtyChange: -it.qty,
            reason: `Sale ${billNo}`,
            referenceType: 'bill',
            referenceId: billId,
            userId: workerId,
          });
        }
      }

      // Payments (Split 60% UPI, 35% Cash, 5% Card)
      const payMethod = Math.random() > 0.4 ? 'upi' : Math.random() > 0.2 ? 'cash' : 'card';
      insertPayment.run(
        crypto.randomUUID(),
        billId,
        payMethod,
        grandTotal,
        payMethod === 'upi' ? `UPI-REF-${Math.floor(Math.random() * 899999 + 100000)}` : null,
        payMethod === 'cash' ? Math.ceil(grandTotal / 10000) * 10000 : null,
        payMethod === 'cash' ? Math.ceil(grandTotal / 10000) * 10000 - grandTotal : null,
        dateStr
      );
    }
  }

  // 7. Seed 1 Return
  const sampleBill = db.prepare("SELECT * FROM bills WHERE status = 'completed' LIMIT 1").get() as any;
  if (sampleBill) {
    const returnId = crypto.randomUUID();
    db.prepare(`
      INSERT INTO returns (id, original_bill_id, return_number, reason, refund_method, refund_amount, user_id, approved_by, created_at)
      VALUES (?, ?, 'RET-00101', 'Damaged seal on delivery', 'cash', 8000, ?, ?, datetime('now', 'localtime'))
    `).run(returnId, sampleBill.id, workerId, adminId);

    db.prepare(`
      INSERT INTO return_items (id, return_id, product_id, item_name, qty, unit_price, total_amount, restock)
      VALUES (?, ?, ?, 'Nendran Banana Chips (Salted)', 1, 8000, 8000, 0)
    `).run(crypto.randomUUID(), returnId, productIds[2]);

    db.prepare("UPDATE bills SET status = 'partially_returned' WHERE id = ?").run(sampleBill.id);
  }

  // Initialize search index with seeded products
  searchEngine.initIndex(db);

  console.log('[Seed] Seeding completed successfully!');
}

if (require.main === module) {
  runSeed();
}
