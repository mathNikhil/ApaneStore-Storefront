import React, { useState, useEffect } from 'react';

const API_BASE = 'https://api.aapnaestore.com';

const PreviewCustomerAuth = ({ brand, storeId, onAuthenticated, onCancel }) => {
  const primaryColor = brand?.colors?.primary || '#25D366';
  const buttonLabel = brand?.colors?.buttonLabel || '#005523';
  const storeName = brand?.brandName || brand?.name || 'this store';

  const [step, setStep] = useState('social');
  const [socialProfile, setSocialProfile] = useState(null);
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const saveSession = (customer, token) => {
    const key = 'customer_session_' + storeId;
    localStorage.setItem(key, JSON.stringify({ customer, token, loginTime: Date.now() }));
    onAuthenticated(customer, token);
  };

  const handleSocialResult = (result) => {
    if (!result.success) { setError(result.error || 'Login failed'); setLoading(false); return; }
    if (!result.isNewCustomer) {
      saveSession(result.customer, result.token);
    } else {
      setSocialProfile(result);
      setStep('phone');
      setLoading(false);
    }
  };

  // Google via popup proxy
  const handleGoogleLogin = () => {
    setLoading(true);
    const popup = window.open(
      'https://aapnaestore.com/auth/google-popup?storeId=' + storeId,
      'google-auth', 'width=500,height=600,scrollbars=yes'
    );
    const handler = (event) => {
      if (event.data && event.data.type === 'GOOGLE_AUTH_RESULT') {
        window.removeEventListener('message', handler);
        handleSocialResult(event.data);
      }
    };
    window.addEventListener('message', handler);
    const checkClosed = setInterval(() => {
      if (popup && popup.closed) {
        clearInterval(checkClosed);
        window.removeEventListener('message', handler);
        setLoading(false);
      }
    }, 500);
  };

  // Facebook Login
  const handleFacebookLogin = () => {
    if (!window.FB) { setError('Facebook not loaded'); return; }
    setLoading(true);
    window.FB.login(async (response) => {
      if (response.authResponse) {
        try {
          const res = await fetch(API_BASE + '/api/store/' + storeId + '/auth/social/facebook', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ accessToken: response.authResponse.accessToken, userID: response.authResponse.userID })
          });
          handleSocialResult(await res.json());
        } catch(e) { setError('Facebook login failed'); setLoading(false); }
      } else { setError('Facebook login cancelled'); setLoading(false); }
    }, { scope: 'email,public_profile' });
  };

  const handlePhoneSubmit = async (e) => {
    e.preventDefault();
    if (phone.length !== 10) { setError('Enter valid 10-digit mobile number'); return; }
    setLoading(true);
    try {
      const res = await fetch(API_BASE + '/api/store/' + storeId + '/auth/social/complete', {
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
      else { setError(data.error || 'Failed'); setLoading(false); }
    } catch(e) { setError('Failed'); setLoading(false); }
  };

  const overlay = { position: 'fixed', inset: 0, zIndex: 9999, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 };
  const card = { background: '#fff', borderRadius: 20, padding: 28, width: '100%', maxWidth: 380, position: 'relative' };

  return (
    <div style={overlay}>
      <div style={card}>
        <button onClick={onCancel} style={{ position: 'absolute', top: 14, right: 14, background: 'none', border: 'none', fontSize: 22, cursor: 'pointer', color: '#8e9eab' }}>✕</button>

        {brand?.logoUrl && <div style={{ textAlign: 'center', marginBottom: 12 }}>
          <img src={brand.logoUrl} alt={storeName} style={{ height: 52, objectFit: 'contain' }} />
        </div>}

        {step === 'social' && (
          <>
            <h2 style={{ textAlign: 'center', fontSize: 18, fontWeight: 700, color: '#191c1e', marginBottom: 4 }}>Welcome to {storeName}</h2>
            <p style={{ textAlign: 'center', fontSize: 13, color: '#556067', marginBottom: 24 }}>Sign in to continue shopping</p>

            {error && <p style={{ color: '#ba1a1a', fontSize: 13, textAlign: 'center', marginBottom: 12 }}>{error}</p>}

            <button onClick={handleGoogleLogin} disabled={loading}
              style={{ width: '100%', padding: '11px 16px', background: '#fff', color: '#3c4043', border: '1px solid #dadce0', borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 12 }}>
              <svg width="20" height="20" viewBox="0 0 48 48">
                <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
                <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
                <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
                <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
              </svg>
              {loading ? 'Please wait...' : 'Continue with Google'}
            </button>

            <button onClick={handleFacebookLogin} disabled={loading}
              style={{ width: '100%', padding: '11px 16px', background: '#1877F2', color: '#fff', border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 16 }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="white"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
              Continue with Facebook
            </button>

            <p style={{ textAlign: 'center', fontSize: 11, color: '#8e9eab' }}>
              By continuing, you agree to {storeName}'s Terms &amp; Privacy Policy
            </p>
          </>
        )}

        {step === 'phone' && (
          <>
            <h2 style={{ textAlign: 'center', fontSize: 17, fontWeight: 700, color: '#191c1e', marginBottom: 4 }}>Enter Your Mobile Number</h2>
            <p style={{ textAlign: 'center', fontSize: 13, color: '#556067', marginBottom: 20 }}>
              Hi {socialProfile?.name?.split(' ')[0]}! We need your number for order updates.
            </p>
            {error && <p style={{ color: '#ba1a1a', fontSize: 13, textAlign: 'center', marginBottom: 12 }}>{error}</p>}
            <form onSubmit={handlePhoneSubmit}>
              <div style={{ display: 'flex', border: '1.5px solid #bbcbb9', borderRadius: 10, overflow: 'hidden', marginBottom: 16 }}>
                <span style={{ padding: '12px', background: '#f2f4f7', fontSize: 14, color: '#556067', borderRight: '1px solid #bbcbb9' }}>+91</span>
                <input type="tel" value={phone} onChange={e => setPhone(e.target.value.replace(/\D/g, ''))}
                  maxLength={10} placeholder="9876543210" autoFocus required
                  style={{ flex: 1, padding: '12px', fontSize: 14, border: 'none', outline: 'none' }} />
              </div>
              <button type="submit" disabled={loading}
                style={{ width: '100%', padding: 13, background: primaryColor, color: buttonLabel, border: 'none', borderRadius: 10, fontSize: 15, fontWeight: 700, cursor: 'pointer' }}>
                {loading ? 'Please wait...' : 'Continue'}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
};

export default PreviewCustomerAuth;
