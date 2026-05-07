'use client';

import { FormEvent, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, ArrowRight, Mail, ShieldCheck } from 'lucide-react';
import { auth } from '@/lib/api';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setStatus('');
    setError('');
    setLoading(true);
    try {
      await auth.forgotPassword(email);
      setStatus('If an account exists for this email, a reset link has been sent.');
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Unable to send the reset link.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-[#FFF9FA] px-4 py-16 sm:px-6">
      <div className="mx-auto grid w-full max-w-5xl overflow-hidden rounded-[32px] border border-[#FBCFE8] bg-white shadow-[0_24px_80px_rgba(236,72,153,0.12)] lg:grid-cols-[0.9fr_1.1fr]">
        <section className="hidden bg-[#1a1a2e] p-10 text-white lg:flex lg:flex-col lg:justify-between">
          <div>
            <div className="mb-10 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-[#EC4899] to-[#F472B6] font-black">N</div>
              <span className="font-black tracking-[0.18em]">NEPON</span>
            </div>
            <p className="text-xs font-bold uppercase tracking-[0.25em] text-[#F9A8D4]">Account recovery</p>
            <h1 className="mt-4 text-4xl font-black leading-tight">Back to your wardrobe, securely.</h1>
            <p className="mt-5 leading-relaxed text-white/65">We will send a single-use link to the email address on your account.</p>
          </div>
          <div className="flex items-center gap-3 text-sm font-semibold text-white/70">
            <ShieldCheck className="h-5 w-5 text-[#F472B6]" /> Secure recovery flow
          </div>
        </section>

        <section className="p-7 sm:p-12">
          <Link href="/login" className="mb-12 inline-flex items-center gap-2 text-sm font-semibold text-gray-500 transition hover:text-[#EC4899]">
            <ArrowLeft className="h-4 w-4" /> Back to sign in
          </Link>
          <div className="max-w-md">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#EC4899]">Forgot password</p>
            <h2 className="mt-3 text-3xl font-black text-[#111827]">Reset your password</h2>
            <p className="mt-3 text-sm leading-relaxed text-gray-500">Enter your account email and we will send instructions to create a new password.</p>

            <form onSubmit={handleSubmit} className="mt-8 space-y-5">
              {status && <div role="status" className="rounded-2xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800">{status}</div>}
              {error && <div role="alert" className="rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-medium text-red-800">{error}</div>}
              <label className="block text-xs font-bold uppercase tracking-[0.12em] text-gray-500">
                Email address
                <span className="relative mt-2 block">
                  <Mail className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                  <input type="email" required value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@example.com" className="w-full rounded-2xl border border-gray-200 bg-gray-50 px-11 py-3.5 text-sm font-medium text-[#111827] outline-none transition focus:border-[#EC4899] focus:bg-white focus:ring-2 focus:ring-[#FBCFE8]" />
                </span>
              </label>
              <button type="submit" disabled={loading} className="flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-[#EC4899] to-[#F472B6] py-4 text-sm font-bold text-white shadow-lg shadow-[#EC4899]/20 transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60">
                {loading ? 'Sending link...' : 'Send reset link'}
                {!loading && <ArrowRight className="h-4 w-4" />}
              </button>
            </form>
          </div>
        </section>
      </div>
    </main>
  );
}
