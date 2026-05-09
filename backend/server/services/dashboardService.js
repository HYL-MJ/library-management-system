// backend/services/dashboardService.js
const prisma = require("../db/prisma");

class DashboardService {
  /**
   * 获取用户仪表盘摘要信息
   */
  async getDashboard(userId) {
    // 获取当前借阅数量（未归还的）
    const currentLoans = await prisma.loan.findMany({
      where: {
        userId: userId,
        returnDate: null,
        status: "Borrowing"
      },
      include: {
        book: {
          select: {
            title: true
          }
        }
      }
    });
    
    const currentLoansCount = currentLoans.length;
    
    // 计算即将到期数量（未来7天内到期）
    const today = new Date();
    const sevenDaysLater = new Date();
    sevenDaysLater.setDate(today.getDate() + 7);
    
    const upcomingDueLoans = currentLoans.filter(loan => {
      const dueDate = new Date(loan.dueDate);
      return dueDate <= sevenDaysLater && dueDate >= today;
    });
    const upcomingDueCount = upcomingDueLoans.length;
    
    // 计算已逾期数量
    const overdueLoans = currentLoans.filter(loan => {
      const dueDate = new Date(loan.dueDate);
      return dueDate < today;
    });
    const overdueCount = overdueLoans.length;
    
    // 获取当前预约数量（WAITING 和 READY 状态）
    const holdsCount = await prisma.hold.count({
      where: {
        userId: userId,
        status: { in: ["WAITING", "READY"] }
      }
    });
    
    // 获取心愿单数量
    const wishlistCount = await prisma.wishlist.count({
      where: { userId: userId }
    });
    
    // 获取未缴罚款总额
    const unpaidFines = await prisma.loan.aggregate({
      where: {
        userId: userId,
        finePaid: false,
        fineForgiven: false,
        fineAmount: { gt: 0 }
      },
      _sum: {
        fineAmount: true
      }
    });
    const unpaidFinesAmount = unpaidFines._sum.fineAmount || 0;
    
    // 准备当前借阅列表（用于展示）
    const currentLoansList = currentLoans.slice(0, 5).map(loan => ({
      bookTitle: loan.book.title,
      dueDate: loan.dueDate
    }));
    
    return {
      currentLoansCount,
      upcomingDueCount,
      overdueCount,
      holdsCount,
      wishlistCount,
      unpaidFinesAmount: parseFloat(unpaidFinesAmount),
      currentLoans: currentLoansList
    };
  }
}

module.exports = new DashboardService();