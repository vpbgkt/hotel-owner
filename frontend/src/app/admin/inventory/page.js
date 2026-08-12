'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { adminApi, roomsApi } from '@/lib/api';
import { useRouter } from 'next/navigation';
import { formatCurrency } from '@/lib/utils';
import dayjs from 'dayjs';
import toast from 'react-hot-toast';
import AdminPageHeader from '@/components/admin/AdminPageHeader';
import { Calendar, ChevronLeft, ChevronRight } from 'lucide-react';

export default function AdminInventoryPage() {
  const { user, loading, isAuthenticated } = useAuth();
  const router = useRouter();
  const [roomTypes, setRoomTypes] = useState([]);
  const [selectedRoom, setSelectedRoom] = useState(null);
  const [calendar, setCalendar] = useState([]);
  const [loadingRooms, setLoadingRooms] = useState(true);
  const [loadingCalendar, setLoadingCalendar] = useState(false);
  const [saving, setSaving] = useState(false);

  // Bulk update form
  const [bulkForm, setBulkForm] = useState({
    startDate: dayjs().format('YYYY-MM-DD'),
    endDate: dayjs().add(7, 'day').format('YYYY-MM-DD'),
    availableCount: '',
    priceOverride: '',
    isClosed: false,
  });

  // View month
  const [viewMonth, setViewMonth] = useState(dayjs().startOf('month'));

  useEffect(() => {
    if (!loading && (!isAuthenticated || !['HOTEL_ADMIN', 'HOTEL_STAFF'].includes(user?.role))) {
      router.replace('/dashboard');
    }
  }, [loading, isAuthenticated, user, router]);

  useEffect(() => {
    if (!isAuthenticated) return;
    adminApi.listRoomTypes({})
      .then((res) => {
        const rooms = res.data.data || [];
        setRoomTypes(rooms);
        if (rooms.length > 0) setSelectedRoom(rooms[0]);
      })
      .catch(() => {})
      .finally(() => setLoadingRooms(false));
  }, [isAuthenticated]);

  useEffect(() => {
    if (!selectedRoom) return;
    setLoadingCalendar(true);
    const startDate = viewMonth.format('YYYY-MM-DD');
    const endDate = viewMonth.endOf('month').format('YYYY-MM-DD');
    roomsApi.getInventoryCalendar(selectedRoom.id, { startDate, endDate })
      .then((res) => setCalendar(res.data.data?.calendar || []))
      .catch(() => setCalendar([]))
      .finally(() => setLoadingCalendar(false));
  }, [selectedRoom, viewMonth]);

  const applyBulkUpdate = async () => {
    if (!selectedRoom) return;
    const payload = {
      roomTypeId: selectedRoom.id,
      startDate: bulkForm.startDate,
      endDate: bulkForm.endDate,
      isClosed: bulkForm.isClosed,
    };
    if (bulkForm.availableCount !== '') payload.availableCount = parseInt(bulkForm.availableCount);
    if (bulkForm.priceOverride !== '') payload.priceOverride = parseFloat(bulkForm.priceOverride);

    setSaving(true);
    try {
      const res = await adminApi.bulkUpdateInventory(payload);
      toast.success(`Updated ${res.data.data.updatedDates} dates`);
      // Refresh calendar
      const startDate = viewMonth.format('YYYY-MM-DD');
      const endDate = viewMonth.endOf('month').format('YYYY-MM-DD');
      roomsApi.getInventoryCalendar(selectedRoom.id, { startDate, endDate })
        .then((r) => setCalendar(r.data.data?.calendar || []))
        .catch(() => {});
    } catch (err) {
      toast.error(err.response?.data?.message || 'Update failed');
    } finally {
      setSaving(false);
    }
  };

  // Build calendar grid
  const daysInMonth = viewMonth.daysInMonth();
  const calMap = {};
  calendar.forEach((d) => { if (d.date) calMap[d.date] = d; });

  if (loading || !user) return null;

  return (
    <main className="min-h-[80vh] bg-gray-50/50">
      <AdminPageHeader title="Inventory & Availability" description="Manage room stock, pricing overrides and closures" />

      <div className="max-w-7xl mx-auto px-5 sm:px-8 py-8">
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Sidebar: Room selector + bulk update */}
        <div className="space-y-4">
          {/* Room Selector */}
          <div className="rounded-2xl border border-gray-100 bg-white p-4">
            <h3 className="font-semibold text-gray-900 mb-3">Select Room Type</h3>
            {loadingRooms ? (
              <div className="space-y-2">{[...Array(3)].map((_, i) => <div key={i} className="h-10 bg-gray-100 animate-pulse rounded" />)}</div>
            ) : (
              <div className="space-y-2">
                {roomTypes.map((rt) => (
                  <button
                    key={rt.id}
                    onClick={() => setSelectedRoom(rt)}
                    className={`w-full text-left px-3 py-2 rounded-lg text-sm transition ${
                      selectedRoom?.id === rt.id ? 'bg-primary-600 text-white' : 'hover:bg-gray-100 text-gray-700'
                    }`}
                  >
                    <p className="font-medium">{rt.name}</p>
                    <p className={`text-xs mt-0.5 ${selectedRoom?.id === rt.id ? 'text-primary-100' : 'text-gray-400'}`}>
                      {rt.totalRooms} rooms · {formatCurrency(rt.basePriceDaily)}/night
                    </p>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Bulk Update Panel */}
          {selectedRoom && (
            <div className="rounded-2xl border border-gray-100 bg-white p-4">
              <h3 className="font-semibold text-gray-900 mb-3">Bulk Update</h3>
              <div className="space-y-3 text-sm">
                <div>
                  <label className="label text-xs">Start Date</label>
                  <input
                    type="date"
                    className="input"
                    value={bulkForm.startDate}
                    onChange={(e) => setBulkForm((f) => ({ ...f, startDate: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="label text-xs">End Date</label>
                  <input
                    type="date"
                    className="input"
                    value={bulkForm.endDate}
                    onChange={(e) => setBulkForm((f) => ({ ...f, endDate: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="label text-xs">Available Count (leave blank = no change)</label>
                  <input
                    type="number"
                    min="0"
                    max={selectedRoom.totalRooms}
                    className="input"
                    placeholder={`max ${selectedRoom.totalRooms}`}
                    value={bulkForm.availableCount}
                    onChange={(e) => setBulkForm((f) => ({ ...f, availableCount: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="label text-xs">Price Override (₹, leave blank = base price)</label>
                  <input
                    type="number"
                    min="0"
                    className="input"
                    placeholder={`base: ₹${selectedRoom.basePriceDaily}`}
                    value={bulkForm.priceOverride}
                    onChange={(e) => setBulkForm((f) => ({ ...f, priceOverride: e.target.value }))}
                  />
                </div>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={bulkForm.isClosed}
                    onChange={(e) => setBulkForm((f) => ({ ...f, isClosed: e.target.checked }))}
                  />
                  <span className="text-sm text-gray-700">Mark as Closed</span>
                </label>
                <button
                  onClick={applyBulkUpdate}
                  disabled={saving}
                  className="w-full btn-primary text-sm py-2"
                >
                  {saving ? 'Updating…' : 'Apply to Date Range'}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Calendar View */}
        <div className="lg:col-span-3">
          {selectedRoom ? (
            <div className="rounded-2xl border border-gray-100 bg-white p-5">
              <div className="flex items-center justify-between mb-5">
                <div>
                  <h2 className="font-semibold text-gray-900">{selectedRoom.name}</h2>
                  <p className="text-sm text-gray-500">{selectedRoom.totalRooms} total rooms · Base price: {formatCurrency(selectedRoom.basePriceDaily)}/night</p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setViewMonth((m) => m.subtract(1, 'month'))}
                    className="p-2 hover:bg-gray-100 rounded-lg transition"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <span className="font-semibold text-gray-800 min-w-[120px] text-center">
                    {viewMonth.format('MMMM YYYY')}
                  </span>
                  <button
                    onClick={() => setViewMonth((m) => m.add(1, 'month'))}
                    className="p-2 hover:bg-gray-100 rounded-lg transition"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Day headers */}
              <div className="grid grid-cols-7 gap-1 mb-1 text-center text-xs font-medium text-gray-400">
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => <div key={d}>{d}</div>)}
              </div>

              {/* Calendar grid */}
              {loadingCalendar ? (
                <div className="h-48 flex items-center justify-center text-gray-400">Loading calendar…</div>
              ) : (
                <div className="grid grid-cols-7 gap-1">
                  {/* Empty cells for days before month start */}
                  {[...Array(viewMonth.day())].map((_, i) => <div key={`empty-${i}`} />)}

                  {[...Array(daysInMonth)].map((_, i) => {
                    const date = viewMonth.date(i + 1).format('YYYY-MM-DD');
                    const inv = calMap[date];
                    const isPast = dayjs(date).isBefore(dayjs(), 'day');
                    const isClosed = inv?.isClosed;
                    const available = inv?.availableCount ?? selectedRoom.totalRooms;
                    const price = inv?.priceOverride || selectedRoom.basePriceDaily;
                    const isToday = date === dayjs().format('YYYY-MM-DD');

                    return (
                      <div
                        key={date}
                        className={`rounded-lg p-1.5 text-center text-xs border transition min-h-[60px] flex flex-col justify-between ${
                          isClosed ? 'bg-red-50 border-red-200'
                          : available === 0 ? 'bg-orange-50 border-orange-200'
                          : isPast ? 'bg-gray-50 border-gray-100 opacity-60'
                          : inv?.priceOverride ? 'bg-blue-50 border-blue-200'
                          : 'bg-white border-gray-100 hover:bg-gray-50'
                        } ${isToday ? 'ring-2 ring-primary-400' : ''}`}
                      >
                        <p className={`font-semibold ${isToday ? 'text-primary-600' : 'text-gray-700'}`}>{i + 1}</p>
                        {isClosed ? (
                          <p className="text-red-600 font-medium">Closed</p>
                        ) : (
                          <>
                            <p className={`font-medium ${available === 0 ? 'text-orange-600' : 'text-green-600'}`}>
                              {available}/{selectedRoom.totalRooms}
                            </p>
                            {inv?.priceOverride && (
                              <p className="text-blue-600 text-xs">₹{inv.priceOverride.toLocaleString()}</p>
                            )}
                          </>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Legend */}
              <div className="flex flex-wrap gap-4 mt-4 text-xs text-gray-500">
                <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-white border border-gray-200 inline-block" />Available</span>
                <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-orange-50 border border-orange-200 inline-block" />Sold Out</span>
                <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-red-50 border border-red-200 inline-block" />Closed</span>
                <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-blue-50 border border-blue-200 inline-block" />Price Override</span>
              </div>
            </div>
          ) : (
            <div className="rounded-2xl border border-gray-100 bg-white p-10 text-center text-gray-400">
              <Calendar className="w-10 h-10 mx-auto mb-3 text-gray-300" />
              <p>Select a room type to view its availability calendar</p>
            </div>
          )}
        </div>
      </div>
      </div>
    </main>
  );
}
