'use strict';

const authService = require('../services/auth.service');
const { success } = require('../utils/response');
const asyncHandler = require('../middlewares/asyncHandler.middleware');

exports.register = asyncHandler(async (req, res) => {
  const data = await authService.register(req.body);
  return success(res, 'Registration successful', data, 201);
});

exports.requestRegistration = asyncHandler(async (req, res) => {
  const data = await authService.requestRegistration(req.body);
  return success(res, data.message, null);
});

exports.verifyRegistrationToken = asyncHandler(async (req, res) => {
  const data = await authService.verifyRegistrationToken(req.query);
  return success(res, 'Verification link is valid', data);
});

exports.completeRegistration = asyncHandler(async (req, res) => {
  const data = await authService.completeRegistration(req.body);
  return success(res, 'Registration successful', data, 201);
});

exports.login = asyncHandler(async (req, res) => {
  const data = await authService.login(req.body);
  return success(res, 'Login successful', data);
});

exports.requestOTP = asyncHandler(async (req, res) => {
  const data = await authService.requestOTP(req.body);
  return success(res, data.message, null);
});

exports.verifyOTP = asyncHandler(async (req, res) => {
  const data = await authService.verifyOTP(req.body);
  return success(res, 'OTP verified', data);
});

exports.refresh = asyncHandler(async (req, res) => {
  const data = await authService.refreshToken(req.body);
  return success(res, 'Token refreshed', data);
});

exports.logout = asyncHandler(async (req, res) => {
  const data = await authService.logout(req.user.id);
  return success(res, data.message, null);
});

exports.getMe = asyncHandler(async (req, res) => {
  const user = await authService.getMe(req.user.id);
  return success(res, 'Profile fetched', user);
});

exports.changePassword = asyncHandler(async (req, res) => {
  const data = await authService.changePassword(req.user.id, req.body);
  return success(res, data.message, null);
});

exports.requestPasswordReset = asyncHandler(async (req, res) => {
  const data = await authService.requestPasswordReset(req.body);
  return success(res, data.message, null);
});

exports.resetPassword = asyncHandler(async (req, res) => {
  const data = await authService.resetPassword(req.body);
  return success(res, data.message, null);
});

exports.verifyEmail = asyncHandler(async (req, res) => {
  const data = await authService.verifyEmail(req.body);
  return success(res, data.message, null);
});

exports.resendVerification = asyncHandler(async (req, res) => {
  const data = await authService.resendVerification(req.user.id);
  return success(res, data.message, null);
});
