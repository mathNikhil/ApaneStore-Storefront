import React, { useEffect, useRef, useState, useCallback } from 'react';
import ScannedProductModal from './ScannedProductModal';

const API = import.meta.env.VITE_API_URL || 'https://api.aapnaestore.com';

const QRScannerModal = ({ storeId, primaryColor, onAddToCart, onClose, customerToken, addToCartLabel = 'Add to Cart' }) => {
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const scanningRef = useRef(false);
  const mountedRef = useRef(true);
  const [error, setError] = useState('');
  const [scannedProduct, setScannedProduct] = useState(null);
  const [scanning, setScanning] = useState(true);

  const stopCamera = () => {
    scanningRef.current = false;
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
    if (videoRef.current) videoRef.current.srcObject = null;
  };

  const decodeFrame = async (BrowserQRCodeReader, codeReader) => {
    if (!scanningRef.current || !mountedRef.current) return;
    try {
      const result = await codeReader.decodeOnceFromVideoElement(videoRef.current);
      if (result && scanningRef.current && mountedRef.current) {
        scanningRef.current = false;
        setScanning(false);
        await handleScannedToken(result.getText());
      }
    } catch {
      // No QR in this frame — wait 300ms then try again
      if (scanningRef.current && mountedRef.current) {
        setTimeout(() => decodeFrame(BrowserQRCodeReader, codeReader), 300);
      }
    }
  };

  useEffect(() => {
    if (scannedProduct) return;
    mountedRef.current = true;

    const startScanner = async () => {
      try {
        const { BrowserQRCodeReader } = await import('@zxing/browser');
        const codeReader = new BrowserQRCodeReader();

        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: 'environment' }, width: { ideal: 640 }, height: { ideal: 640 } }
        });

        if (!mountedRef.current) { stream.getTracks().forEach(t => t.stop()); return; }

        streamRef.current = stream;
        videoRef.current.srcObject = stream;
        await videoRef.current.play();

        scanningRef.current = true;
        decodeFrame(BrowserQRCodeReader, codeReader);
      } catch {
        if (mountedRef.current) setError('Camera not available. Please allow camera access and try again.');
      }
    };

    startScanner();

    return () => {
      mountedRef.current = false;
      stopCamera();
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
        if (mountedRef.current) {
          setError(messages[data.reason] || 'Invalid QR code.');
          setScanning(true);
          scanningRef.current = true;
          // Restart frame loop after error
          const { BrowserQRCodeReader } = await import('@zxing/browser');
          const codeReader = new BrowserQRCodeReader();
          setTimeout(() => decodeFrame(BrowserQRCodeReader, codeReader), 1000);
        }
        return;
      }

      if (mountedRef.current) setScannedProduct(data.product);
    } catch {
      if (mountedRef.current) {
        setError('Network error. Please check your connection.');
        setScanning(true);
      }
    }
  };

  const handleAddToCart = (product, quantity) => {
    stopCamera();
    onAddToCart(product, quantity);
    onClose();
  };

  const handleScanAgain = () => {
    setScannedProduct(null);
    setError('');
    setScanning(true);
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
          <button onClick={() => { stopCamera(); onClose(); }} style={{ background: 'none', border: 'none', fontSize: 24, cursor: 'pointer', color: '#666', lineHeight: 1 }}>×</button>
        </div>

        {/* Camera view */}
        <div style={{ display: scannedProduct ? 'none' : 'block' }}>
          <div style={{ position: 'relative', borderRadius: 12, overflow: 'hidden', background: '#000', aspectRatio: '1/1' }}>
            <video
              ref={videoRef}
              style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
              muted
              playsInline
            />
            {scanning && !error && (
              <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
                <div style={{ width: 200, height: 200, border: `3px solid ${primaryColor || '#1a56db'}`, borderRadius: 16, boxShadow: '0 0 0 9999px rgba(0,0,0,0.35)' }} />
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
