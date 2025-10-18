// routes/notificationRoutes.js
const express = require("express");
const router = express.Router();
const userNotificationController = require("../../controller/api/notificationapi");

router.get("/:userId",(req, res) => userNotificationController.getNotifications(req, res));
router.get("/:userId/unread-count",(req, res) => userNotificationController.getUnreadCount(req, res));
router.post("/:userId/:id/read",(req, res) => userNotificationController.markAsRead(req, res));
router.post("/:userId/read-all",(req, res) => userNotificationController.markAllAsRead(req, res));

module.exports = router;
