const prisma = require("../db/prisma");
const { AppError } = require("../lib/errors");

const RANKING_LIMIT = 10;
const VALID_RANGES = new Set(["month", "3months", "year"]);

function normalizeRange(range) {
  if (!range) {
    return "month";
  }

  if (!VALID_RANGES.has(range)) {
    throw new AppError(400, "Invalid parameters");
  }

  return range;
}

function getStartDate(range) {
  const now = new Date();

  if (range === "month") {
    return new Date(now.getFullYear(), now.getMonth(), 1);
  }

  if (range === "3months") {
    const date = new Date(now);
    date.setMonth(date.getMonth() - 3);
    return date;
  }

  const date = new Date(now);
  date.setFullYear(date.getFullYear() - 1);
  return date;
}

function toRankingItem(row, index) {
  return {
    rank: index + 1,
    bookId: row.bookId,
    bookTitle: row.bookTitle,
    bookAuthor: row.bookAuthor,
    cover: row.cover,
    loanCount: Number(row.loanCount),
  };
}

async function getRanking(query) {
  const range = normalizeRange(query?.range);
  const startDate = getStartDate(range);
  const rows = await prisma.$queryRaw`
    SELECT
      l.bookId AS bookId,
      b.title AS bookTitle,
      b.author AS bookAuthor,
      b.cover AS cover,
      COUNT(l.id) AS loanCount
    FROM "Loan" l
    INNER JOIN "Book" b ON b.id = l.bookId
    WHERE l.checkoutDate >= ${startDate}
    GROUP BY l.bookId, b.title, b.author, b.cover
    ORDER BY loanCount DESC, b.title ASC, l.bookId ASC
    LIMIT ${RANKING_LIMIT}
  `;

  return {
    list: rows.map(toRankingItem),
  };
}

module.exports = {
  getRanking,
};
