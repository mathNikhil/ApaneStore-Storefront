import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom';

const PreviewProductCard = ({
  product,
  onAddToCart,
  brandColors,
  zoomEnabled = true,
  autoSlide = false,
  brandFonts = { heading: 'Inter', body: 'Inter' },
  addToCartLabel = 'Add to Cart',
  autoOpen = false,
  stockMap = {},
  applicableCoupons = [],
  dineInLabel = 'Dine In',
}) => {
  const [selectedVariation, setSelectedVariation] = useState(product.variations?.[0] || null);
  const [selectedSize, setSelectedSize] = useState(product.variations?.[0]?.sizes?.[0] || null);
  const [quantity, setQuantity] = useState(1);

  // Stock helpers
  const getSizeStock = (sizeId) => {
    if (!sizeId || Object.keys(stockMap).length === 0) return null; // null = no inventory data
    return stockMap[String(sizeId)] ?? null;
  };
  const isSizeOutOfStock = (sizeId) => {
    const stock = getSizeStock(sizeId);
    return stock !== null && stock <= 0;
  };
  const isProductOutOfStock = product.variations?.every(v =>
    v.sizes?.every(s => isSizeOutOfStock(s.id))
  ) || false;

  const images = (product.images || []).map(img =>
    typeof img === 'string' ? img : (img?.url || img?.preview || '')
  ).filter(Boolean);

  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [quickViewOpen, setQuickViewOpen] = useState(false);
  const [couponModalOpen, setCouponModalOpen] = useState(false);

  // Filter coupons down to those valid for the currently selected variant/size.
  // scope_items keys are "pid:vid:sid" — a coupon scoped to a specific variant
  // should only show when that variant (and optionally that size) is selected.
  const visibleCoupons = applicableCoupons.filter(c => {
    if (c.scope !== 'product' || !c.scope_items?.length) return true; // all/category coupons always show
    const pid = String(product.id);
    const vid = selectedVariation ? String(selectedVariation.id) : null;
    const sid = selectedSize ? String(selectedSize.id) : null;
    return c.scope_items.some(key => {
      const parts = String(key).split(':');
      if (parts[0] !== pid) return false;          // wrong product
      if (parts.length === 1) return true;          // product-level, no variant restriction
      if (parts[1] && vid && parts[1] !== vid) return false; // wrong variation
      if (parts[2] && sid && parts[2] !== sid) return false; // wrong size
      return true;
    });
  });

  // Best coupon label for banner (highest value)
  const bestCoupon = visibleCoupons.length > 0 ? visibleCoupons[0] : null;
  const bestCouponLabel = bestCoupon
    ? bestCoupon.unit === 'percent'
      ? `${bestCoupon.value}% off with ${bestCoupon.code}`
      : `₹${bestCoupon.value} off with ${bestCoupon.code}`
    : null;

  const hasMultipleOptions = (product.variations?.length || 0) > 1 ||
    (product.variations?.[0]?.sizes?.length || 0) > 1;

  useEffect(() => {
    if (autoOpen) setQuickViewOpen(true);
  }, [autoOpen]);

  useEffect(() => {
    if (images.length <= 1 || !autoSlide) return;
    const interval = setInterval(() => {
      setActiveImageIndex(prev => (prev + 1) % images.length);
    }, 2800);
    return () => clearInterval(interval);
  }, [images.length, autoSlide]);

  const goToImage = (idx) => setActiveImageIndex((idx + images.length) % images.length);

  const handleCardImageClick = () => {
    if (zoomEnabled) setQuickViewOpen(true);
  };

  const handleAddToCart = () => {
    if (zoomEnabled && hasMultipleOptions) { setQuickViewOpen(true); return; }
    if (selectedVariation && selectedSize) {
      for (let i = 0; i < quantity; i++) {
        onAddToCart(product.id, selectedVariation.id, selectedSize.id);
      }
      setQuantity(1);
    }
  };

  const handleAddToCartFromModal = () => {
    if (selectedVariation && selectedSize) {
      onAddToCart(product.id, selectedVariation.id, selectedSize.id);
      setQuickViewOpen(false);
    }
  };

  const handleVariationSelect = (v) => {
    setSelectedVariation(v);
    setSelectedSize(v.sizes?.[0] || null);
    if (v.imageIndex !== undefined && v.imageIndex !== null && v.imageIndex < images.length) {
      setActiveImageIndex(v.imageIndex);
    } else {
      setActiveImageIndex(0);
    }
  };

  const cardPrice = parseFloat(selectedSize?.price || product.variations?.[0]?.sizes?.[0]?.price) || 0;
  const discount = product.discount || 0;
  const cardOriginalPrice = discount > 0 ? cardPrice / (1 - discount / 100) : cardPrice;
  const selectedPrice = parseFloat(selectedSize?.price) || 0;
  const selectedOriginalPrice = discount > 0 ? selectedPrice / (1 - discount / 100) : selectedPrice;

  const primaryColor = brandColors.primary || '#25D366';
  const buttonLabelColor = brandColors.buttonLabel || '#005523';
  const fontColor = brandColors.fontHeader || brandColors.font || '#191C1E';
  const fontBodyColor = brandColors.fontBody || '#556067';
  const headingFont = brandFonts?.heading || 'Inter';
  const bodyFont = brandFonts?.body || 'Inter';
  const secondaryColor = brandColors.secondary || '#E0E3E6';
  const buttonColor = brandColors.button || primaryColor;

  const quickViewModal = quickViewOpen && (
    <div
      className="fixed inset-0 bg-black/70 z-[200] flex items-end sm:items-center justify-center"
      onClick={() => setQuickViewOpen(false)}
    >
      <div
        className="w-full sm:max-w-2xl sm:rounded-xl rounded-t-2xl max-h-[95vh] overflow-y-auto overflow-hidden"
        style={{ backgroundColor: brandColors.background || '#FFFFFF' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* close button */}
        <button
          onClick={() => setQuickViewOpen(false)}
          className="absolute top-2 right-2 z-10 bg-black/40 hover:bg-black/60 text-white rounded-full p-1.5 transition-colors"
        >
          <span className="material-symbols-outlined text-lg leading-none">close</span>
        </button>

        {/* layout: single col on mobile, two col on desktop */}
        <div className="flex flex-col sm:flex-row sm:min-h-[420px] sm:overflow-hidden">

          {/* LEFT — image */}
          <div className="relative sm:w-1/2 aspect-[3/4] sm:aspect-auto sm:self-stretch flex-shrink-0 sm:rounded-l-xl overflow-hidden"
            style={{ backgroundColor: brandColors.background || '#FFFFFF' }}>
            {images.length > 0 ? (
              <>
                {images.map((img, idx) => (
                  <img key={img.id || idx} src={typeof img === 'string' ? img : img?.url} alt={product.name}
                    loading="lazy"
                    className="absolute inset-0 w-full h-full object-contain transition-opacity duration-500"
                    style={{ opacity: idx === activeImageIndex ? 1 : 0 }} />
                ))}
                {images.length > 1 && (
                  <>
                    <button onClick={() => goToImage(activeImageIndex - 1)} className="absolute left-1 top-1/2 -translate-y-1/2 text-white bg-black/30 hover:bg-black/50 rounded-full p-1 transition-colors">
                      <span className="material-symbols-outlined text-lg">chevron_left</span>
                    </button>
                    <button onClick={() => goToImage(activeImageIndex + 1)} className="absolute right-1 top-1/2 -translate-y-1/2 text-white bg-black/30 hover:bg-black/50 rounded-full p-1 transition-colors">
                      <span className="material-symbols-outlined text-lg">chevron_right</span>
                    </button>
                    <div className="absolute bottom-2 left-0 right-0 flex justify-center gap-1.5">
                      {images.map((_, idx) => (
                        <button key={idx} onClick={() => setActiveImageIndex(idx)} className="w-1.5 h-1.5 rounded-full transition-colors"
                          style={{ backgroundColor: idx === activeImageIndex ? primaryColor : 'rgba(0,0,0,0.2)' }} />
                      ))}
                    </div>
                  </>
                )}
              </>
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <span className="material-symbols-outlined text-5xl text-[#bbcbb9]">image</span>
              </div>
            )}
          </div>

          {/* RIGHT — details */}
          <div className="flex flex-col justify-between p-4 sm:w-1/2 sm:border-l" style={{ borderColor: `${brandColors.secondary}40` || '#e5e7eb' }}>
            <div>
              <h3 className="font-semibold text-base" style={{ color: fontColor, fontFamily: headingFont }}>{product.name}</h3>
              {product.description && <p className="text-xs mt-1" style={{ color: fontBodyColor, fontFamily: bodyFont }}>{product.description}</p>}
              <div className="mt-3 flex items-center gap-2">
                <span className="text-xl font-bold" style={{ color: primaryColor }}>₹{selectedPrice.toFixed(2)}</span>
                {discount > 0 && (
                  <>
                    <span className="text-sm line-through opacity-60" style={{ color: fontBodyColor }}>₹{selectedOriginalPrice.toFixed(2)}</span>
                    <span className="text-xs font-bold px-1.5 py-0.5 rounded" style={{ backgroundColor: `${primaryColor}20`, color: primaryColor }}>{Math.round(discount)}% OFF</span>
                  </>
                )}
              </div>
              {product.variations && product.variations.length > 0 && (
                <div className="mt-3">
                  <p className="text-xs font-medium uppercase tracking-wider mb-1" style={{ color: fontBodyColor, fontFamily: bodyFont }}>{product.variations[0]?.name || 'Options'}</p>
                  <div className="flex flex-wrap gap-1.5">
                    {product.variations.map((v) => {
                      const vOOS = v.sizes?.every(s => isSizeOutOfStock(s.id));
                      return (
                        <button key={v.id} onClick={() => handleVariationSelect(v)}
                          className="flex items-center gap-1 pl-1 pr-2 py-1 text-xs rounded-full transition-colors border-2 bg-transparent"
                          style={vOOS ? { borderColor: '#e5e7eb', color: '#bbb', textDecoration: 'line-through' } : selectedVariation?.id === v.id ? { borderColor: primaryColor, color: primaryColor } : { borderColor: secondaryColor, color: fontBodyColor }}>
                          {(() => {
                            const swatchImg = (v.imageIndex !== undefined && v.imageIndex !== null) ? images[v.imageIndex] : v.image?.url;
                            return swatchImg ? <img src={swatchImg} alt={v.name} className="w-8 h-8 rounded-full object-cover flex-shrink-0" /> : null;
                          })()}
                          {v.name}{vOOS ? ' (Out of Stock)' : ''}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
              {selectedVariation?.sizes?.length > 0 && (
                <div className="mt-3">
                  <p className="text-xs font-medium uppercase tracking-wider mb-1" style={{ color: fontBodyColor, fontFamily: bodyFont }}>Size</p>
                  <div className="flex flex-wrap gap-1.5">
                    {selectedVariation.sizes.map((s) => {
                      const sOOS = isSizeOutOfStock(s.id);
                      return (
                        <button key={s.id} onClick={() => !sOOS && setSelectedSize(s)}
                          className="px-2.5 py-1 text-xs rounded-full transition-colors border-2 bg-transparent"
                          style={sOOS ? { borderColor: '#e5e7eb', color: '#bbb', cursor: 'not-allowed', textDecoration: 'line-through' } : selectedSize?.id === s.id ? { borderColor: primaryColor, color: primaryColor } : { borderColor: secondaryColor, color: fontBodyColor }}>
                          {s.label ? s.label : `${s.size}${s.unit ? ' ' + s.unit : ''}`}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
            <button onClick={handleAddToCartFromModal} disabled={!selectedVariation || !selectedSize || isSizeOutOfStock(selectedSize?.id)}
              className="w-full mt-4 py-2.5 rounded-lg font-semibold text-sm transition-opacity hover:opacity-90 disabled:opacity-50"
              style={{ backgroundColor: isSizeOutOfStock(selectedSize?.id) ? '#e5e7eb' : buttonColor, color: isSizeOutOfStock(selectedSize?.id) ? '#9ca3af' : buttonLabelColor }}>
              {isSizeOutOfStock(selectedSize?.id) ? 'Out of Stock' : addToCartLabel}
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  // ── COUPON MODAL ─────────────────────────────────────────────────────────
  // Helper: format expiry as "Ends 23 Oct 5:00 PM" or countdown if < 24h
  const formatExpiry = (end_at) => {
    if (!end_at) return null;
    const end = new Date(end_at);
    const now = new Date();
    const diffMs = end - now;
    if (diffMs <= 0) return null;
    if (diffMs < 60 * 60 * 1000) {
      const mins = Math.floor(diffMs / 60000);
      return { text: `Expires in ${mins}m`, urgent: true };
    }
    if (diffMs < 24 * 60 * 60 * 1000) {
      const hrs = Math.floor(diffMs / 3600000);
      const mins = Math.floor((diffMs % 3600000) / 60000);
      return { text: `Expires in ${hrs}h ${mins}m`, urgent: true };
    }
    return {
      text: `Valid till ${end.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })} ${end.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })}`,
      urgent: false,
    };
  };

  const couponModal = couponModalOpen && visibleCoupons.length > 0 && (
    <div
      className="fixed inset-0 bg-black/60 z-[300] flex items-end sm:items-center justify-center"
      onClick={() => setCouponModalOpen(false)}
    >
      <div
        className="w-full sm:max-w-sm rounded-t-2xl sm:rounded-2xl overflow-hidden"
        style={{ backgroundColor: brandColors.background || '#fff', maxHeight: '85vh', overflowY: 'auto' }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ padding: '16px 16px 10px', borderBottom: `1px solid ${primaryColor}20`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: `${primaryColor}08` }}>
          <div>
            <div style={{ fontWeight: '800', fontSize: '15px', color: primaryColor }}>🏷️ Available Offers</div>
            <div style={{ fontSize: '11px', color: fontBodyColor, marginTop: '2px' }}>Add to cart and apply at checkout</div>
          </div>
          <button onClick={() => setCouponModalOpen(false)} style={{ background: `${primaryColor}15`, border: 'none', cursor: 'pointer', color: primaryColor, fontSize: '18px', lineHeight: 1, padding: '4px 8px', borderRadius: '6px', fontWeight: '700' }}>×</button>
        </div>

        {/* Coupon list */}
        {visibleCoupons.map((c, i) => {
          const discountLabel = c.unit === 'percent' ? `${c.value}% OFF` : `₹${c.value} OFF`;
          const expiry = formatExpiry(c.end_at);
          const usesLeft = c.max_uses != null ? c.max_uses - (c.current_uses || 0) : null;
          const scopeLabel = c.scope === 'category' && c.scope_items?.length
            ? c.scope_items.join(', ')
            : c.scope === 'product' ? 'Selected products only' : null;

          return (
            <div key={c.code} style={{ padding: '14px 16px', borderBottom: i < visibleCoupons.length - 1 ? `1px solid ${primaryColor}15` : 'none' }}>
              {/* Top row: code chip + discount */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ border: `1.5px dashed ${primaryColor}`, borderRadius: '6px', padding: '3px 10px', fontWeight: '800', fontSize: '13px', color: primaryColor, letterSpacing: '0.5px' }}>
                  {c.code}
                </span>
                <span style={{ fontWeight: '800', fontSize: '15px', color: primaryColor }}>{discountLabel}</span>
              </div>

              {/* Offer name */}
              {c.name && c.name !== c.code && (
                <div style={{ fontSize: '12px', fontWeight: '600', color: fontBodyColor, marginBottom: '8px' }}>{c.name}</div>
              )}

              {/* Condition chips */}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px' }}>
                {/* Min order */}
                {c.min_order_value > 0 && (
                  <span style={{ fontSize: '10px', background: `${primaryColor}12`, color: primaryColor, border: `1px solid ${primaryColor}30`, borderRadius: '4px', padding: '2px 7px', fontWeight: '600' }}>
                    🛒 Min ₹{c.min_order_value}
                  </span>
                )}

                {/* Mode of shopping */}
                {c.applicable_to && c.applicable_to !== 'both' && (
                  <span style={{ fontSize: '10px', background: `${primaryColor}12`, color: primaryColor, border: `1px solid ${primaryColor}30`, borderRadius: '4px', padding: '2px 7px', fontWeight: '600' }}>
                    {c.applicable_to === 'dine_in' ? `🍽️ ${dineInLabel} only` : '🚚 Delivery only'}
                  </span>
                )}

                {/* Scope / category */}
                {scopeLabel && (
                  <span style={{ fontSize: '10px', background: `${primaryColor}12`, color: primaryColor, border: `1px solid ${primaryColor}30`, borderRadius: '4px', padding: '2px 7px', fontWeight: '600' }}>
                    📂 {scopeLabel}
                  </span>
                )}

                {/* Expiry — urgent uses a warning red tint, normal uses brand tint */}
                {expiry && (
                  <span style={{ fontSize: '10px', background: expiry.urgent ? '#fef2f2' : `${primaryColor}12`, color: expiry.urgent ? '#b91c1c' : primaryColor, border: `1px solid ${expiry.urgent ? '#fca5a5' : `${primaryColor}30`}`, borderRadius: '4px', padding: '2px 7px', fontWeight: '600' }}>
                    ⏰ {expiry.text}
                  </span>
                )}

                {/* Uses remaining — only show if limited AND few left */}
                {usesLeft !== null && usesLeft <= 10 && (
                  <span style={{ fontSize: '10px', background: usesLeft <= 3 ? '#fef2f2' : `${primaryColor}12`, color: usesLeft <= 3 ? '#b91c1c' : primaryColor, border: `1px solid ${usesLeft <= 3 ? '#fca5a5' : `${primaryColor}30`}`, borderRadius: '4px', padding: '2px 7px', fontWeight: '600' }}>
                    🔥 {usesLeft <= 1 ? 'Last 1 use!' : `Only ${usesLeft} left`}
                  </span>
                )}
              </div>
            </div>
          );
        })}

        {/* Footer note */}
        <div style={{ padding: '10px 16px 14px', textAlign: 'center', fontSize: '11px', color: fontBodyColor, borderTop: `1px solid ${primaryColor}20`, background: `${primaryColor}08` }}>
          Discount is applied automatically when you enter the code at checkout
        </div>
      </div>
    </div>
  );

  // ── INLINE CARD (zoom OFF) ────────────────────────────────────────────────
  if (!zoomEnabled) {
    return (
      <div className="rounded-lg border overflow-hidden flex flex-col" style={{ backgroundColor: brandColors.background || '#FFFFFF' }}>
        {couponModal}
        {/* Image */}
        <div className="aspect-square relative overflow-hidden" style={{ backgroundColor: brandColors.background || '#FFFFFF' }}>
          {images.length > 0 ? (
            <>
              {images.map((img, idx) => (
                <img key={img.id || idx} src={typeof img === 'string' ? img : img?.url} alt={product.name}
                  loading="lazy"
                  className="absolute inset-0 w-full h-full object-contain transition-opacity duration-700"
                  style={{ opacity: idx === activeImageIndex ? 1 : 0 }} />
              ))}
              {discount > 0 && (
                <div className="absolute top-2 left-2 px-2 py-0.5 rounded-full text-xs font-bold text-white" style={{ backgroundColor: '#e53935' }}>
                  {Math.round(discount)}% OFF
                </div>
              )}
              {images.length > 1 && (
                <>
                  <button
                    onClick={(e) => { e.stopPropagation(); goToImage(activeImageIndex - 1); }}
                    className="absolute left-1 top-1/2 -translate-y-1/2 bg-black/30 hover:bg-black/50 text-white rounded-full p-0.5 transition-colors"
                  >
                    <span className="material-symbols-outlined text-base">chevron_left</span>
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); goToImage(activeImageIndex + 1); }}
                    className="absolute right-1 top-1/2 -translate-y-1/2 bg-black/30 hover:bg-black/50 text-white rounded-full p-0.5 transition-colors"
                  >
                    <span className="material-symbols-outlined text-base">chevron_right</span>
                  </button>
                  <div className="absolute bottom-1.5 left-0 right-0 flex justify-center gap-1">
                    {images.map((_, idx) => (
                      <button
                        key={idx}
                        onClick={(e) => { e.stopPropagation(); setActiveImageIndex(idx); }}
                        className="w-1.5 h-1.5 rounded-full transition-colors"
                        style={{ backgroundColor: idx === activeImageIndex ? primaryColor : 'rgba(255,255,255,0.7)' }}
                      />
                    ))}
                  </div>
                </>
              )}
            </>
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <span className="material-symbols-outlined text-4xl text-[#bbcbb9]">image</span>
            </div>
          )}
        </div>

        <div className="p-3 flex-1 flex flex-col gap-2">
          {/* Name + description */}
          <div>
            <h4 className="font-semibold text-sm" style={{ color: fontColor, fontFamily: headingFont }}>{product.name}</h4>
            {product.description && (
              <p className="text-xs mt-0.5 line-clamp-2" style={{ color: fontBodyColor, fontFamily: bodyFont }}>{product.description}</p>
            )}
          </div>

          {/* Variation selector */}
          {product.variations && product.variations.length > 1 && (
            <div className="flex flex-wrap gap-1">
              {product.variations.map((v) => {
                const swatchImg = (v.imageIndex !== undefined && v.imageIndex !== null) ? images[v.imageIndex] : null;
                return (
                  <button key={v.id} onClick={() => handleVariationSelect(v)}
                    className="flex items-center gap-1 px-2 py-0.5 text-xs rounded-full border-2 transition-all"
                    style={selectedVariation?.id === v.id ? { borderColor: primaryColor, backgroundColor: `${primaryColor}15`, color: primaryColor } : { borderColor: secondaryColor, color: fontBodyColor }}>
                    {swatchImg && <img src={swatchImg} alt={v.name} className="w-4 h-4 rounded-full object-cover" />}
                    {v.name}
                  </button>
                );
              })}
            </div>
          )}

          {/* Size selector */}
          {selectedVariation?.sizes?.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {selectedVariation.sizes.map((s) => {
                const sOutOfStock = isSizeOutOfStock(s.id);
                return (
                  <button key={s.id} onClick={() => !sOutOfStock && setSelectedSize(s)}
                    className="px-2.5 py-1 text-xs rounded-full border-2 transition-all font-medium"
                    style={sOutOfStock ? { borderColor: '#e5e7eb', color: '#aaa', cursor: 'not-allowed', textDecoration: 'line-through' } : selectedSize?.id === s.id
                      ? { borderColor: primaryColor, backgroundColor: primaryColor, color: buttonLabelColor }
                      : { borderColor: secondaryColor, color: fontBodyColor }}>
                    {s.label ? s.label : `${s.size}${s.unit ? ' ' + s.unit : ''}`}
                  </button>
                );
              })}
            </div>
          )}

          {/* Coupon banner */}
          {bestCouponLabel && (
            <button
              onClick={e => { e.stopPropagation(); setCouponModalOpen(true); }}
              style={{
                display: 'flex', alignItems: 'center', gap: '4px',
                background: `${primaryColor}12`, border: `1px dashed ${primaryColor}`,
                borderRadius: '6px', padding: '3px 8px', cursor: 'pointer', width: '100%',
                textAlign: 'left',
              }}
            >
              <span style={{ fontSize: '11px' }}>🏷️</span>
              <span style={{ fontSize: '11px', fontWeight: '700', color: primaryColor, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{bestCouponLabel}</span>
              {visibleCoupons.length > 1 && (
                <span style={{ fontSize: '10px', color: primaryColor, fontWeight: '600', flexShrink: 0 }}>+{visibleCoupons.length - 1} more</span>
              )}
            </button>
          )}

          {/* Qty + Price row */}
          <div className="flex items-center justify-between mt-1">
            <div className="flex items-center gap-2">
              <button onClick={() => setQuantity(q => Math.max(1, q - 1))}
                className="w-7 h-7 rounded-full flex items-center justify-center font-bold text-base border-2 transition-colors"
                style={{ borderColor: primaryColor, color: primaryColor }}>−</button>
              <span className="text-sm font-semibold w-5 text-center" style={{ color: fontColor }}>{quantity}</span>
              <button onClick={() => setQuantity(q => q + 1)}
                className="w-7 h-7 rounded-full flex items-center justify-center font-bold text-base border-2 transition-colors"
                style={{ borderColor: primaryColor, color: primaryColor }}>+</button>
            </div>
            <div className="text-right">
              <span className="text-base font-bold" style={{ color: primaryColor }}>₹{cardPrice.toFixed(0)}</span>
              {discount > 0 && (
                <span className="text-xs line-through ml-1 opacity-60" style={{ color: fontBodyColor }}>₹{cardOriginalPrice.toFixed(0)}</span>
              )}
            </div>
          </div>

          {/* Add to Cart button */}
          <button onClick={isSizeOutOfStock(selectedSize?.id) ? undefined : handleAddToCart}
            disabled={isSizeOutOfStock(selectedSize?.id)}
            className="w-full py-2 rounded-lg font-semibold text-sm transition-opacity hover:opacity-90 flex items-center justify-center gap-1 disabled:opacity-60"
            style={{ backgroundColor: isSizeOutOfStock(selectedSize?.id) ? '#e5e7eb' : buttonColor, color: isSizeOutOfStock(selectedSize?.id) ? '#9ca3af' : buttonLabelColor, cursor: isSizeOutOfStock(selectedSize?.id) ? 'not-allowed' : 'pointer' }}>
            {!isSizeOutOfStock(selectedSize?.id) && <span className="material-symbols-outlined text-base">shopping_cart</span>}
            {isSizeOutOfStock(selectedSize?.id) ? 'Out of Stock' : `${addToCartLabel} (${quantity})`}
          </button>
        </div>
      </div>
    );
  }

  // ── ZOOM CARD (zoom ON) ───────────────────────────────────────────────────
  return (
    <div className="rounded-lg border overflow-hidden hover:shadow-md transition-shadow flex flex-col relative" style={{ backgroundColor: brandColors.background || '#FFFFFF' }}>

      <div
        className={`aspect-square relative overflow-hidden ${images.length > 0 ? 'cursor-zoom-in' : ''}`}
        style={{ backgroundColor: brandColors.background || '#FFFFFF' }}
        onClick={handleCardImageClick}
      >
        {isProductOutOfStock && (
          <div className="absolute top-2 left-2 z-10 px-2 py-0.5 rounded-full text-xs font-bold text-white" style={{ backgroundColor: '#dc2626' }}>Out of Stock</div>
        )}
        {images.length > 0 ? (
          <>
            {images.map((img, idx) => (
              <img key={img.id || idx} src={typeof img === 'string' ? img : img?.url} alt={product.name}
                loading="lazy"
                className="absolute inset-0 w-full h-full object-contain transition-opacity duration-700"
                style={{ opacity: idx === activeImageIndex ? 1 : 0 }} />
            ))}
            <div className="absolute top-1.5 right-1.5 bg-black/40 text-white rounded-full p-1 flex items-center justify-center">
              <span className="material-symbols-outlined text-sm leading-none">zoom_in</span>
            </div>
            {images.length > 1 && (
              <div className="absolute bottom-1.5 left-0 right-0 flex justify-center gap-1">
                {images.map((_, idx) => (
                  <span key={idx} className="w-1.5 h-1.5 rounded-full transition-colors"
                    style={{ backgroundColor: idx === activeImageIndex ? primaryColor : 'rgba(255,255,255,0.7)' }} />
                ))}
              </div>
            )}
          </>
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <span className="material-symbols-outlined text-4xl text-[#bbcbb9]">image</span>
          </div>
        )}
      </div>

      {quickViewModal}
      {couponModal}

      <div className="p-3 flex-1 flex flex-col">
        {isProductOutOfStock && (
          <span className="inline-block mb-1 text-xs font-bold px-2 py-0.5 rounded-full w-fit" style={{ background: '#fee2e2', color: '#dc2626' }}>Out of Stock</span>
        )}
        <h4 className="font-semibold text-sm line-clamp-2" style={{ color: fontColor, fontFamily: headingFont }}>{product.name}</h4>
        <div className="mt-1.5 flex flex-wrap items-baseline gap-x-1.5 gap-y-0.5">
          <span className="text-base font-bold" style={{ color: primaryColor }}>₹{cardPrice.toFixed(2)}</span>
          {discount > 0 && (
            <>
              <span className="text-xs line-through opacity-60" style={{ color: fontBodyColor }}>₹{cardOriginalPrice.toFixed(2)}</span>
              <span className="text-[10px] font-bold px-1 py-0.5 rounded whitespace-nowrap" style={{ backgroundColor: `${primaryColor}20`, color: primaryColor }}>{Math.round(discount)}% OFF</span>
            </>
          )}
        </div>
        {/* Coupon banner — only if applicable coupons exist */}
        {bestCouponLabel && (
          <button
            onClick={e => { e.stopPropagation(); setCouponModalOpen(true); }}
            style={{
              marginTop: '6px', display: 'flex', alignItems: 'center', gap: '4px',
              background: `${primaryColor}12`, border: `1px dashed ${primaryColor}`,
              borderRadius: '6px', padding: '3px 8px', cursor: 'pointer', width: '100%',
              textAlign: 'left',
            }}
          >
            <span style={{ fontSize: '11px' }}>🏷️</span>
            <span style={{ fontSize: '11px', fontWeight: '700', color: primaryColor, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{bestCouponLabel}</span>
            {visibleCoupons.length > 1 && (
              <span style={{ fontSize: '10px', color: primaryColor, fontWeight: '600', flexShrink: 0 }}>+{visibleCoupons.length - 1} more</span>
            )}
          </button>
        )}
        <button onClick={isProductOutOfStock ? undefined : handleAddToCart}
          disabled={isProductOutOfStock}
          className="w-full mt-auto pt-2 py-1.5 rounded-lg font-semibold text-sm transition-opacity hover:opacity-90 disabled:opacity-50"
          style={{ backgroundColor: isProductOutOfStock ? '#e5e7eb' : buttonColor, color: isProductOutOfStock ? '#9ca3af' : buttonLabelColor, marginTop: '0.5rem', cursor: isProductOutOfStock ? 'not-allowed' : 'pointer' }}>
          {isProductOutOfStock ? 'Out of Stock' : hasMultipleOptions ? `${product.variations?.length > 1 ? product.variations.length : product.variations?.[0]?.sizes?.length || ''} Options Available` : addToCartLabel}
        </button>
      </div>
    </div>
  );
};

export default PreviewProductCard;
