const assert = require("node:assert/strict");

process.env.LOAN_FINE_RATE = "2";
process.env.LOAN_MAX_BOOKS = "10";
process.env.LOAN_MAX_DAYS = "30";

const app = require("../server/app");
const prisma = require("../server/db/prisma");

let server;
let baseUrl;
let authToken;
const bookIds = [];
let userId;
const uniqueSuffix = Date.now();
const testEmail = `reader.fine.edge.${uniqueSuffix}@example.com`;

async function request(path, options = {}) {
  const response = await fetch(`${baseUrl}${path}`, options);
  const body = await response.json();
  return { response, body };
}

async function cleanup() {
  if (bookIds.length) {
    await prisma.loan.deleteMany({ where: { bookId: { in: bookIds } } });
    await prisma.book.deleteMany({ where: { id: { in: bookIds } } });
  }
  if (userId) {
    await prisma.loan.deleteMany({ where: { userId } });
    await prisma.user.deleteMany({ where: { id: userId } });
  }
  await prisma.$disconnect();
  if (server) {
    await new Promise((resolve, reject) => {
      server.close((error) => (error ? reject(error) : resolve()));
    });
  }
}

async function main() {
  server = app.listen(0);
  await new Promise((resolve) => server.once("listening", resolve));
  const { port } = server.address();
  baseUrl = `http://127.0.0.1:${port}`;

  const book = await prisma.book.create({
    data: {
      title: `Fine Edge Book ${uniqueSuffix}`,
      author: "Smoke",
      isbn: `fine-edge-${uniqueSuffix}`,
      genre: "Technology",
      cover: "/covers/fine-edge.jpg",
      description: "fine edge",
      language: "English",
      shelfLocation: "FE-001",
      available: true,
      availableCopies: 1,
    },
  });
  bookIds.push(book.id);

  const registerResult = await request("/api/register", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      name: "Fine Edge Reader",
      email: testEmail,
      password: "reader123",
      studentId: `F${uniqueSuffix}`,
    }),
  });
  assert.equal(registerResult.response.status, 200);
  userId = registerResult.body.data.userId;

  const loginResult = await request("/api/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      userName: testEmail,
      password: "reader123",
    }),
  });
  assert.equal(loginResult.response.status, 200);
  authToken = loginResult.body.data.token;

  const borrow = await request("/api/loans", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${authToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ bookId: book.id }),
  });
  assert.equal(borrow.response.status, 200);
  const loanId = borrow.body.data.loanId;

  await prisma.loan.update({
    where: { id: loanId },
    data: {
      dueDate: new Date(Date.now() + 48 * 60 * 60 * 1000),
    },
  });

  const onTimeReturn = await request(`/api/loans/${loanId}/return`, {
    method: "POST",
    headers: { Authorization: `Bearer ${authToken}` },
  });
  assert.equal(onTimeReturn.response.status, 200);
  assert.equal(onTimeReturn.body.data.fineAmount, 0);

  const book2 = await prisma.book.create({
    data: {
      title: `Fine Edge Book2 ${uniqueSuffix}`,
      author: "Smoke",
      isbn: `fine-edge2-${uniqueSuffix}`,
      genre: "Technology",
      cover: "/covers/fine-edge2.jpg",
      description: "fine edge 2",
      language: "English",
      shelfLocation: "FE-002",
      available: true,
      availableCopies: 1,
    },
  });
  bookIds.push(book2.id);

  const borrow2 = await request("/api/loans", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${authToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ bookId: book2.id }),
  });
  assert.equal(borrow2.response.status, 200);
  const loan2Id = borrow2.body.data.loanId;

  await prisma.loan.update({
    where: { id: loan2Id },
    data: {
      dueDate: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
    },
  });

  const overdueReturn = await request(`/api/loans/${loan2Id}/return`, {
    method: "POST",
    headers: { Authorization: `Bearer ${authToken}` },
  });
  assert.equal(overdueReturn.response.status, 200);
  assert.equal(overdueReturn.body.data.fineAmount, 6);

  console.log("Reader fine-edge test passed.");
}

main()
  .catch(async (error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(cleanup);
