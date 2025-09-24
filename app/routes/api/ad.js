const express = require("express");
const router = express.Router();
const adController = require("../../controller/api/aj");

// Get all ads
router.get("/", adController.getAllAds);

// Get ad by ID
router.get("/:id", adController.getAdById);

module.exports = router;


