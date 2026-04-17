'use client';

import { ChevronLeft, ChevronRight } from 'lucide-react';

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

export default function Pagination({ currentPage, totalPages, onPageChange }: PaginationProps) {
  if (totalPages <= 1) return null;

  const getVisiblePages = () => {
    const maxVisible = 5;
    if (totalPages <= maxVisible) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }

    let start = Math.max(1, currentPage - 2);
    let end = start + maxVisible - 1;

    if (end > totalPages) {
      end = totalPages;
      start = Math.max(1, end - maxVisible + 1);
    }

    const pages = [];

    if (start > 1) {
      pages.push(1);
      if (start > 2) pages.push(null);
    }

    for (let i = start; i <= end; i++) {
      pages.push(i);
    }

    if (end < totalPages) {
      if (end < totalPages - 1) pages.push(null);
      pages.push(totalPages);
    }

    return pages;
  };

  const visiblePages = getVisiblePages();

  return (
    <div className="flex items-center justify-center gap-2 mt-14">
      <button
        onClick={() => onPageChange(currentPage - 1)}
        disabled={currentPage === 1}
        className="relative w-11 h-11 rounded-xl flex items-center justify-center transition-all duration-300 disabled:opacity-30 disabled:cursor-not-allowed bg-white/80 border border-gray-200 text-gray-500 hover:border-[#EC4899] hover:text-[#EC4899] hover:shadow-lg hover:shadow-[#EC4899]/10 group"
      >
        <ChevronLeft className="w-4 h-4 transition-transform duration-300 group-hover:-translate-x-0.5" />
      </button>

      <div className="flex items-center gap-1.5 bg-white/60 backdrop-blur-sm rounded-2xl border border-gray-100 shadow-sm px-1.5 py-1.5">
        {visiblePages.map((p, idx) =>
          p === null ? (
            <span key={`ellipsis-${idx}`} className="w-9 h-9 flex items-center justify-center text-sm text-gray-300 font-bold select-none">
              ...
            </span>
          ) : (
            <button
              key={p}
              onClick={() => onPageChange(p)}
              className={`
                relative w-9 h-9 rounded-xl flex items-center justify-center text-sm font-bold transition-all duration-300 select-none
                ${
                  currentPage === p
                    ? 'text-white shadow-lg scale-105'
                    : 'text-gray-500 hover:text-[#EC4899] hover:bg-[#FDF2F8]'
                }
              `}
              style={
                currentPage === p
                  ? {
                      background: 'linear-gradient(135deg, #EC4899, #F472B6, #FB7185)',
                      boxShadow: '0 4px 20px rgba(236, 72, 153, 0.35)',
                    }
                  : undefined
              }
            >
              {p}
            </button>
          )
        )}
      </div>

      <button
        onClick={() => onPageChange(currentPage + 1)}
        disabled={currentPage === totalPages}
        className="relative w-11 h-11 rounded-xl flex items-center justify-center transition-all duration-300 disabled:opacity-30 disabled:cursor-not-allowed bg-white/80 border border-gray-200 text-gray-500 hover:border-[#EC4899] hover:text-[#EC4899] hover:shadow-lg hover:shadow-[#EC4899]/10 group"
      >
        <ChevronRight className="w-4 h-4 transition-transform duration-300 group-hover:translate-x-0.5" />
      </button>
    </div>
  );
}
