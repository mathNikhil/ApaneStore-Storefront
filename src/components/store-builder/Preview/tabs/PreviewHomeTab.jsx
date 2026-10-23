import React, { useState, useEffect } from 'react';
import PreviewBanner from '../components/PreviewBanner';
import PreviewProductCard from '../components/PreviewProductCard';
import QRScannerModal from '../components/qr/QRScannerModal';

const API = import.meta.env.VITE_API_URL || 'https://api.aapnaestore.com';

const PreviewHomeTab = ({
  data,
  onAddToCart,
  device = 'desktop',
  initialProductId = null,
  stockMap = {},
  storeId,
  customerToken,
  isLoggedIn = false,
}) => {
  const { banner, categories, brand, products, enableProductSearch, settings = {}, cart = {} } = data;
  const dineInLabel = cart.dineInLabel || 'Dine In';
  const brandFonts = brand.fonts || { heading: 'Inter', body: 'Inter' };
  const imgSize = settings.categoryImageSize || 'S';
  const imgShape = settings.categoryImageShape || 'circle';
  const imgSizeClass = imgSize === 'L' ? 'w-[72px] h-[72px]' : imgSize === 'M' ? 'w-16 h-16' : 'w-12 h-12';
  const imgShapeClass = imgShape === 'circle' ? 'rounded-full' : 'rounded-lg';
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [qrActive, setQrActive] = useState(false);
  const [showQRScanner, setShowQRScanner] = useState(false);
  const [allCoupons, setAllCoupons] = useState([]);

  useEffect(() => {
    if (!storeId) return;
    fetch(`${API}/api/qr/status/${storeId}`)
      .then(r => r.json())
      .then(d => setQrActive(d.active || false))
      .catch(() => {});
  }, [storeId]);

  // Fetch active coupons; re-fetch every 3 minutes so expired ones drop off
  useEffect(() => {
    if (!storeId) return;
    const fetchCoupons = () => {
      fetch(`${API}/api/store/${storeId}/coupons/available`)
        .then(r => r.json())
        .then(d => { if (d.success) setAllCoupons(d.coupons || []); })
        .catch(() => {});
    };
    fetchCoupons();
    const intervalId = setInterval(fetchCoupons, 3 * 60 * 1000); // every 3 min
    return () => clearInterval(intervalId);
  }, [storeId]);

  // Returns coupons applicable to a product (by product id + its category name)
  // NOTE: scope_items for category-scoped coupons stores category NAMES (e.g. "Bottoms"),
  // not numeric IDs — matching must be done by cat.name
  const getCouponsForProduct = (product) => {
    const pid = String(product.id);
    // Find this product's category name from the categories tree
    // Use `categories` directly (from data destructure at top) to avoid TDZ issue
    let catName = null;
    for (const cat of (categories || [])) {
      if ((cat.products || []).some(p => String(p.id) === pid)) {
        catName = cat.name;
        break;
      }
    }
    const now = Date.now();
    return allCoupons.filter(c => {
      // Client-side expiry guard: drop coupons that expired since last fetch
      if (c.end_at && new Date(c.end_at).getTime() < now) return false;
      if (c.scope === 'all') return true;
      if (c.scope === 'category' && c.scope_items?.length) {
        // scope_items holds category name strings
        return catName !== null && c.scope_items.includes(catName);
      }
      if (c.scope === 'category' && !c.scope_items?.length) return true;
      if (c.scope === 'product' && c.scope_items?.length) {
        const scopePids = c.scope_items.map(k => String(k).split(':')[0]);
        return scopePids.includes(pid);
      }
      return false;
    });
  };

  const allProducts = products || [];
  const allCategories = categories || [];
  const searchEnabled = enableProductSearch !== false;

  const trimmedQuery = searchQuery.trim();
  const isSearching = searchEnabled && trimmedQuery.length > 0;

  const gridColsClass = {
    mobile: 'grid-cols-2',
    tablet: 'grid-cols-2',
    desktop: 'grid-cols-3',
  }[device] || 'grid-cols-2 sm:grid-cols-3';

  const getSearchResults = () => {
    const words = trimmedQuery.toLowerCase().split(/\s+/).filter(Boolean);
    if (words.length === 0) return allProducts;
    return allProducts.filter((product) => {
      const haystack = `${product.name || ''} ${product.description || ''}`.toLowerCase();
      return words.some((word) => haystack.includes(word));
    });
  };

  const getFilteredProducts = () => {
    if (isSearching) return getSearchResults();
    if (selectedCategory === 'all') return allProducts;
    const category = allCategories.find(c => c.id === selectedCategory);
    if (category) return category.products || [];
    return [];
  };

  const filteredProducts = getFilteredProducts();
  const hasProducts = allProducts.length > 0;

  const handleSearchChange = (e) => {
    const value = e.target.value;
    setSearchQuery(value);
    if (value.trim().length > 0) setSelectedCategory('all');
  };

  const clearSearch = () => setSearchQuery('');

  return (
    <div className="p-4 max-w-7xl mx-auto">
      <PreviewBanner
        image={banner.image}
        images={banner.images}
        tagline={banner.tagline}
        subtitle={banner.subtitle}
        cta={banner.cta}
        height={banner.height}
        bgColor={banner.bgColor}
        showText={false}
        showCta={false}
        textAlignment={banner.textAlignment}
        textColor={banner.textColor}
        textShadow={banner.textShadow !== undefined ? banner.textShadow : true}
        primaryColor={brand.colors.primary}
        device={device}
        fonts={brand.fonts}
      />


      {showQRScanner && (
        <QRScannerModal
          storeId={storeId}
          primaryColor={brand.colors.primary}
          customerToken={customerToken}
          addToCartLabel={data.addToCartLabel || 'Add to Cart'}
          onAddToCart={(product, quantity) => {
            onAddToCart(product, quantity);
          }}
          onClose={() => setShowQRScanner(false)}
        />
      )}

      {searchEnabled && (
        <div className="mb-4 mt-4">
          <div
            className="relative flex items-center rounded-full border-2 px-4 py-2"
            style={{ borderColor: isSearching ? brand.colors.primary : brand.colors.secondary }}
          >
            <span className="material-symbols-outlined text-lg mr-2" style={{ color: brand.colors.fontBody }}>
              search
            </span>
            <input
              type="text"
              value={searchQuery}
              onChange={handleSearchChange}
              placeholder="Search products..."
              className="flex-1 bg-transparent outline-none text-sm"
              style={{ color: brand.colors.fontBody, fontFamily: brand.fonts?.body || 'Inter' }}
            />
            {searchQuery.length > 0 && (
              <button
                onClick={clearSearch}
                className="ml-2 opacity-60 hover:opacity-100 transition-opacity"
                style={{ color: brand.colors.fontBody }}
                aria-label="Clear search"
              >
                <span className="material-symbols-outlined text-lg">close</span>
              </button>
            )}
          </div>
        </div>
      )}

      {allCategories.length > 0 && (
        <div className="mb-6 pt-4 pb-6 border-b border-[#e0e3e6] overflow-x-auto hide-scrollbar">
          <div className="flex gap-3 min-w-max items-center">
            <button
              onClick={() => { setSelectedCategory('all'); clearSearch(); }}
              className="flex items-center gap-1.5 px-4 py-2 rounded-full font-medium text-sm transition-colors whitespace-nowrap border-2 hover:opacity-80 flex-shrink-0"
              style={selectedCategory === 'all' && !isSearching
                ? { borderColor: brand.colors.primary, backgroundColor: brand.colors.primary, color: '#fff', fontFamily: brand.fonts?.body || 'Inter' }
                : { borderColor: brand.colors.secondary, backgroundColor: 'transparent', color: brand.colors.fontBody, fontFamily: brand.fonts?.body || 'Inter' }
              }
            >
              All
            </button>

            {allCategories.map((cat) => {
              const isSelected = selectedCategory === cat.id && !isSearching;
              const hasCatImage = cat.image?.url || cat.image?.preview;

              if (imgSize === 'S') {
                return (
                  <button
                    key={cat.id}
                    onClick={() => { setSelectedCategory(cat.id); clearSearch(); }}
                    className="flex items-center gap-2 px-3 py-1.5 rounded-full font-medium text-sm transition-colors whitespace-nowrap border-2 hover:opacity-80 flex-shrink-0"
                    style={isSelected
                      ? { borderColor: brand.colors.primary, backgroundColor: brand.colors.primary, color: '#fff', fontFamily: brand.fonts?.body || 'Inter' }
                      : { borderColor: brand.colors.secondary, backgroundColor: 'transparent', color: brand.colors.fontBody, fontFamily: brand.fonts?.body || 'Inter' }
                    }
                  >
                    {hasCatImage && (
                      <img src={cat.image.url || cat.image.preview} alt={cat.name} className={`object-cover flex-shrink-0 w-6 h-6 ${imgShapeClass}`} />
                    )}
                    {cat.name}
                  </button>
                );
              }

              if (imgSize === 'M') {
                return (
                  <button
                    key={cat.id}
                    onClick={() => { setSelectedCategory(cat.id); clearSearch(); }}
                    className="flex flex-col items-center gap-1 flex-shrink-0 hover:opacity-80 transition-opacity outline-none focus:outline-none border-0 bg-transparent p-0 appearance-none"
                    style={{ width: '80px' }}
                  >
                    {hasCatImage ? (
                      <img
                        src={cat.image.url || cat.image.preview}
                        alt={cat.name}
                        className={`object-cover w-16 h-16 ${imgShapeClass}`}
                      />
                    ) : (
                      <div
                        className={`w-16 h-16 ${imgShapeClass} border-2 flex items-center justify-center text-xs font-semibold`}
                        style={isSelected
                          ? { borderColor: brand.colors.primary, backgroundColor: brand.colors.primary, color: '#fff' }
                          : { borderColor: brand.colors.secondary, backgroundColor: 'transparent', color: brand.colors.fontBody }
                        }
                      >
                        {cat.name?.charAt(0)}
                      </div>
                    )}
                    <span style={{ color: isSelected ? brand.colors.primary : brand.colors.fontBody, fontFamily: brand.fonts?.body || 'Inter', fontSize: '11px', fontWeight: '500', textAlign: 'center', lineHeight: '1.2', display: 'block', width: '100%', wordBreak: 'break-word' }}>
                      {cat.name}
                    </span>
                  </button>
                );
              }

              return (
                <button
                  key={cat.id}
                  onClick={() => { setSelectedCategory(cat.id); clearSearch(); }}
                  className={`relative flex-shrink-0 overflow-hidden hover:opacity-90 transition-opacity border-2 ${imgShapeClass}`}
                  style={{ width: '110px', height: '110px', borderColor: isSelected ? brand.colors.primary : 'transparent' }}
                >
                  {hasCatImage ? (
                    <img src={cat.image.url || cat.image.preview} alt={cat.name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full" style={{ backgroundColor: brand.colors.secondary }} />
                  )}
                  <div className="absolute bottom-0 left-0 right-0 flex items-end p-1.5" style={{ background: `linear-gradient(to top, ${brand.colors.secondary}EE 0%, ${brand.colors.secondary}22 60%, transparent 100%)`, height: '35%' }}>
                    <span className="text-xs font-semibold leading-tight text-center w-full drop-shadow" style={{ color: isSelected ? brand.colors.primary : brand.colors.fontBody, fontFamily: brand.fonts?.body || 'Inter', textShadow: '0 1px 2px rgba(0,0,0,0.4)' }}>{cat.name}</span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {!hasProducts ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <span className="material-symbols-outlined text-5xl text-[#bbcbb9] mb-3">inventory_2</span>
          <p className="text-sm font-medium" style={{ color: brand.colors.fontBody, fontFamily: brandFonts.body }}>No products yet</p>
        </div>
      ) : filteredProducts.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <span className="material-symbols-outlined text-5xl text-[#bbcbb9] mb-3">search_off</span>
          <p className="text-sm font-medium" style={{ color: brand.colors.fontBody, fontFamily: brandFonts.body }}>
            {isSearching ? `No results for "${trimmedQuery}"` : 'No products in this category'}
          </p>
        </div>
      ) : (
        <div className={`grid ${gridColsClass} gap-3`}>
          {filteredProducts.map((product) => (
            <PreviewProductCard
              key={product.id}
              product={product}
              onAddToCart={onAddToCart}
              brandColors={brand.colors}
              brandFonts={brandFonts}
              zoomEnabled={data.settings?.enableImageZoom !== false}
              autoSlide={settings.autoSlideProductImages || false}
              addToCartLabel={data.addToCartLabel || 'Add to Cart'}
              stockMap={stockMap}
              autoOpen={initialProductId !== null && String(product.id) === String(initialProductId)}
              applicableCoupons={getCouponsForProduct(product)}
              dineInLabel={dineInLabel}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default PreviewHomeTab;
