import React, { useState, useEffect } from 'react';
import { getOrderStatusColor, getOrderStatusIcon } from '../utils/mockOrders';
import { customerReturnAPI } from '../../../../services/api';

const RETURN_STATUS_LABELS = {
  requested: 'Pending Review',
  approved: 'Approved',
  rejected: 'Rejected',
  parcel_received: 'Parcel Received',
  refund_initiated: 'Refund Initiated',
  refunded: 'Refunded',
};

const PreviewOrdersTab = ({ data, cancelOrder, addToCart, onGoToCart, storeId, customerToken }) => {
  const [filter, setFilter] = useState('all');
  const [showReturnModal, setShowReturnModal] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [returnReason, setReturnReason] = useState('');
  const [returnPhotos, setReturnPhotos] = useState([]);
  const [submittingReturn, setSubmittingReturn] = useState(false);
  // ✅ Real return status per order, replacing the old fake alert()-only flow.
  const [returnStatuses, setReturnStatuses] = useState({}); // { [orderId]: returnRecord | null }
  const [shippingFormOrderId, setShippingFormOrderId] = useState(null);
  const [shippingCourier, setShippingCourier] = useState('');
  const [shippingTracking, setShippingTracking] = useState('');
  const [submittingShipping, setSubmittingShipping] = useState(false);
  const [expandedOrderId, setExpandedOrderId] = useState(null);

  // SAFE: No optional chaining
  const orders = data && data.orders ? data.orders : [];
  const brandColors = data && data.brand && data.brand.colors ? data.brand.colors : {};
  const returnConfig = data && data.return ? data.return : {};

  // Check if returns are enabled
  const isReturnEnabled = returnConfig.isEnabled !== undefined ? returnConfig.isEnabled : true;

  // Get return window in days
  const returnWindowDays = returnConfig.returnWindowDays || 7;

  // ✅ Fetch real return status for every delivered order — this is what
  // actually shows the customer what the operator did (approved, rejected
  // + reason, parcel received, refund initiated, refunded) instead of the
  // request silently vanishing after the old fake alert().
  useEffect(() => {
    if (!storeId || !customerToken) return;
    const deliveredOrders = orders.filter((o) => o.status === 'delivered');
    deliveredOrders.forEach((order) => {
      if (returnStatuses[order.id] !== undefined) return; // already fetched
      customerReturnAPI.getForOrder(storeId, customerToken, order.id).then((result) => {
        if (result.success) {
          setReturnStatuses((prev) => ({ ...prev, [order.id]: result.data }));
        }
      });
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orders, storeId, customerToken]);

  // Check if order is within return window
  const isWithinReturnWindow = (deliveredAt) => {
    if (!deliveredAt) return false;
    const deliveredDate = new Date(deliveredAt);
    const currentDate = new Date();
    const diffDays = Math.floor((currentDate - deliveredDate) / (1000 * 60 * 60 * 24));
    return diffDays <= returnWindowDays;
  };

  // Check if order is eligible for return
  const isEligibleForReturn = (order) => {
    return isReturnEnabled && order.status === 'delivered' && isWithinReturnWindow(order.deliveredAt);
  };

  const filteredOrders = filter === 'all'
    ? orders
    : orders.filter(function(order) { return order.status === filter; });

  const handleReturnClick = function(order) {
    setSelectedOrder(order);
    setReturnReason('');
    setReturnPhotos([]);
    setShowReturnModal(true);
  };

  // ✅ Re-adds this order's items to the cart using CURRENT catalog pricing
  // and the same quantities — not the historical price at time of order.
  // Items that no longer exist in the catalog (removed/discontinued since)
  // are skipped, with a clear notice rather than silently failing.
  const handleReorder = function(order) {
    if (!addToCart) return;
    const categories = data && data.categories ? data.categories : [];

    let addedCount = 0;
    let skippedCount = 0;

    order.items.forEach(function (item) {
      if (!item.productId) {
        skippedCount++;
        return;
      }
      let foundProduct = null;
      for (const category of categories) {
        const match = (category.products || []).find(function (p) { return p.id === item.productId; });
        if (match) { foundProduct = match; break; }
      }
      if (!foundProduct) {
        skippedCount++;
        return;
      }
      for (let i = 0; i < item.quantity; i++) {
        addToCart(foundProduct, item.variationId, item.sizeId);
      }
      addedCount++;
    });

    if (addedCount > 0 && onGoToCart) {
      onGoToCart();
    }
    if (skippedCount > 0) {
      alert(
        skippedCount + ' item(s) from this order are no longer available and were skipped.' +
        (addedCount > 0 ? ' The rest were added to your cart at current pricing.' : '')
      );
    }
  };

  const handleReturnSubmit = async function() {
    if (!selectedOrder || !storeId || !customerToken) return;

    if (returnConfig.requireReason && !returnReason) {
      alert('Please select a return reason');
      return;
    }
    if (returnConfig.requirePhotos && returnPhotos.length === 0) {
      alert('Please upload at least one photo');
      return;
    }

    setSubmittingReturn(true);
    try {
      const result = await customerReturnAPI.create(storeId, customerToken, selectedOrder.id, returnReason || 'other');
      if (!result.success) {
        alert(result.error || 'Failed to submit return request');
        return;
      }

      // Upload photos one at a time — the return itself is already
      // created even if a photo upload fails, but the customer needs to
      // actually be told if one didn't go through, not have it silently
      // vanish. A failed upload comes back as a normal {success: false}
      // response, not a thrown error, so it has to be checked explicitly —
      // a try/catch alone would never have caught it.
      let failedPhotoCount = 0;
      for (const file of returnPhotos) {
        try {
          const photoResult = await customerReturnAPI.uploadPhoto(storeId, customerToken, selectedOrder.id, file);
          if (!photoResult.success) {
            failedPhotoCount++;
            console.error('Photo upload failed:', photoResult.error);
          }
        } catch (err) {
          failedPhotoCount++;
          console.error('Photo upload failed:', err);
        }
      }
      if (failedPhotoCount > 0) {
        alert(`Your return was submitted, but ${failedPhotoCount} photo(s) failed to upload. You can add them later if needed.`);
      }

      const refreshed = await customerReturnAPI.getForOrder(storeId, customerToken, selectedOrder.id);
      if (refreshed.success) {
        setReturnStatuses((prev) => ({ ...prev, [selectedOrder.id]: refreshed.data }));
      }

      setShowReturnModal(false);
      setSelectedOrder(null);
      setReturnReason('');
      setReturnPhotos([]);
    } catch (error) {
      alert(error.message || 'Failed to submit return request');
    } finally {
      setSubmittingReturn(false);
    }
  };

  // ✅ Customer-pays flow: after the return is approved, the customer
  // shares their own courier + tracking number.
  const handleSubmitShipping = async function(orderId) {
    if (!shippingCourier.trim() || !shippingTracking.trim()) {
      alert('Please enter both courier name and tracking number');
      return;
    }
    setSubmittingShipping(true);
    try {
      const result = await customerReturnAPI.submitCustomerShipping(storeId, customerToken, orderId, shippingCourier.trim(), shippingTracking.trim());
      if (result.success) {
        setReturnStatuses((prev) => ({ ...prev, [orderId]: result.data }));
        setShippingFormOrderId(null);
        setShippingCourier('');
        setShippingTracking('');
      } else {
        alert(result.error || 'Failed to save shipping details');
      }
    } catch (error) {
      alert(error.message || 'Failed to save shipping details');
    } finally {
      setSubmittingShipping(false);
    }
  };

  const filters = [
    { id: 'all', label: 'All Orders' },
    { id: 'pending', label: 'Pending' },
    { id: 'processing', label: 'Processing' },
    { id: 'out-for-delivery', label: 'Out for Delivery' },
    { id: 'delivered', label: 'Delivered' },
  ];

  // Helper to get primary color with fallback
  const getPrimaryColor = function() {
    return brandColors.primary ? brandColors.primary : '#25D366';
  };

  // Helper to get secondary color with fallback (UI state — borders, inactive fills)
  const getSecondaryColor = function() {
    return brandColors.secondary ? brandColors.secondary : '#E0E3E6';
  };

  // ✅ New color system: fontHeader for headings/emphasized labels
  // (previously getFontColor, which read the old single "font" field)
  const getFontHeaderColor = function() {
    return brandColors.fontHeader ? brandColors.fontHeader : (brandColors.font ? brandColors.font : '#191C1E');
  };

  // ✅ New: fontBody for regular/muted text (previously wrongly pulled
  // from getSecondaryColor, which is now a UI-state color, not text)
  const getFontBodyColor = function() {
    return brandColors.fontBody ? brandColors.fontBody : '#556067';
  };

  const getBackgroundColor = function() {
    return brandColors.background ? brandColors.background : '#FFFFFF';
  };

  // Helper to get button label color with fallback
  const getButtonLabelColor = function() {
    return brandColors.buttonLabel ? brandColors.buttonLabel : '#005523';
  };

  return (
    <div className="p-4 max-w-3xl mx-auto pb-24">
      <h2 className="text-xl font-bold mb-2" style={{ color: getFontHeaderColor() }}>
        My Orders
      </h2>
      <p className="text-sm mb-4" style={{ color: getFontBodyColor() }}>
        Track and manage your customer fulfillments.
      </p>

      {/* Filter Tabs */}
      <div className="flex flex-wrap gap-2 mb-4">
        {filters.map(function(f) {
          var isActive = filter === f.id;
          return (
            <button
              key={f.id}
              onClick={function() { setFilter(f.id); }}
              className="px-3 py-1.5 rounded-full text-sm font-medium transition-colors border-2 bg-transparent"
              style={isActive
                ? { borderColor: getPrimaryColor(), color: getPrimaryColor() }
                : { borderColor: getSecondaryColor(), color: getFontBodyColor() }
              }
            >
              {f.label}
            </button>
          );
        })}
      </div>

      {filteredOrders.length === 0 ? (
        <div className="text-center py-12" style={{ color: getFontBodyColor() }}>
          <span className="material-symbols-outlined text-6xl block mb-4 opacity-30">receipt_long</span>
          <p>{filter !== 'all' ? filter : ''} orders found</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredOrders.map(function(order) {
            var statusColor = getOrderStatusColor(order.status);
            var statusIcon = getOrderStatusIcon(order.status);
            var eligibleForReturn = isEligibleForReturn(order);
            var returnRecord = returnStatuses[order.id];
            var hasReturn = !!returnRecord;

            return (
              <div key={order.id} className="rounded-lg border p-4" style={{ backgroundColor: getBackgroundColor() }}>
                {/* Order Header */}
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <p className="text-xs" style={{ color: getFontBodyColor() }}>
                      ORDER ID
                    </p>
                    <p className="font-mono text-sm font-semibold" style={{ color: getFontHeaderColor() }}>
                      {order.id}
                    </p>
                  </div>
                  <span className={'px-2 py-1 rounded-full text-xs font-medium ' + statusColor}>
                    <span className="material-symbols-outlined text-xs align-middle mr-1">
                      {statusIcon}
                    </span>
                    {order.statusText}
                  </span>
                </div>

                {/* Order Items */}
                {order.items.map(function(item, idx) {
                  return (
                    <div key={idx} className="py-2 border-t border-[#f2f4f7]">
                      <div className="flex items-center gap-3">
                        <div className="w-14 h-14 rounded-lg bg-[#f2f4f7] flex items-center justify-center overflow-hidden flex-shrink-0">
                          {item.image ? (
                            <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                          ) : (
                            <span className="material-symbols-outlined text-[#bbcbb9] text-2xl">image</span>
                          )}
                        </div>
                        <div className="flex-1">
                          <p className="font-medium text-sm" style={{ color: getFontHeaderColor() }}>
                            {item.name}
                          </p>
                          <p className="text-xs" style={{ color: getFontBodyColor() }}>
                            {item.weight} • {item.quantity} {item.quantity === 1 ? 'unit' : 'units'}
                          </p>
                        </div>
                        <p className="font-bold text-sm" style={{ color: getPrimaryColor() }}>
                          ₹{item.total.toFixed(2)}
                        </p>
                      </div>
                    </div>
                  );
                })}

                {/* Bill Summary */}
                <div className="mt-3 pt-3 border-t border-[#f2f4f7] space-y-1">
                  {order.subtotal > 0 && (
                    <div className="flex justify-between text-xs" style={{ color: getFontBodyColor() }}>
                      <span>Subtotal</span>
                      <span>₹{order.subtotal.toFixed(2)}</span>
                    </div>
                  )}
                  {order.gst > 0 && (
                    <div className="flex justify-between text-xs" style={{ color: getFontBodyColor() }}>
                      <span>GST</span>
                      <span>₹{order.gst.toFixed(2)}</span>
                    </div>
                  )}
                  {order.delivery > 0 && (
                    <div className="flex justify-between text-xs" style={{ color: getFontBodyColor() }}>
                      <span>Delivery</span>
                      <span>₹{order.delivery.toFixed(2)}</span>
                    </div>
                  )}
                  {order.delivery === 0 && (
                    <div className="flex justify-between text-xs" style={{ color: getFontBodyColor() }}>
                      <span>Delivery</span>
                      <span className="text-green-600">FREE</span>
                    </div>
                  )}
                  <div className="flex justify-between text-sm font-bold pt-1 border-t border-[#f2f4f7]">
                    <span style={{ color: getFontBodyColor() }}>Grand Total</span>
                    <span style={{ color: getPrimaryColor() }}>₹{order.total.toFixed(2)}</span>
                  </div>
                </div>

                {/* Order Footer */}
                <div className="flex flex-wrap justify-between items-center mt-3 pt-3 border-t border-[#f2f4f7]">
                  <div>
                    <p className="text-xs" style={{ color: getFontBodyColor() }}>
                      {order.date}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {order.status === 'out-for-delivery' && order.estimatedDelivery && (
                      <button
                        className="px-3 py-1 text-xs font-semibold rounded-lg border-2 bg-transparent"
                        style={{ borderColor: getPrimaryColor(), color: getPrimaryColor() }}
                      >
                        <span className="material-symbols-outlined text-xs align-middle mr-1">gps_fixed</span>
                        Track Driver
                      </button>
                    )}
                    {order.status === 'delivered' && eligibleForReturn && !hasReturn && (
                      <button
                        onClick={function() { handleReturnClick(order); }}
                        className="px-3 py-1 text-xs font-semibold rounded-lg border-2 bg-transparent"
                        style={{ borderColor: getPrimaryColor(), color: getPrimaryColor() }}
                      >
                        <span className="material-symbols-outlined text-xs align-middle mr-1">undo</span>
                        Return
                      </button>
                    )}
                    <button
                      onClick={function() { setExpandedOrderId(expandedOrderId === order.id ? null : order.id); }}
                      className="px-3 py-1 text-xs font-semibold rounded-lg border-2 bg-transparent"
                      style={{ borderColor: getSecondaryColor(), color: getFontBodyColor() }}
                    >
                      {expandedOrderId === order.id ? 'Hide Details' : 'View Details'}
                    </button>
                    {order.status === 'delivered' && (
                      <button
                        onClick={function() { handleReorder(order); }}
                        className="px-3 py-1 text-xs font-semibold rounded-lg border-2 bg-transparent"
                        style={{ borderColor: getPrimaryColor(), color: getPrimaryColor() }}
                      >
                        Reorder
                      </button>
                    )}
                  </div>
                </div>

                {/* Return Window Info */}
                {order.status === 'delivered' && !eligibleForReturn && !hasReturn && isReturnEnabled && (
                  <div className="mt-2 text-xs text-[#556067]">
                    Return window has expired ({returnWindowDays} days from delivery)
                  </div>
                )}

                {/* Order Detail Panel */}
                {expandedOrderId === order.id && (
                  <div className="mt-3 pt-3 border-t border-[#f2f4f7] space-y-3">
                    {/* Delivery Address */}
                    <div>
                      <p className="text-xs font-semibold mb-1" style={{ color: getFontHeaderColor() }}>📍 Delivery Address</p>
                      {order.deliveryAddress ? (
                        <div className="text-sm p-3 rounded-lg bg-[#f7f9fc]" style={{ color: getFontBodyColor() }}>
                          <p className="font-medium">{order.recipientName} | {order.recipientMobile || ''}</p>
                          <p>{order.deliveryAddress}</p>
                        </div>
                      ) : (
                        <p className="text-sm" style={{ color: getFontBodyColor() }}>No address on record</p>
                      )}
                    </div>
                    {/* Payment Info */}
                    <div>
                      <p className="text-xs font-semibold mb-1" style={{ color: getFontHeaderColor() }}>💳 Payment</p>
                      <p className="text-sm" style={{ color: getFontBodyColor() }}>
                        {order.paymentMethodId === 'cod' ? 'Cash on Delivery' : order.paymentMethodId === 'upi' ? 'UPI' : order.paymentMethodId || '—'}
                      </p>
                    </div>
                  </div>
                )}

                {/* ✅ Real return status — this is what actually shows the
                    customer what the operator did, replacing the old fake
                    alert() that just made the request vanish. */}
                {hasReturn && (
                  <div className="mt-3 pt-3 border-t border-[#f2f4f7]">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="material-symbols-outlined text-sm" style={{ color: getPrimaryColor() }}>undo</span>
                      <p className="text-sm font-semibold" style={{ color: getFontHeaderColor() }}>
                        Return {returnRecord.return_id}: {RETURN_STATUS_LABELS[returnRecord.status] || returnRecord.status}
                      </p>
                    </div>
                    {returnRecord.status === 'rejected' && returnRecord.reject_reason && (
                      <p className="text-xs" style={{ color: getFontBodyColor() }}>
                        Reason: {returnRecord.reject_reason}
                      </p>
                    )}
                    {returnRecord.status === 'approved' && returnRecord.return_shipping_method === 'merchant-pays' && returnRecord.courier_name && (
                      <p className="text-xs" style={{ color: getFontBodyColor() }}>
                        Pickup arranged via {returnRecord.courier_name} ({returnRecord.tracking_number})
                        {returnRecord.pickup_date && ` on ${new Date(returnRecord.pickup_date).toLocaleDateString('en-IN')}`}
                      </p>
                    )}
                    {returnRecord.status === 'approved' && returnRecord.return_shipping_method === 'customer-pays' && !returnRecord.customer_tracking_number && (
                      shippingFormOrderId === order.id ? (
                        <div className="mt-2 space-y-2 max-w-xs">
                          <input
                            type="text"
                            placeholder="Courier name"
                            value={shippingCourier}
                            onChange={function(e) { setShippingCourier(e.target.value); }}
                            className="w-full px-3 py-1.5 border rounded-lg text-sm"
                          />
                          <input
                            type="text"
                            placeholder="Tracking number"
                            value={shippingTracking}
                            onChange={function(e) { setShippingTracking(e.target.value); }}
                            className="w-full px-3 py-1.5 border rounded-lg text-sm"
                          />
                          <div className="flex gap-2">
                            <button
                              onClick={function() { handleSubmitShipping(order.id); }}
                              disabled={submittingShipping}
                              className="px-3 py-1 text-xs font-semibold rounded-lg text-white disabled:opacity-50"
                              style={{ backgroundColor: getPrimaryColor() }}
                            >
                              {submittingShipping ? 'Saving...' : 'Save'}
                            </button>
                            <button
                              onClick={function() { setShippingFormOrderId(null); }}
                              className="px-3 py-1 text-xs font-semibold rounded-lg border"
                              style={{ borderColor: getSecondaryColor(), color: getPrimaryColor() }}
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      ) : (
                        <button
                          onClick={function() { setShippingFormOrderId(order.id); setShippingCourier(''); setShippingTracking(''); }}
                          className="mt-2 px-3 py-1 text-xs font-semibold rounded-lg border"
                          style={{ borderColor: getSecondaryColor(), color: getPrimaryColor() }}
                        >
                          Share Courier & Tracking Details
                        </button>
                      )
                    )}
                    {returnRecord.status === 'approved' && returnRecord.return_shipping_method === 'customer-pays' && returnRecord.customer_tracking_number && (
                      <p className="text-xs" style={{ color: getFontBodyColor() }}>
                        You shared: {returnRecord.customer_courier_name} ({returnRecord.customer_tracking_number})
                      </p>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Return Modal */}
      {showReturnModal && selectedOrder && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="rounded-xl max-w-md w-full max-h-[90vh] overflow-y-auto p-6" style={{ backgroundColor: getBackgroundColor() }}>
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-bold text-lg" style={{ color: getFontHeaderColor() }}>
                Return Items
              </h3>
              <button
                onClick={function() { setShowReturnModal(false); }}
                className="text-[#556067] hover:bg-[#eceef1] p-1 rounded-lg transition-colors"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <p className="text-sm" style={{ color: getFontBodyColor() }}>
              Order: {selectedOrder.id}
            </p>
            <p className="text-xs mt-1" style={{ color: getFontBodyColor() }}>
              This will request a return for the entire order.
            </p>

            <div className="mt-4 space-y-4">
              {/* Return Reason */}
              {returnConfig.requireReason && (
                <div>
                  <p className="text-sm font-semibold" style={{ color: getFontHeaderColor() }}>
                    Return Reason <span className="text-red-500">*</span>
                  </p>
                  <select
                    value={returnReason}
                    onChange={function(e) { setReturnReason(e.target.value); }}
                    className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#25D366] mt-1"
                  >
                    <option value="">Select a reason</option>
                    {returnConfig.allowedReasons && returnConfig.allowedReasons.length > 0 ? (
                      returnConfig.allowedReasons.map(function(reason) {
                        var label = reason.split('_').map(function(word) {
                          return word.charAt(0).toUpperCase() + word.slice(1);
                        }).join(' ');
                        return (
                          <option key={reason} value={reason}>{label}</option>
                        );
                      })
                    ) : (
                      <option value="other">Other</option>
                    )}
                  </select>
                </div>
              )}

              {/* Photos */}
              {returnConfig.requirePhotos && (
                <div>
                  <p className="text-sm font-semibold" style={{ color: getFontHeaderColor() }}>
                    Upload Photos <span className="text-red-500">*</span>
                  </p>
                  <div className="mt-1 flex items-center gap-2">
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      onChange={function(e) {
                        var files = Array.from(e.target.files);
                        setReturnPhotos(files);
                      }}
                      className="hidden"
                      id="return-photos"
                    />
                    <label
                      htmlFor="return-photos"
                      className="px-4 py-2 border rounded-lg cursor-pointer hover:bg-[#f2f4f7] text-sm"
                    >
                      <span className="material-symbols-outlined text-sm align-middle">upload</span>
                      Upload Photos
                    </label>
                    {returnPhotos.length > 0 && (
                      <span className="text-sm text-[#556067]">{returnPhotos.length} photo(s) selected</span>
                    )}
                  </div>
                </div>
              )}

              <div className="pt-4 border-t flex gap-2">
                <button
                  onClick={handleReturnSubmit}
                  disabled={submittingReturn}
                  className="flex-1 py-2 rounded-lg font-semibold text-white disabled:opacity-50"
                  style={{ backgroundColor: getPrimaryColor() }}
                >
                  {submittingReturn ? 'Submitting...' : 'Submit Return Request'}
                </button>
                <button
                  onClick={function() { setShowReturnModal(false); }}
                  className="px-4 py-2 rounded-lg font-semibold border"
                  style={{ borderColor: getSecondaryColor(), color: getPrimaryColor() }}
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PreviewOrdersTab;