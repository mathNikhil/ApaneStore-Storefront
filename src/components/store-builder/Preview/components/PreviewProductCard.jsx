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
}) => {
  const [selectedVariation, setSelectedVariation] = useState(
    product.variations?.[0] || null
  );
  const [selectedSize, setSelectedSize] = useState(
    product.variations?.[0]?.sizes?.[0] || null
  );

  const images = product.images || [];
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [quickViewOpen, setQuickViewOpen] = useState(false);
  const deviceFrameNode = useDeviceFrame();

  const hasMultipleOptions = (product.variations?.length || 0) > 1 ||
    (product.variations?.[0]?.sizes?.length || 0) > 1;

  // Auto-slide through all uploaded product images so customers see every shot,
  // not just the first one.
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
    // With zoom enabled and more than one option, force selection through the
    // quick-view modal rather than guessing which variant/size the customer wants.
    if (zoomEnabled && hasMultipleOptions) {
      setQuickViewOpen(true);
      return;
    }
    if (selectedVariation && selectedSize) {
      onAddToCart(product.id, selectedVariation.id, selectedSize.id);
    }
  };

  const handleAddToCartFromModal = () => {
    if (selectedVariation && selectedSize) {
      onAddToCart(product.id, selectedVariation.id, selectedSize.id);
      setQuickViewOpen(false);
    }
  };

  // Card always shows the FIRST variant/size price — full picking happens in
  // the quick-view modal, per the store's design.
  const cardPrice = parseFloat(product.variations?.[0]?.sizes?.[0]?.price) || 0;
  const discount = product.discount || 0;
  const cardOriginalPrice = discount > 0 ? cardPrice / (1 - discount / 100) : cardPrice;

  // Modal shows the price for whatever variant/size is currently selected there.
  const selectedPrice = parseFloat(selectedSize?.price) || 0;
  const selectedOriginalPrice = discount > 0 ? selectedPrice / (1 - discount / 100) : selectedPrice;

  const primaryColor = brandColors.primary || '#25D366';
  const buttonLabelColor = brandColors.buttonLabel || '#005523';
  const fontColor = brandColors.fontHeader || brandColors.font || '#191C1E';
  const fontBodyColor = brandColors.fontBody || '#556067';
  const headingFont = brandFonts?.heading || 'Inter';
  const bodyFont = brandFonts?.body || 'Inter';
  const secondaryColor = brandColors.secondary || '#E0E3E6';

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
        {/* Image carousel */}
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
                <img
                  key={img.id || idx}
                  src={img.url}
                  alt={product.name}
                  className="absolute inset-0 w-full h-full object-contain transition-opacity duration-500"
                  style={{ opacity: idx === activeImageIndex ? 1 : 0 }}
                />
              ))}
              {images.length > 1 && (
                <>
                  <button
                    onClick={() => goToImage(activeImageIndex - 1)}
                    className="absolute left-1 top-1/2 -translate-y-1/2 text-white bg-black/30 hover:bg-black/50 rounded-full p-1 transition-colors"
                  >
                    <span className="material-symbols-outlined text-lg">chevron_left</span>
                  </button>
                  <button
                    onClick={() => goToImage(activeImageIndex + 1)}
                    className="absolute right-1 top-1/2 -translate-y-1/2 text-white bg-black/30 hover:bg-black/50 rounded-full p-1 transition-colors"
                  >
                    <span className="material-symbols-outlined text-lg">chevron_right</span>
                  </button>
                  <div className="absolute bottom-2 left-0 right-0 flex justify-center gap-1.5">
                    {images.map((_, idx) => (
                      <button
                        key={idx}
                        onClick={() => setActiveImageIndex(idx)}
                        className="w-1.5 h-1.5 rounded-full transition-colors"
                        style={{ backgroundColor: idx === activeImageIndex ? primaryColor : 'rgba(0,0,0,0.2)' }}
                      />
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

        {/* Details */}
        <div className="p-4">
          <h3 className="font-semibold text-base" style={{ color: fontColor, fontFamily: headingFont }}>{product.name}</h3>
          {product.description && (
            <p className="text-xs mt-1" style={{ color: fontBodyColor, fontFamily: bodyFont }}>{product.description}</p>
          )}

          {/* Price for currently selected combination */}
          <div className="mt-3 flex items-center gap-2">
            <span className="text-xl font-bold" style={{ color: primaryColor }}>₹{selectedPrice.toFixed(2)}</span>
            {discount > 0 && (
              <>
                <span className="text-sm line-through opacity-60" style={{ color: fontBodyColor, fontFamily: bodyFont }}>
                  ₹{selectedOriginalPrice.toFixed(2)}
                </span>
                <span className="text-xs font-bold px-1.5 py-0.5 rounded" style={{ backgroundColor: `${primaryColor}20`, color: primaryColor, fontFamily: bodyFont }}>
                  {Math.round(discount)}% OFF
                </span>
              </>
            )}
          </div>

          {product.bulkPricing && (
            <div className="mt-2 rounded-lg px-2 py-1 text-center" style={{ backgroundColor: `${primaryColor}1a` }}>
              <p className="text-xs font-medium" style={{ color: buttonLabelColor }}>✓ Same price for all sizes</p>
            </div>
          )}

          {/* Variant selector, with thumbnail if uploaded */}
          {product.variations && product.variations.length > 0 && (
            <div className="mt-3">
              <p className="text-xs font-medium uppercase tracking-wider mb-1" style={{ color: fontBodyColor, fontFamily: bodyFont }}>
                {product.variations[0]?.name || 'Options'}
              </p>
              <div className="flex flex-wrap gap-1.5">
                {product.variations.map((v) => (
                  <button
                    key={v.id}
                    onClick={() => { setSelectedVariation(v); setSelectedSize(v.sizes?.[0] || null); }}
                    className="flex items-center gap-1 pl-1 pr-2 py-1 text-xs rounded-full transition-colors border-2 bg-transparent"
                    style={selectedVariation?.id === v.id
                      ? { borderColor: primaryColor, color: primaryColor }
                      : { borderColor: secondaryColor, color: fontBodyColor, fontFamily: bodyFont }
                    }
                  >
                    {v.image && <img src={v.image.url} alt={v.name} className="w-4 h-4 rounded-full object-cover flex-shrink-0" />}
                    {v.name}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Size selector */}
          {selectedVariation?.sizes?.length > 0 && (
            <div className="mt-3">
              <p className="text-xs font-medium uppercase tracking-wider mb-1" style={{ color: fontBodyColor, fontFamily: bodyFont }}>Size</p>
              <div className="flex flex-wrap gap-1.5">
                {selectedVariation.sizes.map((s) => (
                  <button
                    key={s.id}
                    onClick={() => setSelectedSize(s)}
                    className="px-2.5 py-1 text-xs rounded-full transition-colors border-2 bg-transparent"
                    style={selectedSize?.id === s.id
                      ? { borderColor: primaryColor, color: primaryColor }
                      : { borderColor: secondaryColor, color: fontBodyColor, fontFamily: bodyFont }
                    }
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          <button
            onClick={handleAddToCartFromModal}
            className="w-full mt-4 py-2.5 rounded-lg font-semibold text-sm transition-opacity hover:opacity-90"
            style={{ backgroundColor: brandColors.button || primaryColor, color: buttonLabelColor }}
          >
            {addToCartLabel}
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="rounded-lg border overflow-hidden hover:shadow-md transition-shadow flex flex-col" style={{ backgroundColor: brandColors.background || '#FFFFFF' }}>
      {/* Product Image — auto-slides through all uploaded images */}
      <div
        className={`aspect-square relative overflow-hidden ${zoomEnabled && images.length > 0 ? 'cursor-zoom-in' : ''}`}
        style={{ backgroundColor: brandColors.background || '#FFFFFF' }}
        onClick={handleCardImageClick}
      >
        {images.length > 0 ? (
          <>
            {images.map((img, idx) => (
              <img
                key={img.id || idx}
                src={img.url}
                alt={product.name}
                className="absolute inset-0 w-full h-full object-cover transition-opacity duration-700"
                style={{ opacity: idx === activeImageIndex ? 1 : 0 }}
              />
            ))}
            {zoomEnabled && (
              <div className="absolute top-1.5 right-1.5 bg-black/40 text-white rounded-full p-1 flex items-center justify-center">
                <span className="material-symbols-outlined text-sm leading-none">zoom_in</span>
              </div>
            )}
            {images.length > 1 && (
              <div className="absolute bottom-1.5 left-0 right-0 flex justify-center gap-1">
                {images.map((_, idx) => (
                  <span
                    key={idx}
                    className="w-1.5 h-1.5 rounded-full transition-colors"
                    style={{ backgroundColor: idx === activeImageIndex ? primaryColor : 'rgba(255,255,255,0.7)' }}
                  />
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

      {/* Portal the quick-view modal into the device frame, so it stays visually
          contained within the simulated device instead of the whole browser. */}
      {deviceFrameNode && ReactDOM.createPortal(quickViewModal, deviceFrameNode)}

      <div className="p-3 flex-1 flex flex-col">
        <h4 className="font-semibold text-sm line-clamp-2" style={{ color: fontColor, fontFamily: headingFont }}>
          {product.name}
        </h4>

        {/* Price — always the first variant/size on the card; full picker lives in quick view */}
        <div className="mt-1.5 flex flex-wrap items-baseline gap-x-1.5 gap-y-0.5">
          <span className="text-base font-bold" style={{ color: primaryColor }}>
            ₹{cardPrice.toFixed(2)}
          </span>
          {discount > 0 && (
            <>
              <span className="text-xs line-through opacity-60" style={{ color: fontBodyColor, fontFamily: bodyFont }}>
                ₹{cardOriginalPrice.toFixed(2)}
              </span>
              <span className="text-[10px] font-bold px-1 py-0.5 rounded whitespace-nowrap" style={{ backgroundColor: `${primaryColor}20`, color: primaryColor, fontFamily: bodyFont }}>
                {Math.round(discount)}% OFF
              </span>
            </>
          )}
        </div>

        {hasMultipleOptions && (
          <button
            onClick={() => setQuickViewOpen(true)}
            className="text-xs mt-1 text-left underline decoration-dotted"
            style={{ color: fontBodyColor, fontFamily: bodyFont }}
          >
            {product.variations.length > 1 ? `${product.variations.length} options` : `${product.variations[0].sizes.length} sizes`} available
          </button>
        )}

        {/* Add to Cart Button */}
        <button
          onClick={handleAddToCart}
          className="w-full mt-auto pt-2 py-1.5 rounded-lg font-semibold text-sm transition-opacity hover:opacity-90"
          style={{ backgroundColor: brandColors.button || primaryColor, color: buttonLabelColor, marginTop: '0.5rem' }}
        >
          {zoomEnabled && hasMultipleOptions ? 'View Options' : addToCartLabel}
        </button>
      </div>
    </div>
  );
};

export default PreviewProductCard;
