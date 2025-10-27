const Ad = require("../../models/topads");

class AdController {
  // Get all ads
  async getAllAds(req, res) {
    try {
      const ads = await Ad.find()
        .populate("user_id", "name email")      // optional: populate ad owner
        .populate("createdBy", "name email");   // optional: populate creator/admin
      res.status(200).json({ success: true, data: ads });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  }
// ✅ Get Top Ads
async getTopAds(req, res) {
  try {
    const ads = await Ad.find({ type: "Top", isActive: true })
      .populate("user_id", "name email")
      .populate("createdBy", "name email");

    res.status(200).json({ success: true, data: ads });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
}

// ✅ Get Bottom Ads
async getBottomAds(req, res) {
  try {
    const ads = await Ad.find({ type: "Bottom", isActive: true })
      .populate("user_id", "name email")
      .populate("createdBy", "name email");

    res.status(200).json({ success: true, data: ads });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
}

// ✅ Get Side Ads
async getSideAds(req, res) {
  try {
    const ads = await Ad.find({ type: "Side", isActive: true })
      .populate("user_id", "name email")
      .populate("createdBy", "name email");

    res.status(200).json({ success: true, data: ads });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
}

// ✅ Get Sponsored Ads
async getSponsoredAds(req, res) {
  try {
    const ads = await Ad.find({ type: "Sponsored", isActive: true })
      .populate("user_id", "name email")
      .populate("createdBy", "name email");

    res.status(200).json({ success: true, data: ads });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
}

  // Get single ad by ID
  async getAdById(req, res) {
    try {
      const ad = await Ad.findById(req.params.id)
        .populate("user_id", "name email")
        .populate("createdBy", "name email");

      if (!ad) return res.status(404).json({ success: false, error: "Ad not found" });

      res.status(200).json({ success: true, data: ad });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  }
}

module.exports = new AdController();
