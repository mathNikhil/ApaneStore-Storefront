import React, { useState, useEffect, useRef, useCallback } from 'react';
import { QRCodeSVG } from 'qrcode.react';

// ✅ New brand color system (see design discussion): brand.colors.font
// replaced by fontHeader (used on heading tags h1-h4) and fontBody (used
// everywhere else — labels, values, body text). brand.colors.secondary
// used to double as muted text color; that job moved entirely to fontBody.
// Secondary is now purely a UI-state color (e.g. the free-delivery
// progress bar's track, quantity-stepper borders).
const PreviewCartTab = ({ data, updateQuantity, updateSlots, updateItemPrice, updateItemStaff, removeFromCart, placeOrder, onGoToProfile, isAuthenticated, onRequireAuth, storeType = 'product', booking = {}, tabName = '' }) => {
  const isService = storeType === 'service';
  // Service stores always default to 'delivery' — the toggle lets the customer
  // switch to in-store (dine_in). Product stores use enableDineIn from cart config.
  const serviceDefaultOrderType = isService ? 'delivery' : undefined;
  const { cart, brand, payment, profile } = data;
  const [showCheckout, setShowCheckout] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState(payment?.defaultPayment || 'cod');
  const [orderPlaced, setOrderPlaced] = useState(false);
  const [placingOrder, setPlacingOrder] = useState(false);
  const [selectedAddressId, setSelectedAddressId] = useState(null);
  const [showAddressSelector, setShowAddressSelector] = useState(false);
  // ✅ Only relevant for the COD+UPI tier (no real gateway yet) — customer
  // enters their own UPI ID and confirms it before the QR/pay link reveals,
  // so an operator has something concrete to cross-check against their own
  // bank/UPI app before confirming the order.
  const [customerUpiId, setCustomerUpiId] = useState('');
  const [upiIdConfirmed, setUpiIdConfirmed] = useState(false);
  const [cashfreeLoading, setCashfreeLoading] = useState(false);

  // Walk-in customer details — shown only for scan orders
  const isScanOrder = cart.items?.some(item => item.isScanOrder);
  const [walkInName, setWalkInName] = useState('');
  const [walkInMobile, setWalkInMobile] = useState('');
  const [dineInName, setDineInName] = useState('');
  const [dineInMobile, setDineInMobile] = useState('');

  const { items, freeDelivery, freeDeliveryThreshold, deliveryCharge, showProgressBar, enableGST, gstRate, taxLabel, showGSTBreakdownCart, showGSTBreakdownCheckout, gstNumber, enableDineIn, dineInLabel } = cart;
  const [orderType, setOrderType] = useState(serviceDefaultOrderType || (cart?.enableDineIn ? 'dine_in' : 'delivery')); // 'dine_in' or 'delivery'
  const [selectedLocation, setSelectedLocation] = useState(null); // for dine-in location selection
  const [deliveryZoneInfo, setDeliveryZoneInfo] = useState(null); // { allowed, storeAddressId, storeAddressName, deliveryZone, deliveryCost }
  const [pincodeChecked, setPincodeChecked] = useState(false);

  const subtotal = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);

  // ── Coupon / Promo state ──────────────────────────────────────────────────
  const storeId = data?.profile?.storeId || data?.storeId;
  const API = data?.apiBase || '';
  const [couponCode, setCouponCode] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState(null);   // manually entered coupon
  const [appliedPromos, setAppliedPromos] = useState([]);      // auto-applied promos
  const [couponError, setCouponError] = useState('');
  const [couponLoading, setCouponLoading] = useState(false);
  const [availableCoupons, setAvailableCoupons] = useState([]); // only type=coupon
  const [showCouponDropdown, setShowCouponDropdown] = useState(false);
  const couponRef = useRef(null);

  const fetchAvailableCoupons = useCallback(async () => {
    if (!storeId || !items?.length) return;
    try {
      const productIds = [...new Set(items.map(i => i.productId || i.product_id).filter(Boolean))];
      const categoryIds = [...new Set(items.map(i => i.categoryId || i.category_id).filter(Boolean))];
      const res = await fetch(
        `${API}/api/store/${storeId}/coupons/available?order_value=${subtotal}&product_ids=${productIds.join(',')}&category_ids=${categoryIds.join(',')}`,
        { headers: { 'Content-Type': 'application/json' } }
      );
      if (res.ok) {
        const d = await res.json();
        const now = Date.now();
        const filtered = (d.coupons || []).filter(c => {
          if (c.end_at && new Date(c.end_at).getTime() < now) return false;
          if (!c.applicable_to || c.applicable_to === 'both') return true;
          return c.applicable_to === orderType;
        });

        // Split: promos auto-apply, coupons go in the dropdown
        const promos = filtered.filter(c => c.type === 'promo' && subtotal >= (c.min_order_value || 0));
        const coupons = filtered.filter(c => c.type === 'coupon');
        setAvailableCoupons(coupons);

        // Auto-apply all eligible promos (validate each to get discount amount)
        if (promos.length > 0) {
          const validated = await Promise.all(promos.map(async (p) => {
            try {
              const vr = await fetch(`${API}/api/store/${storeId}/coupons/validate`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ code: p.code, order_value: subtotal, product_ids: productIds, category_ids: categoryIds }),
              });
              const vd = await vr.json();
              if (vd.valid) return { code: p.code, name: p.name, discount: vd.discount, unit: p.unit };
            } catch { /* silent */ }
            return null;
          }));
          setAppliedPromos(validated.filter(Boolean));
        } else {
          setAppliedPromos([]);
        }
      }
    } catch (e) { /* silent */ }
  }, [storeId, items, subtotal, API, orderType]);

  useEffect(() => {
    fetchAvailableCoupons();
    const intervalId = setInterval(fetchAvailableCoupons, 3 * 60 * 1000);
    return () => clearInterval(intervalId);
  }, [fetchAvailableCoupons]);

  useEffect(() => {
    const handler = (e) => { if (couponRef.current && !couponRef.current.contains(e.target)) setShowCouponDropdown(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const applyCouponCode = async (code) => {
    const c = (code || couponCode).trim().toUpperCase();
    if (!c) return;
    setCouponLoading(true);
    setCouponError('');
    try {
      const productIds = [...new Set(items.map(i => i.productId || i.product_id).filter(Boolean))];
      const categoryIds = [...new Set(items.map(i => i.categoryId || i.category_id).filter(Boolean))];
      const res = await fetch(`${API}/api/store/${storeId}/coupons/validate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: c, order_value: subtotal, product_ids: productIds, category_ids: categoryIds }),
      });
      const d = await res.json();
      if (d.valid) {
        if (d.coupon?.type === 'promo') {
          setCouponError('This is a promotional offer — it is applied automatically. No code needed!');
        } else {
          setAppliedCoupon({ code: c, discount: d.discount, name: d.coupon?.name || c, unit: d.coupon?.unit || 'flat' });
          setCouponCode('');
          setShowCouponDropdown(false);
        }
      } else {
        setCouponError(d.error || d.message || 'Invalid or expired coupon');
      }
    } catch (e) {
      setCouponError('Could not apply coupon. Please try again.');
    } finally {
      setCouponLoading(false);
    }
  };

  const removeCoupon = () => { setAppliedCoupon(null); setCouponError(''); };
  const promoDiscount = appliedPromos.reduce((sum, p) => sum + (p.discount || 0), 0);
  const couponDiscount = (appliedCoupon?.discount || 0) + promoDiscount;
  // ── End Coupon / Promo state ───────────────────────────────────────────────

  // Detect if any item has per-product GST
  const hasPerProductGST = items.some(item => item.gstRate != null && item.gstRate > 0);
  // Per-product GST breakdown grouped by rate
  const gstByRate = (() => {
    if (!enableGST || !hasPerProductGST) return {};
    return items.reduce((acc, item) => {
      if (item.gstRate == null) return acc;
      const itemTotal = (parseFloat(item.price) || 0) * (item.quantity || 1);
      const rate = item.gstRate;
      acc[rate] = (acc[rate] || 0) + itemTotal * (rate / 100);
      return acc;
    }, {});
  })();
  // Global GST (only when no per-product GST)
  const gst = (() => {
    if (!enableGST) return 0;
    if (hasPerProductGST) return Object.values(gstByRate).reduce((a, b) => a + b, 0);
    return subtotal * (gstRate / 100);
  })();
  const delivery = (orderType === 'dine_in') ? 0 : (freeDelivery
    ? (subtotal >= freeDeliveryThreshold ? 0 : (deliveryZoneInfo?.deliveryCost ?? deliveryCharge))
    : (deliveryZoneInfo?.deliveryCost ?? deliveryCharge));
  const total = Math.max(0, subtotal + gst + delivery - couponDiscount);
  const remainingForFree = freeDeliveryThreshold - subtotal;

  // Same address book the customer manages on the Profile tab (Step 5 config)
  const addresses = profile?.addresses || [];
  const currentAddress =
    addresses.find(a => a.id === selectedAddressId) ||
    addresses.find(a => a.isDefault) ||
    addresses[0] ||
    null;

  // Payment methods enabled in Step 4
  const getPaymentMethods = () => {
    const methods = [];
    if (payment?.codEnabled) methods.push({ id: 'cod', label: 'Cash on Delivery', icon: 'payments' });
    if (payment?.upiEnabled) methods.push({ id: 'upi', label: 'UPI / GPay / PhonePe', icon: 'qr_code_2' });
    if (payment?.cashfreeEnabled) methods.push({ id: 'cashfree', label: 'Pay Online (Card/UPI/NetBanking)', icon: 'credit_card' });
    if (payment?.cardEnabled) methods.push({ id: 'card', label: 'Credit/Debit Card', icon: 'credit_card' });
    if (payment?.netBankingEnabled) methods.push({ id: 'netbanking', label: 'Net Banking', icon: 'account_balance' });
    return methods;
  };

  const paymentMethods = getPaymentMethods();
  const partialPaymentEnabled = payment?.partialPaymentEnabled && payment?.upiId;
  const partialPaymentPercent = payment?.partialPaymentPercent || 10;
  const advanceAmount = partialPaymentEnabled ? parseFloat((total * partialPaymentPercent / 100).toFixed(2)) : 0;
  const balanceAmount = partialPaymentEnabled ? parseFloat((total - advanceAmount).toFixed(2)) : 0;
  const deliveryZones = data?.cart?.deliveryZones || data?.deliveryZones || [];
  const dineInLocations = data?.cart?.dineInLocations || data?.dineInLocations || [];
  const storeLocations = data?.profile?.storeLocations || [];
  const mainStore = { id: 'main', name: 'Main Store', address: data?.profile?.storeAddress || '' };
  const allLocations = [mainStore, ...storeLocations.filter(l => isService ? l.name : (l.name && l.address))];
  const hasMultipleLocations = allLocations.length > 1;

  // Get dine-in enabled locations
  const dineInEnabledLocations = allLocations.filter(loc => {
    if (!dineInLocations.length) return true; // default all enabled
    const found = dineInLocations.find(l => l.id === loc.id);
    return found ? found.dineInEnabled !== false : true;
  });

  // Resolve delivery zone by pincode
  const resolveDeliveryZone = (pincode, customerAddress) => {
    if (!pincode || deliveryZones.length === 0) {
      return { allowed: true, storeAddressId: null, storeAddressName: null, deliveryZone: null, deliveryCost: deliveryCharge || 0, flatRate: true };
    }
    const addrLower = (customerAddress || '').toLowerCase();
    for (const address of deliveryZones) {
      for (const zone of (address.zones || [])) {
        if (!zone.pincode || !zone.pincode.trim()) continue; // skip empty zones
        if (!pincode.startsWith(zone.pincode)) continue;
        const areaName = (zone.area || '').trim();
        if (areaName && addrLower && !addrLower.includes(areaName.toLowerCase())) continue; // area mismatch
        return { allowed: true, storeAddressId: address.storeAddressId, storeAddressName: address.storeAddressName, deliveryZone: zone.area, deliveryCost: zone.deliveryCost || 0, flatRate: false };
      }
    }
    return { allowed: false, storeAddressId: null, storeAddressName: null, deliveryZone: null, deliveryCost: null, flatRate: false };
  };

  // Check pincode when address selected
  React.useEffect(() => {
    if (orderType === 'delivery' && currentAddress?.pincode) {
      const fullAddr = [currentAddress.addressLine1, currentAddress.addressLine2, currentAddress.city, currentAddress.state].filter(Boolean).join(' ');
      const zone = resolveDeliveryZone(currentAddress.pincode, fullAddr);
      setDeliveryZoneInfo(zone);
      setPincodeChecked(true);
    } else {
      setDeliveryZoneInfo(null);
      setPincodeChecked(false);
    }
  }, [currentAddress, orderType, deliveryZones]);

  const handleApplyCoupon = async () => {
    if (!couponCode.trim()) return;
    setCouponLoading(true);
    setCouponError('');
    try {
      const storeId = window.location.hostname.split('.')[0];
      const token = localStorage.getItem('customer_token');
      const res = await fetch(`https://api.aapnaestore.com/api/store/${storeId}/coupons/validate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ code: couponCode.trim().toUpperCase(), order_value: parseFloat(subtotal) || 0 }),
      });
      const data = await res.json();
      if (data.success && data.data) {
        const c = data.data;
        let discountAmount = 0;
        if (c.unit === 'percentage' || c.unit === 'percent') {
          discountAmount = subtotal * (parseFloat(c.value) / 100);
        } else {
          discountAmount = parseFloat(c.value) || 0;
        }
        discountAmount = Math.min(discountAmount, subtotal);
        setCouponApplied({ code: couponCode.trim().toUpperCase(), discountAmount: parseFloat(discountAmount.toFixed(2)), couponName: c.name });
        setCouponError('');
      } else {
        setCouponError(data.error || data.message || 'Invalid or expired coupon');
        setCouponApplied(null);
      }
    } catch (e) {
      setCouponError('Could not validate coupon. Please try again.');
    } finally {
      setCouponLoading(false);
    }
  };

  const handleRemoveCoupon = () => {
    setCouponApplied(null);
    setCouponCode('');
    setCouponError('');
  };

  const handleCheckout = () => {
    if (items.length === 0) {
      alert('Your cart is empty');
      return;
    }
    if (!isAuthenticated) {
      onRequireAuth?.();
      return;
    }
    if (orderType === 'dine_in' && hasMultipleLocations && !selectedLocation) {
      alert(isService ? 'Please select a branch for your in-store visit' : 'Please select a location for dine-in');
      return;
    }
    if (orderType !== 'dine_in' && !currentAddress) {
      alert('Please add a delivery address from the Profile tab before checking out');
      return;
    }
    if (orderType !== 'dine_in' && currentAddress?.pincode && deliveryZones.length > 0 && deliveryZoneInfo && !deliveryZoneInfo.allowed) {
      alert('Sorry, we don\'t deliver to your area. Please check our delivery zones.');
      return;
    }
    setShowCheckout(true);
  };

  const handleCashfreePayment = async (orderId, amount, customerPhone, orderData = {}) => {
    setCashfreeLoading(true);
    try {
      const storeId = window.location.hostname.split('.')[0];
      const API = 'https://api.aapnaestore.com';
      
      // Create Cashfree order
      const res = await fetch(`${API}/api/store/${storeId}/cashfree/create-order`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId,
          amount,
          customerPhone: orderData?.customerPhone || customerPhone || '9999999999',
          customerName: orderData?.customerName || 'Customer',
          customerEmail: 'customer@store.com',
          orderData,
        })
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || 'Failed to create payment');

      // Load Cashfree SDK
      const cashfree = await new Promise((resolve, reject) => {
        const cfMode = data.data?.mode === 'production' ? 'production' : 'sandbox';
        if (window.Cashfree) { resolve(window.Cashfree({ mode: cfMode })); return; }
        const script = document.createElement('script');
        script.src = 'https://sdk.cashfree.com/js/v3/cashfree.js';
        script.onload = () => resolve(window.Cashfree({ mode: cfMode }));
        script.onerror = reject;
        document.head.appendChild(script);
      });

      // Open Cashfree modal
      const result = await cashfree.checkout({
        paymentSessionId: data.data.paymentSessionId,
        redirectTarget: '_modal',
      });

      if (result.error) throw new Error(result.error.message);
      return { success: true };
    } catch (e) {
      return { success: false, error: e.message };
    } finally {
      setCashfreeLoading(false);
    }
  };

  const handlePlaceOrder = async () => {
    if (orderType !== 'dine_in' && !currentAddress) {
      alert('Please select a delivery address');
      return;
    }
    if (paymentMethods.length > 0 && !selectedPayment) {
      alert('Please select a payment method');
      return;
    }
    if (selectedPayment === 'upi' && !upiIdConfirmed) {
      alert('Please enter your UPI ID and tap "Pay" first');
      return;
    }

    const methodLabel = paymentMethods.find(m => m.id === selectedPayment)?.label || selectedPayment;

    // Handle Cashfree payment first
    if (selectedPayment === 'cashfree') {
      const orderId = 'ORD_' + Date.now();
      const cfOrderData = {
        customerId: null, // customer ID not available at this scope
        customerName: currentAddress?.recipientName,
        customerPhone: currentAddress?.recipientMobile,
        items: cart,
        deliveryAddress: orderType === 'dine_in' ? {} : currentAddress,
        subtotal: subtotal,
        deliveryCharge: orderType === 'dine_in' ? 0 : (deliveryZoneInfo?.deliveryCost ?? deliveryCharge),
        taxAmount: gst,
        totalAmount: total,
        orderType: orderType,
      };
      const cfResult = await handleCashfreePayment(orderId, total, currentAddress?.recipientMobile, cfOrderData);
      if (!cfResult.success) {
        alert(cfResult.error || 'Payment failed. Please try again.');
        return;
      }
    }

    setPlacingOrder(true);
    // Determine branch info
    let branchId = null;
    let branchName = null;
    let deliveryZoneName = null;
    let finalDeliveryCost = orderType === 'dine_in' ? 0 : (deliveryZoneInfo?.deliveryCost ?? deliveryCharge);

    if (orderType === 'dine_in' && selectedLocation) {
      branchId = selectedLocation.id;
      branchName = selectedLocation.name;
    } else if (orderType === 'delivery' && deliveryZoneInfo) {
      branchId = deliveryZoneInfo.storeAddressId;
      branchName = deliveryZoneInfo.storeAddressName;
      deliveryZoneName = deliveryZoneInfo.deliveryZone;
    }

    // Validate walk-in customer name if this is a scan order
    if (isScanOrder && !walkInName.trim()) {
      alert('Please enter the customer name');
      setPlacingOrder(false);
      return;
    }

    // Validate dine-in customer name
    if (orderType === 'dine_in' && !dineInName.trim()) {
      alert('Please enter the customer name for dine-in order');
      setPlacingOrder(false);
      return;
    }

    const isPartialCOD = selectedPayment === 'cod' && partialPaymentEnabled && upiIdConfirmed;
    const result = await placeOrder({
      address: orderType === 'dine_in' ? {} : currentAddress,
      paymentMethodId: selectedPayment,
      paymentMethodLabel: isPartialCOD ? `COD + ${partialPaymentPercent}% Advance UPI` : methodLabel,
      partialPayment: isPartialCOD ? { advanceAmount, balanceAmount, percent: partialPaymentPercent, customerUpiId } : null,
      orderNote: isPartialCOD ? `Advance ₹${advanceAmount.toFixed(2)} paid via UPI (${customerUpiId}). Balance ₹${balanceAmount.toFixed(2)} on delivery. Pending verification.` : undefined,
      customerUpiId: selectedPayment === 'upi' ? customerUpiId.trim() : undefined,
      orderType: orderType,
      branchId,
      branchName,
      deliveryZone: deliveryZoneName,
      deliveryCost: finalDeliveryCost,
      couponCode: appliedCoupon?.code || null,
      promoCodes: appliedPromos.map(p => p.code),
      discountAmount: couponDiscount,
      // Walk-in customer (scan orders only)
      ...(isScanOrder ? {
        isScanOrder: true,
        walkInCustomerName: walkInName.trim(),
        walkInCustomerMobile: walkInMobile.trim() || undefined,
      } : {}),
      // Dine-in customer name/phone
      ...(orderType === 'dine_in' ? {
        dineInCustomerName: dineInName.trim(),
        dineInCustomerMobile: dineInMobile.trim() || undefined,
      } : {}),
    });
    setPlacingOrder(false);

    if (result.success) {
      setOrderPlaced(true);
      setTimeout(() => {
        setShowCheckout(false);
        setOrderPlaced(false);
      }, 1200);
    } else if (result.coupon_error) {
      // Coupon became invalid between validate and checkout (expired or ran out of uses)
      setAppliedCoupon(null);
      setCouponError(result.error || 'This offer is no longer valid. Please try again without it.');
      setShowCheckout(false); // return to cart so customer can see the error
    } else {
      alert(result.error || 'Failed to place your order. Please try again.');
    }
  };

  if (orderPlaced) {
    return (
      <div className="p-4 max-w-3xl mx-auto text-center py-12">
        <span className="material-symbols-outlined text-6xl text-[#006d2f] block mb-4">check_circle</span>
        <h2 className="text-2xl font-bold" style={{ color: brand.colors.fontHeader, fontFamily: brand.fonts?.body || 'Inter' }}>Order Placed! 🎉</h2>
        <p style={{ color: brand.colors.fontBody, fontFamily: brand.fonts?.body || 'Inter' }}>Your order has been placed successfully.</p>
      </div>
    );
  }

  if (showCheckout) {
    return (
      <div className="p-4 max-w-3xl mx-auto">
        <button onClick={() => setShowCheckout(false)} className="flex items-center gap-1 text-[#556067] mb-4 hover:text-[#191c1e] transition-colors">
          <span className="material-symbols-outlined">arrow_back</span> Back to Cart
        </button>

        <h2 className="text-xl font-bold mb-4" style={{ color: brand.colors.fontHeader, fontFamily: brand.fonts?.body || 'Inter' }}>Payment</h2>

        {/* Order Summary */}
        <div className="rounded-lg border p-4 mb-4" style={{ backgroundColor: brand.colors.background || '#FFFFFF' }}>
          <h3 className="font-semibold text-sm mb-3" style={{ color: brand.colors.fontHeader, fontFamily: brand.fonts?.body || 'Inter' }}>Order Summary</h3>
          <div className="space-y-2">
            {items.map((item) => (
              <div key={item.id} className="flex justify-between text-sm">
                <span style={{ color: brand.colors.fontBody, fontFamily: brand.fonts?.body || 'Inter' }}>{item.productName} x{item.quantity}</span>
                <span style={{ color: brand.colors.fontBody, fontFamily: brand.fonts?.body || 'Inter' }}>₹{(item.price * item.quantity).toFixed(2)}</span>
              </div>
            ))}
            <div className="border-t pt-2 mt-2">
              {showGSTBreakdownCheckout ? (
                <>
                  <div className="flex justify-between text-sm">
                    <span style={{ color: brand.colors.fontBody, fontFamily: brand.fonts?.body || 'Inter' }}>Subtotal</span>
                    <span style={{ color: brand.colors.fontBody, fontFamily: brand.fonts?.body || 'Inter' }}>₹{subtotal.toFixed(2)}</span>
                  </div>
                  {enableGST && (
                    <div className="flex justify-between text-sm">
                      <span style={{ color: brand.colors.fontBody, fontFamily: brand.fonts?.body || 'Inter' }}>{taxLabel} ({gstRate}%)</span>
                      <span style={{ color: brand.colors.fontBody, fontFamily: brand.fonts?.body || 'Inter' }}>₹{gst.toFixed(2)}</span>
                    </div>
                  )}
                  {orderType !== 'dine_in' && <div className="flex justify-between text-sm">
                    <span style={{ color: brand.colors.fontBody, fontFamily: brand.fonts?.body || 'Inter' }}>Delivery</span>
                    <span style={{ color: brand.colors.fontBody, fontFamily: brand.fonts?.body || 'Inter' }}>{delivery === 0 ? 'FREE' : `₹${delivery.toFixed(2)}`}</span>
                  </div>}
                </>
              ) : null}
              {appliedPromos.map(p => (
                <div key={p.code} className="flex justify-between text-sm" style={{ color: brand.colors.primary }}>
                  <span style={{ fontFamily: brand.fonts?.body || 'Inter' }}>🎉 {p.name || p.code}</span>
                  <span style={{ fontWeight: '700' }}>− ₹{p.discount.toFixed(2)}</span>
                </div>
              ))}
              {appliedCoupon && (
                <div className="flex justify-between text-sm" style={{ color: brand.colors.primary }}>
                  <span style={{ fontFamily: brand.fonts?.body || 'Inter' }}>🏷️ Coupon ({appliedCoupon.code})</span>
                  <span style={{ fontWeight: '700' }}>− ₹{appliedCoupon.discount.toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between font-bold mt-2 pt-2 border-t">
                <span style={{ color: brand.colors.fontBody, fontFamily: brand.fonts?.body || 'Inter' }}>Total</span>
                <span style={{ color: brand.colors.primary }}>₹{total.toFixed(2)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Walk-in Customer Details — only for QR scan orders */}
        {isScanOrder && (
          <div className="rounded-lg border-2 p-4 mb-4" style={{ backgroundColor: brand.colors.background || '#FFFFFF', borderColor: brand.colors.primary }}>
            <div className="flex items-center gap-2 mb-3">
              <span style={{ fontSize: 18 }}>🛍️</span>
              <h3 className="font-semibold text-sm" style={{ color: brand.colors.fontHeader, fontFamily: brand.fonts?.body || 'Inter' }}>Walk-in Customer Details</h3>
            </div>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold mb-1" style={{ color: brand.colors.fontBody, fontFamily: brand.fonts?.body || 'Inter' }}>
                  Customer Name <span style={{ color: '#ba1a1a' }}>*</span>
                </label>
                <input
                  type="text"
                  value={walkInName}
                  onChange={e => setWalkInName(e.target.value)}
                  placeholder="Enter customer name"
                  className="w-full border rounded-lg px-3 py-2 text-sm outline-none"
                  style={{
                    borderColor: walkInName.trim() ? brand.colors.primary : '#d1d5db',
                    color: brand.colors.fontBody,
                    fontFamily: brand.fonts?.body || 'Inter',
                  }}
                />
              </div>
              <div>
                <label className="block text-xs font-semibold mb-1" style={{ color: brand.colors.fontBody, fontFamily: brand.fonts?.body || 'Inter' }}>
                  Mobile Number <span style={{ color: '#888', fontWeight: 400 }}>(optional)</span>
                </label>
                <input
                  type="tel"
                  value={walkInMobile}
                  onChange={e => setWalkInMobile(e.target.value.replace(/\D/g, '').slice(0, 10))}
                  placeholder="10-digit mobile"
                  className="w-full border rounded-lg px-3 py-2 text-sm outline-none"
                  style={{
                    borderColor: '#d1d5db',
                    color: brand.colors.fontBody,
                    fontFamily: brand.fonts?.body || 'Inter',
                  }}
                />
              </div>
            </div>
          </div>
        )}

        {/* Delivery Address — hidden for dine_in / inshop service */}
        {orderType !== 'dine_in' && !isScanOrder && <div className="rounded-lg border p-4 mb-4" style={{ backgroundColor: brand.colors.background || '#FFFFFF' }}>
          <h3 className="font-semibold text-sm mb-2" style={{ color: brand.colors.fontHeader, fontFamily: brand.fonts?.body || 'Inter' }}>Deliver To</h3>
          {currentAddress ? (
            <p className="text-sm" style={{ color: brand.colors.fontBody, fontFamily: brand.fonts?.body || 'Inter' }}>
              <span className="font-medium" style={{ color: brand.colors.fontBody, fontFamily: brand.fonts?.body || 'Inter' }}>{currentAddress.recipientName}</span><br />
              {currentAddress.addressLine1}{currentAddress.addressLine2 && `, ${currentAddress.addressLine2}`}<br />
              {currentAddress.city}, {currentAddress.state} - {currentAddress.pincode}<br />
              <span className="text-xs">{currentAddress.recipientMobile}</span>
            </p>
          ) : (
            <p className="text-sm text-[#ba1a1a]">No address selected</p>
          )}

          {/* Delivery zone validation */}
          {currentAddress?.pincode && pincodeChecked && deliveryZones.length > 0 && (
            <div className={`mt-2 px-3 py-2 rounded-lg text-xs font-semibold ${deliveryZoneInfo?.allowed ? 'bg-[#e8f5e9] text-[#006d2f]' : 'bg-[#ffdad6] text-[#ba1a1a]'}`}>
              {deliveryZoneInfo?.allowed
                ? `✅ Delivering from: ${deliveryZoneInfo.storeAddressName || 'Main Store'}${deliveryZoneInfo.deliveryZone ? ' · ' + deliveryZoneInfo.deliveryZone : ''} · ₹${deliveryZoneInfo.deliveryCost} delivery`
                : `❌ Sorry, we don't deliver to pincode ${currentAddress.pincode}. We deliver to select areas only.`
              }
            </div>
          )}
        </div>}

        {/* Payment Methods - From Step 4 */}
        <div className="rounded-lg border p-4 mb-4" style={{ backgroundColor: brand.colors.background || '#FFFFFF' }}>
          <h3 className="font-semibold text-sm mb-3" style={{ color: brand.colors.fontHeader, fontFamily: brand.fonts?.body || 'Inter' }}>Select Payment Method</h3>
          {paymentMethods.length === 0 ? (
            <p className="text-sm text-[#556067]">No payment methods enabled. Please enable at least one in Step 4 (Payment Configuration).</p>
          ) : (
            <div className="space-y-2">
              {paymentMethods.map((method) => (
                <label key={method.id} className="flex items-center gap-3 p-3 border rounded-lg cursor-pointer hover:bg-[#f2f4f7] transition-colors">
                  <input
                    type="radio"
                    name="paymentMethod"
                    value={method.id}
                    checked={selectedPayment === method.id}
                    onChange={() => { setSelectedPayment(method.id); setUpiIdConfirmed(false); }}
                    className="w-4 h-4 text-[#006d2f]"
                  />
                  <span className="material-symbols-outlined text-[#556067]">{method.icon}</span>
                  <span className="text-sm" style={{ color: brand.colors.fontBody, fontFamily: brand.fonts?.body || 'Inter' }}>{method.label}</span>
                </label>
              ))}
            </div>
          )}
          {selectedPayment === 'cod' && partialPaymentEnabled && payment?.upiId && (
            <div className="mt-3 p-3 bg-amber-50 border border-amber-200 rounded-lg flex flex-col items-center gap-2">
              <p className="text-sm font-semibold w-full" style={{ color: brand.colors.fontHeader, fontFamily: brand.fonts?.body || 'Inter' }}>
                Pay Advance ₹{advanceAmount.toFixed(2)} via UPI
              </p>
              <p className="text-xs w-full" style={{ color: brand.colors.fontBody }}>
                Balance ₹{balanceAmount.toFixed(2)} collected on delivery. Order confirmed after payment verification.
              </p>
              {!upiIdConfirmed ? (
                <div className="w-full flex flex-col gap-2">
                  <label className="text-sm font-medium" style={{ color: brand.colors.fontBody, fontFamily: brand.fonts?.body || 'Inter' }}>Enter your UPI ID</label>
                  <input type="text" value={customerUpiId} onChange={(e) => setCustomerUpiId(e.target.value)} placeholder="yourname@okhdfcbank" className="w-full px-3 py-2 rounded-lg border text-sm" />
                  <button onClick={() => { if (!customerUpiId.trim()) { alert('Please enter your UPI ID'); return; } setUpiIdConfirmed(true); }} className="w-full py-2.5 rounded-lg font-semibold text-sm" style={{ backgroundColor: brand.colors.button || '#25D366', color: brand.colors.buttonLabel || '#FFFFFF' }}>
                    Pay ₹{advanceAmount.toFixed(2)} Advance
                  </button>
                </div>
              ) : (() => {
                const txnRef = `TXN${Date.now()}`;
                const upiUri = `upi://pay?pa=${encodeURIComponent(payment.upiId.trim())}&pn=${encodeURIComponent(brand?.name || 'Store')}&am=${advanceAmount.toFixed(2)}&cu=INR&tn=${encodeURIComponent('Advance Payment')}&tr=${txnRef}`;
                return (
                  <>
                    <p className="text-xs w-full" style={{ color: brand.colors.fontBody }}>Paying from <span className="font-semibold">{customerUpiId}</span> <button onClick={() => setUpiIdConfirmed(false)} className="underline">change</button></p>
                    {payment?.showQRCode && <div className="bg-white p-3 rounded-lg border"><QRCodeSVG value={upiUri} size={140} /></div>}
                    <a href={upiUri} className="w-full text-center py-2.5 rounded-lg font-semibold text-sm mt-1" style={{ backgroundColor: brand.colors.button || '#25D366', color: brand.colors.buttonLabel || '#FFFFFF' }}>Pay ₹{advanceAmount.toFixed(2)} Advance via UPI App</a>
                    <p className="text-xs text-center max-w-[240px]" style={{ color: brand.colors.fontBody }}>Once done, tap "Place Order". We'll confirm after verifying payment.</p>
                  </>
                );
              })()}
            </div>
          )}
          {selectedPayment === 'upi' && payment?.upiId && (
            <div className="mt-3 p-3 bg-[#f2f4f7] rounded-lg flex flex-col items-center gap-2">
              {!upiIdConfirmed ? (
                <div className="w-full flex flex-col gap-2">
                  <label className="text-sm font-medium" style={{ color: brand.colors.fontBody, fontFamily: brand.fonts?.body || 'Inter' }}>
                    Enter your UPI ID
                  </label>
                  <input
                    type="text"
                    value={customerUpiId}
                    onChange={(e) => setCustomerUpiId(e.target.value)}
                    placeholder="yourname@okhdfcbank"
                    className="w-full px-3 py-2 rounded-lg border text-sm"
                  />
                  <button
                    onClick={() => {
                      if (!customerUpiId.trim()) {
                        alert('Please enter your UPI ID');
                        return;
                      }
                      setUpiIdConfirmed(true);
                    }}
                    className="w-full py-2.5 rounded-lg font-semibold text-sm"
                    style={{ backgroundColor: brand.colors.button || '#25D366', color: brand.colors.buttonLabel || '#FFFFFF' }}
                  >
                    Pay ₹{total.toFixed(2)}
                  </button>
                </div>
              ) : (
              (() => {
                const isValidVpa = /^[\w.\-]{2,256}@[a-zA-Z]{2,64}$/.test(payment.upiId.trim());
                // ✅ tr (transaction reference) is recommended by the NPCI
                // UPI spec and expected by several apps for a reliable
                // payment request — was missing before.
                const txnRef = `TXN${Date.now()}`;
                const upiUri = `upi://pay?pa=${encodeURIComponent(payment.upiId.trim())}&pn=${encodeURIComponent(brand?.name || 'Store')}&am=${total.toFixed(2)}&cu=INR&tn=${encodeURIComponent('Order Payment')}&tr=${txnRef}`;

                return (
                  <>
                    <p className="text-xs" style={{ color: brand.colors.fontBody, fontFamily: brand.fonts?.body || 'Inter' }}>
                      Paying from <span className="font-semibold">{customerUpiId}</span>{' '}
                      <button onClick={() => setUpiIdConfirmed(false)} className="underline">change</button>
                    </p>
                    {payment?.showQRCode && (
                      <div className="bg-white p-3 rounded-lg border">
                        <QRCodeSVG value={upiUri} size={140} />
                      </div>
                    )}
                    {/* ✅ Was missing entirely — a QR code alone is useless
                        to a customer checking out on their own phone (you
                        can't scan your own screen). This tappable link uses
                        the same UPI URI; the phone's OS intercepts upi://
                        links and shows the installed UPI app chooser
                        directly, which is the actual "click to pay" flow. */}
                    <a
                      href={upiUri}
                      className="w-full text-center py-2.5 rounded-lg font-semibold text-sm mt-1"
                      style={{ backgroundColor: brand.colors.button || '#25D366', color: brand.colors.buttonLabel || '#FFFFFF' }}
                    >
                      Pay ₹{total.toFixed(2)} via UPI App
                    </a>
                    <p className="text-xs text-center max-w-[240px]" style={{ color: brand.colors.fontBody, fontFamily: brand.fonts?.body || 'Inter' }}>
                      Once you've completed the payment, tap "Place Order" below.
                    </p>
                    {!isValidVpa && (
                      <p className="text-xs text-[#ba1a1a] text-center max-w-[220px]">
                        This UPI ID doesn't look like a real registered VPA (e.g. name@okhdfcbank, name@ybl) — a real UPI app will reject it as "invalid beneficiary." Update it in Step 4 with a genuine UPI ID to test scanning.
                      </p>
                    )}
                  </>
                );
              })()
              )}
              {payment?.showUPIId && (
                <p className="text-sm" style={{ color: brand.colors.fontBody, fontFamily: brand.fonts?.body || 'Inter' }}>
                  UPI ID: <span className="font-semibold" style={{ color: brand.colors.fontBody, fontFamily: brand.fonts?.body || 'Inter' }}>{payment.upiId}</span>
                </p>
              )}
            </div>
          )}
        </div>

        <button
          onClick={handlePlaceOrder}
          disabled={paymentMethods.length === 0 || placingOrder || (selectedPayment === 'upi' && !upiIdConfirmed) || (selectedPayment === 'cod' && partialPaymentEnabled && !upiIdConfirmed) || (isService && items.some(i => (i.selectedSlots || []).length < i.quantity))}
          className="w-full py-3 rounded-lg font-bold text-white transition-opacity hover:opacity-90 disabled:opacity-50 disabled:pointer-events-none"
          style={{ backgroundColor: brand.colors.button || '#25D366' }}
        >
          {placingOrder ? 'Placing Order...' : isService && items.some(i => (i.selectedSlots || []).length < i.quantity) ? 'Select all appointment slots to continue' : 'Place Order'}
        </button>
      </div>
    );
  }

  // Cart view
  return (
    <div className="p-4 max-w-3xl mx-auto">
      <h2 className="text-xl font-bold mb-4" style={{ color: brand.colors.fontHeader, fontFamily: brand.fonts?.body || 'Inter' }}>
        {tabName || (isService ? 'Services' : 'My Cart')} ({items.length} {items.length === 1 ? 'item' : 'items'})
      </h2>

      {items.length > 0 && freeDelivery && showProgressBar && remainingForFree > 0 && (
        <div className="mb-4 p-3 bg-[#f2f4f7] rounded-lg">
          <p className="text-sm" style={{ color: brand.colors.fontBody, fontFamily: brand.fonts?.body || 'Inter' }}>
            Add <span className="font-bold" style={{ color: brand.colors.primary }}>₹{remainingForFree.toFixed(2)}</span> more for FREE delivery
          </p>
          {/* Progress bar: Primary = filled/completed portion, Secondary = track/remaining */}
          <div className="w-full h-1.5 rounded-full mt-1 overflow-hidden" style={{ backgroundColor: brand.colors.secondary }}>
            <div
              className="h-full rounded-full transition-all"
              style={{
                width: `${Math.min((subtotal / freeDeliveryThreshold) * 100, 100)}%`,
                backgroundColor: brand.colors.primary
              }}
            />
          </div>
        </div>
      )}

      {items.length === 0 ? (
        <div className="text-center py-12" style={{ color: brand.colors.fontBody, fontFamily: brand.fonts?.body || 'Inter' }}>
          <span className="material-symbols-outlined text-6xl block mb-4 opacity-30">shopping_cart</span>
          <p>Your cart is empty</p>
          <p className="text-sm mt-2">Add some products from the Home tab</p>
        </div>
      ) : (
        <>
          <div className="space-y-3 mb-4">
            {items.map((item) => {
              const itemTotal = item.price * item.quantity;
              const itemGstRate = enableGST ? (item.gstRate != null && item.gstRate > 0 ? item.gstRate : (item.gstRate === null && gstRate ? 0 : null)) : null;
              const itemGstAmt = enableGST && item.gstRate != null && item.gstRate > 0 ? item.price * item.quantity * (item.gstRate / 100) : null;
              const slotsNeeded = item.quantity;
              const slotsSelected = (item.selectedSlots || []).length;
              const slotsMissing = isService && slotsNeeded > slotsSelected;

              return (
                <div key={item.id} className="rounded-lg border overflow-hidden" style={{ backgroundColor: brand.colors.background || '#FFFFFF' }}>
                  {/* Item row */}
                  <div className="p-4 flex items-center gap-4">
                    <div className="w-16 h-16 rounded-lg bg-[#f2f4f7] flex items-center justify-center overflow-hidden flex-shrink-0">
                      {item.image ? (
                        <img src={item.image} alt={item.productName} className="w-full h-full object-cover" />
                      ) : (
                        <span className="material-symbols-outlined text-[#bbcbb9]">image</span>
                      )}
                    </div>
                    <div className="flex-1">
                      <h4 className="font-semibold text-sm" style={{ color: brand.colors.fontHeader, fontFamily: brand.fonts?.body || 'Inter' }}>
                        {item.productName}
                      </h4>
                      <p className="text-xs" style={{ color: brand.colors.fontBody, fontFamily: brand.fonts?.body || 'Inter' }}>
                        {/* Service stores: staffName • duration mins • category */}
                        {item.staffName && item.staffName !== 'All Staff'
                          ? `${item.staffName}${item.duration ? ` • ${item.duration} mins` : ''} • ${item.variationName}`
                          : item.staffName === 'All Staff'
                            ? `${item.selectedStaff ? `${item.selectedStaff} • ` : ''}${item.duration ? `${item.duration} mins` : ''} • ${item.variationName}`
                            : `${item.sizeLabel} • ${item.variationName}`
                        }
                      </p>
                      {itemGstAmt != null ? (
                        <div>
                          <p className="text-xs" style={{ color: brand.colors.fontBody }}>
                            ₹{itemTotal.toFixed(2)} + {taxLabel} {item.gstRate}% (₹{itemGstAmt.toFixed(2)})
                          </p>
                          <p className="text-sm font-bold" style={{ color: brand.colors.primary }}>
                            = ₹{(itemTotal + itemGstAmt).toFixed(2)}
                          </p>
                        </div>
                      ) : (
                        <p className="text-sm font-bold" style={{ color: brand.colors.primary }}>
                          ₹{itemTotal.toFixed(2)}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => {
                          const newQty = item.quantity - 1;
                          updateQuantity(item.id, newQty);
                          // trim slots if qty reduced
                          if (updateSlots && (item.selectedSlots || []).length > newQty) {
                            updateSlots(item.id, (item.selectedSlots || []).slice(0, newQty));
                          }
                        }}
                        className="w-8 h-8 rounded-full border flex items-center justify-center hover:bg-[#f2f4f7] transition-colors"
                        style={{ borderColor: brand.colors.secondary }}
                      >
                        <span className="material-symbols-outlined text-sm">remove</span>
                      </button>
                      <span className="w-6 text-center font-medium">{item.quantity}</span>
                      <button
                        onClick={() => updateQuantity(item.id, item.quantity + 1)}
                        className="w-8 h-8 rounded-full border flex items-center justify-center hover:bg-[#f2f4f7] transition-colors"
                        style={{ borderColor: brand.colors.secondary }}
                      >
                        <span className="material-symbols-outlined text-sm">add</span>
                      </button>
                    </div>
                    <button
                      onClick={() => removeFromCart(item.id)}
                      className="text-[#ba1a1a] hover:bg-[#ffdad6]/50 p-1 rounded-full transition-colors"
                    >
                      <span className="material-symbols-outlined text-sm">close</span>
                    </button>
                  </div>

                  {/* Slot picker — service stores only */}
                  {isService && (
                    <ServiceSlotPicker
                      item={item}
                      booking={booking}
                      storeId={data.storeId}
                      apiBase={data.apiBase}
                      primaryColor={brand.colors.primary}
                      fontBody={brand.fonts?.body || 'Inter'}
                      onSlotsChange={(slots) => updateSlots && updateSlots(item.id, slots)}
                      onPriceChange={(price) => updateItemPrice && updateItemPrice(item.id, price)}
                      onStaffChange={(staff) => updateItemStaff && updateItemStaff(item.id, staff)}
                    />
                  )}
                </div>
              );
            })}
          </div>

          {/* Dine-In / Delivery selector — shown for service stores always, for product stores when enableDineIn is on */}
          {(isService || enableDineIn) && (
            <div className="rounded-lg border p-4 mb-4" style={{ backgroundColor: brand.colors.background || '#FFFFFF' }}>
              <p className="text-sm font-semibold mb-3" style={{ color: brand.colors.fontHeader, fontFamily: brand.fonts?.body || 'Inter' }}>
                How would you like your order?
              </p>
              <div className="flex gap-3 mb-3">
                <button
                  onClick={() => { setOrderType('dine_in'); setSelectedLocation((hasMultipleLocations || isService) ? null : mainStore); }}
                  className="flex-1 py-2 px-4 rounded-lg border-2 text-sm font-semibold transition-colors"
                  style={{
                    borderColor: orderType === 'dine_in' ? brand.colors.primary : brand.colors.secondary,
                    background: orderType === 'dine_in' ? brand.colors.primary : 'transparent',
                    color: orderType === 'dine_in' ? '#fff' : brand.colors.fontBody,
                    fontFamily: brand.fonts?.body || 'Inter'
                  }}
                >
                  🏪 {isService ? 'In-Store' : (dineInLabel || 'Dine In')}
                </button>
                <button
                  onClick={() => { setOrderType('delivery'); setSelectedLocation(null); }}
                  className="flex-1 py-2 px-4 rounded-lg border-2 text-sm font-semibold transition-colors"
                  style={{
                    borderColor: orderType === 'delivery' ? brand.colors.primary : brand.colors.secondary,
                    background: orderType === 'delivery' ? brand.colors.primary : 'transparent',
                    color: orderType === 'delivery' ? '#fff' : brand.colors.fontBody,
                    fontFamily: brand.fonts?.body || 'Inter'
                  }}
                >
                  🚗 {isService ? 'Home Visit' : 'Delivery'}
                </button>
              </div>

              {/* Location/Branch selector for dine-in (product stores) or in-store visit (service stores) */}
              {orderType === 'dine_in' && hasMultipleLocations && dineInEnabledLocations.length > 0 && (
                <div>
                  <p className="text-xs font-semibold mb-2" style={{ color: brand.colors.fontBody }}>
                    {isService ? 'Select Branch' : 'Select Location'}
                  </p>
                  <div className="space-y-2">
                    {dineInEnabledLocations.map(loc => (
                      <button key={loc.id} onClick={() => setSelectedLocation(loc)}
                        className="w-full text-left px-3 py-2 rounded-lg border-2 text-sm transition-colors"
                        style={{
                          borderColor: selectedLocation?.id === loc.id ? brand.colors.primary : brand.colors.secondary,
                          background: selectedLocation?.id === loc.id ? brand.colors.primary + '15' : 'transparent',
                          color: brand.colors.fontBody
                        }}>
                        <span className="font-semibold">{loc.name}</span>
                        {loc.address && <span className="text-xs block opacity-70">{loc.address}</span>}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Dine-in customer name & phone */}
              {orderType === 'dine_in' && (
                <div className="space-y-3 pt-1">
                  <p className="text-xs font-semibold" style={{ color: brand.colors.fontBody, fontFamily: brand.fonts?.body || 'Inter' }}>
                    Customer Details
                  </p>
                  <div>
                    <label className="block text-xs font-semibold mb-1" style={{ color: brand.colors.fontBody, fontFamily: brand.fonts?.body || 'Inter' }}>
                      Customer Name <span style={{ color: '#ba1a1a' }}>*</span>
                    </label>
                    <input
                      type="text"
                      value={dineInName}
                      onChange={e => setDineInName(e.target.value)}
                      placeholder="Enter customer name"
                      className="w-full border rounded-lg px-3 py-2 text-sm outline-none"
                      style={{
                        borderColor: dineInName.trim() ? brand.colors.primary : '#d1d5db',
                        color: brand.colors.fontBody,
                        fontFamily: brand.fonts?.body || 'Inter',
                      }}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold mb-1" style={{ color: brand.colors.fontBody, fontFamily: brand.fonts?.body || 'Inter' }}>
                      Mobile Number <span style={{ color: '#888', fontWeight: 400 }}>(optional)</span>
                    </label>
                    <input
                      type="tel"
                      value={dineInMobile}
                      onChange={e => setDineInMobile(e.target.value.replace(/\D/g, '').slice(0, 10))}
                      placeholder="10-digit mobile"
                      className="w-full border rounded-lg px-3 py-2 text-sm outline-none"
                      style={{
                        borderColor: '#d1d5db',
                        color: brand.colors.fontBody,
                        fontFamily: brand.fonts?.body || 'Inter',
                      }}
                    />
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Delivery Address - From the shared address book (Step 5 config) */}
          {orderType !== 'dine_in' && <div className="rounded-lg border p-4 mb-4" style={{ backgroundColor: brand.colors.background || '#FFFFFF' }}>
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-semibold" style={{ color: brand.colors.fontHeader, fontFamily: brand.fonts?.body || 'Inter' }}>
                Deliver to {currentAddress?.label || 'Address'}
              </p>
              {addresses.length > 1 && (
                <button
                  onClick={() => setShowAddressSelector(!showAddressSelector)}
                  className="text-sm font-medium"
                  style={{ color: brand.colors.primary }}
                >
                  Change
                </button>
              )}
            </div>

            {currentAddress ? (
              <p className="text-sm" style={{ color: brand.colors.fontBody, fontFamily: brand.fonts?.body || 'Inter' }}>
                {currentAddress.recipientName}<br />
                {currentAddress.addressLine1}
                {currentAddress.addressLine2 && <>, {currentAddress.addressLine2}</>}<br />
                {currentAddress.city}, {currentAddress.state} - {currentAddress.pincode}
                {currentAddress.landmark && <><br />Landmark: {currentAddress.landmark}</>}
                <br /><span className="text-xs">{currentAddress.recipientMobile}</span>
              </p>
            ) : (
              <p className="text-sm text-[#ba1a1a]">
                No delivery address saved yet. Add one from the Profile tab.
              </p>
            )}

            {showAddressSelector && (
              <div className="mt-3 pt-3 border-t border-[#e0e3e6] space-y-2">
                <p className="text-xs font-semibold" style={{ color: brand.colors.fontBody, fontFamily: brand.fonts?.body || 'Inter' }}>Select Delivery Address</p>
                {addresses.map((addr) => (
                  <button
                    key={addr.id}
                    onClick={() => {
                      setSelectedAddressId(addr.id);
                      setShowAddressSelector(false);
                    }}
                    className={`w-full text-left p-2 rounded-lg border transition-colors ${
                      currentAddress?.id === addr.id
                        ? ''
                        : 'border-[#e0e3e6] hover:bg-[#f2f4f7]'
                    }`}
                    style={currentAddress?.id === addr.id
                      ? { borderColor: brand.colors.primary, backgroundColor: `${brand.colors.primary}1a` }
                      : {}
                    }
                  >
                    <p className="text-sm font-medium" style={{ color: brand.colors.fontHeader, fontFamily: brand.fonts?.body || 'Inter' }}>
                      {addr.label}
                    </p>
                    <p className="text-xs" style={{ color: brand.colors.fontBody, fontFamily: brand.fonts?.body || 'Inter' }}>
                      {addr.addressLine1}, {addr.city}
                    </p>
                  </button>
                ))}
              </div>
            )}

            {(!currentAddress || addresses.length === 0) ? null : (
              <button
                onClick={onGoToProfile}
                className="w-full text-center py-2 mt-2 text-sm font-medium border-2 border-dashed rounded-lg"
                style={{ borderColor: brand.colors.secondary, color: brand.colors.primary }}
              >
                + Add New Address
              </button>
            )}
            {addresses.length === 0 && (
              <button
                onClick={onGoToProfile}
                className="w-full text-center py-2 mt-2 text-sm font-medium border-2 border-dashed rounded-lg"
                style={{ borderColor: brand.colors.secondary, color: brand.colors.primary }}
              >
                + Add Delivery Address
              </button>
            )}
          </div>}

          {/* ── Coupon / Promo Section ── */}
          <div className="rounded-lg border p-4 mb-4" style={{ backgroundColor: brand.colors.background || '#FFFFFF' }} ref={couponRef}>
            <h3 className="font-semibold text-sm mb-3" style={{ color: brand.colors.fontHeader, fontFamily: brand.fonts?.body || 'Inter' }}>🏷️ Coupons & Offers</h3>

            {appliedPromos.length > 0 && (
              <div style={{ marginBottom: '10px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {appliedPromos.map(p => (
                  <div key={p.code} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#f0fdf4', border: '1px solid #86efac', borderRadius: '10px', padding: '10px 14px' }}>
                    <div>
                      <div style={{ fontWeight: '700', fontSize: '13px', color: '#16a34a' }}>🎉 {p.name || p.code} applied automatically</div>
                      <div style={{ fontSize: '12px', color: '#16a34a', marginTop: '2px', opacity: 0.85 }}>You save ₹{p.discount.toFixed(2)}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
            {appliedCoupon ? (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: `${brand.colors.primary}12`, border: `1px solid ${brand.colors.primary}40`, borderRadius: '10px', padding: '10px 14px' }}>
                <div>
                  <div style={{ fontWeight: '700', fontSize: '13px', color: brand.colors.primary }}>✓ {appliedCoupon.code} applied</div>
                  <div style={{ fontSize: '12px', color: brand.colors.primary, marginTop: '2px', opacity: 0.8 }}>You save ₹{appliedCoupon.discount.toFixed(2)}</div>
                </div>
                <button onClick={removeCoupon} style={{ background: 'none', border: `1px solid ${brand.colors.primary}50`, borderRadius: '8px', padding: '4px 10px', fontSize: '12px', color: brand.colors.primary, cursor: 'pointer', fontWeight: '600' }}>Remove</button>
              </div>
            ) : (
              <div style={{ position: 'relative' }}>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <input
                    value={couponCode}
                    onChange={e => { setCouponCode(e.target.value.toUpperCase()); setCouponError(''); }}
                    onFocus={() => setShowCouponDropdown(true)}
                    onKeyDown={e => { if (e.key === 'Enter') applyCouponCode(); }}
                    placeholder="ENTER COUPON CODE"
                    style={{
                      flex: 1, border: `1px solid ${couponError ? '#f87171' : '#d1d5db'}`, borderRadius: '8px',
                      padding: '9px 12px', fontSize: '13px', fontWeight: '600', letterSpacing: '0.5px',
                      outline: 'none', color: brand.colors.fontBody, fontFamily: brand.fonts?.body || 'Inter',
                      background: brand.colors.background || '#fff',
                    }}
                  />
                  <button
                    onClick={() => applyCouponCode()}
                    disabled={couponLoading || !couponCode.trim()}
                    style={{
                      padding: '9px 16px', borderRadius: '8px', border: 'none', cursor: 'pointer',
                      background: couponCode.trim() ? brand.colors.primary : '#e2e8f0',
                      color: couponCode.trim() ? (brand.colors.buttonLabel || '#fff') : brand.colors.fontBody,
                      fontSize: '13px', fontWeight: '700', whiteSpace: 'nowrap',
                    }}
                  >
                    {couponLoading ? '…' : 'Apply'}
                  </button>
                </div>

                {availableCoupons.length > 0 && !showCouponDropdown && (
                  <button
                    onClick={() => setShowCouponDropdown(true)}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px 0', marginTop: '4px', fontSize: '12px', color: brand.colors.primary, fontWeight: '600', display: 'flex', alignItems: 'center', gap: '4px' }}
                  >
                    🏷️ View {availableCoupons.length} available offer{availableCoupons.length > 1 ? 's' : ''} ▾
                  </button>
                )}
                {showCouponDropdown && availableCoupons.length > 0 && (
                  <button
                    onClick={() => setShowCouponDropdown(false)}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px 0', marginTop: '4px', fontSize: '12px', color: brand.colors.fontBody, fontWeight: '600', display: 'flex', alignItems: 'center', gap: '4px' }}
                  >
                    Hide offers ▴
                  </button>
                )}

                {couponError && <div style={{ fontSize: '12px', color: '#ef4444', marginTop: '6px', fontWeight: '500' }}>⚠ {couponError}</div>}

                {showCouponDropdown && availableCoupons.length > 0 && (
                  <div style={{
                    position: 'absolute', top: 'calc(100% + 6px)', left: 0, right: 0, zIndex: 50,
                    background: brand.colors.background || '#fff', border: `1px solid ${brand.colors.primary}20`, borderRadius: '10px',
                    boxShadow: '0 8px 24px rgba(0,0,0,0.12)', overflow: 'hidden',
                  }}>
                    <div style={{ padding: '8px 12px', fontSize: '11px', fontWeight: '700', color: brand.colors.primary, textTransform: 'uppercase', letterSpacing: '0.5px', borderBottom: `1px solid ${brand.colors.primary}20`, background: `${brand.colors.primary}08` }}>
                      Available Offers
                    </div>
                    {availableCoupons.map(c => {
                      const discountLabel = c.unit === 'percent' ? `${c.value}% off` : `₹${c.value} off`;
                      const progress = c.min_order_value > 0 ? Math.min(100, (subtotal / c.min_order_value) * 100) : 100;
                      const eligible = subtotal >= (c.min_order_value || 0);
                      // Expiry display
                      const now = new Date();
                      const end = c.end_at ? new Date(c.end_at) : null;
                      const diffMs = end ? end - now : null;
                      let expiryChip = null;
                      if (diffMs !== null && diffMs > 0) {
                        if (diffMs < 60 * 60 * 1000) {
                          expiryChip = { text: `Expires in ${Math.floor(diffMs/60000)}m`, urgent: true };
                        } else if (diffMs < 24 * 60 * 60 * 1000) {
                          expiryChip = { text: `Expires in ${Math.floor(diffMs/3600000)}h`, urgent: true };
                        } else {
                          expiryChip = { text: `Till ${end.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}`, urgent: false };
                        }
                      }
                      const usesLeft = c.max_uses != null ? c.max_uses - (c.current_uses || 0) : null;
                      return (
                        <div key={c.code}
                          onClick={() => eligible && applyCouponCode(c.code)}
                          style={{
                            padding: '12px 14px', borderBottom: `1px solid ${brand.colors.primary}12`,
                            cursor: eligible ? 'pointer' : 'default',
                            opacity: eligible ? 1 : 0.65,
                            background: brand.colors.background || '#fff',
                          }}
                          onMouseEnter={e => { if (eligible) e.currentTarget.style.background = `${brand.colors.primary}08`; }}
                          onMouseLeave={e => { e.currentTarget.style.background = brand.colors.background || '#fff'; }}
                        >
                          {/* Code + discount row */}
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                            <span style={{ fontWeight: '800', fontSize: '13px', color: brand.colors.primary, letterSpacing: '0.5px' }}>{c.code}</span>
                            <span style={{ fontWeight: '700', fontSize: '13px', color: brand.colors.primary, flexShrink: 0 }}>{discountLabel}</span>
                          </div>

                          {/* Name */}
                          {c.name && c.name !== c.code && (
                            <div style={{ fontSize: '11px', color: brand.colors.fontBody, marginBottom: '6px' }}>{c.name}</div>
                          )}

                          {/* Condition chips */}
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginBottom: c.min_order_value > 0 ? '6px' : '0' }}>
                            {c.applicable_to && c.applicable_to !== 'both' && (
                              <span style={{ fontSize: '10px', background: `${brand.colors.primary}12`, color: brand.colors.primary, border: `1px solid ${brand.colors.primary}30`, borderRadius: '4px', padding: '1px 6px', fontWeight: '600' }}>
                                {c.applicable_to === 'dine_in' ? `🍽️ ${dineInLabel} only` : '🚚 Delivery only'}
                              </span>
                            )}
                            {expiryChip && (
                              <span style={{ fontSize: '10px', background: expiryChip.urgent ? '#fef2f2' : `${brand.colors.primary}12`, color: expiryChip.urgent ? '#b91c1c' : brand.colors.primary, border: `1px solid ${expiryChip.urgent ? '#fca5a5' : `${brand.colors.primary}30`}`, borderRadius: '4px', padding: '1px 6px', fontWeight: '600' }}>
                                ⏰ {expiryChip.text}
                              </span>
                            )}
                            {usesLeft !== null && usesLeft <= 10 && (
                              <span style={{ fontSize: '10px', background: usesLeft <= 3 ? '#fef2f2' : `${brand.colors.primary}12`, color: usesLeft <= 3 ? '#b91c1c' : brand.colors.primary, border: `1px solid ${usesLeft <= 3 ? '#fca5a5' : `${brand.colors.primary}30`}`, borderRadius: '4px', padding: '1px 6px', fontWeight: '600' }}>
                                🔥 {usesLeft <= 1 ? 'Last 1 use!' : `Only ${usesLeft} left`}
                              </span>
                            )}
                          </div>

                          {/* Min order progress bar */}
                          {c.min_order_value > 0 && (
                            <div>
                              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: brand.colors.fontBody, marginBottom: '3px' }}>
                                <span>{eligible ? '✓ Eligible — tap to apply' : `Add ₹${(c.min_order_value - subtotal).toFixed(0)} more to unlock`}</span>
                                <span>₹{subtotal.toFixed(0)} / ₹{c.min_order_value}</span>
                              </div>
                              <div style={{ height: '4px', borderRadius: '2px', background: `${brand.colors.primary}20`, overflow: 'hidden' }}>
                                <div style={{ height: '100%', width: `${progress}%`, background: brand.colors.primary, borderRadius: '2px', transition: 'width 0.3s' }} />
                              </div>
                            </div>
                          )}
                          {eligible && c.min_order_value === 0 && (
                            <div style={{ fontSize: '11px', color: brand.colors.primary, fontWeight: '600', marginTop: '2px' }}>✓ Tap to apply</div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}

                {showCouponDropdown && availableCoupons.length === 0 && (
                  <div style={{ position: 'absolute', top: 'calc(100% + 6px)', left: 0, right: 0, zIndex: 50, background: brand.colors.background || '#fff', border: `1px solid ${brand.colors.primary}20`, borderRadius: '10px', padding: '14px', textAlign: 'center', fontSize: '12px', color: brand.colors.fontBody, boxShadow: '0 4px 12px rgba(0,0,0,0.08)' }}>
                    No offers available for your cart right now
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Bill Details */}
          <div className="rounded-lg border p-4" style={{ backgroundColor: brand.colors.background || '#FFFFFF' }}>
            <h3 className="font-semibold text-sm mb-3" style={{ color: brand.colors.fontHeader, fontFamily: brand.fonts?.body || 'Inter' }}>
              Bill Details
            </h3>
            <div className="space-y-2">
              {showGSTBreakdownCart ? (
                <>
                  <div className="flex justify-between text-sm">
                    <span style={{ color: brand.colors.fontBody, fontFamily: brand.fonts?.body || 'Inter' }}>Subtotal</span>
                    <span style={{ color: brand.colors.fontBody, fontFamily: brand.fonts?.body || 'Inter' }}>₹{subtotal.toFixed(2)}</span>
                  </div>
                  {orderType !== 'dine_in' && <div className="flex justify-between text-sm">
                    <span style={{ color: brand.colors.fontBody, fontFamily: brand.fonts?.body || 'Inter' }}>Delivery</span>
                    <span style={{ color: brand.colors.fontBody, fontFamily: brand.fonts?.body || 'Inter' }}>
                      {delivery === 0 ? 'FREE' : `₹${delivery.toFixed(2)}`}
                    </span>
                  </div>}
                  {enableGST && (
                    hasPerProductGST ? (
                      Object.entries(gstByRate).sort((a,b) => a[0]-b[0]).map(([rate, amt]) => (
                        <div key={rate} className="flex justify-between text-sm">
                          <span style={{ color: brand.colors.fontBody, fontFamily: brand.fonts?.body || 'Inter' }}>{taxLabel} ({rate}%)</span>
                          <span style={{ color: brand.colors.fontBody, fontFamily: brand.fonts?.body || 'Inter' }}>₹{amt.toFixed(2)}</span>
                        </div>
                      ))
                    ) : (
                      <div className="flex justify-between text-sm">
                        <span style={{ color: brand.colors.fontBody, fontFamily: brand.fonts?.body || 'Inter' }}>{taxLabel} ({gstRate}%)</span>
                        <span style={{ color: brand.colors.fontBody, fontFamily: brand.fonts?.body || 'Inter' }}>₹{gst.toFixed(2)}</span>
                      </div>
                    )
                  )}
                </>
              ) : null}
              {appliedPromos.map(p => (
                <div key={p.code} className="flex justify-between text-sm text-green-700">
                  <span>🎉 {p.name || p.code}</span>
                  <span>-₹{p.discount.toFixed(2)}</span>
                </div>
              ))}
              {appliedCoupon && (
                <div className="flex justify-between text-sm text-green-700">
                  <span>🏷️ Coupon ({appliedCoupon.code})</span>
                  <span>-₹{appliedCoupon.discount.toFixed(2)}</span>
                </div>
              )}
              <div className="border-t pt-2 flex justify-between font-bold">
                <span style={{ color: brand.colors.fontBody, fontFamily: brand.fonts?.body || 'Inter' }}>Total</span>
                <span style={{ color: brand.colors.primary }}>₹{total.toFixed(2)}</span>
              </div>
            </div>
          </div>

          <button
            onClick={handleCheckout}
            className="w-full mt-4 py-3 rounded-lg font-bold text-white transition-opacity hover:opacity-90"
            style={{ backgroundColor: brand.colors.button || '#25D366', fontFamily: brand.fonts?.body || 'Inter' }}
          >
            Proceed to Checkout
          </button>
        </>
      )}
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// ServiceSlotPicker
// Shows a date strip + time slots. Customer must pick exactly `item.quantity`
// slots. Passes staffName to the backend so each staff member's availability
// is shown independently. "All Staff" = any available staff.
// ─────────────────────────────────────────────────────────────────────────────
// ─────────────────────────────────────────────────────────────────────────────
// StaffSlotPanel — slot grid for the active tab (no date strip, date is shared above)
// ─────────────────────────────────────────────────────────────────────────────
const StaffSlotPanel = ({ staffName, selectedDate, storeId, apiBase, duration, primaryColor, fontBody, selectedSlots, quantity, onAddSlot, onSlotCount }) => {
  const [slots, setSlots] = React.useState([]);
  const [loading, setLoading] = React.useState(false);

  React.useEffect(() => {
    if (!selectedDate || !storeId || !staffName) return;
    setLoading(true);
    const params = new URLSearchParams({ date: selectedDate, serviceDuration: duration, staffName });
    fetch(`${apiBase}/api/store/${storeId}/slots?${params}`)
      .then(r => r.json())
      .then(res => {
        let fetchedSlots = res.success ? res.data : [];
        const todayIso = new Date().toISOString().split('T')[0];
        if (selectedDate === todayIso) {
          const now = new Date();
          const nowMinutes = now.getHours() * 60 + now.getMinutes();
          fetchedSlots = fetchedSlots.map(slot => {
            const [h, m] = (slot.startTime || '').split(':').map(Number);
            return h * 60 + (m || 0) <= nowMinutes ? { ...slot, available: false } : slot;
          });
        }
        setSlots(fetchedSlots);
        if (onSlotCount) onSlotCount(staffName, fetchedSlots.filter(s => s.available).length);
      })
      .catch(() => { setSlots([]); if (onSlotCount) onSlotCount(staffName, 0); })
      .finally(() => setLoading(false));
  }, [selectedDate, storeId, duration, apiBase, staffName]);

  if (loading) return <p className="text-[10px] text-center py-4 opacity-40" style={{ fontFamily: fontBody }}>Loading slots…</p>;
  if (slots.length === 0) return <p className="text-[10px] text-center py-4 opacity-40" style={{ fontFamily: fontBody }}>No slots for this date</p>;

  return (
    <div className="grid grid-cols-3 gap-1.5">
      {slots.map((slot, i) => {
        const isAvailable = slot.available;
        const alreadyPicked = selectedSlots.filter(s => s.date === selectedDate && s.startTime === slot.startTime && s.staffName === staffName).length;
        const canPick = isAvailable && selectedSlots.length < quantity;
        return (
          <button key={i}
            disabled={!canPick}
            onClick={() => canPick && onAddSlot({ ...slot, staffName, selectedDate })}
            className="py-1.5 px-1 rounded-lg border text-[10px] font-medium transition-all"
            style={{
              borderColor: alreadyPicked > 0 ? primaryColor : isAvailable ? primaryColor + '50' : '#e0e3e6',
              backgroundColor: alreadyPicked > 0 ? primaryColor + '20' : isAvailable ? primaryColor + '08' : '#f5f5f5',
              color: alreadyPicked > 0 ? primaryColor : isAvailable ? primaryColor : '#bbb',
              opacity: !canPick && alreadyPicked === 0 ? 0.5 : 1,
              cursor: canPick ? 'pointer' : 'default',
            }}>
            <span className="block font-semibold">{slot.startTime}</span>
            {slot.endTime && <span className="block opacity-60 text-[9px]">{slot.endTime}</span>}
            {alreadyPicked > 0 && <span className="block text-[9px]">✓</span>}
          </button>
        );
      })}
    </div>
  );
};

// StaffSlotCard kept as thin wrapper — now unused directly but kept for safety
const StaffSlotCard = StaffSlotPanel;

const ServiceSlotPicker = ({ item, booking, storeId, apiBase, primaryColor, fontBody, onSlotsChange, onPriceChange, onStaffChange }) => {
  const quantity = item.quantity;
  const selectedSlots = item.selectedSlots || [];
  const duration = item.duration || 60;

  // item.staffName is set from size.size in usePreviewData (service stores)
  const baseStaffName = item.staffName || 'All Staff';
  const isAllStaff = !baseStaffName || baseStaffName === 'All Staff';

  // Compute price for a staff member, applying premiumPercent from booking config
  const getStaffPrice = (staffName) => {
    const staffMember = (booking.staffMembers || []).find(sm => sm.name === staffName);
    const premiumPercent = staffMember?.premiumPercent || 0;
    const namedSize = (item.staffSizes || []).find(ss => ss.name === staffName);
    const base = (namedSize && namedSize.price > 0) ? namedSize.price : (item.basePrice || 0);
    return Math.round(base * (1 + premiumPercent / 100));
  };

  // Build date options: today + advanceDays
  const advanceDays = parseInt(booking.advanceDays) || 7;
  const workingDays = booking.workingDays || ['Mon','Tue','Wed','Thu','Fri','Sat'];
  const dayMap = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];

  const dateOptions = React.useMemo(() => {
    const dates = [];
    const today = new Date();
    for (let i = 0; i < advanceDays + 7 && dates.length < advanceDays; i++) {
      const d = new Date(today);
      d.setDate(today.getDate() + i);
      const dayName = dayMap[d.getDay()];
      if (workingDays.includes(dayName)) {
        dates.push({
          iso: d.toISOString().split('T')[0],
          label: i === 0 ? 'Today' : i === 1 ? 'Tomorrow' : dayName,
          sub: d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }),
        });
      }
    }
    return dates;
  }, [advanceDays, workingDays]);

  const [selectedDate, setSelectedDate] = React.useState(dateOptions[0]?.iso || '');
  const [slots, setSlots] = React.useState([]);
  const [loading, setLoading] = React.useState(false);

  // For All Staff mode: tab state
  const [staffList, setStaffList] = React.useState([]);
  const [staffLoading, setStaffLoading] = React.useState(false);
  const [activeStaffTab, setActiveStaffTab] = React.useState(null);
  const [staffSlotCounts, setStaffSlotCounts] = React.useState({});

  // Fetch staff list for All Staff mode
  React.useEffect(() => {
    if (!isAllStaff || !storeId) return;
    setStaffLoading(true);
    fetch(`${apiBase}/api/store/${storeId}/staff`)
      .then(r => r.json())
      .then(res => {
        const list = res.success ? res.data : [];
        setStaffList(list);
        if (list.length > 0) setActiveStaffTab(list[0].name);
      })
      .catch(() => setStaffList([]))
      .finally(() => setStaffLoading(false));
  }, [isAllStaff, storeId, apiBase]);

  const handleSlotCount = React.useCallback((staffName, count) => {
    setStaffSlotCounts(prev => ({ ...prev, [staffName]: count }));
  }, []);

  // Fetch slots for single-staff mode
  React.useEffect(() => {
    if (isAllStaff || !selectedDate || !storeId || !baseStaffName) return;
    setLoading(true);
    const params = new URLSearchParams({ date: selectedDate, serviceDuration: duration, staffName: baseStaffName });
    fetch(`${apiBase}/api/store/${storeId}/slots?${params}`)
      .then(r => r.json())
      .then(res => {
        let fetchedSlots = res.success ? res.data : [];
        const todayIso = new Date().toISOString().split('T')[0];
        if (selectedDate === todayIso) {
          const now = new Date();
          const nowMinutes = now.getHours() * 60 + now.getMinutes();
          fetchedSlots = fetchedSlots.map(slot => {
            const [h, m] = (slot.startTime || '').split(':').map(Number);
            return h * 60 + (m || 0) <= nowMinutes ? { ...slot, available: false } : slot;
          });
        }
        setSlots(fetchedSlots);
      })
      .catch(() => setSlots([]))
      .finally(() => setLoading(false));
  }, [selectedDate, storeId, duration, apiBase, baseStaffName, isAllStaff]);

  const addSlot = (slot, staffName, date) => {
    if (selectedSlots.length >= quantity) return;
    const effectiveDate = date || selectedDate;
    const effectiveStaff = staffName || baseStaffName;
    const newSlots = [...selectedSlots, {
      date: effectiveDate,
      startTime: slot.startTime,
      endTime: slot.endTime,
      staffName: effectiveStaff,
    }];
    onSlotsChange(newSlots);
    // Update price and staff to whichever staff was last picked
    if (onStaffChange) onStaffChange(effectiveStaff);
    const price = getStaffPrice(effectiveStaff);
    if (price > 0 && onPriceChange) onPriceChange(price);
  };

  const removeSlot = (idx) => {
    const newSlots = selectedSlots.filter((_, i) => i !== idx);
    onSlotsChange(newSlots);
  };

  const slotsNeeded = quantity - selectedSlots.length;

  return (
    <div className="border-t px-4 pb-4 pt-3" style={{ backgroundColor: '#f8fdf9' }}>
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <div>
          <p className="text-xs font-semibold" style={{ color: primaryColor, fontFamily: fontBody }}>
            📅 Pick {quantity} appointment slot{quantity > 1 ? 's' : ''}
          </p>
          {isAllStaff ? (
            <p className="text-[11px] opacity-60 mt-0.5" style={{ fontFamily: fontBody }}>
              Choose any available staff member
            </p>
          ) : (
            <p className="text-[11px] opacity-60 mt-0.5" style={{ fontFamily: fontBody }}>
              with {baseStaffName}
            </p>
          )}
        </div>
        <span className="text-xs font-medium px-2 py-0.5 rounded-full"
          style={{ backgroundColor: selectedSlots.length === quantity ? '#dcfce7' : '#fef9c3', color: selectedSlots.length === quantity ? '#15803d' : '#854d0e' }}>
          {selectedSlots.length}/{quantity} selected
        </span>
      </div>

      {/* Selected slots chips */}
      {selectedSlots.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-3">
          {selectedSlots.map((s, i) => (
            <span key={i} className="flex items-center gap-1 text-xs px-2 py-1 rounded-full font-medium"
              style={{ backgroundColor: primaryColor + '20', color: primaryColor, fontFamily: fontBody }}>
              {s.date === new Date().toISOString().split('T')[0] ? 'Today' : s.date} {s.startTime}{s.endTime ? ` – ${s.endTime}` : ''}
              {s.staffName && <span className="opacity-70">· {s.staffName}</span>}
              <button onClick={() => removeSlot(i)} className="ml-0.5 opacity-60 hover:opacity-100">✕</button>
            </span>
          ))}
        </div>
      )}

      {slotsNeeded > 0 && (
        <>
          {/* ── ALL STAFF MODE: tab per staff, shared date strip ── */}
          {isAllStaff ? (
            staffLoading ? (
              <p className="text-xs text-center py-4 opacity-50" style={{ fontFamily: fontBody }}>Loading available staff…</p>
            ) : staffList.length === 0 ? (
              <p className="text-xs text-center py-4 opacity-50" style={{ fontFamily: fontBody }}>No staff members available</p>
            ) : (
              <div>
                {/* Staff tab bar */}
                <div className="flex gap-0 overflow-x-auto scrollbar-hide mb-3 rounded-xl border" style={{ borderColor: '#e0e3e6', backgroundColor: '#f8f8f8' }}>
                  {staffList.map(s => {
                    const isActive = activeStaffTab === s.name;
                    const count = staffSlotCounts[s.name];
                    const price = getStaffPrice(s.name);
                    return (
                      <button
                        key={s.name}
                        onClick={() => setActiveStaffTab(s.name)}
                        className="flex-shrink-0 flex flex-col items-center px-3 py-2 text-[11px] font-medium transition-all relative"
                        style={{
                          color: isActive ? primaryColor : '#556067',
                          backgroundColor: isActive ? '#fff' : 'transparent',
                          borderBottom: isActive ? `2px solid ${primaryColor}` : '2px solid transparent',
                          fontFamily: fontBody,
                          minWidth: 72,
                        }}>
                        <span className="font-semibold truncate max-w-[80px]">{s.name}</span>
                        {price > 0 && <span className="text-[9px] opacity-60">₹{price}</span>}
                        {count !== undefined && (
                          <span className="text-[9px] mt-0.5 px-1.5 py-0.5 rounded-full" style={{
                            backgroundColor: count > 0 ? '#dcfce7' : '#f5f5f5',
                            color: count > 0 ? '#15803d' : '#9ca3af',
                          }}>
                            {count > 0 ? `${count} slots` : 'No slots'}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>

                {/* Shared date strip */}
                <div className="flex gap-1.5 overflow-x-auto pb-1 mb-3 scrollbar-hide">
                  {dateOptions.map(d => (
                    <button key={d.iso}
                      onClick={() => setSelectedDate(d.iso)}
                      className="flex-shrink-0 flex flex-col items-center px-2.5 py-1.5 rounded-lg border transition-all"
                      style={{
                        borderColor: selectedDate === d.iso ? primaryColor : '#e0e3e6',
                        backgroundColor: selectedDate === d.iso ? primaryColor + '15' : '#fff',
                        color: selectedDate === d.iso ? primaryColor : '#556067',
                        fontFamily: fontBody,
                      }}>
                      <span className="font-semibold text-[10px]">{d.label}</span>
                      <span className="opacity-70 text-[9px]">{d.sub}</span>
                    </button>
                  ))}
                </div>

                {/* Active staff's slots */}
                {activeStaffTab && (
                  <StaffSlotPanel
                    key={activeStaffTab + selectedDate}
                    staffName={activeStaffTab}
                    selectedDate={selectedDate}
                    storeId={storeId}
                    apiBase={apiBase}
                    duration={duration}
                    primaryColor={primaryColor}
                    fontBody={fontBody}
                    selectedSlots={selectedSlots}
                    quantity={quantity}
                    onAddSlot={(slot) => addSlot(slot, slot.staffName, slot.selectedDate)}
                    onSlotCount={handleSlotCount}
                  />
                )}
              </div>
            )
          ) : (
            /* ── SINGLE STAFF MODE ── */
            <>
              {/* Date strip */}
              <div className="flex gap-2 overflow-x-auto pt-1 pb-1 mb-3 scrollbar-hide">
                {dateOptions.map(d => (
                  <button key={d.iso}
                    onClick={() => setSelectedDate(d.iso)}
                    className="flex-shrink-0 flex flex-col items-center px-3 py-2 rounded-xl border-2 transition-all text-xs"
                    style={{
                      borderColor: selectedDate === d.iso ? primaryColor : '#e0e3e6',
                      backgroundColor: selectedDate === d.iso ? primaryColor + '15' : '#fff',
                      color: selectedDate === d.iso ? primaryColor : '#556067',
                      fontFamily: fontBody,
                    }}>
                    <span className="font-semibold">{d.label}</span>
                    <span className="opacity-70">{d.sub}</span>
                  </button>
                ))}
              </div>

              {/* Time slots grid */}
              {loading ? (
                <p className="text-xs text-center py-3 opacity-50" style={{ fontFamily: fontBody }}>Loading slots…</p>
              ) : slots.length === 0 ? (
                <p className="text-xs text-center py-3 opacity-50" style={{ fontFamily: fontBody }}>No slots available for this date</p>
              ) : (
                <div className="grid grid-cols-3 gap-2 pt-1">
                  {slots.map((slot, i) => {
                    const isAvailable = slot.available;
                    const alreadyPickedCount = selectedSlots.filter(s => s.date === selectedDate && s.startTime === slot.startTime && s.staffName === baseStaffName).length;
                    const canPick = isAvailable && selectedSlots.length < quantity;
                    return (
                      <button key={i}
                        disabled={!canPick}
                        onClick={() => addSlot(slot)}
                        className="py-2 px-1 rounded-lg border text-xs font-medium transition-all"
                        style={{
                          borderColor: alreadyPickedCount > 0 ? primaryColor : isAvailable ? primaryColor + '60' : '#e0e3e6',
                          backgroundColor: alreadyPickedCount > 0 ? primaryColor + '20' : isAvailable ? primaryColor + '12' : '#f5f5f5',
                          color: alreadyPickedCount > 0 ? primaryColor : isAvailable ? primaryColor : '#9ca3af',
                          fontFamily: fontBody,
                          opacity: !canPick && alreadyPickedCount === 0 ? 0.5 : 1,
                          cursor: canPick ? 'pointer' : 'default',
                        }}>
                        <span className="block font-semibold">{slot.startTime}</span>
                        {slot.endTime && <span className="block text-[10px] opacity-70 mt-0.5">{slot.endTime}</span>}
                        {alreadyPickedCount > 0 && <span className="block text-[10px] mt-0.5">×{alreadyPickedCount}</span>}
                      </button>
                    );
                  })}
                </div>
              )}

              {slotsNeeded > 0 && (
                <p className="text-xs mt-2 opacity-60 text-center" style={{ fontFamily: fontBody }}>
                  {slotsNeeded} more slot{slotsNeeded > 1 ? 's' : ''} needed
                </p>
              )}
            </>
          )}
        </>
      )}

      {selectedSlots.length === quantity && (
        <p className="text-xs text-center mt-1 font-medium" style={{ color: '#15803d', fontFamily: fontBody }}>
          ✅ All slots selected — you're good to checkout
        </p>
      )}
    </div>
  );
};

export default PreviewCartTab;
