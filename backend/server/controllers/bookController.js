const bookService = require("../services/bookService");
const bookRankingService = require("../services/bookRankingService");
const { sendSuccess } = require("../lib/response");

async function listBooks(req, res, next) {
  try {
    const data = await bookService.listBooks(req.query);
    sendSuccess(res, data);
  } catch (error) {
    next(error);
  }
}

async function searchBooks(req, res, next) {
  try {
    const data = await bookService.searchBooks(req.query);
    sendSuccess(res, data);
  } catch (error) {
    next(error);
  }
}

async function getBookDetail(req, res, next) {
  try {
    const data = await bookService.getBookDetail(req.params.id);
    sendSuccess(res, data);
  } catch (error) {
    next(error);
  }
}

async function getBookByBarcode(req, res, next) {
  try {
    const data = await bookService.getBookByBarcode(req.params.barcode);
    sendSuccess(res, data);
  } catch (error) {
    next(error);
  }
}

// Get book list with filtering, sorting, and pagination.
async function getBooksWithFilters(req, res, next) {
  try {
    const data = await bookService.getBooksWithFilters(req.query);
    sendSuccess(res, data);
  } catch (error) {
    next(error);
  }
}

// Get new books announcement.
async function getNewBooks(req, res, next) {
  try {
    const data = await bookService.getNewBooks(req.query);
    console.log("getNewBooks returned data:", data);
    sendSuccess(res, data);
  } catch (error) {
    console.log("getNewBooks controller error:", error);
    next(error);
  }
}

// Get loan ranking.
async function getRanking(req, res, next) {
  try {
    const data = await bookRankingService.getRanking(req.query);
    sendSuccess(res, data);
  } catch (error) {
    next(error);
  }
}

module.exports = {
  listBooks,
  searchBooks,
  getBookDetail,
  getBookByBarcode,
  getBooksWithFilters,  
  getNewBooks,          
  getRanking            
};
