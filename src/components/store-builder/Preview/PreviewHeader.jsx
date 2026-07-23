import React from 'react';

const PreviewHeader = ({ brand, cartCount = 0 }) => {
  const { name, tagline, logo, colors, fonts } = brand;

  return (
    <header 
      className="w-full border-b flex-shrink-0"
      style={{ 
        backgroundColor: colors.background || '#FFFFFF',
        borderColor: colors.secondary || '#e0e3e6'
      }}
    >
      <div className="flex items-center justify-between px-4 py-3 max-w-7xl mx-auto">
        {/* Logo & Brand */}
        <div className="flex items-center gap-3">
          {logo ? (
            <img 
              src={logo} 
              alt={name} 
              className="w-10 h-10 rounded-full object-cover"
            />
          ) : (
            <div 
              className="w-10 h-10 rounded-full flex items-center justify-center"
              style={{ backgroundColor: colors.primary }}
            >
              <span className="material-symbols-outlined text-white text-xl">storefront</span>
            </div>
          )}
          <div>
            <h1 
              className="font-bold text-lg"
              style={{ 
                color: colors.font || '#191C1E',
                fontFamily: fonts.heading || 'Inter'
              }}
            >
              {name || 'Your Store'}
            </h1>
            <p 
              className="text-xs"
              style={{ 
                color: colors.secondary || '#556067',
                fontFamily: fonts.body || 'Inter'
              }}
            >
              {tagline || 'Your tagline here'}
            </p>
          </div>
        </div>

        {/* Cart Icon */}
        <button className="relative p-2 hover:bg-[#f2f4f7] rounded-full transition-colors">
          <span className="material-symbols-outlined" style={{ color: colors.font }}>
            shopping_cart
          </span>
          {cartCount > 0 && (
            <span 
              className="absolute -top-1 -right-1 w-5 h-5 rounded-full text-xs font-bold flex items-center justify-center text-white"
              style={{ backgroundColor: colors.primary }}
            >
              {cartCount}
            </span>
          )}
        </button>
      </div>
    </header>
  );
};

export default PreviewHeader;