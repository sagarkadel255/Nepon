'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { cart as cartApi } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { Trash2, Plus, Minus, ShoppingBag, ArrowRight } from 'lucide-react';
import { useGSAP } from '@gsap/react';
import gsap from 'gsap';

export default function CartPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [cartData, setCartData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const containerRef = useRef<HTMLDivElement>(null);

  useGSAP(() => {
    if (!containerRef.current || loading) return;
    gsap.fromTo('.stagger-item',
      { opacity: 0, y: 30 },
      { opacity: 1, y: 0, duration: 0.8, stagger: 0.1, ease: 'power3.out' },
    );
  }, { scope: containerRef, dependencies: [loading] });

  useEffect(() => {
    cartApi.get()
      .then(setCartData)
      .catch(() => setCartData({ items: [] }))
      .finally(() => setLoading(false));
  }, []);

  const updateQuantity = async (itemId: string, qty: number) => {
    try { const updated = await cartApi.updateItem(itemId, qty); setCartData(updated); }
    catch (err: any) { alert(err.message); }
  };
  const removeItem = async (itemId: string) => {
    try { const updated = await cartApi.removeItem(itemId); setCartData(updated); }
    catch (err: any) { alert(err.message); }
  };
  const clearCart = async () => {
    try { const updated = await cartApi.clear(); setCartData(updated); }
    catch (err: any) { alert(err.message); }
  };

  const total = cartData?.items?.reduce((sum: number, item: any) => sum + item.priceAtAdd * item.quantity, 0) || 0;

  if (loading) {
    return (
      <div className="min-h-screen bg-[#FFF9FA] pt-32 pb-20 flex justify-center">
        <div className="w-12 h-12 border-4 border-[#EC4899] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div ref={containerRef} className="min-h-screen bg-[#FFF9FA] pt-32 pb-20 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-10 stagger-item">
          <h1 className="text-4xl font-black text-[#111827] tracking-tight">Shopping Cart</h1>
          {cartData?.items?.length > 0 && (
            <button onClick={clearCart} className="text-sm text-[#EC4899] hover:text-[#B91C1C] font-semibold transition-colors">Clear Cart</button>
          )}
        </div>

        {!cartData?.items?.length ? (
          <div className="stagger-item flex flex-col items-center justify-center shadow-[0_32px_90px_rgba(236,72,153,0.12)] rounded-[32px] bg-white/95 backdrop-blur-xl border border-white/60 p-16 text-center">
            <ShoppingBag className="w-20 h-20 text-[#FBCFE8] mb-6" />
            <h2 className="text-2xl font-bold text-[#111827] mb-2">Your cart is empty</h2>
            <p className="text-[#6B7280] mb-8">Looks like you haven&apos;t added any items yet.</p>
            <Link href="/products" className="inline-flex items-center gap-2 rounded-[24px] bg-gradient-to-r from-[#EC4899] to-[#F472B6] px-8 py-3.5 text-sm font-semibold text-white shadow-lg shadow-[#EC4899]/20 transition hover:-translate-y-0.5">
              Start Shopping <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-5">
              {cartData.items.map((item: any) => (
                <div key={item._id} className="stagger-item flex items-center shadow-[0_12px_40px_rgba(236,72,153,0.08)] rounded-[24px] bg-white/90 backdrop-blur-md border border-white/60 p-6 gap-6">
                  <div className="w-24 h-24 rounded-2xl bg-gray-100 flex-shrink-0 flex items-center justify-center border border-gray-200/50">
                    <ShoppingBag className="w-8 h-8 text-gray-300" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-bold text-lg text-[#111827]">{item.productId?.title || 'Product'}</h3>
                    <p className="text-sm text-[#6B7280] mt-1">Variant: {item.variantSku}</p>
                    <p className="text-[#EC4899] font-black mt-2 text-xl">Rs. {item.priceAtAdd?.toLocaleString()}</p>
                  </div>
                  <div className="flex flex-col items-end gap-4">
                    <button onClick={() => removeItem(item._id)} className="text-gray-400 hover:text-red-500 transition-colors p-2 rounded-full hover:bg-red-50"><Trash2 className="w-4 h-4" /></button>
                    <div className="flex items-center gap-3 bg-gray-50 rounded-full p-1 border border-gray-100">
                      <button onClick={() => updateQuantity(item._id, Math.max(1, item.quantity - 1))} className="w-8 h-8 rounded-full flex items-center justify-center bg-white shadow-sm text-gray-600 hover:text-[#EC4899] transition-colors"><Minus className="w-3 h-3" /></button>
                      <span className="font-bold w-4 text-center text-[#111827]">{item.quantity}</span>
                      <button onClick={() => updateQuantity(item._id, item.quantity + 1)} className="w-8 h-8 rounded-full flex items-center justify-center bg-white shadow-sm text-gray-600 hover:text-[#EC4899] transition-colors"><Plus className="w-3 h-3" /></button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="stagger-item shadow-[0_32px_90px_rgba(236,72,153,0.12)] rounded-[32px] bg-white/95 backdrop-blur-xl border border-white/60 p-8 h-fit sticky top-32">
              <h3 className="font-black text-[#111827] text-xl mb-6">Order Summary</h3>
              <div className="w-full h-px bg-gradient-to-r from-gray-200 via-gray-300 to-gray-200 mb-6" />
              <div className="space-y-4 text-sm font-medium">
                <div className="flex justify-between"><span className="text-[#6B7280]">Subtotal</span><span className="text-[#111827]">Rs. {total.toLocaleString()}</span></div>
                <div className="flex justify-between"><span className="text-[#6B7280]">Shipping</span><span className="text-emerald-500 bg-emerald-50 px-2 py-0.5 rounded text-xs font-bold uppercase">Free</span></div>
                <div className="w-full h-px bg-gray-100 my-4" />
                <div className="flex justify-between font-black text-xl pt-2"><span className="text-[#111827]">Total</span><span className="text-[#EC4899]">Rs. {total.toLocaleString()}</span></div>
              </div>
              <button onClick={() => { if (!user) { router.push('/login'); return; } router.push('/checkout'); }} className="w-full mt-8 inline-flex items-center justify-center gap-2 rounded-[24px] bg-gradient-to-r from-[#EC4899] to-[#F472B6] px-4 py-4 text-sm font-bold text-white shadow-lg shadow-[#EC4899]/20 transition hover:-translate-y-0.5">
                {user ? 'Proceed to Checkout' : 'Sign in to Checkout'} <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
