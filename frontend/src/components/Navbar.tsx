'use client';

import React, { useRef, useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { ShoppingBag, User, Bell, LogOut, Menu, X } from 'lucide-react';
import { useGSAP } from '@gsap/react';
import gsap from 'gsap';

const NAV_LINKS = [
  { href: '/', label: 'Home' },
  { href: '/products?category=collection', label: 'Collection' },
  { href: '/products', label: 'Shop' },
  { href: '/about', label: 'About us' },
];

export default function Navbar() {
  const { user, logout } = useAuth();
  const pathname = usePathname();
  const isHome = pathname === '/';
  // Full-screen standalone auth flows render their own branding — no global chrome.
  const isAuthPage =
    pathname === '/login' ||
    pathname === '/register' ||
    pathname === '/forgot-password' ||
    pathname.startsWith('/reset-password');

  const navRef = useRef<HTMLElement>(null);
  const linksRef = useRef<HTMLDivElement>(null);
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => { setMobileOpen(false); }, [pathname]);

  // Prevent body scroll when mobile menu is open
  useEffect(() => {
    document.body.style.overflow = mobileOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [mobileOpen]);

  useGSAP(() => {
    if (!navRef.current || !linksRef.current) return;
    gsap.fromTo(linksRef.current,
      { x: -300, opacity: 0 },
      { x: 0, opacity: 1, duration: 1.5, ease: 'power3.out' },
    );
    gsap.fromTo('.nav-fade-element',
      { opacity: 0, y: -15 },
      { opacity: 1, y: 0, duration: 1.2, stagger: 0.2, ease: 'power2.out' },
    );
  }, { scope: navRef, dependencies: [pathname] });

  if (isHome || isAuthPage) return null;

  return (
    <nav
      ref={navRef}
      className={`sticky top-0 w-full z-50 flex items-center justify-between px-[4%] relative ${
        scrolled ? 'nav-scrolled' : ''
      }`}
    >
      <Link href="/" className="nav-fade-element flex items-center gap-3 relative z-10">
        <div className="w-[38px] h-[38px] flex items-center justify-center bg-gradient-to-br from-gray-100 via-gray-300 to-gray-500 shadow-sm border border-gray-200/60 rounded-md">
          <span className="text-gray-800 font-black text-lg">N</span>
        </div>
        <span className="text-xl font-black tracking-[0.2em] text-[#1a1a2e]">NEPON</span>
      </Link>

      <div ref={linksRef} className="hidden md:flex absolute left-1/2 -translate-x-1/2 items-center gap-10 whitespace-nowrap">
        {NAV_LINKS.map((link) => {
          const isActive = pathname === link.href || (link.href !== '/' && pathname.startsWith(link.href.split('?')[0]));
          return (
            <Link
              key={link.label}
              href={link.href}
              className={`text-[0.95rem] font-medium tracking-[0.3px] transition-colors duration-200 relative group ${
                isActive ? 'text-[#e94560]' : 'text-[#1a1a2e] hover:text-[#e94560]'
              }`}
            >
              {link.label}
              <span className={`absolute -bottom-[4px] left-0 h-[2px] bg-[#e94560] transition-all duration-300 ${
                isActive ? 'w-full' : 'w-0 group-hover:w-full'
              }`} />
            </Link>
          );
        })}
      </div>

      <div className="nav-fade-element flex items-center gap-3 relative z-10">
        {user ? (
          <>
            <Link
              href="/cart"
              aria-label="Shopping cart"
              className="hidden sm:flex items-center justify-center w-9 h-9 rounded-xl text-[#1a1a2e] hover:text-[#e94560] hover:bg-[#e94560]/8 transition-all duration-200"
            >
              <ShoppingBag className="w-[18px] h-[18px]" />
            </Link>
            <Link
              href="/notifications"
              aria-label="Notifications"
              className="hidden sm:flex items-center justify-center w-9 h-9 rounded-xl text-[#1a1a2e] hover:text-[#e94560] hover:bg-[#e94560]/8 transition-all duration-200"
            >
              <Bell className="w-[18px] h-[18px]" />
            </Link>

            {user.role === 'seller' && (
              <Link href="/seller" className="hidden sm:block text-xs font-bold text-[#1a1a2e] hover:text-[#e94560] transition-colors tracking-wide uppercase px-2 py-1 rounded-lg hover:bg-[#e94560]/8">
                Hub
              </Link>
            )}
            {user.role === 'admin' && (
              <Link href="/admin" className="hidden sm:block text-xs font-bold text-[#1a1a2e] hover:text-[#e94560] transition-colors tracking-wide uppercase px-2 py-1 rounded-lg hover:bg-[#e94560]/8">
                Admin
              </Link>
            )}

            <div className="relative group hidden sm:block">
              <button
                className="flex items-center gap-2 text-sm font-medium text-[#1a1a2e] hover:text-[#e94560] transition-colors duration-200 px-2 py-1 rounded-xl hover:bg-[#e94560]/8"
                aria-haspopup="true"
              >
                <div className="w-7 h-7 rounded-full bg-[#1a1a2e]/10 flex items-center justify-center">
                  <User className="w-3.5 h-3.5 text-[#1a1a2e]" />
                </div>
                <span className="hidden lg:inline text-xs font-semibold">{user.displayName}</span>
              </button>
              <div className="absolute right-0 mt-2 w-48 bg-white/98 backdrop-blur-2xl shadow-[0_8px_40px_rgba(0,0,0,0.12),0_1px_0_rgba(255,255,255,0.6)] border border-gray-100/80 rounded-[18px] py-1.5 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 translate-y-1 group-hover:translate-y-0">
                <Link href="/profile" className="block px-3 py-2.5 mx-1 text-sm text-gray-600 hover:bg-gray-50 hover:text-gray-900 transition-colors rounded-[12px]">
                  Profile
                </Link>
                <Link href="/orders" className="block px-3 py-2.5 mx-1 text-sm text-gray-600 hover:bg-gray-50 hover:text-gray-900 transition-colors rounded-[12px]">
                  My Orders
                </Link>
                <Link href="/reviews" className="block px-3 py-2.5 mx-1 text-sm text-gray-600 hover:bg-gray-50 hover:text-gray-900 transition-colors rounded-[12px]">
                  My Reviews
                </Link>
                <div className="h-px bg-gray-100 my-1 mx-3" />
                <button
                  onClick={logout}
                  className="w-full text-left px-3 py-2.5 mx-1 text-sm text-red-500 hover:text-red-600 hover:bg-red-50/70 transition-colors rounded-[12px] flex items-center gap-2"
                  style={{ width: 'calc(100% - 8px)' }}
                >
                  <LogOut className="w-3.5 h-3.5" /> Sign Out
                </button>
              </div>
            </div>
          </>
        ) : (
          !isAuthPage && (
            <Link
              href="/login"
              className="hidden sm:block text-[0.9rem] font-semibold text-[#1a1a2e] border-2 border-[#1a1a2e] rounded-lg px-6 py-2 transition-all duration-300 hover:bg-[#1a1a2e] hover:text-white tracking-[0.3px]"
            >
              Sign In
            </Link>
          )
        )}

        <button
          className="sm:hidden flex items-center justify-center w-9 h-9 rounded-xl bg-black/5 hover:bg-black/10 transition-colors ml-1"
          onClick={() => setMobileOpen(o => !o)}
          aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
          aria-expanded={mobileOpen}
        >
          {mobileOpen
            ? <X className="w-5 h-5 text-[#1a1a2e]" />
            : <Menu className="w-5 h-5 text-[#1a1a2e]" />
          }
        </button>
      </div>

      <div className={`nav-mobile-menu ${mobileOpen ? 'open' : ''}`}>
        <nav aria-label="Mobile navigation" className="px-4 pt-2 pb-5 space-y-0.5">
          {NAV_LINKS.map((link) => {
            const isActive = pathname === link.href || (link.href !== '/' && pathname.startsWith(link.href.split('?')[0]));
            return (
              <Link
                key={link.label}
                href={link.href}
                className={`flex items-center px-4 py-3 rounded-xl text-sm font-semibold transition-colors ${
                  isActive
                    ? 'bg-[#EC4899]/10 text-[#EC4899]'
                    : 'text-[#1a1a2e] hover:bg-black/5'
                }`}
              >
                {link.label}
              </Link>
            );
          })}

          <div className="h-px bg-black/6 my-2 mx-1" />

          {user ? (
            <>
              <Link href="/profile" className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold text-[#1a1a2e] hover:bg-black/5 transition-colors">
                <User className="w-4 h-4 text-gray-400" />
                {user.displayName}
              </Link>
              <Link href="/cart" className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold text-[#1a1a2e] hover:bg-black/5 transition-colors">
                <ShoppingBag className="w-4 h-4 text-gray-400" /> Cart
              </Link>
              <Link href="/notifications" className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold text-[#1a1a2e] hover:bg-black/5 transition-colors">
                <Bell className="w-4 h-4 text-gray-400" /> Notifications
              </Link>
              {user.role === 'seller' && (
                <Link href="/seller" className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold text-[#1a1a2e] hover:bg-black/5 transition-colors">
                  Seller Hub
                </Link>
              )}
              {user.role === 'admin' && (
                <Link href="/admin" className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold text-[#1a1a2e] hover:bg-black/5 transition-colors">
                  Admin Panel
                </Link>
              )}
              <div className="h-px bg-black/6 my-2 mx-1" />
              <button
                onClick={() => { logout(); setMobileOpen(false); }}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold text-red-500 hover:bg-red-50/70 transition-colors"
              >
                <LogOut className="w-4 h-4" /> Sign Out
              </button>
            </>
          ) : (
            !isAuthPage && (
              <Link href="/login" className="flex items-center justify-center mx-1 mt-2 py-3 rounded-xl text-sm font-bold text-center bg-[#1a1a2e] text-white hover:bg-[#1a1a2e]/90 transition-colors">
                Sign In
              </Link>
            )
          )}
        </nav>
      </div>
    </nav>
  );
}
