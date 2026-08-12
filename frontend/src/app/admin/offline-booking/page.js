'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { adminApi, roomsApi, hotelsApi } from '@/lib/api';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { formatCurrency } from '@/lib/utils';
import AdminPageHeader from '@/components/admin/AdminPageHeader';
import toast from 'react-hot-toast';
import dayjs from 'dayjs';
import { CheckCircle2, XCircle } from 'lucide-react';

const PAYMENT_METHODS = ['CASH', 'UPI', 'CARD', 'BANK_TRANSFER', 'OTHER'];
// Same fallback used by the backend (booking.service.js / room.service.js /
// admin.service.js) when a hotel has no gstRate saved yet.
const DEFAULT_TAX_RATE = 0.12;
const HOTEL_ID = '11111111-1111-1111-1111-111111111111';

export default function OfflineBookingPage() {
  const { user, loading, isAuthenticated } = useAuth();
  const router = useRouter();
  const [roomTypes, setRoomTypes] = useState([]);
  const [loadingRooms, setLoadingRooms] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [preview, setPreview] = useState(null);
  const [bookingType, setBookingType] = useState('DAILY');
  const [availability, setAvailability] = useState(null);
  const [checkingAvailability, setCheckingAvailability] = useState(false);
  const [gstRate, setGstRate] = useState(DEFAULT_TAX_RATE);

  const { register, handleSubmit, watch, reset, setValue, formState: { errors } } = useForm({
    defaultValues: {
      bookingType: 'DAILY',
      numRooms: 1,
      numAdults: 1,
      numChildren: 0,
      paymentMethod: 'CASH',
      checkInDate: dayjs().format('YYYY-MM-DD'),
      checkOutDate: dayjs().add(1, 'day').format('YYYY-MM-DD'),
    },
  });

  // Watch individual fields rather than watch([...]) — the array form returns a
  // brand-new array reference on every render, which made effects below re-run
  // every render (infinite update loop) even when values hadn't changed.
  const roomTypeId = watch('roomTypeId');
  const checkInDate = watch('checkInDate');
  const checkOutDate = watch('checkOutDate');
  const numRooms = watch('numRooms');
  const numAdults = watch('numAdults');
  const numChildren = watch('numChildren');
  const numHours = watch('numHours');

  const selectedRT = roomTypes.find((r) => String(r.id) === String(roomTypeId));
  const maxAdults = (selectedRT?.maxAdults ?? selectedRT?.maxGuests ?? 10) * (parseInt(numRooms) || 1);
  const maxChildren = (selectedRT?.maxChildren ?? 0) * (parseInt(numRooms) || 1);
  const maxOccupancy = (selectedRT?.maxGuests ?? 10) * (parseInt(numRooms) || 1);
  const totalGuests = (parseInt(numAdults) || 0) + (parseInt(numChildren) || 0);
  const occupancyError = !!selectedRT && totalGuests > maxOccupancy;

  useEffect(() => {
    if (!loading && (!isAuthenticated || !['HOTEL_ADMIN', 'HOTEL_STAFF'].includes(user?.role))) {
      router.replace('/dashboard');
    }
  }, [loading, isAuthenticated, user, router]);

  useEffect(() => {
    if (!isAuthenticated) return;
    adminApi.listRoomTypes({})
      .then((res) => setRoomTypes(res.data.data || []))
      .catch(() => {})
      .finally(() => setLoadingRooms(false));
  }, [isAuthenticated]);

  // Prefill guest details when arriving from "New Booking for Guest" on the
  // Guests page (passed as ?guestName=&guestPhone=&guestEmail= query params).
  // Read from window.location to avoid a useSearchParams Suspense boundary.
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    const gName = params.get('guestName');
    const gPhone = params.get('guestPhone');
    const gEmail = params.get('guestEmail');
    if (gName) setValue('guestName', gName);
    if (gPhone) setValue('guestPhone', gPhone);
    if (gEmail) setValue('guestEmail', gEmail);
  }, [setValue]);

  // Load the hotel's actual GST rate so the price preview matches what the
  // backend will charge (previously hardcoded to 12% here, ignoring whatever
  // rate was saved in Admin > Settings > Tax & GST).
  useEffect(() => {
    if (!isAuthenticated) return;
    hotelsApi.getById(HOTEL_ID)
      .then((res) => {
        const rate = res.data?.data?.gstRate;
        if (rate !== undefined && rate !== null) setGstRate(rate);
      })
      .catch(() => {/* keep default fallback */});
  }, [isAuthenticated]);

  // Real-time price preview
  useEffect(() => {
    if (!roomTypeId) { setPreview(null); return; }

    // roomTypeId from the <select> is always a string; RoomType.id is an
    // integer in the DB, so a strict `===` comparison never matches and the
    // preview silently stayed null. Compare as strings instead.
    const rt = roomTypes.find((r) => String(r.id) === String(roomTypeId));
    if (!rt) { setPreview(null); return; }

    let subtotal = 0;
    let nights = 0;
    let hours = 0;

    if (bookingType === 'DAILY' && checkInDate && checkOutDate) {
      nights = dayjs(checkOutDate).diff(dayjs(checkInDate), 'day');
      if (nights < 1) { setPreview(null); return; }
      subtotal = (rt.basePriceDaily || 0) * nights * (parseInt(numRooms) || 1);
    } else if (bookingType === 'HOURLY' && numHours) {
      hours = parseInt(numHours) || 1;
      subtotal = (rt.basePriceHourly || rt.basePriceDaily / 12) * hours * (parseInt(numRooms) || 1);
    }

    const taxRate = gstRate ?? DEFAULT_TAX_RATE;
    const taxAmount = Math.round(subtotal * taxRate);
    const total = subtotal + taxAmount;

    setPreview({ subtotal, taxAmount, total, nights, hours, rtName: rt.name, taxRate });
  }, [roomTypeId, checkInDate, checkOutDate, numRooms, numHours, bookingType, roomTypes, gstRate]);

  // Live "rooms available" check for daily bookings, so staff can see current
  // stock for the selected room type + dates before confirming a walk-in.
  useEffect(() => {
    if (bookingType !== 'DAILY' || !roomTypeId || !checkInDate || !checkOutDate) {
      setAvailability(null);
      return;
    }
    if (!dayjs(checkOutDate).isAfter(dayjs(checkInDate))) {
      setAvailability(null);
      return;
    }

    let cancelled = false;
    setCheckingAvailability(true);
    roomsApi.checkDailyAvailability({ roomTypeId, checkInDate, checkOutDate })
      .then((res) => { if (!cancelled) setAvailability(res.data.data); })
      .catch(() => { if (!cancelled) setAvailability(null); })
      .finally(() => { if (!cancelled) setCheckingAvailability(false); });

    return () => { cancelled = true; };
  }, [roomTypeId, checkInDate, checkOutDate, bookingType]);

  const onSubmit = async (data) => {
    if (bookingType === 'DAILY' && availability && !availability.isAvailable) {
      toast.error('Not enough rooms available for the selected dates');
      return;
    }
    if (occupancyError) {
      toast.error(`Total guests (${totalGuests}) exceed max occupancy of ${maxOccupancy}`);
      return;
    }
    setSubmitting(true);
    try {
      const adults = parseInt(data.numAdults) || 1;
      const children = parseInt(data.numChildren) || 0;
      const res = await adminApi.createOfflineBooking({
        ...data,
        bookingType,
        numAdults: adults,
        numChildren: children,
        numGuests: adults + children,
      });
      const booking = res.data.data;
      toast.success(`Booking ${booking.bookingNumber} created!`);
      // Invalidate the App Router client cache so the bookings list reflects the
      // new booking, then send the user to Manage Bookings to see it.
      router.refresh();
      router.push('/admin/bookings');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create booking');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading || !user) return null;

  return (
    <main className="min-h-[80vh] bg-gray-50/50">
      <AdminPageHeader
        title="Walk-in / Counter Booking"
        description="Create a booking directly for a guest at the front desk"
        actions={<span className="bg-orange-50 text-orange-700 text-xs px-3 py-1 rounded-full font-medium">Offline</span>}
      />

      <div className="max-w-7xl mx-auto px-5 sm:px-8 py-8">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Form */}
        <div className="lg:col-span-2">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            {/* Booking Type Toggle */}
            <div className="rounded-2xl border border-gray-100 bg-white p-5">
              <h2 className="font-semibold text-gray-900 mb-3">Booking Type</h2>
              <div className="flex gap-2">
                {['DAILY', 'HOURLY'].map((bt) => (
                  <button
                    key={bt}
                    type="button"
                    onClick={() => setBookingType(bt)}
                    className={`flex-1 py-2.5 rounded-lg text-sm font-medium border transition ${
                      bookingType === bt
                        ? 'bg-primary-600 text-white border-primary-600'
                        : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
                    }`}
                  >
                    {bt === 'DAILY' ? 'Daily Booking' : 'Hourly Booking'}
                  </button>
                ))}
              </div>
            </div>

            {/* Room & Dates */}
            <div className="rounded-2xl border border-gray-100 bg-white p-5 space-y-4">
              <h2 className="font-semibold text-gray-900">Room & Dates</h2>
              <div>
                <label className="label">Room Type *</label>
                {loadingRooms ? (
                  <div className="input animate-pulse bg-gray-100" />
                ) : (
                  <select className="input" {...register('roomTypeId', { required: 'Select a room type' })}>
                    <option value="">— Select room type —</option>
                    {roomTypes.map((rt) => (
                      <option key={rt.id} value={rt.id}>
                        {rt.name} · {formatCurrency(rt.basePriceDaily)}/night
                        {rt.basePriceHourly ? ` · ${formatCurrency(rt.basePriceHourly)}/hr` : ''}
                      </option>
                    ))}
                  </select>
                )}
                {errors.roomTypeId && <p className="error-message">{errors.roomTypeId.message}</p>}
              </div>

              {bookingType === 'DAILY' && roomTypeId && (
                <div className={`flex items-center gap-2 text-sm px-3 py-2 rounded-lg border ${
                  checkingAvailability ? 'bg-gray-50 border-gray-200 text-gray-500'
                  : availability?.isAvailable ? 'bg-green-50 border-green-200 text-green-700'
                  : availability ? 'bg-red-50 border-red-200 text-red-700'
                  : 'bg-gray-50 border-gray-200 text-gray-400'
                }`}>
                  {checkingAvailability ? (
                    'Checking availability…'
                  ) : availability ? (
                    availability.isAvailable ? (
                      <><CheckCircle2 className="w-4 h-4 flex-shrink-0" /> {availability.availableRooms} room(s) available for selected dates</>
                    ) : availability.isClosed ? (
                      <><XCircle className="w-4 h-4 flex-shrink-0" /> Closed for selected dates</>
                    ) : (
                      <><XCircle className="w-4 h-4 flex-shrink-0" /> Only {availability.availableRooms} room(s) available — not enough for this booking</>
                    )
                  ) : (
                    'Select check-in/check-out dates to see availability'
                  )}
                </div>
              )}

              {bookingType === 'DAILY' ? (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="label">Check-in Date *</label>
                    <input type="date" className="input" {...register('checkInDate', { required: true })} />
                  </div>
                  <div>
                    <label className="label">Check-out Date *</label>
                    <input type="date" className="input" {...register('checkOutDate', { required: true })} />
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="label">Check-in *</label>
                    <input type="datetime-local" className="input" {...register('checkInTime', { required: true })} />
                  </div>
                  <div>
                    <label className="label">Check-out *</label>
                    <input type="datetime-local" className="input" {...register('checkOutTime', { required: true })} />
                  </div>
                  <div>
                    <label className="label">Hours *</label>
                    <input type="number" min="1" max="23" className="input" {...register('numHours', { required: true, min: 1 })} />
                  </div>
                </div>
              )}

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="label">Rooms</label>
                  <input type="number" min="1" className="input" {...register('numRooms', { min: 1 })} />
                </div>
                <div>
                  <label className="label">Adults <span className="text-gray-400 text-xs">(max {maxAdults})</span></label>
                  <input type="number" min="1" max={maxAdults} className="input"
                    {...register('numAdults', { min: 1, max: maxAdults, required: true, valueAsNumber: true })} />
                  {errors.numAdults && <p className="error-message">1–{maxAdults} adults allowed</p>}
                </div>
                <div>
                  <label className="label">Children <span className="text-gray-400 text-xs">(max {maxChildren})</span></label>
                  <input type="number" min="0" max={maxChildren} className="input"
                    {...register('numChildren', { min: 0, max: maxChildren, valueAsNumber: true })} />
                  {errors.numChildren && <p className="error-message">Max {maxChildren} children allowed</p>}
                </div>
              </div>
              {occupancyError && (
                <p className="text-red-500 text-xs">Total guests ({totalGuests}) exceed max occupancy of {maxOccupancy}.</p>
              )}
            </div>

            {/* Guest Info */}
            <div className="rounded-2xl border border-gray-100 bg-white p-5 space-y-4">
              <h2 className="font-semibold text-gray-900">Guest Information</h2>
              <div>
                <label className="label">Guest Name *</label>
                <input className="input" placeholder="Full name" {...register('guestName', { required: 'Name is required' })} />
                {errors.guestName && <p className="error-message">{errors.guestName.message}</p>}
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">Phone</label>
                  <input className="input" placeholder="+91 98765 43210" {...register('guestPhone')} />
                </div>
                <div>
                  <label className="label">Email</label>
                  <input type="email" className="input" placeholder="guest@example.com" {...register('guestEmail')} />
                </div>
              </div>
              <div>
                <label className="label">Notes / Special Requests</label>
                <textarea className="input h-20 resize-none" placeholder="Any special requirements…" {...register('notes')} />
              </div>
            </div>

            {/* Payment */}
            <div className="rounded-2xl border border-gray-100 bg-white p-5 space-y-3">
              <h2 className="font-semibold text-gray-900">Payment Method</h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {PAYMENT_METHODS.map((pm) => (
                  <label key={pm} className="flex items-center gap-2 p-3 border rounded-xl cursor-pointer hover:bg-gray-50 has-[:checked]:bg-primary-50 has-[:checked]:border-primary-400 transition">
                    <input type="radio" value={pm} {...register('paymentMethod')} />
                    <span className="text-sm font-medium">{pm === 'BANK_TRANSFER' ? 'Bank Transfer' : pm.charAt(0) + pm.slice(1).toLowerCase()}</span>
                  </label>
                ))}
              </div>
            </div>

            <button
              type="submit"
              disabled={submitting || occupancyError}
              className="w-full btn-primary py-4 text-base font-semibold"
            >
              {submitting ? 'Creating Booking…' : 'Confirm Walk-in Booking'}
            </button>
          </form>
        </div>

        {/* Price Preview */}
        <div>
          <div className="rounded-2xl border border-gray-100 bg-white p-5 sticky top-6">
            <h2 className="font-semibold text-gray-900 mb-4">Price Summary</h2>
            {preview ? (
              <div className="space-y-3 text-sm">
                <div className="text-center py-3 bg-gray-50 rounded-xl mb-4">
                  <p className="text-gray-500">Room</p>
                  <p className="font-semibold text-gray-900">{preview.rtName}</p>
                  {preview.nights > 0 && <p className="text-gray-500 text-xs">{preview.nights} night(s)</p>}
                  {preview.hours > 0 && <p className="text-gray-500 text-xs">{preview.hours} hour(s)</p>}
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Room charges</span>
                  <span>{formatCurrency(preview.subtotal)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">GST ({Math.round((preview.taxRate ?? DEFAULT_TAX_RATE) * 100)}%)</span>
                  <span>{formatCurrency(preview.taxAmount)}</span>
                </div>
                <div className="flex justify-between font-bold text-base border-t pt-3 mt-2">
                  <span>Total</span>
                  <span className="text-primary-600">{formatCurrency(preview.total)}</span>
                </div>
              </div>
            ) : (
              <div className="text-center py-8 text-gray-400">
                <p className="text-sm">Select a room and dates to see the price breakdown</p>
              </div>
            )}
          </div>
        </div>
      </div>
      </div>
    </main>
  );
}
