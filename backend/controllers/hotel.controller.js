'use strict';

const hotelService = require('../services/hotel.service');
const { success } = require('../utils/response');
const asyncHandler = require('../middlewares/asyncHandler.middleware');

exports.getById = asyncHandler(async (req, res) => {
  const hotel = await hotelService.findById(req.params.id);
  return success(res, 'Hotel fetched', hotel);
});

exports.getFeatured = asyncHandler(async (req, res) => {
  const data = await hotelService.getFeatured(parseInt(req.query.limit) || 6);
  return success(res, 'Featured hotels fetched', data);
});
