'use client';

import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/context/AuthContext';
import { adminApi } from '@/lib/api';
import { useRouter } from 'next/navigation';
import { formatCurrency } from '@/lib/utils';
import Modal from '@/components/ui/Modal';
import AdminPageHeader from '@/components/admin/AdminPageHeader';
import Link from 'next/link';
import dayjs from 'dayjs';
import toast from 'react-hot-toast';
import { Users, Search, ChevronLeft, ChevronRight, ArrowRight } from 'lucide-react';

const STATUS_COLORS = {
  CONFIRMED: 'bg-blue-50 text-blue-700',
  CHECKED_IN: 'bg-green-50 text-green-700',
  CHECKED_OUT: 'bg-gray-100 text-gray-600',
  CANCELLED: 'bg-red-50 text-red-700',
  PENDING: 'bg-yellow-50 text-yellow-700',
  NO_SHOW: 'bg-orange-50 text-orange-700',
};

export default function AdminGuestsPage() {
  const { user, loading, isAuthenticated } = useAuth();
  const router = useRouter();
  const [guests, setGuests] = useState([]);
  const [loadingData, setLoadingData] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [detailGuest, setDetailGuest] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);

  useEffect(() => {
    if (!loading && (!isAuthenticated || !['HOTEL_ADMIN', 'HOTEL_STAFF'].includes(user?.role))) {
      router.replace('/dashboard');
    }
  }, [loading, isAuthenticated, user, router]);

  const fetchGuests = useCallback(() => {
    if (!isAuthenticated) return;
    setLoadingData(true);
    adminApi.listGuests({ page, limit: 20, ...(search ? { search } : {}) })
      .then((res) => {
        const d = res.data.data;
        setGuests(d?.data || []);
        setTotalPages(d?.pages || 1);
        setTotal(d?.total || 0);
      })
      .catch(() => toast.error('Failed to load guests'))
      .finally(() => setLoadingData(false));
  }, [isAuthenticated, page, search]);

  useEffect(() => { fetchGuests(); }, [fetchGuests]);

  // Debounce the search box → live search (same UX as Manage Bookings), so the
  // list filters as you type without needing to submit.
  useEffect(() => {
    const t = setTimeout(() => {
      setSearch(searchInput.trim());
      setPage(1);
    }, 400);
    return () => clearTimeout(t);
  }, [searchInput]);

  const openDetail = async (id) => {
    setDetailGuest({ _loading: true });
    setDetailLoading(true);
    try {
      const res = await adminApi.getGuestDetail(id);
      setDetailGuest(res.data.data);
    } catch {
      toast.error('Failed to load guest details');
      setDetailGuest(null);
    } finally {
      setDetailLoading(false);
    }
  };

  if (loading || !user) return null;

  return (
    <main className="min-h-[80vh] bg-gray-50/50">
      <AdminPageHeader
        title="Guest Management"
        description={`${total} total guest${total !== 1 ? 's' : ''}`}
        actions={
          <div className="relative">
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by name, email or phone"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="input pl-9 w-full sm:w-72"
            />
          </div>
        }
      />

      <div className="max-w-7xl mx-auto px-5 sm:px-8 py-8">
        {loadingData ? (
          <div className="space-y-2">{[...Array(8)].map((_, i) => <div key={i} className="h-14 bg-gray-100 animate-pulse rounded-xl" />)}</div>
        ) : guests.length === 0 ? (
          <div className="text-center py-20 text-gray-400">
            <Users className="w-10 h-10 mx-auto mb-3 text-gray-300" />
            <p>{search ? `No guests found for "${search}"` : 'No guest records yet'}</p>
          </div>
        ) : (
          <>
            <div className="rounded-2xl border border-gray-100 bg-white overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50/80 border-b border-gray-100">
                  <tr>
                    {['Guest', 'Contact', 'Registered', ''].map((h) => (
                      <th key={h} className="text-left px-4 py-3.5 text-gray-500 text-xs uppercase tracking-wide font-medium">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {guests.map((g) => (
                    <tr key={g.id} className="hover:bg-gray-50/60 transition-colors">
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-primary-50 text-primary-700 flex items-center justify-center font-semibold text-xs flex-shrink-0">
                            {(g.name || '?')[0].toUpperCase()}
                          </div>
                          <p className="font-medium text-gray-900">{g.name || '—'}</p>
                        </div>
                      </td>
                      <td className="px-4 py-3.5 text-gray-500">
                        <p>{g.email || '—'}</p>
                        <p className="text-xs">{g.phone || ''}</p>
                      </td>
                      <td className="px-4 py-3.5 text-gray-500">
                        {dayjs(g.createdAt).format('DD MMM YYYY')}
                      </td>
                      <td className="px-4 py-3.5">
                        <button
                          onClick={() => openDetail(g.id)}
                          className="flex items-center gap-1 text-primary-600 hover:text-primary-800 text-sm font-medium transition-colors"
                        >
                          View Profile <ArrowRight className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex justify-center items-center gap-3 mt-6">
                <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1} className="btn-secondary text-sm px-3 py-2 flex items-center gap-1 disabled:opacity-40">
                  <ChevronLeft className="w-4 h-4" /> Prev
                </button>
                <span className="text-sm text-gray-500">Page {page} of {totalPages}</span>
                <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="btn-secondary text-sm px-3 py-2 flex items-center gap-1 disabled:opacity-40">
                  Next <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {/* Guest Detail Modal */}
      <Modal open={!!detailGuest} onClose={() => setDetailGuest(null)} title="Guest Profile" maxWidth="max-w-2xl">
        {detailLoading || detailGuest?._loading ? (
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => <div key={i} className="h-10 bg-gray-100 animate-pulse rounded" />)}
          </div>
        ) : detailGuest && (
          <div className="space-y-5">
            {/* Guest header */}
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-full bg-primary-50 text-primary-700 flex items-center justify-center text-2xl font-bold">
                {(detailGuest.guest?.name || '?')[0].toUpperCase()}
              </div>
              <div>
                <h3 className="text-xl font-bold text-gray-900">{detailGuest.guest?.name || '—'}</h3>
                <p className="text-gray-500 text-sm">{detailGuest.guest?.email} · {detailGuest.guest?.phone || 'No phone'}</p>
                <p className="text-gray-400 text-xs">Guest since {dayjs(detailGuest.guest?.createdAt).format('MMMM YYYY')}</p>
              </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-gray-50 rounded-xl p-3 text-center">
                <p className="text-2xl font-bold text-gray-900">{detailGuest.totalBookings}</p>
                <p className="text-xs text-gray-500 mt-0.5">Total Stays</p>
              </div>
              <div className="bg-gray-50 rounded-xl p-3 text-center">
                <p className="text-2xl font-bold text-gray-900">{formatCurrency(detailGuest.totalSpent)}</p>
                <p className="text-xs text-gray-500 mt-0.5">Total Spent</p>
              </div>
              <div className="bg-gray-50 rounded-xl p-3 text-center">
                <p className="text-2xl font-bold text-gray-900">
                  {detailGuest.bookings?.filter((b) => b.status === 'CHECKED_OUT').length || 0}
                </p>
                <p className="text-xs text-gray-500 mt-0.5">Completed</p>
              </div>
            </div>

            {/* Booking History */}
            {detailGuest.bookings?.length > 0 && (
              <div>
                <h4 className="font-semibold text-gray-800 mb-2">Recent Bookings</h4>
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {detailGuest.bookings.map((b) => (
                    <div key={b.id} className="flex items-center justify-between px-3 py-2.5 bg-gray-50 rounded-lg text-sm">
                      <div>
                        <p className="font-medium text-gray-800 font-mono text-xs">{b.bookingNumber}</p>
                        <p className="text-gray-500">{b.roomType?.name}</p>
                        {b.checkInDate && (
                          <p className="text-gray-400 text-xs">
                            {dayjs(b.checkInDate).format('DD MMM')} – {dayjs(b.checkOutDate).format('DD MMM YYYY')}
                          </p>
                        )}
                      </div>
                      <div className="text-right">
                        <p className="font-semibold">{formatCurrency(b.totalAmount)}</p>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[b.status] || 'bg-gray-100 text-gray-600'}`}>
                          {b.status?.replace('_', ' ')}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex gap-2 pt-2">
              <Link
                href={{
                  pathname: '/admin/offline-booking',
                  query: {
                    guestName: detailGuest.guest?.name || '',
                    guestPhone: detailGuest.guest?.phone || '',
                    guestEmail: detailGuest.guest?.email || '',
                  },
                }}
                className="btn-primary flex-1 text-center text-sm"
                onClick={() => setDetailGuest(null)}
              >
                New Booking for Guest
              </Link>
              <button onClick={() => setDetailGuest(null)} className="btn-secondary flex-1 text-sm">
                Close
              </button>
            </div>
          </div>
        )}
      </Modal>
    </main>
  );
}
