import React, { useState, useEffect } from 'react';
import StorefrontApp from './components/store-builder/Preview/StorefrontApp';
import { publicStoreAPI } from './services/api';

// ✅ The backend saves brand fields as storeName/logoUrl/brandColors, but
// StorefrontApp expects brandName/logo/colors — this mismatch meant every
// real published store silently fell back to hardcoded defaults (green
// #25D366, no logo, wrong name) instead of what the tenant actually
// configured. FinalStorePreview.jsx (the builder's own preview) already
// does this same mapping correctly for its live in-memory state; this is
// the equivalent for data loaded fresh from the backend. Every other
// section (products/cart/payment/address/order/profile) already matches
// what StorefrontApp expects, so only brand needs remapping.
const mapConfigToBuilderData = (config) => ({
  ...config,
  brand: {
    brandName: config?.brand?.storeName || '',
    tagline: config?.brand?.tagline || '',
    logo: config?.brand?.logoUrl || null,
    colors: config?.brand?.brandColors || {
      primary: '#25D366',
      secondary: '#E0E3E6',
      background: '#FFFFFF',
      button: '#25D366',
      buttonLabel: '#005523',
      fontHeader: '#191C1E',
      fontBody: '#556067',
    },
    fonts: config?.brand?.fonts || { heading: 'Inter', body: 'Inter' },
    baseFontSize: config?.brand?.baseFontSize || '16px',
  },
});

// Phase 1 (local dev, no real hosting yet): which store to render comes from
// a ?store=<subdomain> query param, e.g. http://localhost:3001/?store=blue-star-4821
// Phase 2 will replace this with real subdomain/custom-domain DNS routing —
// at that point this becomes "whichever subdomain the request arrived on"
// instead of a query param, but everything below stays the same.
function App() {
  const [status, setStatus] = useState('loading'); // loading | ready | not-found | error
  const [store, setStore] = useState(null);

  useEffect(() => {
    // Real production: the tenant's subdomain is the actual hostname the
    // browser connected to (e.g. redhouse.aapnaestore.com -> "redhouse").
    // Local dev fallback: ?store=<subdomain> query param, since localhost
    // has no real subdomain to read.
    const hostname = window.location.hostname;
    const isLocalDev = hostname === 'localhost' || hostname === '127.0.0.1';

    let subdomain;
    if (isLocalDev) {
      const params = new URLSearchParams(window.location.search);
      subdomain = params.get('store');
    } else {
      // First label of the hostname, e.g. "redhouse" from
      // "redhouse.aapnaestore.com" — everything before the first dot.
      subdomain = hostname.split('.')[0];
    }

    if (!subdomain) {
      setStatus('not-found');
      return;
    }

    (async () => {
      try {
        const result = await publicStoreAPI.getBySubdomain(subdomain);
        if (result.success && result.data) {
          setStore(result.data);
          setStatus('ready');
        } else {
          setStatus('not-found');
        }
      } catch (e) {
        console.error('Failed to load store:', e);
        setStatus('error');
      }
    })();
  }, []);

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f7f9fc]">
        <span className="material-symbols-outlined animate-spin text-4xl text-[#556067]">progress_activity</span>
      </div>
    );
  }

  if (status === 'not-found') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#f7f9fc] text-center px-4">
        <span className="material-symbols-outlined text-6xl text-[#bbcbb9] mb-4">storefront</span>
        <h1 className="text-xl font-bold text-[#191c1e] mb-2">Store not found</h1>
        <p className="text-sm text-[#556067] max-w-sm">
          This store either doesn't exist or hasn't been published yet. Check the link and try again.
        </p>
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#f7f9fc] text-center px-4">
        <span className="material-symbols-outlined text-6xl text-[#ba1a1a] mb-4">cloud_off</span>
        <h1 className="text-xl font-bold text-[#191c1e] mb-2">Can't reach the store right now</h1>
        <p className="text-sm text-[#556067] max-w-sm">Check your connection and refresh.</p>
      </div>
    );
  }

  const builderData = mapConfigToBuilderData(store.config);

  return (
    <StorefrontApp
      builderData={builderData}
      storeId={store.id}
      device="desktop"
      className="min-h-screen"
      style={{ minHeight: '100vh', backgroundColor: builderData.brand.colors.background }}
    />
  );
}

export default App;
