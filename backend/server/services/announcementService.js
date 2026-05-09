const prisma = require("../db/prisma");
const { AppError } = require("../lib/errors");
const { formatDateTime } = require("../utils/date");

function toAnnouncement(announcement) {
  return {
    id: announcement.id,
    title: announcement.title,
    content: announcement.content,
    type: announcement.type,
    publishedAt: announcement.publishedAt ? formatDateTime(announcement.publishedAt) : null,
    createdAt: formatDateTime(announcement.createdAt),
  };
}

async function getAnnouncements(page = 1, size = 10) {
  const skip = (page - 1) * size;

  const [announcements, totalCount] = await Promise.all([
    prisma.announcement.findMany({
      orderBy: {
        publishedAt: "desc",
      },
      skip,
      take: size,
    }),
    prisma.announcement.count(),
  ]);

  return {
    total: totalCount,
    page,
    size,
    list: announcements.map(toAnnouncement),
  };
}

async function getAnnouncementById(id) {
  const announcement = await prisma.announcement.findUnique({
    where: { id },
  });

  if (!announcement) {
    throw new AppError(404, "公告不存在");
  }

  return toAnnouncement(announcement);
}

module.exports = {
  getAnnouncements,
  getAnnouncementById,
};
