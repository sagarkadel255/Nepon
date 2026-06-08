'use client';

import React, { useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Shield, Sparkles, Users, Store, ShoppingBag, TrendingUp, Heart, ArrowRight, CheckCircle } from 'lucide-react';
import { useGSAP } from '@gsap/react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

if (typeof window !== 'undefined') {
  gsap.registerPlugin(ScrollTrigger);
}

const stats = [
  { label: 'Active Sellers', value: '500+', icon: Store },
  { label: 'Happy Buyers', value: '10K+', icon: Users },
  { label: 'Products Listed', value: '25K+', icon: ShoppingBag },
  { label: 'Secure Orders', value: '50K+', icon: Shield },
];

const features = [
  {
    icon: Shield,
    title: 'Security First',
    desc: 'Every transaction is protected by enterprise-grade encryption, MFA, and real-time fraud monitoring.'
  },
  {
    icon: Sparkles,
    title: 'Curated Fashion',
    desc: 'We handpick independent sellers who meet our quality and authenticity standards.'
  },
  {
    icon: Heart,
    title: 'Trusted Community',
    desc: 'Verified purchase reviews and transparent seller profiles build genuine trust.'
  },
  {
    icon: TrendingUp,
    title: 'Seller Empowerment',
    desc: 'Independent brands get a professional storefront with analytics and order management.'
  },
];

const values = [
  { title: 'Transparency', desc: 'Every action is audited. No hidden algorithms, no dark patterns.' },
  { title: 'Inclusivity', desc: 'Fashion for every body, budget, and background.' },
  { title: 'Craftsmanship', desc: 'We celebrate quality over quantity — real makers, real products.' },
  { title: 'Privacy', desc: 'Your data is yours. We collect only what\'s necessary and protect it fiercely.' },
];

export default function AboutPage() {
  const heroRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  useGSAP(() => {
    gsap.fromTo('.about-stagger',
      { opacity: 0, y: 40 },
      {
        opacity: 1,
        y: 0,
        duration: 1,
        stagger: 0.2,
        ease: 'power3.out',
        scrollTrigger: { trigger: contentRef.current, start: 'top 80%' }
      });
  }, { scope: contentRef });

  return (
    <div className="animate-fade-in">
      {/* Hero */}
      <section ref={heroRef} className="relative w-full min-h-[70vh] flex items-center overflow-hidden">
        <div className="absolute inset-0 z-0">
          <Image
            src="/login.png"
            alt="About NEPON"
            fill
            className="object-cover object-center"
            priority
          />
        </div>
        <div className="absolute inset-0 z-[1] bg-gradient-to-r from-black/60 via-black/30 to-transparent" />
        <div className="absolute inset-0 z-[1] bg-gradient-to-t from-black/40 via-transparent to-transparent" />

        <div className="relative z-10 max-w-[100rem] mx-auto px-8 sm:px-12 lg:px-16 py-24 w-full">
          <div className="max-w-2xl">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 bg-primary flex items-center justify-center">
                <span className="text-white font-black text-xl">N</span>
              </div>
              <span className="text-white/60 uppercase tracking-[0.3em] text-sm font-medium">About Us</span>
            </div>
            <h1 className="text-5xl sm:text-6xl lg:text-7xl font-black text-white leading-tight mb-6" style={{ textShadow: '0 4px 40px rgba(0,0,0,0.5)' }}>
              Where Fashion Meets
              <span className="text-primary block">Trust & Security</span>
            </h1>
            <p className="text-lg sm:text-xl text-white/80 max-w-xl leading-relaxed font-light">
              NEPON is a secure multi-vendor marketplace built for independent fashion sellers
              and conscious buyers who value authenticity, quality, and peace of mind.
            </p>
            <div className="flex items-center gap-4 mt-8">
              <Link href="/products" className="px-8 py-4 bg-primary text-white font-semibold tracking-wide hover:shadow-[0_0_30px_rgba(233,69,96,0.4)] transition-all flex items-center gap-2">
                Explore Collection <ArrowRight className="w-4 h-4" />
              </Link>
              <Link href="/register" className="px-8 py-4 border border-white/30 text-white font-semibold tracking-wide hover:bg-white/10 transition-all">
                Join as Seller
              </Link>
            </div>
          </div>
        </div>

        <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-[#f09ea0] to-transparent z-[2]" />
      </section>

      {/* Stats */}
      <section className="relative -mt-16 z-10 max-w-[100rem] mx-auto px-8 sm:px-12 lg:px-16">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {stats.map((stat, i) => (
            <div key={i} className="panel-rich p-8 border border-border/80 card-zero-static text-center group hover:-translate-y-1 transition-all duration-300">
              <div className="w-14 h-14 bg-primary/10 flex items-center justify-center mx-auto mb-4">
                <stat.icon className="w-7 h-7 text-primary" />
              </div>
              <p className="text-3xl font-black text-secondary mb-1">{stat.value}</p>
              <p className="text-sm text-gray-500 uppercase tracking-wider">{stat.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Our story */}
      <section ref={contentRef} className="max-w-[100rem] mx-auto px-8 sm:px-12 lg:px-16 py-24">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          <div className="about-stagger">
            <span className="text-primary uppercase tracking-[0.3em] text-sm font-medium">Our Story</span>
            <h2 className="text-4xl sm:text-5xl font-black text-secondary mt-4 mb-6 leading-tight">
              Built for the <span className="text-primary">Independent</span> Fashion Community
            </h2>
            <div className="divider-deco mb-6 w-24" />
            <p className="text-gray-600 text-lg leading-relaxed mb-4">
              NEPON was born from a simple observation: independent fashion sellers were being
              forced to choose between expensive, complicated e-commerce platforms and insecure
              social-media storefronts. Neither option served them — or their buyers — well.
            </p>
            <p className="text-gray-600 text-lg leading-relaxed mb-4">
              We built NEPON to be the third way: a professionally engineered marketplace that gives
              small sellers enterprise-grade security without enterprise complexity, and gives buyers
              the confidence to shop from brands they&apos;re discovering for the first time.
            </p>
            <p className="text-gray-600 text-lg leading-relaxed">
              Every feature — from our verified-purchase review system to our field-level encryption —
              exists because we believe trust is the foundation of fashion commerce.
            </p>
            <div className="flex items-center gap-4 mt-8">
              <div className="w-16 h-16 bg-primary flex items-center justify-center">
                <span className="text-white font-black text-2xl">N</span>
              </div>
              <div>
                <p className="font-bold text-secondary text-lg">NEPON</p>
                <p className="text-sm text-gray-500">Secure Fashion Marketplace</p>
              </div>
            </div>
          </div>
          <div className="about-stagger relative">
            <div className="relative h-[500px] bg-gradient-to-br from-primary/20 via-accent/10 to-transparent border border-border/60 panel-rich overflow-hidden">
              <div className="absolute top-6 left-6 w-20 h-20 border-t-2 border-l-2 border-primary/30" />
              <div className="absolute bottom-6 right-6 w-20 h-20 border-b-2 border-r-2 border-primary/30" />
              <div className="p-12 flex flex-col justify-center h-full">
                <div className="space-y-6">
                  {[
                    { q: 'Security', a: 'OWASP Top 10 hardened, field-level encryption, MFA, full audit logging' },
                    { q: 'Quality', a: 'Curated sellers, verified reviews, moderated listings' },
                    { q: 'Community', a: 'Direct seller-buyer relationships, no middleman' },
                  ].map((item, i) => (
                    <div key={i} className="flex gap-4">
                      <CheckCircle className="w-6 h-6 text-primary flex-shrink-0 mt-0.5" />
                      <div>
                        <h4 className="font-bold text-secondary">{item.q}</h4>
                        <p className="text-gray-500 text-sm">{item.a}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="bg-match border-y border-border/20 py-24">
        <div className="max-w-[100rem] mx-auto px-8 sm:px-12 lg:px-16">
          <div className="text-center mb-16">
            <span className="text-primary uppercase tracking-[0.3em] text-sm font-medium">Why NEPON</span>
            <h2 className="text-4xl sm:text-5xl font-black text-secondary mt-4 mb-4">What Sets Us Apart</h2>
            <div className="divider-deco mx-auto max-w-[200px]" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((feature, i) => (
              <div key={i} className="panel-rich border border-border/80 p-8 card-zero-static group hover:-translate-y-2 transition-all duration-300">
                <div className="w-16 h-16 bg-primary/10 flex items-center justify-center mb-6 group-hover:bg-primary/20 transition-colors">
                  <feature.icon className="w-8 h-8 text-primary" />
                </div>
                <h3 className="text-xl font-bold text-secondary mb-3">{feature.title}</h3>
                <p className="text-gray-500 leading-relaxed">{feature.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Values */}
      <section className="max-w-[100rem] mx-auto px-8 sm:px-12 lg:px-16 py-24">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16">
          <div className="relative">
            <div className="relative h-full min-h-[400px] bg-gradient-to-tr from-secondary via-accent to-secondary border border-border/60 panel-rich overflow-hidden">
              <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-white/20 to-transparent" />
              <div className="p-12 flex flex-col justify-center h-full">
                <span className="text-white/50 uppercase tracking-[0.3em] text-sm font-medium">Our Core Values</span>
                <h2 className="text-4xl font-black text-white mt-4 mb-6 leading-tight">
                  The Principles That <span className="text-primary">Guide Us</span>
                </h2>
                <p className="text-white/70 text-lg leading-relaxed">
                  Every decision at NEPON is filtered through these four commitments.
                  They&apos;re not just words on a page — they&apos;re engineering requirements.
                </p>
              </div>
              <div className="absolute bottom-6 left-6 w-16 h-16 border-b-2 border-l-2 border-white/10" />
              <div className="absolute top-6 right-6 w-16 h-16 border-t-2 border-r-2 border-white/10" />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {values.map((value, i) => (
              <div key={i} className="panel-rich border border-border/80 p-6 card-zero-static">
                <div className="w-10 h-10 bg-primary/10 flex items-center justify-center mb-4">
                  <span className="text-primary font-bold text-lg">{String(i + 1).padStart(2, '0')}</span>
                </div>
                <h3 className="text-lg font-bold text-secondary mb-2">{value.title}</h3>
                <p className="text-gray-500 text-sm leading-relaxed">{value.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="relative py-24 overflow-hidden">
        <div className="absolute inset-0 z-0">
          <Image
            src="/login.png"
            alt="Join NEPON"
            fill
            className="object-cover object-center"
          />
        </div>
        <div className="absolute inset-0 z-[1] bg-gradient-to-r from-black/70 via-black/50 to-black/70" />
        <div className="absolute inset-0 z-[1] bg-gradient-to-t from-black/30 via-transparent to-black/30" />

        <div className="relative z-10 max-w-[100rem] mx-auto px-8 sm:px-12 lg:px-16 text-center">
          <div className="max-w-3xl mx-auto">
            <h2 className="text-4xl sm:text-5xl font-black text-white mb-6 leading-tight" style={{ textShadow: '0 4px 30px rgba(0,0,0,0.5)' }}>
              Ready to Join the <span className="text-primary">Revolution</span>?
            </h2>
            <p className="text-lg text-white/70 mb-10 max-w-xl mx-auto leading-relaxed">
              Whether you&apos;re a buyer looking for authentic fashion or a seller ready
              to grow your brand, NEPON is your platform.
            </p>
            <div className="flex flex-wrap justify-center gap-4">
              <Link href="/register?role=buyer" className="px-10 py-4 bg-primary text-white font-semibold tracking-wide hover:shadow-[0_0_30px_rgba(233,69,96,0.4)] transition-all flex items-center gap-2">
                Start Shopping <ShoppingBag className="w-4 h-4" />
              </Link>
              <Link href="/register?role=seller" className="px-10 py-4 bg-white/10 backdrop-blur-md border border-white/20 text-white font-semibold tracking-wide hover:bg-white/20 transition-all flex items-center gap-2">
                Start Selling <Store className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Footer note */}
      <section className="max-w-[100rem] mx-auto px-8 sm:px-12 lg:px-16 py-12">
        <div className="divider-deco mb-8" />
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary flex items-center justify-center">
              <span className="text-white font-black text-lg">N</span>
            </div>
            <span className="font-bold text-secondary text-lg">NEPON</span>
          </div>
          <p className="text-sm text-gray-400">
            &copy; 2024 NEPON. Built with security-first engineering.
          </p>
        </div>
      </section>
    </div>
  );
}
