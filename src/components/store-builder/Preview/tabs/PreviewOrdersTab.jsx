import React, { useState } from 'react';
import { getOrderStatusColor, getOrderStatusIcon } from '../utils/mockOrders';

const PreviewOrdersTab = ({ data, cancelOrder }) => {
  const [filter, setFilter] = useState('all');
  const [cancellingOrderId, setCancellingOrderId] = useState(null);
  const [cancelReason, setCancelReason] = useState('');

  const orders = data.orders || [];
  const brandColors = data.brand?.colors || {};
  const orderConfig = data.orderConfig || {};

  const filteredOrders = filter === 'all'
    ? orders
    : orders.filter(order => order.status === filter);

  const filters = [
    { id: 'all', label: 'All Orders' },
    { id: 'pending', label: 'Pending' },
    { id: 'processing', label: 'Processing' },
    { id: 'out-for-delivery', label: 'Out for Delivery' },
    { id: 'delivered', label: 'Delivered' },
    { id: 'cancelled', label: 'Cancelled' },
  ];

  // Whether this specific order is still eligible for cancellation, per Step 6 rules
  const canCancelOrder = (order) => {
    if (!orderConfig.enableCancellation) return false;
    if (order.status === 'cancelled' || order.status === 'delivered') return false;
    if (orderConfig.cancelOnlyConfirmed && order.status !== 'pending') return false;
    return true;
  };

  const handleCancelClick = (order) => {
    if (orderConfig.showCancelReason) {
      setCancellingOrderId(order.id);
      setCancelReason('');
    } else {
      if (window.confirm('Cancel this order?')) {
        cancelOrder(order.id, '');
      }
    }
  };

  const confirmCancel = (orderId) => {
    cancelOrder(orderId, cancelReason);
    setCancellingOrderId(null);
    setCancelReason('');
  };

  return (
    <div className="p-4 max-w-3xl mx-auto">
      <h2 className="text-xl font-bold mb-2" style={{ color: brandColors.font }}>
        My Orders
      </h2>
      <p className="text-sm mb-4" style={{ color: brandColors.secondary }}>
        Orders placed in this preview session.
      </p>

      {/* Filter Tabs */}
      <div className="flex flex-wrap gap-2 mb-4">
        {filters.map((f) => (
          <button
            key={f.id}
            onClick={() => setFilter(f.id)}
            className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
              filter === f.id
                ? 'text-white'
                : 'border'
            }`}
            style={filter === f.id
              ? { backgroundColor: brandColors.primary || '#25D366' }
              : { borderColor: brandColors.secondary || '#e0e3e6', color: brandColors.secondary }
            }
          >
            {f.label}
          </button>
        ))}
      </div>

      {filteredOrders.length === 0 ? (
        <div className="text-center py-12" style={{ color: brandColors.secondary }}>
          <span className="material-symbols-outlined text-6xl block mb-4 opacity-30">receipt_long</span>
          {orders.length === 0 ? (
            <>
              <p>No orders yet</p>
              <p className="text-sm mt-2">Orders placed from the Cart tab will show up here — this is exactly what your customer will see.</p>
            </>
          ) : (
            <p>No {filter !== 'all' ? filter : ''} orders found</p>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {filteredOrders.map((order) => {
            const statusColor = getOrderStatusColor(order.status);
            const statusIcon = getOrderStatusIcon(order.status);
            const isCancelling = cancellingOrderId === order.id;

            return (
              <div key={order.id} className="bg-white rounded-lg border p-4">
                {/* Order Header */}
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <p className="text-xs" style={{ color: brandColors.secondary }}>
                      ORDER ID
                    </p>
                    <p className="font-mono text-sm font-semibold" style={{ color: brandColors.font }}>
                      {order.id}
                    </p>
                  </div>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusColor}`}>
                    <span className="material-symbols-outlined text-xs align-middle mr-1">
                      {statusIcon}
                    </span>
                    {order.statusText}
                  </span>
                </div>

                {/* Status Timeline - From Step 6 */}
                {orderConfig.showStatusTimeline && order.status !== 'cancelled' && (
                  <div className="flex items-center gap-1 py-2">
                    {['pending', 'processing', 'out-for-delivery', 'delivered'].map((step, idx, arr) => {
                      const stepOrder = ['pending', 'processing', 'out-for-delivery', 'delivered'];
                      const currentIdx = stepOrder.indexOf(order.status);
                      const isActive = idx <= currentIdx;
                      return (
                        <React.Fragment key={step}>
                          <div
                            className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                            style={{ backgroundColor: isActive ? (brandColors.primary || '#25D366') : '#e0e3e6' }}
                          />
                          {idx < arr.length - 1 && (
                            <div
                              className="flex-1 h-0.5"
                              style={{ backgroundColor: idx < currentIdx ? (brandColors.primary || '#25D366') : '#e0e3e6' }}
                            />
                          )}
                        </React.Fragment>
                      );
                    })}
                  </div>
                )}

                {/* Order Items */}
                {order.items.map((item, idx) => (
                  <div key={idx} className="py-2 border-t border-[#f2f4f7]">
                    <div className="flex justify-between">
                      <div>
                        <p className="font-medium text-sm" style={{ color: brandColors.font }}>
                          {item.name}
                        </p>
                        <p className="text-xs" style={{ color: brandColors.secondary }}>
                          {item.weight} • {item.quantity} {item.quantity === 1 ? 'unit' : 'units'}
                        </p>
                      </div>
                      <p className="font-bold text-sm" style={{ color: brandColors.primary }}>
                        ₹{item.total.toFixed(2)}
                      </p>
                    </div>
                  </div>
                ))}

                {/* Delivery Address */}
                {order.deliveryAddress && (
                  <div className="pt-2 border-t border-[#f2f4f7] mt-2">
                    <p className="text-xs" style={{ color: brandColors.secondary }}>
                      Delivering to: {order.deliveryAddress}
                    </p>
                  </div>
                )}

                {order.paymentMethodLabel && (
                  <p className="text-xs mt-1" style={{ color: brandColors.secondary }}>
                    Payment: {order.paymentMethodLabel}
                  </p>
                )}

                {order.status === 'cancelled' && order.cancelReason && (
                  <p className="text-xs mt-1 text-[#ba1a1a]">
                    Cancellation reason: {order.cancelReason}
                  </p>
                )}

                {/* Order Footer */}
                <div className="flex justify-between items-center mt-3 pt-3 border-t border-[#f2f4f7]">
                  <div>
                    {order.status === 'out-for-delivery' && orderConfig.showEstimatedDelivery && order.estimatedDelivery && (
                      <p className="text-sm font-medium" style={{ color: brandColors.primary }}>
                        Arriving in approx. {order.estimatedDelivery}
                      </p>
                    )}
                    <p className="text-xs" style={{ color: brandColors.secondary }}>
                      {order.date}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    {canCancelOrder(order) && (
                      <button
                        onClick={() => handleCancelClick(order)}
                        className="px-3 py-1 text-xs font-semibold rounded-lg border text-[#ba1a1a] border-[#ba1a1a]/30 hover:bg-[#ffdad6]/50"
                      >
                        Cancel Order
                      </button>
                    )}
                    <button
                      className="px-3 py-1 text-xs font-semibold rounded-lg border"
                      style={{ borderColor: brandColors.secondary, color: brandColors.secondary }}
                    >
                      View Details
                    </button>
                    {order.status === 'delivered' && (
                      <button
                        className="px-3 py-1 text-xs font-semibold rounded-lg"
                        style={{ backgroundColor: brandColors.primary, color: brandColors.buttonLabel || '#005523' }}
                      >
                        Reorder
                      </button>
                    )}
                  </div>
                </div>

                {/* Cancellation reason prompt */}
                {isCancelling && (
                  <div className="mt-3 pt-3 border-t border-[#f2f4f7]">
                    <label className="block text-xs font-medium mb-1" style={{ color: brandColors.secondary }}>
                      Reason for cancellation
                    </label>
                    <textarea
                      value={cancelReason}
                      onChange={(e) => setCancelReason(e.target.value)}
                      className="w-full border rounded-lg px-3 py-2 text-sm mb-2"
                      style={{ borderColor: brandColors.secondary }}
                      rows={2}
                      placeholder="Let us know why (optional)"
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={() => confirmCancel(order.id)}
                        className="flex-1 py-2 rounded-lg text-sm font-semibold text-white"
                        style={{ backgroundColor: '#ba1a1a' }}
                      >
                        Confirm Cancellation
                      </button>
                      <button
                        onClick={() => setCancellingOrderId(null)}
                        className="flex-1 py-2 rounded-lg text-sm font-semibold border"
                        style={{ borderColor: brandColors.secondary, color: brandColors.secondary }}
                      >
                        Keep Order
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default PreviewOrdersTab;
