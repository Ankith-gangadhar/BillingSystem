# 👑 Mangalore Store POS — Owner's Quick Handbook (1 Page)

Welcome to your store operating guide. This handbook outlines your administrative controls and how to maintain full visibility and trust with your staff.

---

## 1. Trust & Visibility Tools

### 🔍 "While You Were Away" Banner
When you return to the counter after being away (e.g. 7:00 AM – 10:00 AM):
- Log in with your PIN (`1234`).
- Look at the top banner on the **Dashboard**: you will immediately see total sales, cash collected, UPI payments, worker discounts, unlisted custom items, and voids made during your absence.
- Click **"Review Shift & Drawer Cash"** to verify drawer cash expectations.

### ⚡ "Owner at Counter" Mode (Top Bar Switch)
- When you are standing at the counter and want to give quick customer discounts without entering your PIN every time:
  - Toggle the **"Owner at Counter"** switch in the top bar.
  - While active, discounts of any amount are permitted instantly and automatically tagged in the audit trail as given by the owner.
  - Automatically turns off after 60 minutes for safety.

---

## 2. Managing Product Catalog & Stock

### 📥 Bulk Onboarding via Excel
1. Open **Import / Export** in the sidebar.
2. Click **Download Sample Excel Template**.
3. Fill in your products (Name, SKU, Barcode, Selling Price, Cost Price, Opening Stock).
4. Upload the file. The system will preview and validate every row, highlighting any duplicate barcodes or SKUs.
5. Click **Confirm & Import**. An automatic safety backup is created before data is saved.

### 📦 Stock Adjustments & Physical Reconciliation
- **Stock is never directly edited**: It is the sum of append-only movement rows.
- If an item is damaged or expired: go to **Inventory** → Click **Adjust Stock** → Select the product, quantity change, and mandatory reason.
- For physical shelf counts: use **Physical Count Reconciliation** to enter counted quantities; the system automatically calculates variances and posts adjustments in one click.

---

## 3. Financial Accountability & End-of-Day

### 💰 Expected Cash Formula
$$\text{Expected Cash} = \text{Opening Cash} + \text{Cash Sales} - \text{Cash Refunds} - \text{Logged Cash Expenses (Milk/Tea)}$$

### 🔒 End-of-Day Closing (Close Day)
- At the end of the day, open **Shifts & Cash** and click **Close Day**.
- Enter the total cash in your drawer.
- The system generates an immutable closing snapshot and a printable closing report for your records.

### 🛡️ Backups & Data Safety
- Automatic daily backups are created in `data/backups/`.
- Verify backup health anytime on the Dashboard or click **Backup Database Now** in the Backup menu.
