import React, { useState, useEffect } from 'react';
import StorefrontApp from './components/store-builder/Preview/StorefrontApp';
import { publicStoreAPI } from './services/api';

// Phase 1 (local dev, no real hosting yet): which store to render comes from
// a ?store=<subdomain> query param, e.g. http://localhost:3001/?store=blue-star-4821
// Phase 2 will replace this with real subdomain/custom-domain DNS routing —
// at that point this becomes "whichever subdomain the request arrived on"
// instead of a query param, but everything below stays the same.
function App() {
  const [status, setStatus] = useState('loading'); // loading | ready | not-found | error
  const [store, setStore] = useState(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const subdomain = params.get('store');

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

  return (
    <StorefrontApp
      builderData={store.config}
      storeId={store.id}
      device="desktop"
      className="min-h-screen bg-white"
      style={{ minHeight: '100vh' }}
    />
  );
}

export default App;
