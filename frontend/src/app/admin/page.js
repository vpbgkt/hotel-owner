'use client';

import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/context/AuthContext';
import { adminApi } from '@/lib/api';
import { useRouter } from 'next/navigation';
import { formatCurrency } from '@/lib/utils';
import Link from 'next/link';
import dayjs from 'dayjs';
import BookingDetailsModal from '@/components/admin/BookingDetailsModal';
import {
  Eye, Tag, ClipboardList, Users, Calendar, BedDouble, BarChart3, Settings, Plus,
  TrendingUp, Clock, LogIn, LogOut, DollarSign, Percent, Hash, UserCog,
} from 'lucide-react';

const StatCard = ({ label, value, sub, Icon, accent = 'text-primary-600 bg-primary-50' }) => (
  <div className="rounded-2xl border border-gray-100 bg-white p-5 flex items-start gap-4">
    <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${accent}`}>
      {Icon && <Icon className="w-5 h-5" />}
    </div>
    <div className="min-w-0 flex-1">
      <p className="text-gray-500 text-xs uppercase tracking-wide">{label}</p>
      <p className="text-2xl font-bold text-gray-900 mt-0.5 truncate">{value ?? '—'}</p>
      {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
    </div>
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
    { href: '/admin/offline-booking', Icon: Tag, label: 'Walk-in Booking', desc: 'Counter / offline booking' },
    { href: '/admin/bookings', Icon: ClipboardList, label: 'All Bookings', desc: 'View & manage bookings' },
    { href: '/admin/guests', Icon: Users, label: 'Guests', desc: 'Guest profiles & history' },
    { href: '/admin/inventory', Icon: Calendar, label: 'Inventory', desc: 'Availability calendar' },
    { href: '/admin/rooms', Icon: BedDouble, label: 'Room Types', desc: 'Manage categories' },
    { href: '/admin/analytics', Icon: BarChart3, label: 'Analytics', desc: 'Revenue & occupancy' },
    { href: '/admin/settings', Icon: Settings, label: 'Settings', desc: 'Hotel info & branding' },
  ];

  return (
    <main className="min-h-[80vh] bg-gray-50/50">
      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div className="bg-white border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-5 sm:px-8 py-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
            <p className="text-sm text-gray-500 mt-0.5">Welcome back, {user?.name?.split(' ')[0]}</p>
          </div>
          <Link href="/admin/offline-booking" className="btn-primary text-sm">
            <Plus className="w-4 h-4 mr-1.5 inline" />Walk-in Booking
          </Link>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-5 sm:px-8 py-8">
        {/* ── Quick Navigation ─────────────────────────────────────────── */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3 mb-10">
          {quickLinks.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="group flex flex-col items-center text-center p-4 rounded-2xl border border-gray-100 bg-white hover:border-primary-200 hover:shadow-sm transition-all"
            >
              <div className="w-10 h-10 rounded-xl bg-primary-50 group-hover:bg-primary-100 flex items-center justify-center transition-colors mb-2.5">
                <l.Icon className="w-5 h-5 text-primary-700" />
              </div>
              <p className="font-semibold text-gray-900 text-xs leading-tight">{l.label}</p>
              <p className="text-[10px] text-gray-400 mt-0.5 hidden sm:block">{l.desc}</p>
            </Link>
          ))}
        </div>

        {/* ── Stats Grid ──────────────────────────────────────────────── */}
        {loadingStats ? (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="h-24 rounded-2xl animate-pulse bg-gray-100 border border-gray-100" />
            ))}
          </div>
        ) : stats ? (
          <>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
              <StatCard label="Month Bookings" value={stats.monthBookings} Icon={TrendingUp} />
              <StatCard label="Pending" value={stats.pendingBookings} Icon={Clock} accent="text-yellow-600 bg-yellow-50" />
              <StatCard label="Today Check-ins" value={stats.todayCheckIns} Icon={LogIn} accent="text-green-600 bg-green-50" />
              <StatCard label="Today Check-outs" value={stats.todayCheckOuts} Icon={LogOut} accent="text-blue-600 bg-blue-50" />
              <StatCard label="Month Revenue" value={formatCurrency(stats.monthRevenue)} Icon={DollarSign} accent="text-emerald-600 bg-emerald-50" />
              <StatCard label="Occupancy Rate" value={`${stats.occupancyRate}%`} Icon={Percent} accent="text-indigo-600 bg-indigo-50" />
              <StatCard label="Total Bookings" value={stats.totalBookings} Icon={Hash} />
              <StatCard label="Staff" value="Manage" sub="Team & permissions" Icon={UserCog} accent="text-gray-600 bg-gray-100" />
            </div>

            {/* ── Recent Bookings ──────────────────────────────────────── */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-gray-900">Recent Bookings</h2>
                <Link href="/admin/bookings" className="text-sm text-primary-600 hover:text-primary-700 font-medium transition-colors">
                  View all
                </Link>
              </div>
              <div className="rounded-2xl border border-gray-100 bg-white overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50/80 border-b border-gray-100">
                    <tr>
                      {['Booking #', 'Guest', 'Room', 'Dates', 'Total', 'Status', ''].map((h) => (
                        <th key={h} className="text-left px-4 py-3.5 text-gray-500 text-xs uppercase tracking-wide font-medium">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {(stats.recentBookings || []).map((b) => (
                      <tr key={b.id} className="hover:bg-gray-50/60 transition-colors">
                        <td className="px-4 py-3.5 font-mono text-xs text-gray-600">{b.bookingNumber}</td>
                        <td className="px-4 py-3.5 font-medium text-gray-900">{b.guestName || b.guest?.name}</td>
                        <td className="px-4 py-3.5 text-gray-600">{b.roomType?.name || '—'}</td>
                        <td className="px-4 py-3.5 text-gray-500">
                          {b.checkInDate ? `${dayjs(b.checkInDate).format('DD MMM')} – ${dayjs(b.checkOutDate).format('DD MMM')}` : '—'}
                        </td>
                        <td className="px-4 py-3.5 font-semibold text-gray-900">{formatCurrency(b.totalAmount)}</td>
                        <td className="px-4 py-3.5">
                          <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${
                            b.status === 'CONFIRMED' ? 'bg-blue-50 text-blue-700' :
                            b.status === 'CHECKED_IN' ? 'bg-green-50 text-green-700' :
                            b.status === 'PENDING' ? 'bg-yellow-50 text-yellow-700' :
                            'bg-gray-100 text-gray-600'
                          }`}>
                            {b.status?.replace('_', ' ')}
                          </span>
                        </td>
                        <td className="px-4 py-3.5">
                          <button
                            type="button"
                            onClick={() => setDetailsBookingId(b.id)}
                            className="text-gray-400 hover:text-primary-600 transition-colors p-1 rounded-lg hover:bg-primary-50"
                            title="View details"
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
            </div>
          </>
        ) : (
          <p className="text-gray-400 text-center py-12">Could not load dashboard stats.</p>
        )}
      </div>

      {/* ── Booking Details Modal ─────────────────────────────────────── */}
      <BookingDetailsModal bookingId={detailsBookingId} onClose={() => setDetailsBookingId(null)} />
    </main>
  );
}
