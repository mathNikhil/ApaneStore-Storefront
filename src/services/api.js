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
