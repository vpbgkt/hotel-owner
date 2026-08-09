'use client';

import Link from 'next/link';
import { useTenant } from '@/context/TenantContext';
import { amenityIcon } from '@/lib/amenities';

export default function Footer() {
  const { hotel } = useTenant() || {};
  const hotelName = hotel?.name || 'Grand Horizon';

  return (
    <footer className="bg-gray-900 text-gray-300 mt-auto">
      <div className="max-w-7xl mx-auto px-4 py-12 grid grid-cols-2 md:grid-cols-4 gap-8">
        <div>
          <h3 className="text-white font-bold text-lg mb-3 flex items-center gap-2">🏨 {hotelName}</h3>
          <p className="text-sm text-gray-400 leading-relaxed">{hotel?.description?.slice(0, 160) || 'A premier luxury hotel in the heart of Bangalore. Experience world-class hospitality, fine dining, and unforgettable moments.'}</p>
          <div className="mt-4 text-sm text-gray-400 space-y-1">
            <p>📍 {hotel?.address ? `${hotel.address}, ${hotel.city || ''}` : '42 MG Road, Bangalore'}</p>
            <p>📞 {hotel?.phone || '+91 98765 43210'}</p>
            <p>✉️ {hotel?.email || 'info@grandhorizon.com'}</p>
          </div>
        </div>
        <div>
          <h4 className="text-white font-medium mb-3">Explore</h4>
          <ul className="space-y-2 text-sm">
            <li><Link href="/hotel/book" className="hover:text-white transition-colors">Rooms &amp; Booking</Link></li>
            <li><Link href="/auth/register" className="hover:text-white transition-colors">Create Account</Link></li>
            <li><Link href="/auth/login" className="hover:text-white transition-colors">Sign In</Link></li>
          </ul>
        </div>
        <div>
          <h4 className="text-white font-medium mb-3">Account</h4>
          <ul className="space-y-2 text-sm">
            <li><Link href="/dashboard" className="hover:text-white transition-colors">Dashboard</Link></li>
            <li><Link href="/bookings" className="hover:text-white transition-colors">My Bookings</Link></li>
            <li><Link href="/user/profile" className="hover:text-white transition-colors">Profile</Link></li>
          </ul>
        </div>
        <div>
          <h4 className="text-white font-medium mb-3">Hotel Amenities</h4>
          {hotel?.amenities?.length > 0 ? (
            <ul className="space-y-2 text-sm text-gray-400">
              {hotel.amenities.slice(0, 6).map((a) => (
                <li key={a}>{amenityIcon(a)} {a}</li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-gray-500 italic">No amenities configured yet.</p>
          )}
        </div>
      </div>
      <div className="border-t border-gray-800 py-4 text-center text-xs text-gray-500">
        © {new Date().getFullYear()} {hotelName}. All rights reserved. | Designed for exceptional hospitality.
      </div>
    </footer>
  );
}
