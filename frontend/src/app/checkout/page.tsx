'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { checkout as checkoutApi } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { Shield, CreditCard, MapPin, Lock } from 'lucide-react';
import { useGSAP } from '@gsap/react';
import gsap from 'gsap';

export default function CheckoutPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [summary, setSummary] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [address, setAddress] = useState({ fullName: '', phone: '', line1: '', city: '', district: '' });
  const [paymentMethod, setPaymentMethod] = useState('stripe');
  const containerRef = useRef<HTMLDivElement>(null);

  useGSAP(() => {
    if (!loading) {
      gsap.fromTo('.stagger-item',
        { opacity: 0, y: 30 },
        { opacity: 1, y: 0, duration: 0.8, stagger: 0.1, ease: 'power3.out' },
      );
    }
  }, { scope: containerRef, dependencies: [loading] });

  useEffect(() => {
    if (!user) { router.push('/login'); return; }
    checkoutApi.getSummary()
      .then(setSummary)
      .catch(() => router.push('/cart'))
      .finally(() => setLoading(false));
  }, [user, router]);

  const handleCheckout = async (e: React.FormEvent) => {
    e.preventDefault();
    setProcessing(true);
    try {
      const result = await checkoutApi.createSession({ shippingAddress: address, paymentMethod });
      alert(`Order ${result.orderNumber} created!`);
      router.push('/orders');
    } catch (err: any) {
      alert(err.message || 'Checkout failed');
    } finally {
      setProcessing(false);
    }
  };

  if (loading) return (
    <div className="min-h-screen bg-[#FFF9FA] pt-32 pb-20 flex justify-center">
      <div className="w-12 h-12 border-4 border-[#EC4899] border-t-transparent rounded-full animate-spin" />
    </div>
  );

  return (
    <div ref={containerRef} className="min-h-screen bg-[#FFF9FA] pt-32 pb-20 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-4xl font-black text-[#111827] tracking-tight mb-10 stagger-item">Secure Checkout</h1>

        <form onSubmit={handleCheckout} className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-8">
            <div className="stagger-item shadow-[0_32px_90px_rgba(236,72,153,0.12)] rounded-[32px] bg-white/95 backdrop-blur-xl border border-white/60 p-8">
              <h2 className="font-black text-[#111827] mb-6 flex items-center gap-3 text-xl">
                <div className="w-10 h-10 rounded-full bg-[#FBCFE8]/50 flex items-center justify-center">
                  <MapPin className="w-5 h-5 text-[#EC4899]" />
                </div>
                Shipping Address
              </h2>
              <div className="w-full h-px bg-gradient-to-r from-gray-200 via-gray-300 to-gray-200 mb-6" />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <input type="text" placeholder="Full Name" required value={address.fullName} onChange={(e) => setAddress(a => ({ ...a, fullName: e.target.value }))} className="px-5 py-3.5 rounded-[20px] border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#FBCFE8] focus:border-[#EC4899] transition-all bg-white" />
                <input type="tel" placeholder="Phone" required value={address.phone} onChange={(e) => setAddress(a => ({ ...a, phone: e.target.value }))} className="px-5 py-3.5 rounded-[20px] border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#FBCFE8] focus:border-[#EC4899] transition-all bg-white" />
                <input type="text" placeholder="Address Line" required value={address.line1} onChange={(e) => setAddress(a => ({ ...a, line1: e.target.value }))} className="md:col-span-2 px-5 py-3.5 rounded-[20px] border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#FBCFE8] focus:border-[#EC4899] transition-all bg-white" />
                <input type="text" placeholder="City" required value={address.city} onChange={(e) => setAddress(a => ({ ...a, city: e.target.value }))} className="px-5 py-3.5 rounded-[20px] border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#FBCFE8] focus:border-[#EC4899] transition-all bg-white" />
                <input type="text" placeholder="District" required value={address.district} onChange={(e) => setAddress(a => ({ ...a, district: e.target.value }))} className="px-5 py-3.5 rounded-[20px] border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#FBCFE8] focus:border-[#EC4899] transition-all bg-white" />
              </div>
            </div>

            <div className="stagger-item shadow-[0_32px_90px_rgba(236,72,153,0.12)] rounded-[32px] bg-white/95 backdrop-blur-xl border border-white/60 p-8">
              <h2 className="font-black text-[#111827] mb-6 flex items-center gap-3 text-xl">
                <div className="w-10 h-10 rounded-full bg-[#FBCFE8]/50 flex items-center justify-center">
                  <CreditCard className="w-5 h-5 text-[#EC4899]" />
                </div>
                Payment Method
              </h2>
              <div className="w-full h-px bg-gradient-to-r from-gray-200 via-gray-300 to-gray-200 mb-6" />

              <div className="space-y-4">
                {[{ id: 'stripe', label: 'Credit/Debit Card (Stripe)', icon: '💳' }, { id: 'esewa', label: 'eSewa', icon: '📱' }, { id: 'khalti', label: 'Khalti', icon: '📱' }].map(m => (
                  <label key={m.id} className={`flex items-center gap-4 p-5 rounded-[20px] border-2 cursor-pointer transition-all duration-300 ${paymentMethod === m.id ? 'border-[#EC4899] bg-[#FBCFE8]/10' : 'border-gray-100 hover:border-[#FBCFE8] bg-white'}`}>
                    <input type="radio" name="payment" value={m.id} checked={paymentMethod === m.id} onChange={() => setPaymentMethod(m.id)} className="w-5 h-5 text-[#EC4899] border-gray-300 focus:ring-[#EC4899]" />
                    <span className="text-2xl">{m.icon}</span>
                    <span className="font-bold text-[#111827]">{m.label}</span>
                  </label>
                ))}
              </div>
              <div className="mt-6 flex items-center gap-2 text-sm text-[#6B7280] p-4 bg-emerald-50 rounded-[16px] border border-emerald-100">
                <Lock className="w-5 h-5 text-emerald-500" />
                <span className="font-medium text-emerald-700">Your payment info is 256-bit encrypted and never stored on our servers.</span>
              </div>
            </div>
          </div>

          <div className="stagger-item shadow-[0_32px_90px_rgba(236,72,153,0.12)] rounded-[32px] bg-white/95 backdrop-blur-xl border border-white/60 p-8 h-fit sticky top-32">
            <h3 className="font-black text-[#111827] text-xl mb-6">Order Summary</h3>
            <div className="w-full h-px bg-gradient-to-r from-gray-200 via-gray-300 to-gray-200 mb-6" />

            <div className="space-y-4 text-sm font-medium max-h-[400px] overflow-auto pr-2">
              {summary?.items?.map((item: any, i: number) => (
                <div key={i} className="flex justify-between items-center bg-gray-50 p-3 rounded-xl border border-gray-100">
                  <span className="text-[#6B7280] flex-1 truncate mr-4">{item.title} <span className="text-[#111827] font-bold ml-1">x{item.quantity}</span></span>
                  <span className="text-[#111827] font-bold whitespace-nowrap">Rs. {(item.unitPrice * item.quantity).toLocaleString()}</span>
                </div>
              ))}
            </div>

            <div className="w-full h-px bg-gray-200 my-6" />

            <div className="flex justify-between font-black text-2xl items-end">
              <span className="text-[#111827]">Total</span>
              <span className="text-[#EC4899]">Rs. {summary?.totalAmount?.toLocaleString() || '0'}</span>
            </div>

            <button type="submit" disabled={processing} className="w-full mt-8 py-4 rounded-[24px] bg-gradient-to-r from-[#EC4899] to-[#F472B6] text-white font-bold transition hover:-translate-y-0.5 disabled:opacity-60 flex items-center justify-center gap-2 shadow-lg shadow-[#EC4899]/20">
              <Shield className="w-5 h-5" /> {processing ? 'Processing...' : 'Place Secure Order'}
            </button>
            <p className="text-xs text-[#6B7280] text-center mt-5 font-medium">By placing this order, you agree to our Terms of Service.</p>
          </div>
        </form>
      </div>
    </div>
  );
}
