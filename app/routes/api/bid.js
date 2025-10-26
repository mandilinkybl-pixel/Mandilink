const express = require("express");
const router = express.Router();
const bidController = require("../../controller/api/bid");
const { convertToWebp, uploadbid } = require("../../multer/bid.multer");

// Create a new auction
router.post("/create", uploadbid.single("image"), convertToWebp, bidController.createBid);

// Place a bid on an auction
router.post("/bid/:bidId", bidController.placeBid);

// Get all auctions
router.get("/", bidController.getAllBids);

// Get single auction by ID

router.get("/:id", bidController.getBidById);

module.exports = router;
