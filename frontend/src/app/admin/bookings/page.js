'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { adminApi, bookingsApi } from '@/lib/api';
import { useRouter } from 'next/navigation';
import { formatCurrency } from '@/lib/utils';
import dayjs from 'dayjs';
import toast from 'react-hot-toast';
import BookingDetailsModal from '@/components/admin/BookingDetailsModal';
import AdminPageHeader from '@/components/admin/AdminPageHeader';
import { Eye, Search, ChevronLeft, ChevronRight, Clock3 } from 'lucide-react';

const STATUS_OPTIONS = ['PENDING', 'CONFIRMED', 'CHECKED_IN', 'CHECKED_OUT', 'CANCELLED', 'NO_SHOW'];

// Mirrors the transition rules enforced by backend booking.service.js updateStatus.
// Used to only offer valid next statuses in the dropdown so the backend never
// has to reject a selection the UI itself offered.
const VALID_TRANSITIONS = {
  PENDING: ['CONFIRMED', 'CANCELLED'],
  CONFIRMED: ['CHECKED_IN', 'CANCELLED', 'NO_SHOW'],
  CHECKED_IN: ['CHECKED_OUT'],
  CHECKED_OUT: [],
  CANCELLED: [],
  NO_SHOW: [],
};

const STATUS_COLORS = {
  PENDING: 'bg-yellow-50 text-yellow-700',
  CONFIRMED: 'bg-blue-50 text-blue-700',
  CHECKED_IN: 'bg-green-50 text-green-700',
  CHECKED_OUT: 'bg-gray-100 text-gray-600',
  CANCELLED: 'bg-red-50 text-red-700',
  NO_SHOW: 'bg-orange-50 text-orange-700',
};

export default function AdminBookingsPage() {
  const { user, loading, isAuthenticated } = useAuth();
  const router = useRouter();
  const [bookings, setBookings] = useState([]);
  const [loadingData, setLoadingData] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [statusFilter, setStatusFilter] = useState('');
  const [updatingId, setUpdatingId] = useState(null);
  // Extend stay modal state
  const [extendBooking, setExtendBooking] = useState(null);
  const [extendDate, setExtendDate] = useState('');
  const [extending, setExtending] = useState(false);
  // Search (booking id, guest name, mobile number)
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  // Details modal
  const [detailsBookingId, setDetailsBookingId] = useState(null);

  useEffect(() => {
    if (!loading && (!isAuthenticated || user?.role !== 'HOTEL_ADMIN')) {
      router.replace('/dashboard');
    }
  }, [loading, isAuthenticated, user, router]);

  const fetchBookings = () => {
    setLoadingData(true);
    adminApi.listBookings({
      page,
      limit: 10,
      ...(statusFilter ? { status: statusFilter } : {}),
      ...(search ? { search } : {}),
    })
      .then((res) => {
        const d = res.data.data;
        setBookings(d?.data || []);
        setTotalPages(d?.pages || 1);
      })
      .catch(() => {})
      .finally(() => setLoadingData(false));
  };

  useEffect(() => { if (isAuthenticated) fetchBookings(); }, [isAuthenticated, page, statusFilter, search]);

  // Debounce search input → search param, and reset to page 1 on new search
  useEffect(() => {
    const t = setTimeout(() => {
      setSearch(searchInput.trim());
      setPage(1);
    }, 400);
    return () => clearTimeout(t);
  }, [searchInput]);

  const updateStatus = async (id, status) => {
    setUpdatingId(id);
    try {
      const res = await adminApi.updateBookingStatus(id, { status });
      setBookings((prev) => prev.map((b) => b.id === id ? { ...b, status: res.data.data.status } : b));
      toast.success('Status updated');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Update failed');
    } finally {
      setUpdatingId(null);
    }
  };

  const openExtend = (booking) => {
    setExtendBooking(booking);
    setExtendDate(dayjs(booking.checkOutDate).add(1, 'day').format('YYYY-MM-DD'));
  };

  const confirmExtend = async () => {
    if (!extendBooking || !extendDate) return;
    if (dayjs(extendDate).isBefore(dayjs(extendBooking.checkOutDate).add(1, 'day'))) {
      toast.error('New checkout must be after current checkout');
      return;
    }
    setExtending(true);
    try {
      await bookingsApi.modify(extendBooking.id, { checkOutDate: extendDate });
      setBookings((prev) => prev.map((b) => b.id === extendBooking.id ? { ...b, checkOutDate: extendDate } : b));
      toast.success('Stay extended!');
      setExtendBooking(null);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to extend stay');
    } finally {
      setExtending(false);
    }
  };

  return (
    <main className="min-h-[80vh] bg-gray-50/50">
      <AdminPageHeader
        title="Manage Bookings"
        description="View, filter, and update reservation statuses"
        actions={
          <>
            <div className="relative">
              <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="Search booking, guest, or phone"
                className="input pl-9 w-full sm:w-72"
              />
            </div>
            <select
              value={statusFilter}
              onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
              className="input w-auto"
            >
              <option value="">All statuses</option>
              {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}
            </select>
          </>
        }
      />

      <div className="max-w-7xl mx-auto px-5 sm:px-8 py-8">
        {loadingData ? (
          <div className="space-y-2">{[...Array(8)].map((_, i) => <div key={i} className="h-14 bg-gray-100 animate-pulse rounded-xl" />)}</div>
        ) : bookings.length === 0 ? (
          <p className="text-center py-20 text-gray-400">No bookings found</p>
        ) : (
          <div className="rounded-2xl border border-gray-100 bg-white overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50/80 border-b border-gray-100">
                <tr>
                  {['Booking #', 'Guest', 'Room', 'Check-in', 'Check-out', 'Amount', 'Status', 'Action', ''].map((h) => (
                    <th key={h} className="text-left px-4 py-3.5 text-gray-500 text-xs uppercase tracking-wide font-medium whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {bookings.map((b) => (
                  <tr key={b.id} className="hover:bg-gray-50/60 transition-colors">
                    <td className="px-4 py-3.5 font-mono text-xs text-gray-500">{b.bookingNumber}</td>
                    <td className="px-4 py-3.5">
                      <p className="font-medium text-gray-900">{b.guestName}</p>
                      <p className="text-gray-400 text-xs">{b.guestPhone || b.guestEmail}</p>
                    </td>
                    <td className="px-4 py-3.5 text-gray-600">{b.roomType?.name}</td>
                    <td className="px-4 py-3.5 whitespace-nowrap text-gray-600">{dayjs(b.checkInDate).format('DD MMM YY')}</td>
                    <td className="px-4 py-3.5 whitespace-nowrap text-gray-600">{dayjs(b.checkOutDate).format('DD MMM YY')}</td>
                    <td className="px-4 py-3.5 font-semibold text-gray-900">{formatCurrency(b.totalAmount)}</td>
                    <td className="px-4 py-3.5">
                      <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[b.status] || 'bg-gray-100 text-gray-600'}`}>{b.status?.replace('_', ' ')}</span>
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="flex flex-col gap-1.5">
                        <select
                          disabled={updatingId === b.id || VALID_TRANSITIONS[b.status]?.length === 0}
                          value={b.status}
                          onChange={(e) => updateStatus(b.id, e.target.value)}
                          className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 disabled:opacity-60 disabled:cursor-not-allowed"
                        >
                          <option value={b.status}>{b.status?.replace('_', ' ')}</option>
                          {(VALID_TRANSITIONS[b.status] || []).map((s) => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}
                        </select>
                        {['CONFIRMED', 'CHECKED_IN'].includes(b.status) && b.bookingType !== 'HOURLY' && (
                          <button
                            type="button"
                            onClick={() => openExtend(b)}
                            className="flex items-center gap-1 text-xs px-2 py-1 bg-blue-50 text-blue-700 border border-blue-100 rounded-lg hover:bg-blue-100 transition-colors"
                          >
                            <Clock3 className="w-3 h-3" /> Extend
                          </button>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3.5">
                      <button
                        type="button"
                        onClick={() => setDetailsBookingId(b.id)}
                        className="text-gray-400 hover:text-primary-600 transition-colors p-1.5 rounded-lg hover:bg-primary-50"
                        title="View booking details"
                        aria-label="View booking details"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {totalPages > 1 && (
          <div className="flex justify-center items-center gap-3 mt-6">
            <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1} className="btn-secondary text-sm px-3 py-2 flex items-center gap-1">
              <ChevronLeft className="w-4 h-4" /> Prev
            </button>
            <span className="text-sm text-gray-500">Page {page} of {totalPages}</span>
            <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="btn-secondary text-sm px-3 py-2 flex items-center gap-1">
              Next <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      {/* ── Extend Stay Modal ─────────────────────────────────────────────── */}
      {extendBooking && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6">
            <h2 className="text-lg font-bold text-gray-900 mb-1">Extend Stay</h2>
            <p className="text-sm text-gray-500 mb-4">
              {extendBooking.guestName} — {extendBooking.roomType?.name}<br />
              Current checkout: <span className="font-medium">{dayjs(extendBooking.checkOutDate).format('DD MMM YYYY')}</span>
            </p>
            <label className="label">New Checkout Date</label>
            <input
              type="date"
              className="input mb-4"
              value={extendDate}
              min={dayjs(extendBooking.checkOutDate).add(1, 'day').format('YYYY-MM-DD')}
              onChange={(e) => setExtendDate(e.target.value)}
            />
            <div className="flex gap-3">
              <button type="button" onClick={() => setExtendBooking(null)} className="flex-1 btn-secondary">Cancel</button>
              <button type="button" onClick={confirmExtend} disabled={extending} className="flex-1 btn-primary">
                {extending ? 'Saving…' : 'Confirm Extension'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Booking Details Modal ─────────────────────────────────────────── */}
      <BookingDetailsModal bookingId={detailsBookingId} onClose={() => setDetailsBookingId(null)} />
    </main>
  );
}
