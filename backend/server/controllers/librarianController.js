const librarianService = require("../services/librarianService");
const { sendSuccess } = require("../lib/response");
const { AppError } = require("../lib/errors");

function isValidIsbn(code) {
  const cleaned = code.replace(/[-\s]/g, "");
  if (cleaned.length === 10) {
    return /^\d{9}[\dXx]$/.test(cleaned);
  }
  if (cleaned.length === 13) {
    return /^\d{13}$/.test(cleaned);
  }
  if (cleaned.length > 0 && cleaned.length <= 20) {
    return /^[\w-]+$/.test(cleaned);
  }
  return false;
}

async function lookupBook(req, res, next) {
  try {
    const { isbn } = req.query;
    if (!isbn) {
      throw new AppError(400, "ISBN is required");
    }

    const cleanedIsbn = isbn.replace(/[-\s]/g, "");
    if (!isValidIsbn(cleanedIsbn)) {
      throw new AppError(400, "Invalid ISBN format");
    }

    let bookData = null;

    try {
      const bookInfo = await librarianService.scrapeKongfz(cleanedIsbn);
      if (bookInfo && bookInfo.title) {
        bookData = {
          title: bookInfo.title,
          authors: bookInfo.author ? [bookInfo.author] : [],
          
          
          
          description: bookInfo.description,
          
          
        };
      }
    } catch (scrapeError) {
      console.log("Kongfz scrape failed:", scrapeError.message);
    }

    if (!bookData) {
      throw new AppError(404, "Book not found on Kongfz");
    }

    sendSuccess(res, bookData, "Book info retrieved");
  } catch (error) {
    next(error);
  }
}

/**
 * L2.4 - Scan book by ISBN/barcode
 * GET /api/librarian/books/scan?isbn=xxx
 */
async function scanBook(req, res, next) {
  try {
    const { isbn } = req.query;
    const data = await librarianService.scanBook(isbn);
    sendSuccess(res, data, "Book found");
  } catch (error) {
    next(error);
  }
}

/**
 * L1.1 - Add a new book
 * POST /api/librarian/books
 */
async function addBook(req, res, next) {
  try {
    const userId = req.currentUser?.id;
    const data = await librarianService.addBook(req.body, userId);
    sendSuccess(res, data, "Book added successfully");
  } catch (error) {
    next(error);
  }
}

/**
 * L1.2 - Edit an existing book
 * PUT /api/librarian/books/:id
 */
async function editBook(req, res, next) {
  try {
    const bookId = req.params.id;
    const userId = req.currentUser?.id;
    const data = await librarianService.editBook(bookId, req.body, userId);
    sendSuccess(res, data, "Book updated successfully");
  } catch (error) {
    next(error);
  }
}

/**
 * L1.3 - View all books with status
 * GET /api/librarian/books
 */
async function viewBooks(req, res, next) {
  try {
    const data = await librarianService.viewBooks(req.query);
    sendSuccess(res, data);
  } catch (error) {
    next(error);
  }
}

/**
 * L1.4 - Delete/Archive a book
 * DELETE /api/librarian/books/:id
 */
async function deleteBook(req, res, next) {
  try {
    const bookId = req.params.id;
    const userId = req.currentUser?.id;
    await librarianService.deleteBook(bookId, userId);
    sendSuccess(res, null, "Book deleted successfully");
  } catch (error) {
    next(error);
  }
}

module.exports = {
  addBook,
  editBook,
  viewBooks,
  deleteBook,
  scanBook,
  lookupBook,
};
