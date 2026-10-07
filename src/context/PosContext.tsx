import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { CartItem, Product, Shift, Bill, Customer } from '@shared/types';
import { useAuth } from './AuthContext';
import { apiRequest } from '../utils/api';
import { playPosSound } from '../utils/formatters';

export interface CartSession {
  id: string; // 'cart-1', 'cart-2', 'cart-3'
  label: string; // 'Cart 1', 'Cart 2', 'Cart 3'
  cart: CartItem[];
  billDiscountPaise: number;
  selectedCustomer: Customer | null;
  includeCarryBag: boolean;
  carryBagChargePaise: number; // default 1000 = ₹10.00
}

interface PosContextType {
  // Multi-cart tabs
  cartSessions: CartSession[];
  activeSessionId: string;
  createCartSession: () => void;
  switchCartSession: (sessionId: string) => void;
  closeCartSession: (sessionId: string) => void;

  // Active cart accessors
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

  // Carry Bag
  includeCarryBag: boolean;
  carryBagChargePaise: number;
  toggleCarryBag: (include?: boolean) => void;
  setCarryBagChargePaise: (paise: number) => void;

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
  const { token, settings } = useAuth();

  // Multi-cart sessions state (supports up to 4 concurrent active carts)
  const [cartSessions, setCartSessions] = useState<CartSession[]>([
    {
      id: 'cart-1',
      label: 'Cart 1',
      cart: [],
      billDiscountPaise: 0,
      selectedCustomer: null,
      includeCarryBag: false,
      carryBagChargePaise: 1000, // ₹10 default
    },
  ]);
  const [activeSessionId, setActiveSessionId] = useState<string>('cart-1');

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

  const activeSession = useMemo(() => {
    return cartSessions.find((s) => s.id === activeSessionId) || cartSessions[0];
  }, [cartSessions, activeSessionId]);

  const cart = activeSession?.cart || [];
  const billDiscountPaise = activeSession?.billDiscountPaise || 0;
  const selectedCustomer = activeSession?.selectedCustomer || null;
  const includeCarryBag = activeSession?.includeCarryBag || false;
  const carryBagChargePaise = activeSession?.carryBagChargePaise || 1000;

  // Multi-Cart Session Operations
  const createCartSession = useCallback(() => {
    setCartSessions((prev) => {
      if (prev.length >= 4) {
        alert('Maximum 4 concurrent carts allowed. Please complete or clear one.');
        return prev;
      }
      const newNum = prev.length + 1;
      const newId = `cart-${Date.now()}`;
      const newSession: CartSession = {
        id: newId,
        label: `Cart ${newNum}`,
        cart: [],
        billDiscountPaise: 0,
        selectedCustomer: null,
        includeCarryBag: false,
        carryBagChargePaise: 1000,
      };
      setActiveSessionId(newId);
      return [...prev, newSession];
    });
    playPosSound('beep');
  }, []);

  const switchCartSession = useCallback((sessionId: string) => {
    setActiveSessionId(sessionId);
    playPosSound('click');
  }, []);

  const closeCartSession = useCallback(
    (sessionId: string) => {
      setCartSessions((prev) => {
        if (prev.length <= 1) {
          // Reset single cart to empty
          return [
            {
              id: 'cart-1',
              label: 'Cart 1',
              cart: [],
              billDiscountPaise: 0,
              selectedCustomer: null,
              includeCarryBag: false,
              carryBagChargePaise: 1000,
            },
          ];
        }
        const filtered = prev.filter((s) => s.id !== sessionId);
        if (activeSessionId === sessionId) {
          setActiveSessionId(filtered[0].id);
        }
        return filtered;
      });
      playPosSound('click');
    },
    [activeSessionId]
  );

  const updateActiveSession = useCallback(
    (updater: (prevSession: CartSession) => Partial<CartSession>) => {
      setCartSessions((prev) =>
        prev.map((s) => {
          if (s.id === (activeSession?.id || activeSessionId)) {
            const updates = updater(s);
            return { ...s, ...updates };
          }
          return s;
        })
      );
    },
    [activeSession, activeSessionId]
  );

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

  // Add standard product to active cart
  const addItem = useCallback(
    (product: any, qtyToAdd: number = 1) => {
      updateActiveSession((sess) => {
        const currentCart = sess.cart;
        const existingIndex = currentCart.findIndex((item) => !item.is_custom && item.product_id === product.id);
        const listPrice = product.selling_price;
        const allowsDecimal = !!product.allows_decimal_qty;

        if (existingIndex > -1) {
          const updated = [...currentCart];
          const current = updated[existingIndex];
          const newQty = Number((current.qty + qtyToAdd).toFixed(allowsDecimal ? 3 : 0));
          const lineTotal = Math.round(current.sold_price * newQty);

          updated[existingIndex] = {
            ...current,
            qty: newQty,
            line_total: lineTotal,
          };
          setLastAddedClientId(current.clientId);
          return { cart: updated };
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
        return { cart: [newItem, ...currentCart] };
      });

      playPosSound('beep');
    },
    [updateActiveSession]
  );

  // Add unlisted custom item to active cart
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

      updateActiveSession((sess) => ({ cart: [newItem, ...sess.cart] }));
      setLastAddedClientId(newClientId);
      playPosSound('beep');
    },
    [settings, updateActiveSession]
  );

  const updateQty = useCallback(
    (clientId: string, newQty: number) => {
      if (newQty <= 0) {
        removeItem(clientId);
        return;
      }
      updateActiveSession((sess) => ({
        cart: sess.cart.map((item) => {
          if (item.clientId === clientId) {
            const lineTotal = Math.round(item.sold_price * newQty);
            return {
              ...item,
              qty: newQty,
              line_total: lineTotal,
            };
          }
          return item;
        }),
      }));
      playPosSound('click');
    },
    [updateActiveSession]
  );

  const updatePrice = useCallback(
    (clientId: string, newSoldPricePaise: number, reason?: string, approvedBy?: string) => {
      updateActiveSession((sess) => ({
        cart: sess.cart.map((item) => {
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
        }),
      }));
      playPosSound('click');
    },
    [updateActiveSession]
  );

  const removeItem = useCallback(
    (clientId: string) => {
      updateActiveSession((sess) => ({
        cart: sess.cart.filter((item) => item.clientId !== clientId),
      }));
      playPosSound('click');
    },
    [updateActiveSession]
  );

  const clearCart = useCallback(() => {
    updateActiveSession(() => ({
      cart: [],
      billDiscountPaise: 0,
      selectedCustomer: null,
      includeCarryBag: false,
    }));
    setLastAddedClientId(null);
  }, [updateActiveSession]);

  const setBillDiscount = useCallback(
    (discountPaise: number) => {
      updateActiveSession(() => ({ billDiscountPaise: discountPaise }));
    },
    [updateActiveSession]
  );

  const setSelectedCustomer = useCallback(
    (cust: Customer | null) => {
      updateActiveSession(() => ({ selectedCustomer: cust }));
    },
    [updateActiveSession]
  );

  const toggleCarryBag = useCallback(
    (include?: boolean) => {
      updateActiveSession((sess) => ({
        includeCarryBag: include !== undefined ? include : !sess.includeCarryBag,
      }));
      playPosSound('click');
    },
    [updateActiveSession]
  );

  const setCarryBagChargePaise = useCallback(
    (paise: number) => {
      updateActiveSession(() => ({ carryBagChargePaise: Math.max(0, paise) }));
    },
    [updateActiveSession]
  );

  // Set final rounded/negotiated price helper
  const setFinalPrice = useCallback(
    async (finalPricePaise: number) => {
      const currentCart = activeSession?.cart || [];
      const bagCost = activeSession?.includeCarryBag ? activeSession.carryBagChargePaise : 0;
      const rawSub = currentCart.reduce((acc, it) => acc + Math.round(it.list_price * it.qty), 0) + bagCost;
      const discount = Math.max(0, rawSub - finalPricePaise);

      updateActiveSession(() => ({ billDiscountPaise: discount }));
      playPosSound('click');
    },
    [activeSession, updateActiveSession]
  );

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

    const bagCharge = includeCarryBag ? carryBagChargePaise : 0;
    const totalDisc = itemsLineDiscount + billDiscountPaise;
    const discountedSubtotal = Math.max(0, rawSubtotal + bagCharge - totalDisc);

    let tax = 0;
    if (settings?.gst_enabled) {
      for (const item of cart) {
        if (item.gst_rate > 0) {
          tax += Math.round(item.line_total * (item.gst_rate / 100));
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
      subtotal: rawSubtotal + bagCharge,
      totalDiscount: totalDisc,
      taxTotal: tax,
      roundOff: round,
      grandTotal: finalGrand,
      totalItemsCount: itemsCount + (includeCarryBag ? 1 : 0),
    };
  }, [cart, billDiscountPaise, includeCarryBag, carryBagChargePaise, settings]);

  // Hold Bill: switches to new cart or saves to database
  const holdBill = useCallback(async () => {
    if (cart.length === 0) return;

    // If cashier wants to quickly serve next customer with multi-carts:
    // Create new cart session directly if < 4, otherwise save to held bills API
    if (cartSessions.length < 4) {
      createCartSession();
      return;
    }

    try {
      await apiRequest('/bills/hold', {
        method: 'POST',
        body: JSON.stringify({
          customerId: selectedCustomer?.id || null,
          items: cart.map((it) => ({
            productId: it.product_id,
            name: it.name,
            qty: it.qty,
            unit: it.unit,
            listPrice: it.list_price,
            soldPrice: it.sold_price,
            isCustom: it.is_custom,
          })),
          discountTotal: billDiscountPaise,
        }),
      });
      clearCart();
      await refreshHeldBills();
      playPosSound('beep');
    } catch (err: any) {
      alert(`Failed to hold bill: ${err.message}`);
    }
  }, [cart, selectedCustomer, billDiscountPaise, cartSessions.length, createCartSession, clearCart, refreshHeldBills]);

  const resumeBill = useCallback(
    (heldBill: any) => {
      const items: CartItem[] = (heldBill.items || []).map((it: any) => ({
        clientId: `resumed-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        product_id: it.product_id,
        is_custom: !!it.is_custom,
        name: it.name,
        sku: null,
        barcode: null,
        unit: it.unit || 'piece',
        allows_decimal_qty: it.unit === 'kg' || it.unit === 'g' || it.unit === 'litre' || it.unit === 'ml',
        qty: it.qty,
        current_stock: 100,
        list_price: it.list_price || it.sold_price,
        sold_price: it.sold_price,
        line_discount: 0,
        gst_rate: 0,
        tax_amount: 0,
        line_total: Math.round(it.sold_price * it.qty),
      }));

      updateActiveSession(() => ({
        cart: items,
        billDiscountPaise: heldBill.discount_total || 0,
      }));

      setIsHeldBillsModalOpen(false);
      playPosSound('success');
    },
    [updateActiveSession]
  );

  return (
    <PosContext.Provider
      value={{
        cartSessions,
        activeSessionId,
        createCartSession,
        switchCartSession,
        closeCartSession,
        cart,
        addItem,
        addCustomItem,
        updateQty,
        updatePrice,
        removeItem,
        clearCart,
        billDiscountPaise,
        setBillDiscount,
        setFinalPrice,
        includeCarryBag,
        carryBagChargePaise,
        toggleCarryBag,
        setCarryBagChargePaise,
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
