const express = require("express");
const router = express.Router();
const bidController = require("../../controller/api/bid");

// Create a new auction
router.post("/create", bidController.createBid);

// Place a bid on an auction
router.post("/bid/:bidId", bidController.placeBid);

// Get all auctions
router.get("/", bidController.getAllBids);

// Get single auction by ID
router.get("/:id", bidController.getBidById);

module.exports = router;
