const express = require("express");
const router = express.Router();
const BlockUnblockListingController = require("../../controller/admin/blockalllisting");
const { adminAuth } = require("../../middleware/authadmin");

// Active listings
router.get("/", adminAuth, BlockUnblockListingController.getAllListings);

// Blocked listings
router.get("/blocked", adminAuth, BlockUnblockListingController.getBlockedListings);

// Block a listing
router.get("/block/:id", adminAuth, BlockUnblockListingController.blockListing);

// Unblock a listing
router.get("/unblock/:id", adminAuth, BlockUnblockListingController.unblockListing);

module.exports = router;
