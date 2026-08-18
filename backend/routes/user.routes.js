'use strict';

const { Router } = require('express');
const ctrl = require('../controllers/user.controller');
const { authenticate } = require('../middlewares/auth.middleware');
const validate = require('../middlewares/validate.middleware');
const { updateProfile: updateProfileValidator } = require('../validators/user.validator');

const router = Router();

router.use(authenticate);

router.get('/profile', ctrl.getProfile);
router.put('/profile', updateProfileValidator, validate, ctrl.updateProfile);
router.get('/bookings', ctrl.getMyBookings);
router.get('/reviews', ctrl.getMyReviews);

module.exports = router;
