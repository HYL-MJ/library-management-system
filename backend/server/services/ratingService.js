const prisma = require("../db/prisma");

class RatingService {
  // Check whether the user has borrowed a specific book.
  async hasUserBorrowedBook(userId, bookId) {
    const loan = await prisma.loan.findFirst({
      where: {
        userId: userId,
        bookId: bookId,
        status: { in: ['Borrowing', 'Returned', 'Overdue'] } // Any borrow history, including current borrow.
      }
    });
    return !!loan;
  }

  // Create or update a rating.
  async upsertRating(userId, bookId, stars) {
    // Check whether a rating record already exists.
    const existingRating = await prisma.rating.findUnique({
      where: {
        bookId_userId: {
          bookId: bookId,
          userId: userId
        }
      }
    });

    let rating;
    let isUpdate = false;

    if (existingRating) {
      // Update existing rating.
      rating = await prisma.rating.update({
        where: { id: existingRating.id },
        data: { stars: stars }
      });
      isUpdate = true;
    } else {
      // Create new rating.
      rating = await prisma.rating.create({
        data: {
          bookId: bookId,
          userId: userId,
          stars: stars
        }
      });
      isUpdate = false;
    }

    return { rating, isUpdate };
  }

  // Get rating statistics for a specific book.
  async getBookRatingStats(bookId) {
    const ratings = await prisma.rating.findMany({
      where: { bookId: bookId },
      select: { stars: true }
    });

    if (ratings.length === 0) {
      return {
        averageRating: 0,
        totalRatings: 0,
        distribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }
      };
    }

    const total = ratings.length;
    const sum = ratings.reduce((acc, r) => acc + r.stars, 0);
    const average = sum / total;

    const distribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    ratings.forEach(r => {
      distribution[r.stars]++;
    });

    return {
      averageRating: parseFloat(average.toFixed(1)),
      totalRatings: total,
      distribution
    };
  }


  // Get all ratings for a specific book.
  async getBookRatings(bookId, page = 1, size = 10) {
    const skip = (page - 1) * size;

    const [total, ratings] = await Promise.all([
      prisma.rating.count({ where: { bookId: bookId } }),
      prisma.rating.findMany({
        where: { bookId: bookId },
        skip: skip,
        take: size,
        include: {
          user: {
            select: {
              id: true,
              name: true
            }
          }
        },
        orderBy: { createdAt: 'desc' }
      })
    ]);

    const list = ratings.map(rating => ({
      id: rating.id,
      userId: rating.userId,
      userName: rating.user.name,
      stars: rating.stars,
      createdAt: rating.createdAt
    }));

    return { total, page, size, list };
  }

  // Get all rating records of the current user.
  async getUserRatings(userId, page = 1, size = 10) {
    const skip = (page - 1) * size;

    const [total, ratings] = await Promise.all([
      prisma.rating.count({ where: { userId: userId } }),
      prisma.rating.findMany({
        where: { userId: userId },
        skip: skip,
        take: size,
        include: {
          book: {
            select: {
              id: true,
              title: true,
              author: true,
              cover: true
            }
          }
        },
        orderBy: { createdAt: 'desc' }
      })
    ]);

    const list = ratings.map(rating => ({
      id: rating.id,
      bookId: rating.book.id,
      bookTitle: rating.book.title,
      bookAuthor: rating.book.author,
      stars: rating.stars,
      createdAt: rating.createdAt
    }));

    return { total, page, size, list };
  }

  // Check whether the book exists.
  async checkBookExists(bookId) {
    const book = await prisma.book.findUnique({
      where: { id: bookId },
      select: { id: true, title: true }
    });
    return book;
  }
}

module.exports = new RatingService();
