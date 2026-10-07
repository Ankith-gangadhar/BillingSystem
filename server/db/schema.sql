-- Mangalore Store POS SQLite Database Schema (WAL Mode, Strictly Normalized & Trigger Protected)

PRAGMA foreign_keys = ON;

-- Users & Authentication
CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('admin', 'cashier')),
    pin_hash TEXT NOT NULL,
    is_active INTEGER NOT NULL DEFAULT 1,
    failed_attempts INTEGER NOT NULL DEFAULT 0,
    locked_until TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime'))
);

-- Store Settings & Policies
CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    updated_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime'))
);

-- Product Categories
CREATE TABLE IF NOT EXISTS categories (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    parent_id TEXT,
    sort_order INTEGER NOT NULL DEFAULT 0,
    is_active INTEGER NOT NULL DEFAULT 1,
    FOREIGN KEY (parent_id) REFERENCES categories(id) ON DELETE SET NULL
);

-- Suppliers
CREATE TABLE IF NOT EXISTS suppliers (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    phone TEXT,
    address TEXT,
    gstin TEXT,
    notes TEXT,
    is_active INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime'))
);

-- Products
CREATE TABLE IF NOT EXISTS products (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    local_name TEXT,
    sku TEXT UNIQUE,
    barcode TEXT UNIQUE,
    category_id TEXT,
    brand TEXT,
    unit TEXT NOT NULL DEFAULT 'piece',
    allows_decimal_qty INTEGER NOT NULL DEFAULT 0,
    purchase_price INTEGER NOT NULL DEFAULT 0, -- In Paise
    selling_price INTEGER NOT NULL, -- In Paise
    mrp INTEGER, -- In Paise
    gst_rate REAL DEFAULT 0, -- e.g. 0, 5, 12, 18
    current_stock REAL NOT NULL DEFAULT 0, -- Cached value verified with stock_movements
    min_stock REAL NOT NULL DEFAULT 5,
    reorder_level REAL NOT NULL DEFAULT 10,
    supplier_id TEXT,
    image_path TEXT,
    description TEXT,
    is_quick_button INTEGER NOT NULL DEFAULT 0,
    quick_sort_order INTEGER NOT NULL DEFAULT 0,
    variant_group TEXT,
    parent_product_id TEXT,
    is_active INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
    created_by TEXT NOT NULL,
    FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL,
    FOREIGN KEY (supplier_id) REFERENCES suppliers(id) ON DELETE SET NULL,
    FOREIGN KEY (created_by) REFERENCES users(id)
);

-- Multi-barcode support per product
CREATE TABLE IF NOT EXISTS product_barcodes (
    id TEXT PRIMARY KEY,
    product_id TEXT NOT NULL,
    barcode TEXT NOT NULL UNIQUE,
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
);

-- Stock Movements (Strictly Append-Only Ledger)
CREATE TABLE IF NOT EXISTS stock_movements (
    id TEXT PRIMARY KEY,
    product_id TEXT NOT NULL,
    movement_type TEXT NOT NULL CHECK (
        movement_type IN (
            'opening', 'purchase', 'sale', 'sale_return', 'purchase_return',
            'adjustment_damage', 'adjustment_expired', 'adjustment_lost',
            'adjustment_found', 'adjustment_correction', 'void_restore', 'custom'
        )
    ),
    qty_change REAL NOT NULL, -- Signed decimal
    stock_before REAL NOT NULL,
    stock_after REAL NOT NULL,
    reason TEXT,
    reference_type TEXT CHECK (reference_type IN ('bill', 'purchase', 'return', 'adjustment', 'import') OR reference_type IS NULL),
    reference_id TEXT,
    user_id TEXT NOT NULL,
    approved_by TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
    FOREIGN KEY (product_id) REFERENCES products(id),
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (approved_by) REFERENCES users(id)
);

-- Triggers to enforce immutability on stock_movements
CREATE TRIGGER IF NOT EXISTS trg_prevent_stock_movements_update
BEFORE UPDATE ON stock_movements
BEGIN
    SELECT RAISE(FAIL, 'ERROR: stock_movements records are immutable and cannot be updated.');
END;

CREATE TRIGGER IF NOT EXISTS trg_prevent_stock_movements_delete
BEFORE DELETE ON stock_movements
BEGIN
    SELECT RAISE(FAIL, 'ERROR: stock_movements records are immutable and cannot be deleted.');
END;

-- Customers
CREATE TABLE IF NOT EXISTS customers (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    phone TEXT UNIQUE,
    email TEXT,
    address TEXT,
    notes TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime'))
);

-- Shifts
CREATE TABLE IF NOT EXISTS shifts (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    started_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
    ended_at TEXT,
    opening_cash INTEGER NOT NULL DEFAULT 0, -- In Paise
    expected_cash INTEGER, -- In Paise
    counted_cash INTEGER, -- In Paise
    cash_difference INTEGER, -- In Paise
    status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'closed')),
    notes TEXT,
    reviewed_by TEXT,
    reviewed_at TEXT,
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (reviewed_by) REFERENCES users(id)
);

-- Cash Events (pay_in, pay_out, expense, float)
CREATE TABLE IF NOT EXISTS cash_events (
    id TEXT PRIMARY KEY,
    shift_id TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('pay_in', 'pay_out', 'expense', 'float')),
    amount INTEGER NOT NULL, -- In Paise
    reason TEXT NOT NULL,
    user_id TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
    FOREIGN KEY (shift_id) REFERENCES shifts(id),
    FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Daily Bill Sequence Table (Guarantees atomic, gap-free bill numbers: MS-YYYYMMDD-0001)
CREATE TABLE IF NOT EXISTS daily_bill_counters (
    date_key TEXT PRIMARY KEY, -- Format: YYYYMMDD
    last_seq INTEGER NOT NULL DEFAULT 0
);

-- Bills (Sales Orders)
CREATE TABLE IF NOT EXISTS bills (
    id TEXT PRIMARY KEY,
    bill_number TEXT NOT NULL UNIQUE,
    status TEXT NOT NULL DEFAULT 'completed' CHECK (status IN ('draft', 'held', 'completed', 'voided', 'partially_returned', 'returned')),
    shift_id TEXT NOT NULL,
    cashier_id TEXT NOT NULL,
    customer_id TEXT,
    subtotal INTEGER NOT NULL DEFAULT 0, -- In Paise
    discount_total INTEGER NOT NULL DEFAULT 0, -- In Paise
    tax_total INTEGER NOT NULL DEFAULT 0, -- In Paise
    round_off INTEGER NOT NULL DEFAULT 0, -- In Paise
    grand_total INTEGER NOT NULL DEFAULT 0, -- In Paise
    payment_status TEXT NOT NULL DEFAULT 'paid' CHECK (payment_status IN ('paid', 'partial', 'unpaid')),
    notes TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
    completed_at TEXT,
    voided_at TEXT,
    voided_by TEXT,
    void_reason TEXT,
    approved_by TEXT,
    FOREIGN KEY (shift_id) REFERENCES shifts(id),
    FOREIGN KEY (cashier_id) REFERENCES users(id),
    FOREIGN KEY (customer_id) REFERENCES customers(id),
    FOREIGN KEY (voided_by) REFERENCES users(id),
    FOREIGN KEY (approved_by) REFERENCES users(id)
);

-- Bill Line Items
CREATE TABLE IF NOT EXISTS bill_items (
    id TEXT PRIMARY KEY,
    bill_id TEXT NOT NULL,
    product_id TEXT, -- NULL for custom unlisted items
    is_custom INTEGER NOT NULL DEFAULT 0,
    name_snapshot TEXT NOT NULL,
    sku_snapshot TEXT,
    qty REAL NOT NULL,
    unit TEXT NOT NULL DEFAULT 'piece',
    list_price_snapshot INTEGER NOT NULL, -- In Paise
    sold_price INTEGER NOT NULL, -- In Paise
    line_discount INTEGER NOT NULL DEFAULT 0, -- In Paise
    gst_rate REAL NOT NULL DEFAULT 0,
    tax_amount INTEGER NOT NULL DEFAULT 0, -- In Paise
    line_total INTEGER NOT NULL, -- In Paise
    purchase_price_snapshot INTEGER, -- In Paise (Admin only)
    price_override_reason TEXT,
    override_approved_by TEXT,
    FOREIGN KEY (bill_id) REFERENCES bills(id) ON DELETE CASCADE,
    FOREIGN KEY (product_id) REFERENCES products(id),
    FOREIGN KEY (override_approved_by) REFERENCES users(id)
);

-- Payments
CREATE TABLE IF NOT EXISTS payments (
    id TEXT PRIMARY KEY,
    bill_id TEXT NOT NULL,
    method TEXT NOT NULL CHECK (method IN ('cash', 'upi', 'card', 'other')),
    amount INTEGER NOT NULL, -- In Paise
    reference TEXT,
    tendered_amount INTEGER, -- In Paise (for cash)
    change_amount INTEGER, -- In Paise (for cash)
    created_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
    FOREIGN KEY (bill_id) REFERENCES bills(id) ON DELETE CASCADE
);

-- Returns
CREATE TABLE IF NOT EXISTS returns (
    id TEXT PRIMARY KEY,
    original_bill_id TEXT NOT NULL,
    return_number TEXT NOT NULL UNIQUE,
    reason TEXT NOT NULL,
    refund_method TEXT NOT NULL CHECK (refund_method IN ('cash', 'upi', 'card', 'other')),
    refund_amount INTEGER NOT NULL, -- In Paise
    user_id TEXT NOT NULL,
    approved_by TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
    FOREIGN KEY (original_bill_id) REFERENCES bills(id),
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (approved_by) REFERENCES users(id)
);

-- Return Line Items
CREATE TABLE IF NOT EXISTS return_items (
    id TEXT PRIMARY KEY,
    return_id TEXT NOT NULL,
    product_id TEXT,
    item_name TEXT NOT NULL,
    qty REAL NOT NULL,
    unit_price INTEGER NOT NULL, -- In Paise
    total_amount INTEGER NOT NULL, -- In Paise
    restock INTEGER NOT NULL DEFAULT 1,
    FOREIGN KEY (return_id) REFERENCES returns(id) ON DELETE CASCADE,
    FOREIGN KEY (product_id) REFERENCES products(id)
);

-- Purchases
CREATE TABLE IF NOT EXISTS purchases (
    id TEXT PRIMARY KEY,
    supplier_id TEXT,
    invoice_number TEXT NOT NULL,
    date TEXT NOT NULL,
    total_amount INTEGER NOT NULL DEFAULT 0, -- In Paise
    user_id TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
    FOREIGN KEY (supplier_id) REFERENCES suppliers(id),
    FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Purchase Items
CREATE TABLE IF NOT EXISTS purchase_items (
    id TEXT PRIMARY KEY,
    purchase_id TEXT NOT NULL,
    product_id TEXT NOT NULL,
    qty REAL NOT NULL,
    cost_price INTEGER NOT NULL, -- In Paise
    line_total INTEGER NOT NULL, -- In Paise
    update_product_cost INTEGER NOT NULL DEFAULT 1,
    FOREIGN KEY (purchase_id) REFERENCES purchases(id) ON DELETE CASCADE,
    FOREIGN KEY (product_id) REFERENCES products(id)
);

-- Day Closings (End of Day Snapshots)
CREATE TABLE IF NOT EXISTS day_closings (
    id TEXT PRIMARY KEY,
    date TEXT NOT NULL UNIQUE, -- YYYY-MM-DD
    totals_snapshot TEXT NOT NULL, -- JSON
    expected_cash INTEGER NOT NULL, -- In Paise
    counted_cash INTEGER NOT NULL, -- In Paise
    difference INTEGER NOT NULL, -- In Paise
    closed_by TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
    FOREIGN KEY (closed_by) REFERENCES users(id)
);

-- Audit Log (Strictly Append-Only Ledger with SHA-256 Hash Chain)
CREATE TABLE IF NOT EXISTS audit_log (
    id TEXT PRIMARY KEY,
    timestamp TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
    user_id TEXT NOT NULL,
    acting_role TEXT NOT NULL,
    action TEXT NOT NULL,
    entity_type TEXT NOT NULL,
    entity_id TEXT,
    old_value TEXT, -- JSON
    new_value TEXT, -- JSON
    reason TEXT,
    approved_by TEXT,
    severity TEXT NOT NULL DEFAULT 'info' CHECK (severity IN ('info', 'notice', 'warning')),
    device_info TEXT,
    prev_hash TEXT,
    hash TEXT NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (approved_by) REFERENCES users(id)
);

-- Triggers to enforce immutability on audit_log
CREATE TRIGGER IF NOT EXISTS trg_prevent_audit_log_update
BEFORE UPDATE ON audit_log
BEGIN
    SELECT RAISE(FAIL, 'ERROR: audit_log records are immutable and cannot be updated.');
END;

CREATE TRIGGER IF NOT EXISTS trg_prevent_audit_log_delete
BEFORE DELETE ON audit_log
BEGIN
    SELECT RAISE(FAIL, 'ERROR: audit_log records are immutable and cannot be deleted.');
END;

-- Backups Registry
CREATE TABLE IF NOT EXISTS backups (
    id TEXT PRIMARY KEY,
    created_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
    type TEXT NOT NULL CHECK (type IN ('auto', 'manual', 'pre-restore', 'pre-import')),
    path TEXT NOT NULL,
    size INTEGER NOT NULL,
    checksum TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'valid' CHECK (status IN ('valid', 'corrupt', 'restored'))
);

-- Import Jobs Registry
CREATE TABLE IF NOT EXISTS import_jobs (
    id TEXT PRIMARY KEY,
    filename TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('products', 'stock', 'prices', 'barcodes')),
    total_rows INTEGER NOT NULL DEFAULT 0,
    valid_rows INTEGER NOT NULL DEFAULT 0,
    error_rows INTEGER NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'preview' CHECK (status IN ('preview', 'completed', 'failed')),
    user_id TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
    report_path TEXT,
    FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Strategic Indexes for High-Performance POS Operations
CREATE INDEX IF NOT EXISTS idx_products_name ON products(name);
CREATE INDEX IF NOT EXISTS idx_products_sku ON products(sku);
CREATE INDEX IF NOT EXISTS idx_products_barcode ON products(barcode);
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category_id);
CREATE INDEX IF NOT EXISTS idx_products_is_active ON products(is_active);
CREATE INDEX IF NOT EXISTS idx_products_quick_btn ON products(is_quick_button, quick_sort_order);

CREATE INDEX IF NOT EXISTS idx_product_barcodes_lookup ON product_barcodes(barcode);

CREATE INDEX IF NOT EXISTS idx_bills_created_at ON bills(created_at);
CREATE INDEX IF NOT EXISTS idx_bills_status ON bills(status);
CREATE INDEX IF NOT EXISTS idx_bills_cashier ON bills(cashier_id);
CREATE INDEX IF NOT EXISTS idx_bills_shift ON bills(shift_id);
CREATE INDEX IF NOT EXISTS idx_bills_number ON bills(bill_number);

CREATE INDEX IF NOT EXISTS idx_bill_items_bill ON bill_items(bill_id);
CREATE INDEX IF NOT EXISTS idx_bill_items_product ON bill_items(product_id);
CREATE INDEX IF NOT EXISTS idx_bill_items_custom ON bill_items(is_custom);

CREATE INDEX IF NOT EXISTS idx_stock_movements_product ON stock_movements(product_id);
CREATE INDEX IF NOT EXISTS idx_stock_movements_created ON stock_movements(created_at);
CREATE INDEX IF NOT EXISTS idx_stock_movements_ref ON stock_movements(reference_type, reference_id);

CREATE INDEX IF NOT EXISTS idx_audit_log_timestamp ON audit_log(timestamp);
CREATE INDEX IF NOT EXISTS idx_audit_log_entity ON audit_log(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_user ON audit_log(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_severity ON audit_log(severity);
