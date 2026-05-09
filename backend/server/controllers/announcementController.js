const announcementService = require("../services/announcementService");
const { sendSuccess } = require("../lib/response");


async function getAnnouncements(req, res, next) {
  try {
    const { page = 1, size = 10 } = req.query;
    const pageNum = parseInt(page, 10);
    const pageSize = parseInt(size, 10);

    const data = await announcementService.getAnnouncements(pageNum, pageSize);
    sendSuccess(res, data);
  } catch (error) {
    next(error);
  }
}

async function getAnnouncementById(req, res, next) {
  try {
    const { id } = req.params;
    const data = await announcementService.getAnnouncementById(id);
    sendSuccess(res, data);
  } catch (error) {
    next(error);
  }
}

module.exports = {
  getAnnouncements,
  getAnnouncementById,
};
