const express = require("express");

const bookController = require("../controllers/bookController");

const router = express.Router();

router.get("/books", bookController.listBooks);
router.get("/books/search", bookController.searchBooks);
router.get("/books/barcode/:barcode", bookController.getBookByBarcode);
router.get("/books/new", bookController.getNewBooks);
router.get("/books/ranking", bookController.getRanking);
router.get("/books/filter", bookController.getBooksWithFilters);
router.get("/books/:id", bookController.getBookDetail);

module.exports = router;
