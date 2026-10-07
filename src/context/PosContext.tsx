import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { CartItem, Product, Shift, Bill, Customer } from '@shared/types';
import { useAuth } from './AuthContext';
import { apiRequest } from '../utils/api';
import { playPosSound } from '../utils/formatters';

interface PosContextType {
  cart: CartItem[];
  addItem: (product: any, qty?: number) => void;
  addCustomItem: (name: string, pricePaise: number, qty?: number, unit?: string) => void;
  updateQty: (clientId: string, qty: number) => void;
  updatePrice: (clientId: string, soldPricePaise: number, reason?: string, approvedBy?: string) => void;
  removeItem: (clientId: string) => void;
  clearCart: () => void;
  billDiscountPaise: number;
  setBillDiscount: (discountPaise: number) => void;
  setFinalPrice: (finalPricePaise: number) => void;
  selectedCustomer: Customer | null;
  setSelectedCustomer: (cust: Customer | null) => void;
  currentShift: Shift | null;
  refreshShift: () => Promise<void>;
  heldBillsCount: number;
  refreshHeldBills: () => Promise<void>;
  holdBill: () => Promise<void>;
  resumeBill: (heldBill: any) => void;
  // Calculations
  subtotal: number;
  totalDiscount: number;
  taxTotal: number;
  roundOff: number;
  grandTotal: number;
  totalItemsCount: number;
  lastAddedClientId: string | null;
  // Modals & UI triggers
  isCustomItemModalOpen: boolean;
  setIsCustomItemModalOpen: (open: boolean) => void;
  isDiscountModalOpen: boolean;
  setIsDiscountModalOpen: (open: boolean) => void;
  isPaymentModalOpen: boolean;
  setIsPaymentModalOpen: (open: boolean) => void;
  isHeldBillsModalOpen: boolean;
  setIsHeldBillsModalOpen: (open: boolean) => void;
  isReceiptModalOpen: boolean;
  setIsReceiptModalOpen: (open: boolean) => void;
  lastCompletedBill: Bill | null;
  setLastCompletedBill: (bill: Bill | null) => void;
}

const PosContext = createContext<PosContextType | undefined>(undefined);

export const PosProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, token, settings, requestAdminApproval, isOwnerAtCounter } = useAuth();

  const [cart, setCart] = useState<CartItem[]>([]);
  const [billDiscountPaise, setBillDiscountPaise] = useState<number>(0);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [currentShift, setCurrentShift] = useState<Shift | null>(null);
  const [heldBillsCount, setHeldBillsCount] = useState<number>(0);
  const [lastAddedClientId, setLastAddedClientId] = useState<string | null>(null);

  // Modals
  const [isCustomItemModalOpen, setIsCustomItemModalOpen] = useState<boolean>(false);
  const [isDiscountModalOpen, setIsDiscountModalOpen] = useState<boolean>(false);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState<boolean>(false);
  const [isHeldBillsModalOpen, setIsHeldBillsModalOpen] = useState<boolean>(false);
  const [isReceiptModalOpen, setIsReceiptModalOpen] = useState<boolean>(false);
  const [lastCompletedBill, setLastCompletedBill] = useState<Bill | null>(null);

  const refreshShift = useCallback(async () => {
    if (!token) return;
    try {
      const data = await apiRequest<{ shift: Shift | null }>('/shifts/current');
      setCurrentShift(data.shift);
    } catch {
      // Ignore
    }
  }, [token]);

  const refreshHeldBills = useCallback(async () => {
    if (!token) return;
    try {
      const data = await apiRequest<{ bills: any[] }>('/bills/held');
      setHeldBillsCount(data.bills.length);
    } catch {
      // Ignore
    }
  }, [token]);

  useEffect(() => {
    if (token) {
      refreshShift();
      refreshHeldBills();
    }
  }, [token, refreshShift, refreshHeldBills]);

  // Add standard product to cart
  const addItem = useCallback(
    (product: any, qtyToAdd: number = 1) => {
      setCart((prev) => {
        const existingIndex = prev.findIndex((item) => !item.is_custom && item.product_id === product.id);
        const listPrice = product.selling_price;
        const allowsDecimal = !!product.allows_decimal_qty;

        if (existingIndex > -1) {
          const updated = [...prev];
          const current = updated[existingIndex];
          const newQty = Number((current.qty + qtyToAdd).toFixed(allowsDecimal ? 3 : 0));
          const lineTotal = Math.round(current.sold_price * newQty);

          updated[existingIndex] = {
            ...current,
            qty: newQty,
            line_total: lineTotal,
          };
          setLastAddedClientId(current.clientId);
          return updated;
        }

        const newClientId = `cart-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
        const newItem: CartItem = {
          clientId: newClientId,
          product_id: product.id,
          is_custom: false,
          name: product.name,
          sku: product.sku || null,
          barcode: product.barcode || null,
          unit: product.unit || 'piece',
          allows_decimal_qty: allowsDecimal,
          qty: qtyToAdd,
          current_stock: product.current_stock ?? 100,
          list_price: listPrice,
          sold_price: listPrice,
          line_discount: 0,
          gst_rate: product.gst_rate || 0,
          tax_amount: 0,
          line_total: Math.round(listPrice * qtyToAdd),
        };

        setLastAddedClientId(newClientId);
        return [newItem, ...prev];
      });

      playPosSound('beep');
    },
    []
  );

  // Add unlisted custom item
  const addCustomItem = useCallback(
    (name: string, pricePaise: number, qty: number = 1, unit: string = 'piece') => {
      const newClientId = `custom-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      const newItem: CartItem = {
        clientId: newClientId,
        product_id: null,
        is_custom: true,
        name: name.trim(),
        sku: null,
        barcode: null,
        unit: (unit as any) || 'piece',
        allows_decimal_qty: unit === 'kg' || unit === 'g' || unit === 'litre' || unit === 'ml',
        qty,
        current_stock: 999,
        list_price: pricePaise,
        sold_price: pricePaise,
        line_discount: 0,
        gst_rate: settings?.custom_item_default_gst || 0,
        tax_amount: 0,
        line_total: Math.round(pricePaise * qty),
      };

      setCart((prev) => [newItem, ...prev]);
      setLastAddedClientId(newClientId);
      playPosSound('beep');
    },
    [settings]
  );

  const updateQty = useCallback((clientId: string, newQty: number) => {
    if (newQty <= 0) {
      removeItem(clientId);
      return;
    }
    setCart((prev) =>
      prev.map((item) => {
        if (item.clientId === clientId) {
          const lineTotal = Math.round(item.sold_price * newQty);
          return {
            ...item,
            qty: newQty,
            line_total: lineTotal,
          };
        }
        return item;
      })
    );
    playPosSound('click');
  }, []);

  const updatePrice = useCallback(
    (clientId: string, newSoldPricePaise: number, reason?: string, approvedBy?: string) => {
      setCart((prev) =>
        prev.map((item) => {
          if (item.clientId === clientId) {
            const lineListTotal = Math.round(item.list_price * item.qty);
            const lineSoldTotal = Math.round(newSoldPricePaise * item.qty);
            const lineDiscount = Math.max(0, lineListTotal - lineSoldTotal);

            return {
              ...item,
              sold_price: newSoldPricePaise,
              line_discount: lineDiscount,
              line_total: lineSoldTotal,
              price_override_reason: reason,
              override_approved_by: approvedBy,
            };
          }
          return item;
        })
      );
      playPosSound('click');
    },
    []
  );

  const removeItem = useCallback((clientId: string) => {
    setCart((prev) => prev.filter((item) => item.clientId !== clientId));
    playPosSound('click');
  }, []);

  const clearCart = useCallback(() => {
    setCart([]);
    setBillDiscountPaise(0);
    setSelectedCustomer(null);
    setLastAddedClientId(null);
  }, []);

  // Proportional discount distribution and totals calculations
  const { subtotal, totalDiscount, taxTotal, roundOff, grandTotal, totalItemsCount } = useMemo(() => {
    let rawSubtotal = 0;
    let itemsLineDiscount = 0;
    let itemsCount = 0;

    for (const item of cart) {
      rawSubtotal += Math.round(item.list_price * item.qty);
      itemsLineDiscount += item.line_discount;
      itemsCount += item.qty;
    }

    const totalDisc = itemsLineDiscount + billDiscountPaise;
    const discountedSubtotal = Math.max(0, rawSubtotal - totalDisc);

    let tax = 0;
    if (settings?.gst_enabled) {
      // Basic aggregate tax calculation
      for (const item of cart) {
        if (item.gstRate > 0) {
          tax += Math.round(item.line_total * (item.gstRate / 100));
        }
      }
    }

    let beforeRound = discountedSubtotal + (settings?.prices_include_gst ? 0 : tax);
    let round = 0;
    let finalGrand = beforeRound;

    if (settings?.round_off_enabled) {
      const roundedRupees = Math.round(beforeRound / 100);
      finalGrand = roundedRupees * 100;
      round = finalGrand - beforeRound;
    }

    return {
      subtotal: rawSubtotal,
      totalDiscount: totalDisc,
      taxTotal: tax,
      roundOff: round,
      grandTotal: finalGrand,
      totalItemsCount: itemsCount,
    };
  }, [cart, billDiscountPaise, settings]);

  // Set final rounded/negotiated price helper (Directly allowed for all roles/workers)
  const setFinalPrice = useCallback(
    async (finalPricePaise: number) => {
      const rawSub = cart.reduce((acc, it) => acc + Math.round(it.list_price * it.qty), 0);
      const discount = Math.max(0, rawSub - finalPricePaise);
      setBillDiscountPaise(discount);
      playPosSound('click');
    },
    [cart]
  );

  const holdBill = useCallback(async () => {
    if (cart.length === 0) return;
    try {
      await apiRequest('/bills/hold', {
        method: 'POST',
        body: JSON.stringify({
          shiftId: currentShift?.id,
          items: cart,
        }),
      });
      clearCart();
      refreshHeldBills();
      playPosSound('success');
    } catch (err: any) {
      playPosSound('error');
      alert(`Failed to hold bill: ${err.message}`);
    }
  }, [cart, currentShift, clearCart, refreshHeldBills]);

  const resumeBill = useCallback(
    (held: any) => {
      const restoredItems: CartItem[] = (held.items || []).map((bi: any) => ({
        clientId: `resumed-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        product_id: bi.product_id,
        is_custom: !!bi.is_custom,
        name: bi.name_snapshot,
        sku: bi.sku_snapshot,
        barcode: null,
        unit: bi.unit,
        allows_decimal_qty: bi.unit === 'kg' || bi.unit === 'g' || bi.unit === 'litre' || bi.unit === 'ml',
        qty: bi.qty,
        current_stock: 100,
        list_price: bi.list_price_snapshot,
        sold_price: bi.sold_price,
        line_discount: bi.line_discount,
        gst_rate: bi.gst_rate,
        tax_amount: bi.tax_amount,
        line_total: bi.line_total,
      }));

      setCart(restoredItems);
      setIsHeldBillsModalOpen(false);
      playPosSound('click');
    },
    []
  );

  return (
    <PosContext.Provider
      value={{
        cart,
        addItem,
        addCustomItem,
        updateQty,
        updatePrice,
        removeItem,
        clearCart,
        billDiscountPaise,
        setBillDiscount: setBillDiscountPaise,
        setFinalPrice,
        selectedCustomer,
        setSelectedCustomer,
        currentShift,
        refreshShift,
        heldBillsCount,
        refreshHeldBills,
        holdBill,
        resumeBill,
        subtotal,
        totalDiscount,
        taxTotal,
        roundOff,
        grandTotal,
        totalItemsCount,
        lastAddedClientId,
        isCustomItemModalOpen,
        setIsCustomItemModalOpen,
        isDiscountModalOpen,
        setIsDiscountModalOpen,
        isPaymentModalOpen,
        setIsPaymentModalOpen,
        isHeldBillsModalOpen,
        setIsHeldBillsModalOpen,
        isReceiptModalOpen,
        setIsReceiptModalOpen,
        lastCompletedBill,
        setLastCompletedBill,
      }}
    >
      {children}
    </PosContext.Provider>
  );
};

export const usePos = () => {
  const context = useContext(PosContext);
  if (!context) {
    throw new Error('usePos must be used within a PosProvider');
  }
  return context;
};
