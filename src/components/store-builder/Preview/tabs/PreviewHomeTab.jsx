import React, { useState } from 'react';
import PreviewBanner from '../components/PreviewBanner';
import PreviewProductCard from '../components/PreviewProductCard';

const PreviewHomeTab = ({ data, onAddToCart, device = 'desktop' }) => {
  const { banner, categories, brand, products } = data;
  const [selectedCategory, setSelectedCategory] = useState('all');

  const allProducts = products || [];
  const allCategories = categories || [];

  // The Mobile/Tablet/Desktop toggle only shrinks a container div — it does NOT
  // change the real browser viewport. Tailwind's sm:/md:/lg: prefixes respond to
  // the actual window width, so they'd stay "desktop" even when this box is
  // narrowed. We compute columns from the `device` prop directly instead.
  const gridColsClass = {
    mobile: 'grid-cols-2',
    tablet: 'grid-cols-2',
    desktop: 'grid-cols-3',
  }[device] || 'grid-cols-3';

  const getFilteredProducts = () => {
    if (selectedCategory === 'all') return allProducts;
    const category = allCategories.find(c => c.id === selectedCategory);
    if (category) return category.products || [];
    return [];
  };

  const filteredProducts = getFilteredProducts();
  const hasProducts = allProducts.length > 0;

  return (
    <div className="p-4 max-w-7xl mx-auto">
      {/* Hero Banner - Responsive */}
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

      {/* Category Filter Tabs - Scrollable on mobile */}
      {allCategories.length > 0 && (
        <div className="mb-6 overflow-x-auto">
          <div className="flex gap-2 border-b border-[#e0e3e6] pb-2 min-w-max">
            <button
              onClick={() => setSelectedCategory('all')}
              className={`px-4 py-2 rounded-lg font-medium text-sm transition-colors whitespace-nowrap ${
                selectedCategory === 'all'
                  ? 'text-white'
                  : 'hover:bg-[#f2f4f7]'
              }`}
              style={selectedCategory === 'all'
                ? { backgroundColor: brand.colors.primary, color: brand.colors.buttonLabel || '#005523' }
                : { color: brand.colors.secondary }
              }
            >
              All ({allProducts.length})
            </button>
            {allCategories.map((category) => (
              <button
                key={category.id}
                onClick={() => setSelectedCategory(category.id)}
                className={`px-4 py-2 rounded-lg font-medium text-sm transition-colors whitespace-nowrap ${
                  selectedCategory === category.id
                    ? 'text-white'
                    : 'hover:bg-[#f2f4f7]'
                }`}
                style={selectedCategory === category.id
                  ? { backgroundColor: brand.colors.primary, color: brand.colors.buttonLabel || '#005523' }
                  : { color: brand.colors.secondary }
                }
              >
                {category.name} ({category.products?.length || 0})
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Products Grid - Fully Responsive */}
      {!hasProducts ? (
        <div className="text-center py-12" style={{ color: brand.colors.secondary }}>
          <span className="material-symbols-outlined text-6xl block mb-4 opacity-30">storefront</span>
          <p>No products added yet. Add some products to see preview.</p>
        </div>
      ) : filteredProducts.length === 0 ? (
        <div className="text-center py-8" style={{ color: brand.colors.secondary }}>
          <p>No products in this category</p>
        </div>
      ) : (
        <div className={`grid ${gridColsClass} gap-4`}>
          {filteredProducts.map((product) => (
            <PreviewProductCard
              key={product.id}
              product={product}
              brandColors={brand.colors}
              onAddToCart={onAddToCart}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default PreviewHomeTab;