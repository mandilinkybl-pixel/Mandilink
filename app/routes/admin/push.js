const express = require("express");
const router = express.Router();
const notificationController = require("../../controller/admin/pushnotification");
const { adminAuth } = require("../../middleware/authadmin");


router.get("/",adminAuth, notificationController.showForm.bind(notificationController));
router.post("/send",adminAuth, notificationController.sendNotification.bind(notificationController));

// AJAX
router.get("/districts",adminAuth, notificationController.getDistricts.bind(notificationController));
router.get("/mandis",adminAuth, notificationController.getMandis.bind(notificationController));


module.exports = router;
