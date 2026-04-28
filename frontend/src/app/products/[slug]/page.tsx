'use client';

import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { products as productsApi, cart as cartApi, reviews as reviewsApi } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { Star, ShoppingBag, Shield, Truck, Minus, Plus, ChevronLeft } from 'lucide-react';
import Link from 'next/link';

export default function ProductDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const resolvedParams = React.use(params);
  const { slug } = resolvedParams;
  const { user } = useAuth();
  const [product, setProduct] = useState<any>(null);
  const [reviews, setReviews] = useState<any[]>([]);
  const [selectedVariant, setSelectedVariant] = useState<any>(null);
  const [quantity, setQuantity] = useState(1);
  const [loading, setLoading] = useState(true);
  const [addingToCart, setAddingToCart] = useState(false);
  const [activeImage, setActiveImage] = useState(0);

  useEffect(() => {
    if (slug) {
      productsApi.get(slug)
        .then((data) => {
          setProduct(data);
          if (data.variants?.length > 0) setSelectedVariant(data.variants[0]);
        })
        .catch(() => {})
        .finally(() => setLoading(false));

      reviewsApi.getProductReviews(slug)
        .then((data) => setReviews(data.reviews || data || []))
        .catch(() => {});
    }
  }, [slug]);

  const handleAddToCart = async () => {
    if (!selectedVariant) return;
    setAddingToCart(true);
    try {
      await cartApi.addItem({ productId: product._id, variantSku: selectedVariant.sku, quantity });
      alert('Added to cart!');
    } catch (err: any) { alert(err.message || 'Failed to add to cart'); }
    finally { setAddingToCart(false); }
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-8 animate-pulse container-wide">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
          <div className="aspect-square bg-muted" />
          <div className="space-y-4">
            <div className="h-8 bg-muted w-3/4" />
            <div className="h-4 bg-muted w-1/2" />
            <div className="h-10 bg-muted w-1/3" />
          </div>
        </div>
      </div>
    );
  }

  if (!product) return <div className="text-center py-20"><p className="text-gray-500">Product not found</p></div>;

  const uniqueSizes = [...new Set(product.variants?.map((v: any) => v.size))];
  const uniqueColors = [...new Set(product.variants?.map((v: any) => v.color))];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-fade-in container-wide">
      <Link href="/products" className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-primary mb-6">
        <ChevronLeft className="w-4 h-4" /> Back to products
      </Link>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
        <div>
          <div className="aspect-square bg-white border border-border overflow-hidden mb-4 card-zero-static relative">
            <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-primary/30 to-transparent z-10" />
            {product.images?.[activeImage] ? (
              <img src={product.images[activeImage].url} alt={product.images[activeImage].altText || product.title} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-gray-400">
                <ShoppingBag className="w-24 h-24" />
              </div>
            )}
          </div>
          {product.images?.length > 1 && (
            <div className="flex gap-2 mt-4">
              {product.images.map((img: any, i: number) => (
                <button key={i} onClick={() => setActiveImage(i)} className={`w-20 h-20 overflow-hidden border-2 ${activeImage === i ? 'border-primary' : 'border-border'}`}>
                  <img src={img.url} alt={img.altText} className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="panel-rich p-8">
          <h1 className="text-3xl font-bold text-secondary">{product.title}</h1>
          <div className="flex items-center gap-3 mt-3">
            <div className="flex items-center gap-1">
              {[1,2,3,4,5].map(i => (
                <Star key={i} className={`w-4 h-4 ${i <= Math.round(product.ratingAverage) ? 'fill-warning text-warning' : 'text-gray-300'}`} />
              ))}
            </div>
            <span className="text-sm text-gray-500">({product.ratingCount} reviews)</span>
          </div>

          <div className="divider-deco my-4" />

          <div className="mt-4">
            <span className="text-4xl font-bold text-primary">Rs. {selectedVariant?.price?.toLocaleString() || product.variants?.[0]?.price?.toLocaleString()}</span>
          </div>

          <p className="text-gray-600 mt-6 leading-relaxed">{product.description}</p>

          {uniqueSizes.length > 0 && (
            <div className="mt-6">
              <h3 className="text-sm font-medium text-gray-700 mb-2 uppercase tracking-wider">Size</h3>
              <div className="flex flex-wrap gap-2">
                {uniqueSizes.map((size: any) => (
                  <button key={size} onClick={() => {
                    const variant = product.variants.find((v: any) => v.size === size && v.color === (selectedVariant?.color || product.variants[0]?.color));
                    if (variant) setSelectedVariant(variant);
                  }} className={`px-5 py-2 border text-sm font-medium ${selectedVariant?.size === size ? 'border-primary bg-primary text-white' : 'border-border hover:border-primary bg-white'}`}>{size}</button>
                ))}
              </div>
            </div>
          )}

          {uniqueColors.length > 0 && (
            <div className="mt-4">
              <h3 className="text-sm font-medium text-gray-700 mb-2 uppercase tracking-wider">Color</h3>
              <div className="flex flex-wrap gap-2">
                {uniqueColors.map((color: any) => (
                  <button key={color} onClick={() => {
                    const variant = product.variants.find((v: any) => v.color === color && v.size === (selectedVariant?.size || product.variants[0]?.size));
                    if (variant) setSelectedVariant(variant);
                  }} className={`px-5 py-2 border text-sm font-medium ${selectedVariant?.color === color ? 'border-primary bg-primary text-white' : 'border-border hover:border-primary bg-white'}`}>{color}</button>
                ))}
              </div>
            </div>
          )}

          <div className="mt-6">
            <h3 className="text-sm font-medium text-gray-700 mb-2 uppercase tracking-wider">Quantity</h3>
            <div className="flex items-center gap-3">
              <button onClick={() => setQuantity(Math.max(1, quantity - 1))} className="w-10 h-10 border border-border flex items-center justify-center hover:bg-muted bg-white"><Minus className="w-4 h-4" /></button>
              <span className="font-medium text-lg w-12 text-center">{quantity}</span>
              <button onClick={() => setQuantity(Math.min(selectedVariant?.stock || 10, quantity + 1))} className="w-10 h-10 border border-border flex items-center justify-center hover:bg-muted bg-white"><Plus className="w-4 h-4" /></button>
            </div>
          </div>

          <div className="mt-8 flex gap-3">
            <button onClick={handleAddToCart} disabled={addingToCart || !selectedVariant} className="flex-1 py-4 bg-primary text-white font-semibold hover:bg-primary-dark transition-colors disabled:opacity-50 flex items-center justify-center gap-2 tracking-wide">
              <ShoppingBag className="w-5 h-5" /> {addingToCart ? 'Adding...' : 'Add to Cart'}
            </button>
          </div>

          <div className="mt-8 grid grid-cols-2 gap-4 p-4 bg-muted/30">
            <div className="flex items-center gap-2 text-sm text-gray-600"><Shield className="w-4 h-4 text-success" /><span>Secure checkout</span></div>
            <div className="flex items-center gap-2 text-sm text-gray-600"><Truck className="w-4 h-4 text-success" /><span>Order tracking</span></div>
          </div>
        </div>
      </div>

      <div className="mt-16">
        <h2 className="text-2xl font-bold text-secondary mb-6">Customer Reviews</h2>
        {reviews.length === 0 ? (
          <p className="text-gray-500">No reviews yet</p>
        ) : (
          <div className="space-y-4">
            {reviews.map((review: any) => (
              <div key={review._id} className="bg-white border border-border p-6 card-zero">
                <div className="flex items-center gap-2 mb-2">
                  {[1,2,3,4,5].map(i => (
                    <Star key={i} className={`w-4 h-4 ${i <= review.rating ? 'fill-warning text-warning' : 'text-gray-300'}`} />
                  ))}
                  <span className="text-sm text-gray-500">{review.buyerId?.displayName || 'Anonymous'}</span>
                </div>
                <p className="text-gray-600">{review.comment}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
