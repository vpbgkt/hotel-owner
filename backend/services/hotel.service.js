'use strict';

const { Hotel, RoomType, Review } = require('../models');
const { redis } = require('../config/redis');
const { createError } = require('../middlewares/errorHandler.middleware');

const HOTEL_CACHE_TTL = 300; // 5 minutes
const FEATURED_CACHE_TTL = 600; // 10 minutes

class HotelService {
  async findById(id) {
    const cacheKey = `hotel:id:${id}`;
    const cached = await redis.get(cacheKey).catch(() => null);
    if (cached) return JSON.parse(cached);

    const hotel = await Hotel.findOne({
      where: { id, isActive: true },
      include: [
        { model: RoomType, as: 'roomTypes', where: { isActive: true }, required: false, order: [['sortOrder', 'ASC']] },
        { model: Review, as: 'reviews', where: { isPublished: true }, required: false, attributes: ['rating'] },
      ],
    });

    if (!hotel) throw createError('Hotel not found', 404);

    const result = this._computeHotelFields(hotel);
    await redis.set(cacheKey, JSON.stringify(result), 'EX', HOTEL_CACHE_TTL).catch(() => {});
    return result;
  }

  async getFeatured(limit = 6) {
    const cacheKey = `hotels:featured:${limit}`;
    const cached = await redis.get(cacheKey).catch(() => null);
    if (cached) return JSON.parse(cached);

    const hotels = await Hotel.findAll({
      where: { isActive: true },
      include: [
        { model: RoomType, as: 'roomTypes', where: { isActive: true }, required: false, attributes: ['id', 'name', 'description', 'basePriceDaily', 'maxGuests', 'images'] },
        { model: Review, as: 'reviews', where: { isPublished: true }, required: false, attributes: ['rating'] },
      ],
      order: [['createdAt', 'DESC']],
      limit,
    });

    const result = hotels.map((h) => this._computeHotelFields(h));
    await redis.set(cacheKey, JSON.stringify(result), 'EX', FEATURED_CACHE_TTL).catch(() => {});
    return result;
  }

  async invalidateCache(hotelId) {
    const keys = await redis.keys(`hotel:*`).catch(() => []);
    const listKeys = await redis.keys(`hotels:*`).catch(() => []);
    const allKeys = [...keys, ...listKeys];
    if (allKeys.length > 0) await redis.del(...allKeys).catch(() => {});
  }

  _computeHotelFields(hotel) {
    const plain = hotel.toJSON ? hotel.toJSON() : hotel;
    const reviews = plain.reviews || [];
    const roomTypes = plain.roomTypes || [];

    plain.avgRating = reviews.length
      ? parseFloat((reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length).toFixed(1))
      : null;
    plain.reviewCount = reviews.length;
    plain.startingPrice = roomTypes.length
      ? Math.min(...roomTypes.map((rt) => rt.basePriceDaily || Infinity))
      : null;

    // Alias heroImageUrl → coverImageUrl for frontend compatibility
    if (!plain.coverImageUrl && plain.heroImageUrl) {
      plain.coverImageUrl = plain.heroImageUrl;
    }
    // Also set heroImageUrl from coverImageUrl if missing
    if (!plain.heroImageUrl && plain.coverImageUrl) {
      plain.heroImageUrl = plain.coverImageUrl;
    }

    delete plain.reviews; // Don't expose all reviews in list
    return plain;
  }
}

module.exports = new HotelService();
