'use strict';

const { body, query } = require('express-validator');

const createDailyBooking = [
  body('roomTypeId').notEmpty().isInt({ min: 1 }).toInt().withMessage('Valid roomTypeId required'),
  body('hotelId').notEmpty().isString().trim().withMessage('Valid hotelId required'),
  body('checkInDate')
    .notEmpty().withMessage('Check-in date required')
    .isDate({ format: 'YYYY-MM-DD' }).withMessage('Check-in date must be YYYY-MM-DD'),
  body('checkOutDate')
    .notEmpty().withMessage('Check-out date required')
    .isDate({ format: 'YYYY-MM-DD' }).withMessage('Check-out date must be YYYY-MM-DD'),
  body('numRooms').optional().isInt({ min: 1, max: 10 }).withMessage('numRooms must be 1-10'),
  body('numAdults').optional().isInt({ min: 1 }).withMessage('numAdults must be at least 1'),
  body('numChildren').optional().isInt({ min: 0 }).withMessage('numChildren must be >= 0'),
  body('numGuests').optional().isInt({ min: 1 }).withMessage('numGuests must be at least 1'),
  body('numExtraGuests').optional().isInt({ min: 0 }).withMessage('numExtraGuests must be >= 0'),
  body('guestName').notEmpty().isLength({ max: 255 }).withMessage('Guest name required'),
  body('guestEmail').optional().isEmail().normalizeEmail(),
  body('guestPhone').optional().matches(/^\+?[0-9]{7,15}$/).withMessage('Invalid phone number'),
  body('specialRequests').optional().isLength({ max: 1000 }).withMessage('Special requests too long'),
];

const createHourlyBooking = [
  body('roomTypeId').notEmpty().isInt({ min: 1 }).toInt().withMessage('Valid roomTypeId required'),
  body('hotelId').notEmpty().isString().trim().withMessage('Valid hotelId required'),
  body('date')
    .notEmpty().withMessage('Date required')
    .isDate({ format: 'YYYY-MM-DD' }).withMessage('Date must be YYYY-MM-DD'),
  body('slotStart')
    .notEmpty().withMessage('Slot start time required')
    .matches(/^\d{2}:\d{2}$/).withMessage('slotStart must be HH:MM'),
  body('numHours').notEmpty().isInt({ min: 1 }).withMessage('numHours must be at least 1'),
  body('numRooms').optional().isInt({ min: 1, max: 10 }),
  body('numGuests').optional().isInt({ min: 1 }),
  body('guestName').notEmpty().isLength({ max: 255 }).withMessage('Guest name required'),
  body('guestEmail').optional().isEmail().normalizeEmail(),
  body('guestPhone').optional().matches(/^\+?[0-9]{7,15}$/).withMessage('Invalid phone number'),
];

const cancelBooking = [
  body('reason').optional().isLength({ max: 500 }).withMessage('Cancellation reason too long'),
];

const modifyBooking = [
  body('checkInDate').optional().isDate({ format: 'YYYY-MM-DD' }),
  body('checkOutDate').optional().isDate({ format: 'YYYY-MM-DD' }),
  body('numRooms').optional().isInt({ min: 1 }),
  body('numGuests').optional().isInt({ min: 1 }),
  body('numExtraGuests').optional().isInt({ min: 0 }),
  body('specialRequests').optional().isLength({ max: 1000 }),
];

const updateStatus = [
  body('status')
    .notEmpty().withMessage('Status is required')
    .isIn(['PENDING', 'CONFIRMED', 'CHECKED_IN', 'CHECKED_OUT', 'CANCELLED', 'NO_SHOW'])
    .withMessage('Invalid booking status'),
];

const checkDailyAvailability = [
  query('roomTypeId').notEmpty().isInt({ min: 1 }).toInt().withMessage('Valid roomTypeId required'),
  query('checkInDate').notEmpty().isDate({ format: 'YYYY-MM-DD' }),
  query('checkOutDate').notEmpty().isDate({ format: 'YYYY-MM-DD' }),
  query('numRooms').optional().isInt({ min: 1 }),
];

const checkHourlyAvailability = [
  query('roomTypeId').notEmpty().isInt({ min: 1 }).toInt().withMessage('Valid roomTypeId required'),
  query('date').notEmpty().isDate({ format: 'YYYY-MM-DD' }),
  query('numHours').optional().isInt({ min: 1 }),
];

module.exports = {
  createDailyBooking,
  createHourlyBooking,
  cancelBooking,
  modifyBooking,
  updateStatus,
  checkDailyAvailability,
  checkHourlyAvailability,
};
