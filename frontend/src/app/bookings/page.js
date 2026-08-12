'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { userApi } from '@/lib/api';
import { useRouter } from 'next/navigation';
import { formatCurrency } from '@/lib/utils';
import Link from 'next/link';
import dayjs from 'dayjs';
import Reveal from '@/components/ui/Reveal';
import { CalendarCheck, ArrowRight, ChevronLeft, ChevronRight } from 'lucide-react';

export default function BookingsListPage() {
  const { isAuthenticated, loading } = useAuth();
  const router = useRouter();
  const [bookings, setBookings] = useState([]);
  const [loadingData, setLoadingData] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    if (!loading && !isAuthenticated) router.replace('/auth/login');
  }, [loading, isAuthenticated, router]);

  useEffect(() => {
    if (!isAuthenticated) return;
    setLoadingData(true);
    userApi.getMyBookings({ page, limit: 10 })
      .then((res) => {
        setBookings(res.data.data?.data || []);
        setTotalPages(res.data.data?.pages || 1);
      })
      .catch(() => {})
      .finally(() => setLoadingData(false));
  }, [isAuthenticated, page]);

  const statusColors = {
    PENDING: 'bg-yellow-50 text-yellow-700 border-yellow-200',
    CONFIRMED: 'bg-blue-50 text-blue-700 border-blue-200',
    CHECKED_IN: 'bg-green-50 text-green-700 border-green-200',
    CHECKED_OUT: 'bg-gray-100 text-gray-600 border-gray-200',
    CANCELLED: 'bg-red-50 text-red-700 border-red-200',
  };

  return (
    <main className="bg-white min-h-[70vh]">
      <div className="max-w-4xl mx-auto px-5 sm:px-8 py-12 lg:py-16">
        <Reveal className="mb-10">
          <span className="eyebrow">Your Reservations</span>
          <h1 className="font-display text-3xl md:text-4xl font-semibold text-gray-900 mt-4">My Bookings</h1>
        </Reveal>

        {loadingData ? (
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-24 rounded-2xl animate-pulse bg-gray-100 border border-gray-100" />
            ))}
          </div>
        ) : bookings.length === 0 ? (
          <Reveal className="text-center py-20">
            <div className="w-16 h-16 mx-auto rounded-full bg-primary-50 flex items-center justify-center mb-5">
              <CalendarCheck className="w-7 h-7 text-primary-500" />
            </div>
            <p className="font-display text-xl font-semibold text-gray-900 mb-2">No bookings yet</p>
            <p className="text-gray-500 mb-6 text-sm">When you book a room, your reservations will appear here.</p>
            <Link href="/rooms/book" className="btn-primary text-sm">Browse Rooms</Link>
          </Reveal>
        ) : (
          <div className="space-y-4">
            {bookings.map((b, i) => (
              <Reveal key={b.id} delay={(i % 5) * 60}>
                <Link
                  href={`/bookings/${b.id}`}
                  className="flex justify-between items-center p-5 sm:p-6 rounded-2xl border border-gray-100 bg-white hover:border-primary-200 hover:shadow-md transition-all group"
                >
                  <div className="min-w-0 flex-1">
                    <p className="font-mono text-xs text-gray-400 mb-1">{b.bookingNumber}</p>
                    <p className="font-display font-semibold text-gray-900 text-lg truncate">{b.roomType?.name || 'Room'}</p>
                    <p className="text-sm text-gray-500 mt-0.5">
                      {dayjs(b.checkInDate).format('DD MMM')} – {dayjs(b.checkOutDate).format('DD MMM YYYY')}
                    </p>
                  </div>
                  <div className="text-right ml-4 flex-shrink-0 flex flex-col items-end gap-2">
                    <span className={`text-xs px-2.5 py-1 rounded-full font-medium border ${statusColors[b.status] || 'bg-gray-100 text-gray-600 border-gray-200'}`}>
                      {b.status?.replace('_', ' ')}
                    </span>
                    <p className="font-semibold text-gray-900">{formatCurrency(b.totalAmount)}</p>
                  </div>
                  <ArrowRight className="w-4 h-4 text-gray-300 ml-3 group-hover:text-primary-600 group-hover:translate-x-1 transition-all flex-shrink-0" />
                </Link>
              </Reveal>
            ))}
          </div>
        )}

        {totalPages > 1 && (
          <Reveal className="flex justify-center items-center gap-3 mt-10">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="btn-secondary text-sm px-3 py-2 flex items-center gap-1"
            >
              <ChevronLeft className="w-4 h-4" /> Prev
            </button>
            <span className="px-4 py-2 text-sm text-gray-500 font-medium">
              Page {page} of {totalPages}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="btn-secondary text-sm px-3 py-2 flex items-center gap-1"
            >
              Next <ChevronRight className="w-4 h-4" />
            </button>
          </Reveal>
        )}
      </div>
    </main>
  );
}
