import React, { useState, useEffect, useRef } from 'react';

// Simulated customer login + OTP verification, shown inside the store preview
// so tenants can see exactly what their customers experience before they can
// browse/shop. This mirrors CustomerLoginPage.jsx / CustomerVerifyOTPPage.jsx
// visually, but stays self-contained (no react-router) since it lives inside
// the preview modal rather than as a standalone route.
const PreviewCustomerAuth = ({ brand, onAuthenticated }) => {
  const [step, setStep] = useState('mobile'); // 'mobile' | 'otp'
  const [mobile, setMobile] = useState('');
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [timeLeft, setTimeLeft] = useState(30);
  const [canResend, setCanResend] = useState(false);
  const inputRefs = useRef([]);

  const primary = brand?.colors?.primary || '#25D366';
  const buttonLabel = brand?.colors?.buttonLabel || '#005523';

  useEffect(() => {
    if (step !== 'otp') return;
    if (timeLeft <= 0) {
      setCanResend(true);
      return;
    }
    const timer = setTimeout(() => setTimeLeft(t => t - 1), 1000);
    return () => clearTimeout(timer);
  }, [step, timeLeft]);

  const handleSendOtp = (e) => {
    e.preventDefault();
    if (mobile.length !== 10) {
      setError('Please enter a valid 10-digit mobile number');
      return;
    }
    setError('');
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      setStep('otp');
      setTimeLeft(30);
      setCanResend(false);
    }, 800);
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

  const handleVerify = () => {
    if (otp.join('').length !== 6) {
      setError('Please enter all 6 digits');
      return;
    }
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      onAuthenticated(mobile);
    }, 800);
  };

  if (step === 'mobile') {
    return (
      <div className="w-full h-full flex items-center justify-center bg-[#f7f9fc] p-4">
        <div className="w-full max-w-sm bg-white rounded-xl shadow-md border border-[#bbcbb9] p-6">
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
            <h1 className="text-2xl font-bold text-gray-800 mb-2">Customer Login</h1>
            <p className="text-gray-500 text-sm">Enter your mobile number to receive OTP</p>
          </div>

          <form onSubmit={handleSendOtp} className="space-y-4">
            <div>
              <label className="block text-xs font-medium mb-1 text-[#3c4a3d] uppercase tracking-wider">Mobile Number</label>
              <div className="flex items-center border border-[#bbcbb9] rounded-lg overflow-hidden">
                <span className="px-3 py-3 bg-[#f2f4f7] text-sm text-[#556067]">+91</span>
                <input
                  type="tel"
                  maxLength={10}
                  placeholder="9876543210"
                  value={mobile}
                  onChange={(e) => setMobile(e.target.value.replace(/\D/g, ''))}
                  className="flex-1 px-3 py-3 text-sm outline-none"
                />
              </div>
              {error && <p className="text-[#ba1a1a] text-xs mt-1">{error}</p>}
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full inline-flex items-center justify-center gap-2 px-6 py-3 font-bold text-base rounded-xl hover:brightness-105 active:scale-[0.98] transition-all disabled:opacity-50"
              style={{ backgroundColor: primary, color: buttonLabel }}
            >
              {loading ? (
                <span className="material-symbols-outlined animate-spin">progress_activity</span>
              ) : (
                <>Get OTP <span className="material-symbols-outlined text-xl">arrow_forward</span></>
              )}
            </button>
          </form>

          <div className="mt-6 pt-6 border-t border-[#bbcbb9] text-center">
            <p className="text-xs text-[#3c4a3d]">This is a simulated login for preview purposes only.</p>
          </div>
        </div>
      </div>
    );
  }

  // OTP step
  return (
    <div className="w-full h-full flex items-center justify-center bg-[#f0f2f5] p-4">
      <div className="bg-white rounded-xl w-full max-w-sm p-8 shadow-md border border-[#E9EDEF]">
        <div className="flex flex-col items-center text-center gap-3">
          <div className="w-16 h-16 rounded-full flex items-center justify-center mb-2" style={{ backgroundColor: `${primary}20` }}>
            <span className="material-symbols-outlined text-3xl" style={{ color: primary }}>verified_user</span>
          </div>
          <h2 className="text-2xl font-semibold text-[#191c1e]">Enter OTP</h2>
          <p className="text-sm text-[#3c4a3d]">
            Please enter the 6-digit code sent to <span className="font-bold text-[#191c1e]">+91 {mobile}</span>
          </p>
        </div>

        <div className="flex flex-col gap-6 mt-8">
          <div className="flex justify-between gap-2">
            {otp.map((digit, index) => (
              <input
                key={index}
                ref={(el) => (inputRefs.current[index] = el)}
                type="text"
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
              onClick={() => { setTimeLeft(30); setCanResend(false); setError(''); }}
              disabled={!canResend}
              className={`text-sm font-semibold ${canResend ? 'hover:underline cursor-pointer' : 'text-gray-400 cursor-not-allowed opacity-50'}`}
              style={canResend ? { color: primary } : {}}
            >
              Resend OTP
            </button>
          </div>

          {error && <p className="text-[#ba1a1a] text-sm text-center">{error}</p>}

          <button
            onClick={handleVerify}
            disabled={loading}
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
