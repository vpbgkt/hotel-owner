'use strict';

const { User, Booking, Review } = require('../models');
const { createError } = require('../middlewares/errorHandler.middleware');
const { paginate } = require('../utils/pagination');

class UserService {
  async findById(id) {
    const user = await User.findByPk(id, { attributes: { exclude: ['password'] } });
    if (!user) throw createError('User not found', 404);
    return user;
  }

  async updateProfile(userId, { name, email, phone, avatarUrl }) {
    const user = await User.findByPk(userId);
    if (!user) throw createError('User not found', 404);

    // Check uniqueness of email/phone if being changed
    if (email && email !== user.email) {
      const existing = await User.findOne({ where: { email } });
      if (existing) throw createError('Email already in use', 409);
    }
    if (phone && phone !== user.phone) {
      const existing = await User.findOne({ where: { phone } });
      if (existing) throw createError('Phone already in use', 409);
    }

    const updates = {};
    if (name !== undefined) updates.name = name;
    // Only reset the verified flag when the value actually changes — saving
    // the form with the same email/phone should not re-flag it as unverified.
    if (email !== undefined) {
      updates.email = email;
      if (email !== user.email) updates.emailVerified = false;
    }
    if (phone !== undefined) {
      updates.phone = phone;
      if (phone !== user.phone) updates.phoneVerified = false;
    }
    if (avatarUrl !== undefined) updates.avatarUrl = avatarUrl;

    await user.update(updates);
    return User.findByPk(userId, { attributes: { exclude: ['password'] } });
  }

  async getUserBookings(userId, { page = 1, limit = 10 } = {}) {
    const { Booking: BookingModel, RoomType, Hotel } = require('../models');
    return paginate(
      BookingModel,
      {
        where: { guestId: userId },
        include: [
          { model: RoomType, as: 'roomType', attributes: ['id', 'name', 'images'] },
          { model: Hotel, as: 'hotel', attributes: ['id', 'name', 'slug'] },
        ],
        order: [['createdAt', 'DESC']],
      },
      page,
      limit
    );
  }

  async getUserReviews(userId, { page = 1, limit = 10 } = {}) {
    return paginate(
      Review,
      { where: { guestId: userId }, order: [['createdAt', 'DESC']] },
      page,
      limit
    );
  }

}

module.exports = new UserService();
