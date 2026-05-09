const assert = require("node:assert/strict");

process.env.LOAN_FINE_RATE = "5";
process.env.LOAN_MAX_BOOKS = "20";
process.env.LOAN_MAX_DAYS = "30";

const app = require("../server/app");
const prisma = require("../server/db/prisma");

let server;
let baseUrl;
let authToken;
let testBookId;
let secondTestBookId;
let registeredUserId;
let secondAuthToken;
let secondRegisteredUserId;
const uniqueSuffix = Date.now();
const testEmail = `reader.release1.${uniqueSuffix}@example.com`;
const secondTestEmail = `reader.release1.peer.${uniqueSuffix}@example.com`;

async function request(path, options = {}) {
  const response = await fetch(`${baseUrl}${path}`, options);
  const body = await response.json();
  return { response, body };
}

async function cleanup() {
  if (testBookId || secondTestBookId) {
    await prisma.loan.deleteMany({
      where: {
        bookId: {
          in: [testBookId, secondTestBookId].filter(Boolean),
        },
      },
    });
    await prisma.book.deleteMany({
      where: {
        id: {
          in: [testBookId, secondTestBookId].filter(Boolean),
        },
      },
    });
  }

  if (registeredUserId || secondRegisteredUserId) {
    await prisma.loan.deleteMany({
      where: {
        userId: {
          in: [registeredUserId, secondRegisteredUserId].filter(Boolean),
        },
      },
    });
    await prisma.user.deleteMany({
      where: {
        id: {
          in: [registeredUserId, secondRegisteredUserId].filter(Boolean),
        },
      },
    });
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

  const testBook = await prisma.book.create({
    data: {
      title: `Release1 Test Book ${uniqueSuffix}`,
      author: "Codex Reader",
      isbn: `release1-${uniqueSuffix}`,
      genre: "Technology",
      cover: "/covers/release1-test-book.jpg",
      description: "Reader release1 integration test book.",
      language: "English",
      shelfLocation: "TEST-001",
      available: true,
      availableCopies: 1,
    },
  });
  testBookId = testBook.id;

  const secondTestBook = await prisma.book.create({
    data: {
      title: `Release1 Fine Test Book ${uniqueSuffix}`,
      author: "Codex Reader",
      isbn: `release1-fine-${uniqueSuffix}`,
      genre: "Technology",
      cover: "/covers/release1-fine-test-book.jpg",
      description: "Reader release1 fine payment test book.",
      language: "English",
      shelfLocation: "TEST-002",
      available: true,
      availableCopies: 1,
    },
  });
  secondTestBookId = secondTestBook.id;

  const registerResult = await request("/api/register", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      name: "Release1 Reader",
      email: testEmail,
      password: "reader123",
      studentId: `S${uniqueSuffix}`,
    }),
  });
  assert.equal(registerResult.response.status, 200);
  assert.equal(registerResult.body.message, "Registration successful");
  registeredUserId = registerResult.body.data.userId;

  const secondRegisterResult = await request("/api/register", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      name: "Release1 Peer Reader",
      email: secondTestEmail,
      password: "reader123",
      studentId: `P${uniqueSuffix}`,
    }),
  });
  assert.equal(secondRegisterResult.response.status, 200);
  secondRegisteredUserId = secondRegisterResult.body.data.userId;

  const loginResult = await request("/api/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      userName: testEmail,
      password: "reader123",
    }),
  });
  assert.equal(loginResult.response.status, 200);
  assert.ok(loginResult.body.data.token);
  authToken = loginResult.body.data.token;

  const secondLoginResult = await request("/api/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      userName: secondTestEmail,
      password: "reader123",
    }),
  });
  assert.equal(secondLoginResult.response.status, 200);
  secondAuthToken = secondLoginResult.body.data.token;

  const titleSearch = await request(
    `/api/books/search?keyword=${encodeURIComponent("Release1 Test Book")}&type=title`,
  );
  assert.equal(titleSearch.response.status, 200);
  assert.ok(titleSearch.body.data.list.some((book) => book.id === testBookId));

  const authorSearch = await request(
    `/api/books/search?keyword=${encodeURIComponent("Codex Reader")}&type=author`,
  );
  assert.equal(authorSearch.response.status, 200);
  assert.ok(authorSearch.body.data.list.some((book) => book.id === testBookId));

  const detailResult = await request(`/api/books/${testBookId}`);
  assert.equal(detailResult.response.status, 200);
  assert.equal(detailResult.body.data.id, testBookId);
  assert.equal(detailResult.body.data.cover, "/covers/release1-test-book.jpg");
  assert.equal(detailResult.body.data.availableCopies, 1);

  const meResult = await request("/api/users/me", {
    headers: {
      Authorization: `Bearer ${authToken}`,
    },
  });
  assert.equal(meResult.response.status, 200);
  assert.equal(meResult.body.data.email, testEmail);

  const updateMeResult = await request("/api/users/me", {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${authToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      name: "Updated Reader",
    }),
  });
  assert.equal(updateMeResult.response.status, 200);
  assert.equal(updateMeResult.body.data.name, "Updated Reader");

  const borrowResult = await request("/api/loans", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${authToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      bookId: testBookId,
    }),
  });
  assert.equal(borrowResult.response.status, 200);
  assert.equal(borrowResult.body.message, "Borrowing successful");
  const loanId = borrowResult.body.data.loanId;

  const borrowedBook = await prisma.book.findUnique({
    where: { id: testBookId },
  });
  assert.equal(borrowedBook.availableCopies, 0);
  assert.equal(borrowedBook.available, false);

  const currentLoansResult = await request("/api/loans/current", {
    headers: {
      Authorization: `Bearer ${authToken}`,
    },
  });
  assert.equal(currentLoansResult.response.status, 200);
  assert.ok(
    currentLoansResult.body.data.list.some(
      (loan) => loan.bookId === testBookId && loan.status === "Borrowing",
    ),
  );

  const overdueDate = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000);
  await prisma.loan.update({
    where: { id: loanId },
    data: {
      dueDate: overdueDate,
    },
  });

  const overdueCurrentLoansResult = await request("/api/loans/current", {
    headers: {
      Authorization: `Bearer ${authToken}`,
    },
  });
  assert.equal(overdueCurrentLoansResult.response.status, 200);
  assert.ok(
    overdueCurrentLoansResult.body.data.list.some(
      (loan) => loan.bookId === testBookId && loan.status === "Overdue",
    ),
  );

  const overdueHistoryLoansResult = await request("/api/loans/history", {
    headers: {
      Authorization: `Bearer ${authToken}`,
    },
  });
  assert.equal(overdueHistoryLoansResult.response.status, 200);
  assert.ok(
    overdueHistoryLoansResult.body.data.list.some(
      (loan) => loan.id === loanId && loan.status === "Overdue",
    ),
  );

  await prisma.loan.update({
    where: { id: loanId },
    data: {
      dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      status: "Borrowing",
    },
  });

  const returnResult = await request(`/api/loans/${loanId}/return`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${authToken}`,
    },
  });
  assert.equal(returnResult.response.status, 200);
  assert.equal(returnResult.body.message, "Return successful");
  assert.equal(returnResult.body.data.status, "Returned");
  assert.equal(returnResult.body.data.bookId, testBookId);
  assert.equal(returnResult.body.data.fineAmount, 0);

  const returnedBook = await prisma.book.findUnique({
    where: { id: testBookId },
  });
  assert.equal(returnedBook.availableCopies, 1);
  assert.equal(returnedBook.available, true);

  const fineBorrowResult = await request("/api/loans", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${authToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      bookId: secondTestBookId,
    }),
  });
  assert.equal(fineBorrowResult.response.status, 200);
  const fineLoanId = fineBorrowResult.body.data.loanId;

  const fineLoanOverdueDate = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000);
  await prisma.loan.update({
    where: { id: fineLoanId },
    data: {
      dueDate: fineLoanOverdueDate,
    },
  });

  const overdueReturnResult = await request(`/api/loans/${fineLoanId}/return`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${authToken}`,
    },
  });
  assert.equal(overdueReturnResult.response.status, 200);
  assert.equal(overdueReturnResult.body.data.fineAmount, 10);

  const historyAfterOverdueReturnResult = await request("/api/loans/history", {
    headers: {
      Authorization: `Bearer ${authToken}`,
    },
  });
  assert.equal(historyAfterOverdueReturnResult.response.status, 200);
  const overdueHistoryLoan = historyAfterOverdueReturnResult.body.data.list.find(
    (loan) => loan.id === fineLoanId,
  );
  assert.ok(overdueHistoryLoan);
  assert.equal(overdueHistoryLoan.fineAmount, 10);
  assert.equal(overdueHistoryLoan.finePaid, false);
  assert.equal(overdueHistoryLoan.fineForgiven, false);

  const blockedBorrowResult = await request("/api/loans", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${authToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      bookId: testBookId,
    }),
  });
  assert.equal(blockedBorrowResult.response.status, 400);
  assert.equal(blockedBorrowResult.body.message, "This book is currently unavailable, or you have unpaid fines");

  const noFinePayResult = await request(`/api/loans/${loanId}/pay-fine`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${authToken}`,
      "Content-Type": "application/json",
    },
  });
  assert.equal(noFinePayResult.response.status, 400);

  const wrongAmountPayResult = await request(`/api/loans/${fineLoanId}/pay-fine`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${authToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      amount: 9,
    }),
  });
  assert.equal(wrongAmountPayResult.response.status, 400);
  assert.equal(wrongAmountPayResult.body.message, "This loan has no payable fine, or the payment amount is insufficient");

  const unauthorizedPayResult = await request(`/api/loans/${fineLoanId}/pay-fine`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${secondAuthToken}`,
      "Content-Type": "application/json",
    },
  });
  assert.equal(unauthorizedPayResult.response.status, 404);

  const payFineResult = await request(`/api/loans/${fineLoanId}/pay-fine`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${authToken}`,
      "Content-Type": "application/json",
    },
  });
  assert.equal(payFineResult.response.status, 200);
  assert.equal(payFineResult.body.message, "Fine paid successfully");
  assert.equal(payFineResult.body.data.loanId, fineLoanId);
  assert.equal(payFineResult.body.data.fineAmount, 10);
  assert.equal(payFineResult.body.data.finePaid, true);

  const historyAfterPayFineResult = await request("/api/loans/history", {
    headers: {
      Authorization: `Bearer ${authToken}`,
    },
  });
  assert.equal(historyAfterPayFineResult.response.status, 200);
  const paidHistoryLoan = historyAfterPayFineResult.body.data.list.find(
    (loan) => loan.id === fineLoanId,
  );
  assert.ok(paidHistoryLoan);
  assert.equal(paidHistoryLoan.fineAmount, 10);
  assert.equal(paidHistoryLoan.finePaid, true);
  assert.equal(paidHistoryLoan.fineForgiven, false);

  const paidLoan = await prisma.loan.findUnique({
    where: { id: fineLoanId },
  });
  assert.equal(Number(paidLoan.fineAmount), 10);
  assert.equal(paidLoan.finePaid, true);

  const auditLog = await prisma.auditLog.findFirst({
    where: {
      userId: registeredUserId,
      action: "PAY_FINE",
      entity: "Loan",
      entityId: fineLoanId,
    },
    orderBy: {
      createdAt: "desc",
    },
  });
  assert.ok(auditLog);
  assert.equal(
    auditLog.detail,
    JSON.stringify({ amount: 10, method: "SIMULATED" }),
  );

  const duplicatePayResult = await request(`/api/loans/${fineLoanId}/pay-fine`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${authToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      amount: 10,
    }),
  });
  assert.equal(duplicatePayResult.response.status, 400);

  const borrowAfterPaymentResult = await request("/api/loans", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${authToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      bookId: testBookId,
    }),
  });
  assert.equal(borrowAfterPaymentResult.response.status, 200);
  const loanAfterPaymentId = borrowAfterPaymentResult.body.data.loanId;

  const returnAfterPaymentResult = await request(
    `/api/loans/${loanAfterPaymentId}/return`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${authToken}`,
      },
    },
  );
  assert.equal(returnAfterPaymentResult.response.status, 200);

  const logoutResult = await request("/api/logout", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${authToken}`,
    },
  });
  assert.equal(logoutResult.response.status, 200);
  assert.equal(logoutResult.body.message, "Logged out successfully");

  const postLogoutMe = await request("/api/users/me", {
    headers: {
      Authorization: `Bearer ${authToken}`,
    },
  });
  assert.equal(postLogoutMe.response.status, 401);

  console.log("Reader Release1 smoke test passed.");
}

main()
  .catch(async (error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(cleanup);
