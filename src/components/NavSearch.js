'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';

export default function NavSearch() {
  const router = useRouter();
  const box = useRef(null);
  const [query, setQuery] = useState('');
  const [hits, setHits] = useState([]);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const term = query.trim();
    if (term.length < 2) { setHits([]); setOpen(false); return; }
    const timer = setTimeout(async () => {
      try {
        const token = localStorage.getItem('token');
        const res = await fetch(`/api/employees?search=${encodeURIComponent(term)}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        setHits((data.employees || []).slice(0, 8));
        setOpen(true);
      } catch {
        setHits([]);
      }
    }, 250);
    return () => clearTimeout(timer);
  }, [query]);

  useEffect(() => {
    const close = (event) => {
      if (box.current && !box.current.contains(event.target)) setOpen(false);
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, []);

  const openProfile = (person) => {
    setOpen(false);
    setQuery('');
    router.push(`/employees/${person.id}`);
  };

  return (
    <div ref={box} className="relative min-w-0 flex-1 md:max-w-xs">
      <svg className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#7fd4e4]/60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="m21 21-4.35-4.35M11 19a8 8 0 100-16 8 8 0 000 16z" />
      </svg>
      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onFocus={() => hits.length && setOpen(true)}
        placeholder="Email or phone"
        className="w-full rounded-lg border border-[#7fd4e4]/20 bg-[#05080c] py-1.5 pl-8 pr-3 text-[13px] text-white outline-none placeholder:text-[#8d949b] focus:border-[#7fd4e4]"
      />
      {open && (
        <div className="absolute left-0 right-0 top-[calc(100%+6px)] z-50 overflow-hidden rounded-2xl border border-[#7fd4e4]/20 bg-[#070b10] shadow-2xl">
          {hits.length === 0 ? (
            <p className="px-4 py-3 text-xs text-[#9aa3ab]">No student matches that email or phone.</p>
          ) : hits.map((person) => (
            <button key={person.id} type="button" onClick={() => openProfile(person)}
              className="flex w-full items-center gap-3 border-b border-white/5 px-3 py-2.5 text-left last:border-0 hover:bg-[#1c3d66]/40">
              <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center overflow-hidden rounded-lg bg-gradient-to-br from-[#1c3d66] to-[#7fd4e4] text-xs font-bold text-white">
                {person.avatar ? <img src={person.avatar} alt="" className="h-full w-full object-cover" /> : (person.fullName || '?').charAt(0)}
              </span>
              <span className="min-w-0">
                <span className="block truncate text-sm font-semibold text-[#f4f7f8]">{person.fullName}</span>
                <span className="block truncate text-[11px] text-[#9aa3ab]">{person.email}{person.phone ? ` · ${person.phone}` : ''}</span>
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
