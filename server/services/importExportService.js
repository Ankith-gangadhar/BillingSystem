"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseFileToObjects = parseFileToObjects;
exports.validateProductImport = validateProductImport;
exports.executeProductImport = executeProductImport;
exports.generateExcelTemplate = generateExcelTemplate;
const XLSX = require("xlsx");
const papaparse_1 = require("papaparse");
const crypto_1 = require("crypto");
const backupService_1 = require("./backupService");
const stockService_1 = require("./stockService");
const searchService_1 = require("./searchService");
const database_1 = require("../db/database");
const VALID_UNITS = ['piece', 'packet', 'kg', 'g', 'litre', 'ml', 'bottle', 'box', 'dozen'];
function parseFileToObjects(fileBuffer, filename) {
    const isCsv = filename.toLowerCase().endsWith('.csv');
    if (isCsv) {
        const csvStr = fileBuffer.toString('utf8');
        const parsed = papaparse_1.default.parse(csvStr, { header: true, skipEmptyLines: true });
        return parsed.data;
    }
    else {
        const workbook = XLSX.read(fileBuffer, { type: 'buffer' });
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        return XLSX.utils.sheet_to_json(sheet);
    }
}
function validateProductImport(db, rawRows) {
    const validatedRows = [];
    const existingProducts = db.prepare('SELECT id, name, sku, barcode FROM products').all();
    const existingCategories = db.prepare('SELECT id, name FROM categories').all();
    const barcodeMap = new Map();
    const skuMap = new Map();
    const nameMap = new Map();
    for (const p of existingProducts) {
        if (p.barcode)
            barcodeMap.set(p.barcode.toLowerCase(), p.id);
        if (p.sku)
            skuMap.set(p.sku.toLowerCase(), p.id);
        nameMap.set(p.name.toLowerCase().trim(), p.id);
    }
    const fileBarcodes = new Set();
    const fileSkus = new Set();
    let newCount = 0;
    let updateCount = 0;
    let errorCount = 0;
    for (let i = 0; i < rawRows.length; i++) {
        const raw = rawRows[i];
        const rowNum = i + 2; // considering header
        const errors = [];
        const warnings = [];
        // Normalize field names
        const name = (raw['Product Name'] || raw['name'] || raw['Name'] || '').toString().trim();
        const sku = (raw['SKU'] || raw['sku'] || '').toString().trim() || null;
        const barcode = (raw['Barcode'] || raw['barcode'] || '').toString().trim() || null;
        const category = (raw['Category'] || raw['category'] || 'General').toString().trim();
        const brand = (raw['Brand'] || raw['brand'] || '').toString().trim() || null;
        const unitRaw = (raw['Unit'] || raw['unit'] || 'piece').toString().toLowerCase().trim();
        const unit = VALID_UNITS.includes(unitRaw) ? unitRaw : 'piece';
        const sellingPriceRupees = parseFloat(raw['Selling Price (₹)'] || raw['Selling Price'] || raw['selling_price'] || '0');
        const purchasePriceRupees = parseFloat(raw['Purchase Price (₹)'] || raw['Purchase Price'] || raw['purchase_price'] || '0');
        const mrpRupees = raw['MRP (₹)'] || raw['MRP'] ? parseFloat(raw['MRP (₹)'] || raw['MRP']) : null;
        const gstRate = parseFloat(raw['GST Rate (%)'] || raw['GST Rate'] || raw['gst_rate'] || '0');
        const openingStock = parseFloat(raw['Opening Stock'] || raw['Stock'] || raw['current_stock'] || '0');
        const minStock = parseFloat(raw['Min Stock'] || raw['min_stock'] || '5');
        if (!name) {
            errors.push('Product Name is required.');
        }
        if (isNaN(sellingPriceRupees) || sellingPriceRupees < 0) {
            errors.push('Selling Price must be a valid positive number.');
        }
        if (isNaN(purchasePriceRupees) || purchasePriceRupees < 0) {
            errors.push('Purchase Price must be a valid non-negative number.');
        }
        // Duplicate checks within the file
        if (barcode) {
            if (fileBarcodes.has(barcode.toLowerCase())) {
                errors.push(`Duplicate barcode "${barcode}" found within import file.`);
            }
            else {
                fileBarcodes.add(barcode.toLowerCase());
            }
        }
        if (sku) {
            if (fileSkus.has(sku.toLowerCase())) {
                errors.push(`Duplicate SKU "${sku}" found within import file.`);
            }
            else {
                fileSkus.add(sku.toLowerCase());
            }
        }
        // Match existing product for update
        let matchedId = undefined;
        if (barcode && barcodeMap.has(barcode.toLowerCase())) {
            matchedId = barcodeMap.get(barcode.toLowerCase());
        }
        else if (sku && skuMap.has(sku.toLowerCase())) {
            matchedId = skuMap.get(sku.toLowerCase());
        }
        else if (nameMap.has(name.toLowerCase())) {
            matchedId = nameMap.get(name.toLowerCase());
            warnings.push(`Matched existing product by Name "${name}".`);
        }
        const action = errors.length > 0 ? 'error' : matchedId ? 'update' : 'create';
        if (action === 'create')
            newCount++;
        else if (action === 'update')
            updateCount++;
        else
            errorCount++;
        validatedRows.push({
            rowNumber: rowNum,
            data: {
                name,
                local_name: (raw['Local Name / Aliases'] || raw['local_name'] || '').toString().trim() || null,
                sku,
                barcode,
                category,
                brand,
                unit,
                allows_decimal_qty: unit === 'kg' || unit === 'g' || unit === 'litre' || unit === 'ml' ? 1 : 0,
                selling_price: Math.round(sellingPriceRupees * 100), // In Paise
                purchase_price: Math.round(purchasePriceRupees * 100), // In Paise
                mrp: mrpRupees !== null ? Math.round(mrpRupees * 100) : null,
                gst_rate: isNaN(gstRate) ? 0 : gstRate,
                opening_stock: isNaN(openingStock) ? 0 : openingStock,
                min_stock: isNaN(minStock) ? 5 : minStock,
            },
            action,
            errors,
            warnings,
            matchedProductId: matchedId,
        });
    }
    return {
        totalRows: rawRows.length,
        validRows: newCount + updateCount,
        newProductsCount: newCount,
        updateProductsCount: updateCount,
        errorRowsCount: errorCount,
        rows: validatedRows,
    };
}
async function executeProductImport(db, validatedRows, userId) {
    // 1. Take automatic pre-import safety backup
    await (0, backupService_1.createDatabaseBackup)(db, 'pre-import', userId);
    let importedCount = 0;
    let updatedCount = 0;
    const runTx = db.transaction(() => {
        // Categories lookup / create
        const getCat = db.prepare('SELECT id FROM categories WHERE lower(name) = ?');
        const insertCat = db.prepare('INSERT INTO categories (id, name, is_active) VALUES (?, ?, 1)');
        const resolveCategoryId = (catName) => {
            const existing = getCat.get(catName.toLowerCase());
            if (existing)
                return existing.id;
            const newId = crypto_1.default.randomUUID();
            insertCat.run(newId, catName);
            return newId;
        };
        const insertProduct = db.prepare(`
      INSERT INTO products (
        id, name, local_name, sku, barcode, category_id, brand, unit,
        allows_decimal_qty, purchase_price, selling_price, mrp, gst_rate,
        current_stock, min_stock, reorder_level, is_active, created_by, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 10, 1, ?, datetime('now', 'localtime'), datetime('now', 'localtime'))
    `);
        const updateProduct = db.prepare(`
      UPDATE products SET
        name = ?, local_name = COALESCE(?, local_name), category_id = ?, brand = COALESCE(?, brand),
        unit = ?, allows_decimal_qty = ?, purchase_price = ?, selling_price = ?, mrp = ?,
        gst_rate = ?, min_stock = ?, updated_at = datetime('now', 'localtime')
      WHERE id = ?
    `);
        for (const item of validatedRows) {
            if (item.action === 'error')
                continue;
            const d = item.data;
            const categoryId = resolveCategoryId(d.category || 'General');
            if (item.action === 'create') {
                const productId = crypto_1.default.randomUUID();
                insertProduct.run(productId, d.name, d.local_name, d.sku, d.barcode, categoryId, d.brand, d.unit, d.allows_decimal_qty, d.purchase_price, d.selling_price, d.mrp, d.gst_rate, d.opening_stock, d.min_stock, userId);
                if (d.opening_stock > 0) {
                    (0, stockService_1.createStockMovement)(db, {
                        productId,
                        movementType: 'opening',
                        qtyChange: d.opening_stock,
                        reason: 'Bulk inventory import opening stock',
                        referenceType: 'import',
                        userId,
                    });
                }
                importedCount++;
            }
            else if (item.action === 'update' && item.matchedProductId) {
                updateProduct.run(d.name, d.local_name, categoryId, d.brand, d.unit, d.allows_decimal_qty, d.purchase_price, d.selling_price, d.mrp, d.gst_rate, d.min_stock, item.matchedProductId);
                updatedCount++;
            }
        }
        (0, database_1.logAudit)(db, {
            userId,
            actingRole: 'admin',
            action: 'BULK_IMPORT_COMPLETED',
            entityType: 'import_jobs',
            newValue: { importedCount, updatedCount },
            severity: 'notice',
        });
    });
    runTx();
    // Re-index search engine
    searchService_1.searchEngine.initIndex(db);
    return { importedCount, updatedCount };
}
// Generate Excel Sample Import Template
function generateExcelTemplate() {
    const sampleData = [
        {
            'Product Name': 'Kori Rotti (Large Pack)',
            'Local Name / Aliases': 'Kori Rotti, Mangalore Rotti, Crispy Rice Wafers',
            'SKU': 'SNK-KR-001',
            'Barcode': '890123400001',
            'Category': 'Snacks',
            'Brand': 'Mangalore Store Special',
            'Unit': 'packet',
            'Purchase Price (₹)': 45.0,
            'Selling Price (₹)': 65.0,
            'MRP (₹)': 70.0,
            'GST Rate (%)': 5.0,
            'Opening Stock': 50,
            'Min Stock': 10,
        },
        {
            'Product Name': 'Pure Coastal Cow Ghee 500ml',
            'Local Name / Aliases': 'Tuppa, Neyyi, Desi Ghee',
            'SKU': 'OIL-GH-500',
            'Barcode': '890123400002',
            'Category': 'Oils & Ghee',
            'Brand': 'Coastal Dairy',
            'Unit': 'bottle',
            'Purchase Price (₹)': 380.0,
            'Selling Price (₹)': 460.0,
            'MRP (₹)': 480.0,
            'GST Rate (%)': 12.0,
            'Opening Stock': 25,
            'Min Stock': 5,
        },
        {
            'Product Name': 'Pepper Banana Chips (Nendran)',
            'Local Name / Aliases': 'Menasina Bale Hannina Chips, Banana Pepper Chips',
            'SKU': 'SNK-BC-250',
            'Barcode': '890123400003',
            'Category': 'Snacks',
            'Brand': 'Malenadu Snacks',
            'Unit': 'packet',
            'Purchase Price (₹)': 60.0,
            'Selling Price (₹)': 85.0,
            'MRP (₹)': 90.0,
            'GST Rate (%)': 0.0,
            'Opening Stock': 40,
            'Min Stock': 8,
        },
    ];
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(sampleData);
    XLSX.utils.book_append_sheet(wb, ws, 'Products');
    return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
}
