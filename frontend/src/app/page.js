import Link from 'next/link';
import { serverHotelsApi } from '@/lib/serverApi';
import HeroSlideshow from '@/components/ui/HeroSlideshow';
import Reveal from '@/components/ui/Reveal';

export const metadata = { title: 'Grand Horizon Hotel — Luxury Stays', description: 'Book your perfect stay. Luxury rooms, world-class amenities, and unbeatable hospitality.' };

const FALLBACK_ROOM_IMGS = [
  'https://images.unsplash.com/photo-1631049307264-da0ec9d70304?w=800&q=80',
  'https://images.unsplash.com/photo-1578683010236-d716f9a3f461?w=800&q=80',
  'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?w=800&q=80',
];

// /uploads/... paths are proxied through Next.js rewrites (next.config.js)
function resolveImg(url) {
  if (!url) return null;
  if (url.startsWith('/uploads/') || url.startsWith('http')) return url;
  return null;
}

async function getHotelData() {
  try {
    const res = await serverHotelsApi.getFeatured(1);
    const data = res.data ?? res ?? [];
    const arr = Array.isArray(data) ? data : [];
    return arr[0] || null;
  } catch {
    return null;
  }
}

export default async function HomePage() {
  const firstHotel = await getHotelData();
  const roomTypes = firstHotel?.roomTypes || [];
  const hotelName = firstHotel?.name || 'Grand Horizon';
  const amenities = firstHotel?.amenities || [];
  const nearbyPlaces = firstHotel?.themeConfig?.nearbyPlaces?.filter(p => p.name) || [];

  return (
    <main>
      {/* ── Hero Slideshow ───────────────────────────────────────────── */}
      <HeroSlideshow hotel={firstHotel} roomTypes={roomTypes} />

      {/* ── About / Welcome ──────────────────────────────────────────── */}
      <section className="max-w-7xl mx-auto px-5 sm:px-8 py-20 lg:py-28">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          <Reveal className="relative">
            <img
              src={resolveImg(firstHotel?.coverImageUrl) || 'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=900&q=85'}
              alt={hotelName}
              className="rounded-2xl shadow-xl w-full h-[420px] object-cover"
            />
            <div className="hidden sm:block absolute -bottom-6 -right-6 bg-primary-600 text-white rounded-2xl px-8 py-6 shadow-lg">
              <p className="font-display text-4xl font-semibold">{firstHotel?.starRating || 5}★</p>
              <p className="text-xs uppercase tracking-widest text-white/80 mt-1">Rated Excellence</p>
            </div>
          </Reveal>
          <Reveal delay={120}>
            <span className="eyebrow mb-4">Welcome</span>
            <h2 className="font-display text-4xl md:text-5xl font-semibold text-gray-900 mt-4 mb-6 leading-tight">
              A refined stay at {hotelName}
            </h2>
            <p className="text-gray-600 leading-relaxed mb-5">
              {firstHotel?.description || 'Nestled in the heart of the city, our hotel blends timeless elegance with modern comfort. Every detail is crafted to make your stay effortless, memorable, and truly restful.'}
            </p>
            <p className="text-gray-500 leading-relaxed mb-8">
              From thoughtfully designed rooms to warm, attentive service, we bring hospitality to life the way it was meant to be.
            </p>
            <Link href="/about" className="btn-secondary">Learn More About Us</Link>
          </Reveal>
        </div>
      </section>

      {/* ── Room Types ───────────────────────────────────────────────── */}
      {roomTypes.length > 0 && (
        <section className="bg-primary-50/60 py-20 lg:py-28">
          <div className="max-w-7xl mx-auto px-5 sm:px-8">
            <Reveal className="text-center mb-14">
              <span className="eyebrow">Accommodations</span>
              <h2 className="font-display text-4xl md:text-5xl font-semibold text-gray-900 mt-4 mb-3">Rooms &amp; Suites</h2>
              <p className="text-gray-500 max-w-xl mx-auto">Choose your perfect accommodation from our curated selection of rooms and suites.</p>
            </Reveal>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-7">
              {roomTypes.map((rt, i) => {
                let imagesArr = rt.images;
                if (typeof imagesArr === 'string') {
                  try { imagesArr = JSON.parse(imagesArr); } catch (e) {}
                }
                const img = resolveImg(Array.isArray(imagesArr) ? imagesArr[0] : null) || FALLBACK_ROOM_IMGS[i % FALLBACK_ROOM_IMGS.length];
                return (
                  <Reveal key={rt.id} delay={i * 90}>
                    <Link href={`/rooms/${rt.id}`} className="group bg-white rounded-2xl shadow-sm hover:shadow-xl transition-all duration-300 overflow-hidden border border-gray-100 block">
                      <div className="h-56 overflow-hidden relative">
                        <img src={img} alt={rt.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                        <span className="absolute top-3 left-3 text-xs bg-white/90 backdrop-blur text-primary-700 px-3 py-1 rounded-full font-medium shadow-sm">
                          Sleeps {rt.maxGuests}
                        </span>
                      </div>
                      <div className="p-5">
                        <h3 className="font-display font-semibold text-gray-900 text-xl">{rt.name}</h3>
                        <p className="text-gray-500 text-sm mt-1.5 line-clamp-2">{rt.description || `Comfortable stay for up to ${rt.maxGuests} guests`}</p>
                        <div className="flex justify-between items-center mt-4 pt-4 border-t border-gray-100">
                          <div>
                            <span className="text-primary-700 font-bold text-xl">₹{rt.basePriceDaily?.toLocaleString()}</span>
                            <span className="text-gray-400 text-sm"> /night</span>
                          </div>
                          <span className="text-sm text-primary-600 font-medium group-hover:translate-x-1 transition-transform">View →</span>
                        </div>
                      </div>
                    </Link>
                  </Reveal>
                );
              })}
            </div>
            <Reveal className="text-center mt-12">
              <Link href="/rooms/book" className="btn-primary">View All Rooms &amp; Book</Link>
            </Reveal>
          </div>
        </section>
      )}

      {/* ── Why Choose Us ─────────────────────────────────────────────── */}
      <section className="max-w-7xl mx-auto px-5 sm:px-8 py-20 lg:py-28">
        <Reveal className="text-center mb-14">
          <span className="eyebrow">Why {hotelName}</span>
          <h2 className="font-display text-4xl md:text-5xl font-semibold text-gray-900 mt-4 mb-3">Everything for the perfect stay</h2>
          <p className="text-gray-500 max-w-xl mx-auto">Thoughtful amenities and services designed around your comfort.</p>
        </Reveal>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {[
            { img: 'https://images.unsplash.com/photo-1601924994987-69e26d50dc26?w=500&q=80', title: 'Award-Winning', desc: 'Recognized for outstanding hospitality year after year.' },
            { img: 'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=500&q=80', title: 'Fine Dining', desc: 'In-house restaurants serving authentic and international cuisine.' },
            { img: 'https://images.unsplash.com/photo-1544161515-4ab6ce6db874?w=500&q=80', title: 'Spa & Wellness', desc: 'Full-service spa with rejuvenating treatments and therapies.' },
            { img: 'https://images.unsplash.com/photo-1500375592092-40eb2168fd21?w=500&q=80', title: 'Prime Location', desc: 'Easy access to shopping, dining, and business hubs.' },
          ].map((item, i) => (
            <Reveal key={item.title} delay={i * 90} className="text-center p-8 rounded-2xl border border-gray-100 hover:border-primary-200 hover:shadow-md transition-all bg-white">
              <div className="w-16 h-16 mx-auto rounded-full overflow-hidden mb-5 ring-4 ring-primary-50">
                <img src={item.img} alt={item.title} className="w-full h-full object-cover" />
              </div>
              <h3 className="font-display font-semibold text-gray-900 text-lg mb-2">{item.title}</h3>
              <p className="text-gray-500 text-sm leading-relaxed">{item.desc}</p>
            </Reveal>
          ))}
        </div>

        {amenities.length > 0 && (
          <Reveal className="flex flex-wrap justify-center gap-2.5 mt-12">
            {amenities.slice(0, 10).map((a) => (
              <span key={a} className="text-sm bg-primary-50 text-primary-700 px-4 py-1.5 rounded-full font-medium">{a}</span>
            ))}
          </Reveal>
        )}
      </section>

      {/* ── Nearby Places ─────────────────────────────────────────────── */}
      {nearbyPlaces.length > 0 && (
        <section className="bg-primary-50/60 py-20 lg:py-28">
          <div className="max-w-7xl mx-auto px-5 sm:px-8">
            <Reveal className="text-center mb-14">
              <span className="eyebrow">Explore the Area</span>
              <h2 className="font-display text-4xl md:text-5xl font-semibold text-gray-900 mt-4 mb-3">Nearby Places</h2>
              <p className="text-gray-500 max-w-xl mx-auto">Popular attractions and landmarks just a short distance from {hotelName}.</p>
            </Reveal>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {nearbyPlaces.map((place, i) => (
                <Reveal key={i} delay={(i % 4) * 80} className="bg-white rounded-2xl overflow-hidden border border-gray-100 hover:shadow-md transition-shadow">
                  <div className="h-40 bg-gray-100 overflow-hidden">
                    <img
                      src={resolveImg(place.image) || `https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?w=500&q=80`}
                      alt={place.name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="p-4">
                    <h3 className="font-semibold text-gray-900 text-base">{place.name}</h3>
                    {place.distance && (
                      <p className="text-primary-600 text-sm font-medium mt-1">{place.distance}</p>
                    )}
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ── CTA Banner ──────────────────────────────────────────────── */}
      <section className="relative py-24 px-5 overflow-hidden">
        <img
          src="https://images.unsplash.com/photo-1571896349842-33c89424de2d?w=1600&q=85"
          alt=""
          className="absolute inset-0 w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-black/80 to-black/50" />
        <Reveal className="relative max-w-3xl mx-auto text-center text-white">
          <span className="text-primary-300 text-xs font-semibold uppercase tracking-widest">Reserve Today</span>
          <h2 className="font-display text-4xl md:text-5xl font-semibold my-5">Ready for your perfect stay?</h2>
          <p className="text-white/80 text-lg mb-9">Book now and experience unparalleled comfort and hospitality at {hotelName}.</p>
          <div className="flex gap-4 justify-center flex-wrap">
            <Link href="/rooms/book" className="btn-primary text-base">Book Now</Link>
            <Link href="/contact" className="btn-outline-light text-base">Contact Us</Link>
          </div>
        </Reveal>
      </section>
    </main>
  );
}
