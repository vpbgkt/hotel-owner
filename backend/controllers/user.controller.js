'use strict';

const userService = require('../services/user.service');
const { success } = require('../utils/response');
const asyncHandler = require('../middlewares/asyncHandler.middleware');

exports.getProfile = asyncHandler(async (req, res) => {
  const data = await userService.findById(req.user.id);
  return success(res, 'Profile fetched', data);
});

exports.updateProfile = asyncHandler(async (req, res) => {
  const data = await userService.updateProfile(req.user.id, req.body);
  return success(res, 'Profile updated', data);
});

exports.getMyBookings = asyncHandler(async (req, res) => {
  const { page, limit } = req.query;
  const data = await userService.getUserBookings(req.user.id, {
    page: parseInt(page) || 1,
    limit: parseInt(limit) || 10,
  });
  return success(res, 'Bookings fetched', data);
});

exports.getMyReviews = asyncHandler(async (req, res) => {
  const { page, limit } = req.query;
  const data = await userService.getUserReviews(req.user.id, {
    page: parseInt(page) || 1,
    limit: parseInt(limit) || 10,
  });
  return success(res, 'Reviews fetched', data);
});


