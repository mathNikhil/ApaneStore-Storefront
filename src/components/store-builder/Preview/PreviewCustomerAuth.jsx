import React, { useState, useEffect, useRef } from 'react';
import { customerAuthAPI } from '../../../services/api';

// Real customer login + OTP verification, backed by the actual backend
// (same OTP mechanism the main tenant dashboard uses, scoped to this
// specific store — a phone number is a separate customer at every store).
const getDeviceFingerprint = () => {
  const raw = [
    navigator.userAgent,
    screen.width + 'x' + screen.height,
    Intl.DateTimeFormat().resolvedOptions().timeZone,
    navigator.language,
  ].join('|');
  let hash = 0;
  for (let i = 0; i < raw.length; i++) {
    hash = ((hash << 5) - hash) + raw.charCodeAt(i);
    hash |= 0;
  }
  return String(Math.abs(hash));
};

const PreviewCustomerAuth = ({ brand, storeId, onAuthenticated, onCancel }) => {
  const headingFont = brand?.fonts?.heading || 'Inter';
  const storeName = brand?.brandName || brand?.storeName || brand?.name || 'This Store';
  const bodyFont = brand?.fonts?.body || 'Inter';
  const primaryColor = brand?.colors?.primary || '#25D366';
  const fontHeader = brand?.colors?.fontHeader || '#191C1E';
  const fontBody = brand?.colors?.fontBody || '#556067';
  const [step, setStep] = useState('mobile'); // 'mobile' | 'otp'
  const [mobile, setMobile] = useState('');
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [timeLeft, setTimeLeft] = useState(30);
  const [canResend, setCanResend] = useState(false);
  const [devOtpHint, setDevOtpHint] = useState('');
  const [consentGiven, setConsentGiven] = useState(false);
  const [showTermsModal, setShowTermsModal] = useState(false);
  const [isNewCustomer, setIsNewCustomer] = useState(false);
  const inputRefs = useRef([]);

  const primary = brand?.colors?.primary || '#25D366';
  const buttonLabel = brand?.colors?.buttonLabel || '#005523';
  const background = brand?.colors?.background || '#FFFFFF';

  useEffect(() => {
    if (step !== 'otp') return;
    if (timeLeft <= 0) {
      setCanResend(true);
      return;
    }
    const timer = setTimeout(() => setTimeLeft(t => t - 1), 1000);
    return () => clearTimeout(timer);
  }, [step, timeLeft]);

  const sendOtp = async () => {
    setError('');
    setLoading(true);
    try {
      const result = await customerAuthAPI.sendOTP(storeId, mobile);
      if (result.success) {
        setStep('otp');
        setTimeLeft(30);
        setCanResend(false);
        setOtp(['', '', '', '', '', '']);
        // Dev mode: backend echoes the OTP when no real SMS gateway is
        // configured yet, same as the tenant dashboard's login screen.
        setDevOtpHint(result.test_otp || '');
        setIsNewCustomer(!!result.isNewCustomer);
        if (result.hasConsented) setConsentGiven(true);
      } else {
        setError(result.error || result.message || 'Failed to send OTP');
      }
    } catch (err) {
      setError(err.message || 'Failed to send OTP');
    } finally {
      setLoading(false);
    }
  };

  const handleSendOtp = (e) => {
    e.preventDefault();
    if (mobile.length !== 10) {
      setError('Please enter a valid 10-digit mobile number');
      return;
    }
    if (!consentGiven) {
      setError('Please agree to the Terms & Privacy Policy to continue');
      return;
    }

    // 12-hour same-device skip — no OTP needed
    const key = `customer_12hr_${storeId}`;
    const saved = JSON.parse(localStorage.getItem(key) || '{}');
    const currentFingerprint = getDeviceFingerprint();
    const twelveHours = 12 * 60 * 60 * 1000;

    if (
      saved.mobile === mobile &&
      saved.fingerprint === currentFingerprint &&
      saved.loginTime &&
      Date.now() - saved.loginTime < twelveHours &&
      saved.token
    ) {
      // Same mobile, same device, within 12 hours — skip OTP
      onAuthenticated(saved.customer, saved.token);
      return;
    }

    sendOtp();
  };

  const handleOtpChange = (index, value) => {
    if (value.length > 1) return;
    const next = [...otp];
    next[index] = value.replace(/\D/g, '');
    setOtp(next);
    setError('');
    if (value && index < 5) inputRefs.current[index + 1]?.focus();
  };

  const handleOtpKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handleVerify = async () => {
    if (otp.join('').length !== 6) {
      setError('Please enter all 6 digits');
      return;
    }
    setError('');
    setLoading(true);
    try {
      const result = await customerAuthAPI.verifyOTP(storeId, mobile, otp.join(''), consentGiven);
      if (result.success) {
        // Save 12-hr session for this store + device
        const key = `customer_12hr_${storeId}`;
        localStorage.setItem(key, JSON.stringify({
          mobile,
          fingerprint: getDeviceFingerprint(),
          loginTime: Date.now(),
          token: result.data.token,
          customer: result.data.customer,
        }));
        onAuthenticated(result.data.customer, result.data.token);
      } else {
        setError(result.error || result.message || 'Invalid OTP');
      }
    } catch (err) {
      setError(err.message || 'Invalid OTP');
    } finally {
      setLoading(false);
    }
  };

  if (step === 'mobile') {
    return (
      <div className="w-full h-full flex items-center justify-center p-4" style={{ backgroundColor: background }}>
        <div className="w-full max-w-sm rounded-xl shadow-md border border-[#bbcbb9] p-6 relative" style={{ backgroundColor: background }}>
          {onCancel && (
            <button
              onClick={onCancel}
              className="absolute top-3 right-3 text-[#556067] hover:text-[#191c1e]"
              aria-label="Continue browsing"
            >
              <span className="material-symbols-outlined">close</span>
            </button>
          )}
          <div
            className="w-full aspect-video rounded-lg overflow-hidden mb-6 flex flex-col items-center justify-center"
            style={{ backgroundColor: `${primary}15` }}
          >
            {brand?.logo ? (
              <img
                src={brand.logo}
                alt={brand?.name || 'Store logo'}
                className="w-16 h-16 rounded-full object-cover mb-2"
              />
            ) : (
              <span className="text-4xl mb-1">🛒</span>
            )}
            <p className="text-sm text-gray-700 font-medium mt-1">Welcome to {brand?.name || 'the Store'}</p>
            {brand?.tagline && (
              <p className="text-xs text-gray-500 mt-1 px-6 text-center">{brand.tagline}</p>
            )}
          </div>

          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold mb-2" style={{ fontFamily: headingFont, color: fontHeader }}>Customer Login</h1>
            <p className="text-gray-500 text-sm">Enter your mobile number to receive OTP</p>
          </div>

          <form onSubmit={handleSendOtp} className="space-y-4">
            <div>
              <label className="block text-xs font-medium mb-1 text-[#3c4a3d] uppercase tracking-wider">Mobile Number</label>
              <div className="flex items-center border border-[#bbcbb9] rounded-lg overflow-hidden">
                <span className="px-3 py-3 bg-[#f2f4f7] text-sm text-[#556067]">+91</span>
                <input
                  type="tel" inputMode="numeric" pattern="[0-9]*"
                  maxLength={10}
                  placeholder="9876543210"
                  value={mobile}
                  onChange={(e) => setMobile(e.target.value.replace(/\D/g, ''))}
                  className="flex-1 px-3 py-3 text-sm outline-none"
                />
              </div>
              {error && <p className="text-[#ba1a1a] text-xs mt-1">{error}</p>}
            </div>

          )}
        </div>

        <div className="flex flex-col gap-6 mt-8">
          <div className="flex justify-between gap-2">
            {otp.map((digit, index) => (
              <input
                key={index}
                ref={(el) => (inputRefs.current[index] = el)}
                type="text" inputMode="numeric" pattern="[0-9]*"
                maxLength={1}
                value={digit}
                onChange={(e) => handleOtpChange(index, e.target.value)}
                onKeyDown={(e) => handleOtpKeyDown(index, e)}
                className="w-10 h-12 text-center text-xl font-semibold border border-[#bbcbb9] rounded-lg focus:outline-none focus:ring-2 transition-all"
                autoFocus={index === 0}
              />
            ))}
          </div>

          <div className="flex justify-center items-center gap-2">
            <span className="text-sm text-[#3c4a3d]">
              Resend in <span className="font-bold">{timeLeft}s</span>
            </span>
            <button
              onClick={sendOtp}
              disabled={!canResend || loading}
              className={`text-sm font-semibold ${canResend ? 'hover:underline cursor-pointer' : 'text-gray-400 cursor-not-allowed opacity-50'}`}
              style={canResend ? { color: primary } : {}}
            >
              Resend OTP
            </button>
          </div>

          {error && <p className="text-[#ba1a1a] text-sm text-center">{error}</p>}

          {showTermsModal && (
            <div style={{ position:'fixed', inset:0, zIndex:9999, background:'rgba(0,0,0,0.5)', display:'flex', alignItems:'center', justifyContent:'center', padding:'16px' }}>
              <div style={{ background:'#fff', borderRadius:'16px', maxWidth:'400px', width:'100%', maxHeight:'80vh', overflowY:'auto', padding:'24px' }}>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'16px' }}>
                  <strong style={{ fontSize:'15px' }}>{storeName} — Terms & Privacy</strong>
                  <button onClick={() => setShowTermsModal(false)} style={{ background:'none', border:'none', cursor:'pointer', fontSize:'20px' }}>✕</button>
                </div>
                <div style={{ fontSize:'13px', color:'#556067', lineHeight:'1.6' }}>
                  <p><strong>Terms of Use</strong></p>
                  <p style={{ marginBottom:'12px' }}>By using {storeName}, you agree to provide accurate information, use the platform lawfully, and not misuse any features.</p>
                  <p><strong>Privacy Policy</strong></p>
                  <p style={{ marginBottom:'12px' }}>We collect your mobile number and name to process your orders. Your data is stored securely and never sold to third parties.</p>
                  <p><strong>Your Rights (DPDP Act, 2023)</strong></p>
                  <p style={{ marginBottom:'12px' }}>You have the right to access, correct, and delete your personal data at any time from your Profile page.</p>
                  <p style={{ color:'#94a3b8', fontSize:'12px' }}>For queries: contact {storeName} support directly.</p>
                </div>
                <button onClick={() => { setConsentGiven(true); localStorage.setItem('consent_'+storeId, '1'); setShowTermsModal(false); }}
                  style={{ width:'100%', marginTop:'16px', padding:'12px', borderRadius:'12px', fontWeight:'bold', fontSize:'14px', border:'none', cursor:'pointer', backgroundColor: primaryColor, color: buttonLabel }}>
                  I Agree & Close
                </button>
              </div>
            </div>
          )}

          {isNewCustomer && !consentGiven && (
            <div className="flex items-start gap-2 mb-2">
              <input type="checkbox" id="consent" checked={consentGiven}
                onChange={e => { setConsentGiven(e.target.checked); if (e.target.checked) localStorage.setItem('consent_'+storeId, '1'); }}
                className="mt-1 cursor-pointer" />
              <label htmlFor="consent" className="text-xs text-gray-500 cursor-pointer">
                I agree to the{' '}
                <span onClick={() => setShowTermsModal(true)} style={{ color: primaryColor, textDecoration:'underline', cursor:'pointer' }}>
                  Terms & Privacy Policy
                </span>
              </label>
            </div>
          )}

          <button
            onClick={handleVerify}
            disabled={loading || (isNewCustomer && !consentGiven)}
            className="w-full inline-flex items-center justify-center gap-2 px-6 py-3 font-bold text-base rounded-xl hover:brightness-105 active:scale-[0.98] transition-all disabled:opacity-50"
            style={{ backgroundColor: primary, color: buttonLabel }}
          >
            {loading ? (
              <span className="material-symbols-outlined animate-spin">progress_activity</span>
            ) : (
              <>Verify &amp; Login <span className="material-symbols-outlined text-xl">arrow_forward</span></>
            )}
          </button>

          <button
            onClick={() => setStep('mobile')}
            className="text-sm text-[#3c4a3d] hover:text-[#006d2f] transition-colors flex items-center justify-center gap-1"
          >
            <span className="material-symbols-outlined text-base">edit</span>
            Change Mobile Number
          </button>
        </div>
      </div>
    </div>
  );
};

export default PreviewCustomerAuth;
