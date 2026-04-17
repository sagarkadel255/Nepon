'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const TwitterIcon = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
  </svg>
);

const InstagramIcon = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
    <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z" />
  </svg>
);

const GitHubIcon = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
    <path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12" />
  </svg>
);

export default function Footer() {
  const pathname = usePathname();
  // Standalone auth pages carry their own layout — hide the global footer there.
  const isAuthPage =
    pathname === '/login' ||
    pathname === '/register' ||
    pathname === '/forgot-password' ||
    pathname.startsWith('/reset-password');

  if (isAuthPage) return null;

  return (
    <footer className="bg-[#16162a] text-white mt-auto relative overflow-hidden">
      <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-[#EC4899]/50 to-transparent" />

      <div className="absolute inset-0 opacity-[0.03] pointer-events-none"
        style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, white 1px, transparent 0)', backgroundSize: '32px 32px' }} />

      <div className="relative max-w-[100rem] mx-auto px-8 sm:px-12 lg:px-16 pt-16 pb-10">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-12">

          <div className="space-y-5">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-gradient-to-br from-[#EC4899] to-[#c73e54] flex items-center justify-center rounded-lg shadow-lg shadow-[#EC4899]/20">
                <span className="text-white font-black text-base">N</span>
              </div>
              <span className="text-lg font-bold tracking-wider text-white">NEPON</span>
            </div>
            <p className="text-gray-400 text-sm leading-relaxed max-w-xs">
              A secure fashion marketplace connecting independent sellers with style-conscious buyers.
            </p>
            <div className="flex gap-2 pt-1">
              {[
                { label: 'X / Twitter', icon: <TwitterIcon /> },
                { label: 'Instagram', icon: <InstagramIcon /> },
                { label: 'GitHub', icon: <GitHubIcon /> },
              ].map(({ label, icon }) => (
                <button
                  key={label}
                  aria-label={label}
                  className="w-9 h-9 rounded-xl border border-white/10 flex items-center justify-center text-gray-400 hover:text-white hover:border-[#EC4899]/40 hover:bg-[#EC4899]/10 transition-all duration-200"
                >
                  {icon}
                </button>
              ))}
            </div>
          </div>

          <div>
            <h3 className="text-[0.7rem] font-bold mb-5 uppercase tracking-[0.2em] text-gray-500">Shop</h3>
            <div className="space-y-3">
              {[
                { href: '/products', label: 'All Products' },
                { href: '/products?category=clothing', label: 'Clothing' },
                { href: '/products?category=accessories', label: 'Accessories' },
                { href: '/products?category=collection', label: 'Collection' },
              ].map(({ href, label }) => (
                <Link key={label} href={href} className="footer-link block text-sm text-gray-400 hover:text-white transition-colors duration-200 w-fit">
                  {label}
                </Link>
              ))}
            </div>
          </div>

          <div>
            <h3 className="text-[0.7rem] font-bold mb-5 uppercase tracking-[0.2em] text-gray-500">Account</h3>
            <div className="space-y-3">
              {[
                { href: '/login', label: 'Sign In' },
                { href: '/register', label: 'Register' },
                { href: '/orders', label: 'My Orders' },
                { href: '/profile', label: 'Profile' },
              ].map(({ href, label }) => (
                <Link key={label} href={href} className="footer-link block text-sm text-gray-400 hover:text-white transition-colors duration-200 w-fit">
                  {label}
                </Link>
              ))}
            </div>
          </div>

          <div>
            <h3 className="text-[0.7rem] font-bold mb-5 uppercase tracking-[0.2em] text-gray-500">Support</h3>
            <div className="space-y-3">
              <a href="mailto:support@nepon.com" className="footer-link block text-sm text-gray-400 hover:text-white transition-colors duration-200 w-fit">
                support@nepon.com
              </a>
              <span className="block text-sm text-gray-500 cursor-default hover:text-gray-400 transition-colors">Security &amp; Privacy</span>
              <span className="block text-sm text-gray-500 cursor-default hover:text-gray-400 transition-colors">Terms of Service</span>
            </div>

            <div className="mt-6 inline-flex items-center gap-2 bg-white/5 border border-white/8 rounded-xl px-3 py-2">
              <svg className="w-3.5 h-3.5 text-[#10b981]" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M2.166 4.999A11.954 11.954 0 0010 1.944 11.954 11.954 0 0017.834 5c.11.65.166 1.32.166 2.001 0 5.225-3.34 9.67-8 11.317C5.34 16.67 2 12.225 2 7c0-.682.057-1.35.166-2.001zm11.541 3.708a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              <span className="text-[0.65rem] font-bold text-gray-400 tracking-wider uppercase">Secured</span>
            </div>
          </div>
        </div>

        <div className="h-px bg-gradient-to-r from-transparent via-white/6 to-transparent mb-8" />
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-xs text-gray-600">&copy; {new Date().getFullYear()} NEPON. Built with security-first engineering.</p>
          <div className="flex items-center gap-6">
            {['Privacy', 'Terms', 'Cookies'].map(label => (
              <span key={label} className="text-xs text-gray-600 hover:text-gray-400 transition-colors cursor-pointer">
                {label}
              </span>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}
