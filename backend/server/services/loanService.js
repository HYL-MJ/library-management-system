const prisma = require("../db/prisma");
const { AppError } = require("../lib/errors");
const { getLoanPolicy } = require("../config/loanPolicy");
const { formatDateTime, addDays, overdueWholeDays } = require("../utils/date");

async function computeOverdueFineAmount(loan, returnDate) {
  const { fineRate } = await getLoanPolicy();
  const days = overdueWholeDays(loan.dueDate, returnDate);
  if (days <= 0) return 0;
  return Math.round(days * fineRate * 100) / 100;
}

async function syncOverdueLoansForUser(userId) {
  const now = new Date();

  await prisma.loan.updateMany({
    where: {
      userId,
      status: "Borrowing",
      returnDate: null,
      dueDate: { lt: now },
    },
    data: {
      status: "Overdue",
    },
  });
}
/**
 * Return current loans.
 * @param {} loan 
 * @returns 
 */
function toCurrentLoan(loan) {
  return {
    id: loan.id,
    bookId: loan.bookId,
    bookTitle: loan.book.title,
    bookAuthor: loan.book.author,
    checkoutDate: formatDateTime(loan.checkoutDate),
    dueDate: formatDateTime(loan.dueDate),
    renewalCount: loan.renewalCount || 0,
    status: loan.status,
  };
}
/**
 * Return loan history.
 * @param {} loan 
 * @returns 
 */
function toHistoryLoan(loan) {
  return {
    id: loan.id,
    bookId: loan.book?.id || loan.bookId || null,
    bookTitle: loan.book?.title || "This book is no longer available",
    bookAuthor: loan.book?.author || "-",
    checkoutDate: formatDateTime(loan.checkoutDate),
    dueDate: formatDateTime(loan.dueDate),
    returnDate: loan.returnDate ? formatDateTime(loan.returnDate) : null,
    status: loan.status,
    fineAmount: Number(loan.fineAmount),
    finePaid: loan.finePaid,
    fineForgiven: loan.fineForgiven,
  };
}

async function ensureNoUnpaidFines(
  userId,
  message = "This book is currently unavailable, or you have unpaid fines",
) {
  const unpaidFineLoan = await prisma.loan.findFirst({
    where: {
      userId,
      fineAmount: { gt: 0 },
      finePaid: false,
      fineForgiven: false,
    },
  });

  if (unpaidFineLoan) {
    throw new AppError(400, message);
  }
}

async function getCurrentLoans(userId) {
  await syncOverdueLoansForUser(userId);

  const loans = await prisma.loan.findMany({
    where: {
      userId,
      status: {
        in: ["Borrowing", "Overdue"],
      },
    },
    include: {
      book: true,
    },
    orderBy: {
      dueDate: "asc",
    },
  });

  return {
    list: loans.map(toCurrentLoan),
  };
}

async function getHistoryLoans(userId, page = 1, size = 10) {
  await syncOverdueLoansForUser(userId);

  const skip = (page - 1) * size;
  
  const [loans, totalCount] = await Promise.all([
    prisma.loan.findMany({
      where: {
        userId,
      },
      include: {
        book: true,
      },
      orderBy: {
        checkoutDate: "desc",
      },
      skip,
      take: size,
    }),
    prisma.loan.count({
      where: {
        userId,
      },
    })
  ]);

  const totalPages = Math.ceil(totalCount / size);
  
  return {
    total: totalCount,
    page,
    size,
    totalPages,
    list: loans.map(toHistoryLoan),
  };
}

async function ensureBorrowAllowed(userId, bookId) {
  const book = await prisma.book.findUnique({
    where: { id: bookId },
  });

  if (!book) {
    throw new AppError(404, "Book not found");
  }

  if (!book.available || book.availableCopies <= 0) {
    throw new AppError(400, "This book is currently unavailable, or you have unpaid fines");
  }

  const existingActiveLoan = await prisma.loan.findFirst({
    where: {
      userId,
      bookId,
      status: { in: ['Borrowing', 'Overdue'] }
    }
  });

  if (existingActiveLoan) {
    throw new AppError(400, "You already have an active loan for this book");
  }

  await ensureNoUnpaidFines(userId);

  const { maxBooks } = await getLoanPolicy();
  const activeCount = await prisma.loan.count({
    where: {
      userId,
      status: { in: ["Borrowing", "Overdue"] },
    },
  });

  if (activeCount >= maxBooks) {
    throw new AppError(
      400,
      `You have reached the borrowing limit (${maxBooks} books). Please return some books before borrowing more.`,
    );
  }

  return book;
}

async function createLoan(userId, payload) {
  const { bookId } = payload || {};

  if (!bookId) {
    throw new AppError(400, "Invalid parameters");
  }

  const book = await ensureBorrowAllowed(userId, bookId);
  const checkoutDate = new Date();
  const { maxDays } = await getLoanPolicy();
  const dueDate = addDays(checkoutDate, maxDays);

  const loan = await prisma.$transaction(async (tx) => {
    const createdLoan = await tx.loan.create({
      data: {
        userId,
        bookId: book.id,
        checkoutDate,
        dueDate,
        renewalCount: 0,
        status: "Borrowing",
      },
      include: {
        book: true,
      },
    });

    const nextAvailableCopies = book.availableCopies - 1;

    await tx.book.update({
      where: { id: book.id },
      data: {
        availableCopies: nextAvailableCopies,
        available: nextAvailableCopies > 0,
      },
    });

    return createdLoan;
  });

  return {
    loanId: loan.id,
    bookId: loan.bookId,
    bookTitle: loan.book.title,
    checkoutDate: formatDateTime(loan.checkoutDate),
    dueDate: formatDateTime(loan.dueDate),
  };
}

async function renewLoan(userId, loanId) {
  await syncOverdueLoansForUser(userId);

  const loan = await prisma.loan.findUnique({
    where: { id: loanId },
    include: {
      book: true,
    },
  });

  if (!loan) {
    throw new AppError(404, "Loan record not found");
  }

  if (loan.userId !== userId) {
    throw new AppError(404, "Loan record not found or does not belong to the current user");
  }

  if (!["Borrowing", "Overdue"].includes(loan.status)) {
    throw new AppError(400, "Only borrowed books can be renewed");
  }

  if (loan.renewalCount >= 1) {
    throw new AppError(400, "Renewal limit reached");
  }

  const now = new Date();
  if (loan.status === "Overdue" || loan.dueDate < now) {
    throw new AppError(400, "Overdue books cannot be renewed");
  }

  if (loan.status !== "Borrowing") {
    throw new AppError(400, "Only borrowed books can be renewed");
  }

  await ensureNoUnpaidFines(userId, "You have unpaid fines and cannot renew");

  const otherHold = await prisma.hold.findFirst({
    where: {
      bookId: loan.bookId,
      userId: { not: userId },
      status: { in: ["WAITING", "READY"] },
    },
  });

  if (otherHold) {
    throw new AppError(400, "This book has been reserved by another reader and cannot be renewed");
  }

  const { maxDays } = await getLoanPolicy();
  const newDueDate = addDays(loan.dueDate, maxDays);
  const updatedLoan = await prisma.loan.update({
    where: { id: loanId },
    data: {
      dueDate: newDueDate,
      renewalCount: loan.renewalCount + 1,
    },
  });

  return {
    id: updatedLoan.id,
    dueDate: formatDateTime(updatedLoan.dueDate),
    renewalCount: updatedLoan.renewalCount,
  };
}

async function returnLoan(userId, loanId) {
  const loan = await prisma.loan.findUnique({
    where: { id: loanId },
    include: {
      book: true,
    },
  });

  if (!loan || loan.userId !== userId) {
    throw new AppError(404, "Loan record not found or does not belong to the current user");
  }

  if (loan.status === "Returned" || loan.returnDate) {
    throw new AppError(400, "This loan record has already been returned");
  }

  if (!loan.book) {
    throw new AppError(404, "Book not found");
  }

  const now = new Date();
  const fineAmount = await computeOverdueFineAmount(loan, now);

  const updatedLoan = await prisma.$transaction(async (tx) => {
    const returnedLoan = await tx.loan.update({
      where: { id: loanId },
      data: {
        returnDate: now,
        status: "Returned",
        fineAmount,
        finePaid: fineAmount === 0,
      },
      include: {
        book: true,
      },
    });

    const nextAvailableCopies = returnedLoan.book.availableCopies + 1;

    await tx.book.update({
      where: { id: returnedLoan.bookId },
      data: {
        availableCopies: nextAvailableCopies,
        available: true,
      },
    });

    return returnedLoan;
  });

  return {
    id: updatedLoan.id,
    bookId: updatedLoan.bookId,
    bookTitle: updatedLoan.book.title,
    returnDate: formatDateTime(updatedLoan.returnDate),
    status: updatedLoan.status,
    fineAmount: Number(updatedLoan.fineAmount),
  };
}

async function payFine(userId, loanId, payload) {
  const amountInput = payload?.amount;

  return prisma.$transaction(async (tx) => {
    const loan = await tx.loan.findUnique({
      where: { id: loanId },
    });

    if (!loan || loan.userId !== userId) {
      throw new AppError(404, "Loan record not found or does not belong to the current user");
    }

    const fineAmount = Number(loan.fineAmount);
    if (fineAmount <= 0 || loan.finePaid || loan.fineForgiven) {
      throw new AppError(400, "This loan has no payable fine, or the payment amount is insufficient");
    }

    if (amountInput !== undefined) {
      const amount = Number(amountInput);
      if (!Number.isFinite(amount) || amount !== fineAmount) {
        throw new AppError(400, "This loan has no payable fine, or the payment amount is insufficient");
      }
    }

    const updatedLoan = await tx.loan.update({
      where: { id: loanId },
      data: {
        finePaid: true,
      },
    });

    await tx.auditLog.create({
      data: {
        userId,
        action: "PAY_FINE",
        entity: "Loan",
        entityId: loanId,
        detail: JSON.stringify({
          amount: fineAmount,
          method: "SIMULATED",
        }),
      },
    });

    return {
      loanId: updatedLoan.id,
      fineAmount: Number(updatedLoan.fineAmount),
      finePaid: updatedLoan.finePaid,
    };
  });
}

module.exports = {
  getCurrentLoans,
  createLoan,
  getHistoryLoans,
  renewLoan,
  returnLoan,
  payFine,
};
