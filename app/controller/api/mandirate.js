const State = require("../../models/stateSchema");
const Mandi = require("../../models/mandilistmodel");
const MandiRate = require("../../models/dealymandiRateuapdate");
const LISTING = require("../../models/lisingSchema");
const Company = require("../../models/companylisting");

class MandiRateController {
  /**
   * GET /api/mandirates/:mandiId
   * Fetch mandi rates by selected mandi
   */
  async getMandiRates(req, res) {
    try {
      const { mandiId } = req.params;

      const rates = await MandiRate.find({ mandi: mandiId })
        .populate("mandi", "name district")
        .populate("state", "name")
        .populate("rates.commodity", "name")
        .lean();

      if (!rates.length) {
        return res.status(404).json({ success: false, message: "No rates found for this mandi" });
      }

      // Format response
      const result = rates.map(rate => ({
        mandi: rate.mandi?.name || "Unknown",
        district: rate.mandi?.district || "",
        state: rate.state?.name || "",
        commodities: rate.rates.map(r => ({
          commodity: r.commodity?.name || "Unknown",
          minimum: r.minimum,
          maximum: r.maximum,
          estimatedArrival: r.estimatedArrival,
          updatedAt: r.updatedAt,
        })),
      }));

      res.status(200).json({ success: true, mandiRates: result });
    } catch (error) {
      console.error("Error in getMandiRates:", error);
      res.status(500).json({ success: false, message: "Server error" });
    }
  }

  /**
   * GET /api/mandirate/:userId
   * Fetch mandi rates based on current user’s district
   */
  async getUserLocationRates(req, res) {
    try {
      const { userId } = req.params;

      // find user in Listing or Company
      let user = await LISTING.findById(userId).lean();
      if (!user) user = await Company.findById(userId).lean();
      if (!user) return res.status(404).json({ success: false, message: "User not found" });

      // find mandis in user’s district
      const mandis = await Mandi.find({ state: user.state, district: user.district }).select("_id name");
      if (!mandis.length) {
        return res.status(404).json({ success: false, message: "No mandis found in user district" });
      }

      // fetch mandi rates for those mandis
      const mandiRates = await MandiRate.find({ mandi: { $in: mandis.map(m => m._id) } })
        .populate("mandi", "name")
        .populate("state", "name")
        .populate("rates.commodity", "name")
        .lean();

      if (!mandiRates.length) {
        return res.status(404).json({ success: false, message: "No rates found for this user’s location" });
      }

      // Group mandi-wise
      const result = mandiRates.map(rate => ({
        mandi: rate.mandi?.name || "Unknown",
        district: rate.district,
        state: rate.state?.name || "",
        commodities: rate.rates.map(r => ({
          commodity: r.commodity?.name || "Unknown",
          minimum: r.minimum,
          maximum: r.maximum,
          estimatedArrival: r.estimatedArrival,
          updatedAt: r.updatedAt,
        })),
      }));

      res.status(200).json({
        success: true,
        userLocation: { state: user.state, district: user.district, mandi: user.mandi || null },
        mandiRates: result,
      });
    } catch (error) {
      console.error("Error in getUserLocationRates:", error);
      res.status(500).json({ success: false, message: "Server error" });
    }
  }

  // Search mandi rates by mandi name
async searchMandiRates(req, res) {
  try {
    console.log("Query params received:", req.query);
    const { mandiName } = req.query;

    if (!mandiName) {
      return res
        .status(400)
        .json({ success: false, message: "mandiName query param is required" });
    }

    // Find matching mandis by name (case-insensitive)
    const mandis = await Mandi.find({
      name: { $regex: mandiName.trim(), $options: "i" }
    }).select("_id name district");

    console.log("mandis", mandis);

    if (!mandis.length) {
      return res.status(404).json({
        success: false,
        message: "No mandi found for given name"
      });
    }

    const mandiIds = mandis.map(m => m._id);

    // Fetch mandi rates linked to those mandi IDs
    const rates = await MandiRate.find({ mandi: { $in: mandiIds } })
      .populate("mandi", "name district")
      .populate("state", "name")
      .populate("rates.commodity", "name")
      .lean();

    // Map mandis and attach rates if they exist
    const result = mandis.map(mandi => {
      const rate = rates.find(r => r.mandi._id.toString() === mandi._id.toString());
      return {
        mandi: mandi.name,
        district: mandi.district,
        state: rate?.state?.name || "",
        commodities: rate?.rates?.map(r => ({
          commodity: r.commodity?.name || "Unknown",
          minimum: r.minimum,
          maximum: r.maximum,
          estimatedArrival: r.estimatedArrival,
          updatedAt: r.updatedAt
        })) || [] // empty array if no rates
      };
    });

    res.status(200).json({ success: true, mandiRates: result });
  } catch (error) {
    console.error("Error in searchMandiRates:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
}




}

module.exports = new MandiRateController();