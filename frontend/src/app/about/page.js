'use client';

import Link from 'next/link';
import { useTenant } from '@/context/TenantContext';
import { getAmenityIcon } from '@/lib/amenities';
import Reveal from '@/components/ui/Reveal';

function resolveImg(url) {
  if (!url) return null;
  if (url.startsWith('/uploads/') || url.startsWith('http')) return url;
  return null;
}

export default function AboutPage() {
  const { hotel } = useTenant() || {};
  const hotelName = hotel?.name || 'Grand Horizon';
  const amenities = hotel?.amenities || [];
  const cover = resolveImg(hotel?.coverImageUrl) || 'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=1600&q=85';

  return (
    <main>
      {/* Page header */}
      <section className="relative h-[42vh] min-h-[320px] flex items-center justify-center overflow-hidden">
        <img src={cover} alt={hotelName} className="absolute inset-0 w-full h-full object-cover" />
        <div className="absolute inset-0 bg-black/60" />
        <Reveal className="relative text-center text-white px-5">
          <span className="text-primary-300 text-xs font-semibold uppercase tracking-widest">Our Story</span>
          <h1 className="font-display text-4xl md:text-6xl font-semibold mt-3">About {hotelName}</h1>
        </Reveal>
      </section>

      {/* Story */}
      <section className="max-w-7xl mx-auto px-5 sm:px-8 py-20 lg:py-24">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          <Reveal>
            <span className="eyebrow mb-4">Welcome</span>
            <h2 className="font-display text-3xl md:text-4xl font-semibold text-gray-900 mt-4 mb-6 leading-tight">
              Hospitality crafted around you
            </h2>
            <p className="text-gray-600 leading-relaxed mb-5">
              {hotel?.description || `At ${hotelName}, we believe a great stay is built on the smallest details. From the moment you arrive, our team is dedicated to making you feel at home — with refined spaces, warm service, and a genuine passion for hospitality.`}
            </p>
            <p className="text-gray-500 leading-relaxed">
              Whether you're travelling for business or leisure, our rooms and amenities are designed to help you rest, recharge, and make the most of every moment.
            </p>
          </Reveal>
          <Reveal delay={120}>
            <img
              src="https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?w=900&q=85"
              alt="Hotel interior"
              className="rounded-2xl shadow-xl w-full h-[420px] object-cover"
            />
          </Reveal>
        </div>
      </section>

      {/* Stats */}
      <section className="bg-primary-50/60 py-16">
        <div className="max-w-5xl mx-auto px-5 grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
          {[
            { value: `${hotel?.starRating || 5}★`, label: 'Star Rating' },
            { value: `${hotel?.roomTypes?.length || '—'}`, label: 'Room Types' },
            { value: hotel?.avgRating ? hotel.avgRating.toFixed(1) : '4.8', label: 'Guest Rating' },
            { value: `${amenities.length || '20'}+`, label: 'Amenities' },
          ].map((s, i) => (
            <Reveal key={s.label} delay={i * 80}>
              <p className="font-display text-4xl md:text-5xl font-semibold text-primary-700">{s.value}</p>
              <p className="text-gray-500 text-xs uppercase tracking-widest mt-2">{s.label}</p>
            </Reveal>
          ))}
        </div>
      </section>

      {/* Amenities */}
      {amenities.length > 0 && (
        <section className="max-w-7xl mx-auto px-5 sm:px-8 py-20 lg:py-24">
          <Reveal className="text-center mb-12">
            <span className="eyebrow">What We Offer</span>
            <h2 className="font-display text-3xl md:text-4xl font-semibold text-gray-900 mt-4">Hotel Amenities</h2>
          </Reveal>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {amenities.map((a, i) => {
              const Icon = getAmenityIcon(a);
              return (
                <Reveal key={a} delay={(i % 8) * 60} className="flex items-center gap-3 p-4 rounded-xl border border-gray-100 hover:border-primary-200 hover:shadow-sm transition-all bg-white">
                  <span className="w-9 h-9 rounded-full bg-primary-50 flex items-center justify-center flex-shrink-0">
                    <Icon className="w-4 h-4 text-primary-600" />
                  </span>
                  <span className="text-sm font-medium text-gray-700">{a}</span>
                </Reveal>
              );
            })}
          </div>
        </section>
      )}

      {/* CTA */}
      <section className="bg-gray-950 py-20 px-5 text-center text-white">
        <Reveal>
          <h2 className="font-display text-3xl md:text-4xl font-semibold mb-4">Come stay with us</h2>
          <p className="text-gray-400 mb-8 max-w-lg mx-auto">Discover comfort and elegance at {hotelName}. Book your stay today.</p>
          <div className="flex gap-4 justify-center flex-wrap">
            <Link href="/rooms/book" className="btn-primary">Book Now</Link>
            <Link href="/contact" className="btn-outline-light">Get in Touch</Link>
          </div>
        </Reveal>
      </section>
    </main>
  );
}
