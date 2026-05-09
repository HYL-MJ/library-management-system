// backend/services/acquisitionService.js
const prisma = require("../db/prisma");
const { AppError } = require("../lib/errors");

class AcquisitionService {
  /**
   * 提交荐购申请
   */
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
  
  /**
   * 获取当前用户的荐购记录
   */
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
  
  /**
   * 获取单个荐购记录（用于验证归属）
   */
  async getRequestById(requestId) {
    const request = await prisma.acquisitionRequest.findUnique({
      where: { id: requestId }
    });
    return request;
  }
}

module.exports = new AcquisitionService();