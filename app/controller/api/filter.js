const Category = require("../../models/category.model");
const State = require("../../models/stateSchema");
const Mandi = require("../../models/mandilistmodel");
const User = require("../../models/lisingSchema");
const Company = require("../../models/companylisting");

class FilterController {

  // ✅ Fetch all categories
  async getCategories(req, res) {
    try {
      const categories = await Category.find({ status: "active" }).sort({ name: 1 });
      res.json({ categories });
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: "Server error" });
    }
  }

  // ✅ Fetch all states
  async getStates(req, res) {
    try {
      const states = await State.find().sort({ name: 1 });
      res.json({ states });
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: "Server error" });
    }
  }

  // ✅ Fetch districts by state (combined from State model and Mandi table)
  async getDistrictsByState(req, res) {
    try {
      const { stateId } = req.params;

      // Get districts from State model
      const state = await State.findById(stateId);
      const stateDistricts = state ? state.districts : [];

      // Optional: Add districts from User & Company collections
      const userDistricts = await User.find({ state: stateId }).distinct("district");
      const companyDistricts = await Company.find({ state: stateId }).distinct("district");

      const districts = Array.from(new Set([...stateDistricts, ...userDistricts, ...companyDistricts]));

      res.json({ districts });
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: "Server error" });
    }
  }

  // ✅ Fetch mandis by district
  async getMandisByDistrict(req, res) {
    try {
      const { district } = req.params;

      // Mandis from Mandi collection
      const mandiFromMandi = await Mandi.find({ district }).distinct("name");

      // Optional: Mandis from User & Company collections
      const userMandis = await User.find({ district }).distinct("mandi");
      const companyMandis = await Company.find({ district }).distinct("mandi");

      const mandis = Array.from(new Set([...mandiFromMandi, ...userMandis, ...companyMandis]));

      res.json({ mandis });
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: "Server error" });
    }
  }

}

module.exports = new FilterController();
