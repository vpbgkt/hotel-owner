'use strict';

const crypto = require('crypto');
const { Payment, Booking, RoomType } = require('../models');
const { createError } = require('../middlewares/errorHandler.middleware');
const { env } = require('../config/env');

class PaymentService {
  // ── Initiate Payment ────────────────────────────────────────────────────
  async initiatePayment(bookingId, method = 'DEMO') {
    const booking = await Booking.findByPk(bookingId, {
      include: [{ model: RoomType, as: 'roomType' }],
    });
    if (!booking) throw createError('Booking not found', 404);
    if (booking.paymentStatus === 'PAID') throw createError('Booking already paid', 400);

    if (method === 'RAZORPAY' && env.RAZORPAY_KEY_ID) {
      return this._initiateRazorpay(booking);
    } else if (method === 'CASH') {
      return this._initiateCash(booking);
    } else {
      return this._initiateDemo(booking);
    }
  }

  async _initiateRazorpay(booking) {
    try {
      const Razorpay = require('razorpay');
      const razorpay = new Razorpay({
        key_id: env.RAZORPAY_KEY_ID,
        key_secret: env.RAZORPAY_KEY_SECRET,
      });

      const order = await razorpay.orders.create({
        amount: Math.round(booking.totalAmount * 100), // paise
        currency: 'INR',
        receipt: booking.bookingNumber,
        notes: { bookingId: booking.id },
      });

      const payment = await Payment.create({
        bookingId: booking.id,
        gateway: 'RAZORPAY',
        gatewayOrderId: order.id,
        amount: booking.totalAmount,
        currency: 'INR',
        status: 'CREATED',
        metadata: { order },
      });

      return {
        paymentId: payment.id,
        gateway: 'RAZORPAY',
        gatewayOrderId: order.id,
        amount: booking.totalAmount,
        currency: 'INR',
        keyId: env.RAZORPAY_KEY_ID,
        bookingNumber: booking.bookingNumber,
      };
    } catch (err) {
      throw createError(`Payment gateway error: ${this._extractRazorpayErrorMessage(err)}`, 502);
    }
  }

  // Razorpay's SDK throws a plain object ({ statusCode, error: { description, ... } })
  // rather than an Error instance on API failures, so err.message is always
  // undefined. Extract the real reason from err.error.description instead, with
  // fallbacks for genuine Error instances (e.g. network failures).
  _extractRazorpayErrorMessage(err) {
    return err?.error?.description || err?.message || 'Unknown error';
  }

  async _initiateCash(booking) {
    const payment = await Payment.create({
      bookingId: booking.id,
      gateway: 'CASH',
      amount: booking.totalAmount,
      currency: 'INR',
      status: 'CREATED',
    });

    return {
      paymentId: payment.id,
      gateway: 'CASH',
      amount: booking.totalAmount,
      currency: 'INR',
      bookingNumber: booking.bookingNumber,
      message: 'Cash payment — confirm at checkout',
    };
  }

  async _initiateDemo(booking) {
    const payment = await Payment.create({
      bookingId: booking.id,
      gateway: 'DEMO',
      amount: booking.totalAmount,
      currency: 'INR',
      status: 'CREATED',
    });

    return {
      paymentId: payment.id,
      gateway: 'DEMO',
      amount: booking.totalAmount,
      currency: 'INR',
      bookingNumber: booking.bookingNumber,
      message: 'Demo mode — use confirmPayment to complete',
    };
  }

  // ── Confirm Payment ─────────────────────────────────────────────────────
  async confirmPayment(paymentId, { gatewayPaymentId, gatewaySignature }) {
    const payment = await Payment.findByPk(paymentId, {
      include: [{ model: Booking, as: 'booking' }],
    });
    if (!payment) throw createError('Payment not found', 404);

    if (payment.gateway === 'RAZORPAY') {
      this._verifyRazorpaySignature(payment.gatewayOrderId, gatewayPaymentId, gatewaySignature);
    }

    await payment.update({
      gatewayPaymentId: gatewayPaymentId || `demo_${Date.now()}`,
      status: 'CAPTURED',
      metadata: { ...payment.metadata, confirmedAt: new Date() },
    });

    await payment.booking.update({ paymentStatus: 'PAID', status: 'CONFIRMED' });

    return { payment, booking: payment.booking };
  }

  // ── Refund Payment ──────────────────────────────────────────────────────
  async refundPayment(paymentId, amount = null) {
    const payment = await Payment.findByPk(paymentId, {
      include: [{ model: Booking, as: 'booking' }],
    });
    if (!payment) throw createError('Payment not found', 404);
    if (payment.status !== 'CAPTURED') throw createError('Payment not eligible for refund', 400);

    const refundAmount = amount || payment.amount;
    if (refundAmount > payment.amount) throw createError('Refund amount exceeds payment amount', 400);

    let refundId = `demo_refund_${Date.now()}`;

    if (payment.gateway === 'RAZORPAY' && payment.gatewayPaymentId) {
      try {
        const Razorpay = require('razorpay');
        const razorpay = new Razorpay({ key_id: env.RAZORPAY_KEY_ID, key_secret: env.RAZORPAY_KEY_SECRET });
        const refund = await razorpay.payments.refund(payment.gatewayPaymentId, { amount: Math.round(refundAmount * 100) });
        refundId = refund.id;
      } catch (err) {
        throw createError(`Refund failed: ${this._extractRazorpayErrorMessage(err)}`, 502);
      }
    }

    const isPartial = refundAmount < payment.amount;
    await payment.update({
      refundAmount,
      refundId,
      status: 'REFUNDED',
    });

    await payment.booking.update({
      paymentStatus: isPartial ? 'PARTIALLY_REFUNDED' : 'REFUNDED',
    });

    return { payment, refundAmount, refundId };
  }

  // ── Razorpay Webhook ─────────────────────────────────────────────────────
  async handleRazorpayWebhook(rawBody, signature) {
    const expectedSig = crypto
      .createHmac('sha256', env.RAZORPAY_WEBHOOK_SECRET)
      .update(rawBody)
      .digest('hex');

    if (signature !== expectedSig) throw createError('Invalid webhook signature', 401);

    const event = JSON.parse(rawBody);
    console.log('[Webhook] Razorpay event:', event.event);

    if (event.event === 'payment.captured') {
      const gatewayPaymentId = event.payload.payment.entity.id;
      const gatewayOrderId = event.payload.payment.entity.order_id;

      const payment = await Payment.findOne({
        where: { gatewayOrderId },
        include: [{ model: Booking, as: 'booking' }],
      });

      if (payment && payment.status !== 'CAPTURED') {
        await payment.update({ gatewayPaymentId, status: 'CAPTURED' });
        await payment.booking.update({ paymentStatus: 'PAID', status: 'CONFIRMED' });
      }
    }

    return { processed: true };
  }

  _verifyRazorpaySignature(orderId, paymentId, signature) {
    const generated = crypto
      .createHmac('sha256', env.RAZORPAY_KEY_SECRET)
      .update(`${orderId}|${paymentId}`)
      .digest('hex');

    if (generated !== signature) throw createError('Invalid payment signature', 400);
  }
}

module.exports = new PaymentService();
