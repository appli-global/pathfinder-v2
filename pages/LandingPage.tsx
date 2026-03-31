import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const createSessionId = () =>
  `sess_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;

const LandingPage: React.FC = () => {
  const navigate = useNavigate();

  const ORIGINAL_AMOUNT_PAISE = 49900; // ₹499
  const [couponCode, setCouponCode] = useState('');
  const [couponLoading, setCouponLoading] = useState(false);
  const [couponResult, setCouponResult] = useState<{
    valid: boolean;
    code?: string;
    discountAmountPaise?: number;
    finalAmountPaise?: number;
    message?: string;
  } | null>(null);

  // If already paid, automatically redirect to quiz
  useEffect(() => {
    const existingPayment = localStorage.getItem('pathfinder_payment');
    if (existingPayment) {
      navigate('/quiz');
    }
  }, [navigate]);

  const handleApplyCoupon = async () => {
    if (!couponCode.trim()) return;
    setCouponLoading(true);
    setCouponResult(null);
    try {
      const resp = await fetch('/api/validate-coupon', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: couponCode.trim(), originalAmountPaise: ORIGINAL_AMOUNT_PAISE }),
      });
      const data = await resp.json();
      setCouponResult(data);
    } catch {
      setCouponResult({ valid: false, message: 'Unable to validate coupon. Please try again.' });
    } finally {
      setCouponLoading(false);
    }
  };

  const handleRemoveCoupon = () => {
    setCouponCode('');
    setCouponResult(null);
  };

  const getPayableAmount = () => {
    if (couponResult?.valid && couponResult.finalAmountPaise) {
      return couponResult.finalAmountPaise;
    }
    return ORIGINAL_AMOUNT_PAISE;
  };

  const startRazorpayPayment = () => {
    const key = (import.meta as any).env.VITE_RAZORPAY_KEY_ID;
    if (!key) {
      alert('Payment configuration is missing. Please contact support.');
      return;
    }

    const amountInPaise = getPayableAmount();

    const options: any = {
      key,
      amount: amountInPaise,
      currency: 'INR',
      name: 'Appli Pathfinder Report',
      description: 'Personalized career report and analysis',
      handler: (response: any) => {
        console.debug('[payment-client] Razorpay handler response', response);

        const newId = createSessionId();
        const paymentInfo = {
          provider: 'razorpay',
          paymentId: response.razorpay_payment_id,
          orderId: response.razorpay_order_id,
          signature: response.razorpay_signature,
          timestamp: Date.now(),
          paid: true
        };
        localStorage.setItem('pathfinder_payment', JSON.stringify(paymentInfo));

        // Trigger invoice generation (with required fields)
        fetch('/api/invoice', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sessionId: newId,
            level: '12', // default level for now, will be chosen in quiz
            payment: paymentInfo,
            billing: { name: '', phone: '' }, // API will enrich from Razorpay
            amount: amountInPaise,
            currency: 'INR',
          }),
        }).catch(err => console.warn('Invoice failed', err));

        navigate('/quiz');
      },
      theme: {
        color: '#ED1164',
      },
    };

    // @ts-ignore
    const rzp = new window.Razorpay(options);
    rzp.open();
  };

  const payable = getPayableAmount();
  const discount = ORIGINAL_AMOUNT_PAISE - payable;
  const hasDiscount = couponResult?.valid && discount > 0;

  return (
    <div className="min-h-screen flex flex-col-reverse md:flex-row font-sans">
      {/* LEFT COLUMN - Dark */}
      <div className="w-full md:w-[55%] lg:w-[60%] bg-[#09090b] text-white p-8 md:p-12 lg:p-16 flex flex-col justify-between" style={{ background: 'linear-gradient(to bottom right, #09090b, #18050e)' }}>
        <div>
          <div className="mb-12 hidden md:block">
            <img src="/Appli-Logo-Horizontal.svg" alt="Appli" className="h-8" style={{ filter: 'brightness(0) invert(1)' }} />
          </div>

          <h1 className="text-3xl md:text-4xl font-bold mb-10 text-slate-100">
            Your report is <span className="text-white font-extrabold">10 minutes</span> away.
          </h1>

          <div className="space-y-8 max-w-3xl xl:max-w-4xl mb-12">
            <div>
              <h3 className="text-sm font-bold mb-2 text-slate-100">Why we ask you to pay first?</h3>
              <p className="text-sm text-slate-400 leading-relaxed">
                We generate your report the moment you finish — no waiting, no follow-up, and no sales call. To make that instant delivery possible, we confirm your payment upfront which takes about 30 seconds to confirm. Meaning your report is ready the moment you answer the last question.
              </p>
            </div>

            <div>
              <h3 className="text-sm font-bold mb-2 text-slate-100">What happens after you pay?</h3>
              <ol className="text-sm text-slate-400 space-y-1">
                <li>1. Pay ₹499.</li>
                <li>2. Answer 3 sets of questions.</li>
                <li>3. Your personalized report is generated instantly.</li>
                <li>4. Download it, share it, or print it — it's yours forever.</li>
              </ol>
            </div>

            <div>
              <h3 className="text-sm font-bold mb-4 text-slate-100">What do you get at ₹499 ?</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-8">

                <div className="flex items-start gap-3">
                  <div className="text-emerald-500 text-xl flex-shrink-0 mt-0.5"><i className="ph-fill ph-clover"></i></div>
                  <p className="text-sm text-slate-400 leading-snug">
                    <strong className="font-bold text-slate-100">Career Archetypes and Match Score.</strong> Which fields genuinely fit you and why
                  </p>
                </div>

                <div className="flex items-start gap-3">
                  <div className="text-yellow-500 text-xl flex-shrink-0 mt-0.5"><i className="ph-fill ph-trophy"></i></div>
                  <p className="text-sm text-slate-400 leading-snug">
                    <strong className="font-bold text-slate-100">Top Course Recommendations.</strong> Ranked from 850+ programmes, explained not just listed
                  </p>
                </div>

                <div className="flex items-start gap-3">
                  <div className="text-blue-500 text-xl flex-shrink-0 mt-0.5"><i className="ph-fill ph-compass"></i></div>
                  <p className="text-sm text-slate-400 leading-snug">
                    <strong className="font-bold text-slate-100">Skill Signature Map.</strong> Your strengths mapped to real careers
                  </p>
                </div>

                <div className="flex items-start gap-3">
                  <div className="text-pink-500 text-xl flex-shrink-0 mt-0.5"><i className="ph-fill ph-graduation-cap"></i></div>
                  <p className="text-sm text-slate-400 leading-snug">
                    <strong className="font-bold text-slate-100">Academic and Personality Drivers.</strong> How you learn, what motivates you, where you'll thrive
                  </p>
                </div>

                <div className="flex items-start gap-3">
                  <div className="text-blue-600 text-xl flex-shrink-0 mt-0.5"><i className="ph-fill ph-briefcase"></i></div>
                  <p className="text-sm text-slate-400 leading-snug">
                    <strong className="font-bold text-slate-100">Future Career Vision.</strong> Real roles, real progression, no sugar-coating
                  </p>
                </div>

                <div className="flex items-start gap-3">
                  <div className="text-orange-500 text-xl flex-shrink-0 mt-0.5"><i className="ph-fill ph-arrows-split"></i></div>
                  <p className="text-sm text-slate-400 leading-snug">
                    <strong className="font-bold text-slate-100">Alternative Pathways.</strong> Backup routes and interdisciplinary options
                  </p>
                </div>

              </div>
            </div>
          </div>
        </div>

        <div className="flex justify-between items-center mt-8">
          <div className="text-xs text-slate-500">
            Trusted by <span className="font-semibold text-slate-300">2,00,000+ students and parents</span> across India.
          </div>
          <button onClick={() => window.scrollTo({ top: window.innerHeight, behavior: 'smooth' })} className="md:hidden text-slate-400 hover:text-slate-200 transition-colors border border-slate-600 rounded-full p-1 border-opacity-50">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 15l7-7 7 7" /></svg>
          </button>
        </div>
      </div>

      {/* RIGHT COLUMN - Light */}
      <div className="w-full md:w-[45%] lg:w-[40%] bg-white p-8 md:p-12 lg:p-16 flex flex-col justify-center min-h-[600px]">
        <div className="w-full max-w-md mx-auto">

          <div className="flex justify-center mb-10 md:hidden">
            <img src="/Appli-Logo-Horizontal.svg" alt="Appli Logo" className="h-8" />
          </div>

          <div className="mb-8">
            <h2 className="text-3xl md:text-4xl font-extrabold text-slate-900 mb-2">Payment Summary</h2>
            <p className="text-slate-500 text-sm">Unlock your personalized course report.</p>
          </div>

          <div className="bg-slate-50/50 rounded-2xl p-6 mb-8 border border-slate-100 shadow-sm">
            <div className="flex justify-between items-center mb-4 text-sm font-bold text-slate-500">
              <span>Item</span>
              <span>Cost</span>
            </div>

            <div className="flex justify-between items-center mb-4">
              <span className="text-slate-700 font-medium">Pathfinder Career Report</span>
              <span className="text-slate-700 font-semibold">₹{(ORIGINAL_AMOUNT_PAISE / 100).toFixed(0)}</span>
            </div>

            {hasDiscount && (
              <div className="flex justify-between items-center mb-4">
                <span className="text-emerald-600 font-medium text-sm flex items-center gap-1.5">
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A2 2 0 013 12V7a4 4 0 014-4z" /></svg>
                  Coupon ({couponResult?.code})
                </span>
                <span className="text-emerald-600 font-semibold">-₹{(discount / 100).toFixed(0)}</span>
              </div>
            )}

            <div className="border-t border-slate-200 pt-4 mt-2">
              <div className="flex justify-between items-center">
                <span className="text-slate-900 font-bold text-lg">Total</span>
                <div className="flex items-center gap-2">
                  {hasDiscount && (
                    <span className="text-slate-400 line-through text-sm">₹{(ORIGINAL_AMOUNT_PAISE / 100).toFixed(0)}</span>
                  )}
                  <span className="text-2xl font-extrabold text-slate-900">₹{(payable / 100).toFixed(0)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Coupon Input */}
          <div className="mb-6">
            <label className="text-xs font-bold text-slate-500 mb-2 block">Have a coupon?</label>
            {couponResult?.valid ? (
              <div className="flex items-center justify-between bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3">
                <div className="flex items-center gap-2">
                  <svg className="w-4 h-4 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                  <span className="text-emerald-700 font-bold text-sm">{couponResult.code}</span>
                  <span className="text-emerald-600 text-xs">— {couponResult.message}</span>
                </div>
                <button
                  onClick={handleRemoveCoupon}
                  className="text-slate-400 hover:text-red-500 transition-colors p-1"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
              </div>
            ) : (
              <div className="flex gap-2">
                <input
                  type="text"
                  value={couponCode}
                  onChange={(e) => { setCouponCode(e.target.value.toUpperCase()); setCouponResult(null); }}
                  onKeyDown={(e) => e.key === 'Enter' && handleApplyCoupon()}
                  placeholder="Enter coupon code"
                  className="flex-1 px-4 py-3 border border-slate-200 rounded-xl text-sm font-semibold uppercase tracking-wider focus:outline-none focus:border-[#ED1164] focus:ring-2 focus:ring-pink-100 transition-all placeholder:normal-case placeholder:tracking-normal placeholder:font-normal"
                />
                <button
                  onClick={handleApplyCoupon}
                  disabled={couponLoading || !couponCode.trim()}
                  className="px-6 py-3 bg-slate-900 text-white font-bold text-sm rounded-xl hover:bg-slate-800 transition-all disabled:opacity-40 disabled:cursor-not-allowed whitespace-nowrap"
                >
                  {couponLoading ? (
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : 'Apply'}
                </button>
              </div>
            )}
            {couponResult && !couponResult.valid && (
              <p className="text-red-500 text-xs mt-2 flex items-center gap-1">
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                {couponResult.message}
              </p>
            )}
          </div>

          <button
            onClick={startRazorpayPayment}
            className="w-full bg-[#ED1164] hover:bg-[#C40E53] text-white font-bold py-4 rounded-xl transition-all shadow-lg shadow-pink-200 hover:-translate-y-0.5"
          >
            Pay & Get Your Report
          </button>

          <div className="flex items-center justify-center gap-4 mt-6 text-[10px] text-slate-400 font-medium">
            <span className="flex items-center gap-1.5"><svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg> Secure Payment</span>
            <span className="text-slate-200">•</span>
            <span>Powered by Razorpay</span>
            <span className="text-slate-200">•</span>
            <span className="flex items-center gap-1.5"><svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg> Instant Report</span>
          </div>

        </div>

        <div className="flex justify-center mt-12 md:hidden">
          <button onClick={() => window.scrollTo({ top: window.innerHeight, behavior: 'smooth' })} className="text-slate-300 hover:text-slate-500 transition-colors border border-slate-300 rounded-full p-1 opacity-70">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 9l-7 7-7-7" /></svg>
          </button>
        </div>
      </div>
    </div>
  );
};

export default LandingPage;
