const express = require("express");
const { requireAuth } = require("../middleware/auth");
const { requireAdmin } = require("../middleware/role");

const router = express.Router();

router.use(requireAuth, requireAdmin);

module.exports = router;
