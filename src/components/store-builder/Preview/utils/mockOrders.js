export const mockOrders = [
  {
    id: 'CKW-1703123456789',
    date: '2026-07-14',
    status: 'delivered',
    statusText: 'Delivered',
    items: [
      {
        name: 'Whole Wheat Flour',
        weight: '5kg',
        quantity: 2,
        price: 294,
        total: 588
      }
    ],
    total: 588,
    deliveryAddress: 'A-102, Green Valley Apartments, Sector 45, Gurgaon'
  },
  {
    id: 'CKW-1703123456790',
    date: '2026-07-13',
    status: 'out-for-delivery',
    statusText: 'Out for Delivery',
    estimatedDelivery: '12 mins',
    items: [
      {
        name: 'Multi-grain Mix',
        weight: '2kg',
        quantity: 3,
        price: 150,
        total: 450
      }
    ],
    total: 450,
    deliveryAddress: 'B-45, Lake View Homes, Sector 29, Gurgaon'
  },
  {
    id: 'CKW-1703123456791',
    date: '2026-07-12',
    status: 'pending',
    statusText: 'Pending',
    items: [
      {
        name: 'Organic Pearl Millet',
        weight: '1kg',
        quantity: 1,
        price: 210,
        total: 210
      },
      {
        name: 'Premium Sharbati Atta',
        weight: '5kg',
        quantity: 1,
        price: 345,
        total: 345
      }
    ],
    total: 555,
    deliveryAddress: 'C-78, Royal Palm Estate, Sector 56, Gurgaon'
  },
  {
    id: 'CKW-1703123456792',
    date: '2026-07-10',
    status: 'processing',
    statusText: 'Processing',
    items: [
      {
        name: 'Traditional MP Wheat',
        weight: '10kg',
        quantity: 1,
        price: 580,
        total: 580
      }
    ],
    total: 580,
    deliveryAddress: 'A-102, Green Valley Apartments, Sector 45, Gurgaon'
  }
];

export const getOrderStatusColor = (status) => {
  const colors = {
    delivered: 'bg-green-100 text-green-800',
    'out-for-delivery': 'bg-blue-100 text-blue-800',
    pending: 'bg-yellow-100 text-yellow-800',
    processing: 'bg-purple-100 text-purple-800',
    cancelled: 'bg-red-100 text-red-800'
  };
  return colors[status] || 'bg-gray-100 text-gray-800';
};

export const getOrderStatusIcon = (status) => {
  const icons = {
    delivered: 'check_circle',
    'out-for-delivery': 'local_shipping',
    pending: 'hourglass_top',
    processing: 'sync',
    cancelled: 'cancel'
  };
  return icons[status] || 'receipt_long';
};