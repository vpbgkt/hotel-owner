'use client';

import { useEffect, useState } from 'react';
import dayjs from 'dayjs';
import Modal from '@/components/ui/Modal';
import { bookingsApi } from '@/lib/api';
import { formatCurrency } from '@/lib/utils';
import { CalendarDays, Users, BedDouble, Mail, Phone, CheckCircle2, CreditCard, MessageSquare } from 'lucide-react';

const STATUS_COLORS = {
  PENDING: 'bg-yellow-50 text-yellow-700',
  CONFIRMED: 'bg-blue-50 text-blue-700',
  CHECKED_IN: 'bg-green-50 text-green-700',
  CHECKED_OUT: 'bg-gray-100 text-gray-600',
  CANCELLED: 'bg-red-50 text-red-700',
  NO_SHOW: 'bg-orange-50 text-orange-700',
};

// Full booking details modal — used by Admin Dashboard (Recent Bookings) and
// Admin > Manage Bookings tables. Fetches the complete booking record (including
// hotel/room type/guest relations and pricing breakdown) by id, since list
// endpoints only return a trimmed subset of fields.
export default function BookingDetailsModal({ bookingId, onClose }) {
  const [booking, setBooking] = useState(null);
  const [loadingBooking, setLoadingBooking] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!bookingId) return;
    setLoadingBooking(true);
    setError(false);
    bookingsApi.getById(bookingId)
      .then((res) => setBooking(res.data.data))
      .catch(() => setError(true))
      .finally(() => setLoadingBooking(false));
  }, [bookingId]);

  return (
    <Modal open={!!bookingId} onClose={onClose} title="Booking Details" maxWidth="max-w-lg">
      {loadingBooking ? (
        <div className="py-10 flex items-center justify-center">
          <span className="animate-spin h-6 w-6 rounded-full border-b-2 border-primary-600" />
        </div>
      ) : error || !booking ? (
        <p className="text-center py-10 text-gray-400">Could not load booking details.</p>
      ) : (
        <div className="space-y-6">
          {/* Header */}
          <div className="flex justify-between items-start pb-5 border-b border-gray-100">
            <div>
              <p className="font-mono text-xs text-gray-400 mb-1">{booking.bookingNumber}</p>
              <h3 className="text-lg font-semibold text-gray-900">{booking.guestName}</h3>
              <p className="text-gray-500 text-sm mt-0.5">{booking.roomType?.name}</p>
            </div>
            <span className={`text-xs px-2.5 py-1 rounded-full font-medium flex-shrink-0 ${STATUS_COLORS[booking.status] || 'bg-gray-100 text-gray-600'}`}>
              {booking.status?.replace('_', ' ')}
            </span>
          </div>

          {/* Dates / Guests / Rooms */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {booking.bookingType === 'HOURLY' ? (
              <>
                <div className="rounded-xl border border-gray-100 p-3">
                  <CalendarDays className="w-4 h-4 text-primary-600 mb-1.5" />
                  <p className="text-xs text-gray-400 uppercase tracking-wide">Check-in</p>
                  <p className="font-semibold text-gray-900 text-sm">{booking.checkInTime ? dayjs(booking.checkInTime).format('DD MMM, HH:mm') : '—'}</p>
                </div>
                <div className="rounded-xl border border-gray-100 p-3">
                  <CalendarDays className="w-4 h-4 text-primary-600 mb-1.5" />
                  <p className="text-xs text-gray-400 uppercase tracking-wide">Check-out</p>
                  <p className="font-semibold text-gray-900 text-sm">{booking.checkOutTime ? dayjs(booking.checkOutTime).format('DD MMM, HH:mm') : '—'}</p>
                </div>
              </>
            ) : (
              <>
                <div className="rounded-xl border border-gray-100 p-3">
                  <CalendarDays className="w-4 h-4 text-primary-600 mb-1.5" />
                  <p className="text-xs text-gray-400 uppercase tracking-wide">Check-in</p>
                  <p className="font-semibold text-gray-900 text-sm">{booking.checkInDate ? dayjs(booking.checkInDate).format('DD MMM YYYY') : '—'}</p>
                </div>
                <div className="rounded-xl border border-gray-100 p-3">
                  <CalendarDays className="w-4 h-4 text-primary-600 mb-1.5" />
                  <p className="text-xs text-gray-400 uppercase tracking-wide">Check-out</p>
                  <p className="font-semibold text-gray-900 text-sm">{booking.checkOutDate ? dayjs(booking.checkOutDate).format('DD MMM YYYY') : '—'}</p>
                </div>
              </>
            )}
            <div className="rounded-xl border border-gray-100 p-3">
              <Users className="w-4 h-4 text-primary-600 mb-1.5" />
              <p className="text-xs text-gray-400 uppercase tracking-wide">Guests</p>
              <p className="font-semibold text-gray-900 text-sm">
                {booking.numAdults ?? booking.numGuests} Adult{(booking.numAdults ?? booking.numGuests) > 1 ? 's' : ''}
                {booking.numChildren > 0 && `, ${booking.numChildren} Child`}
              </p>
            </div>
            <div className="rounded-xl border border-gray-100 p-3">
              <BedDouble className="w-4 h-4 text-primary-600 mb-1.5" />
              <p className="text-xs text-gray-400 uppercase tracking-wide">Rooms</p>
              <p className="font-semibold text-gray-900 text-sm">{booking.numRooms}</p>
            </div>
          </div>

          {/* Guest Info */}
          <div>
            <h4 className="text-xs font-semibold text-gray-900 uppercase tracking-wide mb-2.5">Guest Information</h4>
            <div className="rounded-xl border border-gray-100 p-4 space-y-2 text-sm text-gray-600">
              <p className="font-medium text-gray-900">{booking.guestName}</p>
              {booking.guestEmail && (
                <p className="flex items-center gap-2"><Mail className="w-3.5 h-3.5 text-gray-400" /> {booking.guestEmail}</p>
              )}
              {booking.guestPhone && (
                <p className="flex items-center gap-2"><Phone className="w-3.5 h-3.5 text-gray-400" /> {booking.guestPhone}</p>
              )}
            </div>
          </div>

          {/* Pricing */}
          <div>
            <h4 className="text-xs font-semibold text-gray-900 uppercase tracking-wide mb-2.5">Price Breakdown</h4>
            <div className="rounded-xl border border-gray-100 p-4 space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">Room charges</span>
                <span className="font-medium text-gray-900">{formatCurrency(booking.roomTotal)}</span>
              </div>
              {booking.extraGuestTotal > 0 && (
                <div className="flex justify-between">
                  <span className="text-gray-500">Extra guest charges</span>
                  <span className="font-medium text-gray-900">{formatCurrency(booking.extraGuestTotal)}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-gray-500">GST & taxes</span>
                <span className="font-medium text-gray-900">{formatCurrency(booking.taxes)}</span>
              </div>
              {booking.discountAmount > 0 && (
                <div className="flex justify-between text-green-600">
                  <span>Discount applied</span>
                  <span>-{formatCurrency(booking.discountAmount)}</span>
                </div>
              )}
              <div className="flex justify-between pt-2.5 mt-1 border-t border-gray-100">
                <span className="font-semibold text-gray-900">Total</span>
                <span className="font-bold text-gray-900 text-base">{formatCurrency(booking.totalAmount)}</span>
              </div>
            </div>
            <div className={`inline-flex items-center gap-1.5 mt-3 text-xs px-2.5 py-1 rounded-full font-medium ${
              booking.paymentStatus === 'PAID' ? 'bg-green-50 text-green-700' :
              booking.paymentStatus === 'PENDING' ? 'bg-yellow-50 text-yellow-700' :
              'bg-gray-100 text-gray-500'
            }`}>
              {booking.paymentStatus === 'PAID' ? <CheckCircle2 className="w-3 h-3" /> : <CreditCard className="w-3 h-3" />}
              Payment: {booking.paymentStatus}
            </div>
          </div>

          {booking.specialRequests && (
            <div>
              <h4 className="text-xs font-semibold text-gray-900 uppercase tracking-wide mb-2.5 flex items-center gap-1.5">
                <MessageSquare className="w-3.5 h-3.5" /> Special Requests
              </h4>
              <p className="text-sm text-gray-600 rounded-xl border border-gray-100 p-4">{booking.specialRequests}</p>
            </div>
          )}
        </div>
      )}
    </Modal>
  );
}
