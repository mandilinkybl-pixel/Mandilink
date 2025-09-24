const Bid = require("../../models/bidpost");

class BidController {
  // ----------------------
  // Create a new auction/bid
  // ----------------------
  async createBid(req, res) {
    try {
      const {
        commodityName,
        harvestTiming,
        quality,
        quantityAmount,
        quantityUnit,
        startingPrice,
        duration,
        createdBy,
        createdByModel,
        image
      } = req.body;

      if (!commodityName || !harvestTiming || !quality || !quantityAmount || !quantityUnit || !startingPrice || !duration || !createdBy || !createdByModel) {
        return res.status(400).json({ success: false, error: "Missing required fields" });
      }

      const bid = new Bid({
        commodityName,
        harvestTiming,
        quality,
        quantity: { amount: quantityAmount, unit: quantityUnit },
        startingPrice,
        currentPrice: startingPrice,
        duration,
        createdBy,
        createdByModel,
        image
      });

      const savedBid = await bid.save();
      res.status(201).json({ success: true, data: savedBid });
    } catch (err) {
      console.error(err);
      res.status(500).json({ success: false, error: err.message });
    }
  }

  // ----------------------
  // Place a bid on an auction
  // ----------------------
  async placeBid(req, res) {
    try {
      const { bidId } = req.params;
      const { user, userModel, amount } = req.body;

      const auction = await Bid.findById(bidId);
      if (!auction) return res.status(404).json({ success: false, error: "Auction not found" });
      if (auction.status !== "active") return res.status(400).json({ success: false, error: "Auction is not active" });
      if (amount <= auction.currentPrice) return res.status(400).json({ success: false, error: "Bid must be higher than current price" });

      auction.bids.push({ user, userModel, amount });
      auction.currentPrice = amount;

      await auction.save();
      res.status(200).json({ success: true, data: auction });
    } catch (err) {
      console.error(err);
      res.status(500).json({ success: false, error: err.message });
    }
  }

  
  // ----------------------
  // Get all auctions
  // ----------------------
  async getAllBids(req, res) {
    try {
      const bids = await Bid.find().populate("createdBy").populate("bids.user");
      res.status(200).json({ success: true, data: bids });
    } catch (err) {
      console.error(err);
      res.status(500).json({ success: false, error: err.message });
    }
  }

  // ----------------------
  // Get single auction by ID
  // ----------------------
  async getBidById(req, res) {
    try {
      const bid = await Bid.findById(req.params.id).populate("createdBy").populate("bids.user");
      if (!bid) return res.status(404).json({ success: false, error: "Auction not found" });
      res.status(200).json({ success: true, data: bid });
    } catch (err) {
      console.error(err);
      res.status(500).json({ success: false, error: err.message });
    }
  }
}

module.exports = new BidController();
