'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { auth as authApi } from '@/lib/api';
import {
  ShieldCheck, Copy, CheckCircle, ArrowRight, KeyRound, Smartphone, AlertCircle,
} from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';

type Step = 'idle' | 'qr' | 'verify' | 'done';

export default function MFASetupPage() {
  const { user, refreshUser } = useAuth();
  const router = useRouter();

  const [step, setStep] = useState<Step>('idle');
  const [qrCode, setQrCode] = useState('');
  const [secret, setSecret] = useState('');
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const codeInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (user?.mfaEnabled) router.replace('/profile');
  }, [user, router]);

  // Step 1: request QR code from the backend
  const startSetup = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await authApi.mfaSetup();
      setQrCode(res.data.qrCodeDataUrl);
      setSecret(res.data.secret);
      setStep('qr');
    } catch (err: any) {
      setError(err.message || 'Failed to start MFA setup.');
    } finally {
      setLoading(false);
    }
  };

  // Step 2: verify the TOTP code
  const verifyCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (code.length !== 6) { setError('Please enter the full 6-digit code.'); return; }
    setLoading(true);
    setError('');
    try {
      await authApi.mfaVerify(secret, code);
      await refreshUser();
      setStep('done');
    } catch (err: any) {
      setError(err.message || 'Invalid code. Please try again.');
      setCode('');
      codeInputRef.current?.focus();
    } finally {
      setLoading(false);
    }
  };

  const copySecret = () => {
    navigator.clipboard.writeText(secret).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  if (!user) return null;

  return (
    <div className="min-h-screen bg-[#FFF9FA] flex items-center justify-center p-6">
      <div className="w-full max-w-md">

        <div className="bg-white rounded-[32px] shadow-[0_32px_90px_rgba(236,72,153,0.12)] border border-white/60 p-8 md:p-10">

          <div className="flex items-center gap-3 mb-8">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#EC4899] to-[#F472B6] flex items-center justify-center shadow-lg shadow-[#EC4899]/20">
              <ShieldCheck className="w-6 h-6 text-white" strokeWidth={2} />
            </div>
            <div>
              <h1 className="text-xl font-black text-[#111827] leading-tight">Two-Factor Authentication</h1>
              <p className="text-xs text-gray-400 font-medium mt-0.5">TOTP via Authenticator App</p>
            </div>
          </div>

          {/* IDLE */}
          {step === 'idle' && (
            <>
              <div className="space-y-4 mb-8">
                {[
                  { icon: Smartphone, title: 'Install an authenticator', desc: 'Google Authenticator, Authy, or any TOTP-compatible app.' },
                  { icon: KeyRound, title: 'Scan the QR code', desc: 'You\'ll get a QR code to scan with your app on the next screen.' },
                  { icon: ShieldCheck, title: 'Enter the 6-digit code', desc: 'Enter the code your app shows to complete setup.' },
                ].map((item, i) => (
                  <div key={i} className="flex items-start gap-4 p-4 rounded-2xl bg-[#FDF2F8]/60">
                    <div className="w-9 h-9 rounded-xl bg-white border border-[#FBCFE8] flex items-center justify-center shrink-0">
                      <item.icon className="w-4 h-4 text-[#EC4899]" strokeWidth={2} />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-[#111827]">{item.title}</p>
                      <p className="text-xs text-gray-500 mt-0.5">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>

              {error && (
                <div className="mb-5 flex items-center gap-2.5 rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-[#991B1B]">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  {error}
                </div>
              )}

              <button
                onClick={startSetup}
                disabled={loading}
                className="w-full py-4 rounded-2xl bg-gradient-to-r from-[#EC4899] to-[#F472B6] text-white text-sm font-bold shadow-lg shadow-[#EC4899]/20 flex items-center justify-center gap-2.5 transition hover:-translate-y-0.5 hover:shadow-xl hover:shadow-[#EC4899]/30 disabled:opacity-60 disabled:hover:translate-y-0"
              >
                {loading ? (
                  <>
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Generating QR Code...
                  </>
                ) : (
                  <>
                    Get Started
                    <ArrowRight className="w-4 h-4" strokeWidth={2.5} />
                  </>
                )}
              </button>
            </>
          )}

          {/* QR CODE */}
          {step === 'qr' && (
            <>
              <p className="text-sm text-gray-500 mb-6">
                Scan this QR code with your authenticator app, then click <strong className="text-[#111827]">Continue</strong> to verify.
              </p>

              <div className="flex justify-center mb-6">
                <div className="p-4 rounded-2xl bg-white border-2 border-[#FBCFE8] inline-block shadow-sm">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={qrCode} alt="MFA QR Code" className="w-44 h-44" />
                </div>
              </div>

              <div className="rounded-2xl bg-[#FDF2F8]/60 border border-[#FBCFE8] p-4 mb-6">
                <p className="text-[11px] font-bold uppercase tracking-[0.1em] text-gray-400 mb-2">Can't scan? Enter this key manually</p>
                <div className="flex items-center gap-2">
                  <code className="flex-1 text-xs font-mono font-bold text-[#111827] break-all leading-relaxed">
                    {secret}
                  </code>
                  <button
                    type="button"
                    onClick={copySecret}
                    className="shrink-0 w-8 h-8 rounded-xl bg-white border border-gray-200 flex items-center justify-center hover:border-[#EC4899] transition-colors"
                    title="Copy key"
                  >
                    {copied
                      ? <CheckCircle className="w-4 h-4 text-green-500" />
                      : <Copy className="w-4 h-4 text-gray-400" />}
                  </button>
                </div>
              </div>

              <button
                onClick={() => { setStep('verify'); setTimeout(() => codeInputRef.current?.focus(), 50); }}
                className="w-full py-4 rounded-2xl bg-gradient-to-r from-[#EC4899] to-[#F472B6] text-white text-sm font-bold shadow-lg shadow-[#EC4899]/20 flex items-center justify-center gap-2.5 transition hover:-translate-y-0.5 hover:shadow-xl hover:shadow-[#EC4899]/30"
              >
                I've scanned it — Continue
                <ArrowRight className="w-4 h-4" strokeWidth={2.5} />
              </button>
            </>
          )}

          {/* VERIFY */}
          {step === 'verify' && (
            <form onSubmit={verifyCode} className="space-y-5">
              <p className="text-sm text-gray-500">
                Enter the 6-digit code currently shown in your authenticator app to complete setup.
              </p>

              <div className="space-y-1.5">
                <label className="text-[11px] font-bold uppercase tracking-[0.12em] text-gray-500">
                  Authenticator Code
                </label>
                <div className="relative">
                  <KeyRound className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[#EC4899]" strokeWidth={1.5} />
                  <input
                    ref={codeInputRef}
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]{6}"
                    maxLength={6}
                    value={code}
                    onChange={(e) => { setCode(e.target.value.replace(/\D/g, '').slice(0, 6)); setError(''); }}
                    placeholder="000000"
                    required
                    className="w-full rounded-2xl border border-gray-200 bg-gray-50/50 px-11 py-3.5 text-lg text-center font-mono tracking-[0.5em] text-[#111827] outline-none transition-all focus:bg-white focus:border-[#EC4899] focus:ring-2 focus:ring-[#FBCFE8] placeholder:text-gray-200 placeholder:tracking-normal"
                  />
                </div>
              </div>

              {error && (
                <div className="flex items-center gap-2.5 rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-[#991B1B]">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading || code.length !== 6}
                className="w-full py-4 rounded-2xl bg-gradient-to-r from-[#EC4899] to-[#F472B6] text-white text-sm font-bold shadow-lg shadow-[#EC4899]/20 flex items-center justify-center gap-2.5 transition hover:-translate-y-0.5 hover:shadow-xl hover:shadow-[#EC4899]/30 disabled:opacity-60 disabled:hover:translate-y-0"
              >
                {loading ? (
                  <>
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Verifying...
                  </>
                ) : (
                  <>
                    Verify & Enable MFA
                    <ShieldCheck className="w-4 h-4" strokeWidth={2.5} />
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={() => setStep('qr')}
                className="w-full text-sm text-gray-400 hover:text-gray-600 transition-colors pt-1"
              >
                ← Show QR code again
              </button>
            </form>
          )}

          {/* DONE */}
          {step === 'done' && (
            <div className="text-center py-4">
              <div className="w-20 h-20 rounded-full bg-gradient-to-br from-green-400 to-emerald-500 flex items-center justify-center mx-auto mb-6 shadow-lg shadow-green-500/20">
                <CheckCircle className="w-10 h-10 text-white" strokeWidth={2} />
              </div>
              <h2 className="text-2xl font-black text-[#111827] mb-2">MFA Enabled!</h2>
              <p className="text-sm text-gray-500 mb-8 max-w-xs mx-auto">
                Your account is now protected with two-factor authentication. You'll need your authenticator app each time you sign in.
              </p>
              <Link
                href="/profile"
                className="inline-flex items-center gap-2 px-8 py-4 rounded-2xl bg-gradient-to-r from-[#EC4899] to-[#F472B6] text-white text-sm font-bold shadow-lg shadow-[#EC4899]/20 transition hover:-translate-y-0.5 hover:shadow-xl hover:shadow-[#EC4899]/30"
              >
                Back to Profile
                <ArrowRight className="w-4 h-4" strokeWidth={2.5} />
              </Link>
            </div>
          )}
        </div>

        {step !== 'done' && (
          <p className="text-center text-sm text-gray-400 mt-6">
            <Link href="/profile" className="hover:text-[#EC4899] transition-colors font-medium">
              ← Return to Profile
            </Link>
          </p>
        )}
      </div>
    </div>
  );
}
