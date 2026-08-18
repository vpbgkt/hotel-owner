'use strict';

const { body } = require('express-validator');

const updateHotel = [
  body('name').optional().isLength({ min: 2, max: 255 }).withMessage('Hotel name must be 2-255 characters'),
  body('description').optional().isLength({ max: 5000 }).withMessage('Description too long'),
  body('phone').optional({ nullable: true, checkFalsy: true }).isMobilePhone().withMessage('Valid phone required'),
  body('email').optional().isEmail().normalizeEmail(),
  body('address').optional().isLength({ max: 500 }),
  body('city').optional().isLength({ max: 100 }),
  body('state').optional().isLength({ max: 100 }),
  body('starRating').optional().isInt({ min: 1, max: 5 }).withMessage('Star rating must be 1-5'),
  body('checkInTime').optional().matches(/^\d{2}:\d{2}$/).withMessage('checkInTime must be HH:MM'),
  body('checkOutTime').optional().matches(/^\d{2}:\d{2}$/).withMessage('checkOutTime must be HH:MM'),
  body('bookingModel').optional().isIn(['DAILY', 'HOURLY', 'BOTH']),
];

const createRoomType = [
  body('name').notEmpty().isLength({ max: 255 }).withMessage('Room type name required'),
  body('basePriceDaily')
    .notEmpty().withMessage('Base daily price required')
    .isFloat({ min: 0 }).withMessage('Base price must be >= 0'),
  body('basePriceHourly').optional().isFloat({ min: 0 }),
  body('maxGuests').optional().isInt({ min: 1 }),
  body('maxAdults').optional().isInt({ min: 1 }),
  body('maxChildren').optional().isInt({ min: 0 }),
  body('totalRooms')
    .notEmpty().withMessage('Total rooms required')
    .isInt({ min: 1 }).withMessage('Total rooms must be at least 1'),
  body('amenities').optional().isArray(),
  body('bookingModelOverride').optional().isIn(['DAILY', 'HOURLY', 'BOTH']),
];

const updateRoomType = [
  body('name').optional().isLength({ max: 255 }),
  body('basePriceDaily').optional().isFloat({ min: 0 }),
  body('basePriceHourly').optional().isFloat({ min: 0 }),
  body('maxGuests').optional().isInt({ min: 1 }),
  body('maxAdults').optional().isInt({ min: 1 }),
  body('maxChildren').optional().isInt({ min: 0 }),
  body('totalRooms').optional().isInt({ min: 1 }),
  body('amenities').optional().isArray(),
  body('images').optional().isArray(),
  body('isActive').optional().isBoolean(),
];

const bulkUpdateInventory = [
  // RoomType uses an auto-increment integer primary key (matches booking.validator.js).
  body('roomTypeId').notEmpty().isInt({ min: 1 }).toInt().withMessage('Valid roomTypeId required'),
  body('startDate').notEmpty().isDate({ format: 'YYYY-MM-DD' }),
  body('endDate').notEmpty().isDate({ format: 'YYYY-MM-DD' }),
  body('availableCount').optional().isInt({ min: 0 }),
  body('priceOverride').optional().isFloat({ min: 0 }),
  body('isClosed').optional().isBoolean(),
  // When true, clears all overrides for the range (the fields above are ignored).
  body('resetToDefault').optional().isBoolean(),
];

const updateSingleInventory = [
  // RoomType uses an auto-increment integer primary key (matches booking.validator.js).
  body('roomTypeId').notEmpty().isInt({ min: 1 }).toInt().withMessage('Valid roomTypeId required'),
  body('date').notEmpty().isDate({ format: 'YYYY-MM-DD' }),
  body('availableCount').optional().isInt({ min: 0 }),
  body('priceOverride').optional().isFloat({ min: 0 }),
  body('isClosed').optional().isBoolean(),
];

const createStaff = [
  body('name').notEmpty().isLength({ max: 255 }).withMessage('Staff name required'),
  body('email')
    .notEmpty().withMessage('Email required')
    .isEmail().normalizeEmail(),
  body('password')
    .notEmpty().withMessage('Password required')
    .isLength({ min: 8 }).withMessage('Password must be at least 8 characters'),
];

const updateStaff = [
  body('canManageBookings').optional().isBoolean(),
  body('canManageRooms').optional().isBoolean(),
  body('canManagePricing').optional().isBoolean(),
  body('canManageReviews').optional().isBoolean(),
  body('canManageContent').optional().isBoolean(),
  body('canViewAnalytics').optional().isBoolean(),
  body('canManageStaff').optional().isBoolean(),
];

const upsertSeoMeta = [
  body('pageSlug').notEmpty().withMessage('Page slug required'),
  body('metaTitle').optional().isLength({ max: 255 }),
  body('metaDescription').optional().isLength({ max: 500 }),
  body('ogImageUrl').optional().isURL(),
  body('canonicalUrl').optional().isURL(),
];

module.exports = {
  updateHotel,
  createRoomType,
  updateRoomType,
  bulkUpdateInventory,
  updateSingleInventory,
  createStaff,
  updateStaff,
  upsertSeoMeta,
};
