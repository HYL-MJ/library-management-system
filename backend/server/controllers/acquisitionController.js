// backend/controllers/acquisitionController.js
const acquisitionService = require("../services/acquisitionService");
const { AppError } = require("../lib/errors");
const { sendSuccess } = require("../lib/response");

class AcquisitionController {
  /**
   * POST /acquisition-requests
   * 提交荐购申请
   */
  async createRequest(req, res, next) {
    try {
      const userId = req.currentUser.id;
      const { title, author, isbn, reason } = req.body;
      
      const result = await acquisitionService.createRequest(userId, {
        title, author, isbn, reason
      });
      
      sendSuccess(res, result, "荐购申请已提交");
    } catch (error) {
      next(error);
    }
  }
  
  /**
   * GET /acquisition-requests
   * 查看我的荐购记录
   */
  async getUserRequests(req, res, next) {
    try {
      const userId = req.currentUser.id;
      const { status } = req.query;
      const page = parseInt(req.query.page) || 1;
      const size = parseInt(req.query.size) || 10;
      
      const result = await acquisitionService.getUserRequests(userId, status, page, size);
      sendSuccess(res, result);
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new AcquisitionController();