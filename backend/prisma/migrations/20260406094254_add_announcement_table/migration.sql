CREATE TABLE "Announcement" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'OTHER',
    "publishedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX "Announcement_publishedAt_idx" ON "Announcement"("publishedAt");

CREATE INDEX "Announcement_createdAt_idx" ON "Announcement"("createdAt");
