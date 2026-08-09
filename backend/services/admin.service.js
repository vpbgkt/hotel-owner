'use strict';

const { Op } = require('sequelize');
const dayjs = require('dayjs');
const { Hotel, RoomType, Room, RoomInventory, HourlySlot, Booking, User, SeoMeta, StaffPermission, sequelize } = require('../models');
const { createError } = require('../middlewares/errorHandler.middleware');
const { hashPassword } = require('../utils/bcrypt');
const hotelService = require('./hotel.service');

class AdminService {
  // ── Dashboard Stats ──────────────────────────────────────────────────────
  async getDashboardStats(hotelId) {
    const today = dayjs().format('YYYY-MM-DD');
    const monthStart = dayjs().startOf('month').format('YYYY-MM-DD');
    const monthEnd = dayjs().endOf('month').format('YYYY-MM-DD');

    const [
      totalBookings,
      monthBookings,
      todayCheckIns,
      todayCheckOuts,
      revenueResult,
      pendingBookings,
      recentBookings,
    ] = await Promise.all([
      Booking.count({ where: { hotelId } }),
      Booking.count({ where: { hotelId, createdAt: { [Op.between]: [monthStart, monthEnd] } } }),
      Booking.count({ where: { hotelId, checkInDate: today, status: { [Op.in]: ['CONFIRMED', 'CHECKED_IN'] } } }),
      Booking.count({ where: { hotelId, checkOutDate: today, status: 'CHECKED_IN' } }),
      Booking.findAll({
        where: { hotelId, paymentStatus: 'PAID', createdAt: { [Op.between]: [monthStart, monthEnd] } },
        attributes: [[sequelize.fn('SUM', sequelize.col('totalAmount')), 'revenue']],
        raw: true,
      }),
      Booking.count({ where: { hotelId, status: 'PENDING' } }),
      Booking.findAll({
        where: { hotelId },
        include: [
          { model: User, as: 'guest', attributes: ['id', 'name', 'email'] },
          { model: RoomType, as: 'roomType', attributes: ['id', 'name'] },
        ],
        order: [['createdAt', 'DESC']],
        limit: 10,
      }),
    ]);

    // Occupancy rate for current month
    const allRoomTypes = await RoomType.findAll({ where: { hotelId, isActive: true } });
    const totalRoomNights = allRoomTypes.reduce((sum, rt) => sum + rt.totalRooms, 0) * dayjs().daysInMonth();
    const bookedNights = await Booking.sum('numRooms', {
      where: {
        hotelId,
        bookingType: 'DAILY',
        status: { [Op.in]: ['CONFIRMED', 'CHECKED_IN', 'CHECKED_OUT'] },
        checkInDate: { [Op.lte]: monthEnd },
        checkOutDate: { [Op.gte]: monthStart },
      },
    });
    const occupancyRate = totalRoomNights > 0 ? Math.round((bookedNights / totalRoomNights) * 100) : 0;

    return {
      totalBookings,
      monthBookings,
      pendingBookings,
      todayCheckIns,
      todayCheckOuts,
      monthRevenue: parseFloat(revenueResult[0]?.revenue || 0),
      occupancyRate,
      recentBookings,
    };
  }

  // ── Update Hotel ─────────────────────────────────────────────────────────
  async updateHotel(hotelId, updates) {
    const hotel = await Hotel.findByPk(hotelId);
    if (!hotel) throw createError('Hotel not found', 404);

    await hotel.update(updates);
    await hotelService.invalidateCache(hotelId);
    return hotel;
  }

  // ── Room Types ───────────────────────────────────────────────────────────
  async createRoomType(hotelId, data) {
    const slug = data.slug || data.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    const existing = await RoomType.findOne({ where: { hotelId, slug } });
    if (existing) throw createError('Room type slug already exists', 409);

    const roomType = await RoomType.create({ ...data, hotelId, slug });
    return roomType;
  }

  async updateRoomType(roomTypeId, hotelId, updates) {
    const roomType = await RoomType.findOne({ where: { id: roomTypeId, hotelId } });
    if (!roomType) throw createError('Room type not found', 404);
    await roomType.update(updates);
    return roomType;
  }

  async deleteRoomType(roomTypeId, hotelId) {
    const roomType = await RoomType.findOne({ where: { id: roomTypeId, hotelId } });
    if (!roomType) throw createError('Room type not found', 404);

    const activeBookings = await Booking.count({
      where: { roomTypeId, status: { [Op.in]: ['PENDING', 'CONFIRMED', 'CHECKED_IN'] } },
    });
    if (activeBookings > 0) throw createError('Cannot delete room type with active bookings', 400);

    await roomType.destroy();
    return { message: 'Room type deleted' };
  }

  // ── Inventory ────────────────────────────────────────────────────────────
  async updateSingleInventory(hotelId, { roomTypeId, date, availableCount, priceOverride, isClosed }) {
    const roomType = await RoomType.findOne({ where: { id: roomTypeId, hotelId } });
    if (!roomType) throw createError('Room type not found', 404);

    const [inv] = await RoomInventory.findOrCreate({
      where: { roomTypeId, date },
      defaults: { roomTypeId, date, availableCount: roomType.totalRooms },
    });

    const updates = {};
    if (availableCount !== undefined) updates.availableCount = availableCount;
    if (priceOverride !== undefined) updates.priceOverride = priceOverride;
    if (isClosed !== undefined) updates.isClosed = isClosed;

    await inv.update(updates);
    return inv;
  }

  async bulkUpdateInventory(hotelId, { roomTypeId, startDate, endDate, availableCount, priceOverride, isClosed, minStayNights }) {
    const roomType = await RoomType.findOne({ where: { id: roomTypeId, hotelId } });
    if (!roomType) throw createError('Room type not found', 404);

    const roomService = require('./room.service');
    const dates = roomService._getDateRange(startDate, endDate);
    const updates = [];

    for (const date of dates) {
      const [inv] = await RoomInventory.findOrCreate({
        where: { roomTypeId, date },
        defaults: { roomTypeId, date, availableCount: roomType.totalRooms },
      });

      const updateData = {};
      if (availableCount !== undefined) updateData.availableCount = availableCount;
      if (priceOverride !== undefined) updateData.priceOverride = priceOverride;
      if (isClosed !== undefined) updateData.isClosed = isClosed;
      if (minStayNights !== undefined) updateData.minStayNights = minStayNights;

      await inv.update(updateData);
      updates.push({ date, ...updateData });
    }

    return { updatedDates: updates.length, dates: updates };
  }

  // ── SEO ──────────────────────────────────────────────────────────────────
  async upsertSeoMeta(hotelId, data) {
    const [seo] = await SeoMeta.findOrCreate({
      where: { hotelId, pageSlug: data.pageSlug },
      defaults: { hotelId, ...data },
    });

    if (!seo.isNewRecord) {
      await seo.update(data);
    }

    return seo;
  }

  // ── Staff ─────────────────────────────────────────────────────────────────
  async createStaff(hotelId, { name, email, password, permissions = {} }) {
    const existing = await User.findOne({ where: { email } });
    if (existing) throw createError('Email already registered', 409);

    const user = await User.create({
      name,
      email,
      password: await hashPassword(password),
      role: 'HOTEL_STAFF',
      hotelId,
    });

    await StaffPermission.create({ userId: user.id, ...permissions });

    return this._getStaffWithPermissions(user.id);
  }

  async updateStaff(userId, hotelId, permissions) {
    const user = await User.findOne({ where: { id: userId, hotelId, role: 'HOTEL_STAFF' } });
    if (!user) throw createError('Staff member not found', 404);

    await StaffPermission.update(permissions, { where: { userId } });
    return this._getStaffWithPermissions(userId);
  }

  async deleteStaff(userId, hotelId) {
    const user = await User.findOne({ where: { id: userId, hotelId, role: 'HOTEL_STAFF' } });
    if (!user) throw createError('Staff member not found', 404);
    await user.destroy();
    return { message: 'Staff member removed' };
  }

  async getStaff(hotelId) {
    const staff = await User.findAll({
      where: { hotelId, role: 'HOTEL_STAFF', isActive: true },
      include: [{ model: StaffPermission, as: 'staffPermission' }],
      attributes: { exclude: ['password'] },
    });
    return staff;
  }

  async _getStaffWithPermissions(userId) {
    return User.findByPk(userId, {
      include: [{ model: StaffPermission, as: 'staffPermission' }],
      attributes: { exclude: ['password'] },
    });
  }

  // ── Booking Management (Admin) ────────────────────────────────────────────
  async listBookings(hotelId, { page = 1, limit = 10, status, search } = {}) {
    const where = { hotelId };
    if (status) where.status = status;

    if (search && search.trim()) {
      const term = search.trim();
      // Case-insensitive substring match on both SQLite (LIKE is case-insensitive
      // for ASCII by default) and Postgres (iLike). Op.like works on both dialects,
      // so we use it consistently rather than iLike which only exists on Postgres.
      const likeTerm = `%${term}%`;
      where[Op.or] = [
        { bookingNumber: { [Op.like]: likeTerm } },
        { guestName: { [Op.like]: likeTerm } },
        { guestPhone: { [Op.like]: likeTerm } },
        { guestEmail: { [Op.like]: likeTerm } },
      ];
    }

    const offset = (parseInt(page) - 1) * parseInt(limit);
    const { count, rows } = await Booking.findAndCountAll({
      where,
      include: [
        { model: User, as: 'guest', attributes: ['id', 'name', 'email', 'phone'] },
        { model: RoomType, as: 'roomType', attributes: ['id', 'name'] },
      ],
      order: [['createdAt', 'DESC']],
      limit: parseInt(limit),
      offset,
    });

    return { data: rows, total: count, pages: Math.ceil(count / parseInt(limit)), page: parseInt(page) };
  }

  async updateBookingStatusAdmin(bookingId, hotelId, status) {
    const booking = await Booking.findOne({ where: { id: bookingId, hotelId } });
    if (!booking) throw createError('Booking not found', 404);

    const VALID_STATUSES = ['PENDING', 'CONFIRMED', 'CHECKED_IN', 'CHECKED_OUT', 'CANCELLED', 'NO_SHOW'];
    if (!VALID_STATUSES.includes(status)) throw createError('Invalid status', 400);

    await booking.update({ status });
    return booking;
  }

  // ── Offline / Walk-in Booking (counter booking by staff) ─────────────────
  async createOfflineBooking(hotelId, staffId, data) {
    const {
      roomTypeId, bookingType = 'DAILY',
      checkInDate, checkOutDate, checkInTime, checkOutTime, numHours,
      numRooms = 1, numExtraGuests = 0,
      guestName, guestEmail, guestPhone,
      paymentMethod = 'CASH', notes,
    } = data;

    // Guests are captured as adults + children, mirroring the guest-facing
    // booking flow (booking.service.js). Fall back to legacy numGuests if the
    // client only sent a single guest count.
    const numAdults = parseInt(data.numAdults ?? data.numGuests ?? 1);
    const numChildren = parseInt(data.numChildren ?? 0);
    const numGuests = numAdults + numChildren;

    const roomType = await RoomType.findOne({ where: { id: roomTypeId, hotelId } });
    if (!roomType) throw createError('Room type not found', 404);

    // Enforce the same occupancy limits as the online booking flow, scaled by
    // number of rooms booked.
    const maxAdults = (roomType.maxAdults ?? roomType.maxGuests) * numRooms;
    const maxChildren = (roomType.maxChildren ?? 0) * numRooms;
    const maxOccupancy = roomType.maxGuests * numRooms;

    if (numAdults < 1) throw createError('At least 1 adult is required', 400);
    if (numAdults > maxAdults) throw createError(`Max ${maxAdults} adult(s) allowed for ${numRooms} room(s) of this type`, 400);
    if (numChildren > maxChildren) throw createError(`Max ${maxChildren} child(ren) allowed for ${numRooms} room(s) of this type`, 400);
    if (numGuests > maxOccupancy) throw createError(`Max occupancy is ${maxOccupancy} guest(s) for ${numRooms} room(s) of this type`, 400);

    const hotel = await Hotel.findByPk(hotelId, { attributes: ['id', 'gstRate'] });
    const taxRate = hotel?.gstRate ?? 0.12;

    let subtotal = 0;
    let nights = 0;
    let hours = 0;

    if (bookingType === 'DAILY') {
      const ciDay = dayjs(checkInDate);
      const coDay = dayjs(checkOutDate);
      nights = coDay.diff(ciDay, 'day');
      if (nights < 1) throw createError('Check-out must be after check-in', 400);
      subtotal = (roomType.basePriceDaily || 0) * nights * numRooms;
    } else {
      hours = parseInt(numHours) || 1;
      subtotal = (roomType.basePriceHourly || roomType.basePriceDaily / 12) * hours * numRooms;
    }

    const extraCharge = (roomType.extraGuestCharge || 0) * (numExtraGuests || 0) * (bookingType === 'DAILY' ? nights : hours);
    const taxAmount = Math.round((subtotal + extraCharge) * taxRate);
    const totalAmount = subtotal + extraCharge + taxAmount;

    // Find or create a walk-in guest user
    let guestUser = null;
    if (guestEmail) {
      guestUser = await User.findOne({ where: { email: guestEmail } });
    }
    if (!guestUser && guestPhone) {
      guestUser = await User.findOne({ where: { phone: guestPhone } });
    }
    if (!guestUser) {
      guestUser = await User.create({
        name: guestName || 'Walk-in Guest',
        email: guestEmail || null,
        phone: guestPhone || null,
        role: 'GUEST',
        isActive: true,
        emailVerified: false,
      });
    }

    const { generate: generateBookingNumber } = require('../utils/bookingNumber');
    const booking = await Booking.create({
      bookingNumber: generateBookingNumber(),
      hotelId,
      guestId: guestUser.id,
      roomTypeId,
      bookingType,
      source: 'WALK_IN',
      checkInDate: bookingType === 'DAILY' ? checkInDate : null,
      checkOutDate: bookingType === 'DAILY' ? checkOutDate : null,
      checkInTime: bookingType === 'HOURLY' ? checkInTime : null,
      checkOutTime: bookingType === 'HOURLY' ? checkOutTime : null,
      numHours: bookingType === 'HOURLY' ? hours : null,
      numRooms,
      numGuests,
      numAdults,
      numChildren,
      numExtraGuests,
      guestName,
      guestEmail,
      guestPhone,
      specialRequests: notes || null,
      subtotal,
      taxAmount,
      totalAmount,
      status: 'CONFIRMED',
      paymentStatus: paymentMethod === 'CASH' ? 'PAID' : 'PENDING',
      paymentMethod: paymentMethod || 'CASH',
    });

    return booking;
  }

  // ── Guest Management ──────────────────────────────────────────────────────
  async listGuests(hotelId, { page = 1, limit = 20, search } = {}) {
    const offset = (parseInt(page) - 1) * parseInt(limit);
    // Get unique guest IDs that have booked at this hotel
    const bookingWhere = { hotelId };

    const guestIdRows = await Booking.findAll({
      where: bookingWhere,
      attributes: [[sequelize.fn('DISTINCT', sequelize.col('guestId')), 'guestId']],
      raw: true,
    });

    const guestIds = guestIdRows.map((r) => r.guestId).filter(Boolean);

    const userWhere = { id: { [Op.in]: guestIds }, role: 'GUEST' };
    if (search && search.trim()) {
      // Op.like (not iLike) so it works on both SQLite (dev — LIKE is
      // case-insensitive for ASCII) and Postgres, consistent with listBookings.
      const likeTerm = `%${search.trim()}%`;
      userWhere[Op.or] = [
        { name: { [Op.like]: likeTerm } },
        { email: { [Op.like]: likeTerm } },
        { phone: { [Op.like]: likeTerm } },
      ];
    }

    const { count, rows } = await User.findAndCountAll({
      where: userWhere,
      attributes: { exclude: ['password'] },
      order: [['createdAt', 'DESC']],
      limit: parseInt(limit),
      offset,
    });

    return { data: rows, total: count, pages: Math.ceil(count / parseInt(limit)), page: parseInt(page) };
  }

  async getGuestDetail(guestId, hotelId) {
    const guest = await User.findOne({
      where: { id: guestId, role: 'GUEST' },
      attributes: { exclude: ['password'] },
    });
    if (!guest) throw createError('Guest not found', 404);

    const bookings = await Booking.findAll({
      where: { hotelId, guestId },
      include: [{ model: RoomType, as: 'roomType', attributes: ['id', 'name'] }],
      order: [['createdAt', 'DESC']],
      limit: 10,
    });

    const totalSpent = bookings
      .filter((b) => b.paymentStatus === 'PAID')
      .reduce((sum, b) => sum + parseFloat(b.totalAmount || 0), 0);

    return { guest, bookings, totalSpent, totalBookings: bookings.length };
  }

  async listRoomTypes(hotelId) {
    return RoomType.findAll({ where: { hotelId }, order: [['createdAt', 'ASC']] });
  }
}

module.exports = new AdminService();
