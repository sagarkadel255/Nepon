'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Heart, Star, ShoppingBag, Eye } from 'lucide-react';
import { cart } from '@/lib/api';

interface ProductCardProps {
  product: {
    _id: string;
    title: string;
    slug: string;
    images?: { url: string; altText?: string }[];
    variants?: { sku: string; price: number; size: string; color: string; stock?: number }[];
    category?: { name: string; _id: string };
    ratingAverage?: number;
    ratingCount?: number;
    sellerId?: { displayName: string };
    status?: string;
    createdAt?: string;
  };
}

export default function ProductCard({ product }: ProductCardProps) {
  const [wishlisted, setWishlisted] = useState(false);
  const [imgLoaded, setImgLoaded] = useState(false);
  const [adding, setAdding] = useState(false);
  const [added, setAdded] = useState(false);
  const [cartError, setCartError] = useState('');

  const variants = product.variants || [];
  const minPrice = variants.length > 0 ? Math.min(...variants.map(v => v.price)) : 0;
  const maxPrice = variants.length > 0 ? Math.max(...variants.map(v => v.price)) : 0;
  const hasSale = false; // placeholder — sale pricing not yet derived

  const colors = [...new Set(variants.filter(v => v.color).map(v => v.color))].slice(0, 4);
  const firstAvailableVariant = variants.find(variant => (variant.stock ?? 0) > 0) || variants[0];

  const handleAddToCart = async () => {
    if (!firstAvailableVariant || adding) return;
    setAdding(true);
    setCartError('');
    try {
      await cart.addItem({ productId: product._id, variantSku: firstAvailableVariant.sku, quantity: 1 });
      setAdded(true);
    } catch (error) {
      setCartError(error instanceof Error ? error.message : 'Unable to add this item');
    } finally {
      setAdding(false);
    }
  };

  return (
    <div className="group relative">
      <div className="relative bg-white rounded-[28px] border border-gray-100/80 overflow-hidden transition-all duration-500 hover:shadow-[0_20px_60px_rgba(236,72,153,0.18)] hover:-translate-y-1.5">
        <div className="relative aspect-[4/5] bg-[#FFF9FA] overflow-hidden">
          {product.images?.[0] ? (
            <>
              {!imgLoaded && (
                <div className="absolute inset-0 bg-gradient-to-br from-gray-50 to-gray-100 animate-pulse" />
              )}
              <img
                src={product.images[0].url}
                alt={product.images[0].altText || product.title}
                onLoad={() => setImgLoaded(true)}
                className={`w-full h-full object-cover transition-all duration-700 ease-out group-hover:scale-110 ${imgLoaded ? 'opacity-100' : 'opacity-0'}`}
              />
            </>
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-[#FFF9FA] to-[#FDF2F8]">
              <ShoppingBag className="w-14 h-14 text-[#FBCFE8]" />
            </div>
          )}

          <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

          <button
            onClick={(e) => { e.preventDefault(); setWishlisted(!wishlisted); }}
            className={`absolute top-3.5 right-3.5 w-9 h-9 rounded-full flex items-center justify-center transition-all duration-300 z-10 ${
              wishlisted
                ? 'bg-white shadow-md scale-110'
                : 'bg-white/80 backdrop-blur-sm shadow-sm opacity-0 group-hover:opacity-100 translate-x-2 group-hover:translate-x-0'
            }`}
          >
            <Heart
              className={`w-4.5 h-4.5 transition-all duration-300 ${
                wishlisted
                  ? 'fill-[#EC4899] text-[#EC4899] scale-110'
                  : 'text-gray-600 group-hover:text-[#EC4899]'
              }`}
              strokeWidth={2.5}
              size={18}
            />
          </button>

          {product.createdAt && (
            <div className="absolute top-3.5 left-3.5 z-10">
              <span className="px-3 py-1 text-[10px] font-bold uppercase tracking-wider bg-gradient-to-r from-[#10B981] to-[#34D399] text-white rounded-full shadow-lg shadow-[#10B981]/25">
                New
              </span>
            </div>
          )}

          {hasSale && (
            <div className="absolute top-3.5 left-3.5 z-10">
              <span className="px-3 py-1 text-[10px] font-bold uppercase tracking-wider bg-gradient-to-r from-[#EC4899] to-[#F472B6] text-white rounded-full shadow-lg shadow-[#EC4899]/25">
                Sale
              </span>
            </div>
          )}

          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 w-[calc(100%-2rem)] opacity-0 translate-y-4 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-400 ease-out z-10">
            <Link
              href={`/products/${product.slug || product._id}`}
              className="flex items-center justify-center gap-2 w-full py-3 rounded-2xl bg-white/95 backdrop-blur-md text-sm font-bold text-[#111827] shadow-lg hover:bg-white hover:shadow-xl transition-all duration-300"
            >
              <Eye className="w-4 h-4" strokeWidth={2.5} />
              Quick View
            </Link>
          </div>
        </div>

        <div className="p-5 pt-4 space-y-2.5">
          {product.category?.name && (
            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#EC4899]/70">
              {product.category.name}
            </p>
          )}

          <Link href={`/products/${product.slug || product._id}`}>
            <h3 className="font-bold text-[#111827] leading-snug line-clamp-1 group-hover:text-[#EC4899] transition-colors duration-300 text-[15px]">
              {product.title}
            </h3>
          </Link>

          <div className="flex items-center gap-1.5">
            <div className="flex items-center gap-0.5">
              {[1, 2, 3, 4, 5].map((star) => (
                <Star
                  key={star}
                  className={`w-3 h-3 ${
                    star <= Math.round(product.ratingAverage || 0)
                      ? 'fill-[#F59E0B] text-[#F59E0B]'
                      : 'fill-gray-200 text-gray-200'
                  }`}
                  strokeWidth={0}
                />
              ))}
            </div>
            <span className="text-[11px] font-semibold text-gray-400">
              ({product.ratingCount || 0})
            </span>
          </div>

          <div className="flex items-center justify-between pt-1">
            <div className="flex items-center gap-2">
              <span className="text-lg font-black text-[#111827] tracking-tight">
                NPR {minPrice.toLocaleString()}
              </span>
              {hasSale && (
                <span className="text-sm font-medium text-gray-400 line-through">
                  NPR {(maxPrice * 1.3).toFixed(0).toLocaleString()}
                </span>
              )}
            </div>

            {colors.length > 0 && (
              <div className="flex items-center gap-1">
                {colors.map((color, i) => (
                  <div
                    key={i}
                    className="w-3.5 h-3.5 rounded-full border border-gray-200 shadow-sm transition-transform duration-200 hover:scale-125"
                    style={{
                      backgroundColor:
                        color.toLowerCase() === 'white'
                          ? '#ffffff'
                          : color.toLowerCase() === 'black'
                          ? '#000000'
                          : color.toLowerCase() === 'red'
                          ? '#EF4444'
                          : color.toLowerCase() === 'blue'
                          ? '#3B82F6'
                          : color.toLowerCase() === 'green'
                          ? '#10B981'
                          : color.toLowerCase() === 'gray'
                          ? '#9CA3AF'
                          : color.toLowerCase() === 'navy'
                          ? '#1E3A5F'
                          : color.toLowerCase() === 'beige'
                          ? '#F5F5DC'
                          : color.toLowerCase().split('/')[0] || color,
                    }}
                  />
                ))}
              </div>
            )}
          </div>

          <button
            onClick={handleAddToCart}
            disabled={!firstAvailableVariant || adding}
            className="w-full mt-1 py-3 rounded-2xl bg-gradient-to-r from-[#EC4899] to-[#F472B6] text-white text-sm font-bold shadow-lg shadow-[#EC4899]/20 hover:shadow-xl hover:shadow-[#EC4899]/30 hover:-translate-y-0.5 transition-all duration-300 flex items-center justify-center gap-2 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <ShoppingBag className="w-4 h-4" strokeWidth={2.5} />
            {adding ? 'Adding...' : added ? 'Added to Cart' : firstAvailableVariant ? 'Add to Cart' : 'Out of Stock'}
          </button>
          {cartError && <p className="text-xs text-red-500 mt-2 text-center">{cartError}</p>}
        </div>
      </div>
    </div>
  );
}
