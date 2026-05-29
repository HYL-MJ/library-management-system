// backend/services/acquisitionService.js
const prisma = require("../db/prisma");
const { AppError } = require("../lib/errors");

class AcquisitionService {
  // ========== 读者端方法 ==========
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

  // ========== 管理员端方法 ==========
  /**
   * 管理员获取所有荐购记录（支持分页、状态筛选）
   * @param {number} page - 页码，从1开始
   * @param {number} limit - 每页条数
   * @param {string} status - 筛选状态: 'PENDING', 'ACCEPTED', 'REJECTED', 'all' 或 null 表示全部
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
          user: {
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
   * 注意：请确保 Prisma 模型中存在 adminNote, processedAt, processedBy 字段
   */
  async reviewRequest(requestId, status, adminNote, adminId) {
    if (!['ACCEPTED', 'REJECTED'].includes(status)) {
      throw new AppError(400, "无效的审核状态，只能为 ACCEPTED 或 REJECTED");
    }

    const existing = await prisma.acquisitionRequest.findUnique({
      where: { id: requestId }
    });
    if (!existing) {
      throw new AppError(404, "荐购记录不存在");
    }
    if (existing.status !== 'PENDING') {
      throw new AppError(409, "该荐购记录已被处理，无法重复审核");
    }

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
