const MandiRate = require("../../models/dealymandiRateuapdate");
const State = require("../../models/stateSchema");
const Mandi = require("../../models/mandilistmodel");
const Commodity = require("../../models/commodityname"); // Make sure you have this model!
const SecureEmployee = require("../../models/adminEmployee");

class MandiRateController {
  // Page to show rates, with filters
  getRatesPage = async (req, res) => {
    try {
      const user = req.user;
      const userdetails = await SecureEmployee.findById(user.id);
      const states = await State.find().sort({ name: 1 });
      const commodities = await Commodity.find().sort({ name: 1 });
      // Filter params
      const { state, district, mandi } = req.query || {};
      let query = {};
      if (state) query.state = state;
      if (district) query.district = district;
      if (mandi) query.mandi = mandi;
      const rates = await MandiRate.find(query)
        .populate("state")
        .populate("mandi")
        .populate("rates.commodity")
        .sort({ "mandi.name": 1 });

      res.render("admin/mandirate", {
        user,
        userdetails,
        states,
        commodities,
        rates,
        selectedState: state || "",
        selectedDistrict: district || "",
        selectedMandi: mandi || "",
        success_msg: req.flash("success_msg"),
        error_msg: req.flash("error_msg")
      });
    } catch (err) {
      console.error(err);
      req.flash("error_msg", "Error loading Mandi Rate page");
      res.redirect("/admin/mandirate");
    }
  };

  // Add/Update rates for a mandi
  addOrUpdateRates = async (req, res) => {
    try {
      const { state, district, mandi, commodity_ids, minimums, maximums, arrivals } = req.body;
      if (!state || !district || !mandi || !commodity_ids) {
        req.flash("error_msg", "Please fill all required fields");
        return res.redirect("/admin/mandirate");
      }
      const commoditiesArr = Array.isArray(commodity_ids) ? commodity_ids : [commodity_ids];
      const minsArr = Array.isArray(minimums) ? minimums : [minimums];
      const maxArr = Array.isArray(maximums) ? maximums : [maximums];
      const arrArr = Array.isArray(arrivals) ? arrivals : [arrivals];
      // Build rates array, skip if all empty
      const rates = [];
      for (let i = 0; i < commoditiesArr.length; i++) {
        // Only push if at least one field is filled
        if (minsArr[i] !== "" || maxArr[i] !== "" || arrArr[i] !== "") {
          rates.push({
            commodity: commoditiesArr[i],
            minimum: minsArr[i] ? Number(minsArr[i]) : 0,
            maximum: maxArr[i] ? Number(maxArr[i]) : 0,
            estimatedArrival: arrArr[i] ? Number(arrArr[i]) : null
          });
        }
      }
      if (!rates.length) {
        req.flash("error_msg", "No rates provided");
        return res.redirect("/admin/mandirate");
      }
      // Upsert: If exists, update; else insert
      await MandiRate.findOneAndUpdate(
        { state, district, mandi },
        { state, district, mandi, rates },
        { upsert: true, new: true }
      );
      req.flash("success_msg", "Mandi rates updated successfully");
      res.redirect("/admin/mandirate");
    } catch (err) {
      console.error(err);
      req.flash("error_msg", "Error saving mandi rates");
      res.redirect("/admin/mandirate");
    }
  };

  // Multiple add commodities for a single mandi
  addMultipleCommodities = async (req, res) => {
    const { mandiRateId } = req.params;
    const { commodity_ids, minimums, maximums, arrivals } = req.body;
    try {
      const mandiRate = await MandiRate.findById(mandiRateId);
      if (!mandiRate) return res.status(404).send("Mandi Rate not found");
      for (let i = 0; i < commodity_ids.length; i++) {
        if (commodity_ids[i]) {
          mandiRate.rates.push({
            commodity: commodity_ids[i],
            minimum: Number(minimums[i]),
            maximum: Number(maximums[i]),
            estimatedArrival: arrivals[i] ? Number(arrivals[i]) : null
          });
        }
      }
      await mandiRate.save();
      req.flash("success_msg", "Commodities added.");
      res.redirect("/admin/mandirate");
    } catch (err) {
      req.flash("error_msg", "Error adding commodities");
      res.redirect("/admin/mandirate");
    }
  };

  // Edit a single commodity rate for a mandi
  editCommodity = async (req, res) => {
    const { mandiRateId, commodityId } = req.params;
    const { minimum, maximum, estimatedArrival } = req.body;
    try {
      const mandiRate = await MandiRate.findById(mandiRateId);
      if (!mandiRate) return res.status(404).send("Mandi Rate not found");
      const rate = mandiRate.rates.find(r => String(r.commodity) === String(commodityId));
      if (!rate) return res.status(404).send("Commodity not found");
      rate.minimum = Number(minimum);
      rate.maximum = Number(maximum);
      rate.estimatedArrival = estimatedArrival ? Number(estimatedArrival) : null;
      await mandiRate.save();
      req.flash("success_msg", "Commodity rate updated.");
      res.redirect("/admin/mandirate");
    } catch (err) {
      req.flash("error_msg", "Error updating commodity rate");
      res.redirect("/admin/mandirate");
    }
  };

  // Delete a commodity rate for a mandi
  deleteCommodity = async (req, res) => {
    const { mandiRateId, commodityId } = req.params;
    try {
      const mandiRate = await MandiRate.findById(mandiRateId);
      if (!mandiRate) return res.status(404).send("Mandi Rate not found");
      mandiRate.rates = mandiRate.rates.filter(r => String(r.commodity) !== String(commodityId));
      await mandiRate.save();
      req.flash("success_msg", "Commodity rate deleted.");
      res.redirect("/admin/mandirate");
    } catch (err) {
      req.flash("error_msg", "Error deleting commodity rate");
      res.redirect("/admin/mandirate");
    }
  };

  // For AJAX: Get districts by state
  getDistricts = async (req, res) => {
    try {
      const state = await State.findById(req.params.stateId);
      res.json(state ? state.districts : []);
    } catch (err) {
      res.json([]);
    }
  };

  // For AJAX: Get mandis by district
  getMandis = async (req, res) => {
    try {
      const mandis = await Mandi.find({ district: req.params.district });
      res.json(mandis.map(m => ({ id: m._id, name: m.name })));
    } catch (err) {
      res.json([]);
    }
  };
}

module.exports = new MandiRateController();