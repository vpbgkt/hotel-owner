import { serverRoomsApi } from '@/lib/serverApi';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import BookingWidget from '@/components/booking/BookingWidget';
import MobileBookingBar from '@/components/booking/MobileBookingBar';
import RoomImageSlideshow from '@/components/rooms/RoomImageSlideshow';
import Reveal from '@/components/ui/Reveal';
import { getAmenityIcon } from '@/lib/amenities';
import { Users, Ruler, BedDouble, Home, Clock, UserPlus, CigaretteOff, ShieldCheck } from 'lucide-react';

// Fetches live room data from the backend API — not reachable during
// `docker build`. Render at runtime instead of build-time prerendering.
export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }) {
  const { id } = await params;
  try {
    const res = await serverRoomsApi.getTypeById(id);
    const rt = res.data;
    return {
      title: `${rt.name} — ${rt.hotel?.name || 'Hotel'}`,
      description: rt.description?.slice(0, 160) || `Book ${rt.name} starting at ₹${rt.basePriceDaily}/night.`,
    };
  } catch {
    return { title: 'Room Not Found' };
  }
}

export default async function RoomDetailPage({ params }) {
  const { id } = await params;

  let roomType = null;
  try {
    const res = await serverRoomsApi.getTypeById(id);
    roomType = res.data;
  } catch {
    notFound();
  }

  if (!roomType) notFound();

  const hotel = roomType.hotel;
  let imagesArr = roomType.images;
  if (typeof imagesArr === 'string') {
    try { imagesArr = JSON.parse(imagesArr); } catch (e) { }
  }
  const images = Array.isArray(imagesArr) ? imagesArr.filter(Boolean) : [];

  return (
    <main className="pb-24 lg:pb-0 bg-white">
      {/* ── Image Slideshow ───────────────────────────────────────── */}
      <div className="relative">
        <RoomImageSlideshow images={images} name={roomType.name} />
        {/* Breadcrumb overlay */}
        <div className="absolute top-5 left-4 sm:left-6 z-20 flex items-center gap-2 text-xs sm:text-sm text-white/90 bg-black/40 backdrop-blur px-3.5 py-1.5 rounded-full">
          <Link href="/" className="hover:text-white transition-colors">Home</Link>
          <span className="text-white/40">/</span>
          {hotel && <span className="hover:text-white transition-colors">{hotel.name}</span>}
          {hotel && <span className="text-white/40">/</span>}
          <span className="font-medium text-white">{roomType.name}</span>
        </div>
      </div>

      {/* ── Content ───────────────────────────────────────────────── */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-10 lg:py-14">
        <div className="lg:grid lg:grid-cols-3 lg:gap-12">

          {/* Left: Details */}
          <div className="lg:col-span-2 space-y-10">
            {/* Header */}
            <Reveal className="pb-8 border-b border-gray-100">
              <div className="flex items-start justify-between flex-wrap gap-4">
                <div>
                  {hotel && (
                    <p className="eyebrow mb-3">{hotel.name}</p>
                  )}
                  <h1 className="font-display text-3xl md:text-5xl font-semibold text-gray-900 leading-tight">{roomType.name}</h1>
                  {roomType.description && (
                    <p className="text-gray-500 mt-3 max-w-xl leading-relaxed line-clamp-2">{roomType.description}</p>
                  )}
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="font-display text-3xl md:text-4xl font-semibold text-primary-700">₹{roomType.basePriceDaily?.toLocaleString()}</p>
                  <p className="text-gray-400 text-sm mt-0.5">per night</p>
                  {roomType.basePriceHourly && (
                    <p className="text-gray-500 text-sm mt-1.5 border-t border-gray-100 pt-1.5">₹{roomType.basePriceHourly?.toLocaleString()} / hour</p>
                  )}
                </div>
              </div>
            </Reveal>

            {/* Quick Facts */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {[
                { label: 'Max Guests', value: roomType.maxGuests, Icon: Users },
                { label: 'Room Size', value: roomType.areaSqFt ? `${roomType.areaSqFt} sq ft` : 'Spacious', Icon: Ruler },
                { label: 'Bed Type', value: roomType.bedType || 'King/Twin', Icon: BedDouble },
                { label: 'Total Rooms', value: roomType.totalRooms, Icon: Home },
              ].map((f, i) => (
                <Reveal key={f.label} delay={i * 80} className="rounded-2xl border border-gray-100 p-5 text-center hover:border-primary-200 hover:shadow-sm transition-all">
                  <div className="w-11 h-11 mx-auto rounded-full bg-primary-50 flex items-center justify-center mb-3">
                    <f.Icon className="w-5 h-5 text-primary-600" />
                  </div>
                  <p className="font-semibold text-gray-900 text-sm">{f.value}</p>
                  <p className="text-gray-400 text-xs mt-1 uppercase tracking-wide">{f.label}</p>
                </Reveal>
              ))}
            </div>

            {/* Description */}
            {roomType.description && (
              <Reveal>
                <span className="eyebrow mb-4">The Room</span>
                <h2 className="font-display text-2xl font-semibold text-gray-900 mt-3 mb-4">About this Room</h2>
                <p className="text-gray-600 leading-relaxed whitespace-pre-line">{roomType.description}</p>
              </Reveal>
            )}

            {/* Amenities */}
            {roomType.amenities?.length > 0 && (
              <Reveal>
                <span className="eyebrow mb-4">Comforts</span>
                <h2 className="font-display text-2xl font-semibold text-gray-900 mt-3 mb-5">Room Amenities</h2>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {roomType.amenities.map((a) => {
                    const Icon = getAmenityIcon(a);
                    return (
                      <div key={a} className="flex items-center gap-2.5 text-sm text-gray-700 bg-gray-50 rounded-xl px-3.5 py-2.5">
                        <Icon className="w-4 h-4 text-primary-600 flex-shrink-0" />
                        <span className="font-medium">{a}</span>
                      </div>
                    );
                  })}
                </div>
              </Reveal>
            )}

            {/* Policies */}
            <Reveal className="rounded-2xl p-6 sm:p-7 border border-primary-100 bg-primary-50/50">
              <span className="eyebrow mb-3">Good to Know</span>
              <h2 className="font-display text-xl font-semibold text-gray-900 mt-2 mb-4">Policies</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm text-gray-700">
                <div className="flex items-center gap-2.5">
                  <Clock className="w-4 h-4 text-primary-600 flex-shrink-0" />
                  <span>Check-in from <strong className="text-gray-900">{hotel?.checkInTime || '2:00 PM'}</strong></span>
                </div>
                <div className="flex items-center gap-2.5">
                  <Clock className="w-4 h-4 text-primary-600 flex-shrink-0" />
                  <span>Check-out by <strong className="text-gray-900">{hotel?.checkOutTime || '11:00 AM'}</strong></span>
                </div>
                {roomType.maxExtraGuests > 0 && (
                  <div className="flex items-center gap-2.5">
                    <UserPlus className="w-4 h-4 text-primary-600 flex-shrink-0" />
                    <span>Extra guests allowed (+₹{roomType.extraGuestCharge?.toLocaleString()}/person)</span>
                  </div>
                )}
                <div className="flex items-center gap-2.5">
                  <CigaretteOff className="w-4 h-4 text-primary-600 flex-shrink-0" />
                  <span>No smoking on premises</span>
                </div>
                <div className="flex items-start gap-2.5 sm:col-span-2">
                  <ShieldCheck className="w-4 h-4 text-primary-600 flex-shrink-0 mt-0.5" />
                  <span>Guests aged 18 years and above are considered adults and will be charged as extra guests</span>
                </div>
              </div>
            </Reveal>

            {/* More images below fold on mobile */}
          </div>

          {/* Right: Booking Widget */}
          <div className="hidden lg:block">
            <div className="sticky top-24">
              {hotel ? (
                <BookingWidget hotel={hotel} roomTypes={[roomType]} />
              ) : (
                <div className="card p-6">
                  <p className="text-lg font-bold text-gray-900 mb-2">₹{roomType.basePriceDaily?.toLocaleString()}<span className="text-sm font-normal text-gray-400">/night</span></p>
                  <Link href="/rooms/book" className="btn-primary w-full text-center block mt-4">
                    Book This Room
                  </Link>
                </div>
              )}
            </div>
          </div>

          {/* Mobile: Booking Widget inline (anchor target for sticky bar) */}
          <div id="booking-widget" className="lg:hidden mt-10">
            {hotel ? (
              <BookingWidget hotel={hotel} roomTypes={[roomType]} />
            ) : (
              <div className="card p-6">
                <p className="text-lg font-bold text-gray-900 mb-2">₹{roomType.basePriceDaily?.toLocaleString()}<span className="text-sm font-normal text-gray-400">/night</span></p>
                <Link href="/rooms/book" className="btn-primary w-full text-center block mt-4">
                  Book This Room
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Mobile Sticky Bar */}
      <MobileBookingBar minPrice={roomType.basePriceDaily} hotelName={hotel?.name} />
    </main>
  );
}
