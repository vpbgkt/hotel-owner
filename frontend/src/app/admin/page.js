'use client';

import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/context/AuthContext';
import { adminApi, analyticsApi } from '@/lib/api';
import { useRouter } from 'next/navigation';
import { formatCurrency } from '@/lib/utils';
import Link from 'next/link';
import dayjs from 'dayjs';
import BookingDetailsModal from '@/components/admin/BookingDetailsModal';
import { Eye } from 'lucide-react';

const StatCard = ({ label, value, sub }) => (
  <div className="card p-5">
    <p className="text-gray-500 text-sm">{label}</p>
    <p className="text-3xl font-bold text-gray-900 mt-1">{value ?? '—'}</p>
    {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
  </div>
);

export default function AdminDashboardPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [stats, setStats] = useState(null);
  const [loadingStats, setLoadingStats] = useState(true);
  const [detailsBookingId, setDetailsBookingId] = useState(null);

  useEffect(() => {
    if (!loading && (!user || user.role !== 'HOTEL_ADMIN')) {
      router.replace('/dashboard');
    }
  }, [user, loading, router]);

  const fetchStats = useCallback(() => {
    if (user?.role !== 'HOTEL_ADMIN') return;
    adminApi.getDashboard()
      .then((res) => setStats(res.data.data))
      .catch(() => {})
      .finally(() => setLoadingStats(false));
  }, [user]);

  useEffect(() => { fetchStats(); }, [fetchStats]);

  // Refresh stats when the admin returns to this tab/window so a booking
  // created elsewhere (e.g. the walk-in page) is reflected without a hard reload.
  useEffect(() => {
    if (user?.role !== 'HOTEL_ADMIN') return;
    const onFocus = () => fetchStats();
    const onVisible = () => { if (document.visibilityState === 'visible') fetchStats(); };
    window.addEventListener('focus', onFocus);
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      window.removeEventListener('focus', onFocus);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [fetchStats, user]);

  if (loading || !user) return null;

  const quickLinks = [
    { href: '/admin/offline-booking', icon: '🏷️', label: 'Walk-in Booking', desc: 'Counter / offline booking', color: 'bg-amber-50 border-amber-200 hover:bg-amber-100' },
    { href: '/admin/bookings', icon: '📋', label: 'All Bookings', desc: 'View & manage bookings', color: 'bg-blue-50 border-blue-200 hover:bg-blue-100' },
    { href: '/admin/guests', icon: '👥', label: 'Guests', desc: 'Guest profiles & history', color: 'bg-purple-50 border-purple-200 hover:bg-purple-100' },
    { href: '/admin/inventory', icon: '📅', label: 'Inventory', desc: 'Room availability calendar', color: 'bg-green-50 border-green-200 hover:bg-green-100' },
    { href: '/admin/rooms', icon: '🛏️', label: 'Room Types', desc: 'Manage room categories', color: 'bg-teal-50 border-teal-200 hover:bg-teal-100' },
    { href: '/admin/analytics', icon: '📊', label: 'Analytics', desc: 'Revenue & occupancy', color: 'bg-indigo-50 border-indigo-200 hover:bg-indigo-100' },
    { href: '/admin/settings', icon: '⚙️', label: 'Settings', desc: 'Hotel info, branding, GST', color: 'bg-gray-50 border-gray-200 hover:bg-gray-100' },
  ];

  return (
    <main className="max-w-7xl mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Admin Dashboard</h1>
        <Link href="/admin/offline-booking" className="btn-primary text-sm">+ Walk-in Booking</Link>
      </div>

      {/* Quick Navigation Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 mb-8">
        {quickLinks.map((l) => (
          <Link key={l.href} href={l.href} className={`border rounded-xl p-4 transition ${l.color}`}>
            <span className="text-2xl">{l.icon}</span>
            <p className="font-semibold text-gray-900 mt-2 text-sm">{l.label}</p>
            <p className="text-xs text-gray-500 mt-0.5">{l.desc}</p>
          </Link>
        ))}
      </div>


      {loadingStats ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(8)].map((_, i) => <div key={i} className="card p-5 h-24 animate-pulse bg-gray-100" />)}
        </div>
      ) : stats ? (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <StatCard label="Month Bookings" value={stats.monthBookings} />
            <StatCard label="Pending" value={stats.pendingBookings} />
            <StatCard label="Today Check-ins" value={stats.todayCheckIns} />
            <StatCard label="Today Check-outs" value={stats.todayCheckOuts} />
            <StatCard label="Month Revenue" value={formatCurrency(stats.monthRevenue)} />
            <StatCard label="Occupancy Rate" value={`${stats.occupancyRate}%`} />
            <StatCard label="Total Bookings" value={stats.totalBookings} />
            <StatCard label="Staff" value="View" sub="Manage team" />
          </div>

          {/* Recent Bookings */}
          <div>
            <h2 className="text-lg font-semibold mb-4">Recent Bookings</h2>
            <div className="card overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    {['Booking #', 'Guest', 'Room', 'Dates', 'Total', 'Status', 'Details'].map((h) => (
                      <th key={h} className="text-left px-4 py-3 text-gray-500 font-medium">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {(stats.recentBookings || []).map((b) => (
                    <tr key={b.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 font-mono text-xs">{b.bookingNumber}</td>
                      <td className="px-4 py-3">{b.guestName || b.guest?.name}</td>
                      <td className="px-4 py-3">{b.roomType?.name || '—'}</td>
                      <td className="px-4 py-3 text-gray-500">
                        {b.checkInDate ? `${dayjs(b.checkInDate).format('DD MMM')} – ${dayjs(b.checkOutDate).format('DD MMM')}` : '—'}
                      </td>
                      <td className="px-4 py-3 font-semibold">{formatCurrency(b.totalAmount)}</td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 rounded text-xs font-medium ${b.status === 'CONFIRMED' ? 'bg-blue-100 text-blue-700' : b.status === 'CHECKED_IN' ? 'bg-green-100 text-green-700' : b.status === 'PENDING' ? 'bg-yellow-100 text-yellow-700' : 'bg-gray-100 text-gray-600'}`}>
                          {b.status}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <button
                          type="button"
                          onClick={() => setDetailsBookingId(b.id)}
                          className="ps-2 text-gray-500 hover:text-primary-600 transition-colors"
                          title="View booking details"
                          aria-label="View booking details"
                        >
                          <Eye size={16} className='m-1'/>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      ) : (
        <p className="text-gray-400">Could not load dashboard stats.</p>
      )}

      {/* ── Booking Details Modal ─────────────────────────────────────────── */}
      <BookingDetailsModal bookingId={detailsBookingId} onClose={() => setDetailsBookingId(null)} />
    </main>
  );
}
