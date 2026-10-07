// Shared Data Types and Contracts for Mangalore Store POS

export type Role = 'admin' | 'cashier';

export interface User {
  id: string;
  name: string;
  role: Role;
  is_active: number;
  failed_attempts: number;
  locked_until: string | null;
  created_at: string;
}

export interface UserAuthResponse {
  user: {
    id: string;
    name: string;
    role: Role;
  };
  token: string;
}

export interface Settings {
  store_name: string;
  address: string;
  phone: string;
  gstin: string;
  receipt_footer: string;
  bill_prefix: string;
  max_cashier_discount_percent: number;
  max_cashier_discount_amount: number;
  max_cashier_price_override_percent: number;
  require_reason_for_discount: boolean;
  allow_negative_stock: boolean;
  gst_enabled: boolean;
  prices_include_gst: boolean;
  round_off_enabled: boolean;
  auto_backup_time: string;
  backup_folder: string;
  backup_warning_days: number;
  session_timeout_minutes: number;
  owner_presence_timeout_minutes: number;
  receipt_width: '58' | '80' | 'A4';
  custom_item_default_gst: number;
  upi_qr_url?: string;
  sound_effects_enabled?: boolean;
}

export interface Category {
  id: string;
  name: string;
  parent_id: string | null;
  sort_order: number;
  is_active: number;
}

export interface Supplier {
  id: string;
  name: string;
  phone: string | null;
  address: string | null;
  gstin: string | null;
  notes: string | null;
  is_active: number;
}

export type UnitType = 'piece' | 'packet' | 'kg' | 'g' | 'litre' | 'ml' | 'bottle' | 'box' | 'dozen';

export interface Product {
  id: string;
  name: string;
  local_name: string | null;
  sku: string | null;
  barcode: string | null;
  barcodes?: string[];
  category_id: string | null;
  category_name?: string;
  brand: string | null;
  unit: UnitType;
  allows_decimal_qty: number;
  purchase_price?: number; // Paise - omitted for cashier
  selling_price: number; // Paise
  mrp: number | null; // Paise
  gst_rate: number | null; // e.g. 0, 5, 12, 18
  current_stock: number; // Admin gets exact; cashier gets stock state or cached stock
  stock_status?: 'in_stock' | 'low_stock' | 'out_of_stock';
  min_stock: number;
  reorder_level: number;
  supplier_id: string | null;
  supplier_name?: string;
  image_path: string | null;
  description: string | null;
  is_quick_button: number;
  quick_sort_order: number;
  variant_group: string | null;
  parent_product_id: string | null;
  is_active: number;
  created_at: string;
  updated_at: string;
  created_by: string;
}

export type MovementType =
  | 'opening'
  | 'purchase'
  | 'sale'
  | 'sale_return'
  | 'purchase_return'
  | 'adjustment_damage'
  | 'adjustment_expired'
  | 'adjustment_lost'
  | 'adjustment_found'
  | 'adjustment_correction'
  | 'void_restore'
  | 'custom';

export interface StockMovement {
  id: string;
  product_id: string;
  product_name?: string;
  movement_type: MovementType;
  qty_change: number; // signed
  stock_before: number;
  stock_after: number;
  reason: string | null;
  reference_type: 'bill' | 'purchase' | 'return' | 'adjustment' | 'import' | null;
  reference_id: string | null;
  user_id: string;
  user_name?: string;
  approved_by: string | null;
  created_at: string;
}

export type BillStatus = 'draft' | 'held' | 'completed' | 'voided' | 'partially_returned' | 'returned';

export interface BillItem {
  id: string;
  bill_id: string;
  product_id: string | null;
  is_custom: number; // 0 or 1
  name_snapshot: string;
  sku_snapshot: string | null;
  qty: number;
  unit: UnitType;
  list_price_snapshot: number; // Paise
  sold_price: number; // Paise
  line_discount: number; // Paise
  gst_rate: number;
  tax_amount: number; // Paise
  line_total: number; // Paise
  purchase_price_snapshot?: number | null; // Paise (admin only)
  price_override_reason: string | null;
  override_approved_by: string | null;
}

export type PaymentMethod = 'cash' | 'upi' | 'card' | 'other';

export interface Payment {
  id: string;
  bill_id: string;
  method: PaymentMethod;
  amount: number; // Paise
  reference: string | null;
  tendered_amount?: number; // Paise (for cash)
  change_amount?: number; // Paise (for cash)
  created_at: string;
}

export interface Customer {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  address: string | null;
  notes: string | null;
  created_at: string;
}

export interface Bill {
  id: string;
  bill_number: string;
  status: BillStatus;
  shift_id: string;
  cashier_id: string;
  cashier_name?: string;
  customer_id: string | null;
  customer_name?: string;
  customer_phone?: string;
  subtotal: number; // Paise
  discount_total: number; // Paise
  tax_total: number; // Paise
  round_off: number; // Paise
  grand_total: number; // Paise
  payment_status: 'paid' | 'partial' | 'unpaid';
  notes: string | null;
  created_at: string;
  completed_at: string | null;
  voided_at: string | null;
  voided_by: string | null;
  voided_by_name?: string;
  void_reason: string | null;
  approved_by: string | null;
  items?: BillItem[];
  payments?: Payment[];
}

export interface CartItem {
  clientId: string; // unique frontend id for line
  product_id: string | null;
  is_custom: boolean;
  name: string;
  sku: string | null;
  barcode: string | null;
  unit: UnitType;
  allows_decimal_qty: boolean;
  qty: number;
  current_stock: number;
  list_price: number; // Paise
  sold_price: number; // Paise
  line_discount: number; // Paise
  gst_rate: number;
  tax_amount: number; // Paise
  line_total: number; // Paise
  price_override_reason?: string;
  override_approved_by?: string;
}

export interface Shift {
  id: string;
  user_id: string;
  user_name?: string;
  started_at: string;
  ended_at: string | null;
  opening_cash: number; // Paise
  expected_cash: number | null; // Paise
  counted_cash: number | null; // Paise
  cash_difference: number | null; // Paise
  status: 'open' | 'closed';
  notes: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  // Computed aggregations
  bills_count?: number;
  total_sales?: number;
  cash_sales?: number;
  upi_sales?: number;
  card_sales?: number;
  discounts_total?: number;
  voids_count?: number;
  returns_total?: number;
  custom_items_count?: number;
}

export interface CashEvent {
  id: string;
  shift_id: string;
  type: 'pay_in' | 'pay_out' | 'expense' | 'float';
  amount: number; // Paise
  reason: string;
  user_id: string;
  user_name?: string;
  created_at: string;
}

export interface DayClosing {
  id: string;
  date: string; // YYYY-MM-DD
  totals_snapshot: string; // JSON
  expected_cash: number; // Paise
  counted_cash: number; // Paise
  difference: number; // Paise
  closed_by: string;
  closed_by_name?: string;
  created_at: string;
}

export interface ReturnItem {
  id: string;
  return_id: string;
  product_id: string | null;
  item_name: string;
  qty: number;
  unit_price: number; // Paise
  total_amount: number; // Paise
  restock: number; // 0 or 1
}

export interface ReturnRecord {
  id: string;
  original_bill_id: string;
  original_bill_number?: string;
  return_number: string;
  reason: string;
  refund_method: PaymentMethod;
  refund_amount: number; // Paise
  user_id: string;
  user_name?: string;
  approved_by: string | null;
  created_at: string;
  items?: ReturnItem[];
}

export interface PurchaseItem {
  id: string;
  purchase_id: string;
  product_id: string;
  product_name?: string;
  qty: number;
  cost_price: number; // Paise
  line_total: number; // Paise
  update_product_cost: number; // 0 or 1
}

export interface PurchaseRecord {
  id: string;
  supplier_id: string | null;
  supplier_name?: string;
  invoice_number: string;
  date: string;
  total_amount: number; // Paise
  user_id: string;
  user_name?: string;
  created_at: string;
  items?: PurchaseItem[];
}

export interface AuditLogEntry {
  id: string;
  timestamp: string;
  user_id: string;
  user_name?: string;
  acting_role: Role;
  action: string;
  entity_type: string;
  entity_id: string | null;
  old_value: string | null; // JSON
  new_value: string | null; // JSON
  reason: string | null;
  approved_by: string | null;
  approved_by_name?: string;
  severity: 'info' | 'notice' | 'warning';
  device_info: string | null;
  prev_hash: string | null;
  hash: string;
}

export interface BackupRecord {
  id: string;
  created_at: string;
  type: 'auto' | 'manual' | 'pre-restore' | 'pre-import';
  path: string;
  size: number;
  checksum: string;
  status: 'valid' | 'corrupt' | 'restored';
}

export interface ImportJob {
  id: string;
  filename: string;
  type: 'products' | 'stock' | 'prices' | 'barcodes';
  total_rows: number;
  valid_rows: number;
  error_rows: number;
  status: 'preview' | 'completed' | 'failed';
  user_id: string;
  created_at: string;
  report_path: string | null;
}

export interface CustomItemReview {
  name: string;
  count: number;
  total_revenue: number;
  last_sold_at: string;
  last_sold_price: number;
}

export interface DashboardSummary {
  today_sales: number; // Paise
  today_bills_count: number;
  avg_bill_amount: number; // Paise
  cash_sales: number; // Paise
  upi_sales: number; // Paise
  card_sales: number; // Paise
  other_sales: number; // Paise
  cashier_discounts: number; // Paise
  admin_discounts: number; // Paise
  returns_today: number; // Paise
  estimated_gross_profit?: number; // Paise (admin only)
  low_stock_count: number;
  out_of_stock_count: number;
  custom_items_pending: number;
  voids_today_count: number;
  last_backup: {
    date: string;
    status: 'good' | 'warning' | 'critical';
    days_ago: number;
  };
  stock_integrity: {
    status: 'healthy' | 'mismatch';
    mismatched_products_count: number;
  };
  open_shift: Shift | null;
  away_summary?: {
    from_time: string;
    to_time: string;
    bills_count: number;
    total_sales: number;
    cash_sales: number;
    upi_sales: number;
    discounts_count: number;
    discounts_total: number;
    custom_items_count: number;
    voids_count: number;
  } | null;
}
