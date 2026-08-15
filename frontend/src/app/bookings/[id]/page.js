'use client';

import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/context/AuthContext';
import { bookingsApi, paymentsApi } from '@/lib/api';
import { useRouter, useParams } from 'next/navigation';
import { formatCurrency } from '@/lib/utils';
import dayjs from 'dayjs';
import toast from 'react-hot-toast';
import Reveal from '@/components/ui/Reveal';
import { ArrowLeft, CalendarDays, Users, BedDouble, CreditCard, XCircle, CheckCircle2 } from 'lucide-react';

const RAZORPAY_KEY = process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || '';

function loadRazorpayScript() {
  return new Promise((resolve) => {
    if (document.getElementById('razorpay-script')) return resolve(true);
    const s = document.createElement('script');
    s.id = 'razorpay-script';
    s.src = 'https://checkout.razorpay.com/v1/checkout.js';
    s.onload = () => resolve(true);
    s.onerror = () => resolve(false);
    document.body.appendChild(s);
  });
}

export default function BookingDetailPage() {
  const { id } = useParams();
  const { isAuthenticated, loading } = useAuth();
  const router = useRouter();
  const [booking, setBooking] = useState(null);
  const [loadingBooking, setLoadingBooking] = useState(true);
  const [cancelling, setCancelling] = useState(false);
  const [paying, setPaying] = useState(false);

  const refreshBooking = useCallback(() => {
    if (!id) return;
    bookingsApi.getById(id)
      .then((res) => setBooking(res.data.data))
      .catch(() => {});
  }, [id]);

  useEffect(() => {
    if (!loading && !isAuthenticated) router.replace('/auth/login');
  }, [loading, isAuthenticated, router]);

  useEffect(() => {
    if (!id) return;
    bookingsApi.getById(id)
      .then((res) => setBooking(res.data.data))
      .catch(() => toast.error('Could not load booking'))
      .finally(() => setLoadingBooking(false));
  }, [id, refreshBooking]);

  const handlePay = async () => {
    if (!booking) return;
    setPaying(true);
    try {
      if (RAZORPAY_KEY) {
        const loaded = await loadRazorpayScript();
        if (!loaded) throw new Error('Razorpay SDK failed to load');

        const initRes = await paymentsApi.initiate({ bookingId: booking.id, method: 'RAZORPAY' });
        const { gatewayOrderId, amount, currency, paymentId } = initRes.data.data;

        await new Promise((resolve, reject) => {
          const rzp = new window.Razorpay({
            key: RAZORPAY_KEY,
            amount: Math.round(amount * 100),
            currency,
            order_id: gatewayOrderId,
            name: booking.hotel?.name || 'Hotel',
            description: `Booking ${booking.bookingNumber}`,
            handler: async (response) => {
              try {
                await paymentsApi.confirm(paymentId, {
                  gatewayPaymentId: response.razorpay_payment_id,
                  gatewaySignature: response.razorpay_signature,
                });
                toast.success('Payment successful!');
                refreshBooking();
                resolve();
              } catch (e) {
                reject(e);
              }
            },
            prefill: {
              name: booking.guestName,
              email: booking.guestEmail,
              contact: booking.guestPhone,
            },
            theme: { color: '#c5a880' },
          });
          rzp.on('payment.failed', (r) => reject(new Error(r.error.description)));
          rzp.open();
        });
      } else {
        const initRes = await paymentsApi.initiate({ bookingId: booking.id, method: 'DEMO' });
        const { paymentId } = initRes.data.data;
        await paymentsApi.confirm(paymentId, {});
        toast.success('Demo payment confirmed!');
        refreshBooking();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || err.message || 'Payment failed');
    } finally {
      setPaying(false);
    }
  };

  const handleCancel = async () => {
    if (!confirm('Are you sure you want to cancel this booking?')) return;
    setCancelling(true);
    try {
      const res = await bookingsApi.cancel(id, { reason: 'Guest requested cancellation' });
      setBooking(res.data.data);
      toast.success('Booking cancelled');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Cancellation failed');
    } finally {
      setCancelling(false);
    }
  };

  if (loadingBooking) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin h-8 w-8 rounded-full border-b-2 border-primary-600" />
      </div>
    );
  }

  if (!booking) {
    return (
      <div className="text-center py-20 text-gray-400">
        <p className="text-lg">Booking not found</p>
      </div>
    );
  }

  const canCancel = ['PENDING', 'CONFIRMED'].includes(booking.status);

  const statusConfig = {
    PENDING: { color: 'bg-yellow-50 text-yellow-700 border-yellow-200', label: 'Pending' },
    CONFIRMED: { color: 'bg-blue-50 text-blue-700 border-blue-200', label: 'Confirmed' },
    CHECKED_IN: { color: 'bg-green-50 text-green-700 border-green-200', label: 'Checked In' },
    CHECKED_OUT: { color: 'bg-gray-100 text-gray-600 border-gray-200', label: 'Checked Out' },
    CANCELLED: { color: 'bg-red-50 text-red-700 border-red-200', label: 'Cancelled' },
    NO_SHOW: { color: 'bg-orange-50 text-orange-700 border-orange-200', label: 'No Show' },
  };
  const status = statusConfig[booking.status] || statusConfig.PENDING;

  return (
    <main className="bg-white min-h-[70vh]">
      <div className="max-w-3xl mx-auto px-5 sm:px-8 py-10 lg:py-14 border border-gray-100 my-5 rounded-lg">
        {/* Back button */}
        <button
          onClick={() => router.back()}
          className="flex items-center gap-2 text-sm text-gray-500 hover:text-primary-700 transition-colors mb-8"
        >
          <ArrowLeft className="w-4 h-4" /> Back to My Bookings
        </button>

        <Reveal>
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-8 pb-8 border-b border-gray-100">
            <div>
              <p className="font-mono text-xs text-gray-400 mb-1.5">{booking.bookingNumber}</p>
              <h1 className="font-display text-2xl md:text-3xl font-semibold text-gray-900">{booking.roomType?.name || 'Room'}</h1>
              {booking.hotel?.name && (
                <p className="text-gray-500 text-sm mt-1">{booking.hotel.name}</p>
              )}
            </div>
            <span className={`self-start text-xs px-3 py-1.5 rounded-full font-medium border ${status.color}`}>
              {status.label}
            </span>
          </div>
        </Reveal>

        {/* Stay details cards */}
        <Reveal delay={60} className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-10">
          <div className="rounded-xl border border-gray-100 p-4">
            <CalendarDays className="w-4 h-4 text-primary-600 mb-2" />
            <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">Check-in</p>
            <p className="font-semibold text-gray-900 text-sm">{dayjs(booking.checkInDate).format('DD MMM YYYY')}</p>
          </div>
          <div className="rounded-xl border border-gray-100 p-4">
            <CalendarDays className="w-4 h-4 text-primary-600 mb-2" />
            <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">Check-out</p>
            <p className="font-semibold text-gray-900 text-sm">{dayjs(booking.checkOutDate).format('DD MMM YYYY')}</p>
          </div>
          <div className="rounded-xl border border-gray-100 p-4">
            <Users className="w-4 h-4 text-primary-600 mb-2" />
            <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">Guests</p>
            <p className="font-semibold text-gray-900 text-sm">
              {booking.numAdults ?? booking.numGuests} Adult{(booking.numAdults ?? booking.numGuests) > 1 ? 's' : ''}
              {booking.numChildren > 0 && `, ${booking.numChildren} Child`}
            </p>
          </div>
          <div className="rounded-xl border border-gray-100 p-4">
            <BedDouble className="w-4 h-4 text-primary-600 mb-2" />
            <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">Rooms</p>
            <p className="font-semibold text-gray-900 text-sm">{booking.numRooms} Room{booking.numRooms > 1 ? 's' : ''}</p>
          </div>
        </Reveal>

        {/* Guest Info */}
        <Reveal delay={100} className="mb-10">
          <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wide mb-3">Guest Information</h3>
          <div className="rounded-xl border border-gray-100 p-5 space-y-2 text-sm text-gray-600">
            <p className="font-medium text-gray-900">{booking.guestName}</p>
            {booking.guestEmail && <p>{booking.guestEmail}</p>}
            {booking.guestPhone && <p>{booking.guestPhone}</p>}
          </div>
        </Reveal>

        {/* Price Breakdown */}
        <Reveal delay={140} className="mb-10">
          <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wide mb-3">Price Breakdown</h3>
          <div className="rounded-xl border border-gray-100 p-5 space-y-2.5 text-sm">
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
            <div className="flex justify-between pt-3 mt-2 border-t border-gray-100">
              <span className="font-semibold text-gray-900">Total</span>
              <span className="font-bold text-gray-900 text-base">{formatCurrency(booking.totalAmount)}</span>
            </div>
          </div>

          {/* Payment status badge */}
          <div className={`inline-flex items-center gap-1.5 mt-4 text-xs px-3 py-1.5 rounded-full font-medium border ${
            booking.paymentStatus === 'PAID' ? 'bg-green-50 text-green-700 border-green-200' :
            booking.paymentStatus === 'PENDING' ? 'bg-yellow-50 text-yellow-700 border-yellow-200' :
            'bg-gray-100 text-gray-500 border-gray-200'
          }`}>
            {booking.paymentStatus === 'PAID' ? (
              <><CheckCircle2 className="w-3 h-3" /> Paid</>
            ) : (
              <><CreditCard className="w-3 h-3" /> {booking.paymentStatus}</>
            )}
          </div>
        </Reveal>

        {/* Pay Now CTA */}
        {booking.paymentStatus === 'PENDING' && booking.status !== 'CANCELLED' && (
          <Reveal delay={160} className="mb-10 p-6 bg-yellow-50 border border-yellow-200 rounded-2xl">
            <div className="flex items-start gap-3">
              <CreditCard className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-semibold text-yellow-800 mb-1">Payment Pending</p>
                <p className="text-xs text-yellow-700 mb-4">
                  {RAZORPAY_KEY
                    ? 'Complete your payment securely via Razorpay.'
                    : 'Click below to confirm your demo payment.'}
                </p>
                <button
                  onClick={handlePay}
                  disabled={paying}
                  className="btn-primary w-full sm:w-auto"
                >
                  {paying ? 'Processing…' : (RAZORPAY_KEY ? 'Pay Now' : 'Confirm Payment (Demo)')}
                </button>
              </div>
            </div>
          </Reveal>
        )}

        {/* Cancel Booking */}
        {canCancel && (
          <Reveal delay={180}>
            <button
              onClick={handleCancel}
              disabled={cancelling}
              className="flex items-center justify-center gap-2 w-full py-3 rounded-full border border-red-200 text-red-600 hover:bg-red-50 font-medium text-sm transition-colors"
            >
              <XCircle className="w-4 h-4" />
              {cancelling ? 'Cancelling…' : 'Cancel Booking'}
            </button>
          </Reveal>
        )}
      </div>
    </main>
  );
}
