'use strict';

const { Router } = require('express');
const ctrl = require('../controllers/auth.controller');
const { authenticate } = require('../middlewares/auth.middleware');
const { authLimiter } = require('../middlewares/rateLimiter.middleware');
const validate = require('../middlewares/validate.middleware');
const {
  register: registerValidator,
  login: loginValidator,
  requestOTP: requestOTPValidator,
  verifyOTP: verifyOTPValidator,
  changePassword: changePasswordValidator,
  requestPasswordReset: requestPasswordResetValidator,
  resetPassword: resetPasswordValidator,
  requestRegistration: requestRegistrationValidator,
  completeRegistration: completeRegistrationValidator,
} = require('../validators/auth.validator');

const router = Router();

// Public routes (rate-limited)
router.post('/register', authLimiter, registerValidator, validate, ctrl.register);
// Verified (two-step) registration: request link → complete with details
router.post('/register/request', authLimiter, requestRegistrationValidator, validate, ctrl.requestRegistration);
router.get('/register/verify', ctrl.verifyRegistrationToken);
router.post('/register/complete', authLimiter, completeRegistrationValidator, validate, ctrl.completeRegistration);
router.post('/login', authLimiter, loginValidator, validate, ctrl.login);
router.post('/otp/request', authLimiter, requestOTPValidator, validate, ctrl.requestOTP);
router.post('/otp/verify', authLimiter, verifyOTPValidator, validate, ctrl.verifyOTP);
router.post('/refresh', ctrl.refresh);
router.post('/password/request-reset', authLimiter, requestPasswordResetValidator, validate, ctrl.requestPasswordReset);
router.post('/password/reset', authLimiter, resetPasswordValidator, validate, ctrl.resetPassword);
router.post('/email/verify', ctrl.verifyEmail);

// Protected routes
router.use(authenticate);
router.get('/me', ctrl.getMe);
router.post('/logout', ctrl.logout);
router.put('/password/change', changePasswordValidator, validate, ctrl.changePassword);
router.post('/email/resend-verification', ctrl.resendVerification);

module.exports = router;
