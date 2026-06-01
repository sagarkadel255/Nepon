'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { products as productsApi, categories as categoriesApi } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { ChevronLeft, Plus, X, Package } from 'lucide-react';
import Link from 'next/link';

export default function NewProductPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [cats, setCats] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    title: '', description: '', category: '', status: 'draft',
    variants: [{ sku: '', size: 'M', color: 'Black', price: 0, stock: 0 }],
    images: [] as any[],
  });

  useEffect(() => {
    categoriesApi.list().then(setCats).catch(() => {});
  }, []);

  const addVariant = () => {
    setForm(f => ({ ...f, variants: [...f.variants, { sku: '', size: 'M', color: 'Black', price: 0, stock: 0 }] }));
  };

  const removeVariant = (index: number) => {
    setForm(f => ({ ...f, variants: f.variants.filter((_, i) => i !== index) }));
  };

  const updateVariant = (index: number, field: string, value: any) => {
    setForm(f => ({
      ...f,
      variants: f.variants.map((v, i) => i === index ? { ...v, [field]: value } : v),
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await productsApi.create(form);
      alert('Product created!');
      router.push('/seller');
    } catch (err: any) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 animate-fade-in container-wide">
      <Link href="/seller" className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-primary mb-6">
        <ChevronLeft className="w-4 h-4" /> Back to dashboard
      </Link>
      <h1 className="text-3xl font-bold text-secondary mb-8">Add New Product</h1>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="bg-white border border-border p-8 card-zero-static panel-rich">
          <h2 className="font-semibold text-secondary mb-6 text-lg">Basic Info</h2>
          <div className="divider-deco mb-6" />
          <div className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Title</label>
              <input type="text" required value={form.title} onChange={(e) => setForm(f => ({ ...f, title: e.target.value }))} className="w-full px-4 py-3 border border-border focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary" placeholder="Product name" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Description</label>
              <textarea required rows={4} value={form.description} onChange={(e) => setForm(f => ({ ...f, description: e.target.value }))} className="w-full px-4 py-3 border border-border focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary resize-none" placeholder="Describe your product..." />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Category</label>
              <select required value={form.category} onChange={(e) => setForm(f => ({ ...f, category: e.target.value }))} className="w-full px-4 py-3 border border-border focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary">
                <option value="">Select category</option>
                {cats.map((c: any) => <option key={c._id} value={c._id}>{c.name}</option>)}
              </select>
            </div>
          </div>
        </div>

        <div className="bg-white border border-border p-8 card-zero-static panel-rich">
          <div className="flex items-center justify-between mb-6">
            <h2 className="font-semibold text-secondary text-lg">Variants</h2>
            <button type="button" onClick={addVariant} className="text-sm text-primary flex items-center gap-1 hover:underline font-medium"><Plus className="w-4 h-4" /> Add Variant</button>
          </div>
          <div className="divider-deco mb-4" />
          <div className="space-y-4">
            {form.variants.map((variant, i) => (
              <div key={i} className="p-5 bg-muted/30 relative">
                {form.variants.length > 1 && (
                  <button type="button" onClick={() => removeVariant(i)} className="absolute top-2 right-2 p-1 text-gray-400 hover:text-error"><X className="w-4 h-4" /></button>
                )}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">SKU</label>
                    <input type="text" required value={variant.sku} onChange={(e) => updateVariant(i, 'sku', e.target.value)} className="w-full px-3 py-2 border border-border text-sm" placeholder="SKU-001" />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Size</label>
                    <select value={variant.size} onChange={(e) => updateVariant(i, 'size', e.target.value)} className="w-full px-3 py-2 border border-border text-sm">
                      {['XS','S','M','L','XL','XXL'].map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Color</label>
                    <input type="text" value={variant.color} onChange={(e) => updateVariant(i, 'color', e.target.value)} className="w-full px-3 py-2 border border-border text-sm" />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Price (Rs.)</label>
                    <input type="number" required min="1" value={variant.price || ''} onChange={(e) => updateVariant(i, 'price', Number(e.target.value))} className="w-full px-3 py-2 border border-border text-sm" />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Stock</label>
                    <input type="number" required min="0" value={variant.stock || ''} onChange={(e) => updateVariant(i, 'stock', Number(e.target.value))} className="w-full px-3 py-2 border border-border text-sm" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="flex gap-3">
          <button type="submit" disabled={loading} className="px-8 py-3 bg-primary text-white font-semibold hover:bg-primary-dark transition-colors disabled:opacity-50 tracking-wide">
            {loading ? 'Creating...' : 'Create Product'}
          </button>
          <button type="button" onClick={() => setForm(f => ({ ...f, status: 'published' }))} className="px-8 py-3 bg-success text-white font-semibold hover:opacity-90 transition-colors tracking-wide">
            Publish Immediately
          </button>
        </div>
      </form>
    </div>
  );
}
