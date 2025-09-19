// routes/admin/auctions.js
const express = require("express");
const router = express.Router();
const AuctionController = require("../../controller/admin/bid");
const { adminAuth } = require("../../middleware/authadmin"); // if required; remove if not


router.get("/", adminAuth, (req,res)=>AuctionController.list(req,res));

// Create auction
router.post("/create", adminAuth, (req,res)=>AuctionController.create(req,res));

// Update auction
router.post("/update/:id", adminAuth, (req,res)=>AuctionController.update(req,res));

// Delete single auction
router.get("/delete/:id", adminAuth, (req,res)=>AuctionController.delete(req,res));

// Delete by duration
router.post("/delete-by-duration", adminAuth, (req,res)=>AuctionController.deleteByDuration(req,res));

// Delete by date
router.post("/delete-by-date", adminAuth, (req,res)=>AuctionController.deleteByDate(req,res));

// Place bid
router.post("/bid", adminAuth, (req,res)=>AuctionController.placeBid(req,res));

module.exports = router;
