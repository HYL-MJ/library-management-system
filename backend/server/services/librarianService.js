const prisma = require("../db/prisma");
const { AppError } = require("../lib/errors");
const { formatDateTime } = require("../utils/date");
const puppeteer = require("puppeteer");

let browser = null;


async function scrapeKongfz(isbn) {
  // console.log("\n[Step 1] Launching browser...");
    const browser = await puppeteer.launch({
      headless: true,
      args: ["--no-sandbox", "--disable-setuid-sandbox"]
    });
  
    try {
      // console.log("[Step 2] Creating new page...");
      const page = await browser.newPage();
      page.setViewport({ width: 1280, height: 800 });
      
      const searchUrl = `https://search.kongfz.com/product/?keyword=${isbn}&dataType=0`;
      // console.log("[Step 3] Navigating to search URL:", searchUrl);
      await page.goto(searchUrl, { waitUntil: "networkidle2", timeout: 30000 });
      
      
      // await page.waitForSelector(".item-box, .no-result, .result-empty", { timeout: 15000 }).catch(() => {});
      
      
      // console.log("\n[Step 4] Waiting for user to check search results...");
      
      // 使用 page.evaluate 直接提取第一个图书信息
      // console.log("[DEBUG] Extracting first book info...");
      const firstBook = await page.evaluate(() => {
        const selectors = [
          '.item-box a',           // 可能的图书项链接
          '.product-item a',       // 产品项
          '.result-item a',        // 结果项
          '[class*="item"] a',   // 包含 item 的类
          '#app a'                 // app 内的所有链接
        ];
        
        for (const sel of selectors) {
          const elements = document.querySelectorAll(sel);
          for (const el of elements) {
            // 只保留包含 /book/ 的链接
            if (el.href && el.href.includes('/book/')) {
              const text = el.innerText?.trim() || '';
              // 按 \n 分割，前部分是书名，后部分是其他信息
              const parts = text.split('\n');
              const title = parts[0] || '';
              const otherInfo = parts[1] || '';
              // 作者是 otherInfo 中第一个空格前的部分
              const author = otherInfo.split(' ')[0] || '';
              
              return {
                title: title,
                author: author,
                url: el.href
              };
            }
          }
        }
        return null;
      });
      
      // console.log("\n[DEBUG] First book info:");
      // console.log(JSON.stringify(firstBook, null, 2));
      
      // 打开第一个图书链接
      if (firstBook && firstBook.url) {
        // console.log(`\n[DEBUG] Opening first book URL: ${firstBook.url}`);
        await page.goto(firstBook.url, { waitUntil: "networkidle2", timeout: 30000 });
        
        
        
        
        
        // 提取图书详细信息
        // console.log("[DEBUG] Extracting book details...");
        const bookDetails = await page.evaluate(() => {
          const getText = (sel) => {
            const el = document.querySelector(sel);
            return el ? el.innerText.trim() : '';
          };
          
          // 尝试多种选择器获取内容简介
          const descSelectors = [
            '.description',
            '.intro',
            '.product-intro',
            '[class*="description"]',
            '[class*="intro"]',
            '.jianjie', // 直接针对该页面的类名
      '[class*="jianjie"]', // 模糊匹配包含 jianjie 的类名
      '.jianjie span', // 精确到内容所在的 span (根据提供的 HTML 结构)
      '.detail-con-right ul .jianjie' // 更具体的层级选择器
          ];
          
          let description = '';
          for (const sel of descSelectors) {
            const el = document.querySelector(sel);
            if (el) {
              // 获取文本并去除可能存在的标题（如“内容简介:”）
              let text = el.innerText.trim();
              // 如果文本以“内容简介”开头，尝试截取后面的内容
              if (text.startsWith('内容简介')) {
                text = text.replace(/内容简介[:：]?\s*/, '');
              }
              // 确保文本长度，防止提取到空标题
              if (text.length > 10) {
                description = text;
                break;
              }
            }
          }
          
          return {
            description: description
          };
        });
        
        // 合并firstBook和bookDetails
        const finalBookInfo = {
          title: firstBook.title,
          author: firstBook.author,
          description: bookDetails.description
        };
        
        // console.log("\n[DEBUG] Book details:");
        // console.log(JSON.stringify(finalBookInfo, null, 2));
        return finalBookInfo;
        
      } else {
        // console.log("[DEBUG] No book found!");
        return null;
      }
      
    }  finally {
      // console.log("\n Closing browser...");
      await browser.close();
      // console.log("Browser closed.");
    }
}

// Valid genre and language values from Prisma schema
const VALID_GENRES = ["Technology", "Fiction", "Science", "History", "Management"];
const VALID_LANGUAGES = ["Chinese", "English", "Others"];

function buildBookCopyCreateManyData(book, copyCount) {
  return Array.from({ length: copyCount }, (_, index) => ({
    bookId: book.id,
    barcode: `${book.isbn}-${String(index + 1).padStart(3, "0")}`,
    shelfLocation: book.shelfLocation || null,
    available: true,
  }));
}

/**
 * Add a new book (L1.1)
 */
async function addBook(payload, userId) {
  const { title, author, isbn, genre, cover, description, language, shelfLocation, availableCopies } = payload || {};

  // Validate required fields
  if (!title || !author || !isbn || !genre || !language) {
    throw new AppError(400, "Missing required fields: title, author, isbn, genre, language are required");
  }

  // Validate genre
  if (!VALID_GENRES.includes(genre)) {
    throw new AppError(400, `Invalid genre. Must be one of: ${VALID_GENRES.join(", ")}`);
  }

  // Validate language
  if (!VALID_LANGUAGES.includes(language)) {
    throw new AppError(400, `Invalid language. Must be one of: ${VALID_LANGUAGES.join(", ")}`);
  }

  // Check ISBN uniqueness
  const existingBook = await prisma.book.findUnique({
    where: { isbn },
  });
  if (existingBook) {
    throw new AppError(400, "A book with this ISBN already exists");
  }

  // Create the book
  const book = await prisma.book.create({
    data: {
      title,
      author,
      isbn,
      genre,
      cover: cover || null,
      description: description || null,
      language,
      shelfLocation: shelfLocation || null,
      availableCopies: availableCopies !== undefined ? Number(availableCopies) : 1,
      available: availableCopies === undefined || Number(availableCopies) > 0,
    },
  });

  const copyCount = availableCopies !== undefined ? Number(availableCopies) : 1;
  if (copyCount > 0) {
    await prisma.bookCopy.createMany({
      data: buildBookCopyCreateManyData(book, copyCount),
    });
  }

  // Log the action
  await prisma.auditLog.create({
    data: {
      userId,
      action: "CREATE_BOOK",
      entity: "Book",
      entityId: book.id,
      detail: `Created book: ${book.title}`,
    },
  });

  return toBookDetail(book);
}

/**
 * Edit an existing book (L1.2)
 */
async function editBook(bookId, payload, userId) {
  // Check if book exists
  const existingBook = await prisma.book.findUnique({
    where: { id: bookId },
  });
  if (!existingBook) {
    throw new AppError(404, "Book not found");
  }

  const { title, author, isbn, genre, cover, description, language, shelfLocation, availableCopies } = payload || {};

  // Validate genre if provided
  if (genre && !VALID_GENRES.includes(genre)) {
    throw new AppError(400, `Invalid genre. Must be one of: ${VALID_GENRES.join(", ")}`);
  }

  // Validate language if provided
  if (language && !VALID_LANGUAGES.includes(language)) {
    throw new AppError(400, `Invalid language. Must be one of: ${VALID_LANGUAGES.join(", ")}`);
  }

  // Check ISBN uniqueness if changing ISBN
  if (isbn && isbn !== existingBook.isbn) {
    const isbnExists = await prisma.book.findUnique({
      where: { isbn },
    });
    if (isbnExists) {
      throw new AppError(400, "A book with this ISBN already exists");
    }
  }

  // Build update data with only provided fields
  const updateData = {};
  if (title !== undefined) updateData.title = title;
  if (author !== undefined) updateData.author = author;
  if (isbn !== undefined) updateData.isbn = isbn;
  if (genre !== undefined) updateData.genre = genre;
  if (cover !== undefined) updateData.cover = cover;
  if (description !== undefined) updateData.description = description;
  if (language !== undefined) updateData.language = language;
  if (shelfLocation !== undefined) updateData.shelfLocation = shelfLocation;
  if (availableCopies !== undefined) {
    updateData.availableCopies = Number(availableCopies);
    updateData.available = Number(availableCopies) > 0;
  }

  // Update the book
  const updatedBook = await prisma.book.update({
    where: { id: bookId },
    data: updateData,
  });

  if (availableCopies !== undefined) {
    const desiredCopies = Number(availableCopies);
    const existingCopies = await prisma.bookCopy.count({
      where: { bookId },
    });

    if (desiredCopies > existingCopies) {
      await prisma.bookCopy.createMany({
        data: Array.from({ length: desiredCopies - existingCopies }, (_, index) => ({
          bookId,
          barcode: `${updatedBook.isbn}-${String(existingCopies + index + 1).padStart(3, "0")}`,
          shelfLocation: updatedBook.shelfLocation || null,
          available: true,
        })),
      });
    }
  }

  // Log the action
  await prisma.auditLog.create({
    data: {
      userId,
      action: "UPDATE_BOOK",
      entity: "Book",
      entityId: bookId,
      detail: `Updated book: ${updatedBook.title}`,
    },
  });

  return toBookDetail(updatedBook);
}

/**
 * View all books with status (L1.3)
 */
async function viewBooks(query) {
  const page = Number(query.page || 1);
  const size = Number(query.size || 10);

  if (!Number.isInteger(page) || page < 1 || !Number.isInteger(size) || size < 1) {
    throw new AppError(400, "Invalid pagination parameters");
  }

  const skip = (page - 1) * size;

  // Build filter conditions
  const where = {};

  // Keyword search
  if (query.keyword && typeof query.keyword === "string") {
    where.OR = [
      { title: { contains: query.keyword } },
      { author: { contains: query.keyword } },
    ];
  }

  // Genre filter
  if (query.genre) {
    where.genre = query.genre;
  }

  // Availability filter
  if (query.available !== undefined) {
    where.available = query.available === "true";
  }

  // Get total count and book list
  const [total, books] = await Promise.all([
    prisma.book.count({ where }),
    prisma.book.findMany({
      where,
      skip,
      take: size,
      orderBy: { createdAt: "desc" },
    }),
  ]);

  return {
    total,
    page,
    size,
    list: books.map(toBookSummary),
  };
}

/**
 * Scan book by ISBN/barcode (L2.4)
 * Validates ISBN/barcode format and returns book details
 */
async function scanBook(isbn) {
  if (!isbn || typeof isbn !== "string") {
    throw new AppError(400, "ISBN parameter is required");
  }

  const cleanedIsbn = isbn.trim();

  if (!isValidIsbn(cleanedIsbn)) {
    throw new AppError(400, "Invalid ISBN or barcode format");
  }

  // First try to find by barcode in BookCopy
  const bookCopy = await prisma.bookCopy.findUnique({
    where: { barcode: cleanedIsbn },
    include: { book: true }
  });

  if (bookCopy) {
    return toBookDetail(bookCopy.book);
  }

  // If not found by barcode, try to find by ISBN in Book table
  const book = await prisma.book.findUnique({
    where: { isbn: cleanedIsbn },
  });

  if (!book) {
    throw new AppError(404, "Book not found with this ISBN");
  }

  return toBookDetail(book);
}

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

/**
 * Delete/Archive a book (L1.4)
 */
async function deleteBook(bookId, userId) {
  // Check if book exists
  const existingBook = await prisma.book.findUnique({
    where: { id: bookId },
  });
  if (!existingBook) {
    throw new AppError(404, "Book not found");
  }

  // Check if book has active loans
  const activeLoans = await prisma.loan.count({
    where: {
      bookId,
      status: "Borrowing",
    },
  });
  if (activeLoans > 0) {
    throw new AppError(400, "Cannot delete book with active loans");
  }

  // Delete the book (soft delete by setting available to false and availableCopies to 0)
  // Or hard delete - based on requirements, we'll do hard delete but log it
  await prisma.book.delete({
    where: { id: bookId },
  });

  // Log the action
  await prisma.auditLog.create({
    data: {
      userId,
      action: "DELETE_BOOK",
      entity: "Book",
      entityId: bookId,
      detail: `Deleted book: ${existingBook.title}`,
    },
  });

  return null;
}

/**
 * Helper: Convert book to summary format
 */
function toBookSummary(book) {
  return {
    id: book.id,
    title: book.title,
    author: book.author,
    isbn: book.isbn,
    genre: book.genre,
    cover: book.cover,
    language: book.language,
    shelfLocation: book.shelfLocation,
    available: book.available,
    availableCopies: book.availableCopies,
    createdAt: formatDateTime(book.createdAt),
  };
}

/**
 * Helper: Convert book to detail format
 */
function toBookDetail(book) {
  return {
    id: book.id,
    title: book.title,
    author: book.author,
    isbn: book.isbn,
    genre: book.genre,
    cover: book.cover,
    description: book.description,
    language: book.language,
    shelfLocation: book.shelfLocation,
    available: book.available,
    availableCopies: book.availableCopies,
    createdAt: formatDateTime(book.createdAt),
  };
}

module.exports = {
  addBook,
  editBook,
  viewBooks,
  deleteBook,
  scanBook,
  scrapeKongfz,
};
