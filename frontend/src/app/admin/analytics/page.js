'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { analyticsApi } from '@/lib/api';
import { useRouter } from 'next/navigation';
import { formatCurrency } from '@/lib/utils';
import AdminPageHeader from '@/components/admin/AdminPageHeader';
import { DollarSign, ClipboardList, TrendingUp, RotateCcw } from 'lucide-react';

function StatCard({ label, value, Icon, accent = 'text-primary-600 bg-primary-50' }) {
  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-5 flex items-start gap-4">
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${accent}`}>
        {Icon && <Icon className="w-5 h-5" />}
      </div>
      <div className="min-w-0">
        <p className="text-gray-500 text-xs uppercase tracking-wide">{label}</p>
        <p className="text-2xl font-bold text-gray-900 mt-0.5 truncate">{value}</p>
      </div>
    </div>
  );
}

export default function AdminAnalyticsPage() {
  const { user, loading, isAuthenticated } = useAuth();
  const router = useRouter();
  const [trends, setTrends] = useState([]);
  const [revenue, setRevenue] = useState(null);
  const [occupancy, setOccupancy] = useState(null);
  const [loadingData, setLoadingData] = useState(true);

  useEffect(() => {
    if (!loading && (!isAuthenticated || user?.role !== 'HOTEL_ADMIN')) router.replace('/dashboard');
  }, [loading, isAuthenticated, user, router]);

  useEffect(() => {
    if (!isAuthenticated) return;
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth() - 5, 1).toISOString().split('T')[0];
    const end = now.toISOString().split('T')[0];

    Promise.allSettled([
      analyticsApi.getBookingTrends({ startDate: start, endDate: end }),
      analyticsApi.getRevenueReport({ startDate: start, endDate: end }),
      analyticsApi.getOccupancy({ startDate: start, endDate: end }),
    ]).then(([t, r, o]) => {
      if (t.status === 'fulfilled') setTrends(t.value.data.data || []);
      if (r.status === 'fulfilled') setRevenue(r.value.data.data || null);
      if (o.status === 'fulfilled') setOccupancy(o.value.data.data || null);
    }).finally(() => setLoadingData(false));
  }, [isAuthenticated]);

  return (
    <main className="min-h-[80vh] bg-gray-50/50">
      <AdminPageHeader title="Analytics" description="Revenue, bookings and occupancy trends" />

      <div className="max-w-6xl mx-auto px-5 sm:px-8 py-8">
        {loadingData ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            {[...Array(4)].map((_, i) => <div key={i} className="h-24 bg-gray-100 animate-pulse rounded-2xl" />)}
          </div>
        ) : (
          <>
            {/* Revenue summary */}
            {revenue && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                <StatCard label="Total Revenue" value={formatCurrency(revenue.totalRevenue || 0)} Icon={DollarSign} accent="text-emerald-600 bg-emerald-50" />
                <StatCard label="Total Bookings" value={revenue.totalBookings || 0} Icon={ClipboardList} />
                <StatCard label="Avg Booking Value" value={formatCurrency(revenue.avgBookingValue || 0)} Icon={TrendingUp} accent="text-indigo-600 bg-indigo-50" />
                <StatCard label="Refunds" value={formatCurrency(revenue.totalRefunds || 0)} Icon={RotateCcw} accent="text-red-600 bg-red-50" />
              </div>
            )}

            {/* Booking trends table */}
            <div className="rounded-2xl border border-gray-100 bg-white p-6 mb-6">
              <h2 className="font-semibold text-gray-900 mb-4">Booking Trends (Last 6 Months)</h2>
              {trends.length === 0 ? (
                <p className="text-gray-400 text-sm">No data available</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left text-gray-500 text-xs uppercase tracking-wide border-b border-gray-100">
                        <th className="pb-3">Month</th>
                        <th className="pb-3">Bookings</th>
                        <th className="pb-3">Revenue</th>
                        <th className="pb-3">Cancelled</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {trends.map((t, i) => (
                        <tr key={i}>
                          <td className="py-3 text-gray-700">{t.month}</td>
                          <td className="py-3 text-gray-700">{t.totalBookings}</td>
                          <td className="py-3 font-medium text-gray-900">{formatCurrency(t.revenue || 0)}</td>
                          <td className="py-3 text-red-500">{t.cancelledBookings || 0}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Occupancy by room type */}
            {occupancy?.byRoomType?.length > 0 && (
              <div className="rounded-2xl border border-gray-100 bg-white p-6">
                <h2 className="font-semibold text-gray-900 mb-4">Occupancy by Room Type</h2>
                <div className="space-y-4">
                  {occupancy.byRoomType.map((rt, i) => (
                    <div key={i} className="flex justify-between items-center">
                      <span className="text-sm text-gray-700">{rt.name}</span>
                      <div className="flex items-center gap-3">
                        <div className="w-32 bg-gray-100 rounded-full h-2">
                          <div
                            className="bg-primary-500 h-2 rounded-full"
                            style={{ width: `${Math.min(100, rt.occupancyRate || 0)}%` }}
                          />
                        </div>
                        <span className="text-sm font-medium text-gray-700 w-12 text-right">
                          {(rt.occupancyRate || 0).toFixed(1)}%
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </main>
  );
}
