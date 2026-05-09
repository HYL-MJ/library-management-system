CREATE TABLE "BookCopy" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "bookId" TEXT NOT NULL,
    "barcode" TEXT NOT NULL,
    "shelfLocation" TEXT,
    "available" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "BookCopy_bookId_fkey" FOREIGN KEY ("bookId") REFERENCES "Book" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "BookCopy_barcode_key" ON "BookCopy"("barcode");
CREATE INDEX "BookCopy_bookId_idx" ON "BookCopy"("bookId");
CREATE INDEX "BookCopy_barcode_idx" ON "BookCopy"("barcode");
CREATE INDEX "BookCopy_available_idx" ON "BookCopy"("available");
