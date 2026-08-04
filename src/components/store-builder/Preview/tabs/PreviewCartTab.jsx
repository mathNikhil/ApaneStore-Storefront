import React, { useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';

// ✅ New brand color system (see design discussion): brand.colors.font
// replaced by fontHeader (used on heading tags h1-h4) and fontBody (used
// everywhere else — labels, values, body text). brand.colors.secondary
// used to double as muted text color; that job moved entirely to fontBody.
// Secondary is now purely a UI-state color (e.g. the free-delivery
// progress bar's track, quantity-stepper borders).
const PreviewCartTab = ({ data, updateQuantity, removeFromCart, placeOrder, onGoToProfile, isAuthenticated, onRequireAuth }) => {
  const { cart, brand, payment, profile } = data;
  const [showCheckout, setShowCheckout] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState(payment?.defaultPayment || 'cod');
  const [orderPlaced, setOrderPlaced] = useState(false);
  const [placingOrder, setPlacingOrder] = useState(false);
  const [selectedAddressId, setSelectedAddressId] = useState(null);
  const [showAddressSelector, setShowAddressSelector] = useState(false);

  const { items, freeDelivery, freeDeliveryThreshold, deliveryCharge, showProgressBar, enableGST, gstRate, taxLabel, showGSTBreakdownCart, showGSTBreakdownCheckout } = cart;

  const subtotal = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const gst = enableGST ? subtotal * (gstRate / 100) : 0;
  const delivery = freeDelivery
    ? (subtotal >= freeDeliveryThreshold ? 0 : deliveryCharge)
    : deliveryCharge;
  const total = subtotal + gst + delivery;
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
    if (payment?.cardEnabled) methods.push({ id: 'card', label: 'Credit/Debit Card', icon: 'credit_card' });
    if (payment?.netBankingEnabled) methods.push({ id: 'netbanking', label: 'Net Banking', icon: 'account_balance' });
    return methods;
  };

  const paymentMethods = getPaymentMethods();

  const handleCheckout = () => {
    if (items.length === 0) {
      alert('Your cart is empty');
      return;
    }
    if (!isAuthenticated) {
      onRequireAuth?.();
      return;
    }
    if (!currentAddress) {
      alert('Please add a delivery address from the Profile tab before checking out');
      return;
    }
    setShowCheckout(true);
  };

  const handlePlaceOrder = async () => {
    if (!currentAddress) {
      alert('Please select a delivery address');
      return;
    }
    if (paymentMethods.length > 0 && !selectedPayment) {
      alert('Please select a payment method');
      return;
    }

    const methodLabel = paymentMethods.find(m => m.id === selectedPayment)?.label || selectedPayment;

    setPlacingOrder(true);
    const result = await placeOrder({
      address: currentAddress,
      paymentMethodId: selectedPayment,
      paymentMethodLabel: methodLabel,
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
        <h2 className="text-2xl font-bold" style={{ color: brand.colors.fontHeader }}>Order Placed! 🎉</h2>
        <p style={{ color: brand.colors.fontBody }}>Your order has been placed successfully.</p>
      </div>
    );
  }

  if (showCheckout) {
    return (
      <div className="p-4 max-w-3xl mx-auto">
        <button onClick={() => setShowCheckout(false)} className="flex items-center gap-1 text-[#556067] mb-4 hover:text-[#191c1e] transition-colors">
          <span className="material-symbols-outlined">arrow_back</span> Back to Cart
        </button>

        <h2 className="text-xl font-bold mb-4" style={{ color: brand.colors.fontHeader }}>Payment</h2>

        {/* Order Summary */}
        <div className="rounded-lg border p-4 mb-4" style={{ backgroundColor: brand.colors.background || '#FFFFFF' }}>
          <h3 className="font-semibold text-sm mb-3" style={{ color: brand.colors.fontHeader }}>Order Summary</h3>
          <div className="space-y-2">
            {items.map((item) => (
              <div key={item.id} className="flex justify-between text-sm">
                <span style={{ color: brand.colors.fontBody }}>{item.productName} x{item.quantity}</span>
                <span style={{ color: brand.colors.fontBody }}>₹{(item.price * item.quantity).toFixed(2)}</span>
              </div>
            ))}
            <div className="border-t pt-2 mt-2">
              {showGSTBreakdownCheckout ? (
                <>
                  <div className="flex justify-between text-sm">
                    <span style={{ color: brand.colors.fontBody }}>Subtotal</span>
                    <span style={{ color: brand.colors.fontBody }}>₹{subtotal.toFixed(2)}</span>
                  </div>
                  {enableGST && (
                    <div className="flex justify-between text-sm">
                      <span style={{ color: brand.colors.fontBody }}>{taxLabel} ({gstRate}%)</span>
                      <span style={{ color: brand.colors.fontBody }}>₹{gst.toFixed(2)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-sm">
                    <span style={{ color: brand.colors.fontBody }}>Delivery</span>
                    <span style={{ color: brand.colors.fontBody }}>{delivery === 0 ? 'FREE' : `₹${delivery.toFixed(2)}`}</span>
                  </div>
                </>
              ) : null}
              <div className="flex justify-between font-bold mt-2 pt-2 border-t">
                <span style={{ color: brand.colors.fontBody }}>Total</span>
                <span style={{ color: brand.colors.primary }}>₹{total.toFixed(2)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Delivery Address */}
        <div className="rounded-lg border p-4 mb-4" style={{ backgroundColor: brand.colors.background || '#FFFFFF' }}>
          <h3 className="font-semibold text-sm mb-2" style={{ color: brand.colors.fontHeader }}>Deliver To</h3>
          {currentAddress ? (
            <p className="text-sm" style={{ color: brand.colors.fontBody }}>
              <span className="font-medium" style={{ color: brand.colors.fontBody }}>{currentAddress.recipientName}</span><br />
              {currentAddress.addressLine1}{currentAddress.addressLine2 && `, ${currentAddress.addressLine2}`}<br />
              {currentAddress.city}, {currentAddress.state} - {currentAddress.pincode}<br />
              <span className="text-xs">{currentAddress.recipientMobile}</span>
            </p>
          ) : (
            <p className="text-sm text-[#ba1a1a]">No address selected</p>
          )}
        </div>

        {/* Payment Methods - From Step 4 */}
        <div className="rounded-lg border p-4 mb-4" style={{ backgroundColor: brand.colors.background || '#FFFFFF' }}>
          <h3 className="font-semibold text-sm mb-3" style={{ color: brand.colors.fontHeader }}>Select Payment Method</h3>
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
                    onChange={() => setSelectedPayment(method.id)}
                    className="w-4 h-4 text-[#006d2f]"
                  />
                  <span className="material-symbols-outlined text-[#556067]">{method.icon}</span>
                  <span className="text-sm" style={{ color: brand.colors.fontBody }}>{method.label}</span>
                </label>
              ))}
            </div>
          )}
          {selectedPayment === 'upi' && payment?.upiId && (
            <div className="mt-3 p-3 bg-[#f2f4f7] rounded-lg flex flex-col items-center gap-2">
              {(() => {
                const isValidVpa = /^[\w.\-]{2,256}@[a-zA-Z]{2,64}$/.test(payment.upiId.trim());
                // ✅ tr (transaction reference) is recommended by the NPCI
                // UPI spec and expected by several apps for a reliable
                // payment request — was missing before.
                const txnRef = `TXN${Date.now()}`;
                const upiUri = `upi://pay?pa=${encodeURIComponent(payment.upiId.trim())}&pn=${encodeURIComponent(brand?.name || 'Store')}&am=${total.toFixed(2)}&cu=INR&tn=${encodeURIComponent('Order Payment')}&tr=${txnRef}`;

                return (
                  <>
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
                    {!isValidVpa && (
                      <p className="text-xs text-[#ba1a1a] text-center max-w-[220px]">
                        This UPI ID doesn't look like a real registered VPA (e.g. name@okhdfcbank, name@ybl) — a real UPI app will reject it as "invalid beneficiary." Update it in Step 4 with a genuine UPI ID to test scanning.
                      </p>
                    )}
                  </>
                );
              })()}
              {payment?.showUPIId && (
                <p className="text-sm" style={{ color: brand.colors.fontBody }}>
                  UPI ID: <span className="font-semibold" style={{ color: brand.colors.fontBody }}>{payment.upiId}</span>
                </p>
              )}
            </div>
          )}
        </div>

        <button
          onClick={handlePlaceOrder}
          disabled={paymentMethods.length === 0 || placingOrder}
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
      <h2 className="text-xl font-bold mb-4" style={{ color: brand.colors.fontHeader }}>
        My Cart ({items.length} {items.length === 1 ? 'item' : 'items'})
      </h2>

      {items.length > 0 && freeDelivery && showProgressBar && remainingForFree > 0 && (
        <div className="mb-4 p-3 bg-[#f2f4f7] rounded-lg">
          <p className="text-sm" style={{ color: brand.colors.fontBody }}>
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
        <div className="text-center py-12" style={{ color: brand.colors.fontBody }}>
          <span className="material-symbols-outlined text-6xl block mb-4 opacity-30">shopping_cart</span>
          <p>Your cart is empty</p>
          <p className="text-sm mt-2">Add some products from the Home tab</p>
        </div>
      ) : (
        <>
          <div className="space-y-3 mb-4">
            {items.map((item) => {
              const itemTotal = item.price * item.quantity;
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
                    <h4 className="font-semibold text-sm" style={{ color: brand.colors.fontHeader }}>
                      {item.productName}
                    </h4>
                    <p className="text-xs" style={{ color: brand.colors.fontBody }}>
                      {item.sizeLabel} • {item.variationName}
                    </p>
                    <p className="text-sm font-bold" style={{ color: brand.colors.primary }}>
                      ₹{itemTotal.toFixed(2)}
                    </p>
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

          {/* Delivery Address - From the shared address book (Step 5 config) */}
          <div className="rounded-lg border p-4 mb-4" style={{ backgroundColor: brand.colors.background || '#FFFFFF' }}>
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-semibold" style={{ color: brand.colors.fontHeader }}>
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
              <p className="text-sm" style={{ color: brand.colors.fontBody }}>
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
                <p className="text-xs font-semibold" style={{ color: brand.colors.fontBody }}>Select Delivery Address</p>
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
                    <p className="text-sm font-medium" style={{ color: brand.colors.fontHeader }}>
                      {addr.label}
                    </p>
                    <p className="text-xs" style={{ color: brand.colors.fontBody }}>
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
          </div>

          {/* Bill Details */}
          <div className="rounded-lg border p-4" style={{ backgroundColor: brand.colors.background || '#FFFFFF' }}>
            <h3 className="font-semibold text-sm mb-3" style={{ color: brand.colors.fontHeader }}>
              Bill Details
            </h3>
            <div className="space-y-2">
              {showGSTBreakdownCart ? (
                <>
                  <div className="flex justify-between text-sm">
                    <span style={{ color: brand.colors.fontBody }}>Subtotal</span>
                    <span style={{ color: brand.colors.fontBody }}>₹{subtotal.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span style={{ color: brand.colors.fontBody }}>Delivery</span>
                    <span style={{ color: brand.colors.fontBody }}>
                      {delivery === 0 ? 'FREE' : `₹${delivery.toFixed(2)}`}
                    </span>
                  </div>
                  {enableGST && (
                    <div className="flex justify-between text-sm">
                      <span style={{ color: brand.colors.fontBody }}>{taxLabel} ({gstRate}%)</span>
                      <span style={{ color: brand.colors.fontBody }}>₹{gst.toFixed(2)}</span>
                    </div>
                  )}
                </>
              ) : null}
              <div className="border-t pt-2 flex justify-between font-bold">
                <span style={{ color: brand.colors.fontBody }}>Total</span>
                <span style={{ color: brand.colors.primary }}>₹{total.toFixed(2)}</span>
              </div>
            </div>
          </div>

          <button
            onClick={handleCheckout}
            className="w-full mt-4 py-3 rounded-lg font-bold text-white transition-opacity hover:opacity-90"
            style={{ backgroundColor: brand.colors.button || '#25D366' }}
          >
            Proceed to Checkout
          </button>
        </>
      )}
    </div>
  );
};

export default PreviewCartTab;
