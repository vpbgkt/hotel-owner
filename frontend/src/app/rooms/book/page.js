import { serverHotelsApi } from '@/lib/serverApi';
import Link from 'next/link';
import Reveal from '@/components/ui/Reveal';
import { MapPin, Users, BedDouble, Ruler, Phone, Mail, Star, BedSingle, ArrowRight } from 'lucide-react';

const FALLBACK_ROOM_IMGS = [
  'https://images.unsplash.com/photo-1631049307264-da0ec9d70304?w=800&q=80',
  'https://images.unsplash.com/photo-1578683010236-d716f9a3f461?w=800&q=80',
  'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?w=800&q=80',
  'https://images.unsplash.com/photo-1596394516093-501ba68a0ba6?w=800&q=80',
];

export async function generateMetadata() {
  try {
    const res = await serverHotelsApi.getFeatured(1);
    const data = res.data ?? res ?? [];
    const arr = Array.isArray(data) ? data : [];
    const hotel = arr[0];
    return {
      title: `Rooms & Booking — ${hotel?.name || 'Hotel'}`,
      description: `Browse all room types and book your stay at ${hotel?.name || 'our hotel'}.`,
    };
  } catch {
    return { title: 'Rooms & Booking' };
  }
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

export default async function RoomsBookPage() {
  const hotel = await getHotelData();
  const roomTypes = hotel?.roomTypes || [];

  return (
    <main className="bg-white">
      {/* ── Page Header ──────────────────────────────────────────────── */}
      <section className="bg-primary-50/60 border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-5 sm:px-8 pt-28 pb-14 lg:pt-32 lg:pb-16">
          <Reveal>
            <div className="flex items-center gap-2 text-xs text-gray-400 mb-5">
              <Link href="/" className="hover:text-primary-600 transition-colors">Home</Link>
              <span>/</span>
              <span className="text-gray-600 font-medium">Rooms &amp; Booking</span>
            </div>

            <span className="eyebrow mb-4">Accommodations</span>
            <h1 className="font-display text-4xl md:text-5xl font-semibold text-gray-900 mt-4 mb-4 leading-tight">
              {hotel?.name || 'Our Rooms'}
            </h1>

            {hotel && (
              <div className="flex flex-wrap items-center gap-4 text-sm text-gray-500">
                <span className="flex items-center gap-1.5">
                  <MapPin className="w-4 h-4 text-primary-600" />
                  {hotel.address}, {hotel.city}, {hotel.state}
                </span>
                {hotel.starRating && (
                  <span className="flex items-center gap-0.5">
                    {Array.from({ length: hotel.starRating }).map((_, i) => (
                      <Star key={i} className="w-4 h-4 text-primary-500 fill-primary-500" />
                    ))}
                  </span>
                )}
              </div>
            )}

            {hotel?.description && (
              <p className="text-gray-600 mt-5 max-w-2xl leading-relaxed">{hotel.description}</p>
            )}

            {hotel?.amenities?.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-6">
                {hotel.amenities.map((a) => (
                  <span key={a} className="text-xs px-3.5 py-1.5 bg-white text-primary-700 rounded-full font-medium border border-primary-100">
                    {a}
                  </span>
                ))}
              </div>
            )}
          </Reveal>
        </div>
      </section>

      {/* ── Room Types Grid ─────────────────────────────────────────── */}
      <section className="max-w-7xl mx-auto px-5 sm:px-8 py-16 lg:py-20">
        {roomTypes.length === 0 ? (
          <Reveal className="text-center py-24 text-gray-400">
            <BedSingle className="w-14 h-14 mx-auto mb-4 text-gray-300" />
            <p className="text-lg text-gray-600 font-medium">No rooms available at the moment.</p>
            <p className="text-sm mt-1">Please check back soon or contact us directly.</p>
          </Reveal>
        ) : (
          <>
            <Reveal className="flex items-center justify-between mb-10">
              <h2 className="font-display text-2xl font-semibold text-gray-900">
                {roomTypes.length} Room Type{roomTypes.length !== 1 ? 's' : ''} Available
              </h2>
            </Reveal>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-7">
              {roomTypes.map((rt, i) => {
                const img = rt.images?.[0] || FALLBACK_ROOM_IMGS[i % FALLBACK_ROOM_IMGS.length];
                return (
                  <Reveal key={rt.id} delay={(i % 3) * 100}>
                    <Link
                      href={`/rooms/${rt.id}`}
                      className="group bg-white rounded-2xl shadow-sm hover:shadow-xl transition-all duration-300 overflow-hidden border border-gray-100 flex flex-col h-full"
                    >
                      {/* Image */}
                      <div className="relative h-56 overflow-hidden flex-shrink-0">
                        <img
                          src={img}
                          alt={rt.name}
                          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                        />
                        {rt.basePriceHourly && (
                          <span className="absolute top-3 right-3 bg-white/95 backdrop-blur text-primary-700 text-xs font-semibold px-3 py-1 rounded-full shadow-sm">
                            Hourly available
                          </span>
                        )}
                      </div>

                      {/* Content */}
                      <div className="p-6 flex flex-col flex-1">
                        <h3 className="font-display font-semibold text-gray-900 text-xl mb-2">{rt.name}</h3>

                        {/* Quick facts */}
                        <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-500 mb-4">
                          {rt.maxGuests && (
                            <span className="flex items-center gap-1.5">
                              <Users className="w-3.5 h-3.5 text-primary-600" /> Up to {rt.maxGuests} guests
                            </span>
                          )}
                          {rt.bedType && (
                            <span className="flex items-center gap-1.5">
                              <BedDouble className="w-3.5 h-3.5 text-primary-600" /> {rt.bedType}
                            </span>
                          )}
                          {rt.areaSqFt && (
                            <span className="flex items-center gap-1.5">
                              <Ruler className="w-3.5 h-3.5 text-primary-600" /> {rt.areaSqFt} sq ft
                            </span>
                          )}
                        </div>

                        {rt.description && (
                          <p className="text-gray-500 text-sm line-clamp-2 mb-4 flex-1">{rt.description}</p>
                        )}

                        {/* Amenities preview */}
                        {rt.amenities?.length > 0 && (
                          <div className="flex flex-wrap gap-1.5 mb-5">
                            {rt.amenities.slice(0, 4).map((a) => (
                              <span key={a} className="text-xs bg-gray-50 text-gray-600 px-2.5 py-1 rounded-full">{a}</span>
                            ))}
                            {rt.amenities.length > 4 && (
                              <span className="text-xs text-gray-400 px-1 py-1">+{rt.amenities.length - 4} more</span>
                            )}
                          </div>
                        )}

                        {/* Pricing */}
                        <div className="flex justify-between items-center pt-4 border-t border-gray-100 mt-auto">
                          <div>
                            <span className="font-display text-2xl font-semibold text-primary-700">
                              ₹{rt.basePriceDaily?.toLocaleString()}
                            </span>
                            <span className="text-gray-400 text-sm"> /night</span>
                            {rt.basePriceHourly && (
                              <p className="text-xs text-gray-400 mt-0.5">₹{rt.basePriceHourly?.toLocaleString()}/hour</p>
                            )}
                          </div>
                          <span className="flex items-center gap-1.5 text-sm font-semibold text-white bg-primary-600 group-hover:bg-primary-700 transition-colors px-4 py-2.5 rounded-full">
                            Book Now <ArrowRight className="w-3.5 h-3.5" />
                          </span>
                        </div>
                      </div>
                    </Link>
                  </Reveal>
                );
              })}
            </div>
          </>
        )}

        {/* Hotel contact info */}
        {hotel && (hotel.phone || hotel.email) && (
          <Reveal className="mt-16 p-7 sm:p-8 bg-primary-50/60 rounded-2xl border border-primary-100">
            <h3 className="font-display text-lg font-semibold text-gray-900 mb-4">Need help with your booking?</h3>
            <div className="flex flex-wrap gap-6 text-sm text-gray-700">
              {hotel.phone && (
                <a href={`tel:${hotel.phone}`} className="flex items-center gap-2.5 hover:text-primary-700 transition-colors">
                  <Phone className="w-4 h-4 text-primary-600" /> {hotel.phone}
                </a>
              )}
              {hotel.email && (
                <a href={`mailto:${hotel.email}`} className="flex items-center gap-2.5 hover:text-primary-700 transition-colors">
                  <Mail className="w-4 h-4 text-primary-600" /> {hotel.email}
                </a>
              )}
            </div>
          </Reveal>
        )}
      </section>
    </main>
  );
}
