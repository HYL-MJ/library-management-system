// backend/services/acquisitionService.js
const prisma = require("../db/prisma");
const { AppError } = require("../lib/errors");

class AcquisitionService {
  // ========== 读者端方法（原有） ==========
  async createRequest(userId, data) {
    const { title, author, isbn, reason } = data;
    
    if (!title || typeof title !== "string" || title.trim().length === 0) {
      throw new AppError(400, "书名不能为空");
    }
    
    const request = await prisma.acquisitionRequest.create({
      data: {
        userId: userId,
        title: title.trim(),
        author: author || null,
        isbn: isbn || null,
        reason: reason || null,
        status: "PENDING"
      }
    });
    
    return {
      id: request.id,
      title: request.title,
      author: request.author,
      status: request.status,
      createdAt: request.createdAt
    };
  }
  
  async getUserRequests(userId, status, page = 1, size = 10) {
    const skip = (page - 1) * size;
    
    let where = { userId: userId };
    if (status && ["PENDING", "ACCEPTED", "REJECTED"].includes(status)) {
      where.status = status;
    }
    
    const [total, requests] = await Promise.all([
      prisma.acquisitionRequest.count({ where }),
      prisma.acquisitionRequest.findMany({
        where,
        skip,
        take: size,
        orderBy: { createdAt: "desc" }
      })
    ]);
    
    const list = requests.map(req => ({
      id: req.id,
      title: req.title,
      author: req.author,
      isbn: req.isbn,
      reason: req.reason,
      status: req.status,
      createdAt: req.createdAt
    }));
    
    return { total, page, size, list };
  }
  
  async getRequestById(requestId) {
    const request = await prisma.acquisitionRequest.findUnique({
      where: { id: requestId }
    });
    return request;
  }

  // ========== 管理员端方法（新增） ==========

  /**
   * 管理员获取所有荐购记录（支持分页、状态筛选）
   * @param {number} page - 页码，从1开始
   * @param {number} limit - 每页条数
   * @param {string} status - 筛选状态: PENDING, ACCEPTED, REJECTED, 不传或'all'表示全部
   * @returns {Promise<{list: Array, total: number, page: number, limit: number}>}
   */
  async getAllRequests(page = 1, limit = 20, status = null) {
    const skip = (page - 1) * limit;
    const where = {};
    if (status && status !== 'all' && ['PENDING', 'ACCEPTED', 'REJECTED'].includes(status)) {
      where.status = status;
    }

    const [total, requests] = await Promise.all([
      prisma.acquisitionRequest.count({ where }),
      prisma.acquisitionRequest.findMany({
        where,
        include: {
          user: {   // 关联用户表，获取荐购人信息
            select: { id: true, username: true, email: true }
          }
        },
        skip,
        take: limit,
        orderBy: { createdAt: "desc" }
      })
    ]);

    const list = requests.map(req => ({
      id: req.id,
      title: req.title,
      author: req.author,
      isbn: req.isbn,
      reason: req.reason,
      status: req.status,
      adminNote: req.adminNote || null,
      processedAt: req.processedAt || null,
      processedBy: req.processedBy || null,
      createdAt: req.createdAt,
      user: req.user
    }));

    return { total, page, limit, list };
  }

  /**
   * 管理员审核荐购（通过/拒绝）
   * @param {number} requestId - 荐购记录ID
   * @param {string} status - 新状态: ACCEPTED 或 REJECTED
   * @param {string} adminNote - 管理员备注（可选）
   * @param {number} adminId - 当前管理员用户ID
   * @returns {Promise<Object>} 更新后的记录
   */
  async reviewRequest(requestId, status, adminNote, adminId) {
    // 校验状态合法性
    if (!['ACCEPTED', 'REJECTED'].includes(status)) {
      throw new AppError(400, "无效的审核状态，只能为 ACCEPTED 或 REJECTED");
    }

    // 查找荐购记录
    const existing = await prisma.acquisitionRequest.findUnique({
      where: { id: requestId }
    });
    if (!existing) {
      throw new AppError(404, "荐购记录不存在");
    }
    if (existing.status !== 'PENDING') {
      throw new AppError(409, "该荐购记录已被处理，无法重复审核");
    }

    // 更新记录（注意：如果数据库模型没有 adminNote 等字段，需先修改 Prisma schema）
    const updated = await prisma.acquisitionRequest.update({
      where: { id: requestId },
      data: {
        status: status,
        adminNote: adminNote || null,
        processedAt: new Date(),
        processedBy: adminId
      },
      include: {
        user: { select: { id: true, username: true, email: true } }
      }
    });

    // 可选：触发通知（邮件/站内信）等后续操作

    return {
      id: updated.id,
      title: updated.title,
      status: updated.status,
      adminNote: updated.adminNote,
      processedAt: updated.processedAt,
      user: updated.user
    };
  }
}

module.exports = new AcquisitionService();
