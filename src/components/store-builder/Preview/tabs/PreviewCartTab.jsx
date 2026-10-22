import React, { useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';

// ✅ New brand color system (see design discussion): brand.colors.font
// replaced by fontHeader (used on heading tags h1-h4) and fontBody (used
// everywhere else — labels, values, body text). brand.colors.secondary
// used to double as muted text color; that job moved entirely to fontBody.
// Secondary is now purely a UI-state color (e.g. the free-delivery
// progress bar's track, quantity-stepper borders).
const PreviewCartTab = ({ data, updateQuantity, removeFromCart, placeOrder, onGoToProfile, isAuthenticated, onRequireAuth, storeType = 'product', booking = {}, tabName = '' }) => {
  const isService = storeType === 'service';
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
  const [orderType, setOrderType] = useState('delivery'); // 'dine_in' or 'delivery'
  const [selectedLocation, setSelectedLocation] = useState(null); // for dine-in location selection
  const [deliveryZoneInfo, setDeliveryZoneInfo] = useState(null); // { allowed, storeAddressId, storeAddressName, deliveryZone, deliveryCost }
  const [pincodeChecked, setPincodeChecked] = useState(false);

  // Coupon / promo code
  const [couponCode, setCouponCode] = useState('');
  const [couponApplied, setCouponApplied] = useState(null); // { code, discountAmount, couponName }
  const [couponError, setCouponError] = useState('');
  const [couponLoading, setCouponLoading] = useState(false);

  const subtotal = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
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
  const delivery = orderType === 'dine_in' ? 0 : (freeDelivery
    ? (subtotal >= freeDeliveryThreshold ? 0 : (deliveryZoneInfo?.deliveryCost ?? deliveryCharge))
    : (deliveryZoneInfo?.deliveryCost ?? deliveryCharge));
  const discount = couponApplied?.discountAmount || 0;
  const total = Math.max(0, subtotal + gst + delivery - discount);
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
  const allLocations = [mainStore, ...storeLocations.filter(l => l.name && l.address)];
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
      alert('Please select a location for dine-in');
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
      couponCode: couponApplied?.code || null,
      discountAmount: couponApplied?.discountAmount || 0,
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

        {/* Delivery Address */}
        {!isService && !isScanOrder && <div className="rounded-lg border p-4 mb-4" style={{ backgroundColor: brand.colors.background || '#FFFFFF' }}>
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
          disabled={paymentMethods.length === 0 || placingOrder || (selectedPayment === 'upi' && !upiIdConfirmed) || (selectedPayment === 'cod' && partialPaymentEnabled && !upiIdConfirmed)}
          className="w-full py-3 rounded-lg font-bold text-white transition-opacity hover:opacity-90 disabled:opacity-50 disabled:pointer-events-none"
          style={{ backgroundColor: brand.colors.button || '#25D366' }}
        >
          {placingOrder ? 'Placing Order...' : 'Place Order'}
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
              return (
                <div key={item.id} className="rounded-lg border p-4 flex items-center gap-4" style={{ backgroundColor: brand.colors.background || '#FFFFFF' }}>
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
                      {item.sizeLabel} • {item.variationName}
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
                      onClick={() => updateQuantity(item.id, item.quantity - 1)}
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
              );
            })}
          </div>

          {/* Dine-In / Delivery selector */}
          {!isService && enableDineIn && (
            <div className="rounded-lg border p-4 mb-4" style={{ backgroundColor: brand.colors.background || '#FFFFFF' }}>
              <p className="text-sm font-semibold mb-3" style={{ color: brand.colors.fontHeader, fontFamily: brand.fonts?.body || 'Inter' }}>
                How would you like your order?
              </p>
              <div className="flex gap-3 mb-3">
                <button
                  onClick={() => { setOrderType('dine_in'); setSelectedLocation(hasMultipleLocations ? null : mainStore); }}
                  className="flex-1 py-2 px-4 rounded-lg border-2 text-sm font-semibold transition-colors"
                  style={{
                    borderColor: orderType === 'dine_in' ? brand.colors.primary : brand.colors.secondary,
                    background: orderType === 'dine_in' ? brand.colors.primary : 'transparent',
                    color: orderType === 'dine_in' ? '#fff' : brand.colors.fontBody,
                    fontFamily: brand.fonts?.body || 'Inter'
                  }}
                >
                  🍽️ {dineInLabel || 'Dine In'}
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
                  🚚 Delivery
                </button>
              </div>

              {/* Location selector for dine-in with multiple locations */}
              {orderType === 'dine_in' && hasMultipleLocations && dineInEnabledLocations.length > 0 && (
                <div>
                  <p className="text-xs font-semibold mb-2" style={{ color: brand.colors.fontBody }}>Select Location</p>
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

          {/* Promo / Coupon Code */}
          <div className="rounded-lg border p-4 mb-4" style={{ backgroundColor: brand.colors.background || '#FFFFFF' }}>
            <h3 className="font-semibold text-sm mb-3" style={{ color: brand.colors.fontHeader, fontFamily: brand.fonts?.body || 'Inter' }}>
              🏷️ Promo Code
            </h3>
            {couponApplied ? (
              <div className="flex items-center justify-between bg-green-50 border border-green-200 rounded-lg px-3 py-2">
                <div>
                  <p className="text-sm font-semibold text-green-800">{couponApplied.code} applied!</p>
                  <p className="text-xs text-green-700">You save ₹{couponApplied.discountAmount.toFixed(2)}</p>
                </div>
                <button onClick={handleRemoveCoupon} className="text-xs text-red-500 underline font-medium ml-3">Remove</button>
              </div>
            ) : (
              <>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={couponCode}
                    onChange={e => { setCouponCode(e.target.value.toUpperCase()); setCouponError(''); }}
                    onKeyDown={e => e.key === 'Enter' && handleApplyCoupon()}
                    placeholder="Enter promo code"
                    className="flex-1 border rounded-lg px-3 py-2 text-sm outline-none uppercase"
                    style={{ borderColor: couponError ? '#ba1a1a' : '#d1d5db', color: brand.colors.fontBody, fontFamily: brand.fonts?.body || 'Inter' }}
                  />
                  <button
                    onClick={handleApplyCoupon}
                    disabled={couponLoading || !couponCode.trim()}
                    className="px-4 py-2 rounded-lg text-sm font-semibold disabled:opacity-50"
                    style={{ backgroundColor: brand.colors.primary, color: '#fff', fontFamily: brand.fonts?.body || 'Inter' }}
                  >
                    {couponLoading ? '...' : 'Apply'}
                  </button>
                </div>
                {couponError && <p className="text-xs text-red-600 mt-1">{couponError}</p>}
              </>
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
              {couponApplied && (
                <div className="flex justify-between text-sm text-green-700">
                  <span>Discount ({couponApplied.code})</span>
                  <span>-₹{couponApplied.discountAmount.toFixed(2)}</span>
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

export default PreviewCartTab;
