const express = require("express");
const { requireAuth } = require("../middleware/auth");
const { requireAdmin } = require("../middleware/role");
const adminConfigController = require("../controllers/adminConfigController");

const router = express.Router();

router.use(requireAuth, requireAdmin);

// R2 新增接口（实现位于 adminConfigController，与 /api/admin/config 共用服务层）
router.get("/dashboard/menu", adminConfigController.getDashboardMenu);
router.get("/config", adminConfigController.getSystemConfig);
router.put("/config/borrow-rules", adminConfigController.updateBorrowRules);
router.put("/config/fine-rate", adminConfigController.updateFineRate);

module.exports = router;