const Company = require("../../models/companylisting");
const Category = require("../../models/category.model");
const State = require("../../models/stateSchema");
const Mandi = require("../../models/mandilistmodel");
const SecureEmployee = require("../../models/adminEmployee");

class CompanyController {
  // Show page and optionally filtered companies
  getCompanies = async (req, res) => {
    try {
      const user = req.user;
      const userdetails = await SecureEmployee.findById(user.id);
      const categories = await Category.find().sort({ name: 1 });
      const states = await State.find().sort({ name: 1 });

      // Get filter values (from POST or GET)
      const { category, state, district, mandi } = req.body || {};

      const query = {};
      if (category) query.category = category;
      if (state) query.state = state;
      if (district) query.district = district;
      if (mandi) query.mandi = mandi;

      const companies = await Company.find(query).sort({ name: 1 });
      const employee = await SecureEmployee.findById(user.id);
      res.render("employees/company", {
        user,
        userdetails,
        categories,
        states,
        employee,
        companies,
        selectedCategory: category || "",
        selectedState: state || "",
        selectedDistrict: district || "",
        selectedMandi: mandi || "",
        success_msg: req.flash("success_msg"),
        error_msg: req.flash("error_msg")
      });
    } catch (err) {
      console.error(err);
      req.flash("error_msg", "Error loading company page");
      res.redirect("/employees/companylist");
    }
  };

  // Add multiple companies, using hidden selection values
  addCompanies = async (req, res) => {
    try {
      const { category, state, district, mandi, names, addresses, contactPersons, contactNumbers } = req.body;
      let companyDocs = [];

      // If only one row, names, etc may be string not array
      const namesArr = Array.isArray(names) ? names : [names];
      const addressesArr = Array.isArray(addresses) ? addresses : [addresses];
      const contactPersonsArr = Array.isArray(contactPersons) ? contactPersons : [contactPersons];
      const contactNumbersArr = Array.isArray(contactNumbers) ? contactNumbers : [contactNumbers];

      for (let i = 0; i < namesArr.length; i++) {
        if (namesArr[i]?.trim()) {
          companyDocs.push({
            category,
            state,
            district,
            mandi,
            name: namesArr[i].trim(),
            address: addressesArr[i].trim(),
            contactPerson: contactPersonsArr[i].trim(),
            contactNumber: contactNumbersArr[i].trim()
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

  // Edit a company
  // Edit a company (already modal-compatible)
editCompany = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, address, contactPerson, contactNumber } = req.body;
    await Company.findByIdAndUpdate(id, { name, address, contactPerson, contactNumber });
    req.flash("success_msg", "Company updated successfully");
    res.redirect("/employees/companylist");
  } catch (err) {
    console.error(err);
    req.flash("error_msg", "Error updating company");
    res.redirect("/employees/companylist");
  }
};
  // Delete a company
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