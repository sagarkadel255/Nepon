'use client';

import { FormEvent, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, ArrowRight, CheckCircle2, Eye, EyeOff, LockKeyhole } from 'lucide-react';
import { useParams, useRouter } from 'next/navigation';
import { auth } from '@/lib/api';

export default function ResetPasswordPage() {
  const { token } = useParams<{ token: string }>();
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError('');
    if (password !== confirmation) {
      setError('Passwords do not match.');
      return;
    }
    setLoading(true);
    try {
      await auth.resetPassword(token, password);
      setSuccess(true);
      window.setTimeout(() => router.push('/login'), 1800);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'This reset link is no longer valid.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#FFF9FA] px-4 py-16 sm:px-6">
      <section className="w-full max-w-lg rounded-[32px] border border-[#FBCFE8] bg-white p-7 shadow-[0_24px_80px_rgba(236,72,153,0.12)] sm:p-12">
        <Link href="/login" className="inline-flex items-center gap-2 text-sm font-semibold text-gray-500 transition hover:text-[#EC4899]"><ArrowLeft className="h-4 w-4" /> Back to sign in</Link>
        <div className="mt-12 flex h-12 w-12 items-center justify-center rounded-2xl bg-[#FDF2F8] text-[#EC4899]"><LockKeyhole className="h-6 w-6" /></div>
        <h1 className="mt-6 text-3xl font-black text-[#111827]">Create a new password</h1>
        <p className="mt-3 text-sm leading-relaxed text-gray-500">Choose a strong password with at least 12 characters, including uppercase, lowercase, a number, and a symbol.</p>

        {success ? (
          <div role="status" className="mt-8 rounded-2xl border border-emerald-100 bg-emerald-50 p-5 text-sm font-medium text-emerald-800"><CheckCircle2 className="mb-2 h-5 w-5" />Password updated. Redirecting you to sign in...</div>
        ) : (
          <form onSubmit={handleSubmit} className="mt-8 space-y-5">
            {error && <div role="alert" className="rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-medium text-red-800">{error}</div>}
            <label className="block text-xs font-bold uppercase tracking-[0.12em] text-gray-500">
              New password
              <span className="relative mt-2 block">
                <LockKeyhole className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <input type={showPassword ? 'text' : 'password'} required minLength={12} value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Enter a new password" className="w-full rounded-2xl border border-gray-200 bg-gray-50 px-11 py-3.5 pr-12 text-sm font-medium text-[#111827] outline-none transition focus:border-[#EC4899] focus:bg-white focus:ring-2 focus:ring-[#FBCFE8]" />
                <button type="button" aria-label={showPassword ? 'Hide password' : 'Show password'} onClick={() => setShowPassword((visible) => !visible)} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-700">{showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}</button>
              </span>
            </label>
            <label className="block text-xs font-bold uppercase tracking-[0.12em] text-gray-500">
              Confirm password
              <input type="password" required minLength={12} value={confirmation} onChange={(event) => setConfirmation(event.target.value)} placeholder="Repeat your new password" className="mt-2 w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3.5 text-sm font-medium text-[#111827] outline-none transition focus:border-[#EC4899] focus:bg-white focus:ring-2 focus:ring-[#FBCFE8]" />
            </label>
            <button type="submit" disabled={loading} className="flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-[#EC4899] to-[#F472B6] py-4 text-sm font-bold text-white shadow-lg shadow-[#EC4899]/20 transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60">{loading ? 'Updating password...' : 'Update password'} {!loading && <ArrowRight className="h-4 w-4" />}</button>
          </form>
        )}
      </section>
    </main>
  );
}
