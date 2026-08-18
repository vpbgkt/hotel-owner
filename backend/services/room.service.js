'use strict';

const { Op } = require('sequelize');
const dayjs = require('dayjs');
const { RoomType, Room, RoomInventory, HourlySlot, Hotel, Booking } = require('../models');
const { redis } = require('../config/redis');
const { createError } = require('../middlewares/errorHandler.middleware');

const AVAILABILITY_CACHE_TTL = 60; // 1 minute

class RoomService {
  async getRoomTypes(hotelId, filters = {}) {
    const where = { hotelId, isActive: true };
    if (filters.bookingModel) {
      where[Op.or] = [
        { bookingModelOverride: filters.bookingModel },
        { bookingModelOverride: 'BOTH' },
        { bookingModelOverride: null },
      ];
    }

    const roomTypes = await RoomType.findAll({
      where,
      order: [['sortOrder', 'ASC'], ['name', 'ASC']],
    });

    return roomTypes;
  }

  async getRoomTypeById(id) {
    const roomType = await RoomType.findOne({
      where: { id, isActive: true },
      include: [{ model: Hotel, as: 'hotel', attributes: ['id', 'name', 'slug', 'bookingModel'] }],
    });
    if (!roomType) throw createError('Room type not found', 404);
    return roomType;
  }

  // ── Check daily availability ─────────────────────────────────────────────
  async checkDailyAvailability({ roomTypeId, checkInDate, checkOutDate, numRooms = 1 }) {
    const cacheKey = `avail:daily:${roomTypeId}:${checkInDate}:${checkOutDate}:${numRooms}`;
    const cached = await redis.get(cacheKey).catch(() => null);
    if (cached) return JSON.parse(cached);

    const roomType = await RoomType.findByPk(roomTypeId);
    if (!roomType) throw createError('Room type not found', 404);

    const dates = this._getDateRange(checkInDate, checkOutDate);
    const nights = dates.length;

    // Inventory rows are only consulted for admin overrides (closed dates and
    // price overrides). Availability itself is derived live from active bookings
    // via _getBookedCountsByDate so it always matches the admin calendar.
    const inventory = await RoomInventory.findAll({
      where: { roomTypeId, date: { [Op.between]: [checkInDate, checkOutDate] } },
    });

    const inventoryMap = {};
    inventory.forEach((inv) => { inventoryMap[inv.date] = inv; });

    const bookedMap = await this._getBookedCountsByDate(roomTypeId, checkInDate, checkOutDate);

    // Availability per night = totalRooms - rooms held by active bookings
    let minAvailable = roomType.totalRooms;
    const dailyPrices = [];
    let isClosed = false;

    for (const date of dates) {
      const inv = inventoryMap[date];
      if (inv && inv.isClosed) { isClosed = true; break; }
      const booked = bookedMap[date] || 0;
      // An admin-set manual cap (overrideAvailable) limits sellable rooms for
      // the date; otherwise the full room count applies. Bookings are still
      // subtracted live so availability never oversells.
      const cap = (inv && inv.overrideAvailable != null) ? inv.overrideAvailable : roomType.totalRooms;
      minAvailable = Math.min(minAvailable, cap - booked);
      dailyPrices.push({ date, price: (inv && inv.priceOverride) || roomType.basePriceDaily });
    }
    minAvailable = Math.max(0, minAvailable);

    const isAvailable = !isClosed && minAvailable >= numRooms;
    const pricePerNight = this._getEffectivePrice(dailyPrices, roomType.basePriceDaily);
    const subtotal = pricePerNight * nights * numRooms;

    // Fetch hotel gstRate for tax breakdown
    const hotel = await Hotel.findByPk(roomType.hotelId, { attributes: ['gstRate'] }).catch(() => null);
    const taxRate = hotel?.gstRate ?? 0.12;
    const taxAmount = Math.round(subtotal * taxRate);
    const totalPrice = subtotal + taxAmount;

    const result = {
      isAvailable,
      availableRooms: minAvailable,
      nights,
      pricePerNight,
      subtotal,
      taxRate,
      taxAmount,
      totalPrice,
      currency: 'INR',
      dailyPrices,
      isClosed,
    };

    await redis.set(cacheKey, JSON.stringify(result), 'EX', AVAILABILITY_CACHE_TTL).catch(() => {});
    return result;
  }

  // ── Check hourly availability ────────────────────────────────────────────
  async checkHourlyAvailability({ roomTypeId, date, numHours = 1, numRooms = 1 }) {
    const roomType = await RoomType.findByPk(roomTypeId);
    if (!roomType) throw createError('Room type not found', 404);

    let slots = await HourlySlot.findAll({
      where: { roomTypeId, date, isClosed: false },
      order: [['slotStart', 'ASC']],
    });

    if (slots.length === 0) {
      for (let i = 0; i < 24; i++) {
        const start = i.toString().padStart(2, '0') + ':00';
        const end = (i + 1).toString().padStart(2, '0') + ':00';
        slots.push({
          slotStart: start,
          slotEnd: end === '24:00' ? '00:00' : end,
          availableCount: roomType.totalRooms,
          priceOverride: null
        });
      }
    }

    const availableSlots = slots
      .filter((s) => s.availableCount >= numRooms)
      .map((s) => ({
        slotStart: s.slotStart,
        slotEnd: s.slotEnd,
        availableCount: s.availableCount,
        price: s.priceOverride || roomType.basePriceHourly,
      }));

    return {
      date,
      availableSlots,
      currency: 'INR',
      basePriceHourly: roomType.basePriceHourly,
    };
  }

  // ── Inventory calendar (admin) ───────────────────────────────────────────
  async getInventoryCalendar(roomTypeId, startDate, endDate) {
    const roomType = await RoomType.findByPk(roomTypeId);
    if (!roomType) throw createError('Room type not found', 404);

    const inventory = await RoomInventory.findAll({
      where: { roomTypeId, date: { [Op.between]: [startDate, endDate] } },
      order: [['date', 'ASC']],
    });

    const inventoryMap = {};
    inventory.forEach((inv) => { inventoryMap[inv.date] = inv; });

    // Availability is derived live from active bookings so it can never drift.
    const bookedMap = await this._getBookedCountsByDate(roomTypeId, startDate, endDate);

    // Fill all dates in range (inclusive of the final day)
    const calendar = [];
    let cur = dayjs(startDate);
    const last = dayjs(endDate);
    while (!cur.isAfter(last)) {
      const date = cur.format('YYYY-MM-DD');
      const inv = inventoryMap[date];
      const isClosed = inv ? inv.isClosed : false;
      const booked = bookedMap[date] || 0;
      // Respect an admin-set manual cap (overrideAvailable) when present,
      // otherwise fall back to the full room count. Availability stays
      // booking-derived so it can never drift.
      const cap = (inv && inv.overrideAvailable != null) ? inv.overrideAvailable : roomType.totalRooms;
      const available = Math.max(0, cap - booked);
      calendar.push({
        date,
        availableCount: isClosed ? 0 : available,
        priceOverride: inv ? inv.priceOverride : null,
        effectivePrice: (inv && inv.priceOverride) || roomType.basePriceDaily,
        isClosed,
        minStayNights: inv ? inv.minStayNights : 1,
      });
      cur = cur.add(1, 'day');
    }

    return { roomType, calendar };
  }

  // ── Invalidate cached daily availability for a room type ─────────────────
  // Call after admin inventory changes (closures, caps, price overrides) so the
  // guest booking flow reflects them immediately rather than after TTL expiry.
  async invalidateAvailabilityCache(roomTypeId) {
    const keys = await redis.keys(`avail:daily:${roomTypeId}:*`).catch(() => []);
    if (keys.length > 0) await redis.del(...keys).catch(() => {});
  }

  // ── Get or create inventory record ──────────────────────────────────────
  async getOrCreateInventory(roomTypeId, date, roomType) {
    const [inv] = await RoomInventory.findOrCreate({
      where: { roomTypeId, date },
      defaults: {
        roomTypeId,
        date,
        availableCount: roomType.totalRooms,
        isClosed: false,
      },
    });
    return inv;
  }

  // ── Decrement availability ───────────────────────────────────────────────
  async decrementAvailability(roomTypeId, dates, numRooms) {
    const roomType = await RoomType.findByPk(roomTypeId);
    if (!roomType) return;
    for (const date of dates) {
      // Ensure the inventory record exists before decrementing
      await RoomInventory.findOrCreate({
        where: { roomTypeId, date },
        defaults: { roomTypeId, date, availableCount: roomType.totalRooms, isClosed: false },
      });
      await RoomInventory.decrement('availableCount', {
        by: numRooms,
        where: { roomTypeId, date },
      });
    }
    // Invalidate availability cache for this room type
    const keys = await redis.keys(`avail:daily:${roomTypeId}:*`).catch(() => []);
    if (keys.length > 0) await redis.del(...keys).catch(() => {});
  }

  // ── Restore availability (on cancel / checkout) ──────────────────────────
  async restoreAvailability(roomTypeId, dates, numRooms) {
    const roomType = await RoomType.findByPk(roomTypeId);
    if (!roomType) return;

    for (const date of dates) {
      await RoomInventory.increment('availableCount', {
        by: numRooms,
        where: {
          roomTypeId,
          date,
          availableCount: { [Op.lt]: roomType.totalRooms },
        },
      });
    }

    // Invalidate availability cache so the next check returns fresh data
    const keys = await redis.keys(`avail:daily:${roomTypeId}:*`).catch(() => []);
    if (keys.length > 0) await redis.del(...keys).catch(() => {});
  }

  // ── Rooms held by active bookings, per date (source of truth) ────────────
  // Shared by checkDailyAvailability (guest booking flow) and
  // getInventoryCalendar (admin calendar) so both always report the same number.
  //
  // A DAILY booking occupies each night from checkInDate (inclusive) to
  // checkOutDate (exclusive) — a 26→27 Jul stay occupies the 26th only.
  // CANCELLED / CHECKED_OUT / NO_SHOW bookings release their rooms, so they are
  // excluded from the count.
  async _getBookedCountsByDate(roomTypeId, startDate, endDate) {
    const activeBookings = await Booking.findAll({
      where: {
        roomTypeId,
        bookingType: 'DAILY',
        status: { [Op.notIn]: ['CANCELLED', 'CHECKED_OUT', 'NO_SHOW'] },
        checkInDate: { [Op.lte]: endDate },
        checkOutDate: { [Op.gt]: startDate },
      },
      attributes: ['checkInDate', 'checkOutDate', 'numRooms'],
    });

    const counts = {};
    for (const b of activeBookings) {
      for (const d of this._getDateRange(b.checkInDate, b.checkOutDate)) {
        counts[d] = (counts[d] || 0) + (b.numRooms || 1);
      }
    }
    return counts;
  }

  _getDateRange(startDate, endDate) {
    const dates = [];
    let current = dayjs(startDate);
    const end = dayjs(endDate);
    while (current.isBefore(end)) {
      dates.push(current.format('YYYY-MM-DD'));
      current = current.add(1, 'day');
    }
    return dates;
  }

  _getEffectivePrice(dailyPrices, basePrice) {
    if (!dailyPrices.length) return basePrice;
    const sum = dailyPrices.reduce((acc, dp) => acc + dp.price, 0);
    return Math.round(sum / dailyPrices.length);
  }
}

module.exports = new RoomService();
