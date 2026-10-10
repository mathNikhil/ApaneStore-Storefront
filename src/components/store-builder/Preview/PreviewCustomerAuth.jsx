import React, { useState, useEffect } from 'react';

const API_BASE = 'https://api.aapnaestore.com';
const GOOGLE_CLIENT_ID = '168190401805-8k10ipii41bokt3fg90nfudv67r72i02.apps.googleusercontent.com';
const FB_APP_ID = '1428867775876072';

const PreviewCustomerAuth = ({ brand, storeId, onAuthenticated, onCancel }) => {
  const primaryColor = brand?.colors?.primary || '#25D366';
  const buttonLabel = brand?.colors?.buttonLabel || '#005523';
  const storeName = brand?.brandName || brand?.name || 'this store';

  const [step, setStep] = useState('social'); // 'social' | 'phone'
  const [socialProfile, setSocialProfile] = useState(null);
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const saveSession = (customer, token) => {
    const key = `customer_session_${storeId}`;
    localStorage.setItem(key, JSON.stringify({ customer, token, loginTime: Date.now() }));
    onAuthenticated(customer, token);
  };

  const handleSocialResult = async (result) => {
    if (!result.success) { setError(result.error || 'Login failed'); setLoading(false); return; }
    if (!result.isNewCustomer) {
      saveSession(result.customer, result.token);
    } else {
      setSocialProfile(result);
      setStep('phone');
    }
    setLoading(false);
  };

  // Google Login
  useEffect(() => {
    const initGoogle = () => {
      if (window.google && document.getElementById('google-customer-btn')) {
        window.google.accounts.id.initialize({
          client_id: GOOGLE_CLIENT_ID,
          callback: async (response) => {
            setLoading(true);
            try {
              const res = await fetch(`${API_BASE}/api/store/${storeId}/auth/social/google`, {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ credential: response.credential })
              });
              handleSocialResult(await res.json());
            } catch(e) { setError('Google login failed'); setLoading(false); }
          }
        });
        window.google.accounts.id.renderButton(
          document.getElementById('google-customer-btn'),
          { theme: 'outline', size: 'large', width: 320, text: 'continue_with' }
        );
      }
    };
    if (window.google) initGoogle();
    else {
      const interval = setInterval(() => { if (window.google) { initGoogle(); clearInterval(interval); } }, 300);
      return () => clearInterval(interval);
    }
  }, [storeId]);

  // Facebook Login
  const handleFacebookLogin = async () => {
    if (!window.FB) { setError('Facebook not loaded'); return; }
    setLoading(true);
    window.FB.login(async (response) => {
      if (response.authResponse) {
        try {
          const res = await fetch(`${API_BASE}/api/store/${storeId}/auth/social/facebook`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ accessToken: response.authResponse.accessToken, userID: response.authResponse.userID })
          });
          handleSocialResult(await res.json());
        } catch(e) { setError('Facebook login failed'); setLoading(false); }
      } else { setError('Facebook login cancelled'); setLoading(false); }
    }, { scope: 'email,public_profile' });
  };

  // Complete registration with phone
  const handlePhoneSubmit = async (e) => {
    e.preventDefault();
    if (phone.length !== 10) { setError('Enter valid 10-digit mobile number'); return; }
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/store/${storeId}/auth/social/complete`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          googleId: socialProfile.googleId || null,
          facebookId: socialProfile.facebookId || null,
          email: socialProfile.email,
          name: socialProfile.name,
          phone
        })
      });
      const data = await res.json();
      if (data.success) { saveSession(data.customer, data.token); }
      else { setError(data.error || 'Failed'); }
    } catch(e) { setError('Failed to complete registration'); }
    setLoading(false);
  };

  const containerStyle = {
    position: 'fixed', inset: 0, zIndex: 9999,
    background: 'rgba(0,0,0,0.5)',
    display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16
  };
  const cardStyle = {
    background: '#fff', borderRadius: 20, padding: 28,
    width: '100%', maxWidth: 380, position: 'relative'
  };

  return (
    <div style={containerStyle}>
      <div style={cardStyle}>
        {/* Close */}
        <button onClick={onCancel} style={{ position: 'absolute', top: 14, right: 14, background: 'none', border: 'none', fontSize: 22, cursor: 'pointer', color: '#8e9eab' }}>✕</button>

        {/* Brand header */}
        {brand?.logoUrl && <div style={{ textAlign: 'center', marginBottom: 12 }}>
          <img src={brand.logoUrl} alt={storeName} style={{ height: 52, objectFit: 'contain' }} />
        </div>}

        {step === 'social' && <>
          <h2 style={{ textAlign: 'center', fontSize: 18, fontWeight: 700, color: '#191c1e', marginBottom: 4 }}>Welcome to {storeName}</h2>
          <p style={{ textAlign: 'center', fontSize: 13, color: '#556067', marginBottom: 24 }}>Sign in to continue shopping</p>

          {error && <p style={{ color: '#ba1a1a', fontSize: 13, textAlign: 'center', marginBottom: 12 }}>{error}</p>}

          {/* Google Button */}
          <div id="google-customer-btn" style={{ display: 'flex', justifyContent: 'center', marginBottom: 12 }}></div>

          {/* Facebook Button */}
          <button onClick={handleFacebookLogin} disabled={loading}
            style={{ width: '100%', padding: '11px 16px', background: '#1877F2', color: '#fff', border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 16 }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="white"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
            Continue with Facebook
          </button>

          <p style={{ textAlign: 'center', fontSize: 11, color: '#8e9eab' }}>
            By continuing, you agree to {storeName}'s{' '}
            <a href="/profile/terms" target="_blank" style={{ color: primaryColor }}>Terms</a> &amp;{' '}
            <a href="/profile/privacy" target="_blank" style={{ color: primaryColor }}>Privacy Policy</a>
          </p>
        </>}

        {step === 'phone' && <>
          <h2 style={{ textAlign: 'center', fontSize: 17, fontWeight: 700, color: '#191c1e', marginBottom: 4 }}>Enter Your Mobile Number</h2>
          <p style={{ textAlign: 'center', fontSize: 13, color: '#556067', marginBottom: 20 }}>
            Hi {socialProfile?.name?.split(' ')[0]}! We need your number for order updates.
          </p>

          {error && <p style={{ color: '#ba1a1a', fontSize: 13, textAlign: 'center', marginBottom: 12 }}>{error}</p>}

          <form onSubmit={handlePhoneSubmit}>
            <div style={{ display: 'flex', border: '1.5px solid #bbcbb9', borderRadius: 10, overflow: 'hidden', marginBottom: 16 }}>
              <span style={{ padding: '12px 12px', background: '#f2f4f7', fontSize: 14, color: '#556067', borderRight: '1px solid #bbcbb9' }}>+91</span>
              <input type="tel" value={phone} onChange={e => setPhone(e.target.value.replace(/\D/g, ''))}
                maxLength={10} placeholder="9876543210" autoFocus required
                style={{ flex: 1, padding: '12px', fontSize: 14, border: 'none', outline: 'none' }} />
            </div>
            <button type="submit" disabled={loading}
              style={{ width: '100%', padding: 13, background: primaryColor, color: buttonLabel, border: 'none', borderRadius: 10, fontSize: 15, fontWeight: 700, cursor: 'pointer' }}>
              {loading ? 'Please wait...' : 'Continue →'}
            </button>
          </form>
        </>}
      </div>
    </div>
  );
};

export default PreviewCustomerAuth;
