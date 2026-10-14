import React, { useRef, useState } from 'react';
import ScannedProductModal from './ScannedProductModal';

const API = import.meta.env.VITE_API_URL || 'https://api.aapnaestore.com';

const QRScannerModal = ({ storeId, primaryColor, onAddToCart, onClose, customerToken, addToCartLabel = 'Add to Cart' }) => {
  const fileInputRef = useRef(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [scannedProduct, setScannedProduct] = useState(null);

  const handleCapture = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setError('');
    setLoading(true);

    try {
      const { BrowserQRCodeReader } = await import('@zxing/browser');
      const codeReader = new BrowserQRCodeReader();

      // Draw image to canvas, decode QR from it
      const imageBitmap = await createImageBitmap(file);
      const canvas = document.createElement('canvas');
      canvas.width = imageBitmap.width;
      canvas.height = imageBitmap.height;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(imageBitmap, 0, 0);

      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const result = await codeReader.decodeFromCanvas(canvas);

      if (!result) {
        setError('No QR code found in photo. Try again with better lighting.');
        setLoading(false);
        return;
      }

      await handleScannedToken(result.getText());
    } catch {
      setError('Could not read QR code. Make sure the QR is clear and well-lit.');
      setLoading(false);
    }

    // Reset input so same file can be re-selected
    e.target.value = '';
  };

  const handleScannedToken = async (token) => {
    try {
      const res = await fetch(`${API}/api/qr/validate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(customerToken ? { 'Authorization': `Bearer ${customerToken}` } : {})
        },
        body: JSON.stringify({ token, store_id: storeId })
      });
      const data = await res.json();

      if (!data.valid) {
        const messages = {
          store_mismatch: 'This QR code belongs to a different store.',
          qr_service_expired: 'QR service has expired for this store.',
          product_not_found: 'Product not found.',
          invalid_token: 'Invalid QR code. Please try again.',
          invalid_signature: 'QR code has been tampered with.',
        };
        setError(messages[data.reason] || 'Invalid QR code.');
        setLoading(false);
        return;
      }

      setScannedProduct(data.product);
    } catch {
      setError('Network error. Please check your connection.');
    }
    setLoading(false);
  };

  const handleAddToCart = (product, quantity) => {
    onAddToCart(product, quantity);
    onClose();
  };

  const handleScanAgain = () => {
    setScannedProduct(null);
    setError('');
  };

  return (
    <div style={overlay}>
      <div style={modal}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <div>
            <div style={{ fontWeight: 700, fontSize: 17, color: '#111' }}>📷 Scan Product</div>
            <div style={{ fontSize: 13, color: '#888', marginTop: 2 }}>Take a photo of the product QR code</div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 24, cursor: 'pointer', color: '#666', lineHeight: 1 }}>×</button>
        </div>

        {!scannedProduct && (
          <>
            {/* Capture button */}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              onChange={handleCapture}
              style={{ display: 'none' }}
            />

            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={loading}
              style={{
                width: '100%',
                padding: '48px 20px',
                border: `2px dashed ${primaryColor || '#1a56db'}`,
                borderRadius: 16,
                background: loading ? '#f8faff' : '#f0f4ff',
                cursor: loading ? 'default' : 'pointer',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 12,
                marginBottom: 16,
              }}
            >
              {loading ? (
                <>
                  <div style={{ fontSize: 40 }}>⏳</div>
                  <div style={{ fontSize: 15, fontWeight: 600, color: primaryColor || '#1a56db' }}>Reading QR code...</div>
                </>
              ) : (
                <>
                  <div style={{ fontSize: 48 }}>📷</div>
                  <div style={{ fontSize: 15, fontWeight: 700, color: primaryColor || '#1a56db' }}>Tap to take photo</div>
                  <div style={{ fontSize: 12, color: '#888' }}>Point camera at the QR code and snap</div>
                </>
              )}
            </button>

            {error && (
              <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, padding: 12, color: '#dc2626', fontSize: 13, marginBottom: 12 }}>
                {error}
                <div style={{ marginTop: 8 }}>
                  <button
                    onClick={() => { setError(''); fileInputRef.current?.click(); }}
                    style={{ background: '#dc2626', color: '#fff', border: 'none', borderRadius: 6, padding: '6px 14px', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}
                  >
                    Try Again
                  </button>
                </div>
              </div>
            )}

            <div style={{ fontSize: 12, color: '#aaa', textAlign: 'center' }}>
              💡 Good lighting = faster scan
            </div>
          </>
        )}

        {scannedProduct && (
          <ScannedProductModal
            product={scannedProduct}
            primaryColor={primaryColor}
            onAddToCart={handleAddToCart}
            onScanAgain={handleScanAgain}
            addToCartLabel={addToCartLabel}
          />
        )}
      </div>
    </div>
  );
};

const overlay = {
  position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)',
  display: 'flex', alignItems: 'flex-end', justifyContent: 'center', zIndex: 1000
};
const modal = {
  background: '#fff', borderRadius: '20px 20px 0 0', padding: 20,
  width: '100%', maxWidth: 480, maxHeight: '90vh', overflowY: 'auto'
};

export default QRScannerModal;
