import React from 'react';

const PreviewBanner = ({
  image,
  tagline,
  subtitle,
  cta,
  height = 400,
  bgColor = '#25D366',
  showText = true,
  showCta = true,
  textAlignment = 'center',
  textColor = '#FFFFFF',
  primaryColor = '#25D366',
  device = 'desktop',
}) => {
  const getAlignmentClass = () => {
    switch(textAlignment) {
      case 'left': return 'items-start text-left';
      case 'right': return 'items-end text-right';
      default: return 'items-center text-center';
    }
  };

  // Same reasoning as the product grid: md:/lg: text classes watch the real
  // browser window, not this simulated device box, so they'd stay oversized
  // even in "Mobile" mode. Compute sizes from `device` directly instead.
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

  return (
    <div 
      className="relative w-full overflow-hidden rounded-xl mb-6"
      style={{ 
        height: `${height || 400}px`,
        backgroundColor: bgColor || '#25D366',
        minHeight: '200px'
      }}
    >
      {image ? (
        <>
          <img 
            src={image} 
            alt="Store Banner" 
            className="w-full h-full object-cover"
          />
          <div className={`absolute inset-0 bg-black/30 flex flex-col justify-center p-6 ${getAlignmentClass()}`}>
            {showText && (
              <div className="max-w-2xl">
                <h1 
                  className={`${headingSizeClass} font-bold drop-shadow-lg mb-2`}
                  style={{ color: textColor || '#FFFFFF' }}
                >
                  {tagline || 'Fresh, Organic & Delivered'}
                </h1>
                <p 
                  className={`${subtitleSizeClass} drop-shadow-md`}
                  style={{ color: textColor || '#FFFFFF', opacity: 0.9 }}
                >
                  {subtitle || '100% Natural Stone-Ground Flour'}
                </p>
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
        </>
      ) : (
        <div className={`w-full h-full flex flex-col justify-center p-6 ${getAlignmentClass()}`}>
          {showText && (
            <div className="max-w-2xl">
              <h1 
                className={`${headingSizeClass} font-bold drop-shadow-lg mb-2`}
                style={{ color: textColor || '#FFFFFF' }}
              >
                {tagline || 'Fresh, Organic & Delivered'}
              </h1>
              <p 
                className={`${subtitleSizeClass} drop-shadow-md`}
                style={{ color: textColor || '#FFFFFF', opacity: 0.9 }}
              >
                {subtitle || '100% Natural Stone-Ground Flour'}
              </p>
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

export default PreviewBanner;