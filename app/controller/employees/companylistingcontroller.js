// app/controller/employees/companylistingcontroller.js
const Company = require("../../models/companylisting");
const Category = require("../../models/category.model");
const State = require("../../models/stateSchema");
const Mandi = require("../../models/mandilistmodel");
const SecureEmployee = require("../../models/adminEmployee");

class CompanyController {
  toTitleCase(str) {
    if (!str) return '';
    return str.toLowerCase().replace(/\w\S*/g, function(txt) {
      return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();
    });
  }

  getCompanies = async (req, res) => {
    try {
      const user = req.user;
      const userdetails = await SecureEmployee.findById(user.id);
      if (!userdetails) {
        throw new Error('User not found');
      }

      const categories = await Category.find().sort({ name: 1 });
      const states = await State.find().sort({ name: 1 });

      const stateMap = states.reduce((acc, state) => {
        acc[state._id] = state.name;
        return acc;
      }, {});

      // Update companies with missing user.id
      await Company.updateMany(
        { user: { $exists: false } },
        { $set: { user: user.id } }
      );

      // Get filter values (prefer req.body for POST, fallback to req.query for GET)
      const { category, state, district, mandi } = req.body || req.query || {};

      const query = {};
      if (category) query.category = this.toTitleCase(category);
      if (state) query.state = this.toTitleCase(state);
      if (district) query.district = this.toTitleCase(district);
      if (mandi) query.mandi = this.toTitleCase(mandi);

      // Filter for today's companies (September 9, 2025, in IST)
      const now = new Date(); // Current date: September 9, 2025, 08:02 PM IST
      const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      startOfDay.setHours(0, 0, 0, 0); // Start of day in IST
      const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      endOfDay.setHours(23, 59, 59, 999); // End of day in IST
      query.createdAt = { $gte: startOfDay, $lte: endOfDay };

      let todayCompanies = [];
      try {
        todayCompanies = await Company.find(query).sort({ name: 1 });
        console.log(`Fetched ${todayCompanies.length} companies for today`);
      } catch (err) {
        console.error('Error fetching todayCompanies:', err);
        todayCompanies = []; // Fallback to empty array
      }

      // Fetch all companies for serial number calculations
      const allQuery = { ...query };
      delete allQuery.createdAt; // Remove date filter
      let allCompanies = [];
      try {
        allCompanies = await Company.find(allQuery).sort({ name: 1 });
        console.log(`Fetched ${allCompanies.length} companies for serial number calculations`);
      } catch (err) {
        console.error('Error fetching allCompanies:', err);
        allCompanies = []; // Fallback to empty array
      }

      res.render("employees/company", {
        user,
        userdetails,
        employee: userdetails,
        stateMap,
        categories,
        states,
        todayCompanies,
        allCompanies,
        selectedCategory: category || "",
        selectedState: state || "",
        selectedDistrict: district || "",
        selectedMandi: mandi || "",
        success_msg: req.flash("success_msg"),
        error_msg: req.flash("error_msg")
      });
    } catch (err) {
      console.error('Error in getCompanies:', err);
      req.flash("error_msg", "Error loading company page");
      res.redirect("/employees/companylist");
    }
  };

  addCompanies = async (req, res) => {
    try {
      const { category, state, district, mandi, names, addresses, contactPersons, contactNumbers } = req.body;
      let companyDocs = [];

      const namesArr = Array.isArray(names) ? names : [names].filter(Boolean);
      const addressesArr = Array.isArray(addresses) ? addresses : [addresses].filter(Boolean);
      const contactPersonsArr = Array.isArray(contactPersons) ? contactPersons : [contactPersons].filter(Boolean);
      const contactNumbersArr = Array.isArray(contactNumbers) ? contactNumbers : [contactNumbers].filter(Boolean);

      const categoryTitle = this.toTitleCase(category);
      const stateTitle = this.toTitleCase(state);
      const districtTitle = this.toTitleCase(district);
      const mandiTitle = this.toTitleCase(mandi);

      for (let i = 0; i < namesArr.length; i++) {
        const trimmedName = namesArr[i]?.trim();
        if (trimmedName) {
          const trimmedAddress = addressesArr[i]?.trim() || '';
          const trimmedContactPerson = contactPersonsArr[i]?.trim() || '';
          const trimmedContactNumber = contactNumbersArr[i]?.trim() || '';

          companyDocs.push({
            user_id: req.user.id,
            category: categoryTitle,
            state: stateTitle,
            district: districtTitle,
            mandi: mandiTitle,
            name: this.toTitleCase(trimmedName),
            address: this.toTitleCase(trimmedAddress),
            contactPerson: this.toTitleCase(trimmedContactPerson),
            contactNumber: trimmedContactNumber
          });
        }
      }

      if (companyDocs.length > 0) {
        await Company.insertMany(companyDocs);
        req.flash("success_msg", `${companyDocs.length} company(s) added successfully`);
      } else {
        req.flash("error_msg", "No valid company entered");
      }

      res.redirect("/employees/companylist");
    } catch (err) {
      console.error(err);
      req.flash("error_msg", "Error adding companies");
      res.redirect("/employees/companylist");
    }
  };

  editCompany = async (req, res) => {
    try {
      const { id } = req.params;
      const { name, address, contactPerson, contactNumber } = req.body;

      const trimmedName = name ? name.trim() : '';
      const trimmedAddress = address ? address.trim() : '';
      const trimmedContactPerson = contactPerson ? contactPerson.trim() : '';
      const trimmedContactNumber = contactNumber ? contactNumber.trim() : '';

      await Company.findByIdAndUpdate(id, {
        name: this.toTitleCase(trimmedName),
        address: this.toTitleCase(trimmedAddress),
        contactPerson: this.toTitleCase(trimmedContactPerson),
        contactNumber: trimmedContactNumber
      });
      req.flash("success_msg", "Company updated successfully");
      res.redirect("/employees/companylist");
    } catch (err) {
      console.error(err);
      req.flash("error_msg", "Error updating company");
      res.redirect("/employees/companylist");
    }
  };

  deleteCompany = async (req, res) => {
    try {
      const { id } = req.params;
      await Company.findByIdAndDelete(id);
      req.flash("success_msg", "Company deleted successfully");
      res.redirect("/employees/companylist");
    } catch (err) {
      console.error(err);
      req.flash("error_msg", "Error deleting company");
      res.redirect("/employees/companylist");
    }
  };

  getDistricts = async (req, res) => {
    try {
      const state = await State.findById(req.params.stateId);
      if (!state) return res.json([]);
      res.json(state.districts);
    } catch (err) {
      console.error(err);
      res.json([]);
    }
  };

  getMandis = async (req, res) => {
    try {
      const mandis = await Mandi.find({ district: req.params.district });
      res.json(mandis.map(m => ({ id: m._id, name: m.name })));
    } catch (err) {
      console.error(err);
      res.json([]);
    }
  };
}

module.exports = new CompanyController();