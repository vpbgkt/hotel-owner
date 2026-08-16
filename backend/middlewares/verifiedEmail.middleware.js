'use strict';

const { forbidden } = require('../utils/response');

/**
 * Blocks the request unless the authenticated user has a verified email.
 * Must run after `authenticate` (which attaches req.user).
 *
 * Used to gate guest self-service bookings: a guest must prove ownership of
 * their email address before they can book a room. Staff/admin walk-in
 * bookings go through a different route and are not affected.
 */
function requireVerifiedEmail(req, res, next) {
  if (!req.user || !req.user.emailVerified) {
    return forbidden(res, 'Please verify your email address before booking.');
  }
  return next();
}

module.exports = { requireVerifiedEmail };
