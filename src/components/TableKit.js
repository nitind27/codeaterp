'use client';

import { useEffect, useState } from 'react';

export function usePageSlice(items, pageSize = 8, resetKey = '') {
  const [page, setPage] = useState(1);

  useEffect(() => {
    setPage(1);
  }, [resetKey]);

  const total = items?.length || 0;
  const pages = Math.max(1, Math.ceil(total / pageSize));
  const safe = Math.min(page, pages);
  const start = (safe - 1) * pageSize;
  const rows = (items || []).slice(start, start + pageSize);

  return { page: safe, pages, rows, setPage, total, from: total ? start + 1 : 0, to: Math.min(start + pageSize, total) };
}

export function Pager({ page, pages, total, from, to, setPage }) {
  if (!total) return null;
  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-4 py-3 border-t border-white/10">
      <p className="text-xs text-codeat-gray">
        Showing {from}–{to} of {total}
      </p>
      <div className="flex items-center gap-2">
        <button
          type="button"
          disabled={page <= 1}
          onClick={() => setPage(page - 1)}
          className="px-3 py-1.5 rounded-lg bg-white/5 text-sm text-codeat-silver disabled:opacity-40 hover:bg-white/10"
        >
          Prev
        </button>
        <span className="text-xs text-codeat-gray min-w-[72px] text-center">
          {page} / {pages}
        </span>
        <button
          type="button"
          disabled={page >= pages}
          onClick={() => setPage(page + 1)}
          className="px-3 py-1.5 rounded-lg bg-white/5 text-sm text-codeat-silver disabled:opacity-40 hover:bg-white/10"
        >
          Next
        </button>
      </div>
    </div>
  );
}
