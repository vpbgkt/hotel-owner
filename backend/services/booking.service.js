'use strict';

const { Op } = require('sequelize');
const dayjs = require('dayjs');
const { Booking, User, RoomType, Room, Hotel, Payment } = require('../models');
const roomService = require('./room.service');
const { redis } = require('../config/redis');
const { acquireLock, releaseLock } = require('../utils/redisLock');
const { generate: generateBookingNumber } = require('../utils/bookingNumber');
const { createError } = require('../middlewares/errorHandler.middleware');
const { paginate } = require('../utils/pagination');

// Default tax rate fallback if hotel doesn't have gstRate set
const DEFAULT_TAX_RATE = 0.12;

class BookingService {
  // ── Create Daily Booking ────────────────────────────────────────────────
  async createDailyBooking(input, userId) {
    const { hotelId, roomTypeId, checkInDate, checkOutDate, numRooms = 1, numExtraGuests = 0, guestName, guestEmail, guestPhone, specialRequests } = input;

    // Guests are captured as adults + children. Fall back to legacy numGuests if
    // the client sent only a single guest count.
    const numAdults = parseInt(input.numAdults ?? input.numGuests ?? 1);
    const numChildren = parseInt(input.numChildren ?? 0);
    const numGuests = numAdults + numChildren;

    const lockKey = `booking_lock:${hotelId}:${roomTypeId}`;
    const lockValue = await acquireLock(redis, lockKey);
    if (!lockValue) throw createError('Room is currently being booked — please try again', 409);

    try {
      const [roomType, hotel] = await Promise.all([
        RoomType.findByPk(roomTypeId),
        Hotel.findByPk(hotelId, { attributes: ['id', 'gstRate'] }),
      ]);
      if (!roomType) throw createError('Room type not found', 404);
      if (!hotel) throw createError('Hotel not found', 404);

      // Enforce occupancy limits (scaled by number of rooms booked):
      //  1. adults must not exceed max adults
      //  2. children must not exceed max children
      //  3. total (adults + children) must not exceed max occupancy
      const maxAdults = (roomType.maxAdults ?? roomType.maxGuests) * numRooms;
      const maxChildren = (roomType.maxChildren ?? 0) * numRooms;
      const maxOccupancy = roomType.maxGuests * numRooms;

      if (numAdults < 1) {
        throw createError('At least 1 adult is required', 400);
      }
      if (numAdults > maxAdults) {
        throw createError(`Max ${maxAdults} adult(s) allowed for ${numRooms} room(s) of this type`, 400);
      }
      if (numChildren > maxChildren) {
        throw createError(`Max ${maxChildren} child(ren) allowed for ${numRooms} room(s) of this type`, 400);
      }
      if (numGuests > maxOccupancy) {
        throw createError(`Max occupancy is ${maxOccupancy} guest(s) for ${numRooms} room(s) of this type`, 400);
      }

      const taxRate = hotel.gstRate ?? DEFAULT_TAX_RATE;
      const dates = roomService._getDateRange(checkInDate, checkOutDate);
      const nights = dates.length;
      if (nights < 1) throw createError('Check-out must be after check-in', 400);

      // Check availability
      const availability = await roomService.checkDailyAvailability({ roomTypeId, checkInDate, checkOutDate, numRooms });
      if (!availability.isAvailable) throw createError('Rooms not available for selected dates', 409);

      const pricing = this._calculateDailyTotal(roomType, nights, numRooms, numExtraGuests, availability.pricePerNight, taxRate);

      const booking = await Booking.create({
        bookingNumber: generateBookingNumber(),
        hotelId,
        guestId: userId,
        roomTypeId,
        bookingType: 'DAILY',
        checkInDate,
        checkOutDate,
        numRooms,
        numGuests,
        numAdults,
        numChildren,
        numExtraGuests,
        guestName,
        guestEmail,
        guestPhone,
        specialRequests,
        ...pricing,
        status: 'PENDING',
        paymentStatus: 'PENDING',
      });

      // Decrement inventory
      await roomService.decrementAvailability(roomTypeId, dates, numRooms);

      return this._getBookingById(booking.id);
    } finally {
      await releaseLock(redis, lockKey, lockValue);
    }
  }

  // ── Create Hourly Booking ────────────────────────────────────────────────
  async createHourlyBooking(input, userId) {
    const { hotelId, roomTypeId, date, slotStart, numHours, numRooms = 1, numGuests = 1, guestName, guestEmail, guestPhone, specialRequests } = input;

    const lockKey = `booking_lock:hourly:${hotelId}:${roomTypeId}:${date}:${slotStart}`;
    const lockValue = await acquireLock(redis, lockKey);
    if (!lockValue) throw createError('Slot is being booked — please try again', 409);

    try {
      const roomType = await RoomType.findByPk(roomTypeId);
      if (!roomType) throw createError('Room type not found', 404);

      const slotEndTime = dayjs(`${date} ${slotStart}`).add(numHours, 'hour').format('HH:mm');

      // ── Check slot availability BEFORE creating the booking ────────────
      const { HourlySlot } = require('../models');
      const [slotInv] = await HourlySlot.findOrCreate({
        where: { roomTypeId, date, slotStart },
        defaults: { roomTypeId, date, slotStart, slotEnd: slotEndTime, availableCount: roomType.totalRooms, isClosed: false },
      });
      if (slotInv.isClosed) throw createError('This slot is closed', 409);
      if (slotInv.availableCount < numRooms) throw createError('Not enough rooms available for this slot', 409);

      // ── Calculate pricing ───────────────────────────────────────────────
      const pricePerHour = roomType.basePriceHourly || 0;
      const roomTotal = pricePerHour * numHours * numRooms;
      const taxes = Math.round(roomTotal * DEFAULT_TAX_RATE);
      const totalAmount = roomTotal + taxes;

      // ── Create booking ──────────────────────────────────────────────────
      const booking = await Booking.create({
        bookingNumber: generateBookingNumber(),
        hotelId,
        guestId: userId,
        roomTypeId,
        bookingType: 'HOURLY',
        checkInTime: `${date}T${slotStart}:00`,
        checkOutTime: `${date}T${slotEndTime}:00`,
        numHours,
        numRooms,
        numGuests,
        numExtraGuests: 0,
        guestName,
        guestEmail,
        guestPhone,
        specialRequests,
        roomTotal,
        extraGuestTotal: 0,
        taxes,
        discountAmount: 0,
        totalAmount,
        status: 'PENDING',
        paymentStatus: 'PENDING',
      });

      // ── Decrement slot inventory ────────────────────────────────────────
      await slotInv.decrement('availableCount', { by: numRooms });

      return this._getBookingById(booking.id);
    } finally {
      await releaseLock(redis, lockKey, lockValue);
    }
  }

  // ── Get booking ─────────────────────────────────────────────────────────
  async getById(id, userId = null) {
    const booking = await this._getBookingById(id);
    if (!booking) throw createError('Booking not found', 404);

    // Guests can only see their own bookings
    if (userId && booking.guestId !== userId) {
      const user = await User.findByPk(userId);
      if (!user || !['HOTEL_ADMIN', 'HOTEL_STAFF'].includes(user.role)) {
        throw createError('Access denied', 403);
      }
    }

    return booking;
  }

  async getByNumber(bookingNumber, userId = null) {
    const booking = await Booking.findOne({
      where: { bookingNumber },
      include: this._getBookingIncludes(),
    });
    if (!booking) throw createError('Booking not found', 404);
    return booking;
  }

  // ── List bookings (admin/staff) ──────────────────────────────────────────
  async list(filters = {}, { page = 1, limit = 20 } = {}, hotelId = null) {
    const where = {};
    if (hotelId) where.hotelId = hotelId;
    if (filters.status) where.status = filters.status;
    if (filters.paymentStatus) where.paymentStatus = filters.paymentStatus;
    if (filters.bookingType) where.bookingType = filters.bookingType;
    if (filters.guestName) where.guestName = { [Op.iLike]: `%${filters.guestName}%` };
    if (filters.checkInDate) where.checkInDate = { [Op.gte]: filters.checkInDate };
    if (filters.checkOutDate) where.checkOutDate = { [Op.lte]: filters.checkOutDate };
    if (filters.search) {
      where[Op.or] = [
        { bookingNumber: { [Op.iLike]: `%${filters.search}%` } },
        { guestName: { [Op.iLike]: `%${filters.search}%` } },
        { guestEmail: { [Op.iLike]: `%${filters.search}%` } },
      ];
    }

    return paginate(
      Booking,
      {
        where,
        include: this._getBookingIncludes(true),
        order: [['createdAt', 'DESC']],
      },
      page,
      limit
    );
  }

  // ── Cancel Booking ───────────────────────────────────────────────────────
  async cancel(bookingId, userId, { reason } = {}) {
    const booking = await Booking.findByPk(bookingId);
    if (!booking) throw createError('Booking not found', 404);

    // Only guest who made the booking or hotel staff can cancel
    if (booking.guestId !== userId) {
      const user = await User.findByPk(userId);
      if (!user || !['HOTEL_ADMIN', 'HOTEL_STAFF'].includes(user.role)) {
        throw createError('Access denied', 403);
      }
    }

    if (['CANCELLED', 'CHECKED_OUT'].includes(booking.status)) {
      throw createError(`Cannot cancel a booking with status: ${booking.status}`, 400);
    }

    await booking.update({
      status: 'CANCELLED',
      cancellationReason: reason || null,
      cancelledAt: new Date(),
    });

    // Restore inventory
    if (booking.bookingType === 'DAILY' && booking.checkInDate && booking.checkOutDate) {
      const dates = roomService._getDateRange(booking.checkInDate, booking.checkOutDate);
      await roomService.restoreAvailability(booking.roomTypeId, dates, booking.numRooms);
    }

    return this._getBookingById(bookingId);
  }

  // ── Update Status (admin/staff) ──────────────────────────────────────────
  async updateStatus(bookingId, { status }, staffUserId) {
    const booking = await Booking.findByPk(bookingId);
    if (!booking) throw createError('Booking not found', 404);

    const validTransitions = {
      PENDING: ['CONFIRMED', 'CANCELLED'],
      CONFIRMED: ['CHECKED_IN', 'CANCELLED', 'NO_SHOW'],
      CHECKED_IN: ['CHECKED_OUT'],
      CHECKED_OUT: [],
      CANCELLED: [],
      NO_SHOW: [],
    };

    if (!validTransitions[booking.status].includes(status)) {
      throw createError(`Cannot transition from ${booking.status} to ${status}`, 400);
    }

    await booking.update({ status });

    // ── Restore inventory on CANCELLED ────────────────────────────────────
    if (status === 'CANCELLED') {
      if (booking.bookingType === 'DAILY' && booking.checkInDate && booking.checkOutDate) {
        const dates = roomService._getDateRange(booking.checkInDate, booking.checkOutDate);
        await roomService.restoreAvailability(booking.roomTypeId, dates, booking.numRooms);
      }
      // Hourly slot restore
      // (hourly slots are restored via HourlySlot.increment — omitted here for simplicity
      // since the slot TTL is short and there's no persistent cache for hourly)
    }

    // ── Restore inventory on CHECKED_OUT (early checkout) ─────────────────
    if (status === 'CHECKED_OUT' && booking.bookingType === 'DAILY' && booking.checkInDate && booking.checkOutDate) {
      const today = dayjs().format('YYYY-MM-DD');
      if (dayjs(today).isBefore(dayjs(booking.checkOutDate))) {
        const dates = roomService._getDateRange(today, booking.checkOutDate);
        if (dates.length > 0) {
          await roomService.restoreAvailability(booking.roomTypeId, dates, booking.numRooms);
        }
      }
    }

    return this._getBookingById(bookingId);
  }

  // ── Modify Booking ───────────────────────────────────────────────────────
  async modify(bookingId, updates, userId) {
    const booking = await Booking.findByPk(bookingId, {
      include: [{ model: RoomType, as: 'roomType' }],
    });
    if (!booking) throw createError('Booking not found', 404);

    if (!['PENDING', 'CONFIRMED', 'CHECKED_IN'].includes(booking.status)) {
      throw createError('Can only modify pending, confirmed, or checked-in bookings', 400);
    }

    // When a guest is already checked in, only allow extending checkout or updating special requests
    const isCheckedIn = booking.status === 'CHECKED_IN';
    const allowedFields = isCheckedIn
      ? ['checkOutDate', 'specialRequests']
      : ['checkInDate', 'checkOutDate', 'numRooms', 'numGuests', 'numExtraGuests', 'specialRequests'];

    const updateData = {};
    allowedFields.forEach((f) => { if (updates[f] !== undefined) updateData[f] = updates[f]; });

    // For CHECKED_IN: only allow extending (moving checkout further out, not shortening)
    if (isCheckedIn && updateData.checkOutDate) {
      if (updateData.checkOutDate <= booking.checkOutDate) {
        throw createError('Cannot shorten stay for a checked-in booking. You may only extend the checkout date.', 400);
      }
    }

    // Recalculate pricing if dates/rooms changed
    if (updateData.checkInDate || updateData.checkOutDate || updateData.numRooms) {
      const checkIn = updateData.checkInDate || booking.checkInDate;
      const checkOut = updateData.checkOutDate || booking.checkOutDate;
      const rooms = updateData.numRooms || booking.numRooms;
      const extraGuests = updateData.numExtraGuests ?? booking.numExtraGuests;
      const nights = roomService._getDateRange(checkIn, checkOut).length;
      const pricing = this._calculateDailyTotal(booking.roomType, nights, rooms, extraGuests, booking.roomType.basePriceDaily);
      Object.assign(updateData, pricing);

      // Adjust inventory: restore old dates, decrement new dates
      const oldDates = roomService._getDateRange(booking.checkInDate, booking.checkOutDate);
      const newDates = roomService._getDateRange(checkIn, checkOut);
      const oldSet = new Set(oldDates);
      const newSet = new Set(newDates);
      // Dates removed from booking — restore availability
      const removed = oldDates.filter((d) => !newSet.has(d));
      if (removed.length > 0) await roomService.restoreAvailability(booking.roomTypeId, removed, rooms);
      // New dates added to booking — decrement availability
      const added = newDates.filter((d) => !oldSet.has(d));
      if (added.length > 0) await roomService.decrementAvailability(booking.roomTypeId, added, rooms);
    }

    await booking.update(updateData);
    return this._getBookingById(bookingId);
  }

  // ── Private helpers ──────────────────────────────────────────────────────
  _calculateDailyTotal(roomType, nights, numRooms, numExtraGuests, pricePerNight, taxRate = DEFAULT_TAX_RATE) {
    const roomTotal = pricePerNight * nights * numRooms;
    const extraGuestTotal = (roomType.extraGuestCharge || 0) * numExtraGuests * nights;
    const subtotal = roomTotal + extraGuestTotal;
    const taxes = Math.round(subtotal * taxRate);
    const totalAmount = subtotal + taxes;
    return { roomTotal, extraGuestTotal, taxes, discountAmount: 0, totalAmount };
  }

  async _getBookingById(id) {
    return Booking.findByPk(id, { include: this._getBookingIncludes() });
  }

  _getBookingIncludes(minimal = false) {
    if (minimal) {
      return [
        { model: User, as: 'guest', attributes: ['id', 'name', 'email', 'phone'] },
        { model: RoomType, as: 'roomType', attributes: ['id', 'name', 'images'] },
      ];
    }
    return [
      { model: Hotel, as: 'hotel', attributes: ['id', 'name', 'slug', 'phone', 'email'] },
      { model: User, as: 'guest', attributes: ['id', 'name', 'email', 'phone', 'avatarUrl'] },
      { model: RoomType, as: 'roomType' },
      { model: Room, as: 'assignedRoom', required: false },
      { model: Payment, as: 'payments' },
    ];
  }
}

module.exports = new BookingService();
