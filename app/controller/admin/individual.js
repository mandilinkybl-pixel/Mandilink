const mongoose = require("mongoose");
const LISTING = require("../../models/lisingSchema");
const Category = require("../../models/category.model");
const State = require("../../models/stateSchema");
const Mandi = require("../../models/mandilistmodel");
const SecureEmployee = require("../../models/adminEmployee");

class UserController {
  // Helper function to convert string to title case
  toTitleCase(str) {
    if (!str) return '';
    return str.toLowerCase().replace(/\w\S*/g, function(txt) {
      return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();
    });
  }

  // Show page and optionally filtered users
  getUsers = async (req, res) => {
    try {
      const user = req.user;
      const userdetails = await SecureEmployee.findById(user.id);
      const categories = await Category.find().sort({ name: 1 });
      const states = await State.find().sort({ name: 1 });

      // Ensure statenameMap is always defined, even if states is empty
      const statenameMap = states.reduce((acc, state) => {
        acc[state._id] = state.name;
        return acc;
      }, {});

      // Update users with missing user.id
      await LISTING.updateMany(
        { user: { $exists: false } }, // or { user: null } if some are explicitly null
        { $set: { user: user.id } }
      );

      // Get filter values (prefer req.body for POST, fallback to req.query for GET)
      const { category, state, district, mandi } = req.body || req.query || {};

      const query = {};
      if (category) query.category = this.toTitleCase(category);
      if (state) query.state = this.toTitleCase(state);
      if (district) query.district = this.toTitleCase(district);
      if (mandi) query.mandi = this.toTitleCase(mandi);

      const users = await LISTING.find(query).sort({ name: 1 });

      res.render("admin/listing", {
        user,
        userdetails,
        stateMap: statenameMap,
        categories,
        states,
        users,
        selectedCategory: category || "",
        selectedState: state || "",
        selectedDistrict: district || "",
        selectedMandi: mandi || "",
        success_msg: req.flash("success_msg"),
        error_msg: req.flash("error_msg")
      });
    } catch (err) {
      console.error('Error in getUsers:', err);
      req.flash("error_msg", "Error loading user page");
      res.redirect("/admin/userlist");
    }
  };

  // Add multiple users, using hidden selection values
  addUsers = async (req, res) => {
    try {
      const { category, state, district, mandi, names, addresses, contactNumbers } = req.body;
      let userDocs = [];

      // If only one row, names, etc may be string not array
      const namesArr = Array.isArray(names) ? names : [names].filter(Boolean);
      const addressesArr = Array.isArray(addresses) ? addresses : [addresses].filter(Boolean);
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
          const trimmedContactNumber = contactNumbersArr[i]?.trim() || '';

          userDocs.push({
            user_id: req.user.id,
            category: categoryTitle,
            state: stateTitle,
            district: districtTitle,
            mandi: mandiTitle,
            role: "user",
            name: this.toTitleCase(trimmedName),
            address: this.toTitleCase(trimmedAddress),
            contactNumber: trimmedContactNumber
          });
        }
      }

      if (userDocs.length > 0) {
        await LISTING.insertMany(userDocs);
        req.flash("success_msg", `${userDocs.length} user(s) added successfully`);
      } else {
        req.flash("error_msg", "No valid user entered");
      }

      res.redirect("/admin/userlist");
    } catch (err) {
      console.error(err);
      req.flash("error_msg", "Error adding users");
      res.redirect("/admin/userlist");
    }
  };

  // Edit a user
  editUser = async (req, res) => {
    try {
      const { id } = req.params;
      const { name, address, contactNumber } = req.body;

      const trimmedName = name ? name.trim() : '';
      const trimmedAddress = address ? address.trim() : '';
      const trimmedContactNumber = contactNumber ? contactNumber.trim() : '';

      await LISTING.findByIdAndUpdate(id, { 
        name: this.toTitleCase(trimmedName),
        address: this.toTitleCase(trimmedAddress),
        contactNumber: trimmedContactNumber
      });
      req.flash("success_msg", "User updated successfully");
      res.redirect("/admin/userlist");
    } catch (err) {
      console.error(err);
      req.flash("error_msg", "Error updating user");
      res.redirect("/admin/userlist");
    }
  };

  // Delete a user
  deleteUser = async (req, res) => {
    try {
      const { id } = req.params;
      await LISTING.findByIdAndDelete(id);
      req.flash("success_msg", "User deleted successfully");
      res.redirect("/admin/userlist");
    } catch (err) {
      console.error(err);
      req.flash("error_msg", "Error deleting user");
      res.redirect("/admin/userlist");
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

module.exports = new UserController();