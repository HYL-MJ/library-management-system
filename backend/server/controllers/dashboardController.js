// backend/controllers/dashboardController.js
const dashboardService = require("../services/dashboardService");
const { sendSuccess } = require("../lib/response");

class DashboardController {
  /**
   * GET /dashboard
   * 获取个人首页仪表盘摘要信息
   */
  async getDashboard(req, res, next) {
    try {
      const userId = req.currentUser.id;
      const result = await dashboardService.getDashboard(userId);
      sendSuccess(res, result);
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new DashboardController();