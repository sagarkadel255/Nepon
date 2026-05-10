'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { auth as authApi } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { User as UserIcon, Mail, Shield, CheckCircle, ShieldCheck, ShieldOff, AlertCircle, Download } from 'lucide-react';
import { useGSAP } from '@gsap/react';
import gsap from 'gsap';

export default function ProfilePage() {
  const { user, refreshUser } = useAuth();
  const [profile, setProfile] = useState({ displayName: '', email: '' });
  const [password, setPassword] = useState({ oldPassword: '', newPassword: '' });
  const [mfaDisable, setMfaDisable] = useState({ password: '', totpCode: '' });
  const [showDisableMfa, setShowDisableMfa] = useState(false);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [mfaMessage, setMfaMessage] = useState('');
  const [mfaError, setMfaError] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);

  useGSAP(() => {
    if (!loading) {
      gsap.fromTo('.stagger-item', { opacity: 0, y: 30 }, { opacity: 1, y: 0, duration: 0.8, stagger: 0.1, ease: 'power3.out' });
    }
  }, { scope: containerRef, dependencies: [loading] });

  useEffect(() => {
    if (user) {
      setProfile({ displayName: user.displayName, email: user.email });
      setLoading(false);
    }
  }, [user]);

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setProcessing(true);
    try {
      await authApi.updateProfile(profile);
      alert('Profile updated');
    } catch (err: any) { alert(err.message); }
    finally { setProcessing(false); }
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setProcessing(true);
    try {
      await authApi.changePassword(password);
      alert('Password updated successfully. You will need to log in again on all devices.');
      setPassword({ oldPassword: '', newPassword: '' });
    } catch (err: any) { alert(err.message); }
    finally { setProcessing(false); }
  };

  const handleDisableMfa = async (e: React.FormEvent) => {
    e.preventDefault();
    setProcessing(true);
    setMfaError('');
    try {
      await authApi.mfaDisable(mfaDisable.password, mfaDisable.totpCode);
      await refreshUser();
      setMfaMessage('Two-factor authentication has been disabled.');
      setShowDisableMfa(false);
      setMfaDisable({ password: '', totpCode: '' });
    } catch (err: any) {
      setMfaError(err.message || 'Failed to disable MFA.');
    } finally {
      setProcessing(false);
    }
  };

  if (!user) return null;

  if (loading) return (
    <div className="min-h-screen bg-[#FFF9FA] pt-32 pb-20 flex justify-center">
      <div className="w-12 h-12 border-4 border-[#EC4899] border-t-transparent rounded-full animate-spin" />
    </div>
  );

  return (
    <div ref={containerRef} className="min-h-screen bg-[#FFF9FA] pt-32 pb-20 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl font-black text-[#111827] tracking-tight mb-10 stagger-item">Account Settings</h1>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="stagger-item md:col-span-2">
            <div className={`rounded-2xl border p-4 flex items-center justify-between ${user.mfaEnabled ? 'border-green-200 bg-green-50' : 'border-amber-200 bg-amber-50'}`}>
              <div className="flex items-center gap-3">
                {user.mfaEnabled
                  ? <ShieldCheck className="w-5 h-5 text-green-600 shrink-0" />
                  : <ShieldOff className="w-5 h-5 text-amber-600 shrink-0" />}
                <div>
                  <p className={`text-sm font-bold ${user.mfaEnabled ? 'text-green-800' : 'text-amber-800'}`}>
                    {user.mfaEnabled ? 'Two-Factor Authentication is ON' : 'Two-Factor Authentication is OFF'}
                  </p>
                  <p className={`text-xs mt-0.5 ${user.mfaEnabled ? 'text-green-600' : 'text-amber-600'}`}>
                    {user.mfaEnabled
                      ? 'Your account is protected with TOTP authentication.'
                      : 'Enable MFA to add an extra layer of security to your account.'}
                  </p>
                </div>
              </div>
              {!user.mfaEnabled && (
                <Link
                  href="/mfa/setup"
                  className="shrink-0 ml-4 px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#EC4899] to-[#F472B6] text-white text-xs font-bold shadow shadow-[#EC4899]/20 hover:-translate-y-0.5 transition flex items-center gap-1.5"
                >
                  <ShieldCheck className="w-3.5 h-3.5" />
                  Enable MFA
                </Link>
              )}
              {user.mfaEnabled && !showDisableMfa && (
                <button
                  onClick={() => { setShowDisableMfa(true); setMfaMessage(''); setMfaError(''); }}
                  className="shrink-0 ml-4 px-5 py-2.5 rounded-xl bg-red-100 text-red-700 text-xs font-bold hover:bg-red-200 transition flex items-center gap-1.5"
                >
                  <ShieldOff className="w-3.5 h-3.5" />
                  Disable
                </button>
              )}
            </div>

            {showDisableMfa && (
              <div className="mt-4 rounded-2xl border border-red-100 bg-white p-6">
                <h3 className="font-bold text-[#111827] mb-4 flex items-center gap-2">
                  <ShieldOff className="w-4 h-4 text-red-500" /> Disable Two-Factor Authentication
                </h3>
                {mfaError && (
                  <div className="mb-4 flex items-center gap-2 text-sm text-red-700 bg-red-50 border border-red-100 rounded-xl px-4 py-3">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    {mfaError}
                  </div>
                )}
                <form onSubmit={handleDisableMfa} className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">Current Password</label>
                    <input
                      type="password"
                      value={mfaDisable.password}
                      onChange={(e) => setMfaDisable({ ...mfaDisable, password: e.target.value })}
                      required
                      className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-red-200 focus:border-red-400 transition-all text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">Authenticator Code</label>
                    <input
                      type="text"
                      inputMode="numeric"
                      maxLength={6}
                      value={mfaDisable.totpCode}
                      onChange={(e) => setMfaDisable({ ...mfaDisable, totpCode: e.target.value.replace(/\D/g, '').slice(0, 6) })}
                      placeholder="000000"
                      required
                      className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-red-200 focus:border-red-400 transition-all text-sm font-mono tracking-widest"
                    />
                  </div>
                  <div className="flex gap-3 pt-1">
                    <button
                      type="submit"
                      disabled={processing}
                      className="px-6 py-2.5 rounded-xl bg-red-500 text-white text-sm font-bold hover:bg-red-600 transition disabled:opacity-60"
                    >
                      Confirm Disable
                    </button>
                    <button
                      type="button"
                      onClick={() => { setShowDisableMfa(false); setMfaDisable({ password: '', totpCode: '' }); setMfaError(''); }}
                      className="px-6 py-2.5 rounded-xl border border-gray-200 text-sm font-bold text-gray-500 hover:bg-gray-50 transition"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              </div>
            )}

            {mfaMessage && (
              <div className="mt-3 flex items-center gap-2 text-sm text-green-700 bg-green-50 border border-green-200 rounded-xl px-4 py-3">
                <CheckCircle className="w-4 h-4 shrink-0" />
                {mfaMessage}
              </div>
            )}
          </div>

          <div className="stagger-item shadow-[0_32px_90px_rgba(236,72,153,0.12)] rounded-[32px] bg-white/95 backdrop-blur-xl border border-white/60 p-8">
            <h2 className="font-black text-[#111827] text-xl mb-6 flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-[#FBCFE8]/50 flex items-center justify-center">
                <UserIcon className="w-5 h-5 text-[#EC4899]" />
              </div>
              Personal Info
            </h2>
            <div className="w-full h-px bg-gradient-to-r from-gray-200 via-gray-300 to-gray-200 mb-6" />

            <form onSubmit={handleUpdateProfile} className="space-y-5">
              <div>
                <label className="block text-sm font-bold text-[#111827] mb-2">Display Name</label>
                <input type="text" value={profile.displayName} onChange={(e) => setProfile({ ...profile, displayName: e.target.value })} className="w-full px-5 py-3.5 rounded-[20px] border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#FBCFE8] focus:border-[#EC4899] transition-all bg-white" />
              </div>
              <div>
                <label className="block text-sm font-bold text-[#111827] mb-2">Email Address</label>
                <input type="email" value={profile.email} onChange={(e) => setProfile({ ...profile, email: e.target.value })} className="w-full px-5 py-3.5 rounded-[20px] border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#FBCFE8] focus:border-[#EC4899] transition-all bg-white" />
              </div>
              <button type="submit" disabled={processing} className="w-full py-4 rounded-[24px] bg-gray-900 text-white font-bold transition hover:-translate-y-0.5 disabled:opacity-60 flex items-center justify-center gap-2">
                <CheckCircle className="w-5 h-5" /> Save Changes
              </button>
            </form>
          </div>

          <div className="stagger-item shadow-[0_32px_90px_rgba(236,72,153,0.12)] rounded-[32px] bg-white/95 backdrop-blur-xl border border-white/60 p-8">
            <h2 className="font-black text-[#111827] text-xl mb-6 flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-[#FBCFE8]/50 flex items-center justify-center">
                <Shield className="w-5 h-5 text-[#EC4899]" />
              </div>
              Security
            </h2>
            <div className="w-full h-px bg-gradient-to-r from-gray-200 via-gray-300 to-gray-200 mb-6" />

            <form onSubmit={handleUpdatePassword} className="space-y-5">
              <div>
                <label className="block text-sm font-bold text-[#111827] mb-2">Current Password</label>
                <input type="password" value={password.oldPassword} onChange={(e) => setPassword({ ...password, oldPassword: e.target.value })} className="w-full px-5 py-3.5 rounded-[20px] border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#FBCFE8] focus:border-[#EC4899] transition-all bg-white" />
              </div>
              <div>
                <label className="block text-sm font-bold text-[#111827] mb-2">New Password</label>
                <input type="password" value={password.newPassword} onChange={(e) => setPassword({ ...password, newPassword: e.target.value })} className="w-full px-5 py-3.5 rounded-[20px] border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#FBCFE8] focus:border-[#EC4899] transition-all bg-white" />
              </div>
              <button type="submit" disabled={processing} className="w-full py-4 rounded-[24px] bg-gradient-to-r from-[#EC4899] to-[#F472B6] text-white font-bold transition hover:-translate-y-0.5 disabled:opacity-60 flex items-center justify-center gap-2 shadow-lg shadow-[#EC4899]/20">
                <Shield className="w-5 h-5" /> Update Password
              </button>
            </form>
          </div>

          {/* Privacy & data — GDPR Art. 20 portability */}
          <div className="stagger-item shadow-[0_32px_90px_rgba(236,72,153,0.12)] rounded-[32px] bg-white/95 backdrop-blur-xl border border-white/60 p-8">
            <h2 className="font-black text-[#111827] text-xl mb-6 flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-[#FBCFE8]/50 flex items-center justify-center">
                <Download className="w-5 h-5 text-[#EC4899]" />
              </div>
              Privacy &amp; data
            </h2>
            <div className="w-full h-px bg-gradient-to-r from-gray-200 via-gray-300 to-gray-200 mb-6" />

            <p className="text-sm text-[#6B7280] mb-5 leading-relaxed">
              Under GDPR Art.&nbsp;20 you have the right to a portable copy of every
              record we hold about you — profile, orders, reviews, cart, wishlist,
              login history, and audit trail. The export is generated on demand as
              a signed-in download.
            </p>

            <button
              type="button"
              onClick={async () => {
                setProcessing(true);
                try {
                  await authApi.exportMyData();
                } catch (err: any) {
                  alert(err?.message || 'Could not download your data.');
                } finally {
                  setProcessing(false);
                }
              }}
              disabled={processing}
              className="w-full py-4 rounded-[24px] border-2 border-[#EC4899] text-[#EC4899] font-bold transition hover:bg-[#FDF2F8] hover:-translate-y-0.5 disabled:opacity-60 flex items-center justify-center gap-2"
            >
              <Download className="w-5 h-5" /> Download my data (JSON)
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
