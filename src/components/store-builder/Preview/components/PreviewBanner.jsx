import React, { useState, useEffect, useRef } from 'react';

// Accepts either:
//   image  — legacy single string (backward-compat)
//   images — array of { url, focalX, focalY, scale } objects OR plain strings (multi-banner)
// Auto-slides when images.length > 1. Static when single.
//
// Image rendering: no objectFit — uses naturalWidth/naturalHeight to compute explicit
// pixel dimensions so zoom (scale) shows the full raw image, not a pre-cropped version.
const PreviewBanner = ({
  image,
  images,
  tagline,
  subtitle,
  cta,
  height = 400,
  bgColor = '#25D366',
  showText = true,
  showCta = true,
  textAlignment = 'center',
  textColor = '#FFFFFF',
  textShadow = true,
  primaryColor = '#25D366',
  device = 'desktop',
  fonts = { body: 'Inter' },
}) => {
  // Normalise to array of { url, focalX, focalY, scale } objects
  const allImages = (() => {
    const raw = (images && images.length > 0) ? images : image ? [image] : [];
    return raw.map(item =>
      typeof item === 'string'
        ? { url: item, focalX: 50, focalY: 50, scale: 1 }
        : { focalX: 50, focalY: 50, scale: 1, ...item }
    );
  })();

  const isMulti = allImages.length > 1;
  const [activeIdx, setActiveIdx] = useState(0);
  const timerRef = useRef(null);
  // naturalWidth/Height keyed by image url
  const [naturalSizes, setNaturalSizes] = useState({});

  // Auto-slide every 3.5 s when multi-banner
  useEffect(() => {
    if (!isMulti) return;
    timerRef.current = setInterval(() => {
      setActiveIdx(prev => (prev + 1) % allImages.length);
    }, 3500);
    return () => clearInterval(timerRef.current);
  }, [isMulti, allImages.length]);

  const goTo = (idx) => {
    clearInterval(timerRef.current);
    setActiveIdx(idx);
    if (isMulti) {
      timerRef.current = setInterval(() => {
        setActiveIdx(prev => (prev + 1) % allImages.length);
      }, 3500);
    }
  };

  const prev = () => goTo((activeIdx - 1 + allImages.length) % allImages.length);
  const next = () => goTo((activeIdx + 1) % allImages.length);

  const getAlignmentClass = () => {
    switch(textAlignment) {
      case 'left': return 'items-start text-left';
      case 'right': return 'items-end text-right';
      default: return 'items-center text-center';
    }
  };

  const headingSizeClass = {
    mobile: 'text-2xl',
    tablet: 'text-3xl',
    desktop: 'text-4xl',
  }[device] || 'text-4xl';

  const subtitleSizeClass = {
    mobile: 'text-sm',
    tablet: 'text-base',
    desktop: 'text-lg',
  }[device] || 'text-lg';

  const currentImage = allImages[activeIdx] || null;
  const containerH = height || 400;

  return (
    <div
      className="relative overflow-hidden mb-6"
      style={{
        height: `${containerH}px`,
        backgroundColor: bgColor || '#25D366',
      }}
    >
      {/* Image layer — fade transition between slides */}
      {allImages.map((slide, i) => (
        <SlideImage
          key={slide.url + i}
          slide={slide}
          containerH={containerH}
          naturalSizes={naturalSizes}
          onLoad={(url, w, h) => setNaturalSizes(prev => ({ ...prev, [url]: { w, h } }))}
          opacity={i === activeIdx ? 1 : 0}
        />
      ))}

      {/* Text + CTA overlay */}
      <div
        className={`absolute inset-0 flex flex-col justify-center p-6 ${getAlignmentClass()}`}
        style={{ zIndex: 2 }}
      >
        {showText && (
          <div
            className="max-w-2xl"
            style={{ textShadow: (currentImage?.url && textShadow) ? '0 1px 2px rgba(0,0,0,0.8)' : 'none' }}
          >
            <h1
              className={`${headingSizeClass} font-bold mb-2`}
              style={{ color: textColor || '#FFFFFF', fontFamily: fonts?.body || 'Inter' }}
            >
              {tagline}
            </h1>
            {subtitle && subtitle.trim() && (
              <p
                className={`${subtitleSizeClass}`}
                style={{ color: textColor || '#FFFFFF', opacity: 0.9 }}
              >
                {subtitle.trim()}
              </p>
            )}
          </div>
        )}
        {showCta && (
          <button
            className="px-8 py-3 rounded-lg font-bold text-white shadow-lg hover:opacity-90 transition-opacity mt-4"
            style={{ backgroundColor: primaryColor || '#25D366' }}
          >
            {cta || 'Shop Now'}
          </button>
        )}
      </div>

      {/* Prev / Next arrows — only for multi */}
      {isMulti && (
        <>
          <button
            onClick={prev}
            className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/40 hover:bg-black/60 text-white rounded-full p-1 transition-all"
            style={{ zIndex: 3 }}
            aria-label="Previous banner"
          >
            <span className="material-symbols-outlined text-lg">chevron_left</span>
          </button>
          <button
            onClick={next}
            className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/40 hover:bg-black/60 text-white rounded-full p-1 transition-all"
            style={{ zIndex: 3 }}
            aria-label="Next banner"
          >
            <span className="material-symbols-outlined text-lg">chevron_right</span>
          </button>

          {/* Dot indicators */}
          <div
            className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5"
            style={{ zIndex: 3 }}
          >
            {allImages.map((_, i) => (
              <button
                key={i}
                onClick={() => goTo(i)}
                className="rounded-full transition-all"
                style={{
                  width: i === activeIdx ? '20px' : '8px',
                  height: '8px',
                  backgroundColor: i === activeIdx ? '#ffffff' : 'rgba(255,255,255,0.5)',
                }}
                aria-label={`Go to slide ${i + 1}`}
              />
            ))}
          </div>
        </>
      )}

      {/* No-image fallback (colour bg + text only) */}
      {allImages.length === 0 && (
        <div className={`w-full h-full flex flex-col justify-center p-6 ${getAlignmentClass()}`} style={{ position: 'relative', zIndex: 2 }}>
          {showText && (
            <div className="max-w-2xl">
              <h1 className={`${headingSizeClass} font-bold mb-2`} style={{ color: textColor || '#FFFFFF', fontFamily: fonts?.body || 'Inter' }}>
                {tagline}
              </h1>
              {subtitle && subtitle.trim() && (
                <p className={`${subtitleSizeClass}`} style={{ color: textColor || '#FFFFFF', opacity: 0.9 }}>
                  {subtitle.trim()}
                </p>
              )}
            </div>
          )}
          {showCta && (
            <button
              className="px-8 py-3 rounded-lg font-bold text-white shadow-lg hover:opacity-90 transition-opacity mt-4"
              style={{ backgroundColor: primaryColor || '#25D366' }}
            >
              {cta || 'Shop Now'}
            </button>
          )}
        </div>
      )}
    </div>
  );
};

// SlideImage: measures its own container width to compute pixel-exact placement.
// Same math as the adjuster in Step2_ProductConfig.jsx.
const SlideImage = ({ slide, containerH, naturalSizes, onLoad, opacity }) => {
  const containerRef = useRef(null);
  const [containerW, setContainerW] = useState(0);

  useEffect(() => {
    if (!containerRef.current) return;
    const ro = new ResizeObserver(entries => {
      setContainerW(entries[0].contentRect.width);
    });
    ro.observe(containerRef.current);
    setContainerW(containerRef.current.getBoundingClientRect().width);
    return () => ro.disconnect();
  }, []);

  const nat = naturalSizes[slide.url];
  const scale = slide.scale ?? 1;
  const focalX = slide.focalX ?? 50;
  const focalY = slide.focalY ?? 50;

  let imgStyle;
  if (nat && containerW > 0) {
    // Cover geometry: scale image until it fills both container dimensions,
    // then multiply by user zoom (scale). Same as adjuster in Step2.
    const coverSc = Math.max(containerW / nat.w, containerH / nat.h);
    const imgW = nat.w * coverSc * scale;
    const imgH = nat.h * coverSc * scale;
    const focalPxX = (focalX / 100) * imgW;
    const focalPxY = (focalY / 100) * imgH;
    const left = containerW / 2 - focalPxX;
    const top  = containerH / 2 - focalPxY;
    imgStyle = {
      position: 'absolute',
      width: `${imgW}px`,
      height: `${imgH}px`,
      left: `${left}px`,
      top: `${top}px`,
    };
  } else {
    // Before natural size is known — fill container temporarily
    imgStyle = { position: 'absolute', width: '100%', height: '100%', left: 0, top: 0, objectFit: 'cover' };
  }

  return (
    <div
      ref={containerRef}
      style={{
        position: 'absolute', inset: 0,
        opacity,
        transition: 'opacity 0.6s ease-in-out',
        overflow: 'hidden',
        pointerEvents: 'none',
      }}
    >
      <img
        src={slide.url}
        alt=""
        draggable={false}
        onLoad={(e) => onLoad(slide.url, e.target.naturalWidth, e.target.naturalHeight)}
        style={{ ...imgStyle, pointerEvents: 'none' }}
      />
    </div>
  );
};

export default PreviewBanner;
