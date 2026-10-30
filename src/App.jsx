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
    textShadow: config?.products?.banner?.textShadow !== undefined
      ? config.products.banner.textShadow : true,
    categoryImageShape: config?.products?.categoryImageShape || 'circle',
    categoryImageSize: config?.products?.categoryImageSize || 'S',
    autoSlideProductImages: config?.products?.autoSlideProductImages || false,
    enableImageZoom: config?.products?.enableImageZoom !== false,
  },
});

function getProductIdFromPath() {
  const match = window.location.pathname.match(/^\/product\/([^/]+)/);
  return match ? match[1] : null;
}

function App() {
  const [status, setStatus] = useState('loading');
  const [store, setStore] = useState(null);
  const [stockMap, setStockMap] = useState({});
  const [catalogLoaded, setCatalogLoaded] = useState(false);

  const initialProductId = getProductIdFromPath();

  // Detect device type based on screen width
  const getDevice = () => {
    const w = window.innerWidth;
    if (w < 640) return 'mobile';
    if (w < 1024) return 'tablet';
    return 'desktop';
  };
  const [device, setDevice] = React.useState(getDevice());

  React.useEffect(() => {
    const handleResize = () => setDevice(getDevice());
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    const hostname = window.location.hostname;
    const isLocalDev = hostname === 'localhost' || hostname === '127.0.0.1';

    let lookup;
    if (isLocalDev) {
      const params = new URLSearchParams(window.location.search);
      lookup = params.get('store');
    } else if (hostname.endsWith('.aapnaestore.com')) {
      lookup = hostname.split('.')[0];
    } else {
      lookup = hostname;
    }

    if (!lookup) { setStatus('not-found'); return; }

    (async () => {
      try {
        // ── Step 1: Fast shell — brand/theme/config only, no products ──
        const result = await publicStoreAPI.getBySubdomain(lookup);
        if (!result.success || !result.data) {
          setStatus('not-found');
          return;
        }

        const colors = result.data.config?.brand?.brandColors || {};
        const primary = colors.primary || '#25D366';
        const secondary = colors.secondary || '#E0E3E6';
        document.documentElement.style.setProperty('--store-primary', primary);
        document.documentElement.style.setProperty('--store-secondary', secondary);
        setStore(result.data);
        setStatus('ready'); // ← page renders NOW with shell data

        // ── Step 2: Lazy catalog — products, categories, stockMap ──
        // Fires in background after shell paints. Does NOT block render.
        publicStoreAPI.getCatalog(lookup)
          .then(catalogResult => {
            if (catalogResult.success && catalogResult.data) {
              const { products, categories, stockMap: map } = catalogResult.data;
              // Merge products + categories into store config
              setStore(prev => ({
                ...prev,
                config: {
                  ...prev.config,
                  products: { ...prev.config?.products, ...products },
                  categories: categories || prev.config?.categories,
                },
              }));
              setStockMap(map || {});
              setCatalogLoaded(true);
            }
          })
          .catch(e => console.warn('Catalog lazy load failed:', e));

      } catch (e) {
        console.error('Failed to load store:', e);
        setStatus('error');
      }
    })();
  }, []);

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f7f9fc]">
        <span className="material-symbols-outlined animate-spin text-4xl text-[#556067]">
          progress_activity
        </span>
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

  const bookingConfig = store.config?.booking || {};
  // Infer service store if store_type is set, OR if booking config has staff/serviceType data
  const inferredStoreType = store.store_type ||
    (bookingConfig.staffMembers?.length > 0 || bookingConfig.serviceType ? 'service' : 'product');

  const builderData = {
    ...mapConfigToBuilderData(store.config),
    storeType: inferredStoreType,
    booking: bookingConfig,
  };

  return (
    <StorefrontApp
      builderData={builderData}
      storeId={store.id}
      device={device}
      className="min-h-screen"
      style={{ minHeight: '100vh', backgroundColor: builderData.brand.colors.background }}
      initialProductId={initialProductId}
      stockMap={stockMap}
    />
  );
}

export default App;
