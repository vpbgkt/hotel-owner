'use strict';

const { Router } = require('express');
const ctrl = require('../controllers/hotel.controller');

const router = Router();

router.get('/featured', ctrl.getFeatured);
router.get('/id/:id', ctrl.getById);

module.exports = router;
