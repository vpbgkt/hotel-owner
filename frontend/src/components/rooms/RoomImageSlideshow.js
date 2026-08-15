'use client';

import { useState, useEffect, useCallback } from 'react';
import { ChevronLeft, ChevronRight, BedDouble, Images } from 'lucide-react';

function resolveImg(url) {
  if (!url) return null;
  if (url.startsWith('/uploads/') || url.startsWith('http')) return url;
  return null;
}

/** Small inline slideshow used inside room cards */
export function RoomCardSlideshow({ images = [], alt = 'Room image', fallback }) {
  const resolved = images.map(resolveImg).filter(Boolean);
  const srcs = resolved.length > 0 ? resolved : fallback ? [fallback] : [];
  const [current, setCurrent] = useState(0);

  if (srcs.length === 0) {
    return (
      <div className="w-full h-full bg-gray-100 flex items-center justify-center text-gray-300">
        <BedDouble className="w-10 h-10" />
      </div>
    );
  }

  const prev = (e) => { e.stopPropagation(); setCurrent((c) => (c - 1 + srcs.length) % srcs.length); };
  const next = (e) => { e.stopPropagation(); setCurrent((c) => (c + 1) % srcs.length); };

  return (
    <div className="relative w-full h-full group overflow-hidden bg-gray-100">
      <img
        key={current}
        src={srcs[current]}
        alt={`${alt} ${current + 1}`}
        className="w-full h-full object-cover transition-opacity duration-300"
      />
      {srcs.length > 1 && (
        <>
          <button onClick={prev} className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/50 text-white rounded-full w-8 h-8 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity" aria-label="Previous"><ChevronLeft className="w-4 h-4" /></button>
          <button onClick={next} className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/50 text-white rounded-full w-8 h-8 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity" aria-label="Next"><ChevronRight className="w-4 h-4" /></button>
          <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1">
            {srcs.map((_, i) => (
              <button key={i} onClick={(e) => { e.stopPropagation(); setCurrent(i); }} className={`w-1.5 h-1.5 rounded-full transition-colors ${i === current ? 'bg-white' : 'bg-white/50'}`} aria-label={`Image ${i + 1}`} />
            ))}
          </div>
          <span className="absolute top-2 right-2 bg-black/50 text-white text-xs px-2 py-0.5 rounded-full">{current + 1}/{srcs.length}</span>
        </>
      )}
    </div>
  );
}

/**
 * Full-page hero slideshow used on room detail page.
 * Shows 2 images side-by-side on desktop (like OYO), 1 on mobile.
 * Uses stacked layers + opacity transition for smooth crossfade (no white flash).
 */
export default function RoomImageSlideshow({ images = [], name = '' }) {
  const resolved = images.map(resolveImg).filter(Boolean);
  const srcs = resolved.length > 0 ? resolved : [
    'https://images.unsplash.com/photo-1631049307264-da0ec9d70304?w=1200&q=80',
    'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?w=1200&q=80',
  ];

  // Each "slide" shows 2 images (or 1 if only 1 total). On mobile we show only
  // the first of the pair. Build pairs.
  const pairs = [];
  for (let i = 0; i < srcs.length; i += 2) {
    pairs.push(srcs[i + 1] ? [srcs[i], srcs[i + 1]] : [srcs[i]]);
  }

  const [current, setCurrent] = useState(0);

  const go = useCallback((indexOrFn) => {
    setCurrent((c) => {
      const next = typeof indexOrFn === 'function' ? indexOrFn(c) : indexOrFn;
      return ((next % pairs.length) + pairs.length) % pairs.length;
    });
  }, [pairs.length]);

  // Auto-advance every 5 seconds
  useEffect(() => {
    if (pairs.length < 2) return;
    const t = setInterval(() => go((c) => c + 1), 5000);
    return () => clearInterval(t);
  }, [pairs.length, go]);

  const prev = () => go((c) => c - 1);
  const next = () => go((c) => c + 1);

  return (
    <div className="relative w-full overflow-hidden bg-gray-900 select-none" style={{ height: 'min(60vh, 640px)', minHeight: '320px' }}>
      {/* Stacked slide layers — smooth crossfade, no white flash */}
      {pairs.map((pair, i) => (
        <div
          key={i}
          className="absolute inset-0 transition-opacity duration-700 ease-in-out"
          style={{ opacity: i === current ? 1 : 0, zIndex: i === current ? 2 : 1 }}
          aria-hidden={i !== current}
        >
          {pair.length === 2 ? (
            /* 2-image split layout */
            <div className="w-full h-full flex">
              <div className="w-full md:w-[55%] h-full relative flex-shrink-0">
                <img src={pair[0]} alt={`${name} — photo ${i * 2 + 1}`} className="w-full h-full object-cover" draggable={false} />
              </div>
              <div className="hidden md:block md:w-[45%] h-full relative border-l-2 border-white/10">
                <img src={pair[1]} alt={`${name} — photo ${i * 2 + 2}`} className="w-full h-full object-cover" draggable={false} />
              </div>
            </div>
          ) : (
            /* Single image */
            <img src={pair[0]} alt={`${name} — photo ${i * 2 + 1}`} className="w-full h-full object-cover" draggable={false} />
          )}
        </div>
      ))}

      {/* Dark gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-black/20 pointer-events-none z-[3]" />

      {/* Prev / Next */}
      {pairs.length > 1 && (
        <>
          <button onClick={prev} aria-label="Previous image" className="absolute left-4 top-1/2 -translate-y-1/2 z-10 bg-black/40 hover:bg-black/70 text-white rounded-full w-11 h-11 flex items-center justify-center backdrop-blur-sm transition-all hover:scale-110"><ChevronLeft className="w-5 h-5" /></button>
          <button onClick={next} aria-label="Next image" className="absolute right-4 top-1/2 -translate-y-1/2 z-10 bg-black/40 hover:bg-black/70 text-white rounded-full w-11 h-11 flex items-center justify-center backdrop-blur-sm transition-all hover:scale-110"><ChevronRight className="w-5 h-5" /></button>
        </>
      )}

      {/* Dot indicators */}
      {pairs.length > 1 && (
        <div className="absolute bottom-5 left-1/2 -translate-x-1/2 z-10 flex gap-2">
          {pairs.map((_, i) => (
            <button key={i} onClick={() => go(i)} aria-label={`Photos ${i * 2 + 1}–${i * 2 + 2}`} className={`rounded-full transition-all duration-300 ${i === current ? 'bg-white w-7 h-2.5' : 'bg-white/50 hover:bg-white/80 w-2.5 h-2.5'}`} />
          ))}
        </div>
      )}

      {/* Counter + View all */}
      <div className="absolute top-4 right-4 z-10 flex items-center gap-2">
        <span className="bg-black/50 text-white text-xs font-medium px-3 py-1 rounded-full backdrop-blur-sm">
          {current * 2 + 1}–{Math.min(current * 2 + 2, srcs.length)} / {srcs.length}
        </span>
        <span className="bg-black/50 text-white text-xs font-medium px-3 py-1 rounded-full backdrop-blur-sm flex items-center gap-1.5">
          <Images className="w-3.5 h-3.5" /> {srcs.length} Photos
        </span>
      </div>
    </div>
  );
}
