const express = require("express");
const router = express.Router();
const adController = require("../../controller/api/aj");

// Get all ads
router.get("/", adController.getAllAds);

// Get Top Ads
router.get("/top", adController.getTopAds);

// Get Bottom Ads
router.get("/bottom", adController.getBottomAds);

// Get Side Ads
router.get("/side", adController.getSideAds);

// Get Sponsored Ads
router.get("/sponsored", adController.getSponsoredAds);

// Get ad by ID
router.get("/:id", adController.getAdById);

module.exports = router;


