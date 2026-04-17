'use client';

import React, { useEffect, useState } from 'react';
import { RefreshCw } from 'lucide-react';
import { auth as authApi } from '@/lib/api';

interface CaptchaValue {
  id: string;
  answer: string;
}

interface CaptchaProps {
  value: CaptchaValue;
  onChange: (value: CaptchaValue) => void;
}

/**
 * Single-use in-app CAPTCHA. Fetches a fresh challenge (opaque id + inline SVG)
 * from GET /api/auth/captcha on mount; the form submits `captchaId` +
 * `captchaAnswer`, which the backend verifies and deletes atomically, so a
 * failed submit must request a new one.
 */
export default function Captcha({ value, onChange }: CaptchaProps) {
  const [svg, setSvg] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadChallenge = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await authApi.getCaptcha();
      const data = res?.data;
      if (!data?.id || !data?.svg) throw new Error('Malformed CAPTCHA response');
      setSvg(data.svg);
      onChange({ id: data.id, answer: '' });
    } catch (err: any) {
      setError(err?.message || 'Could not load CAPTCHA');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadChallenge();
    // Intentionally load-once on mount; refresh is user-triggered.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="w-full space-y-2">
      <label className="text-[11px] font-bold uppercase tracking-[0.12em] text-gray-500">
        Security check
      </label>
      <div className="flex items-stretch gap-3">
        <div className="relative flex-shrink-0 rounded-2xl border border-gray-200 bg-[#FFF9FA] overflow-hidden flex items-center justify-center" style={{ width: 180, height: 60 }}>
          {loading ? (
            <div className="w-5 h-5 border-2 border-[#EC4899] border-t-transparent rounded-full animate-spin" />
          ) : error ? (
            <span className="text-xs text-red-500 px-2 text-center">{error}</span>
          ) : (
            // First-party SVG from our own API — safe to render inline.
            <div dangerouslySetInnerHTML={{ __html: svg }} />
          )}
        </div>

        <button
          type="button"
          onClick={loadChallenge}
          disabled={loading}
          title="Get a new challenge"
          aria-label="Refresh CAPTCHA"
          className="flex-shrink-0 w-11 h-[60px] rounded-2xl border border-gray-200 bg-white text-gray-500 hover:text-[#EC4899] hover:border-[#FBCFE8] transition flex items-center justify-center disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>

        <input
          type="text"
          inputMode="text"
          autoComplete="off"
          spellCheck={false}
          maxLength={12}
          value={value.answer}
          onChange={(e) =>
            onChange({ id: value.id, answer: e.target.value.toUpperCase().replace(/\s/g, '') })
          }
          placeholder="Type the code"
          className="flex-1 min-w-0 rounded-2xl border border-gray-200 bg-white px-4 text-sm font-bold tracking-[0.25em] text-[#111827] outline-none transition focus:border-[#EC4899] focus:ring-2 focus:ring-[#FBCFE8] placeholder:text-gray-300 placeholder:font-normal placeholder:tracking-normal"
          style={{ height: 60 }}
        />
      </div>
    </div>
  );
}
