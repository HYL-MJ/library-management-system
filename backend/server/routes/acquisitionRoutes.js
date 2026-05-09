// backend/routes/acquisitionRoutes.js
const express = require('express');
const router = express.Router();
const acquisitionController = require('../controllers/acquisitionController');
const { requireAuth } = require('../middleware/auth');

// 需要登录的接口
router.post('/acquisition-requests', requireAuth, acquisitionController.createRequest);
router.get('/acquisition-requests', requireAuth, acquisitionController.getUserRequests);

module.exports = router;