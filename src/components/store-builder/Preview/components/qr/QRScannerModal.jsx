import React, { useEffect, useRef, useState } from 'react';
import ScannedProductModal from './ScannedProductModal';

const API = import.meta.env.VITE_API_URL || 'https://api.aapnaestore.com';

const QRScannerModal = ({ storeId, primaryColor, onAddToCart, onClose, customerToken, addToCartLabel = 'Add to Cart' }) => {
  const videoRef = useRef(null);
  const controlsRef = useRef(null);
  const [error, setError] = useState('');
  const [scannedProduct, setScannedProduct] = useState(null);
  const [scanning, setScanning] = useState(true);

  useEffect(() => {
    if (scannedProduct) return; // don't start scanner if product already scanned

    let stopped = false;

    const startScanner = async () => {
      try {
        const { BrowserQRCodeReader, BrowserCodeReader } = await import('@zxing/browser');
        const codeReader = new BrowserQRCodeReader();

        // Get available video devices
        const devices = await BrowserCodeReader.listVideoInputDevices();
        if (!devices || devices.length === 0) {
          setError('No camera found. Please allow camera access.');
          return;
        }

        // Prefer back camera on mobile
        const backCamera = devices.find(d =>
          /back|rear|environment/i.test(d.label)
        ) || devices[devices.length - 1];

        const controls = await codeReader.decodeFromVideoDevice(
          backCamera.deviceId,
          videoRef.current,
          async (result, err) => {
            if (stopped) return;
            if (result) {
              stopped = true;
              controls.stop();
              setScanning(false);
              await handleScannedToken(result.getText());
            }
            // err here is just "no QR found in this frame" — normal, ignore
          }
        );

        controlsRef.current = controls;
      } catch (err) {
        if (!stopped) {
          setError('Camera not available. Please allow camera access and try again.');
        }
      }
    };

    startScanner();

    return () => {
      stopped = true;
      if (controlsRef.current) {
        try { controlsRef.current.stop(); } catch {}
      }
    };
  }, [scannedProduct]);

  const handleScannedToken = async (token) => {
    setError('');
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
        setScanning(true); // re-trigger scanner via useEffect
        return;
      }

      setScannedProduct(data.product);
    } catch {
      setError('Network error. Please check your connection.');
      setScanning(true);
    }
  };

  const handleAddToCart = (product, quantity) => {
    onAddToCart(product, quantity, true);
    setScannedProduct(null);
    onClose();
  };

  return (
    <div style={overlay}>
      <div style={modal}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <div>
            <div style={{ fontWeight: 700, fontSize: 17, color: '#111' }}>📱 Scan Product</div>
            <div style={{ fontSize: 13, color: '#888', marginTop: 2 }}>Point camera at the product QR code</div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 24, cursor: 'pointer', color: '#666', lineHeight: 1 }}>×</button>
        </div>

        {/* Camera view — always mounted so video element exists for zxing */}
        <div style={{ display: scannedProduct ? 'none' : 'block' }}>
          <div style={{ position: 'relative', borderRadius: 12, overflow: 'hidden', background: '#000', aspectRatio: '1/1' }}>
            <video
              ref={videoRef}
              style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
              muted
              playsInline
            />
            {/* Scan target overlay */}
            {scanning && !error && (
              <div style={{
                position: 'absolute', inset: 0,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                pointerEvents: 'none'
              }}>
                <div style={{
                  width: 200, height: 200,
                  border: `3px solid ${primaryColor || '#1a56db'}`,
                  borderRadius: 16,
                  boxShadow: '0 0 0 9999px rgba(0,0,0,0.35)'
                }} />
              </div>
            )}
          </div>

          {error && (
            <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, padding: 12, color: '#dc2626', fontSize: 13, marginTop: 12 }}>
              {error}
            </div>
          )}

          {!error && (
            <div style={{ textAlign: 'center', marginTop: 12, fontSize: 13, color: '#888' }}>
              Hold the QR code steady inside the frame
            </div>
          )}
        </div>

        {/* Product confirm screen */}
        {scannedProduct && (
          <ScannedProductModal
            product={scannedProduct}
            primaryColor={primaryColor}
            onAddToCart={handleAddToCart}
            onScanAgain={() => { setScannedProduct(null); setError(''); setScanning(true); }}
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
