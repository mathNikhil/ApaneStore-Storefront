import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom';
import { useDeviceFrame } from '../DeviceFrameContext';

const PreviewProductCard = ({
  product,
  onAddToCart,
  brandColors,
  zoomEnabled = true,
  autoSlide = false,
  brandFonts = { heading: 'Inter', body: 'Inter' },
  addToCartLabel = 'Add to Cart',
  autoOpen = false,
}) => {
  const [selectedVariation, setSelectedVariation] = useState(product.variations?.[0] || null);
  const [selectedSize, setSelectedSize] = useState(product.variations?.[0]?.sizes?.[0] || null);
  const [quantity, setQuantity] = useState(1);

  const images = (product.images || []).map(img =>
    typeof img === 'string' ? img : (img?.url || img?.preview || '')
  ).filter(Boolean);

  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [quickViewOpen, setQuickViewOpen] = useState(false);
  const deviceFrameNode = useDeviceFrame();

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
      className="absolute inset-0 bg-black/70 z-[200] flex items-end sm:items-center justify-center"
      onClick={() => setQuickViewOpen(false)}
    >
      <div
        className="w-full sm:max-w-sm sm:rounded-xl rounded-t-2xl max-h-[92%] overflow-y-auto"
        style={{ backgroundColor: brandColors.background || '#FFFFFF' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="relative aspect-square" style={{ backgroundColor: brandColors.background || '#FFFFFF' }}>
          <button
            onClick={() => setQuickViewOpen(false)}
            className="absolute top-2 right-2 z-10 bg-black/40 hover:bg-black/60 text-white rounded-full p-1.5 transition-colors"
          >
            <span className="material-symbols-outlined text-lg leading-none">close</span>
          </button>
          {images.length > 0 ? (
            <>
              {images.map((img, idx) => (
                <img key={img.id || idx} src={typeof img === 'string' ? img : img?.url} alt={product.name}
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
        <div className="p-4">
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
                {product.variations.map((v) => (
                  <button key={v.id} onClick={() => handleVariationSelect(v)}
                    className="flex items-center gap-1 pl-1 pr-2 py-1 text-xs rounded-full transition-colors border-2 bg-transparent"
                    style={selectedVariation?.id === v.id ? { borderColor: primaryColor, color: primaryColor } : { borderColor: secondaryColor, color: fontBodyColor }}>
                    {(() => {
                      const swatchImg = (v.imageIndex !== undefined && v.imageIndex !== null) ? images[v.imageIndex] : v.image?.url;
                      return swatchImg ? <img src={swatchImg} alt={v.name} className="w-8 h-8 rounded-full object-cover flex-shrink-0" /> : null;
                    })()}
                    {v.name}
                  </button>
                ))}
              </div>
            </div>
          )}
          {selectedVariation?.sizes?.length > 0 && (
            <div className="mt-3">
              <p className="text-xs font-medium uppercase tracking-wider mb-1" style={{ color: fontBodyColor, fontFamily: bodyFont }}>Size</p>
              <div className="flex flex-wrap gap-1.5">
                {selectedVariation.sizes.map((s) => (
                  <button key={s.id} onClick={() => setSelectedSize(s)}
                    className="px-2.5 py-1 text-xs rounded-full transition-colors border-2 bg-transparent"
                    style={selectedSize?.id === s.id ? { borderColor: primaryColor, color: primaryColor } : { borderColor: secondaryColor, color: fontBodyColor }}>
                    {s.label ? s.label : `${s.size}${s.unit ? ' ' + s.unit : ''}`}
                  </button>
                ))}
              </div>
            </div>
          )}
          <button onClick={handleAddToCartFromModal} disabled={!selectedVariation || !selectedSize}
            className="w-full mt-4 py-2.5 rounded-lg font-semibold text-sm transition-opacity hover:opacity-90 disabled:opacity-50"
            style={{ backgroundColor: buttonColor, color: buttonLabelColor }}>
            {addToCartLabel}
          </button>
        </div>
      </div>
    </div>
  );

  // ── INLINE CARD (zoom OFF) ────────────────────────────────────────────────
  if (!zoomEnabled) {
    return (
      <div className="rounded-lg border overflow-hidden flex flex-col" style={{ backgroundColor: brandColors.background || '#FFFFFF' }}>
        {/* Image */}
        <div className="aspect-square relative overflow-hidden" style={{ backgroundColor: brandColors.background || '#FFFFFF' }}>
          {images.length > 0 ? (
            <>
              {images.map((img, idx) => (
                <img key={img.id || idx} src={typeof img === 'string' ? img : img?.url} alt={product.name}
                  className="absolute inset-0 w-full h-full object-cover transition-opacity duration-700"
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
              {selectedVariation.sizes.map((s) => (
                <button key={s.id} onClick={() => setSelectedSize(s)}
                  className="px-2.5 py-1 text-xs rounded-full border-2 transition-all font-medium"
                  style={selectedSize?.id === s.id
                    ? { borderColor: primaryColor, backgroundColor: primaryColor, color: buttonLabelColor }
                    : { borderColor: secondaryColor, color: fontBodyColor }}>
                  {s.label ? s.label : `${s.size}${s.unit ? ' ' + s.unit : ''}`}
                </button>
              ))}
            </div>
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
          <button onClick={handleAddToCart}
            className="w-full py-2 rounded-lg font-semibold text-sm transition-opacity hover:opacity-90 flex items-center justify-center gap-1"
            style={{ backgroundColor: buttonColor, color: buttonLabelColor }}>
            <span className="material-symbols-outlined text-base">shopping_cart</span>
            {addToCartLabel} ({quantity})
          </button>
        </div>
      </div>
    );
  }

  // ── ZOOM CARD (zoom ON) ───────────────────────────────────────────────────
  return (
    <div className="rounded-lg border overflow-hidden hover:shadow-md transition-shadow flex flex-col" style={{ backgroundColor: brandColors.background || '#FFFFFF' }}>
      <div
        className={`aspect-square relative overflow-hidden ${images.length > 0 ? 'cursor-zoom-in' : ''}`}
        style={{ backgroundColor: brandColors.background || '#FFFFFF' }}
        onClick={handleCardImageClick}
      >
        {images.length > 0 ? (
          <>
            {images.map((img, idx) => (
              <img key={img.id || idx} src={typeof img === 'string' ? img : img?.url} alt={product.name}
                className="absolute inset-0 w-full h-full object-cover transition-opacity duration-700"
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

      {deviceFrameNode && ReactDOM.createPortal(quickViewModal, deviceFrameNode)}

      <div className="p-3 flex-1 flex flex-col">
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
        {hasMultipleOptions && (
          <button onClick={() => setQuickViewOpen(true)} className="text-xs mt-1 text-left underline decoration-dotted" style={{ color: fontBodyColor, fontFamily: bodyFont }}>
            {product.variations.length > 1 ? `${product.variations.length} options` : `${product.variations[0].sizes.length} sizes`} available
          </button>
        )}
        <button onClick={handleAddToCart}
          className="w-full mt-auto pt-2 py-1.5 rounded-lg font-semibold text-sm transition-opacity hover:opacity-90"
          style={{ backgroundColor: buttonColor, color: buttonLabelColor, marginTop: '0.5rem' }}>
          {hasMultipleOptions ? 'View Options' : addToCartLabel}
        </button>
      </div>
    </div>
  );
};

export default PreviewProductCard;
