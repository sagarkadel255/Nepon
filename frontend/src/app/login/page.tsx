'use client';

import React, { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import Captcha from '@/components/Captcha';
import { Mail, Lock, Eye, EyeOff, ArrowRight, ShieldCheck, Truck, Sparkles, Star, KeyRound } from 'lucide-react';
import { useGSAP } from '@gsap/react';
import gsap from 'gsap';

const FEATURES = [
  { icon: ShieldCheck, text: 'Secure Checkout' },
  { icon: Sparkles, text: 'AI Fashion Assistant' },
  { icon: Star, text: 'Premium Brands' },
  { icon: Truck, text: 'Verified Sellers' },
];

const PARTICLE_DATA = [
  { w: 8, h: 8, l: 15, t: 10, c: 'rgba(236,72,153,0.15)' },
  { w: 5, h: 5, l: 40, t: 5, c: 'rgba(255,255,255,0.4)' },
  { w: 10, h: 10, l: 70, t: 15, c: 'rgba(236,72,153,0.1)' },
  { w: 6, h: 6, l: 85, t: 40, c: 'rgba(255,255,255,0.3)' },
  { w: 12, h: 12, l: 10, t: 60, c: 'rgba(236,72,153,0.08)' },
  { w: 7, h: 7, l: 50, t: 80, c: 'rgba(255,255,255,0.35)' },
  { w: 4, h: 4, l: 75, t: 70, c: 'rgba(236,72,153,0.12)' },
  { w: 9, h: 9, l: 30, t: 25, c: 'rgba(255,255,255,0.3)' },
];

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [emailFocused, setEmailFocused] = useState(false);
  const [passwordFocused, setPasswordFocused] = useState(false);
  const [mfaRequired, setMfaRequired] = useState(false);
  const [totpCode, setTotpCode] = useState('');
  // Custom CAPTCHA — challenge fetched by the Captcha component on mount.
  const [captcha, setCaptcha] = useState<{ id: string; answer: string }>({ id: '', answer: '' });
  const [captchaRefreshKey, setCaptchaRefreshKey] = useState(0);
  const { login } = useAuth();
  const router = useRouter();

  // Surface errors handed back by the Google OAuth callback redirect.
  useEffect(() => {
    const err = new URLSearchParams(window.location.search).get('error');
    if (err === 'google_not_configured') {
      setError('Google sign-in isn’t configured yet. Please use email and password.');
    } else if (err === 'google_failed') {
      setError('Google sign-in could not be completed. Please try again.');
    } else if (err === 'session_expired') {
      setError('Your session expired or the account no longer exists — please sign in again.');
    }
  }, []);

  const containerRef = useRef<HTMLDivElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const leftPanelRef = useRef<HTMLDivElement>(null);
  const floatingRefs = useRef<(HTMLDivElement | null)[]>([]);
  const particlesRef = useRef<(HTMLDivElement | null)[]>([]);

  useGSAP(() => {
    const tl = gsap.timeline({ defaults: { ease: 'power3.out' } });

    tl.fromTo(leftPanelRef.current, { opacity: 0, x: -80 }, { opacity: 1, x: 0, duration: 1.2 })
      .fromTo('.brand-title', { opacity: 0, y: 30 }, { opacity: 1, y: 0, duration: 0.8 }, '-=0.6')
      .fromTo('.brand-subtitle', { opacity: 0, y: 20 }, { opacity: 1, y: 0, duration: 0.6 }, '-=0.4')
      .fromTo('.feature-item', { opacity: 0, x: -20 }, { opacity: 1, x: 0, duration: 0.5, stagger: 0.1 }, '-=0.3');

    gsap.fromTo(cardRef.current,
      { opacity: 0, y: 40, scale: 0.98 },
      { opacity: 1, y: 0, scale: 1, duration: 1.2, ease: 'power3.out', delay: 0.2 },
    );
    gsap.fromTo('.form-item',
      { opacity: 0, y: 15 },
      { opacity: 1, y: 0, duration: 0.6, stagger: 0.08, ease: 'power3.out', delay: 0.6 },
    );

    floatingRefs.current.forEach((el, i) => {
      if (!el) return;
      gsap.to(el, {
        y: -12 - i * 4,
        duration: 3 + i * 0.5,
        ease: 'sine.inOut',
        yoyo: true,
        repeat: -1,
        delay: i * 0.3,
      });
    });
  }, { scope: containerRef });

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');

    // Require a solved CAPTCHA before hitting the API — matches the
    // /auth/login server middleware.
    if (!mfaRequired && (!captcha.id || !captcha.answer)) {
      setError('Please complete the security check.');
      return;
    }

    setLoading(true);
    try {
      const result = await login(
        email,
        password,
        mfaRequired ? totpCode : undefined,
        mfaRequired ? undefined : captcha,
      );

      if (result && 'requiresMFA' in result) {
        setMfaRequired(true);
        setTotpCode('');
        setLoading(false);
        return;
      }

      if (result && 'passwordExpired' in result) {
        setError(
          'Your password has expired (90-day rotation policy). Please reset it using the "Forgot password?" link — we will email you a secure link.',
        );
        setLoading(false);
        return;
      }

      router.push('/');
    } catch (err: any) {
      setError(err?.message || 'Unable to sign in.');
      // Rotate the challenge — every submitted answer is single-use, so a
      // failed submit must fetch a new one before the user retries.
      setCaptcha({ id: '', answer: '' });
      setCaptchaRefreshKey((k) => k + 1);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div ref={containerRef} className="relative w-full min-h-screen flex overflow-hidden bg-white">
      {/* Left panel — brand story */}
      <div ref={leftPanelRef} className="hidden lg:flex lg:w-[45%] relative bg-gradient-to-br from-[#FFF9FA] via-white to-[#FDF2F8] overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 rounded-full bg-gradient-to-br from-[#EC4899]/10 to-[#F472B6]/5 blur-3xl" />
        <div className="absolute -bottom-20 -left-20 w-60 h-60 rounded-full bg-gradient-to-tr from-[#FBCFE8]/30 to-transparent blur-2xl" />
        <div className="absolute top-1/3 -left-10 w-40 h-40 rounded-full bg-[#FDF2F8] blur-3xl" />

        <div className="absolute inset-0 z-[1]">
          <Image src="/login.png" alt="" fill sizes="(min-width: 1024px) 45vw, 0px" className="object-cover object-center" priority />
          {/* White veil keeps the brand copy readable over the photo */}
          <div className="absolute inset-0 bg-gradient-to-b from-white/70 via-white/15 to-white/40 pointer-events-none" />
        </div>

        {PARTICLE_DATA.map((p, i) => (
          <div
            key={`p-${i}`}
            ref={(el) => { particlesRef.current[i] = el; }}
            className="absolute rounded-full pointer-events-none"
            style={{ width: p.w, height: p.h, background: p.c, left: `${p.l}%`, top: `${p.t}%` }}
          />
        ))}

        <div className="relative z-10 flex flex-col h-full p-12 lg:p-14">
          <div className="flex items-center gap-3 mb-12">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#EC4899] to-[#F472B6] flex items-center justify-center shadow-lg shadow-[#EC4899]/20">
              <span className="text-white font-black text-lg">N</span>
            </div>
            <span className="text-xl font-black tracking-[0.15em] text-[#111827]">NEPON</span>
          </div>

          <div className="flex-1 flex flex-col justify-center">
            <h1 className="brand-title text-[2.75rem] leading-[1.1] font-black text-[#111827] tracking-tight">
              Elevate Your
              <br />
              <span className="bg-gradient-to-r from-[#EC4899] to-[#F472B6] bg-clip-text text-transparent">Fashion</span>
            </h1>
            <p className="brand-subtitle text-gray-500 text-base mt-4 max-w-xs leading-relaxed">
              Premium clothing from trusted sellers. Curated collections, delivered to your door.
            </p>

            <div className="flex items-center gap-3 mt-8 brand-subtitle">
              <div className="flex items-center gap-0.5">
                {[1, 2, 3, 4, 5].map((s) => (
                  <Star key={s} className="w-4 h-4 fill-[#F59E0B] text-[#F59E0B]" strokeWidth={0} />
                ))}
              </div>
              <span className="text-sm font-bold text-[#111827]">4.9</span>
              <span className="text-sm text-gray-400 font-medium">(25k+ reviews)</span>
            </div>

            <div className="mt-10 space-y-3.5">
              {FEATURES.map((f, i) => (
                <div key={i} className="feature-item flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#FDF2F8] to-[#FCE7F3] flex items-center justify-center">
                    <f.icon className="w-4 h-4 text-[#EC4899]" strokeWidth={2} />
                  </div>
                  <span className="text-sm font-semibold text-gray-600">{f.text}</span>
                </div>
              ))}
            </div>

            <div className="relative mt-auto">
              <div
                ref={(el) => { floatingRefs.current[0] = el; }}
                className="absolute -top-16 -right-4 bg-white/90 backdrop-blur-md rounded-2xl px-4 py-3 shadow-xl border border-white/60 flex items-center gap-2.5"
              >
                <div className="flex items-center gap-0.5">
                  {[1, 2, 3, 4, 5].map((s) => (
                    <Star key={s} className="w-3 h-3 fill-[#F59E0B] text-[#F59E0B]" strokeWidth={0} />
                  ))}
                </div>
                <span className="text-xs font-bold text-gray-600">120k Happy Customers</span>
              </div>
              <div
                ref={(el) => { floatingRefs.current[1] = el; }}
                className="absolute bottom-24 right-8 bg-white/90 backdrop-blur-md rounded-2xl px-4 py-3 shadow-xl border border-white/60 flex items-center gap-2.5"
              >
                <Truck className="w-4 h-4 text-[#EC4899]" />
                <span className="text-xs font-bold text-gray-600">Free Shipping</span>
              </div>
              <div
                ref={(el) => { floatingRefs.current[2] = el; }}
                className="absolute top-1/3 -right-2 bg-white/90 backdrop-blur-md rounded-2xl px-4 py-3 shadow-xl border border-white/60 flex items-center gap-2.5"
              >
                <Sparkles className="w-4 h-4 text-[#EC4899]" />
                <span className="text-xs font-bold text-gray-600">AI Recommended</span>
              </div>
              <div
                ref={(el) => { floatingRefs.current[3] = el; }}
                className="absolute bottom-1/3 -left-4 bg-white/90 backdrop-blur-md rounded-2xl px-4 py-3 shadow-xl border border-white/60 flex items-center gap-2.5"
              >
                <Star className="w-4 h-4 text-[#F59E0B] fill-[#F59E0B]" />
                <span className="text-xs font-bold text-gray-600">New Collection</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Right panel — login form */}
      <div className="w-full lg:w-[55%] min-h-screen flex items-center justify-center p-6 lg:p-10">
        <div ref={cardRef} className="w-full max-w-[440px]">
          <div className="form-item space-y-1.5 mb-8">
            <h1 className="text-[2rem] font-black text-[#111827] tracking-tight leading-tight">
              Welcome Back
            </h1>
            <p className="text-gray-500 text-[15px] font-medium">
              Continue your fashion journey.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <div className="form-item rounded-2xl border border-red-100 bg-red-50/80 px-5 py-3.5 text-sm font-medium text-[#991B1B] backdrop-blur-sm">
                {error}
              </div>
            )}

            {mfaRequired ? (
              /* Step 2: TOTP code */
              <>
                <div className="form-item rounded-2xl border border-[#FBCFE8] bg-[#FDF2F8] px-5 py-4 flex items-start gap-3">
                  <KeyRound className="w-5 h-5 text-[#EC4899] mt-0.5 shrink-0" strokeWidth={2} />
                  <div>
                    <p className="text-sm font-bold text-[#111827]">Two-factor verification</p>
                    <p className="text-xs text-gray-500 mt-0.5">Open your authenticator app and enter the 6-digit code.</p>
                  </div>
                </div>

                <div className="form-item space-y-1.5">
                  <label className="text-[11px] font-bold uppercase tracking-[0.12em] text-gray-500">Authenticator Code</label>
                  <div className="relative">
                    <KeyRound className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[#EC4899]" strokeWidth={1.5} />
                    <input
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]{6}"
                      maxLength={6}
                      value={totpCode}
                      onChange={(e) => setTotpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                      required
                      autoFocus
                      placeholder="000000"
                      className="w-full rounded-2xl border border-gray-200 bg-gray-50/50 px-11 py-3.5 text-sm text-[#111827] tracking-[0.25em] outline-none transition-all duration-300 focus:bg-white focus:border-[#EC4899] focus:ring-2 focus:ring-[#FBCFE8] placeholder:text-gray-300"
                    />
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => { setMfaRequired(false); setTotpCode(''); setError(''); }}
                  className="form-item text-sm text-gray-400 hover:text-gray-600 transition-colors"
                >
                  ← Back to sign in
                </button>
              </>
            ) : (
              /* Step 1: email + password */
              <>
                <div className="form-item space-y-1.5">
                  <label className="text-[11px] font-bold uppercase tracking-[0.12em] text-gray-500">Email</label>
                  <div className="relative group">
                    <Mail className={`absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 transition-colors duration-300 ${emailFocused || email ? 'text-[#EC4899]' : 'text-gray-300'}`} strokeWidth={1.5} />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      onFocus={() => setEmailFocused(true)}
                      onBlur={() => setEmailFocused(false)}
                      required
                      placeholder="you@example.com"
                      className="w-full rounded-2xl border border-gray-200 bg-gray-50/50 px-11 py-3.5 text-sm text-[#111827] outline-none transition-all duration-300 focus:bg-white focus:border-[#EC4899] focus:ring-2 focus:ring-[#FBCFE8] placeholder:text-gray-300"
                    />
                  </div>
                </div>

                <div className="form-item space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-[11px] font-bold uppercase tracking-[0.12em] text-gray-500">Password</label>
                    <Link href="/forgot-password" className="text-[11px] font-semibold text-[#EC4899] hover:text-[#BE185D] transition-colors">
                      Forgot?
                    </Link>
                  </div>
                  <div className="relative">
                    <Lock className={`absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 transition-colors duration-300 ${passwordFocused || password ? 'text-[#EC4899]' : 'text-gray-300'}`} strokeWidth={1.5} />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      onFocus={() => setPasswordFocused(true)}
                      onBlur={() => setPasswordFocused(false)}
                      required
                      placeholder="Enter your password"
                      className="w-full rounded-2xl border border-gray-200 bg-gray-50/50 px-11 py-3.5 pr-12 text-sm text-[#111827] outline-none transition-all duration-300 placeholder:text-gray-300 focus:bg-white focus:border-[#EC4899] focus:ring-2 focus:ring-[#FBCFE8]"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((c) => !c)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-[#111827] transition-colors"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div className="form-item flex items-center justify-between">
                  <label className="flex items-center gap-2.5 cursor-pointer group">
                    <input type="checkbox" className="w-4 h-4 rounded border-gray-300 text-[#EC4899] focus:ring-[#EC4899] accent-[#EC4899] cursor-pointer" />
                    <span className="text-sm text-gray-500 group-hover:text-gray-700 transition-colors font-medium">Remember me</span>
                  </label>
                  <Link href="/forgot-password" className="text-sm font-semibold text-[#EC4899] hover:text-[#BE185D] transition-colors">
                    Forgot password?
                  </Link>
                </div>
              </>
            )}

            {/* In-app CAPTCHA — first-party challenge/response; server refuses login without it. */}
            {!mfaRequired && (
              <div className="form-item">
                <Captcha key={captchaRefreshKey} value={captcha} onChange={setCaptcha} />
              </div>
            )}

            <button
              type="submit"
              disabled={
                loading ||
                (mfaRequired && totpCode.length !== 6) ||
                (!mfaRequired && (!captcha.id || !captcha.answer))
              }
              className="form-item relative w-full py-4 rounded-2xl bg-gradient-to-r from-[#EC4899] to-[#F472B6] text-white text-sm font-bold shadow-lg shadow-[#EC4899]/20 overflow-hidden group transition-all duration-300 hover:shadow-xl hover:shadow-[#EC4899]/30 hover:-translate-y-0.5 disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:translate-y-0"
            >
              <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
              <span className="relative flex items-center justify-center gap-2.5">
                {loading ? (
                  <span className="flex items-center gap-2.5">
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    {mfaRequired ? 'Verifying...' : 'Signing in...'}
                  </span>
                ) : (
                  <>
                    {mfaRequired ? 'Verify Code' : 'Sign In'}
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" strokeWidth={2.5} />
                  </>
                )}
              </span>
            </button>
          </form>

          <div className="form-item relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-100" />
            </div>
            <div className="relative flex justify-center">
              <span className="bg-white px-4 text-[11px] font-semibold uppercase tracking-[0.15em] text-gray-400">
                Continue with
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={() => { window.location.href = '/api/auth/google'; }}
            className="form-item relative w-full py-3.5 rounded-2xl border border-gray-200 bg-white text-sm font-semibold text-gray-700 shadow-sm overflow-hidden group transition-all duration-300 hover:border-gray-300 hover:shadow-md hover:-translate-y-0.5 focus:outline-none focus:ring-2 focus:ring-[#EC4899]"
          >
            <span className="absolute inset-0 bg-gradient-to-r from-gray-50 to-white opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            <span className="relative flex items-center justify-center gap-3">
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
              </svg>
              <span className="relative">Continue with Google</span>
            </span>
          </button>

          <p className="form-item text-center text-sm text-gray-500 mt-6">
            No account?{' '}
            <Link href="/register" className="font-bold text-[#EC4899] hover:text-[#BE185D] transition-colors">
              Create one
            </Link>
          </p>

          <div className="form-item mt-8 pt-6 border-t border-gray-50">
            <div className="flex items-center justify-center gap-4">
              <div className="flex items-center gap-1">
                {[1, 2, 3, 4, 5].map((s) => (
                  <Star key={s} className="w-3 h-3 fill-[#F59E0B] text-[#F59E0B]" strokeWidth={0} />
                ))}
              </div>
              <span className="text-xs font-bold text-gray-500">Trusted by 25,000+ customers</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
