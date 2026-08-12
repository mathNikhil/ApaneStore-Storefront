const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5002';

// Fetches a published store's config by subdomain. Public — no auth token,
// since this is what real shoppers hit.
export const publicStoreAPI = {
    getBySubdomain: async (subdomain) => {
        const response = await fetch(`${API_BASE_URL}/api/public/store/${subdomain}`);
        return response.json();
    },
};

// Store-scoped customer auth — same as the builder's preview, since this IS
// the same login flow the tenant already tested there.
export const customerAuthAPI = {
    sendOTP: async (storeId, phone) => {
        const response = await fetch(`${API_BASE_URL}/api/store/${storeId}/auth/otp/send`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ phone }),
        });
        return response.json();
    },
    verifyOTP: async (storeId, phone, otp) => {
        const response = await fetch(`${API_BASE_URL}/api/store/${storeId}/auth/otp/verify`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ phone, otp }),
        });
        return response.json();
    },
};

// ✅ Real return requests — replaces the fake alert() the storefront had before.
export const customerReturnAPI = {
    create: async (storeId, token, orderId, reason) => {
        const response = await fetch(`${API_BASE_URL}/api/store/${storeId}/orders/${orderId}/return`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify({ reason }),
        });
        return response.json();
    },
    getForOrder: async (storeId, token, orderId) => {
        const response = await fetch(`${API_BASE_URL}/api/store/${storeId}/orders/${orderId}/return`, {
            headers: { 'Authorization': `Bearer ${token}` },
        });
        return response.json();
    },
    uploadPhoto: async (storeId, token, orderId, file) => {
        const formData = new FormData();
        formData.append('image', file);
        const response = await fetch(`${API_BASE_URL}/api/store/${storeId}/orders/${orderId}/return/photos`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}` },
            body: formData,
        });
        return response.json();
    },
    submitCustomerShipping: async (storeId, token, orderId, courierName, trackingNumber) => {
        const response = await fetch(`${API_BASE_URL}/api/store/${storeId}/orders/${orderId}/return/customer-shipping`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify({ courierName, trackingNumber }),
        });
        return response.json();
    },
};

// ✅ Real customer profile + address book — replaces entirely local-only
// fake data that was never sent to the backend.
export const customerProfileAPI = {
    getMe: async (storeId, token) => {
        const response = await fetch(`${API_BASE_URL}/api/store/${storeId}/customers/me`, {
            headers: { 'Authorization': `Bearer ${token}` },
        });
        return response.json();
    },
    updateMe: async (storeId, token, data) => {
        const response = await fetch(`${API_BASE_URL}/api/store/${storeId}/customers/me`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify(data),
        });
        return response.json();
    },
    addAddress: async (storeId, token, address) => {
        const response = await fetch(`${API_BASE_URL}/api/store/${storeId}/customers/me/addresses`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify(address),
        });
        return response.json();
    },
    updateAddress: async (storeId, token, addressId, address) => {
        const response = await fetch(`${API_BASE_URL}/api/store/${storeId}/customers/me/addresses/${addressId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify(address),
        });
        return response.json();
    },
    deleteAddress: async (storeId, token, addressId) => {
        const response = await fetch(`${API_BASE_URL}/api/store/${storeId}/customers/me/addresses/${addressId}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` },
        });
        return response.json();
    },
    setDefaultAddress: async (storeId, token, addressId) => {
        const response = await fetch(`${API_BASE_URL}/api/store/${storeId}/customers/me/addresses/${addressId}/default`, {
            method: 'PUT',
            headers: { 'Authorization': `Bearer ${token}` },
        });
        return response.json();
    },
};

// ✅ Real order creation — replaces the old local-only placeOrder() that
// never actually saved anything. Requires the customer's token from login.
export const customerOrderAPI = {
    create: async (storeId, token, orderData) => {
        const response = await fetch(`${API_BASE_URL}/api/store/${storeId}/orders`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`,
            },
            body: JSON.stringify(orderData),
        });
        return response.json();
    },
    getMine: async (storeId, token) => {
        const response = await fetch(`${API_BASE_URL}/api/store/${storeId}/orders/mine`, {
            headers: { 'Authorization': `Bearer ${token}` },
        });
        return response.json();
    },
};
