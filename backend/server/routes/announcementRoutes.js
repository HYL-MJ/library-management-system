const express = require("express");
const announcementController = require("../controllers/announcementController");

const router = express.Router();

router.get("/announcements", announcementController.getAnnouncements);

router.get("/announcements/:id", announcementController.getAnnouncementById);

module.exports = router;
