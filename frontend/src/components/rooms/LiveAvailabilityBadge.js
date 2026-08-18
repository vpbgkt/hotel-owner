'use client';

import { useState, useEffect } from 'react';

/**
 * Fetches the live available room count for today from the API.
 * Falls back to totalRooms if the fetch fails.
 *
 * This is a client component so it runs in the browser and always fetches
 * fresh data (no Next.js cache), giving an accurate per-date live count.
 */
export default function LiveAvailabilityBadge({ roomTypeId, totalRooms }) {
  const [available, setAvailable] = useState(null); // null = loading

  useEffect(() => {
    async function fetchAvailability() {
      try {
        const today = new Date().toISOString().split('T')[0];
        const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0];
        const apiBase =
          process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';
        const url = `${apiBase}/rooms/availability/daily?roomTypeId=${roomTypeId}&checkInDate=${today}&checkOutDate=${tomorrow}&numRooms=1`;
        const res = await fetch(url);
        if (!res.ok) { setAvailable(totalRooms); return; }
        const body = await res.json();
        const count = body?.data?.availableRooms ?? totalRooms;
        setAvailable(count);
      } catch {
        setAvailable(totalRooms);
      }
    }
    fetchAvailability();
  }, [roomTypeId, totalRooms]);

  const isSoldOut = available !== null && available <= 0;
  const isLow = available !== null && available > 0 && available <= 3;

  return (
    <div className={`rounded-xl p-4 text-center ${
      isSoldOut ? 'bg-red-50 border border-red-200' :
      isLow     ? 'bg-orange-50 border border-orange-200' :
                  'bg-gray-50'
    }`}>
      <div className="text-2xl mb-1">
        {isSoldOut ? '❌' : '🏠'}
      </div>
      <p className={`font-semibold text-sm ${
        isSoldOut ? 'text-red-700' :
        isLow     ? 'text-orange-700' :
                    'text-gray-900'
      }`}>
        {available === null
          ? '…'
          : isSoldOut
            ? 'Sold Out'
            : available}
      </p>
      <p className="text-gray-400 text-xs mt-0.5">Available Today</p>
    </div>
  );
}
