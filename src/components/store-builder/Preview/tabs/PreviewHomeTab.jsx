import React, { useState } from 'react';
import PreviewBanner from '../components/PreviewBanner';
import PreviewProductCard from '../components/PreviewProductCard';

const PreviewHomeTab = ({ data, onAddToCart, device = 'desktop' }) => {
  const { banner, categories, brand, products, enableProductSearch, settings = {} } = data;
  const brandFonts = brand.fonts || { heading: 'Inter', body: 'Inter' };
  const imgSize = settings.categoryImageSize || 'S';
  const imgShape = settings.categoryImageShape || 'circle';
  const imgSizeClass = imgSize === 'L' ? 'w-[72px] h-[72px]' : imgSize === 'M' ? 'w-16 h-16' : 'w-12 h-12';
  const imgShapeClass = imgShape === 'circle' ? 'rounded-full' : 'rounded-lg';
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  const allProducts = products || [];
  const allCategories = categories || [];
  const searchEnabled = enableProductSearch !== false;

  const trimmedQuery = searchQuery.trim();
  const isSearching = searchEnabled && trimmedQuery.length > 0;

  const gridColsClass = {
    mobile: 'grid-cols-2',
    tablet: 'grid-cols-2',
    desktop: 'grid-cols-3',
  }[device] || 'grid-cols-3';

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
    if (value.trim().length > 0) {
      setSelectedCategory('all');
    }
  };

  const clearSearch = () => setSearchQuery('');

  return (
    <div className="p-4 max-w-7xl mx-auto">
      <PreviewBanner
        image={banner.image}
        tagline={banner.tagline}
        subtitle={banner.subtitle}
        cta={banner.cta}
        height={banner.height}
        bgColor={banner.bgColor}
        showText={banner.showText}
        showCta={banner.showCta}
        textAlignment={banner.textAlignment}
        textColor={banner.textColor}
        primaryColor={brand.colors.primary}
        device={device}
      />

      {searchEnabled && (
        <div className="mb-4 mt-4">
          <div
            className="relative flex items-center rounded-full border-2 px-4 py-2"
            style={{ borderColor: isSearching ? brand.colors.primary : brand.colors.secondary }}
          >
            <span className="material-symbols-outlined text-lg mr-2" style={{ color: brand.colors.fontBody}}>
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
                style={{ color: brand.colors.fontBody, fontFamily: brand.fonts?.body || 'Inter' }}
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
          <div className="flex gap-3 min-w-max items-end">

            {/* All pill — always simple text pill */}
            <button
              onClick={() => { setSelectedCategory('all'); clearSearch(); }}
              className="flex items-center gap-1.5 px-4 py-2 rounded-full font-medium text-sm transition-colors whitespace-nowrap border-2 hover:opacity-80 flex-shrink-0"
              style={selectedCategory === 'all' && !isSearching
                ? { borderColor: brand.colors.primary, backgroundColor: brand.colors.primary, color: '#fff', fontFamily: brand.fonts?.body || 'Inter' }
                : { borderColor: brand.colors.secondary, backgroundColor: 'transparent', color: brand.colors.fontBody, fontFamily: brand.fonts?.body || 'Inter' }
              }
            >
              All ({allProducts.length})
            </button>

            {allCategories.map((category) => {
              const isSelected = selectedCategory === category.id && !isSearching;
              const hasImage = !!category.image?.url;
              const selectedStyle = { borderColor: brand.colors.primary, backgroundColor: brand.colors.primary, color: '#fff', fontFamily: brand.fonts?.body || 'Inter' };
              const defaultStyle = { borderColor: brand.colors.secondary, backgroundColor: 'transparent', color: brand.colors.fontBody, fontFamily: brand.fonts?.body || 'Inter' };

              // No image → always simple pill
              if (!hasImage) {
                return (
                  <button
                    key={category.id}
                    onClick={() => { setSelectedCategory(category.id); clearSearch(); }}
                    className="flex items-center px-4 py-2 rounded-full font-medium text-sm transition-colors whitespace-nowrap border-2 hover:opacity-80 flex-shrink-0"
                    style={isSelected ? selectedStyle : defaultStyle}
                  >
                    {category.name} ({category.products?.length || 0})
                  </button>
                );
              }

              // S size → horizontal pill: image left, text right
              if (imgSize === 'S') {
                return (
                  <button
                    key={category.id}
                    onClick={() => { setSelectedCategory(category.id); clearSearch(); }}
                    className="flex items-center gap-2 pl-1.5 pr-4 py-1.5 rounded-full font-medium text-sm transition-colors whitespace-nowrap border-2 hover:opacity-80 flex-shrink-0"
                    style={isSelected ? selectedStyle : defaultStyle}
                  >
                    <img src={category.image.url} alt={category.name} className={`w-6 h-6 ${imgShapeClass} object-cover flex-shrink-0`} />
                    {category.name} ({category.products?.length || 0})
                  </button>
                );
              }

              // M size → vertical card: image top, text below
              if (imgSize === 'M') {
                return (
                  <button
                    key={category.id}
                    onClick={() => { setSelectedCategory(category.id); clearSearch(); }}
                    className="flex flex-col items-center gap-1.5 p-2 font-medium text-sm transition-colors border-2 hover:opacity-80 flex-shrink-0 rounded-xl"
                    style={{ ...(isSelected ? selectedStyle : defaultStyle), width: '80px' }}
                  >
                    <img src={category.image.url} alt={category.name} className={`w-14 h-14 ${imgShapeClass} object-cover flex-shrink-0`} />
                    <span className="text-xs text-center leading-tight">{category.name} ({category.products?.length || 0})</span>
                  </button>
                );
              }

              // L size → overlay card: image fills, text overlaid
              if (imgSize === 'L') {
                return (
                  <button
                    key={category.id}
                    onClick={() => { setSelectedCategory(category.id); clearSearch(); }}
                    className={`relative flex items-end justify-center overflow-hidden font-medium text-sm transition-colors border-2 hover:opacity-80 flex-shrink-0 ${imgShapeClass}`}
                    style={{ width: '110px', height: '110px', borderColor: isSelected ? brand.colors.primary : brand.colors.secondary }}
                  >
                    <img src={category.image.url} alt={category.name} className="absolute inset-0 w-full h-full object-cover" />
                    <div className="absolute inset-0" style={{ background: isSelected ? `${brand.colors.primary}99` : 'linear-gradient(to top, rgba(0,0,0,0.6) 40%, transparent 100%)' }} />
                    <span className="relative z-10 text-white text-xs text-center pb-2 px-1 leading-tight font-semibold drop-shadow">
                      {category.name} ({category.products?.length || 0})
                    </span>
                  </button>
                );
              }
            })}
          </div>
        </div>
      )}

      {!hasProducts ? (
        <div className="text-center py-12" style={{ color: brand.colors.fontBody, fontFamily: brand.fonts?.body || 'Inter' }}>
          <span className="material-symbols-outlined text-6xl block mb-4 opacity-30">storefront</span>
          <p>No products added yet. Add some products to see preview.</p>
        </div>
      ) : filteredProducts.length === 0 ? (
        <div className="text-center py-10" style={{ color: brand.colors.fontBody, fontFamily: brand.fonts?.body || 'Inter' }}>
          {isSearching ? (
            <>
              <span className="material-symbols-outlined text-5xl block mb-3 opacity-30">search_off</span>
              <p>No products found for "{trimmedQuery}"</p>
            </>
          ) : (
            <p>No products in this category</p>
          )}
        </div>
      ) : (
        <div className={`grid ${gridColsClass} gap-4`}>
          {filteredProducts.map((product) => (
            <PreviewProductCard
              key={product.id}
              product={product}
              brandColors={brand.colors}
              brandFonts={brand.fonts}
              onAddToCart={onAddToCart}
              autoSlide={settings?.autoSlideProductImages || false}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default PreviewHomeTab;
