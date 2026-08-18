'use strict';

const { User } = require('../models');
const { hashPassword, comparePassword } = require('../utils/bcrypt');
const { generateTokens, generateRefreshToken, verifyRefreshToken, generateResetToken } = require('../utils/jwt');
const { generateOTP, storeOTP, verifyOTP: verifyOTPValue, clearOTP } = require('../utils/otp');
const { redis } = require('../config/redis');
const { createError } = require('../middlewares/errorHandler.middleware');

const MAX_LOGIN_ATTEMPTS = 5;
const LOCKOUT_DURATION_SECONDS = 15 * 60; // 15 min
const REFRESH_TOKEN_TTL_SECONDS = 7 * 24 * 60 * 60; // 7 days
const RESET_TOKEN_TTL_SECONDS = 60 * 60; // 1 hour
const EMAIL_VERIFY_TOKEN_TTL_SECONDS = 24 * 60 * 60; // 24 hours
const REGISTER_VERIFY_TOKEN_TTL_SECONDS = 24 * 60 * 60; // 24 hours

class AuthService {
  // ── Register ────────────────────────────────────────────────────────────
  async register({ email, phone, password, name }) {
    // Validate at least one identifier
    if (!email && !phone) throw createError('Email or phone is required', 400);

    // Check for existing user
    if (email) {
      const existing = await User.findOne({ where: { email } });
      if (existing) throw createError('Email already registered', 409);
    }
    if (phone) {
      const existing = await User.findOne({ where: { phone } });
      if (existing) throw createError('Phone already registered', 409);
    }

    const hashedPassword = password ? await hashPassword(password) : null;

    const user = await User.create({
      email: email || null,
      phone: phone || null,
      password: hashedPassword,
      name,
      role: 'GUEST',
    });

    const tokens = generateTokens(user);
    await this._storeRefreshToken(user.id, tokens.refreshToken);

    return { user: this._sanitize(user), ...tokens };
  }

  // ── Verified Registration (step 1): request a verification link ──────────
  // The guest submits only their email. We stash the email against a token in
  // Redis and email them a link to /auth/register/complete?token=... . The
  // account is NOT created until they open that link and finish the form, so
  // every email-based account starts life already verified.
  async requestRegistration({ email }) {
    if (!email) throw createError('Email is required', 400);

    const existing = await User.findOne({ where: { email } });
    if (existing) throw createError('Email already registered', 409);

    const token = generateResetToken();
    await redis.set(`register:${token}`, email, 'EX', REGISTER_VERIFY_TOKEN_TTL_SECONDS);

    try {
      const notificationService = require('./notification.service');
      await notificationService.sendRegistrationEmail(email, token);
    } catch {
      console.log(`[Register Verify] Dev fallback — token for ${email}: ${token}`);
    }

    return { message: 'Verification email sent' };
  }

  // ── Verified Registration: check a token is still valid (no consumption) ──
  async verifyRegistrationToken({ token }) {
    if (!token) throw createError('Verification token is required', 400);
    const email = await redis.get(`register:${token}`);
    if (!email) throw createError('Invalid or expired verification link', 400);
    return { email };
  }

  // ── Verified Registration (step 2): complete with account details ────────
  async completeRegistration({ token, name, phone, password }) {
    const email = await redis.get(`register:${token}`);
    if (!email) throw createError('Invalid or expired verification link', 400);

    // Re-check uniqueness in case someone registered the same email/phone
    // between the request and completion steps.
    const existingEmail = await User.findOne({ where: { email } });
    if (existingEmail) {
      await redis.del(`register:${token}`);
      throw createError('Email already registered', 409);
    }
    if (phone) {
      const existingPhone = await User.findOne({ where: { phone } });
      if (existingPhone) throw createError('Phone already registered', 409);
    }

    const user = await User.create({
      email,
      phone: phone || null,
      password: await hashPassword(password),
      name,
      role: 'GUEST',
      emailVerified: true, // email ownership was just proven via the link
    });

    await redis.del(`register:${token}`);

    const tokens = generateTokens(user);
    await this._storeRefreshToken(user.id, tokens.refreshToken);

    return { user: this._sanitize(user), ...tokens };
  }

  // ── Login ───────────────────────────────────────────────────────────────
  async login({ email, phone, password }) {
    const identifier = email || phone;
    if (!identifier) throw createError('Email or phone is required', 400);

    // Check lockout
    await this._checkLockout(identifier);

    const where = email ? { email } : { phone };
    const user = await User.findOne({ where });

    if (!user || !user.password) {
      await this._incrementLoginAttempts(identifier);
      throw createError('Invalid credentials', 401);
    }

    const isValid = await comparePassword(password, user.password);
    if (!isValid) {
      await this._incrementLoginAttempts(identifier);
      throw createError('Invalid credentials', 401);
    }

    if (!user.isActive) throw createError('Account deactivated', 403);

    await this._clearLoginAttempts(identifier);
    await user.update({ lastLoginAt: new Date() });

    const tokens = generateTokens(user);
    await this._storeRefreshToken(user.id, tokens.refreshToken);

    return { user: this._sanitize(user), ...tokens };
  }

  // ── Request OTP ─────────────────────────────────────────────────────────
  async requestOTP({ phone }) {
    const otp = generateOTP();
    await storeOTP(redis, phone, otp);

    // Send SMS — graceful fallback to console in dev
    try {
      const notificationService = require('./notification.service');
      await notificationService.sendSMS(phone, `Your OTP is: ${otp}. Valid for 5 minutes.`);
    } catch {
      console.log(`[OTP] Dev fallback — OTP for ${phone}: ${otp}`);
    }

    return { message: 'OTP sent successfully' };
  }

  // ── Verify OTP ──────────────────────────────────────────────────────────
  async verifyOTP({ phone, otp, name }) {
    const isValid = await verifyOTPValue(redis, phone, otp);
    if (!isValid) throw createError('Invalid or expired OTP', 401);

    await clearOTP(redis, phone);

    // Find or create user by phone
    let [user, created] = await User.findOrCreate({
      where: { phone },
      defaults: { phone, name: name || phone, role: 'GUEST', phoneVerified: true },
    });

    if (!created) {
      await user.update({ phoneVerified: true, lastLoginAt: new Date() });
    }

    if (!user.isActive) throw createError('Account deactivated', 403);

    const tokens = generateTokens(user);
    await this._storeRefreshToken(user.id, tokens.refreshToken);

    return { user: this._sanitize(user), ...tokens, isNewUser: created };
  }

  // ── Refresh Token ───────────────────────────────────────────────────────
  async refreshToken({ refreshToken }) {
    let payload;
    try {
      payload = verifyRefreshToken(refreshToken);
    } catch {
      throw createError('Invalid or expired refresh token', 401);
    }

    // Verify token exists in Redis
    const storedToken = await redis.get(`refresh:${payload.id}`);
    if (!storedToken || storedToken !== refreshToken) {
      throw createError('Refresh token revoked or invalid', 401);
    }

    const user = await User.findByPk(payload.id);
    if (!user || !user.isActive) throw createError('User not found', 401);

    const newTokens = generateTokens(user);
    await this._storeRefreshToken(user.id, newTokens.refreshToken);

    return { user: this._sanitize(user), ...newTokens };
  }

  // ── Logout ──────────────────────────────────────────────────────────────
  async logout(userId) {
    await redis.del(`refresh:${userId}`);
    return { message: 'Logged out successfully' };
  }

  // ── Get current user ────────────────────────────────────────────────────
  async getMe(userId) {
    const user = await User.findByPk(userId, { attributes: { exclude: ['password'] } });
    if (!user) throw createError('User not found', 404);
    return user;
  }

  // ── Change Password ─────────────────────────────────────────────────────
  async changePassword(userId, { currentPassword, newPassword }) {
    const user = await User.findByPk(userId);
    if (!user) throw createError('User not found', 404);
    if (!user.password) throw createError('No password set — use OTP login', 400);

    const isValid = await comparePassword(currentPassword, user.password);
    if (!isValid) throw createError('Current password is incorrect', 401);

    await user.update({ password: await hashPassword(newPassword) });
    return { message: 'Password changed successfully' };
  }

  // ── Request Password Reset ──────────────────────────────────────────────
  async requestPasswordReset({ email }) {
    const user = await User.findOne({ where: { email } });
    // Always return success to prevent email enumeration
    if (!user) return { message: 'If that email exists, a reset link has been sent' };

    const token = generateResetToken();
    await redis.set(`reset:${token}`, user.id, 'EX', RESET_TOKEN_TTL_SECONDS);

    try {
      const notificationService = require('./notification.service');
      await notificationService.sendPasswordResetEmail(user.email, token, user.name);
    } catch {
      console.log(`[Password Reset] Dev fallback — token for ${email}: ${token}`);
    }

    return { message: 'If that email exists, a reset link has been sent' };
  }

  // ── Reset Password ──────────────────────────────────────────────────────
  async resetPassword({ token, newPassword }) {
    const userId = await redis.get(`reset:${token}`);
    if (!userId) throw createError('Invalid or expired reset token', 400);

    const user = await User.findByPk(userId);
    if (!user) throw createError('User not found', 404);

    await user.update({ password: await hashPassword(newPassword) });
    await redis.del(`reset:${token}`);
    // Revoke existing refresh tokens
    await redis.del(`refresh:${userId}`);

    return { message: 'Password reset successfully' };
  }

  // ── Verify Email ────────────────────────────────────────────────────────
  async verifyEmail({ token }) {
    const userId = await redis.get(`email_verify:${token}`);
    if (!userId) throw createError('Invalid or expired verification token', 400);

    const user = await User.findByPk(userId);
    if (!user) throw createError('User not found', 404);

    await user.update({ emailVerified: true });
    await redis.del(`email_verify:${token}`);

    return { message: 'Email verified successfully' };
  }

  // ── Resend Verification ─────────────────────────────────────────────────
  async resendVerification(userId) {
    const user = await User.findByPk(userId);
    if (!user || !user.email) throw createError('No email on account', 400);
    if (user.emailVerified) throw createError('Email already verified', 400);

    const token = generateResetToken();
    await redis.set(`email_verify:${token}`, user.id, 'EX', EMAIL_VERIFY_TOKEN_TTL_SECONDS);

    try {
      const notificationService = require('./notification.service');
      await notificationService.sendVerificationEmail(user.email, token, user.name);
    } catch {
      console.log(`[Email Verify] Dev fallback — token: ${token}`);
    }

    return { message: 'Verification email sent' };
  }

  // ── Private helpers ──────────────────────────────────────────────────────
  async _storeRefreshToken(userId, token) {
    await redis.set(`refresh:${userId}`, token, 'EX', REFRESH_TOKEN_TTL_SECONDS);
  }

  async _checkLockout(identifier) {
    const key = `login_lock:${identifier}`;
    const locked = await redis.get(key);
    if (locked) throw createError('Account temporarily locked — too many failed attempts', 423);
  }

  async _incrementLoginAttempts(identifier) {
    const attemptsKey = `login_attempts:${identifier}`;
    const lockKey = `login_lock:${identifier}`;
    const attempts = await redis.incr(attemptsKey);
    await redis.expire(attemptsKey, LOCKOUT_DURATION_SECONDS);
    if (attempts >= MAX_LOGIN_ATTEMPTS) {
      await redis.set(lockKey, '1', 'EX', LOCKOUT_DURATION_SECONDS);
      await redis.del(attemptsKey);
    }
  }

  async _clearLoginAttempts(identifier) {
    await redis.del(`login_attempts:${identifier}`);
    await redis.del(`login_lock:${identifier}`);
  }

  _sanitize(user) {
    const { password, ...safe } = user.toJSON ? user.toJSON() : user;
    return safe;
  }
}

module.exports = new AuthService();
