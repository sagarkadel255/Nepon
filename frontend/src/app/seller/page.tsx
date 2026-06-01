'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/lib/auth-context';
import { products as productsApi, orders as ordersApi } from '@/lib/api';
import { Package, TrendingUp, ShoppingBag, DollarSign, Plus, Edit, Trash2 } from 'lucide-react';
import Link from 'next/link';
import { useGSAP } from '@gsap/react';
import gsap from 'gsap';

export default function SellerDashboard() {
  const { user } = useAuth();
  const [myProducts, setMyProducts] = useState<any[]>([]);
  const [myOrders, setMyOrders] = useState<any[]>([]);
  const [stats, setStats] = useState({ products: 0, orders: 0, revenue: 0 });
  const [loading, setLoading] = useState(true);
  const containerRef = useRef<HTMLDivElement>(null);

  useGSAP(() => {
    if (!loading) {
      gsap.fromTo('.stagger-item', { opacity: 0, y: 30 }, { opacity: 1, y: 0, duration: 0.8, stagger: 0.1, ease: 'power3.out' });
    }
  }, { scope: containerRef, dependencies: [loading] });

  useEffect(() => {
    if (!user || user.role !== 'seller') return;
    Promise.all([
      productsApi.getMyProducts({ limit: '50' }).catch(() => ({ products: [] })),
      ordersApi.list({ limit: '50' }).catch(() => ({ orders: [] })),
    ]).then(([prodData, ordData]) => {
      setMyProducts(prodData.products || []);
      setMyOrders(ordData.orders || []);
      setStats({
        products: prodData.total || 0,
        orders: ordData.total || 0,
        revenue: (ordData.orders || []).reduce((sum: number, o: any) => sum + (o.totalAmount || 0), 0),
      });
    }).finally(() => setLoading(false));
  }, [user]);

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this product?')) return;
    try {
      await productsApi.delete(id);
      setMyProducts(prev => prev.filter(p => p._id !== id));
    } catch (err: any) { alert(err.message); }
  };

  if (!user || user.role !== 'seller') return null;

  if (loading) return (
    <div className="min-h-screen bg-[#FFF9FA] pt-32 pb-20 flex justify-center">
      <div className="w-12 h-12 border-4 border-[#EC4899] border-t-transparent rounded-full animate-spin" />
    </div>
  );

  return (
    <div ref={containerRef} className="min-h-screen bg-[#FFF9FA] pt-32 pb-20 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-10 stagger-item">
          <div>
            <h1 className="text-4xl font-black text-[#111827] tracking-tight">Seller Hub</h1>
            <p className="text-[#6B7280] mt-1 font-medium">Welcome back, {user.displayName}</p>
          </div>
          <Link href="/seller/products/new" className="inline-flex items-center justify-center gap-2 rounded-[24px] bg-gradient-to-r from-[#EC4899] to-[#F472B6] px-6 py-3.5 text-sm font-bold text-white shadow-lg shadow-[#EC4899]/20 transition hover:-translate-y-0.5">
            <Plus className="w-4 h-4" /> Add Product
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
          {[
            { label: 'Total Products', value: stats.products, icon: Package, color: 'text-blue-500', bg: 'bg-blue-50' },
            { label: 'Total Orders', value: stats.orders, icon: ShoppingBag, color: 'text-purple-500', bg: 'bg-purple-50' },
            { label: 'Total Revenue', value: `Rs. ${stats.revenue.toLocaleString()}`, icon: DollarSign, color: 'text-emerald-500', bg: 'bg-emerald-50' },
          ].map((stat, i) => (
            <div key={i} className="stagger-item shadow-[0_16px_40px_rgba(236,72,153,0.08)] rounded-[24px] bg-white/95 backdrop-blur-xl border border-white/60 p-6 flex items-center gap-5">
              <div className={`w-16 h-16 rounded-[20px] ${stat.bg} flex items-center justify-center border border-white/50`}>
                <stat.icon className={`w-8 h-8 ${stat.color}`} />
              </div>
              <div>
                <p className="text-sm font-medium text-[#6B7280]">{stat.label}</p>
                <p className="text-2xl font-black text-[#111827] mt-1">{stat.value}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="stagger-item shadow-[0_32px_90px_rgba(236,72,153,0.12)] rounded-[32px] bg-white/95 backdrop-blur-xl border border-white/60 p-8">
            <div className="flex items-center justify-between mb-6">
              <h2 className="font-black text-[#111827] text-xl">My Products</h2>
              <Link href="/seller/products" className="text-sm text-[#EC4899] font-bold hover:underline">View All</Link>
            </div>
            <div className="w-full h-px bg-gradient-to-r from-gray-200 via-gray-300 to-gray-200 mb-6" />

            {myProducts.length === 0 ? (
              <p className="text-[#6B7280] text-center py-10 font-medium bg-gray-50 rounded-2xl border border-gray-100">
                No products yet. <Link href="/seller/products/new" className="text-[#EC4899] font-bold">Create your first product</Link>
              </p>
            ) : (
              <div className="space-y-4">
                {myProducts.slice(0, 5).map((product: any) => (
                  <div key={product._id} className="flex items-center gap-4 p-4 rounded-[20px] hover:bg-gray-50 transition-colors border border-transparent hover:border-gray-100">
                    <div className="w-14 h-14 rounded-xl bg-gray-100 flex items-center justify-center border border-gray-200">
                      <Package className="w-6 h-6 text-gray-400" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-bold text-[#111827] truncate">{product.title}</h3>
                      <p className="text-xs text-[#6B7280] mt-1 font-medium">
                        Rs. {product.variants?.[0]?.price?.toLocaleString()} &middot; {product.variants?.reduce((s: number, v: any) => s + v.stock, 0)} in stock
                      </p>
                    </div>
                    <span className={`px-2.5 py-1 text-xs font-bold rounded-lg ${product.status === 'published' ? 'bg-emerald-50 text-emerald-600' : 'bg-gray-100 text-gray-500'}`}>
                      {product.status}
                    </span>
                    <div className="flex gap-2">
                      <Link href={`/seller/products/${product._id}/edit`} className="p-2 rounded-full hover:bg-gray-100 text-gray-400 hover:text-[#EC4899] transition-colors"><Edit className="w-4 h-4" /></Link>
                      <button onClick={() => handleDelete(product._id)} className="p-2 rounded-full hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors"><Trash2 className="w-4 h-4" /></button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="stagger-item shadow-[0_32px_90px_rgba(236,72,153,0.12)] rounded-[32px] bg-white/95 backdrop-blur-xl border border-white/60 p-8">
            <h2 className="font-black text-[#111827] text-xl mb-6">Recent Orders</h2>
            <div className="w-full h-px bg-gradient-to-r from-gray-200 via-gray-300 to-gray-200 mb-6" />

            {myOrders.length === 0 ? (
              <p className="text-[#6B7280] text-center py-10 font-medium bg-gray-50 rounded-2xl border border-gray-100">
                No orders yet.
              </p>
            ) : (
              <div className="space-y-4">
                {myOrders.slice(0, 5).map((order: any) => (
                  <Link key={order._id} href={`/orders/${order._id}`} className="flex items-center gap-4 p-4 rounded-[20px] hover:bg-gray-50 transition-colors border border-transparent hover:border-gray-100">
                    <div className="w-12 h-12 rounded-xl bg-[#FBCFE8]/20 flex items-center justify-center border border-[#FBCFE8]/50">
                      <ShoppingBag className="w-5 h-5 text-[#EC4899]" />
                    </div>
                    <div className="flex-1">
                      <p className="font-bold text-[#111827] text-sm">{order.orderNumber}</p>
                      <p className="text-xs text-[#6B7280] mt-1 font-medium">{order.items?.length} items</p>
                    </div>
                    <span className={`px-2.5 py-1 text-xs font-bold rounded-lg ${order.status === 'completed' ? 'bg-emerald-50 text-emerald-600' : order.status === 'cancelled' ? 'bg-red-50 text-red-600' : 'bg-blue-50 text-blue-600'}`}>
                      {order.status}
                    </span>
                    <span className="font-black text-[#111827] text-sm">Rs. {order.totalAmount?.toLocaleString()}</span>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
