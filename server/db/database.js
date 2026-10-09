"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DEFAULT_SETTINGS = void 0;
exports.getDb = getDb;
exports.initTestDb = initTestDb;
exports.getSettings = getSettings;
exports.updateSettings = updateSettings;
exports.logAudit = logAudit;
exports.verifyAuditIntegrity = verifyAuditIntegrity;
exports.verifyStockIntegrity = verifyStockIntegrity;
const better_sqlite3_1 = require("better-sqlite3");
const path_1 = require("path");
const fs_1 = require("fs");
const crypto_1 = require("crypto");
const DATA_DIR = path_1.default.join(process.cwd(), 'data');
const DB_PATH = path_1.default.join(DATA_DIR, 'mangalore_store.db');
if (!fs_1.default.existsSync(DATA_DIR)) {
    fs_1.default.mkdirSync(DATA_DIR, { recursive: true });
}
let dbInstance = null;
function getDb() {
    if (!dbInstance) {
        dbInstance = new better_sqlite3_1.default(DB_PATH, {
            verbose: process.env.DEBUG_SQL ? console.log : undefined,
        });
        // Enforce WAL mode, Foreign Keys, and strict integrity
        dbInstance.pragma('journal_mode = WAL');
        dbInstance.pragma('foreign_keys = ON');
        dbInstance.pragma('synchronous = FULL');
        initSchema(dbInstance);
        initDefaultSettings(dbInstance);
    }
    return dbInstance;
}
function initTestDb(customPath) {
    const testDb = new better_sqlite3_1.default(customPath || ':memory:');
    testDb.pragma('journal_mode = WAL');
    testDb.pragma('foreign_keys = ON');
    testDb.pragma('synchronous = FULL');
    initSchema(testDb);
    initDefaultSettings(testDb);
    return testDb;
}
function initSchema(db) {
    const schemaPath = path_1.default.join(__dirname, 'schema.sql');
    if (fs_1.default.existsSync(schemaPath)) {
        const schemaSql = fs_1.default.readFileSync(schemaPath, 'utf8');
        db.exec(schemaSql);
    }
    else {
        // In compiled distribution, check relative to root or dist
        const fallbackPath = path_1.default.join(process.cwd(), 'server', 'db', 'schema.sql');
        if (fs_1.default.existsSync(fallbackPath)) {
            db.exec(fs_1.default.readFileSync(fallbackPath, 'utf8'));
        }
    }
}
exports.DEFAULT_SETTINGS = {
    store_name: 'Mangalore Store',
    address: '8th Main Cross Rd, Nanjappa Reddy Colony, Gokula 1st Stage, Mathikere Extension, Mathikere, Bengaluru, Karnataka 560054',
    phone: '+91 98450 12345',
    gstin: '',
    receipt_footer: 'Authentic Coastal Karnataka Snacks & Spices. Visit Again!',
    bill_prefix: 'MS',
    max_cashier_discount_percent: 5,
    max_cashier_discount_amount: 5000, // 5000 paise = ₹50
    max_cashier_price_override_percent: 5,
    require_reason_for_discount: true,
    allow_negative_stock: false,
    gst_enabled: false,
    prices_include_gst: true,
    round_off_enabled: true,
    auto_backup_time: '23:00',
    backup_folder: path_1.default.join(DATA_DIR, 'backups'),
    backup_warning_days: 2,
    session_timeout_minutes: 30,
    owner_presence_timeout_minutes: 60,
    receipt_width: '80',
    custom_item_default_gst: 0,
    sound_effects_enabled: true,
};
function initDefaultSettings(db) {
    const count = db.prepare('SELECT count(*) as cnt FROM settings').get();
    if (count.cnt === 0) {
        const insert = db.prepare('INSERT INTO settings (key, value) VALUES (?, ?)');
        const insertMany = db.transaction((entries) => {
            for (const [k, v] of entries) {
                insert.run(k, JSON.stringify(v));
            }
        });
        insertMany(Object.entries(exports.DEFAULT_SETTINGS));
    }
}
function getSettings(db = getDb()) {
    const rows = db.prepare('SELECT key, value FROM settings').all();
    const settingsObj = { ...exports.DEFAULT_SETTINGS };
    for (const row of rows) {
        try {
            settingsObj[row.key] = JSON.parse(row.value);
        }
        catch {
            settingsObj[row.key] = row.value;
        }
    }
    return settingsObj;
}
function updateSettings(updates, db = getDb()) {
    const upsert = db.prepare(`
    INSERT INTO settings (key, value, updated_at) 
    VALUES (?, ?, datetime('now', 'localtime'))
    ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at
  `);
    const runTransaction = db.transaction(() => {
        for (const [k, v] of Object.entries(updates)) {
            upsert.run(k, JSON.stringify(v));
        }
    });
    runTransaction();
    return getSettings(db);
}
// Audit Logging with SHA-256 Hash Chaining
function logAudit(db, entry) {
    const lastLog = db.prepare('SELECT hash FROM audit_log ORDER BY rowid DESC LIMIT 1').get();
    const prevHash = lastLog ? lastLog.hash : 'GENESIS';
    const id = crypto_1.default.randomUUID();
    const timestamp = new Date().toISOString();
    const oldJson = entry.oldValue !== undefined ? JSON.stringify(entry.oldValue) : null;
    const newJson = entry.newValue !== undefined ? JSON.stringify(entry.newValue) : null;
    const severity = entry.severity || 'info';
    const payloadToHash = `${prevHash}|${id}|${timestamp}|${entry.userId}|${entry.actingRole}|${entry.action}|${entry.entityType}|${entry.entityId || ''}|${oldJson || ''}|${newJson || ''}|${entry.reason || ''}|${entry.approvedBy || ''}|${severity}`;
    const hash = crypto_1.default.createHash('sha256').update(payloadToHash).digest('hex');
    const stmt = db.prepare(`
    INSERT INTO audit_log (
      id, timestamp, user_id, acting_role, action, entity_type, entity_id,
      old_value, new_value, reason, approved_by, severity, device_info, prev_hash, hash
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
    stmt.run(id, timestamp, entry.userId, entry.actingRole, entry.action, entry.entityType, entry.entityId || null, oldJson, newJson, entry.reason || null, entry.approvedBy || null, severity, entry.deviceInfo || null, prevHash, hash);
    return { id, hash };
}
// Audit Integrity Verification
function verifyAuditIntegrity(db = getDb()) {
    const rows = db.prepare('SELECT * FROM audit_log ORDER BY rowid ASC').all();
    let prevHash = 'GENESIS';
    for (let i = 0; i < rows.length; i++) {
        const r = rows[i];
        if (r.prev_hash !== prevHash) {
            return { isValid: false, checkedCount: i, brokenAtId: r.id };
        }
        const payloadToHash = `${prevHash}|${r.id}|${r.timestamp}|${r.user_id}|${r.acting_role}|${r.action}|${r.entity_type}|${r.entity_id || ''}|${r.old_value || ''}|${r.new_value || ''}|${r.reason || ''}|${r.approved_by || ''}|${r.severity}`;
        const expectedHash = crypto_1.default.createHash('sha256').update(payloadToHash).digest('hex');
        if (expectedHash !== r.hash) {
            return { isValid: false, checkedCount: i, brokenAtId: r.id };
        }
        prevHash = r.hash;
    }
    return { isValid: true, checkedCount: rows.length };
}
// Nightly / On-Demand Stock Integrity Checker
function verifyStockIntegrity(db = getDb()) {
    const query = `
    SELECT 
      p.id,
      p.name,
      p.current_stock as cached_stock,
      COALESCE(SUM(sm.qty_change), 0) as ledger_sum
    FROM products p
    LEFT JOIN stock_movements sm ON sm.product_id = p.id
    WHERE p.is_active = 1
    GROUP BY p.id
    HAVING ROUND(p.current_stock, 3) != ROUND(COALESCE(SUM(sm.qty_change), 0), 3)
  `;
    const rows = db.prepare(query).all();
    const mismatches = rows.map(r => ({
        productId: r.id,
        productName: r.name,
        cachedStock: Number(r.cached_stock),
        ledgerSum: Number(r.ledger_sum),
        difference: Number(r.cached_stock) - Number(r.ledger_sum)
    }));
    return {
        healthy: mismatches.length === 0,
        mismatches
    };
}
