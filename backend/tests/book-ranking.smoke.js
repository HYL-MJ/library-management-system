const assert = require("node:assert/strict");

const app = require("../server/app");
const prisma = require("../server/db/prisma");

const DAY_MS = 24 * 60 * 60 * 1000;
const uniqueSuffix = Date.now();
const createdBookIds = [];
const createdLoanIds = [];
const createdUserIds = [];

let baseUrl;
let server;

async function request(path) {
  const response = await fetch(`${baseUrl}${path}`);
  const body = await response.json();
  return { response, body };
}

function startOfMonth() {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), 1, 12, 0, 0, 0);
}

function monthsAgo(months) {
  const date = new Date();
  date.setMonth(date.getMonth() - months);
  date.setHours(12, 0, 0, 0);
  return date;
}

async function cleanup() {
  await prisma.loan.deleteMany({ where: { id: { in: createdLoanIds } } });
  await prisma.book.deleteMany({ where: { id: { in: createdBookIds } } });
  await prisma.user.deleteMany({ where: { id: { in: createdUserIds } } });
  await prisma.$disconnect();

  if (server) {
    await new Promise((resolve, reject) => {
      server.close((error) => (error ? reject(error) : resolve()));
    });
  }
}

async function createBook(name) {
  const book = await prisma.book.create({
    data: {
      title: `Ranking ${name} ${uniqueSuffix}`,
      author: `Author ${name}`,
      isbn: `ranking-${name.toLowerCase()}-${uniqueSuffix}`,
      genre: "Technology",
      cover: `/covers/ranking-${name.toLowerCase()}.jpg`,
      language: "English",
      available: true,
      availableCopies: 1,
    },
  });
  createdBookIds.push(book.id);
  return book;
}

async function createLoan(userId, bookId, checkoutDate) {
  const loan = await prisma.loan.create({
    data: {
      userId,
      bookId,
      checkoutDate,
      dueDate: new Date(checkoutDate.getTime() + 30 * DAY_MS),
      returnDate: checkoutDate,
      status: "Returned",
    },
  });
  createdLoanIds.push(loan.id);
}

async function createLoans(options) {
  for (let index = 0; index < options.count; index += 1) {
    await createLoan(options.userId, options.bookId, options.checkoutDate);
  }
}

async function seedRankingData() {
  const user = await prisma.user.create({
    data: {
      name: `Ranking Reader ${uniqueSuffix}`,
      email: `ranking.reader.${uniqueSuffix}@example.com`,
      passwordHash: "hash",
      studentId: `RS${uniqueSuffix}`,
      role: "STUDENT",
    },
  });
  createdUserIds.push(user.id);

  const books = await Promise.all([
    createBook("Beta"),
    createBook("Alpha"),
    createBook("Gamma"),
    createBook("Old"),
  ]);

  await createLoans({
    userId: user.id,
    bookId: books[0].id,
    checkoutDate: startOfMonth(),
    count: 50,
  });
  await createLoans({
    userId: user.id,
    bookId: books[1].id,
    checkoutDate: startOfMonth(),
    count: 50,
  });
  await createLoans({
    userId: user.id,
    bookId: books[2].id,
    checkoutDate: monthsAgo(2),
    count: 40,
  });
  await createLoans({
    userId: user.id,
    bookId: books[3].id,
    checkoutDate: monthsAgo(13),
    count: 30,
  });

  return books;
}

function assertRankingOrder(list, books) {
  assert.equal(list[0].bookId, books[1].id);
  assert.equal(list[0].bookTitle, books[1].title);
  assert.equal(list[0].loanCount, 50);
  assert.equal(list[1].bookId, books[0].id);
  assert.equal(list[1].bookTitle, books[0].title);
  assert.equal(list[1].loanCount, 50);
}

async function main() {
  server = app.listen(0);
  await new Promise((resolve) => server.once("listening", resolve));
  baseUrl = `http://127.0.0.1:${server.address().port}`;

  const books = await seedRankingData();

  const month = await request("/api/books/ranking");
  assert.equal(month.response.status, 200);
  assertRankingOrder(month.body.data.list, books);
  assert.ok(month.body.data.list.length <= 10);
  assert.equal(month.body.data.list[0].cover, "/covers/ranking-alpha.jpg");

  const threeMonths = await request("/api/books/ranking?range=3months");
  assert.equal(threeMonths.response.status, 200);
  assertRankingOrder(threeMonths.body.data.list, books);
  assert.equal(threeMonths.body.data.list[2].bookId, books[2].id);
  assert.equal(threeMonths.body.data.list[2].loanCount, 40);

  const year = await request("/api/books/ranking?range=year");
  assert.equal(year.response.status, 200);
  assertRankingOrder(year.body.data.list, books);

  const invalid = await request("/api/books/ranking?range=week");
  assert.equal(invalid.response.status, 400);
}

main()
  .then(() => cleanup())
  .catch(async (error) => {
    console.error(error);
    await cleanup();
    process.exitCode = 1;
  });
