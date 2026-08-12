'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { ChevronLeft, ChevronRight, Star } from 'lucide-react';

const DEFAULT_SLIDES = [
  {
    img: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=1600&q=85',
    label: 'Luxury Rooms & Suites',
  },
  {
    img: 'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?w=1600&q=85',
    label: 'World-Class Suites',
  },
  {
    img: 'https://images.unsplash.com/photo-1571896349842-33c89424de2d?w=1600&q=85',
    label: 'Rooftop Pool & Spa',
  },
  {
    img: 'https://images.unsplash.com/photo-1615460549969-36fa19521a4f?w=1600&q=85',
    label: 'Presidential Experience',
  },
  {
    img: 'https://images.unsplash.com/photo-1578683010236-d716f9a3f461?w=1600&q=85',
    label: 'Fine Dining & Bar',
  },
  {
    img: 'https://images.unsplash.com/photo-1631049307264-da0ec9d70304?w=1600&q=85',
    label: 'Elegant Interiors',
  },
];

export default function HeroSlideshow({ hotel, roomTypes = [] }) {
  const slides = DEFAULT_SLIDES;
  const [current, setCurrent] = useState(0);
  const [fading, setFading] = useState(false);

  const go = useCallback((indexOrFn) => {
    setFading(true);
    setTimeout(() => {
      setCurrent((c) => (typeof indexOrFn === 'function' ? indexOrFn(c) : indexOrFn));
      setFading(false);
    }, 300);
  }, []);

  // Auto-advance every 5s
  useEffect(() => {
    const t = setInterval(() => go((c) => (c + 1) % slides.length), 5000);
    return () => clearInterval(t);
  }, [slides.length, go]);

  const prev = () => go((c) => (c - 1 + slides.length) % slides.length);
  const next = () => go((c) => (c + 1) % slides.length);

  return (
    <section className="relative min-h-[100svh] flex items-center overflow-hidden">
      {/* Background images — all pre-loaded, faded in/out */}
      {slides.map((slide, i) => (
        <div
          key={i}
          className="absolute inset-0 transition-opacity duration-700"
          style={{ opacity: i === current && !fading ? 1 : 0, zIndex: i === current ? 1 : 0 }}
          aria-hidden={i !== current}
        >
          <img
            src={slide.img}
            alt={slide.label}
            className="w-full h-full object-cover"
            draggable={false}
          />
          <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/55 to-black/20" />
        </div>
      ))}

      {/* Content */}
      <div className="relative z-10 max-w-7xl mx-auto px-5 pt-28 pb-24 sm:px-8 w-full">
        <div className="max-w-2xl text-white animate-fade-in-up">
          {/* Slide label eyebrow */}
          <div className="inline-flex items-center gap-2 text-primary-300 text-xs font-semibold uppercase tracking-widest mb-5">
            <span className="w-8 h-px bg-primary-400" />
            {slides[current].label}
          </div>

          {hotel?.starRating && (
            <div className="flex gap-1 mb-4">
              {Array.from({ length: hotel.starRating }).map((_, i) => (
                <Star key={i} className="w-4 h-4 text-primary-400 fill-primary-400" />
              ))}
            </div>
          )}

          <h1 className="font-display text-5xl md:text-7xl font-semibold leading-[1.05] mb-5">
            {hotel?.name || 'Grand Horizon Hotel'}
          </h1>

          <p className="text-base md:text-lg text-white/75 mb-9 leading-relaxed max-w-lg">
            {hotel?.description?.slice(0, 160) ? hotel.description.slice(0, 160) + '…' : 'Experience luxury hospitality at its finest — refined rooms, warm service, and unforgettable moments.'}
          </p>

          <div className="flex flex-wrap gap-4">
            <Link href="/rooms/book" className="btn-primary text-base">
              Explore &amp; Book
            </Link>
            <Link href="/about" className="btn-outline-light text-base">
              Discover More
            </Link>
          </div>

          {hotel && (
            <div className="flex gap-10 mt-12 pt-8 border-t border-white/15">
              <div>
                <p className="font-display text-3xl font-semibold text-white">{hotel.starRating}<span className="text-lg">★</span></p>
                <p className="text-white/60 text-xs uppercase tracking-widest mt-1">Star Hotel</p>
              </div>
              <div>
                <p className="font-display text-3xl font-semibold text-white">{roomTypes.length}</p>
                <p className="text-white/60 text-xs uppercase tracking-widest mt-1">Room Types</p>
              </div>
              {hotel.startingPrice && (
                <div>
                  <p className="font-display text-3xl font-semibold text-white">₹{hotel.startingPrice.toLocaleString()}</p>
                  <p className="text-white/60 text-xs uppercase tracking-widest mt-1">Per Night</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Navigation arrows */}
      <button
        onClick={prev}
        aria-label="Previous slide"
        className="absolute left-4 top-1/2 -translate-y-1/2 z-20 bg-black/30 hover:bg-black/60 text-white rounded-full w-11 h-11 flex items-center justify-center backdrop-blur-sm transition-all hover:scale-110"
      ><ChevronLeft className="w-5 h-5" /></button>
      <button
        onClick={next}
        aria-label="Next slide"
        className="absolute right-4 top-1/2 -translate-y-1/2 z-20 bg-black/30 hover:bg-black/60 text-white rounded-full w-11 h-11 flex items-center justify-center backdrop-blur-sm transition-all hover:scale-110"
      ><ChevronRight className="w-5 h-5" /></button>

      {/* Dot indicators */}
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-20 flex gap-2 items-center">
        {slides.map((_, i) => (
          <button
            key={i}
            onClick={() => go(i)}
            aria-label={`Go to slide ${i + 1}`}
            className={`rounded-full transition-all duration-300 ${
              i === current
                ? 'w-8 h-2 bg-white'
                : 'w-2 h-2 bg-white/50 hover:bg-white/80'
            }`}
          />
        ))}
      </div>

      {/* Slide counter */}
      <div className="absolute top-6 right-6 z-20 bg-black/40 text-white text-xs font-medium px-3 py-1 rounded-full backdrop-blur-sm">
        {current + 1} / {slides.length}
      </div>
    </section>
  );
}
