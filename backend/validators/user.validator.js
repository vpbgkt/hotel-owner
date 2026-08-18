'use strict';

const { body } = require('express-validator');

const updateProfile = [
  body('name').optional().isLength({ min: 1, max: 255 }).withMessage('Name must be 1-255 characters'),
  body('email')
    .optional({ nullable: true })
    .isEmail().withMessage('Valid email required')
    .normalizeEmail(),
  body('phone')
    .optional({ nullable: true, checkFalsy: true })
    .matches(/^\+?[0-9]{7,15}$/).withMessage('Phone must be 7-15 digits (e.g. +919876543210)'),
  body('avatarUrl')
    .optional({ nullable: true })
    .isURL().withMessage('Avatar URL must be a valid URL'),
];

module.exports = { updateProfile };
