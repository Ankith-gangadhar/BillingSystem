# Architectural & Design Decisions (DECISIONS.md)

This document records the design and architectural decisions made for the **Mangalore Store POS** system based on the business requirements and non-negotiable principles.

---

## 1. Architecture & Monorepo Structure
- **Backend**: Express + `better-sqlite3` running in WAL mode with `PRAGMA foreign_keys = ON` and `PRAGMA synchronous = FULL`.
- **Frontend**: React 18 + Vite + TypeScript + Tailwind CSS with custom shadcn-style component primitives, Lucide icons, and locally bundled Inter font.
- **Desktop Shell**: Electron wrapper providing desktop window management, hardware printer access, kiosk mode, and offline bundling.
- **Shared Package / Types**: Common TypeScript interfaces shared between server and client in `/shared`.

## 2. Financial Calculations & Money Representation
- All currency values are stored as integer **paise** (`₹1.00 = 100 paise`) in database tables to eliminate IEEE 754 floating-point rounding inaccuracies.
- Formatting helper functions convert paise to INR string (`₹XX.XX`) for display and parse input values securely.
- Round-off is implemented to the nearest ₹1 (100 paise) when enabled in settings. Bill-level discounts are distributed proportionally across line items using largest-remainder integer distribution to avoid losing or gaining single paise.

## 3. Stock Movement & Immutability
- `products.current_stock` is maintained as a cached aggregate but verified against `SUM(stock_movements.qty_change)`.
- Stock is modified **only** through append-only `stock_movements` entries.
- SQLite database triggers prohibit `UPDATE` or `DELETE` on `stock_movements` and `audit_log` tables.

## 4. Search Engine & Barcode Detection
- Instant in-memory search using `minisearch` loaded at application startup and synchronized on product mutations.
- Prefix, typo-tolerant, and tokenized matching across SKU, barcode, title, local name (Kannada/Tulunadu aliases), category, and brand.
- Barcode scanner input detection: rapid keystrokes (< 50ms interval) terminated by `Enter` are automatically captured by the global keyboard listener even if not focused on the input, routing directly to the cart.

## 5. Security & Permission Enforcement
- Backend validates every route against JWT session tokens and user roles (`admin` vs `cashier`).
- Cashier API responses strictly strip purchase prices, margins, profit, and confidential business metrics at the serialization level.
- In-line Admin PIN elevation allows cashiers to request immediate manager approval without switching sessions. 5 consecutive failed PIN attempts trigger a 60-second cooldown logged with a high-severity audit record.
- Audit logs use SHA-256 hash chaining (`prev_hash` -> `hash`) to ensure tamper detection.

## 6. Offline-First & Asset Bundling
- Zero runtime external CDN calls. All fonts (Inter), icons (`lucide-react`), styles, and scripts are bundled into the local distribution.
- Receipt generation uses native CSS print media queries for 58mm, 80mm thermal printers and standard A4 sheets, plus client-side PDF generation.

---
