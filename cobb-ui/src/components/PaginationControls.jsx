import React, { useEffect, useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

/**
 * Reusable pagination hook for large operational ledgers and card grids.
 * Automatically resets to page 1 when `resetKey` changes and clamps if list shrinks.
 */
export function usePagination(items = [], pageSize = 60, resetKey = '') {
  const [page, setPage] = useState(1);

  useEffect(() => {
    setPage(1);
  }, [resetKey]);

  const list = Array.isArray(items) ? items : [];
  const totalItems = list.length;
  const safePageSize = Math.max(1, Number(pageSize) || 60);
  const totalPages = Math.max(1, Math.ceil(totalItems / safePageSize));
  const currentPage = Math.min(Math.max(1, page), totalPages);

  useEffect(() => {
    if (page !== currentPage) {
      setPage(currentPage);
    }
  }, [page, currentPage]);

  const startIndex = (currentPage - 1) * safePageSize;
  const endIndex = Math.min(startIndex + safePageSize, totalItems);

  const pageItems = useMemo(
    () => list.slice(startIndex, endIndex),
    [list, startIndex, endIndex]
  );

  return {
    page: currentPage,
    setPage,
    pageSize: safePageSize,
    totalItems,
    totalPages,
    startIndex,
    endIndex,
    pageItems
  };
}

/**
 * Shared accessible pagination bar for large tables/grids.
 */
export default function PaginationControls({
  page,
  totalPages,
  totalItems,
  startIndex,
  endIndex,
  onPageChange,
  darkMode = false,
  itemLabel = 'items',
  className = ''
}) {
  if (!totalItems || totalPages <= 1) return null;

  const canPrev = page > 1;
  const canNext = page < totalPages;
  const surfaceClass = darkMode
    ? 'bg-slate-900/95 border-slate-800 text-slate-300'
    : 'bg-white border-slate-200 text-slate-600';
  const btnClass = darkMode
    ? 'bg-slate-800 hover:bg-slate-700 text-slate-100 border-slate-700 disabled:opacity-40'
    : 'bg-slate-100 hover:bg-slate-200 text-slate-800 border-slate-200 disabled:opacity-40';

  return (
    <div
      className={`flex flex-wrap items-center justify-between gap-2 px-3.5 py-2.5 rounded-xl border text-xs ${surfaceClass} ${className}`}
      role="navigation"
      aria-label={`${itemLabel} pagination`}
    >
      <span className="font-medium">
        Showing <span className="font-mono font-bold">{startIndex + 1}</span>–
        <span className="font-mono font-bold">{endIndex}</span> of{' '}
        <span className="font-mono font-bold">{totalItems}</span> {itemLabel}
      </span>
      <div className="flex items-center gap-1.5">
        <button
          type="button"
          onClick={() => onPageChange(Math.max(1, page - 1))}
          disabled={!canPrev}
          className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border font-semibold transition-colors disabled:cursor-not-allowed ${btnClass}`}
        >
          <ChevronLeft className="w-3.5 h-3.5" />
          Prev
        </button>
        <span className="px-2 font-mono font-bold">
          {page} / {totalPages}
        </span>
        <button
          type="button"
          onClick={() => onPageChange(Math.min(totalPages, page + 1))}
          disabled={!canNext}
          className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border font-semibold transition-colors disabled:cursor-not-allowed ${btnClass}`}
        >
          Next
          <ChevronRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}

