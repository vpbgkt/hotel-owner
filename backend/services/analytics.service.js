'use strict';

const { Op } = require('sequelize');
const dayjs = require('dayjs');
const { Booking, RoomType, Payment, sequelize } = require('../models');

class AnalyticsService {
  // Grouped in JS rather than via SQL date_trunc() — date_trunc is Postgres-only
  // and breaks on SQLite / pg-mem (used in dev), which silently made this
  // endpoint fail and the Analytics page show "No data available".
  async getBookingTrends(hotelId, { year = dayjs().year(), months = 12 } = {}) {
    const startDate = dayjs(`${year}-01-01`).format('YYYY-MM-DD');
    const endDate = dayjs(`${year}-12-31 23:59:59`).format('YYYY-MM-DD HH:mm:ss');

    const bookings = await Booking.findAll({
      where: {
        hotelId,
        createdAt: { [Op.between]: [startDate, endDate] },
      },
      attributes: ['createdAt', 'totalAmount', 'status', 'paymentStatus'],
      raw: true,
    });

    const byMonth = {};
    for (const b of bookings) {
      const key = dayjs(b.createdAt).format('YYYY-MM');
      if (!byMonth[key]) byMonth[key] = { totalBookings: 0, revenue: 0, cancelledBookings: 0 };
      byMonth[key].totalBookings += 1;
      if (b.paymentStatus === 'PAID') byMonth[key].revenue += parseFloat(b.totalAmount || 0);
      if (b.status === 'CANCELLED') byMonth[key].cancelledBookings += 1;
    }

    // Sort descending so the newest month appears first, matching the rest of
    // the admin UI (recent bookings, etc. are always newest-first).
    return Object.keys(byMonth)
      .sort()
      .reverse()
      .map((month) => ({ month, ...byMonth[month] }));
  }

  async getRevenueReport(hotelId, { startDate, endDate } = {}) {
    const start = startDate || dayjs().startOf('month').format('YYYY-MM-DD');
    const end = endDate ? `${endDate} 23:59:59` : dayjs().endOf('month').format('YYYY-MM-DD HH:mm:ss');

    const result = await Booking.findAll({
      where: {
        hotelId,
        paymentStatus: 'PAID',
        createdAt: { [Op.between]: [start, end] },
      },
      attributes: [
        [sequelize.fn('SUM', sequelize.col('totalAmount')), 'totalRevenue'],
        [sequelize.fn('SUM', sequelize.col('roomTotal')), 'roomRevenue'],
        [sequelize.fn('SUM', sequelize.col('taxes')), 'totalTaxes'],
        [sequelize.fn('COUNT', sequelize.col('id')), 'totalBookings'],
        [sequelize.fn('AVG', sequelize.col('totalAmount')), 'avgBookingValue'],
      ],
      raw: true,
    });

    // Refunds are tracked on Payment (refundAmount), not on Booking, so they
    // need a separate query rather than being read off the Booking aggregate.
    const refundResult = await Payment.findAll({
      where: {
        status: 'REFUNDED',
        createdAt: { [Op.between]: [start, end] },
      },
      include: [{ model: Booking, as: 'booking', where: { hotelId }, attributes: [] }],
      attributes: [[sequelize.fn('SUM', sequelize.col('Payment.refundAmount')), 'totalRefunds']],
      raw: true,
    });

    // Total bookings for the period regardless of payment status — distinct
    // from paidBookings below, which only counts the PAID subset used for the
    // revenue aggregate. Reported separately so the UI isn't misled into
    // showing "Total Bookings" when only paid bookings were actually counted.
    const totalBookingsAllStatuses = await Booking.count({
      where: { hotelId, createdAt: { [Op.between]: [start, end] } },
    });

    return {
      period: { startDate: start, endDate: end },
      totalRevenue: parseFloat(result[0]?.totalRevenue || 0),
      roomRevenue: parseFloat(result[0]?.roomRevenue || 0),
      totalTaxes: parseFloat(result[0]?.totalTaxes || 0),
      totalBookings: totalBookingsAllStatuses,
      paidBookings: parseInt(result[0]?.totalBookings || 0, 10),
      avgBookingValue: parseFloat(parseFloat(result[0]?.avgBookingValue || 0).toFixed(2)),
      totalRefunds: parseFloat(refundResult[0]?.totalRefunds || 0),
    };
  }

  async getOccupancyMetrics(hotelId, { month } = {}) {
    const targetMonth = month || dayjs().format('YYYY-MM');
    const startDate = dayjs(`${targetMonth}-01`).format('YYYY-MM-DD');
    const endDate = dayjs(startDate).endOf('month').format('YYYY-MM-DD');
    const daysInMonth = dayjs(startDate).daysInMonth();

    const roomTypes = await RoomType.findAll({ where: { hotelId, isActive: true } });
    const totalCapacity = roomTypes.reduce((sum, rt) => sum + rt.totalRooms * daysInMonth, 0);

    const bookedRoomNights = await Booking.sum('numRooms', {
      where: {
        hotelId,
        bookingType: 'DAILY',
        status: { [Op.in]: ['CONFIRMED', 'CHECKED_IN', 'CHECKED_OUT'] },
        checkInDate: { [Op.lte]: endDate },
        checkOutDate: { [Op.gte]: startDate },
      },
    }) || 0;

    const occupancyRate = totalCapacity > 0
      ? parseFloat(((bookedRoomNights / totalCapacity) * 100).toFixed(1))
      : 0;

    const byRoomType = await Promise.all(
      roomTypes.map(async (rt) => {
        const booked = (await Booking.sum('numRooms', {
          where: {
            hotelId,
            roomTypeId: rt.id,
            bookingType: 'DAILY',
            status: { [Op.in]: ['CONFIRMED', 'CHECKED_IN', 'CHECKED_OUT'] },
            checkInDate: { [Op.lte]: endDate },
            checkOutDate: { [Op.gte]: startDate },
          },
        })) || 0;

        return {
          roomTypeId: rt.id,
          name: rt.name,
          totalRooms: rt.totalRooms,
          bookedNights: booked,
          capacityNights: rt.totalRooms * daysInMonth,
          occupancyRate: rt.totalRooms > 0
            ? parseFloat(((booked / (rt.totalRooms * daysInMonth)) * 100).toFixed(1))
            : 0,
        };
      })
    );

    return { month: targetMonth, occupancyRate, totalCapacity, bookedRoomNights, byRoomType };
  }

  async getBookingsBySource(hotelId) {
    const results = await Booking.findAll({
      where: { hotelId },
      attributes: ['source', [sequelize.fn('COUNT', sequelize.col('id')), 'count']],
      group: ['source'],
      raw: true,
    });
    return results.map((r) => ({ source: r.source, count: parseInt(r.count, 10) }));
  }
}

module.exports = new AnalyticsService();
