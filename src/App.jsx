import React, { useState, useEffect } from 'react';
import StorefrontApp from './components/store-builder/Preview/StorefrontApp';
import { publicStoreAPI } from './services/api';

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
  products: {
    ...config?.products,
    addToCartLabel: config?.products?.addToCartLabel || 'Add to Cart',
    textShadow: config?.products?.banner?.textShadow !== undefined ? config.products.banner.textShadow : true,
    categoryImageShape: config?.products?.categoryImageShape || 'circle',
    categoryImageSize: config?.products?.categoryImageSize || 'S',
    autoSlideProductImages: config?.products?.autoSlideProductImages || false,
    enableImageZoom: config?.products?.enableImageZoom !== false,
  },
});

function App() {
  const [status, setStatus] = useState('loading');
  const [store, setStore] = useState(null);

  useEffect(() => {
    const hostname = window.location.hostname;
    const isLocalDev = hostname === 'localhost' || hostname === '127.0.0.1';

    let lookup; // what we'll pass to getBySubdomain

    if (isLocalDev) {
      // Local dev: ?store=<subdomain>
      const params = new URLSearchParams(window.location.search);
      lookup = params.get('store');
    } else if (hostname.endsWith('.aapnaestore.com')) {
      // Aapna eStore subdomain: e.g. test2.aapnaestore.com → 'test2'
      lookup = hostname.split('.')[0];
    } else {
      // Custom domain: e.g. apanestore.com or www.apanestore.com
      // Pass the full hostname — backend will match against store_domain_config
      lookup = hostname;
    }

    if (!lookup) {
      setStatus('not-found');
      return;
    }

    (async () => {
      try {
        const result = await publicStoreAPI.getBySubdomain(lookup);
        if (result.success && result.data) {
          const colors = result.data.config?.brand?.brandColors || {};
          const primary = colors.primary || '#25D366';
          const secondary = colors.secondary || '#E0E3E6';
          document.documentElement.style.setProperty('--store-primary', primary);
          document.documentElement.style.setProperty('--store-secondary', secondary);
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
