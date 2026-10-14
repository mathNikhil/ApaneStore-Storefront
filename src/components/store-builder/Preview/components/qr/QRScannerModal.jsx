import React, { useEffect, useRef, useState } from 'react';
import ScannedProductModal from './ScannedProductModal';

const API = import.meta.env.VITE_API_URL || 'https://api.aapnaestore.com';

const QRScannerModal = ({ storeId, primaryColor, onAddToCart, onClose, customerToken }) => {
  const scannerRef = useRef(null);
  const scannerInstanceRef = useRef(null);
  const [scanning, setScanning] = useState(true);
  const [error, setError] = useState('');
  const [scannedProduct, setScannedProduct] = useState(null);

  useEffect(() => {
    let scanner;

    const startScanner = async () => {
      try {
        // Lazy-load html5-qrcode to avoid it being in the initial bundle
        const { Html5QrcodeScanner } = await import('html5-qrcode');

        scanner = new Html5QrcodeScanner(
          'qr-reader-container',
          { fps: 10, qrbox: { width: 250, height: 250 }, aspectRatio: 1.0 },
          false // verbose
        );

        scannerInstanceRef.current = scanner;

        scanner.render(
          async (decodedText) => {
            // Stop scanning immediately after first valid scan
            try { await scanner.clear(); } catch {}
            setScanning(false);
            await handleScannedToken(decodedText);
          },
          () => {
            // Decode errors are normal while scanner is trying — ignore
          }
        );
      } catch (err) {
        setError('Camera not available. Please allow camera access and try again.');
      }
    };

    startScanner();

    return () => {
      if (scannerInstanceRef.current) {
        scannerInstanceRef.current.clear().catch(() => {});
      }
    };
  }, []);

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
        setScanning(true);
        restartScanner();
        return;
      }

      setScannedProduct(data.product);
    } catch (err) {
      setError('Network error. Please check connection and try again.');
      setScanning(true);
      restartScanner();
    }
  };

  const restartScanner = async () => {
    if (scannerInstanceRef.current) {
      try { await scannerInstanceRef.current.clear(); } catch {}
    }
    setTimeout(() => {
      const { Html5QrcodeScanner } = window.Html5QrcodeScanner
        ? { Html5QrcodeScanner: window.Html5QrcodeScanner }
        : {};
      // Re-render the scanner
      setScanning(true);
      setError('');
    }, 1000);
  };

  const handleAddToCart = (product, quantity) => {
    onAddToCart(product, quantity, true); // true = isScanOrder
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

        {/* Scanner */}
        {!scannedProduct && (
          <>
            <div
              id="qr-reader-container"
              style={{ width: '100%', borderRadius: 12, overflow: 'hidden', background: '#000' }}
            />
            {error && (
              <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, padding: 12, color: '#dc2626', fontSize: 13, marginTop: 12 }}>
                {error}
              </div>
            )}
            <div style={{ textAlign: 'center', marginTop: 14, fontSize: 13, color: '#888' }}>
              Hold the QR code steady in the frame
            </div>
          </>
        )}

        {/* Product confirm screen */}
        {scannedProduct && (
          <ScannedProductModal
            product={scannedProduct}
            primaryColor={primaryColor}
            onAddToCart={handleAddToCart}
            onScanAgain={() => { setScannedProduct(null); setScanning(true); }}
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
