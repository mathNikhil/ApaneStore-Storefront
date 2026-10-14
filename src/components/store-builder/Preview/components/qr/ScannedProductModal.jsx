import React, { useState } from 'react';

const ScannedProductModal = ({ product, primaryColor, onAddToCart, onScanAgain }) => {
  const [quantity, setQuantity] = useState(1);

  const displayPrice = product.variant?.price || product.scanned_price || product.price || 0;
  const images = Array.isArray(product.images) ? product.images : [];

  return (
    <div>
      {/* Product image */}
      {images[0] && (
        <div style={{ borderRadius: 12, overflow: 'hidden', marginBottom: 14, maxHeight: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f8f8f8' }}>
          <img
            src={images[0]}
            alt={product.name}
            style={{ width: '100%', objectFit: 'cover', maxHeight: 200 }}
          />
        </div>
      )}

      {/* Product info */}
      <div style={{ marginBottom: 16 }}>
        <div style={{ fontWeight: 700, fontSize: 18, color: '#111', marginBottom: 4 }}>{product.name}</div>
        {product.variant && (
          <div style={{ fontSize: 14, color: '#666', marginBottom: 4 }}>
            {Object.entries(product.variant)
              .filter(([k]) => !['id','product_id','price','stock','created_at'].includes(k) && product.variant[k])
              .map(([k, v]) => `${k}: ${v}`)
              .join(' · ')}
          </div>
        )}
        {product.description && (
          <div style={{ fontSize: 13, color: '#888', marginBottom: 8, lineHeight: 1.4 }}>{product.description}</div>
        )}
        <div style={{ fontWeight: 800, fontSize: 22, color: primaryColor || '#1a56db' }}>
          ₹{Number(displayPrice).toLocaleString('en-IN')}
        </div>
      </div>

      {/* Quantity selector */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 20 }}>
        <span style={{ fontSize: 14, fontWeight: 600, color: '#444' }}>Quantity</span>
        <div style={{ display: 'flex', alignItems: 'center', border: '1px solid #e5e7eb', borderRadius: 8, overflow: 'hidden' }}>
          <button
            onClick={() => setQuantity(q => Math.max(1, q - 1))}
            style={{ width: 36, height: 36, background: '#f9fafb', border: 'none', fontSize: 18, cursor: 'pointer', fontWeight: 700, color: '#333' }}
          >−</button>
          <span style={{ minWidth: 40, textAlign: 'center', fontWeight: 700, fontSize: 16 }}>{quantity}</span>
          <button
            onClick={() => setQuantity(q => q + 1)}
            style={{ width: 36, height: 36, background: '#f9fafb', border: 'none', fontSize: 18, cursor: 'pointer', fontWeight: 700, color: '#333' }}
          >+</button>
        </div>
        <span style={{ fontSize: 14, color: '#888' }}>
          Total: ₹{(Number(displayPrice) * quantity).toLocaleString('en-IN')}
        </span>
      </div>

      {/* Actions */}
      <button
        onClick={() => onAddToCart(product, quantity)}
        style={{
          width: '100%', padding: '13px', borderRadius: 12, border: 'none',
          background: primaryColor || '#1a56db', color: '#fff',
          fontWeight: 700, fontSize: 16, cursor: 'pointer', marginBottom: 10
        }}
      >
        Add to Cart
      </button>
      <button
        onClick={onScanAgain}
        style={{
          width: '100%', padding: '11px', borderRadius: 12,
          border: '1px solid #e5e7eb', background: '#fff',
          color: '#555', fontWeight: 600, fontSize: 14, cursor: 'pointer'
        }}
      >
        Scan Another Product
      </button>
    </div>
  );
};

export default ScannedProductModal;
