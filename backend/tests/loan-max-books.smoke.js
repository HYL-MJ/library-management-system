const assert = require("node:assert/strict");

process.env.LOAN_MAX_BOOKS = "2";
process.env.LOAN_MAX_DAYS = "30";
process.env.LOAN_FINE_RATE = "5";

const app = require("../server/app");
const prisma = require("../server/db/prisma");

let server;
let baseUrl;
let authToken;
const bookIds = [];
let userId;
const uniqueSuffix = Date.now();
const testEmail = `loan.maxbooks.${uniqueSuffix}@example.com`;

async function request(path, options = {}) {
  const response = await fetch(`${baseUrl}${path}`, options);
  const body = await response.json();
  return { response, body };
}

async function cleanup() {
  if (bookIds.length) {
    await prisma.loan.deleteMany({
      where: { bookId: { in: bookIds } },
    });
    await prisma.book.deleteMany({
      where: { id: { in: bookIds } },
    });
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

  for (let i = 0; i < 3; i += 1) {
    const book = await prisma.book.create({
      data: {
        title: `MaxBooks Test ${i} ${uniqueSuffix}`,
        author: "Smoke",
        isbn: `maxbooks-${uniqueSuffix}-${i}`,
        genre: "Technology",
        cover: "/covers/maxbooks.jpg",
        description: "max concurrent borrows smoke",
        language: "English",
        shelfLocation: "MB-001",
        available: true,
        availableCopies: 1,
      },
    });
    bookIds.push(book.id);
  }

  const registerResult = await request("/api/register", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      name: "MaxBooks Reader",
      email: testEmail,
      password: "reader123",
      studentId: `M${uniqueSuffix}`,
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

  const b1 = await request("/api/loans", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${authToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ bookId: bookIds[0] }),
  });
  assert.equal(b1.response.status, 200);

  const b2 = await request("/api/loans", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${authToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ bookId: bookIds[1] }),
  });
  assert.equal(b2.response.status, 200);

  const b3 = await request("/api/loans", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${authToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ bookId: bookIds[2] }),
  });
  assert.equal(b3.response.status, 400);
  assert.ok(
    String(b3.body.message).includes("borrowing limit"),
    `expected limit message, got: ${b3.body.message}`,
  );

  console.log("Loan max-books smoke test passed.");
}

main()
  .catch(async (error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(cleanup);
