// backend/routes/dashboardRoutes.js
const express = require('express');
const router = express.Router();
const dashboardController = require('../controllers/dashboardController');
const { requireAuth } = require('../middleware/auth');

// 需要登录的接口
router.get('/dashboard', requireAuth, dashboardController.getDashboard);

module.exports = router;