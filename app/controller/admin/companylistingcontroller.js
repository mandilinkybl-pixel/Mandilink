const Company = require("../../models/companylisting");
const Category = require("../../models/category.model");
const State = require("../../models/stateSchema");
const Mandi = require("../../models/mandilistmodel");
const SecureEmployee = require("../../models/adminEmployee");

class CompanyController {
  // Helper function to convert string to title case
  toTitleCase(str) {
    if (!str) return '';
    return str.toLowerCase().replace(/\w\S*/g, function(txt) {
      return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();
    });
  }

  // Show page and optionally filtered companies
  getCompanies = async (req, res) => {
    try {
      const user = req.user;
      const userdetails = await SecureEmployee.findById(user.id);
      const categories = await Category.find().sort({ name: 1 });
      const states = await State.find().sort({ name: 1 });

      // Debug: Log states to verify data
      // console.log('States:', states);

      // Ensure statenameMap is always defined, even if states is empty
      const statenameMap = states.reduce((acc, state) => {
        acc[state._id] = state.name;
        return acc;
      }, {});
      // console.log('State Name Map:', statenameMap);

      // Update companies with missing user.id
    // Update user if missing
await Company.updateMany(
  { user: { $exists: false } },
  { $set: { user: user.id } }
);

// Update pushToken if missing
await Company.updateMany(
  { pushToken: { $exists: false } },
  { $set: { pushToken: true } }
);


      // Get filter values (prefer req.body for POST, fallback to req.query for GET)
      const { category, state, district, mandi } = req.body || req.query || {};

      const query = {};
      if (category) query.category = this.toTitleCase(category);
      if (state) query.state = this.toTitleCase(state);
      if (district) query.district = this.toTitleCase(district);
      if (mandi) query.mandi = this.toTitleCase(mandi);

      const companies = await Company.find(query).sort({ name: 1 });

      // console.log('Companies:', companies);

      // Pass stateMap to match what the template expects (rename from statenameMap)
      res.render("admin/company", {
        user,
        userdetails,
        stateMap: statenameMap,  // Renamed to stateMap to fix the ReferenceError
        categories,
        states,
        companies,
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
      res.redirect("/admin/companylist");
    }
  };

  // Add multiple companies, using hidden selection values
  addCompanies = async (req, res) => {
    try {
      const { category, state, district, mandi, names, addresses, contactPersons, contactNumbers } = req.body;
      let companyDocs = [];

      // If only one row, names, etc may be string not array
      const namesArr = Array.isArray(names) ? names : [names].filter(Boolean);
      const addressesArr = Array.isArray(addresses) ? addresses : [addresses].filter(Boolean);
      const contactPersonsArr = Array.isArray(contactPersons) ? contactPersons : [contactPersons].filter(Boolean);
      const contactNumbersArr = Array.isArray(contactNumbers) ? contactNumbers : [contactNumbers].filter(Boolean);

      // Convert filter fields to title case once
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
            contactNumber: trimmedContactNumber  // No title case for phone numbers
          });
        }
      }

      if (companyDocs.length > 0) {
        await Company.insertMany(companyDocs);
        req.flash("success_msg", `${companyDocs.length} company(s) added successfully`);
      } else {
        req.flash("error_msg", "No valid company entered");
      }

      res.redirect("/admin/companylist");
    } catch (err) {
      console.error(err);
      req.flash("error_msg", "Error adding companies");
      res.redirect("/admin/companylist");
    }
  };

  // Edit a company
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
        contactNumber: trimmedContactNumber  // No title case for phone numbers
      });
      req.flash("success_msg", "Company updated successfully");
      res.redirect("/admin/companylist");
    } catch (err) {
      console.error(err);
      req.flash("error_msg", "Error updating company");
      res.redirect("/admin/companylist");
    }
  };

  // Delete a company
  deleteCompany = async (req, res) => {
    try {
      const { id } = req.params;
      await Company.findByIdAndDelete(id);
      req.flash("success_msg", "Company deleted successfully");
      res.redirect("/admin/companylist");
    } catch (err) {
      console.error(err);
      req.flash("error_msg", "Error deleting company");
      res.redirect("/admin/companylist");
    }
  };

  // Get districts by state
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

  // Get mandis by district
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