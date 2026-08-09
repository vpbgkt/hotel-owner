import executeApi from '../executeApi';

// ── Auth ─────────────────────────────────────────────────────────────────────
export const authApi = {
  register: (data) => executeApi.post('/auth/register', data),
  login: (data) => executeApi.post('/auth/login', data),
  requestOTP: (phone) => executeApi.post('/auth/otp/request', { phone }),
  verifyOTP: (data) => executeApi.post('/auth/otp/verify', data),
  refresh: (refreshToken) => executeApi.post('/auth/refresh', { refreshToken }),
  logout: () => executeApi.post('/auth/logout'),
  getMe: () => executeApi.get('/auth/me'),
  changePassword: (data) => executeApi.put('/auth/password/change', data),
  requestPasswordReset: (email) => executeApi.post('/auth/password/request-reset', { email }),
  resetPassword: (data) => executeApi.post('/auth/password/reset', data),
  verifyEmail: (token) => executeApi.post('/auth/email/verify', { token }),
  resendVerification: () => executeApi.post('/auth/email/resend-verification'),
};

// ── Hotels ────────────────────────────────────────────────────────────────────
export const hotelsApi = {
  getById: (id) => executeApi.get(`/hotels/id/${id}`),
  getFeatured: (limit = 6) => executeApi.get('/hotels/featured', { params: { limit } }),
};

// ── Rooms ─────────────────────────────────────────────────────────────────────
export const roomsApi = {
  getTypes: (hotelId, params) => executeApi.get(`/rooms/hotel/${hotelId}`, { params }),
  getTypeById: (id) => executeApi.get(`/rooms/types/${id}`),
  checkDailyAvailability: (params) => executeApi.get('/rooms/availability/daily', { params }),
  checkHourlyAvailability: (params) => executeApi.get('/rooms/availability/hourly', { params }),
  getInventoryCalendar: (roomTypeId, params) => executeApi.get(`/rooms/inventory/${roomTypeId}/calendar`, { params }),
};

// ── Bookings ──────────────────────────────────────────────────────────────────
export const bookingsApi = {
  createDaily: (data) => executeApi.post('/bookings/daily', data),
  createHourly: (data) => executeApi.post('/bookings/hourly', data),
  getById: (id) => executeApi.get(`/bookings/${id}`),
  getByNumber: (number) => executeApi.get(`/bookings/number/${number}`),
  list: (params) => executeApi.get('/bookings', { params }),
  myBookings: (params) => executeApi.get('/bookings/my', { params }),
  cancel: (id, data) => executeApi.post(`/bookings/${id}/cancel`, data),
  updateStatus: (id, data) => executeApi.put(`/bookings/${id}/status`, data),
  modify: (id, data) => executeApi.put(`/bookings/${id}/modify`, data),
};

// ── Payments ──────────────────────────────────────────────────────────────────
export const paymentsApi = {
  initiate: (data) => executeApi.post('/payments/initiate', data),
  confirm: (paymentId, data) => executeApi.post(`/payments/${paymentId}/confirm`, data),
  refund: (paymentId, amount) => executeApi.post(`/payments/${paymentId}/refund`, { amount }),
};

// ── Reviews ───────────────────────────────────────────────────────────────────
export const reviewsApi = {
  getHotelReviews: (hotelId, params) => executeApi.get(`/reviews/hotel/${hotelId}`, { params }),
  getStats: (hotelId) => executeApi.get(`/reviews/hotel/${hotelId}/stats`),
  create: (data) => executeApi.post('/reviews', data),
  canReview: (bookingId) => executeApi.get(`/reviews/can-review/${bookingId}`),
  reply: (id, reply) => executeApi.post(`/reviews/${id}/reply`, { reply }),
  approve: (id) => executeApi.put(`/reviews/${id}/approve`),
  reject: (id) => executeApi.put(`/reviews/${id}/reject`),
  delete: (id) => executeApi.delete(`/reviews/${id}`),
};

// ── Admin ─────────────────────────────────────────────────────────────────────
export const adminApi = {
  getDashboard: () => executeApi.get('/admin/dashboard'),
  updateHotel: (data) => executeApi.put('/admin/hotel', data),
  // Bookings
  listBookings: (params) => executeApi.get('/admin/bookings', { params }),
  updateBookingStatus: (id, data) => executeApi.put(`/admin/bookings/${id}/status`, data),
  createOfflineBooking: (data) => executeApi.post('/admin/bookings/offline', data),
  // Guests
  listGuests: (params) => executeApi.get('/admin/guests', { params }),
  getGuestDetail: (id) => executeApi.get(`/admin/guests/${id}`),
  // Room Types
  listRoomTypes: (params) => executeApi.get('/admin/room-types', { params }),
  createRoomType: (data) => executeApi.post('/admin/room-types', data),
  updateRoomType: (id, data) => executeApi.put(`/admin/room-types/${id}`, data),
  deleteRoomType: (id) => executeApi.delete(`/admin/room-types/${id}`),
  // Inventory
  updateInventory: (data) => executeApi.put('/admin/inventory', data),
  bulkUpdateInventory: (data) => executeApi.put('/admin/inventory/bulk', data),
  // SEO
  upsertSeo: (data) => executeApi.put('/admin/seo', data),
  // Staff
  getStaff: () => executeApi.get('/admin/staff'),
  createStaff: (data) => executeApi.post('/admin/staff', data),
  updateStaff: (userId, data) => executeApi.put(`/admin/staff/${userId}`, data),
  deleteStaff: (userId) => executeApi.delete(`/admin/staff/${userId}`),
};

// ── Analytics ─────────────────────────────────────────────────────────────────
export const analyticsApi = {
  getBookingTrends: (params) => executeApi.get('/analytics/trends', { params }),
  getRevenueReport: (params) => executeApi.get('/analytics/revenue', { params }),
  getOccupancy: (params) => executeApi.get('/analytics/occupancy', { params }),
  getBookingsBySource: () => executeApi.get('/analytics/sources'),
};

// ── Blog ──────────────────────────────────────────────────────────────────────
export const blogApi = {
  list: (hotelId, params) => executeApi.get(`/blog/hotel/${hotelId}`, { params }),
  getBySlug: (hotelId, slug) => executeApi.get(`/blog/hotel/${hotelId}/${slug}`),
  listAdmin: (params) => executeApi.get('/blog/manage', { params }),
  create: (data) => executeApi.post('/blog', data),
  update: (id, data) => executeApi.put(`/blog/${id}`, data),
  publish: (id) => executeApi.put(`/blog/${id}/publish`),
  archive: (id) => executeApi.put(`/blog/${id}/archive`),
  delete: (id) => executeApi.delete(`/blog/${id}`),
};

// ── User ──────────────────────────────────────────────────────────────────────
export const userApi = {
  getProfile: () => executeApi.get('/user/profile'),
  updateProfile: (data) => executeApi.put('/user/profile', data),
  getMyBookings: (params) => executeApi.get('/user/bookings', { params }),
  getMyReviews: (params) => executeApi.get('/user/reviews', { params }),
  deactivate: () => executeApi.delete('/user/account'),
};

// ── Pricing ───────────────────────────────────────────────────────────────────
export const pricingApi = {
  getSuggestions: (params) => executeApi.get('/pricing/suggestions', { params }),
};

// ── API Keys ──────────────────────────────────────────────────────────────────
export const apiKeysApi = {
  generate: (data) => executeApi.post('/api-keys', data),
  list: () => executeApi.get('/api-keys'),
  revoke: (id) => executeApi.delete(`/api-keys/${id}`),
};

// ── Upload ────────────────────────────────────────────────────────────────────
export const uploadApi = {
  single: (file) => {
    const form = new FormData();
    form.append('file', file);
    return executeApi.post('/uploads/single', form, { headers: { 'Content-Type': 'multipart/form-data' } });
  },
  multiple: (files) => {
    const form = new FormData();
    files.forEach((f) => form.append('files', f));
    return executeApi.post('/uploads/multiple', form, { headers: { 'Content-Type': 'multipart/form-data' } });
  },
  // Alias used in admin pages
  uploadMultiple: (files) => {
    const form = new FormData();
    files.forEach((f) => form.append('files', f));
    return executeApi.post('/uploads/multiple', form, { headers: { 'Content-Type': 'multipart/form-data' } });
  },
  uploadSingle: (file) => {
    const form = new FormData();
    form.append('file', file);
    return executeApi.post('/uploads/single', form, { headers: { 'Content-Type': 'multipart/form-data' } });
  },
  delete: (filename) => executeApi.delete(`/uploads/${filename}`),
};

// ── Export ────────────────────────────────────────────────────────────────────
export const exportApi = {
  bookings: (params) => executeApi.get('/export/bookings', { params, responseType: 'blob' }),
  revenue: (params) => executeApi.get('/export/revenue', { params, responseType: 'blob' }),
};
