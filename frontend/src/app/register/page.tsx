'use client';

import React, { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { Mail, Lock, Eye, EyeOff, User, Store, ArrowRight, ShieldCheck, Check, X } from 'lucide-react';
import Captcha from '@/components/Captcha';
import Image from 'next/image';
import { useGSAP } from '@gsap/react';
import gsap from 'gsap';

const ROLES = [
  { id: 'buyer', label: 'Buyer', icon: User, description: 'Shop from curated sellers' },
  { id: 'seller', label: 'Seller', icon: Store, description: 'List and sell your products' },
] as const;

// Password strength scoring
function scorePassword(pw: string): { score: number; label: string; color: string } {
  if (!pw) return { score: 0, label: '', color: '' };
  let score = 0;
  if (pw.length >= 12)              score++;
  if (/[A-Z]/.test(pw))            score++;
  if (/[a-z]/.test(pw))            score++;
  if (/\d/.test(pw))               score++;
  if (/[^a-zA-Z0-9]/.test(pw))     score++;
  // Map 5 requirements → 4-bar display
  const display = score <= 1 ? 1 : score <= 2 ? 2 : score <= 4 ? 3 : 4;
  const labels  = ['', 'Weak', 'Fair', 'Good', 'Strong'];
  const colors  = ['', 'text-red-500', 'text-amber-500', 'text-blue-500', 'text-emerald-500'];
  return { score: display, label: labels[display], color: colors[display] };
}

// Password policy (mirrors backend auth.validation.ts)
const PASSWORD_REQS: { label: string; test: (pw: string) => boolean }[] = [
  { label: 'At least 12 characters', test: (pw) => pw.length >= 12 },
  { label: 'One uppercase letter', test: (pw) => /[A-Z]/.test(pw) },
  { label: 'One lowercase letter', test: (pw) => /[a-z]/.test(pw) },
  { label: 'One number', test: (pw) => /\d/.test(pw) },
  { label: 'One special character', test: (pw) => /[^a-zA-Z0-9]/.test(pw) },
];

export default function RegisterPage() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [role, setRole] = useState<'buyer' | 'seller'>('buyer');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { register } = useAuth();
  const router = useRouter();
  const pwStrength = scorePassword(password);
  const pwChecks = PASSWORD_REQS.map((r) => ({ label: r.label, ok: r.test(password) }));
  const pwValid = pwChecks.every((c) => c.ok);

  // Custom CAPTCHA — challenge fetched by the Captcha component on mount.
  const [captcha, setCaptcha] = useState<{ id: string; answer: string }>({ id: '', answer: '' });
  const [captchaRefreshKey, setCaptchaRefreshKey] = useState(0);

  const containerRef = useRef<HTMLDivElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const leftDoorRef = useRef<HTMLDivElement>(null);
  const rightDoorRef = useRef<HTMLDivElement>(null);

  useGSAP(() => {
    gsap.to(leftDoorRef.current, {
      xPercent: -100,
      duration: 1.2,
      ease: 'power3.inOut'
    });
    gsap.to(rightDoorRef.current, {
      xPercent: 100,
      duration: 1.2,
      ease: 'power3.inOut'
    });

    gsap.fromTo(cardRef.current,
      { opacity: 0, y: 60, scale: 0.97 },
      { opacity: 1, y: 0, scale: 1, duration: 1.2, ease: 'power3.out', delay: 0.3 },
    );
    gsap.fromTo('.stagger-item',
      { opacity: 0, y: 20 },
      { opacity: 1, y: 0, duration: 0.8, stagger: 0.1, ease: 'power3.out', delay: 0.8 },
    );
  }, { scope: containerRef });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Enforce the password policy client-side before hitting the API,
    // so weak passwords don't burn attempts against the rate limiter.
    if (!pwValid) {
      setError('Your password does not meet all the requirements listed below.');
      return;
    }

    if (!captcha.id || !captcha.answer) {
      setError('Please complete the security check.');
      return;
    }

    setLoading(true);
    try {
      await register({
        email,
        password,
        displayName: name,
        role,
        captchaId: captcha.id,
        captchaAnswer: captcha.answer,
      });
      router.push('/');
    } catch (err: any) {
      // Backend validation messages arrive as "body.field: message" — tidy them for display.
      const raw = err?.message || 'Unable to create account.';
      setError(raw.replace(/body\./g, '').replace(/^\w+:\s*/, ''));
      // Rotate the challenge — every submitted answer is single-use.
      setCaptcha({ id: '', answer: '' });
      setCaptchaRefreshKey((k) => k + 1);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div ref={containerRef} className="relative w-full min-h-screen flex items-center justify-center overflow-hidden bg-[#FFF9FA]">

      <div className="absolute inset-0 z-0">
        <Image
          src="/login.png"
          alt=""
          fill
          className="object-cover object-center scale-105"
          priority
        />
      </div>
      <div className="absolute inset-0 z-[1] bg-black/30" />

      <div ref={leftDoorRef} className="absolute left-0 top-0 bottom-0 w-1/2 bg-[#1a1a2e] z-20" />
      <div ref={rightDoorRef} className="absolute right-0 top-0 bottom-0 w-1/2 bg-[#1a1a2e] z-20" />

      <div ref={cardRef} className="relative z-10 w-full max-w-[1000px] mx-4 flex flex-col lg:flex-row overflow-hidden shadow-[0_32px_90px_rgba(236,72,153,0.15)] rounded-[32px] bg-white/95 backdrop-blur-xl border border-white/60">

        <div className="hidden lg:flex lg:w-5/12 bg-[#1a1a2e] p-12 flex-col justify-between text-white relative overflow-hidden">
          <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/noise-pattern-with-subtle-cross-lines.png')] opacity-20"></div>

          <div className="relative z-10 space-y-6 stagger-item">
            <h2 className="text-4xl font-black tracking-tight">NEPON</h2>
            <p className="text-lg text-gray-300 font-medium">Join the secure marketplace for independent fashion.</p>
          </div>

          <div className="relative z-10 space-y-8 stagger-item">
            <div className="flex items-start gap-4">
              <div className="p-3 rounded-full bg-white/10 shrink-0">
                <Store className="w-6 h-6 text-[#EC4899]" />
              </div>
              <div>
                <h4 className="font-bold text-lg">Independent Sellers</h4>
                <p className="text-sm text-gray-400 mt-1">Discover unique items from small brands.</p>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <div className="p-3 rounded-full bg-white/10 shrink-0">
                <ShieldCheck className="w-6 h-6 text-[#EC4899]" />
              </div>
              <div>
                <h4 className="font-bold text-lg">Secure Shopping</h4>
                <p className="text-sm text-gray-400 mt-1">End-to-end encrypted payments and data.</p>
              </div>
            </div>
          </div>
        </div>

        <div className="w-full lg:w-7/12 p-8 lg:p-12">
          <div className="space-y-6">
            <div className="space-y-2 stagger-item">
              <p className="text-sm font-semibold uppercase tracking-[0.3em] text-[#B91C1C]">Get Started</p>
              <h1 className="text-3xl font-black text-[#111827]">Create an account</h1>
              <p className="text-sm text-[#6B7280]">Join NEPON and start exploring today.</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              {error && <div className="stagger-item rounded-[24px] border border-red-100 bg-red-50 px-4 py-3 text-sm text-[#991B1B]">{error}</div>}

              <div className="stagger-item">
                <label className="block text-sm font-medium text-[#111827] mb-2">I want to...</label>
                <div className="grid grid-cols-2 gap-3">
                  {ROLES.map((r) => {
                    const Icon = r.icon;
                    const isSelected = role === r.id;
                    return (
                      <button
                        key={r.id}
                        type="button"
                        onClick={() => setRole(r.id)}
                        className={`flex flex-col items-center justify-center gap-2 p-4 rounded-[24px] border-2 transition-all ${
                          isSelected
                            ? 'border-[#EC4899] bg-[#FDF2F8] text-[#EC4899]'
                            : 'border-gray-100 hover:border-gray-200 text-gray-500'
                        }`}
                      >
                        <Icon className={`w-6 h-6 ${isSelected ? 'text-[#EC4899]' : 'text-gray-400'}`} />
                        <span className="font-semibold text-sm">{r.label}</span>
                      </button>
                    )
                  })}
                </div>
              </div>

              <div className="space-y-3 stagger-item">
                <label className="block text-sm font-medium text-[#111827]">Full name</label>
                <div className="relative">
                  <User className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#9CA3AF]" />
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    placeholder="Your full name"
                    className="w-full rounded-[24px] border border-[#E5E7EB] bg-white px-12 py-3 text-sm text-[#111827] outline-none transition focus:border-[#EC4899] focus:ring-2 focus:ring-[#FBCFE8]"
                  />
                </div>
              </div>

              <div className="space-y-3 stagger-item">
                <label className="block text-sm font-medium text-[#111827]">Email</label>
                <div className="relative">
                  <Mail className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#9CA3AF]" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    placeholder="you@example.com"
                    className="w-full rounded-[24px] border border-[#E5E7EB] bg-white px-12 py-3 text-sm text-[#111827] outline-none transition focus:border-[#EC4899] focus:ring-2 focus:ring-[#FBCFE8]"
                  />
                </div>
              </div>

              <div className="space-y-2 stagger-item">
                <label className="block text-sm font-medium text-[#111827]">Password</label>
                <div className="relative">
                  <Lock className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#9CA3AF]" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={12}
                    placeholder="Min 12 chars, upper, lower, number, symbol"
                    className="w-full rounded-[24px] border border-[#E5E7EB] bg-white px-12 py-3 pr-12 text-sm text-[#111827] outline-none transition focus:border-[#EC4899] focus:ring-2 focus:ring-[#FBCFE8]"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((c) => !c)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-[#6B7280] transition hover:text-[#111827]"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {password.length > 0 && (
                  <div>
                    <div
                      className="password-strength"
                      data-strength={pwStrength.score}
                      aria-label={`Password strength: ${pwStrength.label}`}
                    >
                      <div className="password-strength-bar" />
                      <div className="password-strength-bar" />
                      <div className="password-strength-bar" />
                      <div className="password-strength-bar" />
                    </div>
                    <p className={`password-strength-label ${pwStrength.color}`}>
                      {pwStrength.label}
                    </p>

                    <ul className="mt-2.5 grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1.5">
                      {pwChecks.map((c) => (
                        <li key={c.label} className="flex items-center gap-1.5 text-xs font-medium">
                          <span
                            className={`flex h-4 w-4 items-center justify-center rounded-full transition-colors ${
                              c.ok ? 'bg-emerald-100 text-emerald-600' : 'bg-gray-100 text-gray-400'
                            }`}
                          >
                            {c.ok ? <Check className="h-2.5 w-2.5" strokeWidth={3} /> : <X className="h-2.5 w-2.5" strokeWidth={3} />}
                          </span>
                          <span className={c.ok ? 'text-emerald-700' : 'text-gray-500'}>{c.label}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>

              <div className="stagger-item">
                <Captcha key={captchaRefreshKey} value={captcha} onChange={setCaptcha} />
              </div>

              <button
                type="submit"
                disabled={loading || (password.length > 0 && !pwValid) || !captcha.id || !captcha.answer}
                className="stagger-item inline-flex w-full items-center justify-center gap-2 rounded-[24px] bg-gradient-to-r from-[#EC4899] to-[#F472B6] px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-[#EC4899]/20 transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading ? 'Creating account...' : 'Create Account'}
                {!loading && <ArrowRight className="h-4 w-4" />}
              </button>

              <div className="text-center text-sm text-[#6B7280] stagger-item">
                Already have an account?{' '}
                <Link href="/login" className="font-semibold text-[#EC4899] hover:text-[#B91C1C]">Sign in</Link>
              </div>

              <div className="relative stagger-item">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t border-gray-200" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-white/0 px-2 text-gray-500 backdrop-blur-sm">Or continue with</span>
                </div>
              </div>

              <button
                type="button"
                className="stagger-item inline-flex w-full items-center justify-center gap-2 rounded-[24px] border border-gray-200 bg-white px-4 py-3 text-sm font-medium text-gray-700 shadow-sm transition hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-[#EC4899]"
                onClick={() => {
                  window.location.href = '/api/auth/google';
                }}
              >
                <svg className="h-5 w-5" viewBox="0 0 24 24">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                </svg>
                Google
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
