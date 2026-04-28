'use client';

import React, { useState, useEffect, Suspense, useRef, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import ProductCard from '@/components/ProductCard';
import Pagination from '@/components/Pagination';
import { products as productsApi, categories as categoriesApi } from '@/lib/api';
import {
  SlidersHorizontal, Search, ArrowUpDown, ChevronDown,
  LayoutGrid, List, X, Truck, RotateCcw, ShieldCheck, Headphones,
  ChevronRight, Circle
} from 'lucide-react';
import { useGSAP } from '@gsap/react';
import gsap from 'gsap';

const SIZES = ['XS', 'S', 'M', 'L', 'XL', 'XXL'];
const COLORS = [
  { name: 'Black', hex: '#000000' },
  { name: 'White', hex: '#FFFFFF' },
  { name: 'Red', hex: '#EF4444' },
  { name: 'Blue', hex: '#3B82F6' },
  { name: 'Green', hex: '#10B981' },
  { name: 'Navy', hex: '#1E3A5F' },
  { name: 'Gray', hex: '#9CA3AF' },
  { name: 'Beige', hex: '#F5F5DC' },
];
const SORT_OPTIONS = [
  { value: 'newest', label: 'Newest' },
  { value: 'price_asc', label: 'Price: Low to High' },
  { value: 'price_desc', label: 'Price: High to Low' },
  { value: 'rating', label: 'Top Rated' },
  { value: 'popular', label: 'Most Popular' },
];
const PRICE_MIN = 0;
const PRICE_MAX = 10000;

function ProductsContent() {
  const searchParams = useSearchParams();
  const [items, setItems] = useState<any[]>([]);
  const [cats, setCats] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [showFilters, setShowFilters] = useState(false);
  const [collapsedSections, setCollapsedSections] = useState<Record<string, boolean>>({});
  const [filters, setFilters] = useState({
    search: searchParams.get('search') || '',
    category: searchParams.get('category') || '',
    minPrice: '',
    maxPrice: '',
    size: '',
    color: '',
    sort: 'newest',
  });
  const [tempFilters, setTempFilters] = useState({ ...filters, category: filters.category ? [filters.category] : [] as string[] });

  const containerRef = useRef<HTMLDivElement>(null);
  const toolbarRef = useRef<HTMLDivElement>(null);
  const filterRef = useRef<HTMLDivElement>(null);
  const gridRef = useRef<HTMLDivElement>(null);

  const isCollection = searchParams.get('category') === 'collection';
  const totalPages = Math.ceil(total / 12);

  const toggleSection = (section: string) => {
    setCollapsedSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  const handleTempCategory = (catId: string) => {
    setTempFilters(prev => {
      const current = [...prev.category];
      const idx = current.indexOf(catId);
      if (idx > -1) current.splice(idx, 1);
      else current.push(catId);
      return { ...prev, category: current };
    });
  };

  const applyFilters = () => {
    setFilters({
      search: tempFilters.search,
      category: tempFilters.category[0] || '',
      minPrice: tempFilters.minPrice,
      maxPrice: tempFilters.maxPrice,
      size: tempFilters.size,
      color: tempFilters.color,
      sort: tempFilters.sort,
    });
    setPage(1);
    setShowFilters(false);
  };

  const clearFilters = () => {
    const cleared = { search: '', category: '', minPrice: '', maxPrice: '', size: '', color: '', sort: 'newest' };
    setFilters(cleared);
    setTempFilters({ ...cleared, category: [] });
    setPage(1);
  };

  useGSAP(() => {
    if (!loading) {
      gsap.fromTo('.stagger-item',
        { opacity: 0, y: 30 },
        { opacity: 1, y: 0, duration: 0.6, stagger: 0.08, ease: 'power3.out' },
      );
      gsap.fromTo('.toolbar-item',
        { opacity: 0, y: -15 },
        { opacity: 1, y: 0, duration: 0.5, stagger: 0.1, ease: 'power2.out', delay: 0.2 },
      );
    }
  }, { scope: containerRef, dependencies: [loading, items] });

  useEffect(() => {
    categoriesApi.list().then(setCats).catch(console.error);
  }, []);

  useEffect(() => {
    setLoading(true);
    setPage(1);
    const params: any = { page: '1', limit: '12' };
    if (filters.search) params.search = filters.search;
    if (filters.category && !isCollection) params.category = filters.category;
    if (filters.minPrice) params.minPrice = filters.minPrice;
    if (filters.maxPrice) params.maxPrice = filters.maxPrice;
    if (filters.size) params.size = filters.size;
    if (filters.color) params.color = filters.color;
    if (filters.sort) params.sort = filters.sort;

    productsApi.list(params)
      .then((data) => {
        setItems(data.products || []);
        setTotal(data.total || 0);
      })
      .catch((err) => {
        console.error("Error fetching products:", err);
        setItems([]);
      })
      .finally(() => setLoading(false));
  }, [filters, isCollection]);

  useEffect(() => {
    if (page === 1) return;
    setLoading(true);
    const params: any = { page: page.toString(), limit: '12' };
    if (filters.search) params.search = filters.search;
    if (filters.category && !isCollection) params.category = filters.category;
    if (filters.minPrice) params.minPrice = filters.minPrice;
    if (filters.maxPrice) params.maxPrice = filters.maxPrice;
    if (filters.size) params.size = filters.size;
    if (filters.color) params.color = filters.color;
    if (filters.sort) params.sort = filters.sort;

    productsApi.list(params)
      .then((data) => {
        setItems(data.products || []);
        setTotal(data.total || 0);
      })
      .catch((err) => {
        console.error("Error fetching products:", err);
        setItems([]);
      })
      .finally(() => setLoading(false));
  }, [page, filters.category, filters.color, filters.maxPrice, filters.minPrice, filters.search, filters.size, filters.sort, isCollection]);

  const hasActiveFilters = filters.search || filters.category || filters.minPrice || filters.maxPrice || filters.size || filters.color;

  return (
    <div ref={containerRef} className="min-h-screen bg-[#FFF9FA]">
      <div className="max-w-[100rem] mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-16">
        <nav className="flex items-center gap-1.5 text-xs font-medium text-gray-400 mb-5 stagger-item">
          <Link href="/" className="hover:text-[#EC4899] transition-colors">Home</Link>
          <ChevronRight className="w-3 h-3" />
          <span className="text-gray-600">{isCollection ? 'Collection' : 'Shop'}</span>
          {filters.category && cats.find(c => c._id === filters.category) && (
            <>
              <ChevronRight className="w-3 h-3" />
              <span className="text-[#EC4899]">{cats.find(c => c._id === filters.category)?.name}</span>
            </>
          )}
        </nav>

        <div className="mb-8 stagger-item">
          <h1 className="text-[2.5rem] sm:text-[3.25rem] font-black tracking-tight leading-none">
            <span className="bg-gradient-to-r from-[#111827] via-[#EC4899] to-[#F472B6] bg-clip-text text-transparent">
              {isCollection ? 'Collection' : filters.search ? `"${filters.search}"` : 'All Products'}
            </span>
          </h1>
          <p className="text-gray-500 font-medium mt-2.5">
            {isCollection
              ? 'Curated pieces from independent creators'
              : 'Discover fashion from independent sellers'}
          </p>
        </div>

        <div ref={toolbarRef} className="flex items-center justify-between mb-8 p-4 bg-white/80 backdrop-blur-sm rounded-2xl border border-gray-100 shadow-sm">
          <div className="flex items-center gap-4">
            <p className="text-sm font-bold text-[#111827] toolbar-item">
              {total} Product{total !== 1 ? 's' : ''}
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="relative toolbar-item hidden sm:block">
              <select
                value={filters.sort}
                onChange={(e) => {
                  setFilters(f => ({ ...f, sort: e.target.value }));
                  setTempFilters(ft => ({ ...ft, sort: e.target.value }));
                }}
                className="appearance-none bg-white border border-gray-200 rounded-xl px-4 py-2 pr-9 text-sm font-semibold text-gray-600 cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#FBCFE8] focus:border-[#EC4899] transition-all"
              >
                {SORT_OPTIONS.map(o => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
              <ArrowUpDown className="w-3.5 h-3.5 text-gray-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>

            <div className="flex items-center bg-gray-100 rounded-xl p-0.5 toolbar-item">
              <button
                onClick={() => setViewMode('grid')}
                className={`p-2 rounded-[10px] transition-all duration-200 ${viewMode === 'grid' ? 'bg-white shadow-sm text-[#EC4899]' : 'text-gray-400 hover:text-gray-600'}`}
              >
                <LayoutGrid className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`p-2 rounded-[10px] transition-all duration-200 ${viewMode === 'list' ? 'bg-white shadow-sm text-[#EC4899]' : 'text-gray-400 hover:text-gray-600'}`}
              >
                <List className="w-4 h-4" />
              </button>
            </div>

            <button
              onClick={() => setShowFilters(!showFilters)}
              className="lg:hidden relative p-2.5 rounded-xl bg-gray-100 text-gray-600 hover:bg-gray-200 transition-all toolbar-item"
            >
              <SlidersHorizontal className="w-4 h-4" />
              {hasActiveFilters && (
                <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-[#EC4899] rounded-full border-2 border-white" />
              )}
            </button>
          </div>
        </div>

        <div className="flex gap-8">
          <aside
            ref={filterRef}
            className={`
              ${showFilters ? 'fixed inset-0 z-50 flex' : 'hidden'}
              lg:relative lg:inset-auto lg:z-auto lg:block
              lg:w-[280px] xl:w-[300px] flex-shrink-0
            `}
          >
            {showFilters && (
              <div className="lg:hidden fixed inset-0 bg-black/30 backdrop-blur-sm" onClick={() => setShowFilters(false)} />
            )}

            <div className={`
              relative w-full max-w-sm lg:max-w-none
              ${showFilters ? 'mx-auto my-0 lg:my-0' : ''}
              bg-white rounded-3xl border border-gray-100 shadow-[0_20px_60px_rgba(0,0,0,0.06)]
              lg:sticky lg:top-24
              max-h-[90vh] lg:max-h-none overflow-y-auto
            `}>
              <div className="flex items-center justify-between p-6 pb-4 border-b border-gray-50">
                <div className="flex items-center gap-2.5">
                  <SlidersHorizontal className="w-4 h-4 text-[#EC4899]" />
                  <h3 className="font-bold text-[#111827] text-base">Filters</h3>
                </div>
                <div className="flex items-center gap-3">
                  {hasActiveFilters && (
                    <button onClick={clearFilters} className="text-xs font-bold text-[#EC4899] hover:underline underline-offset-2 transition-all">
                      Reset
                    </button>
                  )}
                  <button onClick={() => setShowFilters(false)} className="lg:hidden p-1.5 rounded-lg hover:bg-gray-100 transition-colors">
                    <X className="w-4 h-4 text-gray-500" />
                  </button>
                </div>
              </div>

              <div className="p-6 space-y-6">
                <div>
                  <div className="relative group">
                    <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2 group-focus-within:text-[#EC4899] transition-colors" />
                    <input
                      type="text"
                      placeholder="Search..."
                      value={tempFilters.search}
                      onChange={(e) => setTempFilters(f => ({ ...f, search: e.target.value }))}
                      className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 bg-gray-50 focus:outline-none focus:ring-2 focus:ring-[#FBCFE8] focus:border-[#EC4899] focus:bg-white transition-all text-sm"
                    />
                  </div>
                </div>

                <div className="border-b border-gray-50 pb-6">
                  <button onClick={() => toggleSection('category')} className="flex items-center justify-between w-full mb-3">
                    <span className="text-[11px] font-bold uppercase tracking-[0.12em] text-gray-500">Category</span>
                    <ChevronDown className={`w-3.5 h-3.5 text-gray-400 transition-transform duration-200 ${collapsedSections.category ? '-rotate-90' : ''}`} />
                  </button>
                  {!collapsedSections.category && (
                    <div className="space-y-1.5">
                      <label className="flex items-center gap-3 px-1 py-1.5 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors group">
                        <input
                          type="checkbox"
                          checked={tempFilters.category.length === 0}
                          onChange={() => setTempFilters(f => ({ ...f, category: [] }))}
                          className="w-4 h-4 rounded border-gray-300 text-[#EC4899] focus:ring-[#EC4899] focus:ring-offset-0 cursor-pointer accent-[#EC4899]"
                        />
                        <span className="text-sm font-medium text-gray-600 group-hover:text-[#111827] transition-colors">All Categories</span>
                      </label>
                      {cats.map((cat: any) => (
                        <label key={cat._id} className="flex items-center gap-3 px-1 py-1.5 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors group">
                          <input
                            type="checkbox"
                            checked={tempFilters.category.includes(cat._id)}
                            onChange={() => handleTempCategory(cat._id)}
                            className="w-4 h-4 rounded border-gray-300 text-[#EC4899] focus:ring-[#EC4899] focus:ring-offset-0 cursor-pointer accent-[#EC4899]"
                          />
                          <span className="text-sm font-medium text-gray-600 group-hover:text-[#111827] transition-colors">{cat.name}</span>
                        </label>
                      ))}
                    </div>
                  )}
                </div>

                <div className="border-b border-gray-50 pb-6">
                  <button onClick={() => toggleSection('price')} className="flex items-center justify-between w-full mb-3">
                    <span className="text-[11px] font-bold uppercase tracking-[0.12em] text-gray-500">Price</span>
                    <ChevronDown className={`w-3.5 h-3.5 text-gray-400 transition-transform duration-200 ${collapsedSections.price ? '-rotate-90' : ''}`} />
                  </button>
                  {!collapsedSections.price && (
                    <div className="space-y-3">
                      <div className="relative h-1.5 bg-gray-100 rounded-full mt-2">
                        <div className="absolute left-0 right-0 h-full bg-gradient-to-r from-[#FBCFE8] to-[#EC4899] rounded-full"
                          style={{
                            left: `${(Number(tempFilters.minPrice) || 0) / PRICE_MAX * 100}%`,
                            right: `${100 - (Number(tempFilters.maxPrice) || PRICE_MAX) / PRICE_MAX * 100}%`,
                          }}
                        />
                        <input
                          type="range"
                          min={PRICE_MIN}
                          max={PRICE_MAX}
                          step={100}
                          value={tempFilters.minPrice || 0}
                          onChange={(e) => {
                            const val = Math.min(Number(e.target.value), Number(tempFilters.maxPrice || PRICE_MAX) - 100);
                            setTempFilters(f => ({ ...f, minPrice: String(val) }));
                          }}
                          className="absolute top-0 w-full h-full appearance-none bg-transparent pointer-events-none [&::-webkit-slider-thumb]:pointer-events-auto [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-[#EC4899] [&::-webkit-slider-thumb]:shadow-md [&::-webkit-slider-thumb]:cursor-grab [&::-moz-range-thumb]:pointer-events-auto [&::-moz-range-thumb]:appearance-none [&::-moz-range-thumb]:w-4 [&::-moz-range-thumb]:h-4 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-white [&::-moz-range-thumb]:border-2 [&::-moz-range-thumb]:border-[#EC4899] [&::-moz-range-thumb]:shadow-md [&::-moz-range-thumb]:cursor-grab"
                        />
                        <input
                          type="range"
                          min={PRICE_MIN}
                          max={PRICE_MAX}
                          step={100}
                          value={tempFilters.maxPrice || PRICE_MAX}
                          onChange={(e) => {
                            const val = Math.max(Number(e.target.value), Number(tempFilters.minPrice || 0) + 100);
                            setTempFilters(f => ({ ...f, maxPrice: String(val) }));
                          }}
                          className="absolute top-0 w-full h-full appearance-none bg-transparent pointer-events-none [&::-webkit-slider-thumb]:pointer-events-auto [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-[#EC4899] [&::-webkit-slider-thumb]:shadow-md [&::-webkit-slider-thumb]:cursor-grab [&::-moz-range-thumb]:pointer-events-auto [&::-moz-range-thumb]:appearance-none [&::-moz-range-thumb]:w-4 [&::-moz-range-thumb]:h-4 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-white [&::-moz-range-thumb]:border-2 [&::-moz-range-thumb]:border-[#EC4899] [&::-moz-range-thumb]:shadow-md [&::-moz-range-thumb]:cursor-grab"
                        />
                      </div>
                      <div className="flex items-center justify-between text-xs font-semibold text-gray-500">
                        <span>NPR {Number(tempFilters.minPrice || 0).toLocaleString()}</span>
                        <span>NPR {Number(tempFilters.maxPrice || PRICE_MAX).toLocaleString()}</span>
                      </div>
                    </div>
                  )}
                </div>

                <div className="border-b border-gray-50 pb-6">
                  <button onClick={() => toggleSection('size')} className="flex items-center justify-between w-full mb-3">
                    <span className="text-[11px] font-bold uppercase tracking-[0.12em] text-gray-500">Size</span>
                    <ChevronDown className={`w-3.5 h-3.5 text-gray-400 transition-transform duration-200 ${collapsedSections.size ? '-rotate-90' : ''}`} />
                  </button>
                  {!collapsedSections.size && (
                    <div className="flex flex-wrap gap-1.5">
                      {SIZES.map(s => (
                        <button
                          key={s}
                          onClick={() => setTempFilters(f => ({ ...f, size: f.size === s ? '' : s }))}
                          className={`w-10 h-10 rounded-xl text-xs font-bold transition-all duration-200 ${
                            tempFilters.size === s
                              ? 'bg-[#EC4899] text-white shadow-md shadow-[#EC4899]/20'
                              : 'bg-gray-50 text-gray-600 border border-gray-200 hover:border-[#EC4899] hover:text-[#EC4899] hover:bg-[#FFF9FA]'
                          }`}
                        >
                          {s}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <div className="border-b border-gray-50 pb-6">
                  <button onClick={() => toggleSection('color')} className="flex items-center justify-between w-full mb-3">
                    <span className="text-[11px] font-bold uppercase tracking-[0.12em] text-gray-500">Color</span>
                    <ChevronDown className={`w-3.5 h-3.5 text-gray-400 transition-transform duration-200 ${collapsedSections.color ? '-rotate-90' : ''}`} />
                  </button>
                  {!collapsedSections.color && (
                    <div className="flex flex-wrap gap-2.5">
                      {COLORS.map(c => (
                        <button
                          key={c.name}
                          onClick={() => setTempFilters(f => ({ ...f, color: f.color === c.name ? '' : c.name }))}
                          className="group relative"
                          title={c.name}
                        >
                          <div className={`w-8 h-8 rounded-full transition-all duration-200 ${
                            tempFilters.color === c.name
                              ? 'ring-2 ring-[#EC4899] ring-offset-2 scale-110'
                              : 'ring-1 ring-gray-200 hover:ring-gray-300'
                          }`}
                            style={{ backgroundColor: c.hex, border: c.hex === '#FFFFFF' ? '1px solid #E5E7EB' : 'none' }}
                          />
                          <span className="absolute -bottom-5 left-1/2 -translate-x-1/2 text-[10px] font-medium text-gray-500 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                            {c.name}
                          </span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <button
                  onClick={applyFilters}
                  className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-[#EC4899] to-[#F472B6] text-white text-sm font-bold shadow-lg shadow-[#EC4899]/20 hover:shadow-xl hover:shadow-[#EC4899]/30 hover:-translate-y-0.5 transition-all duration-300"
                >
                  Apply Filters
                </button>
              </div>
            </div>
          </aside>

          <div className="flex-1 min-w-0">
            {loading ? (
              <div className={viewMode === 'grid'
                ? 'grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-6 lg:gap-8'
                : 'space-y-6'
              }>
                {Array.from({ length: 8 }).map((_, i) => (
                  <div key={i} className="rounded-[28px] bg-white p-4 border border-gray-50 animate-pulse">
                    <div className="aspect-[4/5] bg-gradient-to-br from-gray-50 to-gray-100 rounded-[20px] mb-4" />
                    <div className="h-3 bg-gradient-to-r from-gray-100 to-gray-50 rounded-full w-1/3 mb-2.5" />
                    <div className="h-4 bg-gradient-to-r from-gray-100 to-gray-50 rounded-full w-3/4 mb-2.5" />
                    <div className="h-3 bg-gradient-to-r from-gray-100 to-gray-50 rounded-full w-1/2 mb-3" />
                    <div className="h-5 bg-gradient-to-r from-gray-100 to-gray-50 rounded-full w-1/3" />
                  </div>
                ))}
              </div>
            ) : items.length === 0 ? (
              <div className="relative overflow-hidden flex flex-col items-center justify-center py-24 text-center rounded-[32px] bg-white border border-gray-100 shadow-sm">
                <div className="absolute top-0 left-0 w-full h-0.5 bg-gradient-to-r from-[#EC4899] via-[#F472B6] to-[#FB7185]" />
                <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-[#FDF2F8] to-[#FCE7F3] flex items-center justify-center mb-6">
                  <Search className="w-8 h-8 text-[#EC4899]" />
                </div>
                <h3 className="text-xl font-bold text-[#111827]">No products found</h3>
                <p className="text-gray-500 mt-1.5 text-sm max-w-xs">Try adjusting or clearing your filters to find what you're looking for.</p>
                <button onClick={clearFilters} className="mt-6 px-7 py-3 rounded-xl bg-gradient-to-r from-[#EC4899] to-[#F472B6] text-white font-bold text-sm shadow-lg shadow-[#EC4899]/20 hover:shadow-xl hover:-translate-y-0.5 transition-all duration-300">
                  Clear Filters
                </button>
              </div>
            ) : (
              <>
                <div ref={gridRef} className={
                  viewMode === 'grid'
                    ? 'grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-6 lg:gap-8'
                    : 'space-y-5'
                }>
                  {items.map((product: any, index: number) => (
                    <div key={product._id || `fallback-${index}`} className="stagger-item">
                      <ProductCard product={product} />
                    </div>
                  ))}
                </div>

                <Pagination
                  currentPage={page}
                  totalPages={totalPages}
                  onPageChange={setPage}
                />
              </>
            )}
          </div>
        </div>
      </div>

      <div className="border-t border-gray-100 bg-white">
        <div className="max-w-[100rem] mx-auto px-4 sm:px-6 lg:px-8 py-10">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {[
              { icon: Truck, label: 'Free Shipping', desc: 'On orders over NPR 5,000' },
              { icon: RotateCcw, label: 'Easy Returns', desc: '14-day return policy' },
              { icon: ShieldCheck, label: 'Secure Payment', desc: 'Encrypted checkout' },
              { icon: Headphones, label: '24/7 Support', desc: 'Dedicated assistance' },
            ].map((item, i) => (
              <div key={i} className="flex items-center gap-4 p-4 rounded-2xl bg-[#FFF9FA] border border-gray-50 hover:bg-[#FDF2F8] hover:border-[#FBCFE8] transition-all duration-300 group">
                <div className="w-11 h-11 rounded-xl bg-white shadow-sm flex items-center justify-center group-hover:bg-gradient-to-br group-hover:from-[#EC4899] group-hover:to-[#F472B6] group-hover:shadow-md group-hover:shadow-[#EC4899]/20 transition-all duration-300">
                  <item.icon className="w-5 h-5 text-gray-500 group-hover:text-white transition-colors duration-300" strokeWidth={1.5} />
                </div>
                <div>
                  <p className="text-sm font-bold text-[#111827]">{item.label}</p>
                  <p className="text-[11px] text-gray-500 font-medium mt-0.5">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ProductsPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#FFF9FA] pt-40 flex justify-center">
        <div className="w-10 h-10 border-[3px] border-[#EC4899] border-t-transparent rounded-full animate-spin" />
      </div>
    }>
      <ProductsContent />
    </Suspense>
  );
}
