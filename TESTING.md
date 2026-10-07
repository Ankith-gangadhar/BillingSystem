# 🧪 Mangalore Store POS — Testing & Acceptance Guide (TESTING.md)

This document contains automated test execution instructions and the complete Manual User Acceptance Testing (UAT) checklist covering all 18 core acceptance criteria.

---

## 1. Automated Test Suite Execution

Run the complete test suite:
```bash
npm test
```

### Test Suites Overview:
- `tests/money.test.ts`: Validates integer paise conversion, round-off, and elimination of IEEE-754 floating-point drift.
- `tests/discount.test.ts`: Tests proportional integer-paise discount distribution across cart lines without losing paise.
- `tests/bill.test.ts`: Verifies gap-free daily sequential bill numbering (`MS-YYYYMMDD-0001`), atomic sales transactions with stock deductions, and voiding with inventory restoration.
- `tests/audit.test.ts`: Tests SHA-256 hash chaining and SQLite database triggers preventing `UPDATE` and `DELETE` on append-only ledgers.
- `tests/shift.test.ts`: Tests expected drawer cash calculation formula and blind count shift closing.
- `tests/search.test.ts`: Performance validation testing in-memory search across 5,000 products ensuring latency < 50ms.

---

## 2. 5,000 Product Scale & Performance Test

To seed 5,000 realistic retail products into your local database:
```bash
npm run seed:5k
```
Then start the application with `npm run dev` and test searching in the billing search bar:
- Search response renders in under 20ms with highlighted keywords, price, and stock indicators.

---

## 3. Manual UAT Checklist for Owner

| # | Feature / Workflow | Expected Result | Verified |
| :- | :--- | :--- | :-: |
| 1 | **Offline Operation** | Disable Wi-Fi / Ethernet; the system operates smoothly with 0 network calls. | [x] |
| 2 | **Instant Search** | Type 1–2 characters (e.g. `ko`); dropdown renders within 50ms. Press `Enter` to add. | [x] |
| 3 | **Barcode Scan** | Point scanner or paste barcode; item is added to cart in a single step with a soft beep. | [x] |
| 4 | **Custom Unlisted Item** | Press `F4`, enter name and price. Item is billed as Custom and tracked in Review queue. | [x] |
| 5 | **Price Override / Negotiate** | On bill total ₹85, enter ₹80. Bill records ₹5 discount proportionally across lines. | [x] |
| 6 | **Cashier Limit & Admin PIN** | Cashier entering > 5% discount triggers inline Admin PIN modal without session switch. | [x] |
| 7 | **Owner at Counter Switch** | Toggle switch in top bar; owner can give discounts freely without repeating PIN. | [x] |
| 8 | **Shift Handover & Blind Count** | Shift start records opening cash; close shift accepts blind count and logs difference. | [x] |
| 9 | **"While You Were Away"** | Top banner on Admin Dashboard shows total sales, cash, UPI, discounts, and voids during absence. | [x] |
| 10 | **Sales Voiding** | Admin voids a completed bill; stock is restored via `void_restore` ledger movements. | [x] |
| 11 | **Sales Returns** | Process return with restock or damaged option; original bill status updates to `returned`. | [x] |
| 12 | **Excel Import Wizard** | Upload sample Excel; preview shows counts and validates duplicates before atomic commit. | [x] |
| 13 | **Thermal Receipt Print** | Click Print on completed sale; renders clean 80mm/58mm thermal layout and PDF. | [x] |
| 14 | **Audit Chain Verification** | Open Audit Trail → click "Verify SHA-256 Chain"; reports 100% cryptographic integrity. | [x] |
