import { serverRoomsApi } from '@/lib/serverApi';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import BookingWidget from '@/components/booking/BookingWidget';
import MobileBookingBar from '@/components/booking/MobileBookingBar';
import RoomImageSlideshow from '@/components/rooms/RoomImageSlideshow';
import { amenityIcon } from '@/lib/amenities';

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
    <main className="pb-24 lg:pb-0">
      {/* ── Image Slideshow ───────────────────────────────────────── */}
      <div className="relative">
        <RoomImageSlideshow images={images} name={roomType.name} />
        {/* Breadcrumb overlay */}
        <div className="absolute top-4 left-4 z-20 flex items-center gap-2 text-sm text-white/90 bg-black/40 backdrop-blur px-3 py-1.5 rounded-full">
          <Link href="/" className="hover:text-white">Home</Link>
          <span>/</span>
          {hotel && <span className="hover:text-white">{hotel.name}</span>}
          {hotel && <span>/</span>}
          <span className="font-medium">{roomType.name}</span>
        </div>
      </div>

      {/* ── Content ───────────────────────────────────────────────── */}
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="lg:grid lg:grid-cols-3 lg:gap-10">

          {/* Left: Details */}
          <div className="lg:col-span-2 space-y-8">
            {/* Header */}
            <div>
              <div className="flex items-start justify-between flex-wrap gap-3">
                <div>
                  <h1 className="text-3xl md:text-4xl font-bold text-gray-900">{roomType.name}</h1>
                  {hotel && (
                    <p className="text-gray-500 mt-1 flex items-center gap-1">
                      <span>📍</span>
                      <span>{hotel.name}</span>
                    </p>
                  )}
                </div>
                <div className="text-right">
                  <p className="text-3xl font-bold text-primary-600">₹{roomType.basePriceDaily?.toLocaleString()}</p>
                  <p className="text-gray-400 text-sm">per night</p>
                  {roomType.basePriceHourly && (
                    <p className="text-gray-500 text-sm mt-0.5">₹{roomType.basePriceHourly?.toLocaleString()}/hour</p>
                  )}
                </div>
              </div>
            </div>

            {/* Quick Facts */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {[
                { label: 'Max Guests', value: roomType.maxGuests, icon: '👥' },
                { label: 'Room Size', value: roomType.areaSqFt ? `${roomType.areaSqFt} sq ft` : 'Spacious', icon: '📐' },
                { label: 'Bed Type', value: roomType.bedType || 'King/Twin', icon: '🛏️' },
                { label: 'Total Rooms', value: roomType.totalRooms, icon: '🏠' },
              ].map((f) => (
                <div key={f.label} className="bg-gray-50 rounded-xl p-4 text-center">
                  <div className="text-2xl mb-1">{f.icon}</div>
                  <p className="font-semibold text-gray-900 text-sm">{f.value}</p>
                  <p className="text-gray-400 text-xs mt-0.5">{f.label}</p>
                </div>
              ))}
            </div>

            {/* Description */}
            {roomType.description && (
              <div>
                <h2 className="text-xl font-semibold text-gray-900 mb-3">About this Room</h2>
                <p className="text-gray-600 leading-relaxed whitespace-pre-line">{roomType.description}</p>
              </div>
            )}

            {/* Amenities */}
            {roomType.amenities?.length > 0 && (
              <div>
                <h2 className="text-xl font-semibold text-gray-900 mb-4">Room Amenities</h2>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {roomType.amenities.map((a) => (
                    <div key={a} className="flex items-center gap-2 text-sm text-gray-700">
                      <span className="text-lg">{amenityIcon(a)}</span>
                      <span>{a}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Policies */}
            <div className="bg-blue-50 rounded-xl p-5 border border-blue-100">
              <h2 className="text-lg font-semibold text-blue-900 mb-3">Policies</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm text-blue-800">
                <div className="flex items-center gap-2">
                  <span>🕐</span>
                  <span>Check-in from <strong>2:00 PM</strong></span>
                </div>
                <div className="flex items-center gap-2">
                  <span>🕐</span>
                  <span>Check-out by <strong>11:00 AM</strong></span>
                </div>
                {roomType.maxExtraGuests > 0 && (
                  <div className="flex items-center gap-2">
                    <span>👥</span>
                    <span>Extra guests allowed (+₹{roomType.extraGuestCharge?.toLocaleString()}/person)</span>
                  </div>
                )}
                  <div className="flex items-center gap-2">
                  <span>🚭</span>
                  <span>No smoking on premises</span>
                </div>
                <div className="flex items-center gap-2">
                  <span>🧑‍🧒‍🧒</span>
                  <span>Guests aged 18 years and above are considered adults and will be charged as extra guests</span>
                </div>
              </div>
            </div>

            {/* More images below fold on mobile */}
          </div>

          {/* Right: Booking Widget */}
          <div className="hidden lg:block">
            <div className="sticky top-6">
              {hotel ? (
                <BookingWidget hotel={hotel} roomTypes={[roomType]} />
              ) : (
                <div className="card p-6">
                  <p className="text-lg font-bold text-gray-900 mb-2">₹{roomType.basePriceDaily?.toLocaleString()}<span className="text-sm font-normal text-gray-400">/night</span></p>
                  <Link href="/hotel/book" className="btn-primary w-full text-center block mt-4">
                    Book This Room
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Sticky Bar */}
      <MobileBookingBar minPrice={roomType.basePriceDaily} hotelName={hotel?.name} />
    </main>
  );
}
