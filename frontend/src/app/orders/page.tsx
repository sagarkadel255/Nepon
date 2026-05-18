'use client';

import React, { useState, useEffect, useRef } from 'react';
import { orders as ordersApi } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { Package, ChevronRight, ShoppingBag } from 'lucide-react';
import Link from 'next/link';
import { useGSAP } from '@gsap/react';
import gsap from 'gsap';

const statusColors: Record<string, string> = {
  placed: 'bg-blue-50 text-blue-600',
  confirmed: 'bg-indigo-50 text-indigo-600',
  shipped: 'bg-purple-50 text-purple-600',
  delivered: 'bg-emerald-50 text-emerald-600',
  completed: 'bg-emerald-50 text-emerald-600',
  cancelled: 'bg-red-50 text-red-600',
  refunded: 'bg-orange-50 text-orange-600',
};

export default function OrdersPage() {
  const { user } = useAuth();
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const containerRef = useRef<HTMLDivElement>(null);

  useGSAP(() => {
    if (!loading) {
      gsap.fromTo('.stagger-item', { opacity: 0, y: 30 }, { opacity: 1, y: 0, duration: 0.8, stagger: 0.1, ease: 'power3.out' });
    }
  }, { scope: containerRef, dependencies: [loading] });

  useEffect(() => {
    if (!user) return;
    ordersApi.list()
      .then((data) => setOrders(data.orders || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [user]);

  if (!user) return null;

  if (loading) return (
    <div className="min-h-screen bg-[#FFF9FA] pt-32 pb-20 flex justify-center">
      <div className="w-12 h-12 border-4 border-[#EC4899] border-t-transparent rounded-full animate-spin" />
    </div>
  );

  return (
    <div ref={containerRef} className="min-h-screen bg-[#FFF9FA] pt-32 pb-20 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl font-black text-[#111827] tracking-tight mb-10 stagger-item">My Orders</h1>

        {orders.length === 0 ? (
          <div className="stagger-item flex flex-col items-center justify-center shadow-[0_32px_90px_rgba(236,72,153,0.12)] rounded-[32px] bg-white/95 backdrop-blur-xl border border-white/60 p-16 text-center">
            <Package className="w-20 h-20 text-[#FBCFE8] mb-6" />
            <h2 className="text-2xl font-bold text-[#111827] mb-2">No orders yet</h2>
            <p className="text-[#6B7280] mb-8">You haven&apos;t placed any orders yet.</p>
            <Link href="/products" className="inline-flex items-center justify-center gap-2 rounded-[24px] bg-gradient-to-r from-[#EC4899] to-[#F472B6] px-8 py-3.5 text-sm font-bold text-white shadow-lg shadow-[#EC4899]/20 transition hover:-translate-y-0.5">
              Start Shopping <ShoppingBag className="w-4 h-4" />
            </Link>
          </div>
        ) : (
          <div className="space-y-5">
            {orders.map((order: any) => (
              <Link key={order._id} href={`/orders/${order._id}`} className="stagger-item block shadow-[0_12px_40px_rgba(236,72,153,0.08)] rounded-[24px] bg-white/90 backdrop-blur-md border border-white/60 p-6 hover:shadow-[0_20px_50px_rgba(236,72,153,0.12)] transition-all group">
                <div className="flex items-center justify-between flex-wrap gap-4">
                  <div className="flex items-center gap-5">
                    <div className="w-16 h-16 rounded-[20px] bg-[#FBCFE8]/20 flex items-center justify-center border border-[#FBCFE8]/50 group-hover:bg-[#FBCFE8]/30 transition-colors">
                      <Package className="w-8 h-8 text-[#EC4899]" />
                    </div>
                    <div>
                      <h3 className="font-bold text-[#111827] text-lg group-hover:text-[#EC4899] transition-colors">{order.orderNumber}</h3>
                      <p className="text-sm text-[#6B7280] font-medium mt-1">{order.items?.length} items &middot; {new Date(order.createdAt).toLocaleDateString()}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-6">
                    <span className={`px-4 py-1.5 text-xs font-bold uppercase tracking-wider rounded-lg border border-transparent ${statusColors[order.status] || ''}`}>
                      {order.status}
                    </span>
                    <span className="font-black text-[#111827] text-xl">Rs. {order.totalAmount?.toLocaleString()}</span>
                    <div className="w-10 h-10 rounded-full bg-gray-50 flex items-center justify-center group-hover:bg-[#EC4899] transition-colors">
                      <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-white" />
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
