import React, { useState } from 'react';
import { getOrderStatusColor, getOrderStatusIcon } from '../utils/mockOrders';

const PreviewOrdersTab = ({ data, cancelOrder, addToCart, onGoToCart }) => {
  const [filter, setFilter] = useState('all');
  const [showReturnModal, setShowReturnModal] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [returnReason, setReturnReason] = useState('');
  const [returnComment, setReturnComment] = useState('');
  const [returnPhotos, setReturnPhotos] = useState([]);

  // SAFE: No optional chaining
  const orders = data && data.orders ? data.orders : [];
  const brandColors = data && data.brand && data.brand.colors ? data.brand.colors : {};
  const returnConfig = data && data.return ? data.return : {};

  // Check if returns are enabled
  const isReturnEnabled = returnConfig.isEnabled !== undefined ? returnConfig.isEnabled : true;

  // Get return window in days
  const returnWindowDays = returnConfig.returnWindowDays || 7;

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

  const handleReturnSubmit = function() {
    alert('Return request submitted!');
    setShowReturnModal(false);
    setSelectedOrder(null);
    setReturnReason('');
    setReturnComment('');
    setReturnPhotos([]);
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
              className="px-3 py-1.5 rounded-full text-sm font-medium transition-colors"
              style={isActive
                ? { backgroundColor: getPrimaryColor(), color: getButtonLabelColor() }
                : { backgroundColor: getSecondaryColor(), color: getFontBodyColor() }
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
                      <div className="flex justify-between">
                        <div>
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
                        className="px-3 py-1 text-xs font-semibold rounded-lg"
                        style={{ backgroundColor: getPrimaryColor(), color: getButtonLabelColor() }}
                      >
                        <span className="material-symbols-outlined text-xs align-middle mr-1">gps_fixed</span>
                        Track Driver
                      </button>
                    )}
                    {order.status === 'delivered' && eligibleForReturn && (
                      <button
                        onClick={function() { handleReturnClick(order); }}
                        className="px-3 py-1 text-xs font-semibold rounded-lg"
                        style={{ backgroundColor: getPrimaryColor(), color: getButtonLabelColor() }}
                      >
                        <span className="material-symbols-outlined text-xs align-middle mr-1">undo</span>
                        Return
                      </button>
                    )}
                    <button
                      className="px-3 py-1 text-xs font-semibold rounded-lg border"
                      style={{ borderColor: getSecondaryColor(), color: getPrimaryColor() }}
                    >
                      View Details
                    </button>
                    {order.status === 'delivered' && (
                      <button
                        onClick={function() { handleReorder(order); }}
                        className="px-3 py-1 text-xs font-semibold rounded-lg"
                        style={{ backgroundColor: getPrimaryColor(), color: getButtonLabelColor() }}
                      >
                        Reorder
                      </button>
                    )}
                  </div>
                </div>

                {/* Return Window Info */}
                {order.status === 'delivered' && !eligibleForReturn && isReturnEnabled && (
                  <div className="mt-2 text-xs text-[#556067]">
                    Return window has expired ({returnWindowDays} days from delivery)
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

            <div className="mt-4 space-y-4">
              {/* Items to return */}
              <div>
                <p className="text-sm font-semibold" style={{ color: getFontHeaderColor() }}>Select Items to Return</p>
                {selectedOrder.items.map(function(item, idx) {
                  return (
                    <label key={idx} className="flex items-center gap-3 p-2 border rounded-lg mt-2">
                      <input
                        type="checkbox"
                        className="w-4 h-4 text-[#006d2f] rounded"
                        defaultChecked={idx === 0}
                      />
                      <div>
                        <p className="text-sm font-medium" style={{ color: getFontHeaderColor() }}>{item.name}</p>
                        <p className="text-xs" style={{ color: getFontBodyColor() }}>{item.weight} • ₹{item.price}</p>
                      </div>
                    </label>
                  );
                })}
              </div>

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

              {/* Comments */}
              <div>
                <p className="text-sm font-semibold" style={{ color: getFontHeaderColor() }}>Comments (Optional)</p>
                <textarea
                  value={returnComment}
                  onChange={function(e) { setReturnComment(e.target.value); }}
                  placeholder="Describe the issue..."
                  className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#25D366] min-h-[80px] mt-1"
                />
              </div>

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
                  className="flex-1 py-2 rounded-lg font-semibold text-white"
                  style={{ backgroundColor: getPrimaryColor() }}
                >
                  Submit Return Request
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