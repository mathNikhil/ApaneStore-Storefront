import React, { useRef, useEffect, useState, useCallback } from 'react';
import ScannedProductModal from './ScannedProductModal';

const API = import.meta.env.VITE_API_URL || 'https://api.aapnaestore.com';

const QRScannerModal = ({ storeId, primaryColor, onAddToCart, onClose, customerToken, addToCartLabel = 'Add to Cart' }) => {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const rafRef = useRef(null);
  const detectorRef = useRef(null);
  const activeRef = useRef(true);

  const [error, setError] = useState('');
  const [cameraReady, setCameraReady] = useState(false);
  const [scannedProduct, setScannedProduct] = useState(null);
  const [validating, setValidating] = useState(false);

  const stopCamera = useCallback(() => {
    activeRef.current = false;
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
  }, []);

  const handleScannedToken = useCallback(async (token) => {
    if (!activeRef.current) return;
    stopCamera();
    setValidating(true);
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
          store_mismatch: 'This QR belongs to a different store.',
          qr_service_expired: 'QR service has expired.',
          product_not_found: 'Product not found.',
          invalid_token: 'Invalid QR code.',
          invalid_signature: 'QR code has been tampered with.',
        };
        setError(messages[data.reason] || 'Invalid QR code.');
      } else {
        setScannedProduct(data.product);
      }
    } catch {
      setError('Network error. Check your connection.');
    }
    setValidating(false);
  }, [storeId, customerToken, stopCamera]);

  // Scan loop using native BarcodeDetector or jsQR fallback
  const startScanLoop = useCallback(async (video) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });

    // Try native BarcodeDetector first (Android Chrome, fast)
    let useNative = false;
    if ('BarcodeDetector' in window) {
      try {
        detectorRef.current = new window.BarcodeDetector({ formats: ['qr_code'] });
        useNative = true;
      } catch {
        useNative = false;
      }
    }

    // Load jsQR as fallback
    let jsQR = null;
    if (!useNative) {
      try {
        const mod = await import('jsqr');
        jsQR = mod.default;
      } catch {
        setError('Scanner failed to load. Please refresh.');
        return;
      }
    }

    let lastScan = 0;
    const INTERVAL = 150; // ms between decode attempts

    const tick = async () => {
      if (!activeRef.current) return;
      const now = performance.now();
      if (now - lastScan < INTERVAL) {
        rafRef.current = requestAnimationFrame(tick);
        return;
      }
      lastScan = now;

      if (video.readyState !== video.HAVE_ENOUGH_DATA) {
        rafRef.current = requestAnimationFrame(tick);
        return;
      }

      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      ctx.drawImage(video, 0, 0);

      try {
        if (useNative) {
          const codes = await detectorRef.current.detect(canvas);
          if (codes.length > 0 && codes[0].rawValue) {
            handleScannedToken(codes[0].rawValue);
            return;
          }
        } else {
          const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          const code = jsQR(imageData.data, imageData.width, imageData.height, { inversionAttempts: 'dontInvert' });
          if (code?.data) {
            handleScannedToken(code.data);
            return;
          }
        }
      } catch {
        // decode errors are normal when no QR in frame, keep scanning
      }

      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);
  }, [handleScannedToken]);

  useEffect(() => {
    activeRef.current = true;
    let mounted = true;

    const startCamera = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } }
        });
        if (!mounted) { stream.getTracks().forEach(t => t.stop()); return; }
        streamRef.current = stream;
        const video = videoRef.current;
        if (!video) return;
        video.srcObject = stream;
        video.setAttribute('playsinline', true);
        await video.play();
        if (!mounted) return;
        setCameraReady(true);
        startScanLoop(video);
      } catch (err) {
        if (!mounted) return;
        if (err.name === 'NotAllowedError') {
          setError('Camera permission denied. Please allow camera access and try again.');
        } else {
          setError('Could not start camera. Try closing other apps using the camera.');
        }
      }
    };

    startCamera();
    return () => {
      mounted = false;
      stopCamera();
    };
  }, [startScanLoop, stopCamera]);

  const handleScanAgain = () => {
    setScannedProduct(null);
    setError('');
    setCameraReady(false);
    activeRef.current = true;
    const startCamera = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } }
        });
        streamRef.current = stream;
        const video = videoRef.current;
        if (!video) return;
        video.srcObject = stream;
        video.setAttribute('playsinline', true);
        await video.play();
        setCameraReady(true);
        startScanLoop(video);
      } catch {
        setError('Could not restart camera.');
      }
    };
    startCamera();
  };

  const handleAddToCart = (product, quantity) => {
    onAddToCart(product, quantity);
    handleScanAgain();
  };

  return (
    <div style={overlay}>
      <div style={modal}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
          <div>
            <div style={{ fontWeight: 700, fontSize: 17, color: '#111' }}>📷 Scan Product</div>
            <div style={{ fontSize: 12, color: '#888', marginTop: 2 }}>Point camera at the QR code</div>
          </div>
          <button onClick={() => { stopCamera(); onClose(); }} style={{ background: 'none', border: 'none', fontSize: 24, cursor: 'pointer', color: '#666', lineHeight: 1 }}>×</button>
        </div>

        {!scannedProduct && (
          <>
            {/* Viewfinder */}
            <div style={{ position: 'relative', borderRadius: 12, overflow: 'hidden', background: '#000', aspectRatio: '4/3' }}>
              <video
                ref={videoRef}
                muted
                playsInline
                style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
              />
              {/* Hidden canvas for decoding */}
              <canvas ref={canvasRef} style={{ display: 'none' }} />

              {/* Scan frame overlay */}
              {cameraReady && !validating && (
                <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <div style={{ width: 200, height: 200, position: 'relative' }}>
                    {/* Corner brackets */}
                    {[['0,0','top','left'],['0,auto','top','right'],['auto,0','bottom','left'],['auto,auto','bottom','right']].map(([pos, v, h], i) => (
                      <div key={i} style={{
                        position: 'absolute',
                        [v]: 0, [h]: 0,
                        width: 30, height: 30,
                        borderTop: v === 'top' ? `3px solid ${primaryColor || '#1a56db'}` : 'none',
                        borderBottom: v === 'bottom' ? `3px solid ${primaryColor || '#1a56db'}` : 'none',
                        borderLeft: h === 'left' ? `3px solid ${primaryColor || '#1a56db'}` : 'none',
                        borderRight: h === 'right' ? `3px solid ${primaryColor || '#1a56db'}` : 'none',
                      }} />
                    ))}
                  </div>
                </div>
              )}

              {/* Loading overlay */}
              {!cameraReady && !error && (
                <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#fff', gap: 10 }}>
                  <div style={{ fontSize: 28 }}>⏳</div>
                  <div style={{ fontSize: 13 }}>Starting camera...</div>
                </div>
              )}

              {/* Validating overlay */}
              {validating && (
                <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#fff', gap: 10 }}>
                  <div style={{ fontSize: 28 }}>✅</div>
                  <div style={{ fontSize: 14, fontWeight: 600 }}>QR found! Loading...</div>
                </div>
              )}
            </div>

            {error && (
              <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, padding: 12, color: '#dc2626', fontSize: 13, marginTop: 12 }}>
                {error}
                <div style={{ marginTop: 8 }}>
                  <button
                    onClick={() => { setError(''); handleScanAgain(); }}
                    style={{ background: '#dc2626', color: '#fff', border: 'none', borderRadius: 6, padding: '6px 14px', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}
                  >
                    Try Again
                  </button>
                </div>
              </div>
            )}

            {cameraReady && !error && !validating && (
              <div style={{ fontSize: 12, color: '#aaa', textAlign: 'center', marginTop: 10 }}>
                💡 Hold steady — scanning automatically
              </div>
            )}
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
