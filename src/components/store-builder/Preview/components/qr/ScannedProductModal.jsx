import React, { useState } from 'react';

const ScannedProductModal = ({ product, primaryColor, onAddToCart, onScanAgain, addToCartLabel = 'Add to Cart' }) => {
  const [quantity, setQuantity] = useState(1);

  const displayPrice = product.scanned_price || product.price || 0;
  const imageUrl = product.image_url || (Array.isArray(product.images) ? product.images[0] : null) || '';

  return (
    <div>
      {/* Product image */}
      {imageUrl && (
        <div style={{ borderRadius: 12, overflow: 'hidden', marginBottom: 14, height: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f8f8f8' }}>
          <img
            src={imageUrl}
            alt={product.name}
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          />
        </div>
      )}

      {/* Product info */}
      <div style={{ marginBottom: 16 }}>
        <div style={{ fontWeight: 700, fontSize: 18, color: '#111', marginBottom: 6 }}>
          {product.name}
        </div>

        {/* Variant · Size · Unit — clean row */}
        {(product.variation_name || product.size || product.size_label) && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 10 }}>
            {product.variation_name && (
              <span style={tag}>{product.variation_name}</span>
            )}
            {product.size && (
              <span style={tag}>
                {product.size}{product.unit ? ' ' + product.unit : ''}
              </span>
            )}
          </div>
        )}

        {product.description && (
          <div style={{ fontSize: 13, color: '#888', marginBottom: 8, lineHeight: 1.5 }}>
            {product.description}
          </div>
        )}

        <div style={{ fontWeight: 800, fontSize: 24, color: primaryColor || '#1a56db' }}>
          ₹{Number(displayPrice).toLocaleString('en-IN')}
        </div>
      </div>

      {/* Quantity selector */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 20 }}>
        <span style={{ fontSize: 14, fontWeight: 600, color: '#444' }}>Qty</span>
        <div style={{ display: 'flex', alignItems: 'center', border: '1.5px solid #e5e7eb', borderRadius: 10, overflow: 'hidden' }}>
          <button
            onClick={() => setQuantity(q => Math.max(1, q - 1))}
            style={{ width: 40, height: 40, background: '#f9fafb', border: 'none', fontSize: 20, cursor: 'pointer', fontWeight: 700, color: '#333' }}
          >−</button>
          <span style={{ minWidth: 44, textAlign: 'center', fontWeight: 700, fontSize: 17 }}>{quantity}</span>
          <button
            onClick={() => setQuantity(q => q + 1)}
            style={{ width: 40, height: 40, background: '#f9fafb', border: 'none', fontSize: 20, cursor: 'pointer', fontWeight: 700, color: '#333' }}
          >+</button>
        </div>
        <span style={{ fontSize: 14, color: '#666', fontWeight: 600 }}>
          ₹{(Number(displayPrice) * quantity).toLocaleString('en-IN')}
        </span>
      </div>

      {/* Add to cart — label from Step 3 config */}
      <button
        onClick={() => onAddToCart(product, quantity)}
        style={{
          width: '100%', padding: '14px', borderRadius: 12, border: 'none',
          background: primaryColor || '#1a56db', color: '#fff',
          fontWeight: 700, fontSize: 16, cursor: 'pointer', marginBottom: 10
        }}
      >
        {addToCartLabel}
      </button>

    </div>
  );
};

const tag = {
  background: '#f1f5f9',
  border: '1px solid #e2e8f0',
  borderRadius: 6,
  padding: '3px 10px',
  fontSize: 13,
  color: '#334155',
  fontWeight: 600,
};

export default ScannedProductModal;
