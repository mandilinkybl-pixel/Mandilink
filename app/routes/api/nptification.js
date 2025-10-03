// routes/notificationRoutes.js
const express = require("express");
const router = express.Router();
const {
  triggerNotification,
  getNotifications,
  markAsRead,
} = require("../../controller/api/notificationapi");

// Manual trigger (optional)
router.post("/trigger", triggerNotification);

// Get notifications (filter by state/district)
router.get("/", getNotifications);

// Mark as read
router.patch("/:id/read/:userId", markAsRead);

module.exports = router;
