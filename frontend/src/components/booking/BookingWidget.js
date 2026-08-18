'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { bookingsApi, roomsApi } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { formatCurrency } from '@/lib/utils';
import toast from 'react-hot-toast';

// ── Daily booking form ──────────────────────────────────────────────────────
function DailyBookingForm({ hotel, selectedRT, selectedRoomType }) {
  const router = useRouter();
  const { isAuthenticated, user } = useAuth();
  const [availability, setAvailability] = useState(null);
  const [checking, setChecking] = useState(false);
  const [booking, setBooking] = useState(false);

  const today = new Date().toISOString().split('T')[0];
  const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0];

  const { register, handleSubmit, watch, formState: { errors } } = useForm({
    defaultValues: { checkInDate: today, checkOutDate: tomorrow, numRooms: 1, numAdults: 1, numChildren: 0 },
  });
  const numRooms = parseInt(watch('numRooms') || 1);
  const maxAdults = (selectedRT?.maxAdults ?? selectedRT?.maxGuests ?? 10) * numRooms;
  const maxChildren = (selectedRT?.maxChildren ?? 0) * numRooms;
  const maxOccupancy = (selectedRT?.maxGuests ?? 10) * numRooms;
  const numAdults = parseInt(watch('numAdults') || 0);
  const numChildren = parseInt(watch('numChildren') || 0);
  const totalGuests = numAdults + numChildren;
  const occupancyError = totalGuests > maxOccupancy;

  const checkAvailability = async (data) => {
    setChecking(true);
    setAvailability(null);
    try {
      const res = await roomsApi.checkDailyAvailability({
        roomTypeId: selectedRoomType,
        checkInDate: data.checkInDate,
        checkOutDate: data.checkOutDate,
        numRooms: data.numRooms,
      });
      setAvailability(res.data.data);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to check availability');
    } finally {
      setChecking(false);
    }
  };

  const onBook = async (data) => {
    if (!isAuthenticated) { toast.error('Please sign in to book'); router.push('/auth/login'); return; }
    if (!user?.emailVerified) { toast.error('Please verify your email before booking'); return; }
    setBooking(true);
    try {
      const adults = parseInt(data.numAdults);
      const children = parseInt(data.numChildren) || 0;
      const res = await bookingsApi.createDaily({
        hotelId: hotel.id,
        roomTypeId: selectedRoomType,
        checkInDate: data.checkInDate,
        checkOutDate: data.checkOutDate,
        numRooms: parseInt(data.numRooms),
        numAdults: adults,
        numChildren: children,
        numGuests: adults + children,
        guestName: data.guestName,
        guestPhone: data.guestPhone,
        guestEmail: data.guestEmail,
      });
      toast.success('Booking created!');
      router.push(`/bookings/${res.data.data.id}`);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Booking failed');
    } finally {
      setBooking(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(availability ? onBook : checkAvailability)} className="space-y-4">
      <div>
        <label className="label">Check-in Date</label>
        <input type="date" className="input" min={today} {...register('checkInDate', { required: true })} />
      </div>
      <div>
        <label className="label">Check-out Date</label>
        <input type="date" className="input" min={today} {...register('checkOutDate', { required: true })} />
      </div>
      <div>
        <label className="label">Rooms</label>
        <input type="number" min={1} max={availability?.availableRooms ?? selectedRT?.totalRooms ?? 10} className="input"
          {...register('numRooms', { min: 1, max: availability?.availableRooms ?? selectedRT?.totalRooms ?? 10 })} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label">Adults <span className="text-gray-400 text-xs">(max {maxAdults})</span></label>
          <input type="number" min={1} max={maxAdults} className="input"
            {...register('numAdults', { min: 1, max: maxAdults, required: true, valueAsNumber: true })} />
          {errors.numAdults && <p className="text-red-500 text-xs mt-1">1–{maxAdults} adults allowed</p>}
        </div>
        <div>
          <label className="label">Children <span className="text-gray-400 text-xs">(max {maxChildren})</span></label>
          <input type="number" min={0} max={maxChildren} className="input"
            {...register('numChildren', { min: 0, max: maxChildren, valueAsNumber: true })} />
          {errors.numChildren && <p className="text-red-500 text-xs mt-1">Max {maxChildren} children allowed</p>}
        </div>
      </div>
      {occupancyError && (
        <p className="text-red-500 text-xs">Total guests ({totalGuests}) exceed max occupancy of {maxOccupancy}.</p>
      )}

      {availability && (
        <>
          <div><label className="label">Your Name</label><input className="input" placeholder="Full name" {...register('guestName', { required: true })} /></div>
          <div><label className="label">Phone</label><input className="input" placeholder="+919999999999" {...register('guestPhone', { required: true })} /></div>
          <div><label className="label">Email</label><input type="email" className="input" placeholder="email@example.com" {...register('guestEmail')} /></div>
        </>
      )}

      {availability && (
        <div className={`rounded-xl p-4 text-sm ${availability.isAvailable ? 'bg-primary-50 border border-primary-200' : 'bg-red-50 border border-red-200'}`}>
          {availability.isAvailable ? (
            <div className="text-gray-700">
              <div className="flex items-center justify-between mb-2">
                <p className="font-semibold text-primary-800">✓ Available</p>
                <span className="text-xs bg-primary-100 text-primary-800 px-2 py-0.5 rounded-full font-medium">
                  {availability.availableRooms} room{availability.availableRooms !== 1 ? 's' : ''} left
                </span>
              </div>
              <div className="space-y-1">
                <div className="flex justify-between"><span>{availability.nights} night{availability.nights > 1 ? 's' : ''} × {formatCurrency(availability.pricePerNight)}</span><span>{formatCurrency(availability.subtotal ?? availability.totalPrice)}</span></div>
                {availability.taxAmount > 0 && <div className="flex justify-between text-gray-500"><span>GST ({Math.round((availability.taxRate ?? 0.12) * 100)}%)</span><span>+{formatCurrency(availability.taxAmount)}</span></div>}
                <div className="flex justify-between font-bold text-primary-900 pt-2 border-t border-primary-200 mt-1"><span>Total</span><span>{formatCurrency(availability.totalPrice)}</span></div>
              </div>
            </div>
          ) : (
            <p className="text-red-700">❌ Not available for selected dates.</p>
          )}
        </div>
      )}

      <button type="submit" disabled={checking || booking || occupancyError} className="btn-primary w-full">
        {checking ? 'Checking…' : booking ? 'Booking…' : availability?.isAvailable ? 'Confirm Booking' : 'Check Availability'}
      </button>
      {availability && <button type="button" onClick={() => setAvailability(null)} className="w-full text-center text-sm text-gray-500 hover:text-gray-700">Change dates</button>}
    </form>
  );
}

// ── Hourly booking form ─────────────────────────────────────────────────────
function HourlyBookingForm({ hotel, selectedRT, selectedRoomType }) {
  const router = useRouter();
  const { isAuthenticated, user } = useAuth();
  const [slots, setSlots] = useState(null);
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [numHours, setNumHours] = useState(1);
  const [checking, setChecking] = useState(false);
  const [booking, setBooking] = useState(false);
  const [guestInfo, setGuestInfo] = useState({ name: '', phone: '', email: '' });

  const today = new Date().toISOString().split('T')[0];
  const [date, setDate] = useState(today);

  const checkSlots = async () => {
    if (!date) return;
    setChecking(true);
    setSlots(null);
    setSelectedSlot(null);
    try {
      const res = await roomsApi.checkHourlyAvailability({ roomTypeId: selectedRoomType, date });
      setSlots(res.data.data?.availableSlots || []);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to fetch slots');
    } finally { setChecking(false); }
  };

  const onBook = async () => {
    if (!isAuthenticated) { toast.error('Please sign in to book'); router.push('/auth/login'); return; }
    if (!user?.emailVerified) { toast.error('Please verify your email before booking'); return; }
    if (!selectedSlot) { toast.error('Please select a time slot'); return; }
    if (!guestInfo.name || !guestInfo.phone) { toast.error('Name and phone are required'); return; }
    setBooking(true);
    try {
      const res = await bookingsApi.createHourly({
        hotelId: hotel.id,
        roomTypeId: selectedRoomType,
        date,
        slotStart: selectedSlot.slotStart,
        numHours,
        numRooms: 1,
        numGuests: 1,
        guestName: guestInfo.name,
        guestPhone: guestInfo.phone,
        guestEmail: guestInfo.email,
      });
      toast.success('Booking created!');
      router.push(`/bookings/${res.data.data.id}`);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Booking failed');
    } finally { setBooking(false); }
  };

  const pricePerHour = selectedRT?.basePriceHourly || 0;
  const total = pricePerHour * numHours;

  return (
    <div className="space-y-4">
      <div>
        <label className="label">Date</label>
        <input type="date" className="input" min={today} value={date} onChange={(e) => { setDate(e.target.value); setSlots(null); setSelectedSlot(null); }} />
      </div>
      <button type="button" onClick={checkSlots} disabled={checking} className="btn-primary w-full">
        {checking ? 'Loading slots…' : 'Show Available Slots'}
      </button>

      {slots !== null && slots.length === 0 && (
        <p className="text-center text-red-600 text-sm">No slots available for this date.</p>
      )}

      {slots && slots.length > 0 && (
        <>
          <div>
            <label className="label">Select Time Slot</label>
            <div className="grid grid-cols-2 gap-2">
              {slots.map((s) => (
                <button key={s.slotStart} type="button"
                  onClick={() => setSelectedSlot(s)}
                  className={`text-sm py-2 px-3 rounded-lg border transition-all ${selectedSlot?.slotStart === s.slotStart ? 'border-primary-500 bg-primary-50 text-primary-700 font-semibold' : 'border-gray-200 hover:border-gray-400'}`}
                >
                  {s.slotStart} – {s.slotEnd}
                </button>
              ))}
            </div>
          </div>

          {selectedSlot && (
            <>
              <div>
                <label className="label">Duration (hours)</label>
                <input type="number" min={1} max={selectedRT?.maxHours || 12} className="input"
                  value={numHours} onChange={(e) => setNumHours(Math.max(1, parseInt(e.target.value) || 1))} />
              </div>
              <div className="bg-primary-50 border border-primary-200 rounded-xl p-3 text-sm text-primary-800">
                <div className="flex justify-between"><span>{numHours}h × {formatCurrency(pricePerHour)}/hr</span><span className="font-bold">{formatCurrency(total)}</span></div>
              </div>
              <div><label className="label">Name</label><input className="input" placeholder="Full name" value={guestInfo.name} onChange={(e) => setGuestInfo((p) => ({ ...p, name: e.target.value }))} /></div>
              <div><label className="label">Phone</label><input className="input" placeholder="+919999999999" value={guestInfo.phone} onChange={(e) => setGuestInfo((p) => ({ ...p, phone: e.target.value }))} /></div>
              <div><label className="label">Email</label><input type="email" className="input" placeholder="email@example.com" value={guestInfo.email} onChange={(e) => setGuestInfo((p) => ({ ...p, email: e.target.value }))} /></div>
              <button type="button" onClick={onBook} disabled={booking} className="btn-primary w-full">
                {booking ? 'Booking…' : 'Confirm Hourly Booking'}
              </button>
            </>
          )}
        </>
      )}
    </div>
  );
}

// ── Main Widget ─────────────────────────────────────────────────────────────
export default function BookingWidget({ hotel, roomTypes }) {
  const { isAuthenticated, user } = useAuth();
  const [selectedRoomType, setSelectedRoomType] = useState(roomTypes[0]?.id || '');
  const [bookTab, setBookTab] = useState('daily');
  const needsEmailVerification = isAuthenticated && !user?.emailVerified;

  const selectedRT = roomTypes.find((rt) => String(rt.id) === String(selectedRoomType));
  const bookingModel = selectedRT?.bookingModelOverride || hotel?.bookingModel || 'DAILY';
  const showDaily = bookingModel === 'DAILY' || bookingModel === 'BOTH';
  const showHourly = bookingModel === 'HOURLY' || bookingModel === 'BOTH';

  // Default tab based on model
  const effectiveTab = bookingModel === 'HOURLY' ? 'hourly' : bookTab;

  return (
    <div className="rounded-2xl border border-gray-100 shadow-lg shadow-gray-100/60 p-6 bg-white">
      <div className="flex items-center justify-between mb-5 pb-4 border-b border-gray-100">
        <h3 className="font-display text-xl font-semibold text-gray-900">Book Your Stay</h3>
        <span className="text-xs uppercase tracking-widest text-primary-600 font-semibold">Best Rate</span>
      </div>

      {needsEmailVerification && (
        <div className="mb-4 rounded-xl bg-amber-50 border border-amber-200 p-3 text-sm text-amber-800">
          Please verify your email before booking. Check your inbox for the verification link.
        </div>
      )}

      {/* Room Type Selector */}
      {roomTypes.length > 1 && (
        <div className="mb-4">
          <label className="label">Room Type</label>
          <select className="input" value={selectedRoomType} onChange={(e) => setSelectedRoomType(e.target.value)}>
            {roomTypes.map((rt) => (
              <option key={rt.id} value={rt.id}>{rt.name} — ₹{rt.basePriceDaily}/night</option>
            ))}
          </select>
        </div>
      )}

      {/* Tab selector — only if both types are available */}
      {bookingModel === 'BOTH' && (
        <div className="flex rounded-full bg-gray-100 p-1 mb-5">
          <button type="button" onClick={() => setBookTab('daily')}
            className={`flex-1 py-2 text-sm rounded-full font-medium transition-colors ${effectiveTab === 'daily' ? 'bg-white shadow text-gray-900' : 'text-gray-500'}`}>
            🗓️ Daily
          </button>
          <button type="button" onClick={() => setBookTab('hourly')}
            className={`flex-1 py-2 text-sm rounded-full font-medium transition-colors ${effectiveTab === 'hourly' ? 'bg-white shadow text-gray-900' : 'text-gray-500'}`}>
            ⏰ Hourly
          </button>
        </div>
      )}

      {effectiveTab === 'daily' && showDaily && (
        <DailyBookingForm hotel={hotel} selectedRT={selectedRT} selectedRoomType={selectedRoomType} />
      )}
      {effectiveTab === 'hourly' && showHourly && (
        <HourlyBookingForm hotel={hotel} selectedRT={selectedRT} selectedRoomType={selectedRoomType} />
      )}
    </div>
  );
}
