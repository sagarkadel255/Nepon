'use client';

import React, { useState, useEffect, useRef } from 'react';
import { reviews as reviewsApi } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { Star, MessageSquare, Trash2, ArrowRight } from 'lucide-react';
import Link from 'next/link';
import { useGSAP } from '@gsap/react';
import gsap from 'gsap';

export default function ReviewsPage() {
  const { user } = useAuth();
  const [reviews, setReviews] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const containerRef = useRef<HTMLDivElement>(null);

  useGSAP(() => {
    if (!loading) {
      gsap.fromTo('.stagger-item', { opacity: 0, y: 30 }, { opacity: 1, y: 0, duration: 0.8, stagger: 0.1, ease: 'power3.out' });
    }
  }, { scope: containerRef, dependencies: [loading] });

  useEffect(() => {
    if (!user) return;
    reviewsApi.getMyReviews()
      .then((data) => setReviews(data.reviews || data || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [user]);

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this review?')) return;
    try {
      await reviewsApi.delete(id);
      setReviews(prev => prev.filter(r => r._id !== id));
    } catch (err: any) { alert(err.message); }
  };

  if (!user) return null;

  if (loading) return (
    <div className="min-h-screen bg-[#FFF9FA] pt-32 pb-20 flex justify-center">
      <div className="w-12 h-12 border-4 border-[#EC4899] border-t-transparent rounded-full animate-spin" />
    </div>
  );

  return (
    <div ref={containerRef} className="min-h-screen bg-[#FFF9FA] pt-32 pb-20 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl font-black text-[#111827] tracking-tight mb-10 stagger-item">My Reviews</h1>

        {reviews.length === 0 ? (
          <div className="stagger-item flex flex-col items-center justify-center shadow-[0_32px_90px_rgba(236,72,153,0.12)] rounded-[32px] bg-white/95 backdrop-blur-xl border border-white/60 p-16 text-center">
            <MessageSquare className="w-20 h-20 text-[#FBCFE8] mb-6" />
            <h2 className="text-2xl font-bold text-[#111827] mb-2">No reviews yet</h2>
            <p className="text-[#6B7280] mb-8">You haven&apos;t written any product reviews yet.</p>
            <Link href="/orders" className="inline-flex items-center justify-center gap-2 rounded-[24px] bg-gradient-to-r from-[#EC4899] to-[#F472B6] px-8 py-3.5 text-sm font-bold text-white shadow-lg shadow-[#EC4899]/20 transition hover:-translate-y-0.5">
              View My Orders <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        ) : (
          <div className="space-y-5">
            {reviews.map((review: any) => (
              <div key={review._id} className="stagger-item shadow-[0_12px_40px_rgba(236,72,153,0.08)] rounded-[24px] bg-white/90 backdrop-blur-md border border-white/60 p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-1">
                      {[1,2,3,4,5].map(i => (
                        <Star key={i} className={`w-5 h-5 ${i <= review.rating ? 'fill-[#F59E0B] text-[#F59E0B]' : 'text-gray-200'}`} />
                      ))}
                    </div>
                    <span className="text-sm font-medium text-[#6B7280] bg-gray-100 px-3 py-1 rounded-full">
                      {new Date(review.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                  <button onClick={() => handleDelete(review._id)} className="w-10 h-10 rounded-full bg-gray-50 flex items-center justify-center hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
                <p className="text-[#111827] leading-relaxed font-medium">{review.comment}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
